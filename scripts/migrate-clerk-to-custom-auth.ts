import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { hashPassword, generateSecurePassword } from "../src/lib/auth";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);

const CHILD_TABLES = [
  "portfolios",
  "investment_profiles",
  "liquid_assets",
  "reviews",
] as const;

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${column}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${table}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function dropForeignKeysToUsers(table: string): Promise<void> {
  const fks = await sql`
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = ${table}
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'users'
  `;

  for (const fk of fks) {
    await sql.query(
      `ALTER TABLE "${table}" DROP CONSTRAINT "${fk.constraint_name}"`,
    );
  }
}

async function ensureAuthSupportTables(): Promise<void> {
  if (!(await tableExists("login_attempts"))) {
    await sql`
      CREATE TABLE login_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL,
        ip text,
        attempted_at timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log("Created login_attempts");
  }

  if (!(await tableExists("password_reset_tokens"))) {
    await sql`
      CREATE TABLE password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash text NOT NULL UNIQUE,
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log("Created password_reset_tokens");
  }
}

async function getColumnDataType(
  table: string,
  column: string,
): Promise<string | null> {
  const rows = await sql`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${column}
    LIMIT 1
  `;
  return rows[0]?.data_type ?? null;
}

async function migrateChildUserId(table: string): Promise<void> {
  const userIdType = await getColumnDataType(table, "user_id");
  if (userIdType === "uuid") {
    console.log(`${table}.user_id already uuid — skipping column migration`);
    return;
  }

  await dropForeignKeysToUsers(table);
  await sql.query(`ALTER TABLE "${table}" ADD COLUMN user_uuid uuid`);
  await sql.query(`
    UPDATE "${table}" AS child
    SET user_uuid = users.id
    FROM users
    WHERE child.user_id = users.clerk_user_id
  `);
  await sql.query(`ALTER TABLE "${table}" DROP COLUMN user_id`);
  await sql.query(`ALTER TABLE "${table}" RENAME COLUMN user_uuid TO user_id`);
  await sql.query(`ALTER TABLE "${table}" ALTER COLUMN user_id SET NOT NULL`);
  console.log(`Migrated ${table}.user_id -> users.id (FK pending)`);
}

async function addChildUserFk(table: string): Promise<void> {
  const existing = await sql`
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = ${table}
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
      AND ccu.table_name = 'users'
      AND ccu.column_name = 'id'
    LIMIT 1
  `;

  if (existing.length > 0) {
    console.log(`${table}.user_id FK already exists`);
    return;
  }

  await sql.query(`
    ALTER TABLE "${table}"
    ADD CONSTRAINT "${table}_user_id_users_id_fk"
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  `);
  console.log(`Added FK ${table}.user_id -> users.id`);
}

async function migrateUsersTable(): Promise<boolean> {
  const hasClerkColumn = await columnExists("users", "clerk_user_id");
  const hasIdColumn = await columnExists("users", "id");

  if (!hasClerkColumn && hasIdColumn) {
    console.log("Custom auth schema already in place");
    return false;
  }

  if (!hasIdColumn) {
    console.log("Migrating users from Clerk schema to custom auth…");
    await sql`ALTER TABLE users ADD COLUMN id uuid`;
    await sql`UPDATE users SET id = gen_random_uuid() WHERE id IS NULL`;
    await sql`ALTER TABLE users ALTER COLUMN id SET NOT NULL`;
    await sql`ALTER TABLE users ADD COLUMN password_hash text`;
    await sql`ALTER TABLE users ADD COLUMN session_version integer NOT NULL DEFAULT 0`;
  } else {
    console.log("Resuming partial Clerk migration…");
    await sql`UPDATE users SET id = gen_random_uuid() WHERE id IS NULL`;
    await sql`ALTER TABLE users ALTER COLUMN id SET NOT NULL`;
    if (!(await columnExists("users", "password_hash"))) {
      await sql`ALTER TABLE users ADD COLUMN password_hash text`;
    }
    if (!(await columnExists("users", "session_version"))) {
      await sql`ALTER TABLE users ADD COLUMN session_version integer NOT NULL DEFAULT 0`;
    }
  }

  for (const table of CHILD_TABLES) {
    await migrateChildUserId(table);
  }

  if (hasClerkColumn) {
    await sql`ALTER TABLE users DROP CONSTRAINT users_pkey`;
    await sql`ALTER TABLE users ADD PRIMARY KEY (id)`;
    await sql`ALTER TABLE users DROP COLUMN clerk_user_id`;
  }

  for (const table of CHILD_TABLES) {
    await addChildUserFk(table);
  }

  console.log("Users table migrated");
  return true;
}

async function finalizeUserPasswords(force: boolean): Promise<void> {
  if (!force && !(await columnExists("users", "password_hash"))) {
    return;
  }

  const hasNulls = await sql`
    SELECT 1 FROM users WHERE password_hash IS NULL LIMIT 1
  `;
  if (hasNulls.length > 0) {
    const placeholder = await hashPassword(generateSecurePassword());
    await sql`
      UPDATE users
      SET password_hash = ${placeholder}
      WHERE password_hash IS NULL
    `;
  }

  const nullable = await sql`
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'password_hash'
    LIMIT 1
  `;
  if (nullable[0]?.is_nullable === "YES") {
    await sql`ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL`;
  }
}

async function seedBootstrapAdminPassword(): Promise<void> {
  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (!bootstrapEmail) {
    console.log("BOOTSTRAP_ADMIN_EMAIL not set — skipping admin password seed");
    return;
  }

  const rows = await sql`
    SELECT id, email
    FROM users
    WHERE lower(email) = ${bootstrapEmail}
    LIMIT 1
  `;

  if (rows.length === 0) {
    console.log(`No user found for BOOTSTRAP_ADMIN_EMAIL=${bootstrapEmail}`);
    return;
  }

  const temporaryPassword = generateSecurePassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await sql`
    UPDATE users
    SET password_hash = ${passwordHash},
        session_version = session_version + 1,
        updated_at = now()
    WHERE id = ${rows[0].id}
  `;

  console.log("");
  console.log("=== Admin temporary password ===");
  console.log(`Email: ${bootstrapEmail}`);
  console.log(`Password: ${temporaryPassword}`);
  console.log("Change it after signing in.");
  console.log("================================");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const migrated = await migrateUsersTable();
  await finalizeUserPasswords(migrated);
  await ensureAuthSupportTables();
  if (migrated) {
    await seedBootstrapAdminPassword();
  }

  console.log("");
  console.log("Migration complete.");
  console.log("Other users should use /forgot-password to set a new password.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

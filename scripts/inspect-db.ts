import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);

async function main() {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log("Tables:", tables.map((t) => t.table_name).join(", "));

  const userCols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY ordinal_position
  `;
  console.log("\nusers columns:");
  for (const c of userCols) {
    console.log(`  ${c.column_name}: ${c.data_type}`);
  }

  const fks = await sql`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `;
  console.log("\nforeign keys:");
  for (const fk of fks) {
    console.log(
      `  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`,
    );
  }

  const userIdCols = await sql`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'user_id'
    ORDER BY table_name
  `;
  console.log("\nuser_id columns:");
  for (const c of userIdCols) {
    console.log(`  ${c.table_name}.${c.column_name}: ${c.data_type}`);
  }

  const users = await sql`SELECT id, email, role, access_status FROM users`;
  console.log("\nusers rows:", users.length);
  for (const u of users) {
    console.log(`  ${u.email} (${u.role}, ${u.access_status})`);
  }

  const pks = await sql`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY tc.table_name
  `;
  console.log("\nprimary keys:");
  for (const pk of pks) {
    console.log(`  ${pk.table_name}.${pk.column_name}`);
  }
}

main().catch(console.error);

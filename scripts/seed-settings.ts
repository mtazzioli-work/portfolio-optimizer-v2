import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { appSettings } from "../src/db/schema";
import { MONTHLY_REVIEW_LIMIT_DEFAULT_KEY } from "../src/lib/settings";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const db = drizzle(neon(url));

  await db
    .insert(appSettings)
    .values({
      key: MONTHLY_REVIEW_LIMIT_DEFAULT_KEY,
      value: "3",
    })
    .onConflictDoNothing();

  console.log("Seeded app_settings:", MONTHLY_REVIEW_LIMIT_DEFAULT_KEY, "= 3");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

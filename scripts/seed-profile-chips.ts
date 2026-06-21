import { config } from "dotenv";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { profileChipSections, profileChips } from "../src/db/schema";
import { PROFILE_CHIP_SEED_DATA } from "../src/lib/profile-chip-seed-data";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const db = drizzle(neon(url));

  const [existing] = await db
    .select({ total: count() })
    .from(profileChipSections);

  if ((existing?.total ?? 0) > 0) {
    console.log("Profile chip catalog already seeded, skipping.");
    return;
  }

  for (const section of PROFILE_CHIP_SEED_DATA) {
    const [createdSection] = await db
      .insert(profileChipSections)
      .values({
        title: section.title,
        sortOrder: section.sortOrder,
      })
      .returning();

    if (section.chips.length > 0) {
      await db.insert(profileChips).values(
        section.chips.map((chip) => ({
          sectionId: createdSection.id,
          label: chip.label,
          insertText: chip.insertText,
          sortOrder: chip.sortOrder,
          isActive: true,
        })),
      );
    }
  }

  const chipCount = PROFILE_CHIP_SEED_DATA.reduce(
    (sum, s) => sum + s.chips.length,
    0,
  );
  console.log(
    `Seeded ${PROFILE_CHIP_SEED_DATA.length} sections and ${chipCount} profile chips.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

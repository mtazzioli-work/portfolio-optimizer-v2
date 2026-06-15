import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  profileChips,
  profileChipSections,
  type ProfileChip,
  type ProfileChipSection,
} from "@/db/schema";

export type ProfileChipSectionWithChips = ProfileChipSection & {
  chips: ProfileChip[];
};

export async function listActiveProfileChipSections(): Promise<
  ProfileChipSectionWithChips[]
> {
  const sections = await db
    .select()
    .from(profileChipSections)
    .orderBy(asc(profileChipSections.sortOrder), asc(profileChipSections.title));

  const chips = await db
    .select()
    .from(profileChips)
    .where(eq(profileChips.isActive, true))
    .orderBy(asc(profileChips.sortOrder), asc(profileChips.label));

  return sections.map((section) => ({
    ...section,
    chips: chips.filter((chip) => chip.sectionId === section.id),
  }));
}

export async function listAllProfileChipSections(): Promise<
  ProfileChipSectionWithChips[]
> {
  const sections = await db
    .select()
    .from(profileChipSections)
    .orderBy(asc(profileChipSections.sortOrder), asc(profileChipSections.title));

  const chips = await db
    .select()
    .from(profileChips)
    .orderBy(asc(profileChips.sortOrder), asc(profileChips.label));

  return sections.map((section) => ({
    ...section,
    chips: chips.filter((chip) => chip.sectionId === section.id),
  }));
}

import { describe, expect, it } from "vitest";
import { PROFILE_CHIP_SEED_DATA } from "@/lib/profile-chip-seed-data";

describe("profile chip seed data", () => {
  it("defines non-empty sections and chips with stable sort orders", () => {
    expect(PROFILE_CHIP_SEED_DATA.length).toBeGreaterThan(0);

    const sectionOrders = new Set<number>();
    for (const section of PROFILE_CHIP_SEED_DATA) {
      expect(section.title.trim()).not.toBe("");
      expect(section.chips.length).toBeGreaterThan(0);
      expect(sectionOrders.has(section.sortOrder)).toBe(false);
      sectionOrders.add(section.sortOrder);

      const chipOrders = new Set<number>();
      for (const chip of section.chips) {
        expect(chip.label.trim()).not.toBe("");
        expect(chip.insertText.trim()).not.toBe("");
        expect(chipOrders.has(chip.sortOrder)).toBe(false);
        chipOrders.add(chip.sortOrder);
      }
    }
  });

  it("includes review output chips that trigger custom prompt formatting", () => {
    const resultSection = PROFILE_CHIP_SEED_DATA.find(
      (section) => section.title === "Resultado esperado",
    );

    expect(resultSection?.chips.map((chip) => chip.insertText)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("B.1)"),
        expect.stringContaining("B.2)"),
        expect.stringContaining("B.3)"),
        expect.stringContaining("B.4)"),
      ]),
    );
  });
});

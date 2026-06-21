import { describe, expect, it } from "vitest";
import { PROFILE_CHIP_SEED_DATA } from "@/lib/profile-chip-seed-data";

describe("profile chip seed data", () => {
  it("defines ordered sections with ordered chips", () => {
    expect(PROFILE_CHIP_SEED_DATA.length).toBeGreaterThan(5);

    for (const [sectionIndex, section] of PROFILE_CHIP_SEED_DATA.entries()) {
      expect(section.title).toBeTruthy();
      expect(section.sortOrder).toBe(sectionIndex + 1);
      expect(section.chips.length).toBeGreaterThan(0);

      const labels = new Set<string>();
      for (const [chipIndex, chip] of section.chips.entries()) {
        expect(chip.label).toBeTruthy();
        expect(chip.insertText).toBeTruthy();
        if (chipIndex > 0) {
          expect(chip.sortOrder).toBeGreaterThanOrEqual(
            section.chips[chipIndex - 1].sortOrder,
          );
        }
        expect(labels.has(chip.label)).toBe(false);
        labels.add(chip.label);
      }
    }
  });
});

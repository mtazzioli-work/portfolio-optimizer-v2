import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb } from "../../tests/helpers/db-mock";

const mockDb = createMockDb();
const { db } = mockDb;

vi.mock("@/db", () => ({ db }));

function mockChipQueries(activeOnly: boolean) {
  let call = 0;
  db.select.mockImplementation(() => {
    call += 1;
    if (call === 1) {
      return {
        from: () => ({
          orderBy: () =>
            Promise.resolve([{ id: "s1", title: "Riesgo", sortOrder: 1 }]),
        }),
      };
    }
    if (activeOnly) {
      return {
        from: () => ({
          where: () => ({
            orderBy: () =>
              Promise.resolve([
                {
                  id: "c1",
                  sectionId: "s1",
                  label: "Conservador",
                  sortOrder: 1,
                  isActive: true,
                },
              ]),
          }),
        }),
      };
    }
    return {
      from: () => ({
        orderBy: () =>
          Promise.resolve([
            {
              id: "c1",
              sectionId: "s1",
              label: "Chip",
              sortOrder: 1,
              isActive: false,
            },
          ]),
      }),
    };
  });
}

describe("profile-chips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("groups active chips by section", async () => {
    mockChipQueries(true);
    const { listActiveProfileChipSections } = await import("@/lib/profile-chips");
    const sections = await listActiveProfileChipSections();
    expect(sections).toHaveLength(1);
    expect(sections[0].chips[0].label).toBe("Conservador");
  });

  it("lists all chip sections including inactive", async () => {
    mockChipQueries(false);
    const { listAllProfileChipSections } = await import("@/lib/profile-chips");
    const sections = await listAllProfileChipSections();
    expect(sections[0].chips[0].label).toBe("Chip");
  });
});

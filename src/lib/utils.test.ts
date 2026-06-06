import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins conditional class names", () => {
    expect(cn("base", false && "hidden", ["nested", { active: true }])).toBe(
      "base nested active",
    );
  });

  it("merges conflicting Tailwind classes with the last one winning", () => {
    expect(cn("px-2 text-sm", "px-4", "text-lg")).toBe("px-4 text-lg");
  });
});

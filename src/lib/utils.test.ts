import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("utils", () => {
  it("merges class names", () => {
    expect(cn("px-2", "px-4", false && "hidden", "text-sm")).toBe(
      "px-4 text-sm",
    );
  });
});

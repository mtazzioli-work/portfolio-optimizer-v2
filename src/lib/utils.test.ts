import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges conditional class names and resolves Tailwind conflicts", () => {
    expect(cn("px-2", false && "hidden", ["text-sm", "px-4"])).toBe("text-sm px-4");
  });
});

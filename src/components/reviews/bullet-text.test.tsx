import { describe, expect, it } from "vitest";
import { toBulletItems } from "@/components/reviews/bullet-text";

describe("toBulletItems", () => {
  it("passes through non-empty array items", () => {
    expect(toBulletItems(["uno", "", "dos"])).toEqual(["uno", "dos"]);
  });

  it("parses markdown and numbered bullets from strings", () => {
    expect(toBulletItems("- primer punto\n* segundo punto\n1. tercer punto")).toEqual([
      "primer punto",
      "segundo punto",
      "tercer punto",
    ]);
  });

  it("keeps plain text as a single bullet item", () => {
    expect(toBulletItems("texto simple sin bullets")).toEqual([
      "texto simple sin bullets",
    ]);
  });
});

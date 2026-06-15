import { describe, expect, it } from "vitest";
import { insertAtCursor } from "@/lib/insert-at-cursor";

function textarea(
  value: string,
  selectionStart: number,
  selectionEnd = selectionStart,
): HTMLTextAreaElement {
  return { value, selectionStart, selectionEnd } as HTMLTextAreaElement;
}

describe("insertAtCursor", () => {
  it("inserts text at the beginning and appends a trailing newline", () => {
    expect(insertAtCursor(textarea("world", 0), "hello")).toEqual({
      value: "hello\nworld",
      cursor: 6,
    });
  });

  it("starts a new line when inserting in the middle of an existing line", () => {
    expect(insertAtCursor(textarea("alpha beta", 5), "chip")).toEqual({
      value: "alpha\nchip\n beta",
      cursor: 11,
    });
  });

  it("does not add a duplicate leading newline after an existing line break", () => {
    expect(insertAtCursor(textarea("alpha\n", 6), "chip\n")).toEqual({
      value: "alpha\nchip\n",
      cursor: 11,
    });
  });

  it("replaces the current selection", () => {
    expect(insertAtCursor(textarea("alpha beta gamma", 6, 10), "chip")).toEqual({
      value: "alpha \nchip\n gamma",
      cursor: 12,
    });
  });
});

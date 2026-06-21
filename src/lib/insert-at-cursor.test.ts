import { describe, expect, it } from "vitest";
import { insertAtCursor } from "@/lib/insert-at-cursor";

describe("insertAtCursor", () => {
  it("inserts at cursor with newline handling", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "line one";
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;

    const { value, cursor } = insertAtCursor(textarea, "line two");
    expect(value).toContain("line one\nline two\n");
    expect(cursor).toBeGreaterThan(0);
  });

  it("inserts in the middle of text", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "abc";
    textarea.selectionStart = textarea.selectionEnd = 1;

    const { value } = insertAtCursor(textarea, "X");
    expect(value).toBe("a\nX\nbc");
  });

  it("inserts without extra newline when snippet already ends with one", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "line one\n";
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;

    const { value } = insertAtCursor(textarea, "line two\n");
    expect(value).toContain("line one\nline two\n");
  });

  it("inserts at start of empty textarea", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "";
    textarea.selectionStart = textarea.selectionEnd = 0;

    const { value, cursor } = insertAtCursor(textarea, "first");
    expect(value).toBe("first\n");
    expect(cursor).toBe(6);
  });
});

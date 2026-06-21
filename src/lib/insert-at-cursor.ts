export function insertAtCursor(
  textarea: HTMLTextAreaElement,
  text: string,
): { value: string; cursor: number } {
  const snippet = text.endsWith("\n") ? text : `${text}\n`;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const needsLeadingNewline =
    before.length > 0 && !before.endsWith("\n") ? "\n" : "";
  const insertion = `${needsLeadingNewline}${snippet}`;
  const value = `${before}${insertion}${after}`;
  const cursor = before.length + insertion.length;
  return { value, cursor };
}

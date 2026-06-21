import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/lib/html-escape";

describe("escapeHtml", () => {
  it("escapes html entities", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });
});

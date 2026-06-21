import { describe, expect, it } from "vitest";
import {
  ACTION_LABELS,
  ALLOCATION_STATUS_LABELS,
  LIQUIDITY_LABELS,
  ROLE_LABELS,
  STRATEGY_LABELS,
  REVIEW_GLOSSARY,
  labelForEnum,
  translationNoteForTerm,
} from "@/lib/i18n/labels";

describe("i18n labels", () => {
  it("translates known enum values and falls back to the raw value", () => {
    expect(labelForEnum(ACTION_LABELS, "SELL")).toBe("Vender");
    expect(labelForEnum(ALLOCATION_STATUS_LABELS, "UNDERWEIGHT")).toBe(
      "Subponderado",
    );
    expect(labelForEnum(ROLE_LABELS, "income")).toBe("Ingresos");
    expect(labelForEnum(LIQUIDITY_LABELS, "medium")).toBe("Media");
    expect(labelForEnum(STRATEGY_LABELS, "lump_sum")).toMatch(/^Entrada/);
    expect(labelForEnum(ACTION_LABELS, "UNKNOWN")).toBe("UNKNOWN");
  });

  it("finds translation notes case-insensitively", () => {
    expect(translationNoteForTerm("dca")).toContain("Compra escalonada");
    expect(translationNoteForTerm("TER")).toContain("anual");
    expect(translationNoteForTerm("missing")).toBeNull();
  });

  it("keeps the review glossary aligned with available translation notes", () => {
    expect(REVIEW_GLOSSARY.map((entry) => entry.term)).toEqual([
      "DCA",
      "TER",
      "RSI",
      "EMA",
    ]);
    for (const entry of REVIEW_GLOSSARY) {
      expect(translationNoteForTerm(entry.term)).not.toBeNull();
      expect(entry.definition.length).toBeGreaterThan(20);
    }
  });
});

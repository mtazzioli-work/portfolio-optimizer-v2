import { describe, expect, it } from "vitest";
import {
  ACTION_LABELS,
  REVIEW_GLOSSARY,
  STRATEGY_LABELS,
  labelForEnum,
  translationNoteForTerm,
} from "@/lib/i18n/labels";

describe("i18n label helpers", () => {
  it("returns translated labels and falls back to raw enum values", () => {
    expect(labelForEnum(ACTION_LABELS, "SELL")).toBe("Vender");
    expect(labelForEnum(STRATEGY_LABELS, "lump_sum")).toBe("Entrada única");
    expect(labelForEnum(ACTION_LABELS, "UNKNOWN")).toBe("UNKNOWN");
  });

  it("looks up translation notes case-insensitively", () => {
    expect(translationNoteForTerm("dca")).toBe("Compra escalonada en el tiempo");
    expect(translationNoteForTerm("TER")).toBe("Comisión anual del fondo (Total Expense Ratio)");
    expect(translationNoteForTerm("unknown")).toBeNull();
  });

  it("ships glossary entries for key review terms", () => {
    expect(REVIEW_GLOSSARY.map((item) => item.term)).toEqual(
      expect.arrayContaining(["DCA", "TER", "RSI", "EMA"]),
    );
  });
});

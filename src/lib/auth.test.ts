import { describe, expect, it } from "vitest";
import {
  generateSecurePassword,
  normalizeEmail,
  validatePasswordPolicy,
} from "@/lib/auth";
import {
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth-session";

describe("auth helpers", () => {
  it("normalizes email", () => {
    expect(normalizeEmail("  User@Mail.COM ")).toBe("user@mail.com");
  });

  it("validates password policy", () => {
    expect(validatePasswordPolicy("short")).toMatch(/12/);
    expect(validatePasswordPolicy("alllowercase123!")).toMatch(/mayúscula/i);
    expect(validatePasswordPolicy("ALLUPPERCASE123!")).toMatch(/minúscula/i);
    expect(validatePasswordPolicy("NoNumbersHere!!")).toMatch(/número/i);
    expect(validatePasswordPolicy("NoSymbols1234")).toMatch(/símbolo/i);
    expect(validatePasswordPolicy("ValidPass123!")).toBeNull();
  });

  it("generates secure password meeting policy", () => {
    const password = generateSecurePassword();
    expect(password.length).toBeGreaterThanOrEqual(16);
    expect(validatePasswordPolicy(password)).toBeNull();
  });

  it("round-trips session token", async () => {
    process.env.AUTH_SECRET = "test-auth-secret-with-32-characters-min";
    const token = await createSessionToken("user-1", 2);
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ userId: "user-1", sessionVersion: 2 });
  });
});

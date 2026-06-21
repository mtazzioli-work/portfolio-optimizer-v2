import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSelectChain } from "../../tests/helpers/db-mock";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  checkRateLimit,
  clearSessionCookie,
  generateSecurePassword,
  getSessionFromCookies,
  hashPassword,
  normalizeEmail,
  recordFailedLoginAttempt,
  setSessionCookie,
  validatePasswordPolicy,
  verifyPassword,
} from "@/lib/auth";
import {
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth-session";

const mocks = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  cookieDelete: vi.fn(),
  cookies: vi.fn(),
}));

const { db } = mocks;

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("next/headers", () => ({
  cookies: () => mocks.cookies(),
}));

describe("auth helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-auth-secret-with-32-characters-min";
    db.select.mockReturnValue(createSelectChain([]));
    mocks.cookies.mockResolvedValue({
      get: mocks.cookieGet,
      set: mocks.cookieSet,
      delete: mocks.cookieDelete,
    });
  });

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

  it("generates secure passwords with a requested length", () => {
    const password = generateSecurePassword(20);
    expect(password).toHaveLength(20);
    expect(validatePasswordPolicy(password)).toBeNull();
  });

  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("ValidPass123!");
    await expect(verifyPassword("ValidPass123!", hash)).resolves.toBe(true);
    await expect(verifyPassword("WrongPass123!", hash)).resolves.toBe(false);
  });

  it("round-trips session token", async () => {
    const token = await createSessionToken("user-1", 2);
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ userId: "user-1", sessionVersion: 2 });
  });

  it("returns null when the session cookie is missing", async () => {
    mocks.cookieGet.mockReturnValue(undefined);

    await expect(getSessionFromCookies()).resolves.toBeNull();
    expect(mocks.cookieGet).toHaveBeenCalledWith(SESSION_COOKIE);
  });

  it("reads a valid session from cookies", async () => {
    const token = await createSessionToken("user-1", 3);
    mocks.cookieGet.mockReturnValue({ value: token });

    await expect(getSessionFromCookies()).resolves.toEqual({
      userId: "user-1",
      sessionVersion: 3,
    });
  });

  it("ignores invalid session cookies", async () => {
    mocks.cookieGet.mockReturnValue({ value: "not-a-jwt" });

    await expect(getSessionFromCookies()).resolves.toBeNull();
  });

  it("sets and clears the session cookie", async () => {
    await setSessionCookie("user-1", 4);

    expect(mocks.cookieSet).toHaveBeenCalledWith(
      SESSION_COOKIE,
      expect.any(String),
      {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SEC,
      },
    );

    await clearSessionCookie();
    expect(mocks.cookieDelete).toHaveBeenCalledWith(SESSION_COOKIE);
  });

  it("rejects logins when the email is rate limited", async () => {
    db.select.mockReturnValueOnce(createSelectChain(new Array(5).fill({ id: "a" })));

    await expect(checkRateLimit(" User@Example.com ", "127.0.0.1")).resolves.toBe(
      false,
    );
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("rejects logins when the IP is rate limited", async () => {
    db.select
      .mockReturnValueOnce(createSelectChain(new Array(4).fill({ id: "email" })))
      .mockReturnValueOnce(createSelectChain(new Array(5).fill({ id: "ip" })));

    await expect(checkRateLimit("user@example.com", "127.0.0.1")).resolves.toBe(
      false,
    );
  });

  it("allows logins under the rate limit and skips IP checks when absent", async () => {
    db.select.mockReturnValueOnce(createSelectChain(new Array(4).fill({ id: "email" })));

    await expect(checkRateLimit("user@example.com", null)).resolves.toBe(true);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("allows logins when both email and IP are under the rate limit", async () => {
    db.select
      .mockReturnValueOnce(createSelectChain(new Array(4).fill({ id: "email" })))
      .mockReturnValueOnce(createSelectChain(new Array(4).fill({ id: "ip" })));

    await expect(checkRateLimit("user@example.com", "127.0.0.1")).resolves.toBe(
      true,
    );
  });

  it("records failed login attempts with normalized email", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    db.insert.mockReturnValueOnce({ values });

    await recordFailedLoginAttempt(" User@Example.COM ", "127.0.0.1");

    expect(values).toHaveBeenCalledWith({
      email: "user@example.com",
      ip: "127.0.0.1",
    });
  });
});

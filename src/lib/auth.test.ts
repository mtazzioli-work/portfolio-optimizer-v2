import { SignJWT } from "jose";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  clearSessionCookie,
  generateSecurePassword,
  getSessionFromCookies,
  hashPassword,
  normalizeEmail,
  RATE_LIMIT_MAX_ATTEMPTS,
  recordFailedLoginAttempt,
  setSessionCookie,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  validatePasswordPolicy,
  verifyPassword,
} from "@/lib/auth";
import {
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth-session";

const {
  mockCookieStore,
  mockCookies,
  mockSelect,
  mockInsert,
  mockInsertValues,
} = vi.hoisted(() => ({
  mockCookieStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
  mockCookies: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockInsertValues: vi.fn(),
}));
let selectResults: unknown[][] = [];

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
}));

describe("auth helpers", () => {
  const originalAuthSecret = process.env.AUTH_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-auth-secret-with-32-characters-min";
    process.env.NODE_ENV = originalNodeEnv;
    mockCookies.mockResolvedValue(mockCookieStore);
    mockCookieStore.get.mockReturnValue(undefined);
    selectResults = [];
    mockSelect.mockImplementation(() => {
      const result = selectResults.shift() ?? [];
      return {
        from: () => ({
          where: () => Promise.resolve(result),
        }),
      };
    });
    mockInsertValues.mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockInsertValues });
  });

  afterAll(() => {
    process.env.AUTH_SECRET = originalAuthSecret;
    process.env.NODE_ENV = originalNodeEnv;
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

  it("rejects invalid session tokens and payload shapes", async () => {
    await expect(verifySessionToken("not-a-jwt")).resolves.toBeNull();

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const tokenWithoutSubject = await new SignJWT({ sv: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .sign(secret);

    await expect(verifySessionToken(tokenWithoutSubject)).resolves.toBeNull();
  });

  it("throws when the auth secret is too short", async () => {
    process.env.AUTH_SECRET = "too-short";
    await expect(createSessionToken("user-1", 1)).rejects.toThrow(
      /AUTH_SECRET/,
    );
  });

  it("uses the development auth secret fallback outside production", async () => {
    delete process.env.AUTH_SECRET;
    process.env.NODE_ENV = "test";

    const token = await createSessionToken("user-1", 1);

    await expect(verifySessionToken(token)).resolves.toEqual({
      userId: "user-1",
      sessionVersion: 1,
    });
  });

  it("reads sessions from cookies", async () => {
    await expect(getSessionFromCookies()).resolves.toBeNull();

    const token = await createSessionToken("user-1", 3);
    mockCookieStore.get.mockReturnValue({ name: SESSION_COOKIE, value: token });

    await expect(getSessionFromCookies()).resolves.toEqual({
      userId: "user-1",
      sessionVersion: 3,
    });
  });

  it("sets and clears session cookies", async () => {
    await setSessionCookie("user-1", 1);

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, token, options] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe(SESSION_COOKIE);
    await expect(verifySessionToken(token)).resolves.toEqual({
      userId: "user-1",
      sessionVersion: 1,
    });
    expect(options).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
    });

    await clearSessionCookie();
    expect(mockCookieStore.delete).toHaveBeenCalledWith(SESSION_COOKIE);
  });

  it("marks session cookies secure in production", async () => {
    process.env.NODE_ENV = "production";

    await setSessionCookie("user-1", 1);

    expect(mockCookieStore.set.mock.calls[0][2]).toMatchObject({
      secure: true,
    });
  });

  it("checks rate limits by email and optional ip", async () => {
    selectResults = [[], []];
    await expect(checkRateLimit(" USER@EXAMPLE.COM ", "127.0.0.1")).resolves.toBe(
      true,
    );
    expect(mockSelect).toHaveBeenCalledTimes(2);

    selectResults = [Array.from({ length: RATE_LIMIT_MAX_ATTEMPTS }, () => ({}))];
    await expect(checkRateLimit("user@example.com", null)).resolves.toBe(false);

    selectResults = [
      [],
      Array.from({ length: RATE_LIMIT_MAX_ATTEMPTS }, () => ({})),
    ];
    await expect(checkRateLimit("user@example.com", "127.0.0.1")).resolves.toBe(
      false,
    );
  });

  it("records normalized failed login attempts", async () => {
    await recordFailedLoginAttempt(" USER@EXAMPLE.COM ", "127.0.0.1");

    expect(mockInsertValues).toHaveBeenCalledWith({
      email: "user@example.com",
      ip: "127.0.0.1",
    });
  });
});

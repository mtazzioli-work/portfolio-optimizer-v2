import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RATE_LIMIT_MAX_ATTEMPTS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  checkRateLimit,
  clearSessionCookie,
  getSessionFromCookies,
  generateSecurePassword,
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

const { cookieDelete, cookieGet, cookieSet, cookiesMock, dbMock } = vi.hoisted(
  () => {
    const cookieGet = vi.fn();
    const cookieSet = vi.fn();
    const cookieDelete = vi.fn();
    return {
      cookieDelete,
      cookieGet,
      cookieSet,
      cookiesMock: vi.fn(),
      dbMock: {
        insert: vi.fn(),
        select: vi.fn(),
      },
    };
  },
);

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/db", () => ({
  db: dbMock,
}));

function selectResult(result: unknown[]) {
  return {
    from: () => ({
      where: () => Promise.resolve(result),
    }),
  };
}

describe("auth helpers", () => {
  const originalAuthSecret = process.env.AUTH_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-auth-secret-with-32-characters-min";
    process.env.NODE_ENV = originalNodeEnv;
    cookiesMock.mockResolvedValue({
      delete: cookieDelete,
      get: cookieGet,
      set: cookieSet,
    });
    dbMock.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    dbMock.select.mockReturnValue(selectResult([]));
  });

  afterEach(() => {
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

  it("round-trips session token", async () => {
    const token = await createSessionToken("user-1", 2);
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ userId: "user-1", sessionVersion: 2 });
  });

  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("ValidPass123!");

    expect(hash).not.toBe("ValidPass123!");
    await expect(verifyPassword("ValidPass123!", hash)).resolves.toBe(true);
    await expect(verifyPassword("WrongPass123!", hash)).resolves.toBe(false);
  });

  it("returns null for malformed session tokens", async () => {
    await expect(verifySessionToken("not-a-token")).resolves.toBeNull();
  });

  it("returns null for tokens with invalid payload shape", async () => {
    const token = await createSessionToken("user-1", 1);
    const [header, payload, signature] = token.split(".");
    const decodedPayload = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    const invalidPayload = Buffer.from(
      JSON.stringify({ ...decodedPayload, sv: "1" }),
    ).toString("base64url");

    await expect(
      verifySessionToken(`${header}.${invalidPayload}.${signature}`),
    ).resolves.toBeNull();
  });

  it("requires a strong auth secret in production", async () => {
    delete process.env.AUTH_SECRET;
    process.env.NODE_ENV = "production";

    await expect(createSessionToken("user-1", 1)).rejects.toThrow(
      "AUTH_SECRET must be at least 32 characters",
    );
  });

  it("reads, sets, and clears the session cookie", async () => {
    const token = await createSessionToken("user-1", 3);
    cookieGet.mockReturnValue({ value: token });

    await expect(getSessionFromCookies()).resolves.toEqual({
      userId: "user-1",
      sessionVersion: 3,
    });

    await setSessionCookie("user-2", 4);
    expect(cookieSet).toHaveBeenCalledWith(
      SESSION_COOKIE,
      expect.any(String),
      {
        httpOnly: true,
        maxAge: SESSION_MAX_AGE_SEC,
        path: "/",
        sameSite: "lax",
        secure: false,
      },
    );

    await clearSessionCookie();
    expect(cookieDelete).toHaveBeenCalledWith(SESSION_COOKIE);
  });

  it("returns null when no session cookie is present", async () => {
    cookieGet.mockReturnValue(undefined);

    await expect(getSessionFromCookies()).resolves.toBeNull();
  });

  it("allows login attempts below the rate limit", async () => {
    dbMock.select
      .mockReturnValueOnce(
        selectResult(Array.from({ length: RATE_LIMIT_MAX_ATTEMPTS - 1 })),
      )
      .mockReturnValueOnce(selectResult([]));

    await expect(checkRateLimit("USER@EXAMPLE.COM", "127.0.0.1")).resolves.toBe(
      true,
    );
  });

  it("blocks login attempts at the email or IP rate limit", async () => {
    dbMock.select.mockReturnValueOnce(
      selectResult(Array.from({ length: RATE_LIMIT_MAX_ATTEMPTS })),
    );

    await expect(checkRateLimit("user@example.com", null)).resolves.toBe(false);

    dbMock.select
      .mockReturnValueOnce(selectResult([]))
      .mockReturnValueOnce(
        selectResult(Array.from({ length: RATE_LIMIT_MAX_ATTEMPTS })),
      );

    await expect(checkRateLimit("user@example.com", "127.0.0.1")).resolves.toBe(
      false,
    );
  });

  it("records failed login attempts with normalized emails", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    dbMock.insert.mockReturnValue({ values });

    await recordFailedLoginAttempt("  USER@EXAMPLE.COM ", "127.0.0.1");

    expect(values).toHaveBeenCalledWith({
      email: "user@example.com",
      ip: "127.0.0.1",
    });
  });
});

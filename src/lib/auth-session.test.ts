import { SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth-session";

const TEST_SECRET = "test-auth-secret-with-32-characters-min";
const originalAuthSecret = process.env.AUTH_SECRET;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalAuthSecret === undefined) {
    delete process.env.AUTH_SECRET;
  } else {
    process.env.AUTH_SECRET = originalAuthSecret;
  }
  process.env.NODE_ENV = originalNodeEnv;
  vi.unstubAllEnvs();
});

function encodedTestSecret(): Uint8Array {
  return new TextEncoder().encode(TEST_SECRET);
}

describe("auth-session", () => {
  it("falls back to the development secret outside production", async () => {
    delete process.env.AUTH_SECRET;
    process.env.NODE_ENV = "test";

    const token = await createSessionToken("user-1", 1);

    await expect(verifySessionToken(token)).resolves.toEqual({
      userId: "user-1",
      sessionVersion: 1,
    });
  });

  it("throws when the production auth secret is missing", async () => {
    delete process.env.AUTH_SECRET;
    process.env.NODE_ENV = "production";

    await expect(createSessionToken("user-1", 1)).rejects.toThrow(
      "AUTH_SECRET must be at least 32 characters",
    );
  });

  it("throws when the auth secret is too short", async () => {
    process.env.AUTH_SECRET = "short";

    await expect(createSessionToken("user-1", 1)).rejects.toThrow(
      "AUTH_SECRET must be at least 32 characters",
    );
  });

  it("returns null for invalid or tampered tokens", async () => {
    process.env.AUTH_SECRET = TEST_SECRET;
    const token = await createSessionToken("user-1", 1);

    await expect(verifySessionToken("not-a-token")).resolves.toBeNull();
    await expect(verifySessionToken(`${token}tampered`)).resolves.toBeNull();
  });

  it("returns null for malformed session payloads", async () => {
    process.env.AUTH_SECRET = TEST_SECRET;
    const wrongVersionType = await new SignJWT({ sv: "1" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .sign(encodedTestSecret());
    const missingSubject = await new SignJWT({ sv: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .sign(encodedTestSecret());
    const nonIntegerVersion = await new SignJWT({ sv: 1.5 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .sign(encodedTestSecret());

    await expect(verifySessionToken(wrongVersionType)).resolves.toBeNull();
    await expect(verifySessionToken(missingSubject)).resolves.toBeNull();
    await expect(verifySessionToken(nonIntegerVersion)).resolves.toBeNull();
  });
});

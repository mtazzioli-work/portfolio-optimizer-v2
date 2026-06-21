import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "po_session";
export const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export type SessionPayload = {
  userId: string;
  sessionVersion: number;
};

function getAuthSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    (process.env.NODE_ENV === "production"
      ? ""
      : "dev-only-auth-secret-min-32-chars!!");
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  userId: string,
  sessionVersion: number,
): Promise<string> {
  return new SignJWT({ sv: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const userId = payload.sub;
    const sessionVersion = payload.sv;
    if (
      typeof userId !== "string" ||
      typeof sessionVersion !== "number" ||
      !Number.isInteger(sessionVersion)
    ) {
      return null;
    }
    return { userId, sessionVersion };
  } catch {
    return null;
  }
}

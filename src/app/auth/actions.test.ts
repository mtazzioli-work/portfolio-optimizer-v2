import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";

const {
  dbCalls,
  mockCheckRateLimit,
  mockClearSessionCookie,
  mockCompletePasswordResetToken,
  mockConsumePasswordResetToken,
  mockCreatePasswordResetToken,
  mockDb,
  mockFindValidPasswordResetUserId,
  mockGenerateSecurePassword,
  mockGetCurrentUser,
  mockGetDbUser,
  mockHashPassword,
  mockHeaders,
  mockNotifyAdminsNewUser,
  mockRecordFailedLoginAttempt,
  mockRedirect,
  mockSendPasswordResetEmail,
  mockSendTemporaryPasswordEmail,
  mockSetSessionCookie,
  mockValidatePasswordPolicy,
  mockVerifyPassword,
  mockWarnMissingProductionSecrets,
} = vi.hoisted(() => ({
  dbCalls: [] as Array<{ operation: string; value: unknown }>,
  mockCheckRateLimit: vi.fn(),
  mockClearSessionCookie: vi.fn(),
  mockCompletePasswordResetToken: vi.fn(),
  mockConsumePasswordResetToken: vi.fn(),
  mockCreatePasswordResetToken: vi.fn(),
  mockDb: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
  mockFindValidPasswordResetUserId: vi.fn(),
  mockGenerateSecurePassword: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockGetDbUser: vi.fn(),
  mockHashPassword: vi.fn(),
  mockHeaders: vi.fn(),
  mockNotifyAdminsNewUser: vi.fn(),
  mockRecordFailedLoginAttempt: vi.fn(),
  mockRedirect: vi.fn(),
  mockSendPasswordResetEmail: vi.fn(),
  mockSendTemporaryPasswordEmail: vi.fn(),
  mockSetSessionCookie: vi.fn(),
  mockValidatePasswordPolicy: vi.fn(),
  mockVerifyPassword: vi.fn(),
  mockWarnMissingProductionSecrets: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth", () => ({
  checkRateLimit: mockCheckRateLimit,
  clearSessionCookie: mockClearSessionCookie,
  generateSecurePassword: mockGenerateSecurePassword,
  hashPassword: mockHashPassword,
  normalizeEmail: (value: string) => value.trim().toLowerCase(),
  recordFailedLoginAttempt: mockRecordFailedLoginAttempt,
  setSessionCookie: mockSetSessionCookie,
  validatePasswordPolicy: mockValidatePasswordPolicy,
  verifyPassword: mockVerifyPassword,
}));
vi.mock("@/lib/email", () => ({
  notifyAdminsNewUser: mockNotifyAdminsNewUser,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  sendTemporaryPasswordEmail: mockSendTemporaryPasswordEmail,
}));
vi.mock("@/lib/env", () => ({
  warnMissingProductionSecrets: mockWarnMissingProductionSecrets,
}));
vi.mock("@/lib/password-reset", () => ({
  completePasswordResetToken: mockCompletePasswordResetToken,
  consumePasswordResetToken: mockConsumePasswordResetToken,
  createPasswordResetToken: mockCreatePasswordResetToken,
  findValidPasswordResetUserId: mockFindValidPasswordResetUserId,
}));
vi.mock("@/lib/users", () => ({
  getCurrentUser: mockGetCurrentUser,
  getDbUser: mockGetDbUser,
}));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

import {
  changePassword,
  completePasswordReset,
  requestPasswordReset,
  resetUserPassword,
  signIn,
  signOut,
  signUp,
} from "@/app/auth/actions";

const activeUser: User = {
  id: "user-id",
  email: "user@example.com",
  passwordHash: "old-hash",
  sessionVersion: 1,
  accessStatus: "active",
  role: "user",
  monthlyReviewLimit: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createInsertBuilder(returningRows: unknown[] = []) {
  const builder = {
    values: vi.fn((value: unknown) => {
      dbCalls.push({ operation: "insert.values", value });
      return builder;
    }),
    returning: vi.fn(() => Promise.resolve(returningRows)),
  };
  return builder;
}

function createSelectBuilder(result: unknown[]) {
  const builder = {
    from: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve(result)),
    where: vi.fn(() => builder),
  };
  return builder;
}

function createUpdateBuilder() {
  const builder = {
    set: vi.fn((value: unknown) => {
      dbCalls.push({ operation: "update.set", value });
      return builder;
    }),
    where: vi.fn(() => Promise.resolve()),
  };
  return builder;
}

function authForm(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("auth server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCalls.length = 0;
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    process.env.APP_URL = "https://app.example.com";
    mockCheckRateLimit.mockResolvedValue(true);
    mockCreatePasswordResetToken.mockResolvedValue("reset token");
    mockFindValidPasswordResetUserId.mockResolvedValue("user-id");
    mockGenerateSecurePassword.mockReturnValue("TemporaryPass123!");
    mockGetCurrentUser.mockResolvedValue(activeUser);
    mockGetDbUser.mockResolvedValue(activeUser);
    mockHashPassword.mockResolvedValue("new-hash");
    mockHeaders.mockResolvedValue({
      get: (name: string) =>
        ({
          host: "localhost:3000",
          "x-forwarded-for": "203.0.113.1, 10.0.0.1",
          "x-forwarded-host": "portfolio.example.com",
          "x-forwarded-proto": "https",
        })[name] ?? null,
    });
    mockRedirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    mockValidatePasswordPolicy.mockReturnValue(null);
    mockVerifyPassword.mockResolvedValue(true);
    mockDb.insert.mockImplementation(() =>
      createInsertBuilder([
        { id: "created-id", email: "new@example.com", sessionVersion: 0 },
      ]),
    );
    mockDb.select.mockImplementation(() => createSelectBuilder([]));
    mockDb.update.mockImplementation(() => createUpdateBuilder());
  });

  it("validates sign-up input before writing", async () => {
    await expect(
      signUp({}, authForm({ email: "", password: "", confirmPassword: "" })),
    ).resolves.toEqual({ error: "Email y contraseña son obligatorios" });

    mockValidatePasswordPolicy.mockReturnValue("Contraseña inválida");
    await expect(
      signUp(
        {},
        authForm({
          email: "user@example.com",
          password: "weak",
          confirmPassword: "weak",
        }),
      ),
    ).resolves.toEqual({ error: "Contraseña inválida" });

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("creates pending users, profile defaults, admin notifications, and sessions", async () => {
    await expect(
      signUp(
        {},
        authForm({
          email: " New@Example.com ",
          password: "ValidPass123!",
          confirmPassword: "ValidPass123!",
        }),
      ),
    ).rejects.toThrow("redirect:/");

    expect(dbCalls[0]).toEqual({
      operation: "insert.values",
      value: expect.objectContaining({
        email: "new@example.com",
        accessStatus: "pending",
        role: "user",
        passwordHash: "new-hash",
      }),
    });
    expect(dbCalls[1]).toEqual({
      operation: "insert.values",
      value: { userId: "created-id" },
    });
    expect(dbCalls[2]).toEqual({
      operation: "insert.values",
      value: expect.objectContaining({ userId: "created-id" }),
    });
    expect(mockNotifyAdminsNewUser).toHaveBeenCalledWith({
      email: "new@example.com",
      userId: "created-id",
    });
    expect(mockSetSessionCookie).toHaveBeenCalledWith("created-id", 0);
  });

  it("bootstraps the configured admin without sending a pending-user email", async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = "admin@example.com";

    await expect(
      signUp(
        {},
        authForm({
          email: "ADMIN@example.com",
          password: "ValidPass123!",
          confirmPassword: "ValidPass123!",
        }),
      ),
    ).rejects.toThrow("redirect:/");

    expect(dbCalls[0]).toEqual({
      operation: "insert.values",
      value: expect.objectContaining({
        accessStatus: "active",
        role: "admin",
      }),
    });
    expect(mockNotifyAdminsNewUser).not.toHaveBeenCalled();
  });

  it("handles sign-in rate limits, invalid credentials, and successful sessions", async () => {
    mockCheckRateLimit.mockResolvedValueOnce(false);
    await expect(
      signIn({}, authForm({ email: "user@example.com", password: "ValidPass123!" })),
    ).resolves.toEqual({
      error: "Demasiados intentos fallidos. Probá de nuevo en unos minutos.",
    });

    mockDb.select.mockReturnValueOnce(createSelectBuilder([activeUser]));
    mockVerifyPassword.mockResolvedValueOnce(false);
    await expect(
      signIn({}, authForm({ email: "user@example.com", password: "wrong" })),
    ).resolves.toEqual({ error: "Email o contraseña incorrectos" });
    expect(mockRecordFailedLoginAttempt).toHaveBeenCalledWith(
      "user@example.com",
      "203.0.113.1",
    );

    mockDb.select.mockReturnValueOnce(createSelectBuilder([activeUser]));
    mockVerifyPassword.mockResolvedValueOnce(true);
    await expect(
      signIn({}, authForm({ email: "user@example.com", password: "ValidPass123!" })),
    ).rejects.toThrow("redirect:/");
    expect(mockSetSessionCookie).toHaveBeenCalledWith("user-id", 1);
  });

  it("clears the session when signing out", async () => {
    await expect(signOut()).rejects.toThrow("redirect:/sign-in");

    expect(mockClearSessionCookie).toHaveBeenCalledOnce();
  });

  it("changes passwords for authenticated users and refreshes the session", async () => {
    await expect(
      changePassword(
        authForm({
          currentPassword: "OldPass123!",
          newPassword: "NewPass123!",
          confirmPassword: "NewPass123!",
        }),
      ),
    ).resolves.toEqual({});

    expect(dbCalls[0]).toEqual({
      operation: "update.set",
      value: expect.objectContaining({
        passwordHash: "new-hash",
        sessionVersion: 2,
      }),
    });
    expect(mockSetSessionCookie).toHaveBeenCalledWith("user-id", 2);
  });

  it("requests password resets without revealing account existence", async () => {
    mockDb.select.mockReturnValueOnce(
      createSelectBuilder([{ id: "user-id", email: "user@example.com" }]),
    );

    await expect(
      requestPasswordReset({}, authForm({ email: " USER@example.com " })),
    ).resolves.toEqual({
      success:
        "Si el email está registrado, recibirás un enlace para restablecer tu contraseña.",
    });

    expect(mockCreatePasswordResetToken).toHaveBeenCalledWith("user-id");
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith({
      email: "user@example.com",
      resetUrl:
        "https://portfolio.example.com/reset-password?token=reset%20token",
    });

    mockDb.select.mockReturnValueOnce(createSelectBuilder([]));
    await expect(
      requestPasswordReset({}, authForm({ email: "missing@example.com" })),
    ).resolves.toEqual({
      success:
        "Si el email está registrado, recibirás un enlace para restablecer tu contraseña.",
    });
  });

  it("surfaces actionable Brevo errors while requesting password resets", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockDb.select.mockReturnValueOnce(
      createSelectBuilder([{ id: "user-id", email: "user@example.com" }]),
    );
    mockSendPasswordResetEmail.mockRejectedValueOnce(
      new Error("Brevo API error 401 unauthorized"),
    );

    await expect(
      requestPasswordReset({}, authForm({ email: "user@example.com" })),
    ).resolves.toEqual({
      error:
        "BREVO_API_KEY inválida. Generá una en Brevo → SMTP & API → API keys, actualizá .env.local y reiniciá el servidor.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[auth] Failed to send password reset email",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it("completes valid password resets and consumes the reset token", async () => {
    mockDb.select.mockReturnValueOnce(createSelectBuilder([{ sessionVersion: 4 }]));

    await expect(
      completePasswordReset(
        {},
        authForm({
          token: "token",
          newPassword: "NewPass123!",
          confirmPassword: "NewPass123!",
        }),
      ),
    ).rejects.toThrow("redirect:/sign-in?reset=1");

    expect(dbCalls[0]).toEqual({
      operation: "update.set",
      value: expect.objectContaining({
        passwordHash: "new-hash",
        sessionVersion: 5,
      }),
    });
    expect(mockConsumePasswordResetToken).toHaveBeenCalledWith("token");
  });

  it("rejects invalid password reset tokens", async () => {
    mockFindValidPasswordResetUserId.mockResolvedValueOnce(null);

    await expect(
      completePasswordReset(
        {},
        authForm({
          token: "bad-token",
          newPassword: "NewPass123!",
          confirmPassword: "NewPass123!",
        }),
      ),
    ).resolves.toEqual({ error: "Enlace inválido o expirado" });
  });

  it("lets admins reset a user's password and email a temporary password", async () => {
    mockGetCurrentUser.mockResolvedValue({ ...activeUser, role: "admin" });

    await resetUserPassword("target-id");

    expect(mockGetDbUser).toHaveBeenCalledWith("target-id");
    expect(dbCalls[0]).toEqual({
      operation: "update.set",
      value: expect.objectContaining({
        passwordHash: "new-hash",
        sessionVersion: 2,
      }),
    });
    expect(mockSendTemporaryPasswordEmail).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "TemporaryPass123!",
    });
  });

  it("rejects non-admin password resets", async () => {
    await expect(resetUserPassword("target-id")).rejects.toThrow("No autorizado");
    expect(mockGetDbUser).not.toHaveBeenCalled();
  });
});

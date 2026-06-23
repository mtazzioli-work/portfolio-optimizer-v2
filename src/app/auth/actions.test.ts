import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  changePassword,
  completePasswordReset,
  requestPasswordReset,
  resetUserPassword,
  signIn,
  signOut,
  signUp,
} from "@/app/auth/actions";

const {
  mockCheckRateLimit,
  mockClearSessionCookie,
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
  mockCheckRateLimit: vi.fn(),
  mockClearSessionCookie: vi.fn(),
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

vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
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
vi.mock("@/lib/users", () => ({
  getCurrentUser: mockGetCurrentUser,
  getDbUser: mockGetDbUser,
}));
vi.mock("@/lib/password-reset", () => ({
  consumePasswordResetToken: mockConsumePasswordResetToken,
  createPasswordResetToken: mockCreatePasswordResetToken,
  findValidPasswordResetUserId: mockFindValidPasswordResetUserId,
}));

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

function mockSelectRows(rows: unknown[]) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.limit.mockResolvedValue(rows);
  mockDb.select.mockReturnValueOnce(query);
  return query;
}

function mockUpdate() {
  const update = {
    set: vi.fn(),
    where: vi.fn(),
  };
  update.set.mockReturnValue(update);
  update.where.mockResolvedValue(undefined);
  mockDb.update.mockReturnValue(update);
  return update;
}

function mockInsertReturning(rows: unknown[]) {
  const insert = {
    values: vi.fn(),
    returning: vi.fn(),
  };
  insert.values.mockReturnValue(insert);
  insert.returning.mockResolvedValue(rows);
  mockDb.insert.mockReturnValueOnce(insert);
  return insert;
}

function mockInsertValues() {
  const insert = {
    values: vi.fn().mockResolvedValue(undefined),
  };
  mockDb.insert.mockReturnValueOnce(insert);
  return insert;
}

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    delete process.env.APP_URL;
    mockHeaders.mockResolvedValue(
      new Headers({
        host: "app.example.com",
        "x-forwarded-for": "203.0.113.1, 10.0.0.1",
        "x-forwarded-proto": "https",
      }),
    );
    mockRedirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    mockCheckRateLimit.mockResolvedValue(true);
    mockHashPassword.mockResolvedValue("hashed-password");
    mockValidatePasswordPolicy.mockReturnValue(null);
    mockVerifyPassword.mockResolvedValue(true);
    mockGenerateSecurePassword.mockReturnValue("TempPassw0rd!");
  });

  it("validates sign-up input before touching the database", async () => {
    await expect(signUp({}, form({ email: "", password: "" }))).resolves.toEqual({
      error: "Email y contraseña son obligatorios",
    });

    mockValidatePasswordPolicy.mockReturnValueOnce("Contraseña débil");
    await expect(
      signUp(
        {},
        form({
          email: "USER@example.com",
          password: "weak",
          confirmPassword: "weak",
        }),
      ),
    ).resolves.toEqual({ error: "Contraseña débil" });

    await expect(
      signUp(
        {},
        form({
          email: "user@example.com",
          password: "StrongPassw0rd!",
          confirmPassword: "DifferentPassw0rd!",
        }),
      ),
    ).resolves.toEqual({ error: "Las contraseñas no coinciden" });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("creates a bootstrap admin account and redirects", async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = "admin@example.com";
    mockInsertReturning([
      {
        id: "user_1",
        email: "admin@example.com",
        sessionVersion: 3,
      },
    ]);
    mockInsertValues();
    mockInsertValues();

    await expect(
      signUp(
        {},
        form({
          email: "ADMIN@example.com",
          password: "StrongPassw0rd!",
          confirmPassword: "StrongPassw0rd!",
        }),
      ),
    ).rejects.toThrow("redirect:/");

    expect(mockHashPassword).toHaveBeenCalledWith("StrongPassw0rd!");
    expect(mockSetSessionCookie).toHaveBeenCalledWith("user_1", 3);
    expect(mockNotifyAdminsNewUser).not.toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalledTimes(3);
  });

  it("handles duplicate sign-up attempts", async () => {
    const insert = {
      values: vi.fn(() => {
        throw new Error("duplicate");
      }),
    };
    mockDb.insert.mockReturnValueOnce(insert);

    await expect(
      signUp(
        {},
        form({
          email: "user@example.com",
          password: "StrongPassw0rd!",
          confirmPassword: "StrongPassw0rd!",
        }),
      ),
    ).resolves.toEqual({ error: "Ya existe una cuenta con ese email" });
  });

  it("rate-limits and records failed sign-in attempts", async () => {
    mockCheckRateLimit.mockResolvedValueOnce(false);

    await expect(
      signIn({}, form({ email: "user@example.com", password: "bad" })),
    ).resolves.toEqual({
      error: "Demasiados intentos fallidos. Probá de nuevo en unos minutos.",
    });

    mockSelectRows([]);
    await expect(
      signIn({}, form({ email: "user@example.com", password: "bad" })),
    ).resolves.toEqual({ error: "Email o contraseña incorrectos" });
    expect(mockRecordFailedLoginAttempt).toHaveBeenCalledWith(
      "user@example.com",
      "203.0.113.1",
    );
  });

  it("signs in and signs out with redirects", async () => {
    mockSelectRows([
      {
        id: "user_1",
        passwordHash: "hash",
        sessionVersion: 4,
      },
    ]);

    await expect(
      signIn({}, form({ email: "user@example.com", password: "StrongPassw0rd!" })),
    ).rejects.toThrow("redirect:/");
    expect(mockSetSessionCookie).toHaveBeenCalledWith("user_1", 4);

    await expect(signOut()).rejects.toThrow("redirect:/sign-in");
    expect(mockClearSessionCookie).toHaveBeenCalledOnce();
  });

  it("changes passwords after verifying the current password", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "user_1",
      passwordHash: "old-hash",
      sessionVersion: 7,
    });
    mockVerifyPassword.mockResolvedValueOnce(false);

    await expect(
      changePassword(
        form({
          currentPassword: "wrong",
          newPassword: "NewStrongPassw0rd!",
          confirmPassword: "NewStrongPassw0rd!",
        }),
      ),
    ).resolves.toEqual({ error: "La contraseña actual es incorrecta" });

    mockVerifyPassword.mockResolvedValueOnce(true);
    mockUpdate();
    await expect(
      changePassword(
        form({
          currentPassword: "old",
          newPassword: "NewStrongPassw0rd!",
          confirmPassword: "NewStrongPassw0rd!",
        }),
      ),
    ).resolves.toEqual({});
    expect(mockSetSessionCookie).toHaveBeenCalledWith("user_1", 8);
  });

  it("requests password resets without disclosing account existence", async () => {
    mockSelectRows([{ id: "user_1", email: "user@example.com" }]);
    mockCreatePasswordResetToken.mockResolvedValue("token value");

    await expect(
      requestPasswordReset({}, form({ email: "user@example.com" })),
    ).resolves.toEqual({
      success:
        "Si el email está registrado, recibirás un enlace para restablecer tu contraseña.",
    });

    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith({
      email: "user@example.com",
      resetUrl: "https://app.example.com/reset-password?token=token%20value",
    });

    mockSelectRows([]);
    await expect(
      requestPasswordReset({}, form({ email: "missing@example.com" })),
    ).resolves.toMatchObject({ success: expect.any(String) });
  });

  it("surfaces actionable Brevo reset email errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSelectRows([{ id: "user_1", email: "user@example.com" }]);
    mockCreatePasswordResetToken.mockResolvedValue("token");
    mockSendPasswordResetEmail.mockRejectedValue(new Error("Brevo API error 401"));

    await expect(
      requestPasswordReset({}, form({ email: "user@example.com" })),
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

  it("completes valid password reset tokens and redirects", async () => {
    mockFindValidPasswordResetUserId.mockResolvedValueOnce(null);
    await expect(
      completePasswordReset(
        {},
        form({
          token: "missing",
          newPassword: "NewStrongPassw0rd!",
          confirmPassword: "NewStrongPassw0rd!",
        }),
      ),
    ).resolves.toEqual({ error: "Enlace inválido o expirado" });

    mockFindValidPasswordResetUserId.mockResolvedValueOnce("user_1");
    mockSelectRows([{ sessionVersion: 10 }]);
    mockUpdate();

    await expect(
      completePasswordReset(
        {},
        form({
          token: "valid",
          newPassword: "NewStrongPassw0rd!",
          confirmPassword: "NewStrongPassw0rd!",
        }),
      ),
    ).rejects.toThrow("redirect:/sign-in?reset=1");
    expect(mockConsumePasswordResetToken).toHaveBeenCalledWith("valid");
  });

  it("resets user passwords only for admins", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ role: "user" });
    await expect(resetUserPassword("user_1")).rejects.toThrow("No autorizado");

    mockGetCurrentUser.mockResolvedValueOnce({ role: "admin" });
    mockGetDbUser.mockResolvedValue({
      id: "user_1",
      email: "user@example.com",
      sessionVersion: 2,
    });
    mockUpdate();

    await expect(resetUserPassword("user_1")).resolves.toBeUndefined();
    expect(mockSendTemporaryPasswordEmail).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "TempPassw0rd!",
    });
  });
});

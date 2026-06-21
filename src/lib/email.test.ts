import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.fn();
const mockSelect = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

vi.mock("@/db", () => ({
  db: {
    select: mockSelect,
  },
}));

describe("email notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test";
    delete process.env.RESEND_FROM_EMAIL;
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
    mockSelect.mockReturnValue({
      from: () => ({
        where: () =>
          Promise.resolve([{ email: "admin@example.com" }]),
      }),
    });
  });

  it("notifies admins on new user", async () => {
    const { notifyAdminsNewUser } = await import("@/lib/email");
    await notifyAdminsNewUser({ email: "a@b.com", userId: "user-1" });
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].html).toContain("user-1");
  });

  it("skips when resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    const { notifyAdminsNewUser } = await import("@/lib/email");
    await notifyAdminsNewUser({ email: "a@b.com", userId: "user-1" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("skips admin notification when there are no admin emails", async () => {
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ email: "" }, { email: null }]),
      }),
    });

    const { notifyAdminsNewUser } = await import("@/lib/email");
    await notifyAdminsNewUser({ email: "a@b.com", userId: "user-1" });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("logs but does not throw when admin notification fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSend.mockResolvedValue({
      data: null,
      error: {
        message: "resend unavailable",
        statusCode: 503,
        name: "server_error",
      },
    });

    const { notifyAdminsNewUser } = await import("@/lib/email");
    await expect(
      notifyAdminsNewUser({ email: "a@b.com", userId: "user-1" }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      "[email] Failed to notify admins:",
      "resend unavailable",
    );
    errorSpy.mockRestore();
  });

  it("sends temporary password email", async () => {
    const { sendTemporaryPasswordEmail } = await import("@/lib/email");
    await sendTemporaryPasswordEmail({
      email: "user@example.com",
      password: "TempPass123!",
    });
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].to).toBe("user@example.com");
  });

  it("uses the configured sender address", async () => {
    process.env.RESEND_FROM_EMAIL = "Portfolio <mail@example.com>";

    const { sendTemporaryPasswordEmail } = await import("@/lib/email");
    await sendTemporaryPasswordEmail({
      email: "user@example.com",
      password: "TempPass123!",
    });

    expect(mockSend.mock.calls[0][0].from).toBe("Portfolio <mail@example.com>");
    delete process.env.RESEND_FROM_EMAIL;
  });

  it("throws for temporary password email when resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;

    const { sendTemporaryPasswordEmail } = await import("@/lib/email");
    await expect(
      sendTemporaryPasswordEmail({
        email: "user@example.com",
        password: "TempPass123!",
      }),
    ).rejects.toThrow("RESEND_API_KEY no configurada");
  });

  it("throws when temporary password email delivery fails", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: {
        message: "API key is invalid",
        statusCode: 401,
        name: "validation_error",
      },
    });

    const { sendTemporaryPasswordEmail } = await import("@/lib/email");
    await expect(
      sendTemporaryPasswordEmail({
        email: "user@example.com",
        password: "TempPass123!",
      }),
    ).rejects.toThrow("API key is invalid");
  });

  it("sends password reset email", async () => {
    const { sendPasswordResetEmail } = await import("@/lib/email");
    await sendPasswordResetEmail({
      email: "user@example.com",
      resetUrl: "http://localhost:3000/reset-password?token=abc",
    });
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].html).toContain("reset-password?token=abc");
  });

  it("throws for password reset email when resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;

    const { sendPasswordResetEmail } = await import("@/lib/email");
    await expect(
      sendPasswordResetEmail({
        email: "user@example.com",
        resetUrl: "http://localhost:3000/reset-password?token=abc",
      }),
    ).rejects.toThrow("RESEND_API_KEY no configurada");
  });

  it("throws when resend returns an error", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: {
        message: "API key is invalid",
        statusCode: 401,
        name: "validation_error",
      },
    });
    const { sendPasswordResetEmail } = await import("@/lib/email");
    await expect(
      sendPasswordResetEmail({
        email: "user@example.com",
        resetUrl: "http://localhost:3000/reset-password?token=abc",
      }),
    ).rejects.toThrow("API key is invalid");
  });
});

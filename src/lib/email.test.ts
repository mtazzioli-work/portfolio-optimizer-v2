import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("email notifications", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    process.env.BREVO_API_KEY = "xkeysib-test-api-key";
    delete process.env.EMAIL_FROM;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ messageId: "email-1" }),
    });

    const { db } = await import("@/db");
    vi.mocked(db.select).mockReturnValue({
      from: () => ({
        where: () =>
          Promise.resolve([{ email: "admin@example.com" }]),
      }),
    } as never);
  });

  it("notifies admins on new user", async () => {
    const { notifyAdminsNewUser } = await import("@/lib/email");
    await notifyAdminsNewUser({ email: "a@b.com", userId: "user-1" });
    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.htmlContent).toContain("user-1");
    expect(body.to).toEqual([{ email: "admin@example.com" }]);
    expect(init?.headers?.["api-key"]).toBe("xkeysib-test-api-key");
  });

  it("skips when brevo api key is not configured", async () => {
    delete process.env.BREVO_API_KEY;
    const { notifyAdminsNewUser } = await import("@/lib/email");
    await notifyAdminsNewUser({ email: "a@b.com", userId: "user-1" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips admin notification when there are no admin emails", async () => {
    const { db } = await import("@/db");
    vi.mocked(db.select).mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ email: "" }, { email: null }]),
      }),
    } as never);

    const { notifyAdminsNewUser } = await import("@/lib/email");
    await notifyAdminsNewUser({ email: "a@b.com", userId: "user-1" });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("logs but does not throw when admin notification fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Service unavailable",
    });

    const { notifyAdminsNewUser } = await import("@/lib/email");
    await expect(
      notifyAdminsNewUser({ email: "a@b.com", userId: "user-1" }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      "[email] Failed to notify admins:",
      "Brevo API error 503: Service unavailable",
    );
    errorSpy.mockRestore();
  });

  it("logs non-error admin notification failures", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce("network unavailable");

    const { notifyAdminsNewUser } = await import("@/lib/email");
    await notifyAdminsNewUser({ email: "a@b.com", userId: "user-1" });

    expect(errorSpy).toHaveBeenCalledWith(
      "[email] Failed to notify admins:",
      "network unavailable",
    );
    errorSpy.mockRestore();
  });

  it("sends temporary password email", async () => {
    const { sendTemporaryPasswordEmail } = await import("@/lib/email");
    await sendTemporaryPasswordEmail({
      email: "user@example.com",
      password: "TempPass123!",
    });
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(String(mockFetch.mock.calls[0][1]?.body));
    expect(body.to).toEqual([{ email: "user@example.com" }]);
  });

  it("uses the configured sender address", async () => {
    process.env.EMAIL_FROM = "Portfolio <mail@example.com>";

    const { sendTemporaryPasswordEmail } = await import("@/lib/email");
    await sendTemporaryPasswordEmail({
      email: "user@example.com",
      password: "TempPass123!",
    });

    const body = JSON.parse(String(mockFetch.mock.calls[0][1]?.body));
    expect(body.sender).toEqual({
      name: "Portfolio",
      email: "mail@example.com",
    });
  });

  it("supports a configured sender address without a display name", async () => {
    process.env.EMAIL_FROM = "noreply@example.com";

    const { sendTemporaryPasswordEmail } = await import("@/lib/email");
    await sendTemporaryPasswordEmail({
      email: "user@example.com",
      password: "TempPass123!",
    });

    const body = JSON.parse(String(mockFetch.mock.calls[0][1]?.body));
    expect(body.sender).toEqual({ email: "noreply@example.com" });
  });

  it("logs when the api key disappears before admin email delivery", async () => {
    const { db } = await import("@/db");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.select).mockReturnValue({
      from: () => ({
        where: () => {
          delete process.env.BREVO_API_KEY;
          return Promise.resolve([{ email: "admin@example.com" }]);
        },
      }),
    } as never);

    const { notifyAdminsNewUser } = await import("@/lib/email");
    await notifyAdminsNewUser({ email: "a@b.com", userId: "user-1" });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "[email] Failed to notify admins:",
      "BREVO_API_KEY no configurada",
    );
    errorSpy.mockRestore();
  });

  it("throws for temporary password email when brevo is not configured", async () => {
    delete process.env.BREVO_API_KEY;

    const { sendTemporaryPasswordEmail } = await import("@/lib/email");
    await expect(
      sendTemporaryPasswordEmail({
        email: "user@example.com",
        password: "TempPass123!",
      }),
    ).rejects.toThrow("BREVO_API_KEY no configurada");
  });

  it("throws when temporary password email delivery fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const { sendTemporaryPasswordEmail } = await import("@/lib/email");
    await expect(
      sendTemporaryPasswordEmail({
        email: "user@example.com",
        password: "TempPass123!",
      }),
    ).rejects.toThrow("Brevo API error 401");
  });

  it("sends password reset email", async () => {
    const { sendPasswordResetEmail } = await import("@/lib/email");
    await sendPasswordResetEmail({
      email: "user@example.com",
      resetUrl: "http://localhost:3000/reset-password?token=abc",
    });
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(String(mockFetch.mock.calls[0][1]?.body));
    expect(body.htmlContent).toContain("reset-password?token=abc");
  });

  it("throws for password reset email when brevo is not configured", async () => {
    delete process.env.BREVO_API_KEY;

    const { sendPasswordResetEmail } = await import("@/lib/email");
    await expect(
      sendPasswordResetEmail({
        email: "user@example.com",
        resetUrl: "http://localhost:3000/reset-password?token=abc",
      }),
    ).rejects.toThrow("BREVO_API_KEY no configurada");
  });

  it("throws when brevo api returns an error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });
    const { sendPasswordResetEmail } = await import("@/lib/email");
    await expect(
      sendPasswordResetEmail({
        email: "user@example.com",
        resetUrl: "http://localhost:3000/reset-password?token=abc",
      }),
    ).rejects.toThrow("Brevo API error 401");
  });
});

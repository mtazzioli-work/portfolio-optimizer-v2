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
    process.env.EMAIL_FROM =
      "Portfolio Optimizer <marcelo.h.tazzioli@gmail.com>";
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

  it("skips new-user notification when no admin email exists", async () => {
    const { db } = await import("@/db");
    vi.mocked(db.select).mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ email: null }, { email: "" }]),
      }),
    } as never);

    const { notifyAdminsNewUser } = await import("@/lib/email");
    await notifyAdminsNewUser({ email: "a@b.com", userId: "user-1" });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("logs and swallows admin notification send failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockFetch.mockRejectedValueOnce(new Error("network down"));

    const { notifyAdminsNewUser } = await import("@/lib/email");
    await expect(
      notifyAdminsNewUser({ email: "a@b.com", userId: "user-1" }),
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      "[email] Failed to notify admins:",
      "network down",
    );
    consoleError.mockRestore();
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

  it("throws for transactional emails when brevo is not configured", async () => {
    delete process.env.BREVO_API_KEY;
    const { sendTemporaryPasswordEmail } = await import("@/lib/email");

    await expect(
      sendTemporaryPasswordEmail({
        email: "user@example.com",
        password: "TempPass123!",
      }),
    ).rejects.toThrow("BREVO_API_KEY no configurada");
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

  it("uses a plain sender email when EMAIL_FROM has no display name", async () => {
    process.env.EMAIL_FROM = "noreply@example.com";
    const { sendPasswordResetEmail } = await import("@/lib/email");

    await sendPasswordResetEmail({
      email: "user@example.com",
      resetUrl: "http://localhost:3000/reset-password?token=abc",
    });

    const body = JSON.parse(String(mockFetch.mock.calls[0][1]?.body));
    expect(body.sender).toEqual({ email: "noreply@example.com" });
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

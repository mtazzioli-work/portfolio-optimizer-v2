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

  it("sends temporary password email", async () => {
    const { sendTemporaryPasswordEmail } = await import("@/lib/email");
    await sendTemporaryPasswordEmail({
      email: "user@example.com",
      password: "TempPass123!",
    });
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].to).toBe("user@example.com");
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

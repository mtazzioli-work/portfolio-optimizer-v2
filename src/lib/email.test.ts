import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, mockResendConstructor, mockSend } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
  },
  mockResendConstructor: vi.fn(),
  mockSend: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("resend", () => ({
  Resend: mockResendConstructor,
}));

import { notifyAdminsNewUser } from "@/lib/email";

function mockAdminRows(rows: Array<{ email: string | null }>) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.where.mockResolvedValue(rows);
  mockDb.select.mockReturnValue(query);
  return query;
}

describe("notifyAdminsNewUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    mockResendConstructor.mockImplementation(function ResendMock() {
      return { emails: { send: mockSend } };
    });
    mockAdminRows([]);
  });

  it("is a no-op when Resend is not configured", async () => {
    await notifyAdminsNewUser({
      email: "new@example.com",
      clerkUserId: "user_123",
    });

    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockResendConstructor).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("is a no-op when there are no admin recipients", async () => {
    process.env.RESEND_API_KEY = "test-key";
    mockAdminRows([]);

    await notifyAdminsNewUser({
      email: "new@example.com",
      clerkUserId: "user_123",
    });

    expect(mockResendConstructor).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends an approval notification to all admin emails", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "Ops <ops@example.com>";
    mockAdminRows([
      { email: "admin@example.com" },
      { email: "owner@example.com" },
    ]);

    await notifyAdminsNewUser({
      email: "new@example.com",
      clerkUserId: "user_123",
    });

    expect(mockResendConstructor).toHaveBeenCalledWith("test-key");
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Ops <ops@example.com>",
        to: ["admin@example.com", "owner@example.com"],
        subject: "Nuevo usuario pendiente de aprobación",
        html: expect.stringContaining("new@example.com"),
      }),
    );
  });
});

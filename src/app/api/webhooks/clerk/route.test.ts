import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";
import { DEFAULT_INVESTMENT_PROFILE } from "@/lib/default-investment-profile";

const { mockDb, mockNotifyAdminsNewUser, mockVerifyWebhook, insertValues } =
  vi.hoisted(() => ({
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
    },
    mockNotifyAdminsNewUser: vi.fn(),
    mockVerifyWebhook: vi.fn(),
    insertValues: [] as unknown[],
  }));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/lib/email", () => ({
  notifyAdminsNewUser: mockNotifyAdminsNewUser,
}));
vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: mockVerifyWebhook,
}));

import { POST } from "@/app/api/webhooks/clerk/route";

const existingUser: User = {
  clerkUserId: "user_existing",
  email: "existing@example.com",
  accessStatus: "active",
  role: "user",
  monthlyReviewLimit: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function clerkRequest() {
  return new Request("https://example.com/api/webhooks/clerk", {
    method: "POST",
    body: "{}",
  });
}

function userCreatedEvent(email = "new@example.com") {
  return {
    type: "user.created",
    data: {
      id: "user_new",
      primary_email_address_id: "email_1",
      email_addresses: [{ id: "email_1", email_address: email }],
    },
  };
}

function mockExistingRows(rows: User[]) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.limit.mockResolvedValue(rows);
  mockDb.select.mockReturnValue(query);
  return query;
}

function mockInsertValues() {
  mockDb.insert.mockImplementation(() => {
    const builder = {
      values: vi.fn((values: unknown) => {
        insertValues.push(values);
        return Promise.resolve();
      }),
    };
    return builder;
  });
}

describe("Clerk webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertValues.length = 0;
    process.env.CLERK_WEBHOOK_SECRET = "secret";
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    mockVerifyWebhook.mockResolvedValue(userCreatedEvent());
    mockExistingRows([]);
    mockInsertValues();
  });

  it("returns 500 when the webhook secret is not configured", async () => {
    delete process.env.CLERK_WEBHOOK_SECRET;

    const response = await POST(clerkRequest() as never);

    await expect(response.json()).resolves.toEqual({
      error: "CLERK_WEBHOOK_SECRET not configured",
    });
    expect(response.status).toBe(500);
    expect(mockVerifyWebhook).not.toHaveBeenCalled();
  });

  it("returns 400 when Clerk signature verification fails", async () => {
    mockVerifyWebhook.mockRejectedValue(new Error("bad signature"));

    const response = await POST(clerkRequest() as never);

    await expect(response.json()).resolves.toEqual({ error: "Invalid webhook" });
    expect(response.status).toBe(400);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("skips user.created events without an email address", async () => {
    mockVerifyWebhook.mockResolvedValue({
      ...userCreatedEvent(),
      data: {
        id: "user_new",
        primary_email_address_id: "missing",
        email_addresses: [],
      },
    });

    const response = await POST(clerkRequest() as never);

    await expect(response.json()).resolves.toEqual({
      ok: true,
      skipped: "no email",
    });
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("creates app records and notifies admins for a new non-bootstrap user", async () => {
    const response = await POST(clerkRequest() as never);

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(insertValues).toEqual([
      {
        clerkUserId: "user_new",
        email: "new@example.com",
        accessStatus: "pending",
        role: "user",
      },
      { userId: "user_new" },
      { userId: "user_new", rulesJson: DEFAULT_INVESTMENT_PROFILE },
    ]);
    expect(mockNotifyAdminsNewUser).toHaveBeenCalledWith({
      email: "new@example.com",
      clerkUserId: "user_new",
    });
  });

  it("creates the configured bootstrap admin as active and skips notification", async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = " ADMIN@example.com ";
    mockVerifyWebhook.mockResolvedValue(userCreatedEvent("admin@example.com"));

    const response = await POST(clerkRequest() as never);

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(insertValues[0]).toMatchObject({
      email: "admin@example.com",
      accessStatus: "active",
      role: "admin",
    });
    expect(mockNotifyAdminsNewUser).not.toHaveBeenCalled();
  });

  it("does not duplicate records or notifications for an existing user", async () => {
    mockExistingRows([existingUser]);

    const response = await POST(clerkRequest() as never);

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockNotifyAdminsNewUser).not.toHaveBeenCalled();
  });

  it("ignores unrelated Clerk event types", async () => {
    mockVerifyWebhook.mockResolvedValue({
      type: "session.created",
      data: { id: "session_123" },
    });

    const response = await POST(clerkRequest() as never);

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});

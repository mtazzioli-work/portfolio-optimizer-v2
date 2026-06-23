import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";

const {
  mockGetCurrentUser,
  mockMarkReviewsListSeen,
  mockRequestReview,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockMarkReviewsListSeen: vi.fn(),
  mockRequestReview: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/users", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/onboarding-cookie", () => ({
  markReviewsListSeen: mockMarkReviewsListSeen,
}));
vi.mock("@/lib/reviews", () => ({ requestReview: mockRequestReview }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

import {
  markReviewsListSeenAction,
  requestReviewAction,
} from "@/app/(app)/reviews/actions";

const activeUser: User = {
  id: "user-id",
  email: "user@example.com",
  passwordHash: "hash",
  sessionVersion: 0,
  accessStatus: "active",
  role: "user",
  monthlyReviewLimit: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("review server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(activeUser);
    mockRequestReview.mockResolvedValue({ reviewId: "review-id" });
  });

  it("marks the review list as seen only for signed-in users", async () => {
    await markReviewsListSeenAction();

    expect(mockMarkReviewsListSeen).toHaveBeenCalledOnce();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");

    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(null);

    await markReviewsListSeenAction();

    expect(mockMarkReviewsListSeen).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("rejects anonymous and non-active review requests", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(requestReviewAction("snapshot-id")).resolves.toEqual({
      error: "No autorizado",
    });

    mockGetCurrentUser.mockResolvedValue({ ...activeUser, accessStatus: "paused" });

    await expect(requestReviewAction("snapshot-id")).resolves.toEqual({
      error: "No autorizado",
    });
    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("requests reviews and revalidates all affected routes on success", async () => {
    await expect(requestReviewAction("snapshot-id")).resolves.toEqual({
      reviewId: "review-id",
    });

    expect(mockRequestReview).toHaveBeenCalledWith(activeUser, "snapshot-id");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/reviews");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/reviews/review-id");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/portfolio/upload");
  });

  it("returns existing-review responses without unnecessary revalidation", async () => {
    mockRequestReview.mockResolvedValue({ existingReviewId: "review-id" });

    await expect(requestReviewAction("snapshot-id")).resolves.toEqual({
      existingReviewId: "review-id",
    });

    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

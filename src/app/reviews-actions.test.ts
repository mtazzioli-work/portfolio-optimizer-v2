import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  markReviewsListSeenAction,
  requestReviewAction,
} from "@/app/(app)/reviews/actions";

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

describe("reviews actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({
      id: "user_1",
      accessStatus: "active",
    });
  });

  it("marks reviews as seen only for signed-in users", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    await markReviewsListSeenAction();

    expect(mockMarkReviewsListSeen).not.toHaveBeenCalled();

    await markReviewsListSeenAction();

    expect(mockMarkReviewsListSeen).toHaveBeenCalledOnce();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
  });

  it("rejects unauthorized review requests", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", accessStatus: "paused" });

    await expect(requestReviewAction("snapshot_1")).resolves.toEqual({
      error: "No autorizado",
    });
    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("requests reviews and revalidates affected pages", async () => {
    mockRequestReview.mockResolvedValue({ reviewId: "review_1" });

    await expect(requestReviewAction("snapshot_1")).resolves.toEqual({
      reviewId: "review_1",
    });

    expect(mockRequestReview).toHaveBeenCalledWith(
      { id: "user_1", accessStatus: "active" },
      "snapshot_1",
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/reviews");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/reviews/review_1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/portfolio/upload");
  });
});

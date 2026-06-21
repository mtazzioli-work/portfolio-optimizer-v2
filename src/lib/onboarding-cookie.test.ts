import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  REVIEWS_LIST_SEEN_COOKIE,
  hasReviewsListSeen,
  markReviewsListSeen,
} from "@/lib/onboarding-cookie";

const { cookieGet, cookieSet, cookiesMock } = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

describe("onboarding review-list cookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({
      get: cookieGet,
      set: cookieSet,
    });
  });

  it("reports whether the reviews list has been seen", async () => {
    cookieGet.mockReturnValueOnce(undefined);
    await expect(hasReviewsListSeen()).resolves.toBe(false);

    cookieGet.mockReturnValueOnce({ value: "1" });
    await expect(hasReviewsListSeen()).resolves.toBe(true);
  });

  it("marks the reviews list as seen with a long-lived http-only cookie", async () => {
    await markReviewsListSeen();

    expect(cookieSet).toHaveBeenCalledWith(REVIEWS_LIST_SEEN_COOKIE, "1", {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  REVIEWS_LIST_SEEN_COOKIE,
  hasReviewsListSeen,
  markReviewsListSeen,
} from "@/lib/onboarding-cookie";

const mockCookieGet = vi.fn();
const mockCookieSet = vi.fn();
const mockCookies = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

const originalNodeEnv = process.env.NODE_ENV;

describe("onboarding-cookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
    mockCookies.mockResolvedValue({
      get: mockCookieGet,
      set: mockCookieSet,
    });
  });

  it("detects whether the reviews list has been seen", async () => {
    mockCookieGet.mockReturnValueOnce({ value: "1" });
    await expect(hasReviewsListSeen()).resolves.toBe(true);

    mockCookieGet.mockReturnValueOnce({ value: "0" });
    await expect(hasReviewsListSeen()).resolves.toBe(false);

    mockCookieGet.mockReturnValueOnce(undefined);
    await expect(hasReviewsListSeen()).resolves.toBe(false);
    expect(mockCookieGet).toHaveBeenCalledWith(REVIEWS_LIST_SEEN_COOKIE);
  });

  it("marks the reviews list as seen", async () => {
    await markReviewsListSeen();

    expect(mockCookieSet).toHaveBeenCalledWith(REVIEWS_LIST_SEEN_COOKIE, "1", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  });

  it("sets the seen cookie as secure in production", async () => {
    process.env.NODE_ENV = "production";

    await markReviewsListSeen();

    expect(mockCookieSet).toHaveBeenCalledWith(
      REVIEWS_LIST_SEEN_COOKIE,
      "1",
      expect.objectContaining({ secure: true }),
    );
  });
});

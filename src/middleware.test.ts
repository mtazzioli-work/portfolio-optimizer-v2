import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClerkMiddleware, mockCreateRouteMatcher } = vi.hoisted(() => ({
  mockClerkMiddleware: vi.fn(),
  mockCreateRouteMatcher: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: mockClerkMiddleware,
  createRouteMatcher: mockCreateRouteMatcher,
}));

mockCreateRouteMatcher.mockImplementation((patterns: string[]) => {
  const prefixes = patterns.map((pattern) => pattern.replace("(.*)", ""));
  return (request: Request) => {
    const pathname = new URL(request.url).pathname;
    return prefixes.some((prefix) => pathname.startsWith(prefix));
  };
});
mockClerkMiddleware.mockImplementation((handler) => handler);

import middleware, { config } from "@/middleware";

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["/sign-in", "/sign-up", "/api/webhooks/clerk"])(
    "does not protect public route %s",
    async (pathname) => {
      const protect = vi.fn();

      await middleware(
        { protect },
        new Request(`https://example.com${pathname}`),
      );

      expect(protect).not.toHaveBeenCalled();
    },
  );

  it("protects private routes", async () => {
    const protect = vi.fn();

    await middleware({ protect }, new Request("https://example.com/history"));

    expect(protect).toHaveBeenCalledOnce();
  });

  it("keeps API and page matchers configured", () => {
    expect(config.matcher).toEqual([
      "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
      "/(api|trpc)(.*)",
    ]);
  });
});

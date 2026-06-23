import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVerifySessionToken = vi.fn();

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return {
    ...actual,
    verifySessionToken: (...args: unknown[]) => mockVerifySessionToken(...args),
  };
});

import { SESSION_COOKIE } from "@/lib/auth-session";
import { middleware, config } from "@/middleware";

function createRequest(pathname: string, cookie?: string) {
  const request = new NextRequest(`https://example.com${pathname}`);
  if (cookie) {
    request.cookies.set(SESSION_COOKIE, cookie);
  }
  return request;
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySessionToken.mockResolvedValue(null);
  });

  it.each([
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
  ])("allows public route %s without session", async (pathname) => {
    const response = await middleware(createRequest(pathname));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-pathname")).toBe(pathname);
    expect(mockVerifySessionToken).not.toHaveBeenCalled();
  });

  it("redirects private routes without session", async () => {
    const response = await middleware(createRequest("/history"));

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/sign-in");
    expect(location).toContain("next=%2Fhistory");
  });

  it("allows private routes with valid session", async () => {
    mockVerifySessionToken.mockResolvedValue({
      userId: "user-1",
      sessionVersion: 0,
    });

    const response = await middleware(createRequest("/history", "valid-token"));

    expect(response.status).toBe(200);
    expect(mockVerifySessionToken).toHaveBeenCalledWith("valid-token");
    expect(response.headers.get("x-pathname")).toBe("/history");
  });

  it("keeps API and page matchers configured", () => {
    expect(config.matcher).toEqual([
      "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
      "/(api|trpc)(.*)",
    ]);
  });
});

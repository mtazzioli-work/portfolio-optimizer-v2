import { afterEach, describe, expect, it, vi } from "vitest";
import { warnMissingProductionSecrets } from "@/lib/env";

describe("warnMissingProductionSecrets", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it("does nothing outside production", () => {
    process.env.NODE_ENV = "test";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnMissingProductionSecrets();
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs missing secrets once in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.AUTH_SECRET;
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    warnMissingProductionSecrets();
    warnMissingProductionSecrets();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("AUTH_SECRET");
  });
});

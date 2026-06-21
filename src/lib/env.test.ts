import { afterEach, describe, expect, it, vi } from "vitest";
import { warnMissingProductionSecrets } from "@/lib/env";

describe("warnMissingProductionSecrets", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalAuthSecret = process.env.AUTH_SECRET;
  const originalBootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const originalBrevoApiKey = process.env.BREVO_API_KEY;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = originalAuthSecret;
    }
    if (originalBootstrapAdminEmail === undefined) {
      delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    } else {
      process.env.BOOTSTRAP_ADMIN_EMAIL = originalBootstrapAdminEmail;
    }
    if (originalBrevoApiKey === undefined) {
      delete process.env.BREVO_API_KEY;
    } else {
      process.env.BREVO_API_KEY = originalBrevoApiKey;
    }
    vi.restoreAllMocks();
  });

  it("does nothing outside production", () => {
    process.env.NODE_ENV = "test";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnMissingProductionSecrets();
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not log in production when required secrets are present", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_SECRET = "auth-secret-with-enough-length";
    process.env.BOOTSTRAP_ADMIN_EMAIL = "admin@example.com";
    process.env.BREVO_API_KEY = "xkeysib-test-api-key";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    warnMissingProductionSecrets();

    expect(spy).not.toHaveBeenCalled();
  });

  it("logs missing secrets once in production", async () => {
    vi.resetModules();
    const { warnMissingProductionSecrets: warn } = await import("@/lib/env");

    process.env.NODE_ENV = "production";
    delete process.env.AUTH_SECRET;
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    delete process.env.BREVO_API_KEY;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    warn();
    warn();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("AUTH_SECRET");
  });
});

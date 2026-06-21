const PRODUCTION_REQUIRED_SECRETS = [
  "AUTH_SECRET",
  "BOOTSTRAP_ADMIN_EMAIL",
] as const;

let productionSecretsWarningLogged = false;

/** Logs once per process when critical production env vars are missing. */
export function warnMissingProductionSecrets(): void {
  if (process.env.NODE_ENV !== "production" || productionSecretsWarningLogged) {
    return;
  }

  const missing = PRODUCTION_REQUIRED_SECRETS.filter(
    (key) => !process.env[key]?.trim(),
  );

  if (missing.length > 0) {
    productionSecretsWarningLogged = true;
    console.error(
      `[security] Missing required production env vars: ${missing.join(", ")}`,
    );
  }
}

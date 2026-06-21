#!/usr/bin/env bash
# Security checks run before every git commit (via Husky + Cursor hook).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

failures=0
warnings=0

log_fail() {
  echo -e "${RED}✗${NC} $1" >&2
  failures=$((failures + 1))
}

log_warn() {
  echo -e "${YELLOW}!${NC} $1" >&2
  warnings=$((warnings + 1))
}

log_ok() {
  echo -e "${GREEN}✓${NC} $1"
}

echo "Security pre-commit checks..."

# --- 1. Production dependency audit (high/critical) ---
audit_tmp="$(mktemp)"
if npm audit --omit=dev --audit-level=high --json >"$audit_tmp" 2>/dev/null; then
  log_ok "Production dependencies: no high/critical npm audit findings"
else
  high_count="$(node -e "
    const fs = require('fs');
    try {
      const r = JSON.parse(fs.readFileSync('$audit_tmp', 'utf8'));
      const v = r.metadata?.vulnerabilities ?? {};
      process.stdout.write(String((v.high ?? 0) + (v.critical ?? 0)));
    } catch {
      process.stdout.write('1');
    }
  ")"
  if [ "${high_count:-0}" -gt 0 ]; then
    log_fail "npm audit: ${high_count} high/critical vulnerability(ies) in production deps (run: npm audit --omit=dev)"
  else
    log_ok "Production dependencies: npm audit passed"
  fi
fi
rm -f "$audit_tmp"

# --- 2. Block committing env files with secrets ---
STAGED="$(git diff --cached --name-only --diff-filter=ACMRT 2>/dev/null || true)"
if [ -z "$STAGED" ]; then
  log_ok "No staged files to scan"
  if [ "$failures" -gt 0 ]; then
    echo >&2
    echo "Security check failed. Fix the issues above before committing." >&2
    exit 1
  fi
  exit 0
fi

while IFS= read -r file; do
  [ -z "$file" ] && continue
  case "$file" in
    .env|.env.*)
      if [ "$file" != ".env.example" ]; then
        log_fail "Refusing to commit secrets file: $file"
      fi
      ;;
  esac
done <<<"$STAGED"

# --- 3. Scan staged text content for leaked secrets and risky patterns ---
SECRET_PATTERNS=(
  'sk_live_[a-zA-Z0-9]{20,}'
  'sk_test_[a-zA-Z0-9]{20,}'
  'sk-ant-[a-zA-Z0-9_-]{20,}'
  'AKIA[0-9A-Z]{16}'
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
  'xox[baprs]-[a-zA-Z0-9-]{10,}'
)

RISK_PATTERNS=(
  'dangerouslySetInnerHTML'
  'eval\('
)

scan_staged_file() {
  local file="$1"
  local content
  content="$(git show ":$file" 2>/dev/null || true)"
  [ -z "$content" ] && return 0

  local pattern
  for pattern in "${SECRET_PATTERNS[@]}"; do
    if printf '%s' "$content" | grep -qE "$pattern"; then
      log_fail "Possible secret in staged file $file (pattern: $pattern)"
    fi
  done

  case "$file" in
    *.ts|*.tsx|*.js|*.jsx)
      for pattern in "${RISK_PATTERNS[@]}"; do
        if printf '%s' "$content" | grep -qE "$pattern"; then
          log_warn "Risky pattern in $file: $pattern — verify this is intentional"
        fi
      done
      ;;
  esac
}

while IFS= read -r file; do
  [ -z "$file" ] && continue
  case "$file" in
    .env.example|package-lock.json|*.md|*.png|*.jpg|*.jpeg|*.gif|*.webp|*.ico|*.svg|*.woff|*.woff2)
      continue
      ;;
  esac
  scan_staged_file "$file"
done <<<"$STAGED"

# --- 4. Remind about security-sensitive paths ---
SENSITIVE_CHANGED=false
while IFS= read -r file; do
  case "$file" in
    src/middleware.ts|src/app/api/*|src/app/admin/*|src/lib/access.ts|src/lib/users.ts|src/lib/env.ts|next.config.ts)
      SENSITIVE_CHANGED=true
      break
      ;;
  esac
done <<<"$STAGED"

if [ "$SENSITIVE_CHANGED" = true ]; then
  log_warn "Security-sensitive files changed — consider a manual security review before pushing"
fi

echo
if [ "$failures" -gt 0 ]; then
  echo "Security check failed ($failures error(s), $warnings warning(s))." >&2
  exit 1
fi

if [ "$warnings" -gt 0 ]; then
  echo "Security check passed with $warnings warning(s)."
else
  echo "Security check passed."
fi

exit 0

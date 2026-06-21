#!/usr/bin/env bash
# Cursor hook: block git commit until security pre-commit checks pass.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

input="$(cat)"
command="$(printf '%s' "$input" | node -e "
  let data = '';
  process.stdin.on('data', (c) => { data += c; });
  process.stdin.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      process.stdout.write(parsed.command ?? '');
    } catch {
      process.stdout.write('');
    }
  });
")"

if ! printf '%s' "$command" | grep -qE 'git[[:space:]]+commit'; then
  printf '%s\n' '{ "permission": "allow" }'
  exit 0
fi

if npm run precommit --silent 2>&1; then
  printf '%s\n' '{ "permission": "allow" }'
  exit 0
fi

cat <<'EOF'
{
  "permission": "deny",
  "user_message": "El commit fue bloqueado: falló la revisión de seguridad o los tests de cobertura. Ejecutá `npm run precommit` para ver los detalles.",
  "agent_message": "Pre-commit checks failed (security and/or tests with 80% coverage). Run `npm run precommit`, fix all errors, then retry git commit. Do not use --no-verify unless the user explicitly requests it."
}
EOF
exit 2

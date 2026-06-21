# Portfolio Optimizer v2

Multi-usuario: un **Portfolio** por persona, **Snapshots** en el tiempo y **Reviews** con IA que consumen cuota mensual.

## Stack

- Next.js 16 App Router
- Auth propia (email/contraseña, sesión JWT en cookie)
- Neon Postgres + Drizzle ORM
- Anthropic (reviews)
- Resend (emails a admins)

## Setup

1. Instalar dependencias (ya incluidas si clonaste con `node_modules`):

```bash
npm install
```

2. Copiar variables de entorno:

```bash
cp .env.example .env.local
```

3. Completar `.env.local` (`AUTH_SECRET`, `DATABASE_URL`, `BOOTSTRAP_ADMIN_EMAIL`, etc.).

4. Aplicar schema a Neon:

```bash
npm run db:push
npm run db:seed
```

5. Desarrollo:

```bash
npm run dev
```

## Scripts de base de datos

| Script | Descripción |
|--------|-------------|
| `npm run db:generate` | Generar migraciones Drizzle |
| `npm run db:migrate` | Aplicar migraciones |
| `npm run db:push` | Push schema directo (dev) |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Seed de `app_settings` |

## Seguridad y tests antes de commit

Cada `git commit` ejecuta automáticamente `npm run precommit` (vía Husky):

1. **Seguridad** (`npm run security:check`): audit npm, secretos en staging, patrones de riesgo.
2. **Tests con cobertura** (`npm run test:coverage`): unitarios + integración con mínimo **80%** en `src/lib/**`.

Comandos útiles:

```bash
npm run test              # tests una vez
npm run test:watch        # modo watch
npm run test:coverage     # tests + reporte de cobertura
npm run security:check    # solo seguridad
npm run precommit         # ambos (lo que corre en commit)
```

En Cursor, un hook adicional bloquea `git commit` desde el agente si fallan estas comprobaciones.

## Ramas

Git Flow lite: `main` (producción), `develop` (integración). Trabajo diario en `feature/*` → PR a `develop`.

## Disclaimer

Solo seguimiento personal y educación. No es asesoramiento financiero.

# Portfolio Optimizer v2

Multi-usuario: un **Portfolio** por persona, **Snapshots** en el tiempo y **Reviews** con IA que consumen cuota mensual.

## Stack

- Next.js 16 App Router
- Clerk (email/contraseña)
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

3. Completar `.env.local` (Clerk, `DATABASE_URL`, etc.).

4. Aplicar schema a Neon:

```bash
npm run db:push
npm run db:seed
```

5. En Clerk Dashboard: webhook `user.created` → `https://tu-dominio/api/webhooks/clerk` con secret en `CLERK_WEBHOOK_SECRET`.

6. Desarrollo:

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

## Ramas

Git Flow lite: `main` (producción), `develop` (integración). Trabajo diario en `feature/*` → PR a `develop`.

## Disclaimer

Solo seguimiento personal y educación. No es asesoramiento financiero.

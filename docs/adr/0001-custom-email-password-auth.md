# Auth propia con email/contraseña en lugar de Clerk

Clerk añadía costo, complejidad de CSP/webhooks y dependencia externa para una app privada multi-usuario con aprobación manual. Decidimos auth propia: contraseñas con bcrypt en Postgres, sesiones JWT (`jose`) en cookie httpOnly de 7 días, e invalidación vía `session_version` al cambiar contraseña.

**Considered options:** mantener Clerk; Auth.js Credentials; auth mínima propia.

**Por qué no Auth.js:** el flujo es simple (sign-in, sign-up, logout, reset admin) y ya usamos server actions; Auth.js agregaría capa de configuración sin beneficio claro. **Por qué no Clerk:** el dominio ya controla acceso (`pending`/`active`) y registro; Clerk duplicaba identidad.

**Consecuencias:** rate limit de login en tabla Postgres (serverless); reset de contraseña por admin con email de contraseña temporal; migración con reset completo de DB (sin usuarios Clerk legacy).

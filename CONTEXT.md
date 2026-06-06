# Portfolio Optimizer

Aplicación multi-usuario donde cada persona mantiene un único **Portfolio**, registra **Snapshots** de su cartera en el tiempo y solicita **Reviews** (revisión con IA) sobre un snapshot concreto.

## Language

**Portfolio**:
El contenedor de inversión de un usuario; existe una sola instancia por usuario durante toda su vida en el sistema.
_Avoid_: cartera, cuenta, upload

**Snapshot**:
Una foto inmutable del estado del portfolio en un instante (posiciones, valor total, origen del dato).
_Avoid_: portfolio (cuando se refiere a una versión histórica), upload, versión

**Review**:
El resultado estructurado de la revisión con IA (técnico + fundamental + reglas) sobre un snapshot específico; es la acción que consume cuota mensual de optimización.
_Avoid_: análisis (genérico), optimización (como sustantivo ambiguo), reporte

**Position**:
Una línea de tenencia dentro de un snapshot (símbolo, cantidad, valor, etc.).

**Liquid assets**:
Activos fuera del broker que el usuario declara manualmente para contexto de asignación (efectivo, crypto, inmueble, etc.).

**Investment profile**:
Las reglas y objetivos de inversión del usuario que condicionan una review.

**User**:
Persona autenticada con email/contraseña (Clerk). Estados de acceso (`access_status`):

| Estado | Significado |
|--------|-------------|
| `pending` | Recién registrado; espera aprobación admin |
| `active` | Aprobado; uso normal |
| `denied` | Rechazado; sin acceso operativo |
| `paused` | Suspendido temporalmente (solo desde `active`) |

No usar `approved` en código ni docs — siempre `active`.

## Relationships

- Un **User** tiene exactamente un **Portfolio**
- Un **Portfolio** tiene muchos **Snapshots** ordenados en el tiempo
- Un **Snapshot** tiene muchas **Positions**
- Un **User** puede tener muchas **Reviews**; cada **Review** pertenece a exactamente un **Snapshot**
- Un **User** tiene un **Investment profile** y cero o más **Liquid assets**

## Example dialogue

> **Dev:** "El usuario sube un CSV otra vez, ¿creamos un nuevo Portfolio?"
> **Domain expert:** "No. Actualizamos el mismo Portfolio y creamos un Snapshot nuevo. El Portfolio es el contenedor; el Snapshot es la foto de ese momento."

> **Dev:** "¿Subir CSV gasta la cuota mensual?"
> **Domain expert:** "No. La cuota se consume al pedir una Review sobre un Snapshot. Subir datos es barato; la Review usa tokens."

## Flagged ambiguities

- "Optimizar portafolio" en UI puede confundirse con subir datos; en dominio, optimizar = solicitar una **Review**.
- v1 usaba la tabla `portfolios` para cada upload; en v2 eso pasa a ser **Snapshot**.

**User access status**:
Estado de acceso a la aplicación: `pending` (espera aprobación), `active` (uso normal), `denied` (rechazado), `paused` (suspendido; lectura + settings).
_Avoid_: approved (usar `active`)

## Access transitions (admin)

- Registro → `pending`
- Admin aprueba → `active`; rechaza → `denied`
- `active` ↔ `paused`
- `denied` → `active` solo por rehabilitación admin

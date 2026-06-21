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
El resultado estructurado de la revisión con IA (técnico + fundamental + reglas) sobre un snapshot específico; es la acción que consume cuota mensual de optimización. Usa el **Investment profile** y los **Liquid assets** persistidos en el momento de la solicitud (no al subir el snapshot). Ese contexto queda registrado junto a la review para auditoría.
_Avoid_: análisis (genérico), optimización (como sustantivo ambiguo), reporte

**Revisiones**:
Etiqueta de UI en español para la sección donde el **User** consulta el historial de **Reviews** (`/reviews`). Una **Review** concreta se abre en detalle (`/reviews/[id]`).
_Avoid_: Reviews (inglés en UI), recomendaciones (genérico)

**Position**:
Una línea de tenencia dentro de un snapshot (símbolo, cantidad, valor, etc.).

**Liquid assets**:
Activos fuera del broker que el usuario declara manualmente para contexto de asignación (efectivo, crypto, inmueble, etc.).

**Efectivo disponible para invertir**:
El subconjunto de **Liquid assets** categorizado como `liquid_for_investing`; es el capital que la **Review** asigna a destinos y tramos DCA. Congelado en `rules_snapshot` al solicitar la review.
_Avoid_: efectivo (solo), cash, liquidez

**Plan de entrada**:
Cómo ejecutar la compra de un destino (DCA, límite, mercado); incluye tramos con % y timing cuando aplica.
_Avoid_: entry plan (en UI)

**Checklist de órdenes**:
Vista consolidada al final de una **Review** con compras y ventas sugeridas, montos en USD y timing — derivada del resultado + **Positions** del **Snapshot**, sin segunda llamada a IA.
_Avoid_: lista de trades, órdenes sugeridas (ambiguos)

**Investment profile**:
Las reglas y objetivos de inversión del usuario que condicionan una **Review**. El texto guardado del perfil (`profileEditorText`) es la fuente principal enviada a la IA; las reglas estructuradas complementan plantillas de riesgo y el parser interno.

**Profile chip**:
Fragmento estándar del catálogo global que el inversor inserta en su **Investment profile** para redactarlo. No forma parte del contexto congelado de una **Review** salvo como parte del texto guardado del perfil.
_Avoid_: template de usuario, preset personal

**Profile chip catalog**:
Conjunto de secciones y chips administrado por rol `admin`; igual para todos los usuarios.

**Guía de inicio**:
Checklist de cinco pasos en el Panel que orienta al **User** hasta completar el flujo operativo: **Investment profile** → **Liquid assets** (con **Efectivo disponible para invertir** > 0) → **Snapshot** → **Review** exitosa → visita a la lista de **Revisiones**. Persiste hasta completar los cinco hitos; no se puede omitir. Aplica retroactivamente a todos los usuarios activos/pending, incluidos `admin`. Oculto para `paused` y `denied`.
_Avoid_: wizard, onboarding (en UI visible al usuario)

**User**:
Persona autenticada con email y contraseña propios del sistema (sin proveedor externo). Identificador interno: UUID. El email se normaliza (`lowercase` + `trim`) para login y unicidad. Estados de acceso (`access_status`):

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
- Un **Snapshot** tiene como máximo una **Review** exitosa (`status=done`); si falló, se puede reintentar sin consumir cuota adicional
- La cuota mensual se consume solo cuando la **Review** termina exitosamente (`status=done`, `claudeInvoked=true`)
- Un **User** tiene un **Investment profile** y cero o más **Liquid assets**

## Example dialogue

> **Dev:** "El usuario sube un CSV otra vez, ¿creamos un nuevo Portfolio?"
> **Domain expert:** "No. Actualizamos el mismo Portfolio y creamos un Snapshot nuevo. El Portfolio es el contenedor; el Snapshot es la foto de ese momento."

> **Dev:** "¿Subir CSV gasta la cuota mensual?"
> **Domain expert:** "No. La cuota se consume al pedir una Review sobre un Snapshot. Subir datos es barato; la Review usa tokens."

> **Dev:** "¿Puedo pedir otra Review sobre el mismo Snapshot después de cambiar mi perfil?"
> **Domain expert:** "No si ya hay una Review exitosa para ese Snapshot. Para una nueva Review necesitás un Snapshot nuevo (subir datos otra vez). Si la Review falló, podés reintentar sin gastar otra cuota."

> **Dev:** "¿Alcanza con guardar el template por defecto de activos líquidos para completar la guía?"
> **Domain expert:** "No. El paso de activos líquidos exige **Efectivo disponible para invertir** mayor a cero — ese monto es el que la Review usa para asignar compras nuevas."

## Authentication (domain rules)

- Registro abierto: nuevo **User** → `pending`; admin aprueba → `active`
- Primer registro con email = `BOOTSTRAP_ADMIN_EMAIL` → `admin` + `active` automáticamente
- **User** con cualquier `access_status` puede iniciar sesión; la app redirige según estado (`pending`→waiting, `denied`→denied, `paused`→solo lectura)
- Recuperación de contraseña en v1: solo admin (genera contraseña temporal y la envía por email)
- El **User** activo puede cambiar su contraseña en settings; invalida sesiones previas

## Flagged ambiguities

- "Efectivo" en UI genérico vs **Efectivo disponible para invertir** — resuelto: los montos accionables de una **Review** usan solo `liquid_for_investing` del `rules_snapshot`, no el efectivo ocioso ni proceeds de ventas.
- **User** autenticado con auth propia email/contraseña — ver ADR-0001.
- "Optimizar portafolio" en UI puede confundirse con subir datos; en dominio, optimizar = solicitar una **Review**.
- v1 usaba la tabla `portfolios` para cada upload; en v2 eso pasa a ser **Snapshot**.
- En v2 inicial solo se puede solicitar **Review** sobre el snapshot actual. Reviews retrospectivas sobre snapshots históricos quedan para una versión futura.
- "Historial" como pantalla separada — resuelto: eliminada; el historial operativo de **Reviews** vive en **Revisiones** (`/reviews`). La futura **Review validation** es otro concepto.

## Future (no implementar aún)

**Review validation** (nombre tentativo):
Evaluar retrospectivamente una **Review** ya emitida comparando sus recomendaciones con la evolución real del mercado entre la fecha del **Snapshot** y la fecha presente. Ej.: review de un snapshot de enero revisada en junio con datos reales de los 5 meses intermedios. Requiere snapshots históricos persistidos, reviews con contexto congelado (`rules_snapshot`) y motor de comparación — distinto del flujo operativo de solicitar una review nueva.

**User access status**:
Estado de acceso a la aplicación: `pending` (espera aprobación), `active` (uso normal), `denied` (rechazado), `paused` (suspendido; lectura + settings).
_Avoid_: approved (usar `active`)

## Access transitions (admin)

- Registro → `pending`
- Admin aprueba → `active`; rechaza → `denied`
- `active` ↔ `paused`
- `denied` → `active` solo por rehabilitación admin

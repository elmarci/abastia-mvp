# AbastIA · MVP

**Marketplace B2B de abastecimiento con planificador de compras con IA para organizaciones de Lima.** Oficinas, restaurantes, clínicas, colegios y proyectos compran todo lo que consumen en **un solo pedido consolidado**, comparando el precio de varios proveedores homologados. El planificador sugiere cuánto comprar según el consumo histórico, las personas atendidas y el stock actual.

| Escritorio (1440 px) | Celular (375 px) |
|---|---|
| ![Panel de gasto](docs/capturas/03-panel-gasto-1440.png) | ![Planificador](docs/capturas/05-planificador-375.png) |
| ![Catálogo comparativo](docs/capturas/04-catalogo-1440.png) | ![Tienda retail](docs/capturas/10-tienda-375.png) |

Más capturas en [`docs/capturas/`](docs/capturas).

## Qué incluye

- **Núcleo:** catálogo multiproveedor con mejor oferta, promedio y ahorro; planificador con IA (pronóstico ponderado y Holt); pedido consolidado con un subpedido por proveedor; aprobación por monto límite de sede; seguimiento con línea de tiempo y notificaciones; recepción con calificación; panel de gasto con exportación CSV; portal del proveedor con liquidación neta y competitividad; administración con homologación, comisiones y tablero de hipótesis H1–H5; landing con calculadora de ahorro y formulario de piloto; PWA instalable.
- **Alcance ampliado:** precios por volumen para bodegas, tienda retail pública (`/tienda`), solicitudes de cotización (RFQ), licitaciones con propuestas selladas y criterios ponderados, contratos con calendario de entregas, pedidos recurrentes con cron diario, trazabilidad por lote con QR público y asistente de compras en lenguaje natural.

Detalle de lo implementado y lo simulado: [`docs/FUNCIONALIDADES.md`](docs/FUNCIONALIDADES.md). Arquitectura: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). Pruebas: [`docs/PRUEBAS.md`](docs/PRUEBAS.md).

## Stack

Next.js 15 (App Router, Server Actions) · React 19 · TypeScript estricto · Tailwind CSS v4 · componentes estilo shadcn/ui sobre Radix · lucide-react · Recharts · sonner · React Hook Form + zod · Prisma 6 + PostgreSQL (Neon) · Auth.js v5 (credenciales, JWT) · jsPDF · qrcode · Vitest · Playwright · pnpm · ESLint + Prettier.

Solo se necesitan `DATABASE_URL`, `DIRECT_URL` y `AUTH_SECRET`. No hay claves externas obligatorias.

## Correr en local

Requisitos: Node 20 o superior, pnpm 10 y PostgreSQL 15 o superior (o una base gratuita de Neon).

```bash
pnpm install
cp .env.example .env        # completa DATABASE_URL, DIRECT_URL y AUTH_SECRET
pnpm db:migrate             # crea las tablas
pnpm db:seed                # carga los datos de demostración (se puede repetir)
pnpm dev                    # http://localhost:3000
```

Para una base local, `DATABASE_URL` y `DIRECT_URL` pueden ser la misma cadena, por ejemplo `postgresql://postgres:postgres@localhost:5432/abastia`.

### Variables de entorno

| Variable | Obligatoria | Para qué sirve |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión a PostgreSQL. En Neon, la cadena **con pooling** (`-pooler`). |
| `DIRECT_URL` | Sí | Conexión directa, sin pooling, para las migraciones de Prisma. |
| `AUTH_SECRET` | Sí | Firma de las sesiones. Genera uno con `npx auth secret`. |
| `AUTH_TRUST_HOST` | Fuera de Vercel | `true` al correr con `pnpm start` en local o en otro hosting. |
| `CRON_SECRET` | No | Si existe, `/api/cron` exige `Authorization: Bearer <CRON_SECRET>` (Vercel lo envía solo). |
| `ANTHROPIC_API_KEY` | No | Si existe, el asistente interpreta los pedidos con la API de Claude. Sin ella usa reglas y todo funciona igual. |

### Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Desarrollo, compilación y servidor de producción |
| `pnpm lint` / `pnpm typecheck` | ESLint sin advertencias y TypeScript |
| `pnpm test` | Pruebas unitarias de `src/lib/negocio` con cobertura (umbral 90 %) |
| `pnpm build && pnpm test:e2e` | Pruebas extremo a extremo con Playwright (reinician la semilla y levantan la app en el puerto 3100) |
| `pnpm db:migrate` / `pnpm db:deploy` | Migraciones en desarrollo / en producción |
| `pnpm db:seed` | Datos de demostración (vacía las tablas y vuelve a cargar) |
| `node scripts/capturas.mjs http://localhost:3000` | Capturas a 375 y 1440 px en `docs/capturas/` y revisión de desborde horizontal |

## Cuentas demo

Contraseña de todas: **`Demo2026!`** (también hay botones de acceso rápido en `/login`).

| Rol | Correo | Organización |
|---|---|---|
| Comprador | `compras@andina.pe` | Oficinas Andina S.A.C. (plan Pro) |
| Aprobador | `gerencia@andina.pe` | Oficinas Andina S.A.C. |
| Proveedor | `ventas@limanorte.pe` | Distribuidora Lima Norte S.A.C. |
| Administrador | `admin@abastia.pe` | Equipo AbastIA |
| Institución (licitaciones) | `compras@clinicasangabriel.pe` | Clínica San Gabriel |
| Comprador mayorista | `rosa@bodegarosa.pe` | Bodega Doña Rosa |
| Consumidor final | `cliente@correo.pe` | Tienda retail |

Otros usuarios: `compras@saboresdelpuerto.pe` (restaurante), `compras@colegiolospinos.pe` (colegio), `compras@huarazalto.pe` (campamento minero) y un usuario por proveedor (`ventas@molinodelvalle.pe`, `ventas@cafeselva.pe`, `ventas@alimentospacifico.pe`, etc.). `ventas@andesexpress.pe` está pendiente de homologación.

## Despliegue en Vercel + Neon (paso a paso)

1. **Crea la base en Neon.** En [console.neon.tech](https://console.neon.tech) crea un proyecto (región `aws-us-east-1` o la más cercana) con una base llamada `abastia`.
2. **Copia las dos cadenas de conexión.** En *Connect*, con *Connection pooling* activado copia la cadena para `DATABASE_URL` (el host incluye `-pooler`). Desactiva el pooling y copia la otra para `DIRECT_URL`. Ambas terminan en `?sslmode=require`.
3. **Genera el secreto:** `npx auth secret` y copia el valor de `AUTH_SECRET`.
4. **Importa el repositorio en Vercel.** En [vercel.com/new](https://vercel.com/new) elige `elmarci/abastia-mvp`. Vercel detecta Next.js y pnpm. No cambies el comando de build: `vercel.json` ya usa `pnpm vercel-build`, que corre `prisma generate`, **`prisma migrate deploy`** y `next build`.
5. **Agrega las variables de entorno** (Production y Preview): `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` y, si quieres, `CRON_SECRET` y `ANTHROPIC_API_KEY`. En Vercel no hace falta `AUTH_TRUST_HOST`.
6. **Despliega.** El primer build crea las tablas en Neon.
7. **Carga la semilla una sola vez** desde tu computadora, apuntando a Neon:
   ```bash
   DATABASE_URL="<cadena con pooling>" DIRECT_URL="<cadena directa>" pnpm db:seed
   ```
8. **Listo.** Entra a la URL de Vercel y usa las cuentas demo. El cron diario de `vercel.json` (11:00 UTC, 6:00 a. m. en Lima) genera los pedidos recurrentes y cierra las licitaciones vencidas.

## Guion de demostración (3 minutos)

| Tiempo | Pantalla | Qué mostrar |
|---|---|---|
| 0:00–0:20 | `/` | El problema y la propuesta. Mueve la calculadora de ahorro: responde en vivo. |
| 0:20–0:45 | `/login` → Comprador → Catálogo | Busca "arroz": mejor oferta **Molino del Valle S/ 176.50**, promedio **S/ 182.50**, ahorro **3.3 %**. |
| 0:45–1:15 | Planificador IA | Sede San Isidro, 120 personas, 7 días: el arroz sugiere **6 sacos** (pronóstico **7.0**). Cambia a 240 personas: **14**. El pollo aparece **Sin stock**. Pulsa "Agregar sugerencias". |
| 1:15–1:40 | Pedido | Productos de varios proveedores en un solo pedido, IGV 18 % y ahorro. Supera el límite de la sede: "Enviar a aprobación". |
| 1:40–1:55 | Aprobador | Aprobaciones → Aprobar. Recién ahora lo ven los proveedores. |
| 1:55–2:20 | Proveedor | Pedidos recibidos → avanzar estados. En el panel, la liquidación: S/ 1,180.00 con 6 % deja **S/ 940.00**. |
| 2:20–2:40 | Comprador | Línea de tiempo y notificaciones; confirmar recepción y calificar. Panel de gasto y exportación CSV. |
| 2:40–3:00 | Administrador | Tablero H1–H5 con semáforo calculado desde la base. Cierre: licitaciones, trazabilidad con QR y tienda retail. |

## Calidad

- `pnpm lint` y `pnpm typecheck` sin errores ni advertencias.
- 51 pruebas unitarias con 99 % de cobertura en `src/lib/negocio`.
- 18 pruebas extremo a extremo que recorren los flujos del núcleo y del alcance ampliado.
- CI en GitHub Actions (`.github/workflows/ci.yml`): lint, tipos y pruebas unitarias en cada push, y pruebas e2e con PostgreSQL.

# Arquitectura de AbastIA

AbastIA es un **monolito modular** en Next.js 15: una sola aplicación desplegable con módulos de negocio separados por carpeta, una capa de lógica de negocio pura y una base PostgreSQL.

## Cuatro capas

```mermaid
flowchart TB
  subgraph P["1 · Presentación"]
    direction LR
    WEB["Web responsive y PWA<br/>(App Router, React 19, Tailwind v4)"]
    ROLES["Vistas por rol<br/>comprador · aprobador · proveedor · admin<br/>mayorista · consumidor"]
    PUB["Páginas públicas<br/>landing · /tienda · /trazabilidad/[lote]"]
  end

  subgraph A["2 · Aplicación (Server Actions y rutas API)"]
    direction LR
    MOD["Módulos<br/>catálogo · pedidos · planificador · proveedor · panel<br/>admin · cotizaciones · licitaciones · contratos<br/>recurrentes · trazabilidad · tienda · asistente"]
    NEG["Lógica de negocio pura<br/>src/lib/negocio (Vitest, 99 % de cobertura)"]
    IA["Servicio de IA<br/>pronóstico ponderado y Holt · sugerencias explicadas<br/>asistente por reglas o con la API de Claude (opcional)"]
    SEG["Seguridad<br/>Auth.js v5 (JWT) · permisos por rol · aislamiento por empresa y proveedor"]
    CRON["Cron diario (vercel.json)<br/>recurrentes y cierre de licitaciones"]
  end

  subgraph D["3 · Datos"]
    direction LR
    PRISMA["Prisma ORM"]
    PG[("PostgreSQL · Neon")]
  end

  subgraph X["4 · Servicios externos (simulados en el MVP)"]
    direction LR
    PAGO["Pagos<br/>(simulado)"]
    SUNAT["Facturación electrónica SUNAT<br/>(comprobante de prueba en PDF)"]
    LOG["Logística<br/>(estados manuales del proveedor)"]
    WA["WhatsApp<br/>(notificaciones dentro de la app)"]
    IOT["Sensores IoT<br/>(campo de temperatura en la entrega)"]
  end

  P --> A
  MOD --> NEG
  MOD --> IA
  MOD --> SEG
  CRON --> MOD
  A --> PRISMA --> PG
  A -.-> X
```

### Cómo fluye una petición

1. El navegador llama a una **Server Action** (mutaciones) o a una **ruta API** (`/api/...`, para JSON, CSV y PDF).
2. El servidor obtiene la sesión con `requerirRol` / `requerirEmpresa` / `requerirProveedor` (`src/lib/sesion.ts`) y filtra **siempre** por `empresaId` o `proveedorId`. Ocultar botones nunca es la única barrera: un proveedor que pide por API un pedido ajeno recibe 403.
3. Los datos de entrada se validan con **zod** (los mismos esquemas que usan los formularios).
4. Los cálculos (precios, IGV, pronósticos, estados, puntajes) se hacen con las **funciones puras** de `src/lib/negocio`, que no dependen de React ni de Prisma.
5. Prisma persiste el resultado en una transacción y se crean las notificaciones.

`middleware.ts` (edge) redirige a `/login` y bloquea las áreas de otros roles antes de renderizar.

### Organización del código

```
src/
  app/                 rutas (páginas, layouts y API) por rol
  components/          ui (estilo shadcn) y componentes de la app (shell, barra, gráficos)
  lib/
    negocio/           lógica pura: ofertas, planificador, carrito, pedidos, proveedor,
                       fechas, hipótesis, licitación, validadores, asistente
    sesion.ts, permisos.ts, acciones.ts, api.ts, formato.ts, prisma.ts
  modules/<módulo>/    consultas.ts (lecturas), acciones.ts (Server Actions),
                       esquemas.ts (zod), servicio.ts (reglas con Prisma), componentes/
prisma/                schema.prisma, migraciones, datos.ts y seed.ts
tests/unit, tests/e2e  Vitest y Playwright
```

## Modelo entidad-relación

```mermaid
erDiagram
  EMPRESA ||--o{ SEDE : tiene
  EMPRESA ||--o{ USUARIO : emplea
  PROVEEDOR ||--o{ USUARIO : emplea
  CATEGORIA ||--o{ PRODUCTO : agrupa
  PRODUCTO ||--o{ OFERTA : "se ofrece en"
  PROVEEDOR ||--o{ OFERTA : publica
  OFERTA ||--o{ ESCALA_PRECIO : "precio por volumen"
  OFERTA ||--o{ HISTORIAL_PRECIO : registra
  OFERTA ||--o{ LOTE : produce
  LOTE ||--o{ CERTIFICADO : acredita
  SEDE ||--o{ CONSUMO_SEMANAL : historial
  SEDE ||--o{ STOCK_SEDE : stock
  SEDE ||--o{ SUGERENCIA_IA : recibe
  USUARIO ||--o| CARRITO : arma
  CARRITO ||--o{ ITEM_CARRITO : contiene
  ITEM_CARRITO }o--|| OFERTA : de
  USUARIO ||--o{ PEDIDO : crea
  EMPRESA ||--o{ PEDIDO : compra
  SEDE ||--o{ PEDIDO : recibe
  PEDIDO ||--o{ SUBPEDIDO : "uno por proveedor"
  PROVEEDOR ||--o{ SUBPEDIDO : atiende
  SUBPEDIDO ||--o{ ITEM_PEDIDO : contiene
  ITEM_PEDIDO }o--o| LOTE : trazado
  PEDIDO ||--o{ EVENTO_ESTADO : "línea de tiempo"
  SUBPEDIDO ||--o| RECEPCION : "se recibe"
  SUGERENCIA_IA }o--o| PEDIDO : "se compró en"
  USUARIO ||--o{ NOTIFICACION : recibe
  EMPRESA ||--o{ SOLICITUD_COTIZACION : pide
  SOLICITUD_COTIZACION ||--o{ ITEM_SOLICITUD : lista
  SOLICITUD_COTIZACION ||--o{ COTIZACION : recibe
  PROVEEDOR ||--o{ COTIZACION : responde
  COTIZACION ||--o{ PRECIO_COTIZADO : detalla
  EMPRESA ||--o{ LICITACION : publica
  LICITACION ||--o{ CRITERIO_LICITACION : evalúa
  LICITACION ||--o{ PROPUESTA_LICITACION : "recibe (selladas)"
  PROVEEDOR ||--o{ PROPUESTA_LICITACION : presenta
  LICITACION ||--o| CONTRATO : adjudica
  CONTRATO ||--o{ ENTREGA_PROGRAMADA : calendario
  ENTREGA_PROGRAMADA }o--o| LOTE : entrega
  EMPRESA ||--o{ PEDIDO_RECURRENTE : programa
  USUARIO ||--o{ MENSAJE_ASISTENTE : conversa

  PEDIDO {
    int numero "PED-0001"
    enum canal "B2B, MAYORISTA, RETAIL, COTIZACION, RECURRENTE, CONTRATO"
    decimal subtotal
    decimal igv
    decimal total
    decimal ahorro
    enum estadoAprobacion
  }
  SUBPEDIDO {
    enum estado "RECIBIDO a ENTREGADO, RECHAZADO, CANCELADO"
    decimal total
    decimal comision
  }
  OFERTA {
    decimal precio
    decimal precioRetail
    int stock
    int pedidoMinimo
  }
```

El modelo completo (34 tablas) está en [`prisma/schema.prisma`](../prisma/schema.prisma). El código visible `PED-XXXX` se deriva del número autoincremental, y el estado del pedido se deriva del subpedido menos avanzado (`estadoPedidoDerivado`).

## Por qué un monolito modular

- **Equipo pequeño y plazo corto.** Una sola base de código, un solo despliegue en Vercel y una sola base de datos reducen el costo de operar el MVP a casi cero.
- **Transacciones simples.** Crear un pedido con sus subpedidos, descontar stock, registrar sugerencias y notificar ocurre en una sola transacción de PostgreSQL, sin coordinación entre servicios.
- **Fronteras claras sin red de por medio.** Cada módulo (`src/modules/*`) expone consultas, acciones y esquemas, y la lógica de negocio vive aislada y probada en `src/lib/negocio`. Si un módulo crece (por ejemplo, el planificador con un modelo entrenado), se puede extraer como servicio sin reescribir el resto.
- **Rendimiento y SEO.** Los Server Components consultan la base directamente y envían HTML listo; no hace falta una API pública intermedia salvo donde se necesita (CSV, PDF, QR, cron).
- **Costo.** Vercel y Neon tienen capa gratuita suficiente para el piloto; los microservicios exigirían orquestación, colas y observabilidad que el MVP no necesita todavía.

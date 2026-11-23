-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('COMPRADOR', 'APROBADOR', 'PROVEEDOR', 'ADMIN', 'MAYORISTA', 'CONSUMIDOR');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASICO', 'PRO', 'CORPORATIVO');

-- CreateEnum
CREATE TYPE "TipoOrganizacion" AS ENUM ('OFICINA', 'RESTAURANTE', 'HOTEL', 'PROCESADORA', 'RESIDENCIA', 'HOSPITAL', 'COLEGIO', 'PROYECTO', 'BODEGA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoHomologacion" AS ENUM ('PENDIENTE', 'HOMOLOGADO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "EstadoSubPedido" AS ENUM ('RECIBIDO', 'CONFIRMADO', 'EN_PREPARACION', 'EN_CAMINO', 'ENTREGADO', 'RECHAZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoAprobacion" AS ENUM ('NO_REQUIERE', 'PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "CanalPedido" AS ENUM ('B2B', 'MAYORISTA', 'RETAIL', 'COTIZACION', 'RECURRENTE', 'CONTRATO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('TRANSFERENCIA', 'TARJETA', 'CREDITO_30');

-- CreateEnum
CREATE TYPE "Frecuencia" AS ENUM ('SEMANAL', 'QUINCENAL', 'MENSUAL');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('ABIERTA', 'CONVERTIDA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoLicitacion" AS ENUM ('ABIERTA', 'CERRADA', 'ADJUDICADA', 'DESIERTA');

-- CreateEnum
CREATE TYPE "TipoCriterio" AS ENUM ('PRECIO', 'CALIDAD', 'PLAZO', 'CALIFICACION');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('PROGRAMADA', 'ENTREGADA', 'OBSERVADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "empresaId" TEXT,
    "proveedorId" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "distrito" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "tipo" "TipoOrganizacion" NOT NULL,
    "distrito" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'BASICO',
    "minutosCompraBase" INTEGER NOT NULL DEFAULT 120,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sede" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "personas" INTEGER NOT NULL,
    "personasBase" INTEGER NOT NULL,
    "montoLimiteAprobacion" DECIMAL(12,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'Distribuidor',
    "categorias" TEXT[],
    "zonaReparto" TEXT[],
    "estado" "EstadoHomologacion" NOT NULL DEFAULT 'PENDIENTE',
    "comision" DECIMAL(5,4) NOT NULL DEFAULT 0.06,
    "calificacion" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "numeroCalificaciones" INTEGER NOT NULL DEFAULT 0,
    "telefono" TEXT,
    "contacto" TEXT,
    "documentos" TEXT[],
    "homologadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icono" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidad" TEXT NOT NULL,
    "unidadPlural" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📦',
    "categoriaId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oferta" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "precioRetail" DECIMAL(12,2),
    "unidadRetail" TEXT,
    "stock" INTEGER NOT NULL,
    "pedidoMinimo" INTEGER NOT NULL DEFAULT 1,
    "plazoDias" INTEGER NOT NULL DEFAULT 1,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Oferta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialPrecio" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistorialPrecio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumoSemanal" (
    "id" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "semana" DATE NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "ConsumoSemanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockSede" (
    "id" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockSede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrito" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "sedeId" TEXT,
    "iniciadoEn" TIMESTAMP(3),

    CONSTRAINT "Carrito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCarrito" (
    "id" TEXT NOT NULL,
    "carritoId" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "sugerenciaId" TEXT,

    CONSTRAINT "ItemCarrito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "canal" "CanalPedido" NOT NULL DEFAULT 'B2B',
    "empresaId" TEXT,
    "sedeId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "direccionEntrega" TEXT,
    "distritoEntrega" TEXT,
    "fechaEntrega" DATE NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "igv" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "totalMercado" DECIMAL(12,2) NOT NULL,
    "ahorro" DECIMAL(12,2) NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL DEFAULT 'TRANSFERENCIA',
    "estadoAprobacion" "EstadoAprobacion" NOT NULL DEFAULT 'NO_REQUIERE',
    "aprobadoPorId" TEXT,
    "aprobadoEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "segundosArmado" INTEGER,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "estado" "EstadoSubPedido" NOT NULL DEFAULT 'RECIBIDO',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "igv" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "comision" DECIMAL(5,4) NOT NULL,
    "motivoRechazo" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" TEXT NOT NULL,
    "subPedidoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "ofertaId" TEXT,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "precioPromedio" DECIMAL(12,2) NOT NULL,
    "loteId" TEXT,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoEstado" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "subPedidoId" TEXT,
    "estado" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "usuarioId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoEstado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recepcion" (
    "id" TEXT NOT NULL,
    "subPedidoId" TEXT NOT NULL,
    "conforme" BOOLEAN NOT NULL,
    "observacion" TEXT,
    "tipoObservacion" TEXT,
    "calificacion" INTEGER NOT NULL,
    "temperatura" DECIMAL(4,1),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SugerenciaIA" (
    "id" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "pedidoId" TEXT,
    "personas" INTEGER NOT NULL,
    "dias" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "pronostico" DECIMAL(10,2) NOT NULL,
    "modelo" TEXT NOT NULL DEFAULT 'BASE',
    "cantidadSugerida" INTEGER NOT NULL,
    "cantidadComprada" INTEGER,
    "aceptada" BOOLEAN,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SugerenciaIA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "enlace" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "tipo" TEXT NOT NULL,
    "personas" INTEGER,
    "mensaje" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalaPrecio" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "cantidadMinima" INTEGER NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "EscalaPrecio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudCotizacion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT,
    "fechaRequerida" DATE NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'ABIERTA',
    "pedidoId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudCotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSolicitud" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "ItemSolicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "plazoDias" INTEGER NOT NULL,
    "condiciones" TEXT NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecioCotizado" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "itemSolicitudId" TEXT NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PrecioCotizado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Licitacion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "certificadosObligatorios" TEXT[],
    "plazoContratoMeses" INTEGER NOT NULL,
    "frecuencia" "Frecuencia" NOT NULL,
    "volumenEstimado" TEXT NOT NULL,
    "presupuestoReferencial" DECIMAL(12,2),
    "fechaCierre" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoLicitacion" NOT NULL DEFAULT 'ABIERTA',
    "adjudicadaAId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Licitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriterioLicitacion" (
    "id" TEXT NOT NULL,
    "licitacionId" TEXT NOT NULL,
    "tipo" "TipoCriterio" NOT NULL,
    "peso" INTEGER NOT NULL,

    CONSTRAINT "CriterioLicitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropuestaLicitacion" (
    "id" TEXT NOT NULL,
    "licitacionId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "montoTotal" DECIMAL(12,2) NOT NULL,
    "plazoEntregaDias" INTEGER NOT NULL,
    "certificados" TEXT[],
    "descripcion" TEXT NOT NULL,
    "puntaje" DECIMAL(6,2),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropuestaLicitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "licitacionId" TEXT,
    "empresaId" TEXT NOT NULL,
    "sedeId" TEXT,
    "proveedorId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "montoTotal" DECIMAL(12,2) NOT NULL,
    "frecuencia" "Frecuencia" NOT NULL,
    "inicio" DATE NOT NULL,
    "fin" DATE NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaProgramada" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "estado" "EstadoEntrega" NOT NULL DEFAULT 'PROGRAMADA',
    "loteId" TEXT,
    "temperatura" DECIMAL(4,1),
    "observacion" TEXT,

    CONSTRAINT "EntregaProgramada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoRecurrente" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "frecuencia" "Frecuencia" NOT NULL,
    "proximaEjecucion" DATE NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "items" JSONB NOT NULL,
    "ultimaEjecucion" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoRecurrente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "fechaProduccion" DATE NOT NULL,
    "fechaVencimiento" DATE NOT NULL,
    "origen" TEXT NOT NULL,
    "descripcionOrigen" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificado" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "emisor" TEXT NOT NULL,
    "vigencia" DATE NOT NULL,

    CONSTRAINT "Certificado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensajeAsistente" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensajeAsistente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SolicitudInvitados" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SolicitudInvitados_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_idx" ON "Usuario"("empresaId");

-- CreateIndex
CREATE INDEX "Usuario_proveedorId_idx" ON "Usuario"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_ruc_key" ON "Empresa"("ruc");

-- CreateIndex
CREATE INDEX "Sede_empresaId_idx" ON "Sede"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_ruc_key" ON "Proveedor"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_slug_key" ON "Categoria"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_slug_key" ON "Producto"("slug");

-- CreateIndex
CREATE INDEX "Producto_categoriaId_idx" ON "Producto"("categoriaId");

-- CreateIndex
CREATE INDEX "Producto_nombre_idx" ON "Producto"("nombre");

-- CreateIndex
CREATE INDEX "Oferta_productoId_idx" ON "Oferta"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Oferta_proveedorId_productoId_key" ON "Oferta"("proveedorId", "productoId");

-- CreateIndex
CREATE INDEX "HistorialPrecio_ofertaId_fecha_idx" ON "HistorialPrecio"("ofertaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumoSemanal_sedeId_productoId_semana_key" ON "ConsumoSemanal"("sedeId", "productoId", "semana");

-- CreateIndex
CREATE UNIQUE INDEX "StockSede_sedeId_productoId_key" ON "StockSede"("sedeId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Carrito_usuarioId_key" ON "Carrito"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCarrito_sugerenciaId_key" ON "ItemCarrito"("sugerenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCarrito_carritoId_ofertaId_key" ON "ItemCarrito"("carritoId", "ofertaId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE INDEX "Pedido_empresaId_creadoEn_idx" ON "Pedido"("empresaId", "creadoEn");

-- CreateIndex
CREATE INDEX "Pedido_creadoPorId_idx" ON "Pedido"("creadoPorId");

-- CreateIndex
CREATE INDEX "SubPedido_proveedorId_estado_idx" ON "SubPedido"("proveedorId", "estado");

-- CreateIndex
CREATE INDEX "SubPedido_pedidoId_idx" ON "SubPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "ItemPedido_subPedidoId_idx" ON "ItemPedido"("subPedidoId");

-- CreateIndex
CREATE INDEX "EventoEstado_pedidoId_fecha_idx" ON "EventoEstado"("pedidoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Recepcion_subPedidoId_key" ON "Recepcion"("subPedidoId");

-- CreateIndex
CREATE INDEX "SugerenciaIA_sedeId_idx" ON "SugerenciaIA"("sedeId");

-- CreateIndex
CREATE INDEX "Notificacion_usuarioId_leida_idx" ON "Notificacion"("usuarioId", "leida");

-- CreateIndex
CREATE UNIQUE INDEX "EscalaPrecio_ofertaId_cantidadMinima_key" ON "EscalaPrecio"("ofertaId", "cantidadMinima");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudCotizacion_codigo_key" ON "SolicitudCotizacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Cotizacion_solicitudId_proveedorId_key" ON "Cotizacion"("solicitudId", "proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "Licitacion_codigo_key" ON "Licitacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CriterioLicitacion_licitacionId_tipo_key" ON "CriterioLicitacion"("licitacionId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "PropuestaLicitacion_licitacionId_proveedorId_key" ON "PropuestaLicitacion"("licitacionId", "proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_codigo_key" ON "Contrato"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_licitacionId_key" ON "Contrato"("licitacionId");

-- CreateIndex
CREATE INDEX "EntregaProgramada_contratoId_fecha_idx" ON "EntregaProgramada"("contratoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_codigo_key" ON "Lote"("codigo");

-- CreateIndex
CREATE INDEX "MensajeAsistente_usuarioId_creadoEn_idx" ON "MensajeAsistente"("usuarioId", "creadoEn");

-- CreateIndex
CREATE INDEX "_SolicitudInvitados_B_index" ON "_SolicitudInvitados"("B");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sede" ADD CONSTRAINT "Sede_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialPrecio" ADD CONSTRAINT "HistorialPrecio_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "Oferta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumoSemanal" ADD CONSTRAINT "ConsumoSemanal_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumoSemanal" ADD CONSTRAINT "ConsumoSemanal_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSede" ADD CONSTRAINT "StockSede_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSede" ADD CONSTRAINT "StockSede_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carrito" ADD CONSTRAINT "Carrito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCarrito" ADD CONSTRAINT "ItemCarrito_carritoId_fkey" FOREIGN KEY ("carritoId") REFERENCES "Carrito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCarrito" ADD CONSTRAINT "ItemCarrito_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "Oferta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCarrito" ADD CONSTRAINT "ItemCarrito_sugerenciaId_fkey" FOREIGN KEY ("sugerenciaId") REFERENCES "SugerenciaIA"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubPedido" ADD CONSTRAINT "SubPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubPedido" ADD CONSTRAINT "SubPedido_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_subPedidoId_fkey" FOREIGN KEY ("subPedidoId") REFERENCES "SubPedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "Oferta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoEstado" ADD CONSTRAINT "EventoEstado_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoEstado" ADD CONSTRAINT "EventoEstado_subPedidoId_fkey" FOREIGN KEY ("subPedidoId") REFERENCES "SubPedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoEstado" ADD CONSTRAINT "EventoEstado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recepcion" ADD CONSTRAINT "Recepcion_subPedidoId_fkey" FOREIGN KEY ("subPedidoId") REFERENCES "SubPedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugerenciaIA" ADD CONSTRAINT "SugerenciaIA_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugerenciaIA" ADD CONSTRAINT "SugerenciaIA_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugerenciaIA" ADD CONSTRAINT "SugerenciaIA_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalaPrecio" ADD CONSTRAINT "EscalaPrecio_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "Oferta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudCotizacion" ADD CONSTRAINT "SolicitudCotizacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudCotizacion" ADD CONSTRAINT "SolicitudCotizacion_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSolicitud" ADD CONSTRAINT "ItemSolicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudCotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSolicitud" ADD CONSTRAINT "ItemSolicitud_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudCotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioCotizado" ADD CONSTRAINT "PrecioCotizado_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioCotizado" ADD CONSTRAINT "PrecioCotizado_itemSolicitudId_fkey" FOREIGN KEY ("itemSolicitudId") REFERENCES "ItemSolicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licitacion" ADD CONSTRAINT "Licitacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterioLicitacion" ADD CONSTRAINT "CriterioLicitacion_licitacionId_fkey" FOREIGN KEY ("licitacionId") REFERENCES "Licitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropuestaLicitacion" ADD CONSTRAINT "PropuestaLicitacion_licitacionId_fkey" FOREIGN KEY ("licitacionId") REFERENCES "Licitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropuestaLicitacion" ADD CONSTRAINT "PropuestaLicitacion_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_licitacionId_fkey" FOREIGN KEY ("licitacionId") REFERENCES "Licitacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaProgramada" ADD CONSTRAINT "EntregaProgramada_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaProgramada" ADD CONSTRAINT "EntregaProgramada_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoRecurrente" ADD CONSTRAINT "PedidoRecurrente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoRecurrente" ADD CONSTRAINT "PedidoRecurrente_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "Oferta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeAsistente" ADD CONSTRAINT "MensajeAsistente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SolicitudInvitados" ADD CONSTRAINT "_SolicitudInvitados_A_fkey" FOREIGN KEY ("A") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SolicitudInvitados" ADD CONSTRAINT "_SolicitudInvitados_B_fkey" FOREIGN KEY ("B") REFERENCES "SolicitudCotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

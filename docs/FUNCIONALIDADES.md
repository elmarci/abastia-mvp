# Funcionalidades del MVP

Este documento cubre tres cosas:

- Qué hace de verdad el MVP y qué se simula.
- Cómo se mide cada hipótesis H1–H5.
- Qué ofrece la plataforma a cada segmento de clientes.

## Implementado de punta a punta

Todo lo de esta lista funciona con datos reales en PostgreSQL. Está protegido por rol y por empresa o proveedor, y lo cubren las pruebas de [`PRUEBAS.md`](PRUEBAS.md).

| Módulo | Qué hace | Dónde |
|---|---|---|
| Registro y acceso | Registro de empresa (valida el RUC) y de proveedor, inicio de sesión, 6 roles y sedes con monto límite de aprobación | `/registro`, `/login`, `src/modules/auth` |
| Catálogo multiproveedor | Mejor oferta, precio promedio y ahorro por producto, búsqueda, filtros e historial de precios | `/comprador/catalogo` |
| Planificador con IA | Pronóstico ponderado de 4 semanas (y Holt con 8 semanas o más) escalado por personas, con stock actual, días de cobertura, nivel de stock y explicación en lenguaje natural | `/comprador/planificador` |
| Pedido consolidado | Un pedido genera un subpedido por proveedor. Incluye IGV 18 %, ahorro, fecha de entrega válida (sin domingos ni feriados) y descuento de stock en la misma transacción | `/comprador/carrito`, `/comprador/pedidos` |
| Aprobación | Los pedidos por encima del límite de la sede esperan al aprobador, y los proveedores no los ven hasta que se aprueban | `/comprador/aprobaciones` |
| Seguimiento | Línea de tiempo por estado, el estado del pedido derivado del subpedido menos avanzado y notificaciones dentro de la app | `/comprador/pedidos/[id]` |
| Recepción | Confirmación por subpedido con conformidad, observaciones, temperatura y calificación del proveedor | Detalle del pedido |
| Panel de gasto | Gasto por mes, categoría, sede y proveedor, ahorro acumulado y exportación CSV | `/comprador`, `/api/reportes/gasto` |
| Portal del proveedor | Pedidos recibidos y avance de estados, catálogo con stock y precios, liquidación neta de comisión y competitividad frente a la mejor oferta | `/proveedor` |
| Administración | Homologación de proveedores, comisiones, leads del piloto y tablero H1–H5 con semáforo calculado desde la base | `/admin` |
| Landing y PWA | Calculadora de ahorro en vivo y formulario de piloto que guarda el lead. La app es instalable (manifest e íconos) | `/` |
| Precios por volumen | Escalas por cantidad para compradores mayoristas, mostrando cuánto falta para la siguiente | Catálogo mayorista |
| Tienda retail | Catálogo público con el precio retail más bajo, canasta y compra del consumidor final con entrega en distritos de Lima | `/tienda`, `/cuenta` |
| Cotizaciones (RFQ) | Solicitud a proveedores invitados, respuestas, tabla comparativa y conversión de la mejor oferta en pedido | `/comprador/cotizaciones`, `/proveedor/cotizaciones` |
| Licitaciones | Criterios ponderados que suman 100 y propuestas selladas hasta el cierre (la API responde 403). Al cerrar se calcula el ranking automático y se puede adjudicar | `/comprador/licitaciones`, `/proveedor/licitaciones` |
| Contratos | Contrato generado por la adjudicación, con calendario de entregas, registro de cada entrega con lote y temperatura, y avance | `/comprador/contratos`, `/proveedor/contratos` |
| Pedidos recurrentes | Plantillas semanales, quincenales o mensuales editables, ejecución inmediata y cron diario | `/comprador/recurrentes`, `/api/cron` |
| Trazabilidad | Lotes con origen, fechas y certificados, y una página pública con QR descargable | `/proveedor/lotes`, `/trazabilidad/[lote]` |
| Asistente de compras | Convierte texto libre ("20 kg de arroz y 10 bidones para San Isidro el jueves") en una propuesta editable que solo se agrega al carrito al confirmar | `/comprador/asistente` |

## Simulado en el MVP

Estas piezas existen en la interfaz y en el flujo, pero no se conectan con terceros. Cada una está marcada como simulada en pantalla.

| Servicio | Cómo se simula | Qué haría falta para producción |
|---|---|---|
| Pagos | El comprador elige transferencia, tarjeta o crédito a 30 días, y el pago se registra como aprobado sin cobrar. La liquidación del proveedor muestra lo que se le transferiría | Pasarela (Niubiz, Culqi o Mercado Pago) y conciliación bancaria |
| Facturación electrónica SUNAT | `GET /api/pedidos/[id]/comprobante` genera un PDF consolidado con la marca "COMPROBANTE DE PRUEBA, NO VÁLIDO ANTE SUNAT". La interfaz `FacturacionElectronica` (`src/lib/servicios/facturacion.ts`) deja listo el punto de conexión | Un OSE/PSE autorizado que emita las facturas de cada proveedor |
| Logística | Cada proveedor avanza los estados a mano (confirmado, en preparación, en camino, entregado) | Integración con operadores logísticos o rastreo GPS |
| WhatsApp | Los avisos de pedido, aprobación, RFQ y licitación llegan como notificaciones dentro de la app | WhatsApp Business API con plantillas aprobadas |
| Sensores IoT | La temperatura se escribe a mano al recibir un pedido o registrar una entrega de contrato | Sensores o registradores de cadena de frío que envíen lecturas |
| Modelo de ML entrenado | El planificador usa un pronóstico estadístico (promedio ponderado y suavizamiento de Holt), explicable y sin datos de entrenamiento | Un modelo entrenado con el historial real del piloto, que puede extraerse como servicio |
| Asistente con IA generativa | Funciona por reglas. Si existe `ANTHROPIC_API_KEY`, interpreta el texto con la API de Claude, y ante cualquier fallo vuelve a las reglas | Ya es opcional; solo hace falta la clave |

## Hipótesis H1–H5

El tablero de `/admin` calcula cada indicador desde la base y lo compara con su meta (verde: cumple; ámbar: alcanza al menos el 80 % de la meta; rojo: por debajo).

| Hipótesis | Indicador | Cómo se calcula | Módulos que la alimentan |
|---|---|---|---|
| H1 · Ahorro | Ahorro promedio ponderado frente al precio promedio del mercado (meta 8 %) | `ahorroPromedio` sobre los ítems de pedidos | Catálogo, pedido consolidado, cotizaciones, licitaciones |
| H2 · Confianza en la IA | Porcentaje de sugerencias compradas sin modificar (meta 60 %) | `tasaSugerenciasAceptadas` sobre `SugerenciaIA` | Planificador, asistente |
| H3 · Recompra | Porcentaje de clientes que vuelven a comprar dentro de 30 días (meta 70 %) | `tasaRecompra` sobre las fechas de pedido por empresa | Repetir pedido, recurrentes, contratos |
| H4 · Proveedores | Proveedores homologados, activos y con comisión entre 5 % y 8 % (meta 10) | `proveedoresActivosEnRango` | Portal del proveedor, homologación, comisiones |
| H5 · Tiempo | Reducción del tiempo de compra frente a la línea base declarada (meta 50 %) | `reduccionTiempo` sobre la duración medida de cada pedido | Planificador, asistente, carrito consolidado |

## Segmentos

| Segmento | Cuenta demo | Qué usa |
|---|---|---|
| Oficinas | `compras@andina.pe` | Planificador por personas, pedido consolidado, aprobación por monto, panel de gasto y CSV |
| Restaurantes | `compras@saboresdelpuerto.pe` | Perecibles con nivel de stock, recurrentes semanales, recepción con temperatura y trazabilidad |
| Hospitales y clínicas | `compras@clinicasangabriel.pe` | Licitaciones con certificados exigidos, contratos con calendario y entregas trazadas por lote |
| Colegios | `compras@colegiolospinos.pe` | Planificador por alumnos y días de clase, cotizaciones y pedidos recurrentes |
| Proyectos y campamentos | `compras@huarazalto.pe` | Pedidos grandes con aprobación, cotizaciones a varios proveedores y fechas de entrega planificadas |
| Mayoristas (bodegas) | `rosa@bodegarosa.pe` | Precios por volumen con escalas, asistente y repetir pedido |
| Consumidor final | `cliente@correo.pe` | Tienda retail pública, canasta, entrega en su distrito y seguimiento en "Mi cuenta" |
| Proveedores | `ventas@limanorte.pe` y otros | Pedidos, catálogo, liquidación, competitividad, RFQ, licitaciones, contratos y lotes |

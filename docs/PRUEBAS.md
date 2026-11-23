# Pruebas de AbastIA

Esta tabla se armó a partir de las pruebas reales del repositorio:

- Pruebas unitarias: `tests/unit/negocio.test.ts` y `tests/unit/asistente.test.ts`, con Vitest.
- Pruebas extremo a extremo: `tests/e2e/nucleo.spec.ts` y `tests/e2e/ampliado.spec.ts`, con Playwright sobre la semilla de demostración.

En la ejecución del 23/11/2026 pasaron **51 de 51 pruebas unitarias**, con 99 % de cobertura de líneas en `src/lib/negocio`, y **18 de 18 pruebas e2e**.

```bash
pnpm test                      # unitarias con cobertura (umbral 90 %)
pnpm build && pnpm test:e2e    # e2e: reinicia la semilla y levanta la app en el puerto 3100
```

## Pruebas unitarias (lógica de negocio pura)

| ID | Módulo | Caso | Datos de entrada | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|---|
| U01 | Constantes | IGV, stock de seguridad y pesos del pronóstico | Constantes del informe | IGV 18 %, seguridad 10 %, pesos 0.1/0.2/0.3/0.4 | ✅ Pasó |
| U02 | Catálogo | Mejor oferta del arroz | 4 ofertas de arroz de la semilla | Molino del Valle, S/ 176.50 | ✅ Pasó |
| U03 | Catálogo | Precio promedio del arroz | Las mismas 4 ofertas | S/ 182.50 | ✅ Pasó |
| U04 | Catálogo | Ahorro frente al promedio | 176.50 frente a 182.50 | 3.3 % | ✅ Pasó |
| U05 | Catálogo | Excluye ofertas no válidas | Ofertas sin stock o de proveedor no homologado | No cuentan para mejor oferta ni promedio | ✅ Pasó |
| U06 | Catálogo | Producto sin ofertas | Lista vacía | Mejor `null`, promedio 0, ahorro 0 | ✅ Pasó |
| U07 | Planificador | Pronóstico ponderado del informe | Consumo 6, 7, 6, 8; 120 personas | 7.0 | ✅ Pasó |
| U08 | Planificador | Cantidad sugerida del informe | Pronóstico 7, 7 días, stock 2 | 6 sacos | ✅ Pasó |
| U09 | Planificador | Escala por personas | 240 personas | 14 | ✅ Pasó |
| U10 | Planificador | Ventana de 4 semanas | 100, 100, 6, 7, 6, 8 | 7 (ignora las semanas antiguas) | ✅ Pasó |
| U11 | Planificador | Historial corto | 1 o 2 semanas | Pesos renormalizados | ✅ Pasó |
| U12 | Planificador | Historial vacío | `[]` | Pronóstico 0 y sugerencia 0 | ✅ Pasó |
| U13 | Planificador | Stock suficiente | Pronóstico 7, stock 50 | 0 | ✅ Pasó |
| U14 | Planificador | Entradas no válidas | Personas 0, NaN, días 0, stock negativo | 0, y el stock negativo se trata como 0 | ✅ Pasó |
| U15 | Planificador | Horizonte de 14 días | Pronóstico 7, stock 2 | ⌈7 × 2 × 1.1 − 2⌉ = 14 | ✅ Pasó |
| U16 | Planificador | Pronóstico Holt | Menos de 8 semanas, o 8 semanas constantes con el doble de personas | `null`, o ≈ 20 | ✅ Pasó |
| U17 | Planificador | Explicación en lenguaje natural | Arroz, 6 sacos, 120 personas, stock 2 | "Sugerimos 6 sacos porque consumes ~7 por semana…" | ✅ Pasó |
| U18 | Planificador | Nivel de stock agotado | Pollo con stock 0 | Sin stock | ✅ Pasó |
| U19 | Planificador | Nivel de stock bajo | Stock 2, consumo 7 | Stock bajo (menos del 30 %) | ✅ Pasó |
| U20 | Planificador | Nivel de stock suficiente | Stock 3, consumo 7 | Suficiente | ✅ Pasó |
| U21 | Carrito | Totales con 3 proveedores | 2 arroz × 176.50, 10 agua × 11.50, 20 pollo × 9.90 | Total 666.00, subtotal 564.41, IGV 101.59, ahorro 23.50, 3 proveedores, 32 ítems | ✅ Pasó |
| U22 | Carrito | Carrito vacío | `[]` | Total 0 y ahorro 0 % | ✅ Pasó |
| U23 | Carrito | Cantidades no válidas | 0, 1.5, −1 | Error o `false` | ✅ Pasó |
| U24 | Carrito | Sin precio promedio | Promedio 0 | Ahorro 0 | ✅ Pasó |
| U25 | Proveedor | Neto del proveedor | S/ 1,180.00 con comisión de 6 % | S/ 940.00 | ✅ Pasó |
| U26 | Proveedor | Liquidación detallada | S/ 1,180.00, 6 % | Valor de venta 1000, IGV 180, comisión 60, neto 940 | ✅ Pasó |
| U27 | Proveedor | Límites de comisión | Total 0, comisión de 100 % o negativa, rango 5–8 % | 0, error, en rango o fuera de rango | ✅ Pasó |
| U28 | Proveedor | Competitividad | 189 frente a 176.50 | No competitivo, 7.1 % por encima | ✅ Pasó |
| U29 | Pedidos | Estado derivado | ENTREGADO, EN_CAMINO, CONFIRMADO | CONFIRMADO (el menos avanzado) | ✅ Pasó |
| U30 | Pedidos | Pendiente de aprobación | Pedido pendiente | PENDIENTE_APROBACION | ✅ Pasó |
| U31 | Pedidos | Rechazados y cancelados | Combinaciones con RECHAZADO y CANCELADO | Se ignoran salvo que lo estén todos | ✅ Pasó |
| U32 | Pedidos | Siguiente estado, aprobación y código | RECIBIDO; S/ 5,000 con límite de S/ 3,000; número 7 | CONFIRMADO; requiere aprobación; PED-0007 | ✅ Pasó |
| U33 | Fechas | Validación de la fecha de entrega | 23/11 (hoy), 29/11 (domingo), 08/12 (feriado) | Mensajes de error; el 24/11 es válido | ✅ Pasó |
| U34 | Fechas | Primera fecha válida | 28/11 y 07/12 | 30/11 y 10/12 | ✅ Pasó |
| U35 | Fechas | Utilidades de fecha | Fin de año, lunes de semana, 28/07, hora de Lima | 01/01/2027, lunes 23/11, feriado, fecha local de Lima | ✅ Pasó |
| U36 | Hipótesis | Semáforo | 0.09, 0.07, 0.02 y `null` frente a una meta de 0.08 | Verde, ámbar, rojo, sin datos | ✅ Pasó |
| U37 | Hipótesis | H1, ahorro ponderado | 90 frente a 100 | 10 % | ✅ Pasó |
| U38 | Hipótesis | H2, sugerencias aceptadas | 6/6, 4/5, 3/sin compra | 50 % | ✅ Pasó |
| U39 | Hipótesis | H3, recompra en 30 días | 3 clientes con compras | 1/3 | ✅ Pasó |
| U40 | Hipótesis | H4, proveedores en rango | 4 proveedores | 1 | ✅ Pasó |
| U41 | Hipótesis | H5, reducción de tiempo | 600 s y 1200 s frente a 60 min | 15 min y 75 % de reducción | ✅ Pasó |
| U42 | Validadores | RUC con dígito verificador | 20100047218, 20100047219, 123 | Válido, inválido, inválido | ✅ Pasó |
| U43 | Precio por volumen | Escalas | 1, 10 y 50 unidades con escalas 47 y 44 | 50, 47 y 44, con las unidades que faltan | ✅ Pasó |
| U44 | Licitaciones | Puntaje ponderado | 2 propuestas, criterios 50/25/15/10 | La más barata obtiene 50 en precio y el ranking queda ordenado | ✅ Pasó |
| U45 | Licitaciones | Pesos no válidos | Pesos que suman 60 o son negativos | Error; sin propuestas devuelve lista vacía | ✅ Pasó |
| U46 | Contratos | Calendario de entregas | 02/11/2026, semanal 1 mes, mensual 2 meses, quincenal 1 mes | 5, 2 y 3 fechas | ✅ Pasó |
| U47 | Asistente | Ejemplo del enunciado | "20 kg de arroz y 10 bidones para San Isidro el jueves" | 1 saco (con nota de 50 kg), 10 bidones, sede San Isidro, 26/11 | ✅ Pasó |
| U48 | Asistente | Palabras y fragmentos no entendidos | "tres cajas de aceite, 12,5 kg de pollo, 4 unicornios" | 3 aceite, 13 pollo; "4 unicornios" no entendido | ✅ Pasó |
| U49 | Asistente | Sin cantidad y productos repetidos | "café y 2 bolsas de café" | 1 ítem con 3 bolsas | ✅ Pasó |
| U50 | Asistente | Fechas en lenguaje natural | hoy, mañana, pasado mañana, lunes, 5/12, 5/1 | 23/11, 24/11, 25/11, 30/11, 05/12/2026, 05/01/2027 | ✅ Pasó |
| U51 | Asistente | Sede, normalización y búsqueda | "santiago de surco", "  Café   BIDÓN " | Sede Surco y "cafe bidon" | ✅ Pasó |

## Pruebas extremo a extremo (Playwright)

| ID | Módulo | Caso | Datos de entrada | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|---|
| E01 | Seguridad | Cada rol ve solo su menú | Las 4 cuentas demo | Menú propio de comprador, aprobador, proveedor y admin | ✅ Pasó |
| E02 | Seguridad | Aislamiento por empresa y proveedor | El proveedor abre `/comprador`; APIs de pedidos ajenos | Redirección; 403 o 404 para el pedido ajeno; 401 sin sesión | ✅ Pasó |
| E03 | Catálogo | Mejor oferta, búsqueda y filtros | Búsqueda "arroz" | Molino del Valle S/ 176.50, promedio S/ 182.50, ahorro 3.3 % | ✅ Pasó |
| E04 | Planificador | Sugerencias explicadas | San Isidro, 120 y luego 240 personas, 7 días | Arroz 6 (pronóstico 7.0), luego 14; pollo "Sin stock" | ✅ Pasó |
| E05 | Pedidos | Flujo completo | 240 personas, sugerencias, fecha válida | Pedido sobre el límite, aprobación, 4 avances por proveedor, recepción y calificación | ✅ Pasó |
| E06 | Proveedor | Liquidación | Pedido de S/ 1,180.00 de la semilla | Neto S/ 940.00 con 6 % | ✅ Pasó |
| E07 | Pedidos | Repetir pedido | Pedido entregado | El carrito se recrea con sus ítems | ✅ Pasó |
| E08 | Panel | Gasto y CSV | Panel del comprador; `GET /api/reportes/gasto` | Gráfico mensual, ahorro acumulado y CSV (`text/csv`) con filas de detalle | ✅ Pasó |
| E09 | Administración | Homologación y H1–H5 | Andes Express pendiente | Queda homologado, su quinua aparece en el catálogo y se ven las 5 hipótesis | ✅ Pasó |
| E10 | Landing | Calculadora y lead | Gasto mensual y formulario de piloto | La calculadora responde en vivo y el lead se guarda | ✅ Pasó |
| E11 | PWA | Manifest | `GET /manifest.webmanifest` | Nombre AbastIA, `display: standalone` e ícono de 512×512 | ✅ Pasó |
| E12 | Mayorista | Precios por volumen | Bodega Doña Rosa | Catálogo con escalas "N+" | ✅ Pasó |
| E13 | Cotizaciones | RFQ con comparación | Café; Café Selva cotiza 36.50 y Lima Norte 41.00 | Mejor total S/ 912.50, que se convierte en pedido | ✅ Pasó |
| E14 | Licitaciones | Propuestas selladas y adjudicación | La clínica publica; Mantaro y La Parada proponen | API 403 antes del cierre, ranking al cerrar, contrato con 13 entregas | ✅ Pasó |
| E15 | Trazabilidad | Página pública del lote | Código de un lote de la semilla | Origen, fechas, certificados, QR y descarga PNG | ✅ Pasó |
| E16 | Tienda | Compra retail | Consumidor final con canasta y distrito | Pedido RETAIL visible en "Mi cuenta" | ✅ Pasó |
| E17 | Asistente | Propuesta por reglas | Texto libre con productos, sede y fecha | Propuesta editable; solo agrega al carrito al confirmar | ✅ Pasó |
| E18 | Recurrentes | Edición, generación y cron | Recurrente desde un pedido; `GET /api/cron` | Pedido RECURRENTE generado y el cron responde con el resumen | ✅ Pasó |

## Otras verificaciones

- `pnpm lint` (ESLint sin advertencias) y `pnpm typecheck` sin errores.
- `node scripts/capturas.mjs`: las 10 pantallas principales a 375 px y 1440 px, sin desborde horizontal.
- CI en GitHub Actions: lint, tipos y pruebas unitarias en cada push, y pruebas e2e con PostgreSQL 16.

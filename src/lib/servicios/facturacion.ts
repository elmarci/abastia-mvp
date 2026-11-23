import "server-only";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { fechaSolo, num, soles } from "@/lib/formato";
import type { PedidoDetalle } from "@/modules/pedidos/consultas";

/**
 * Interfaz para conectar un proveedor real de facturación electrónica (OSE/PSE ante SUNAT).
 * En el MVP se usa ComprobanteDePrueba, que genera un PDF sin validez tributaria.
 */
export interface FacturacionElectronica {
  readonly nombre: string;
  /** Indica si los comprobantes emitidos tienen validez ante SUNAT. */
  readonly validoAnteSunat: boolean;
  emitir(pedido: PedidoDetalle): Promise<{ serie: string; numero: string; pdf: ArrayBuffer }>;
}

/** Implementación simulada: PDF consolidado marcado como comprobante de prueba. */
export class ComprobanteDePrueba implements FacturacionElectronica {
  readonly nombre = "Comprobante de prueba AbastIA";
  readonly validoAnteSunat = false;

  async emitir(pedido: PedidoDetalle) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const ancho = doc.internal.pageSize.getWidth();
    const verde: [number, number, number] = [31, 122, 77];

    // Encabezado
    doc.setFillColor(...verde);
    doc.rect(0, 0, ancho, 70, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("AbastIA", 40, 44);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Compra justa, a precio justo.", 40, 58);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Comprobante consolidado ${pedido.codigo}`, ancho - 40, 40, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Serie de prueba P001-${String(pedido.numero).padStart(8, "0")}`, ancho - 40, 56, { align: "right" });

    // Aviso de prueba
    doc.setTextColor(194, 65, 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("COMPROBANTE DE PRUEBA, NO VÁLIDO ANTE SUNAT", ancho / 2, 95, { align: "center" });

    // Datos del cliente
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const cliente = pedido.empresa ? `${pedido.empresa.razonSocial} · RUC ${pedido.empresa.ruc}` : pedido.creadoPor.nombre;
    doc.text(`Cliente: ${cliente}`, 40, 122);
    doc.text(`Entrega: ${pedido.sede ? `${pedido.sede.nombre}, ${pedido.sede.direccion}, ${pedido.sede.distrito}` : `${pedido.direccionEntrega ?? ""}, ${pedido.distritoEntrega ?? ""}`}`, 40, 138);
    doc.text(`Fecha de emisión: ${new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "long" }).format(pedido.creadoEn)} · Entrega: ${fechaSolo(pedido.fechaEntrega)}`, 40, 154);

    let y = 176;
    // Detalle por proveedor
    for (const s of pedido.subPedidos) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`${s.proveedor.razonSocial} · RUC ${s.proveedor.ruc}`, 40, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 40, right: 40 },
        head: [["Producto", "Cant.", "P. unitario", "Importe"]],
        body: s.items.map((i) => [i.producto.nombre, String(i.cantidad), soles(i.precioUnitario), soles(num(i.precioUnitario) * i.cantidad)]),
        foot: [["", "", "Total proveedor", soles(s.total)]],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: verde },
        footStyles: { fillColor: [240, 244, 241], textColor: [30, 30, 30], fontStyle: "bold" },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
    }

    // Totales
    const filas: [string, string][] = [
      ["Valor de venta", soles(pedido.subtotal)],
      ["IGV 18 %", soles(pedido.igv)],
      ["Total", soles(pedido.total)],
      ["Ahorro frente al promedio de mercado", soles(pedido.ahorro)],
    ];
    autoTable(doc, {
      startY: y,
      margin: { left: ancho / 2, right: 40 },
      body: filas,
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      theme: "plain",
    });
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text("Documento generado por el MVP de AbastIA con fines demostrativos. No tiene validez tributaria.", 40, doc.internal.pageSize.getHeight() - 30);

    return { serie: "P001", numero: String(pedido.numero).padStart(8, "0"), pdf: doc.output("arraybuffer") };
  }
}

/** Proveedor de facturación activo (cambiar aquí al conectar un OSE real). */
export const facturacion: FacturacionElectronica = new ComprobanteDePrueba();

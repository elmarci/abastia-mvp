import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

/** Origen público de la app (para que el QR apunte a la URL correcta). */
export async function origenPublico() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

export async function urlTrazabilidad(codigo: string) {
  return `${await origenPublico()}/trazabilidad/${encodeURIComponent(codigo)}`;
}

/** QR como data URL (para mostrarlo) o como PNG (para descargarlo). */
export async function qrDataUrl(texto: string) {
  return QRCode.toDataURL(texto, { margin: 1, width: 320, errorCorrectionLevel: "M", color: { dark: "#0f3d2e", light: "#ffffff" } });
}

export async function qrPng(texto: string) {
  return QRCode.toBuffer(texto, { margin: 2, width: 800, errorCorrectionLevel: "M" });
}

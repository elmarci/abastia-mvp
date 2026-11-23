import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Proveedores } from "@/components/app/proveedores";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AbastIA · Compra justa, a precio justo", template: "%s · AbastIA" },
  description:
    "Plataforma B2B de abastecimiento con inteligencia artificial para empresas e instituciones de Lima: compara proveedores homologados, planifica con IA y compra en un solo pedido.",
  applicationName: "AbastIA",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icono.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "AbastIA", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1F7A4D" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1113" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  );
}

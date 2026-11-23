import type { MetadataRoute } from "next";

/** Manifiesto de la PWA (instalable en el celular). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AbastIA · Abastecimiento con IA",
    short_name: "AbastIA",
    description: "Compra justa, a precio justo. Abastecimiento B2B con inteligencia artificial para empresas e instituciones.",
    lang: "es-PE",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf9",
    theme_color: "#1F7A4D",
    categories: ["business", "shopping", "food"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Planificador IA", url: "/comprador/planificador" },
      { name: "Mis pedidos", url: "/comprador/pedidos" },
    ],
  };
}

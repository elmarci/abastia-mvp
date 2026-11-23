"use client";
import { useEffect } from "react";

/** Registra el service worker para que la app sea instalable (PWA). */
export function RegistroServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si falla, la app sigue funcionando como sitio web normal
      });
    }
  }, []);
  return null;
}

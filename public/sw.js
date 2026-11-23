// Service worker básico de AbastIA: hace la app instalable y muestra una página
// sin conexión. No guarda datos privados en caché (las páginas siempre van a la red).
const CACHE = "abastia-v1";
const ESTATICOS = ["/offline.html", "/icono.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Recursos estáticos de Next.js: primero caché
  if (url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))) {
    evento.respondWith(
      caches.match(request).then(
        (r) =>
          r ||
          fetch(request).then((resp) => {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(request, copia));
            return resp;
          }),
      ),
    );
    return;
  }
  // Navegación: red; si no hay conexión, página offline
  if (request.mode === "navigate") {
    evento.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
  }
});

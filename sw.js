/* OdontoCloud — service worker
   Estratégia:
   - Navegação (carregar a página principal): network-first, com fallback
     para a cópia em cache quando offline.
   - Restantes pedidos (CSS/JS/fontes/CDN/ícones): cache-first, com
     atualização em segundo plano (stale-while-revalidate).
   Os dados clínicos em si (pacientes, agenda, etc.) vivem no localStorage
   da página, não neste cache — por isso a app continua totalmente
   utilizável offline depois da primeira visita, incluindo leitura/edição
   de dados já guardados. */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `odontocloud-shell-${CACHE_VERSION}`;
const APP_SHELL = [
  './odontocloud-prototipo_7_5.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match('./odontocloud-prototipo_7_5.html').then((r) => r || caches.match(req))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

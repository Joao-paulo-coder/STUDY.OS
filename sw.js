const CACHE_NAME = 'studyos-v3';

// Assets para cachear na instalação
const ASSETS = [
  '/',
  '/studyos.html',
  '/index.html',
  '/manifest.json',
];

// Instalar: cachear tudo imediatamente
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(ASSETS.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// Ativar: limpar caches antigos e tomar controle imediato
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: estratégia híbrida
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Deixar passar sem cache: APIs externas
  const isExternal =
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('groq.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('jsdelivr.net');

  if (isExternal) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response('{"error":"offline"}', {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Para navegação (HTML): network-first com fallback para cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(e.request)
            .then(cached => cached || caches.match('/studyos.html'));
        })
    );
    return;
  }

  // Para outros assets: cache-first com atualização em background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});

// Forçar atualização quando solicitado
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
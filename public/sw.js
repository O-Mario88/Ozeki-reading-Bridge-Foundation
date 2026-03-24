const CACHE_NAME = "ozeki-nlis-v3";
const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = [
  "/",
  "/portal/dashboard",
  OFFLINE_URL,
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Helper to check if a request shouldn't be touched by the SW (API calls, unsupported methods)
function shouldBypassCache(request) {
  if (request.method !== "GET") return true;
  const url = new URL(request.url);
  // Do not cache API routes
  if (url.pathname.startsWith("/api/")) return true;
  // Bypassing next hot-reloader
  if (url.pathname.startsWith("/_next/webpack-hmr")) return true;
  // Do not intercept service worker loading
  if (url.pathname === "/sw.js") return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  if (shouldBypassCache(request)) {
    return;
  }

  const url = new URL(request.url);
  const isDocument = request.mode === "navigate" && request.headers.get("accept")?.includes("text/html");
  const isNextStaticPath = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/assets/");
  
  // Strategy 1: HTML Document Navigation -> Network First, fallback to generic /offline if completely uncached
  if (isDocument) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          return response;
        })
        .catch(async () => {
          // If completely offline, try looking up exactly this request
          const cached = await caches.match(request);
          if (cached) return cached;
          
          // Return generic offline fallback page
          const offlineFallback = await caches.match(OFFLINE_URL);
          if (offlineFallback) return offlineFallback;
          
          // Absolute last resort
          return caches.match("/");
        })
    );
    return;
  }

  // Strategy 2: Precompiled JS, CSS, Fonts, Images -> Stale-While-Revalidate
  // Next.js chunks have hashes, so they rarely change, making Cache First optimal, 
  // but Stale-while-revalidate is safer for generalized directories like /assets/.
  if (isNextStaticPath || request.destination === "image" || request.destination === "font" || request.destination === "style" || request.destination === "script") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
            return response;
          })
          .catch(() => cached); // Ignore network error silently

        return cached || networkFetch;
      })
    );
    return;
  }

  // Strategy 3: Next.js RSC Data & Everything Else -> Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('', { status: 503, statusText: 'Service Unavailable (Offline)' });
      })
  );
});

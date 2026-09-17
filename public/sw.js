/* Masar Courier service worker — app-shell + offline notice.
   Network-first with an offline fallback page; never caches API/HTML aggressively. */
const CACHE = "masar-v1";
const OFFLINE_HTML = `
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Masar — offline</title><style>body{font-family:system-ui,sans-serif;background:#0b0d12;color:#e8eaf1;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px}div{max-width:280px}h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#99a1b3;margin:0}</style></head>
<body><div><h1>ماصر — غير متصل</h1><p>لا يوجد اتصال بالإنترنت. سيتم إعادة المحاولة تلقائيًا عند عودة الشبكة.</p></div></body></html>`;

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && url.origin === location.origin && !url.pathname.startsWith("/_next/")) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        if (e.request.mode === "navigate") {
          return new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
        throw new Error("offline");
      })
  );
});

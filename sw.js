// 倫敦巴士即時到站 - Service Worker
// 只快取 app shell (HTML/manifest/icons)，令使用者離線時仍可打開
// App 外觀；TfL API 嘅即時到站查詢一律直接放行，唔做快取，
// 保證睇到嘅永遠係最新資料。

const CACHE_NAME = "londonbus-shell-v3";
const SHELL_FILES = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n.startsWith("londonbus-shell-") && n !== CACHE_NAME).map((n) => caches.delete(n))  // 只清自己嘅舊快取：同一個 github.io 網站仲有日誌、UKHKbus，唔可以刪佢哋嘅
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // TfL API（跨網域）永遠直接去網絡攞，唔經 service worker 快取
  if (url.origin !== self.location.origin) {
    return;
  }

  // 同源嘅 app shell 檔案：cache-first，網絡有更新就順便更新快取
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

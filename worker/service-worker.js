import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(__CATALYST_PRECACHE__);

const VERSION = "catalyst-v6";
const SHELL = ["/", "/platform", "/gis", "/demo", "/operations", "/icon.svg"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(`${VERSION}-shell`).then((cache) => cache.addAll(SHELL)));
  // Keep the existing worker in control until all tabs close. It may be serving a
  // different Next.js build whose chunks still need its cache.
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) =>
    key.startsWith("catalyst-") && !key.startsWith(VERSION)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
registerRoute(({ request, url }) => url.origin === self.location.origin && request.mode === "navigate",
  new NetworkFirst({ cacheName: `${VERSION}-shell`, networkTimeoutSeconds: 5,
    plugins: [{ cachedResponseWillBeUsed: async ({ cachedResponse, request }) => cachedResponse ?? caches.match(new URL(request.url).pathname) }] }));
registerRoute(({ request, url }) => url.origin === self.location.origin && !url.pathname.startsWith("/api/") &&
  (url.pathname.startsWith("/_next/static/") || ["style", "script", "font", "image"].includes(request.destination)),
  new CacheFirst({ cacheName: `${VERSION}-assets`, plugins: [new ExpirationPlugin({ maxEntries: 300, purgeOnQuotaError: true })] }));
// Private APIs are never cached by the worker. The signed-in field screen owns
// its explicitly scoped IndexedDB copy and erases it on sign-out.
// Public, immutable satellite renderings are bounded and useful offline.
registerRoute(({ url }) => url.origin === self.location.origin && url.pathname === "/api/satellite/render",
  new CacheFirst({ cacheName: `${VERSION}-satellite`, plugins: [new ExpirationPlugin({ maxEntries: 10, purgeOnQuotaError: true })] }));

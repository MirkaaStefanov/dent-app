/* No appointments, API responses or authenticated pages are cached. */
const OFFLINE_CACHE = 'dent-offline-v1';
function notificationTarget(data) {
  const target = new URL('/admin/', self.location.origin);
  target.hash = 'schedule';
  if (typeof data?.appointmentId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.appointmentId)) {
    target.searchParams.set('appointment', data.appointmentId.toLowerCase());
    if (typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) target.searchParams.set('date', data.date);
  }
  return target.href;
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache => cache.add('/offline.html')).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('dent-offline-') && key !== OFFLINE_CACHE).map(key => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate' && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  }
});
self.addEventListener('push', event => {
  let payload = {};
  try {
    const parsed = event.data ? event.data.json() : null;
    if (parsed && typeof parsed === 'object') payload = parsed;
  } catch { /* Show a generic notification. */ }
  event.waitUntil(self.registration.showNotification(typeof payload.title === 'string' ? payload.title : 'Кабинетът Ви', {
    body: typeof payload.body === 'string' ? payload.body : 'Има промяна в графика. Отворете кабинета за подробности.',
    icon: '/pwa/icon-192.png',
    badge: '/pwa/badge.png',
    tag: typeof payload.tag === 'string' ? payload.tag : 'dent-update',
    data: { appointmentId: payload.appointmentId, date: payload.date },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windows => {
    const target = notificationTarget(event.notification.data);
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && new URL(client.url).pathname.startsWith('/admin/')) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});

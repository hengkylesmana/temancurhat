const CACHE_NAME = 'rasa-cache-v1';
// Daftar file inti yang perlu di-cache agar aplikasi bisa berjalan offline.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
  // Karena CSS dan JS Anda inline di index.html, kita tidak perlu menambahkannya di sini.
  // Jika Anda memisahkannya nanti, tambahkan path file tersebut di sini.
];

// 1. Proses Instalasi: Menyimpan file ke cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Proses Fetch: Mengambil file dari cache jika offline
self.addEventListener('fetch', event => {
  // Kita tidak me-cache permintaan ke API agar data selalu fresh
  if (event.request.url.includes('/api/chat')) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika file ada di cache, kembalikan dari cache
        if (response) {
          return response;
        }
        // Jika tidak, ambil dari jaringan
        return fetch(event.request);
      }
    )
  );
});

// 3. Proses Aktivasi: Membersihkan cache lama
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
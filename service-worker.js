const CACHE_NAME = 'gold-finance-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/dashboard.css',
  './css/print.css',
  './js/utils.js',
  './js/db.js',
  './js/auth.js',
  './js/dashboard.js',
  './js/customers.js',
  './js/loans.js',
  './js/gold.js',
  './js/payments.js',
  './js/closure.js',
  './js/expenses.js',
  './js/reports.js',
  './js/receipts.js',
  './js/backup.js',
  './js/settings.js',
  './js/app.js'
  // Assets will be added later or fallback to network
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Ngurra Pathways Service Worker
// Provides offline support, caching, and push notifications

const CACHE_NAME = 'ngurra-pathways-v2';
const STATIC_CACHE = 'ngurra-static-v2';
const DYNAMIC_CACHE = 'ngurra-dynamic-v2';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/jobs',
  '/mentorship',
  '/community',
  '/resources',
  '/social-feed',
  '/events',
  '/privacy',
  '/terms',
  '/offline',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Never cache Next.js internal assets; they change frequently and caching them
  // can cause stale bundles and infinite loading spinners.
  if (url.pathname.startsWith('/_next/')) {
    return;
  }

  // Skip API calls - always go to network
  if (url.pathname.startsWith('/api') || url.origin !== location.origin) {
    return;
  }

  // For HTML pages - network first, cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the response
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cached) => {
              if (cached) return cached;
              // Return offline page if available
              return caches.match('/offline');
            });
        })
    );
    return;
  }

  // For other assets - cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) return cached;
        
        return fetch(request)
          .then((response) => {
            // Don't cache non-success responses
            if (!response || response.status !== 200) {
              return response;
            }

            // Clone and cache
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clone);
            });

            return response;
          });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = { title: 'Ngurra Pathways', body: 'You have a new notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'ngurra-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline job applications
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'sync-applications') {
    event.waitUntil(syncOfflineApplications());
  }
});

async function syncOfflineApplications() {
  try {
    const db = await openIndexedDB();
    const applications = await getOfflineApplications(db);

    for (const app of applications) {
      try {
        const response = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(app),
        });

        if (response.ok) {
          await removeOfflineApplication(db, app.id);
          console.log('[SW] Synced application:', app.id);
        }
      } catch (err) {
        console.error('[SW] Failed to sync application:', app.id, err);
      }
    }
  } catch (err) {
    console.error('[SW] Sync failed:', err);
  }
}

// IndexedDB helpers for offline storage
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ngurra-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('applications')) {
        db.createObjectStore('applications', { keyPath: 'id' });
      }
    };
  });
}

function getOfflineApplications(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['applications'], 'readonly');
    const store = transaction.objectStore('applications');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removeOfflineApplication(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['applications'], 'readwrite');
    const store = transaction.objectStore('applications');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

console.log('[SW] Service worker loaded');

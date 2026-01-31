// Service Worker per BOVE App PWA
const CACHE_NAME = 'bove-app-v1.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/calendar.html',
  '/clients.html',
  '/profile.html',
  '/manifest.json',
  '/assets/css/styles.css',
  '/assets/js/app.js',
  '/assets/js/firebase-config.js',
  '/assets/icons/icon-72.png',
  '/assets/icons/icon-96.png',
  '/assets/icons/icon-128.png',
  '/assets/icons/icon-144.png',
  '/assets/icons/icon-152.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-384.png',
  '/assets/icons/icon-512.png'
];

// Installazione Service Worker
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker installato');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache aperta, aggiungendo file...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✨ Tutti i file sono stati memorizzati nella cache');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Errore durante l\'installazione:', error);
      })
  );
});

// Attivazione Service Worker
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker attivato');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️  Elimino vecchia cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Nuova cache attiva, Service Worker pronto');
      return self.clients.claim();
    })
  );
});

// Intercetta richieste di rete
self.addEventListener('fetch', (event) => {
  // Escludi richieste chrome-extension://
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // Escludi richieste Firebase
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic.com')) {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Se la risorsa è in cache, restituiscila
        if (response) {
          return response;
        }
        
        // Altrimenti, fai la richiesta di rete
        return fetch(event.request)
          .then((response) => {
            // Controlla se abbiamo ricevuto una risposta valida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clona la risposta per salvarla in cache
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Salva solo risorse dalla stessa origine
                if (event.request.url.startsWith(self.location.origin)) {
                  cache.put(event.request, responseToCache);
                }
              });
            
            return response;
          })
          .catch(() => {
            // Fallback per pagina offline
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // Fallback per immagini
            if (event.request.destination === 'image') {
              return caches.match('/assets/icons/icon-192.png');
            }
            
            return new Response('Connessione assente. Controlla la tua connessione internet.', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Gestione notifiche push
self.addEventListener('push', (event) => {
  console.log('📬 Notifica push ricevuta:', event);
  
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Nuova notifica',
        body: event.data.text() || 'Hai una nuova notifica',
        icon: '/assets/icons/icon-192.png'
      };
    }
  }
  
  const options = {
    body: data.body || 'BOVE s.n.c. - Nuova notifica',
    icon: data.icon || '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-96.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
      primaryKey: data.tag || '1'
    },
    actions: [
      {
        action: 'open',
        title: 'Apri App'
      },
      {
        action: 'close',
        title: 'Chiudi'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'BOVE App', options)
  );
});

// Gestione click su notifiche
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notifica cliccata:', event.notification.data);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Controlla se c'è già una finestra aperta
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Se non c'è, apri una nuova finestra
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Sincronizzazione in background
self.addEventListener('sync', (event) => {
  console.log('🔄 Sincronizzazione in background:', event.tag);
  
  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  }
});

// Funzione di sincronizzazione appuntamenti
async function syncAppointments() {
  try {
    const cache = await caches.open('bove-sync');
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const appointment = await response.json();
      
      // Qui implementeresti la sincronizzazione con il server
      console.log('Sincronizzazione appuntamento:', appointment);
      
      // Dopo la sincronizzazione, rimuovi dalla cache
      await cache.delete(request);
    }
    
    // Notifica completamento sincronizzazione
    await self.registration.showNotification('Sincronizzazione completata', {
      body: 'Tutti gli appuntamenti sono stati sincronizzati',
      icon: '/assets/icons/icon-192.png',
      tag: 'sync-complete'
    });
    
  } catch (error) {
    console.error('Errore sincronizzazione:', error);
  }
}

// Messaggio al Service Worker
self.addEventListener('message', (event) => {
  console.log('💬 Messaggio ricevuto dal client:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE') {
    event.ports[0].postMessage({
      cacheName: CACHE_NAME,
      cachedUrls: urlsToCache
    });
  }
});
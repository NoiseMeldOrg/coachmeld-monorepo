// Service Worker for chunk loading error recovery
// This helps handle chunk loading failures gracefully

const CACHE_NAME = 'coachmeld-admin-chunks-v1'

// Listen for failed chunk loading requests
self.addEventListener('fetch', event => {
  // Only handle JavaScript chunk requests that failed
  if (event.request.url.includes('/_next/static/chunks/') && 
      event.request.url.endsWith('.js')) {
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If successful, cache the response
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone)
            })
            return response
          }
          
          // If failed (404, etc), try to serve from cache
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              console.log('Serving chunk from cache:', event.request.url)
              return cachedResponse
            }
            
            // If not in cache, return the failed response
            return response
          })
        })
        .catch(error => {
          // Network error, try cache first
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              console.log('Network failed, serving chunk from cache:', event.request.url)
              return cachedResponse
            }
            
            // No cache available, propagate the error
            throw error
          })
        })
    )
  }
})

// Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName.startsWith('coachmeld-admin-chunks-'))
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      )
    })
  )
})

console.log('CoachMeld Admin chunk recovery service worker loaded')
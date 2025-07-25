'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register service worker in production and if supported
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw-chunk-recovery.js')
        .then(registration => {
          console.log('Chunk recovery service worker registered:', registration.scope)
        })
        .catch(error => {
          console.log('Service worker registration failed:', error)
        })
    }
  }, [])

  // This component doesn't render anything
  return null
}
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/app/globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { SupabaseProvider } from '@/components/providers/supabase-provider'
import { ChunkErrorBoundary } from '@/components/chunk-error-boundary'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  title: 'CoachMeld Admin',
  description: 'Admin dashboard for managing CoachMeld',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ChunkErrorBoundary>
          <ServiceWorkerRegistration />
          <SupabaseProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </SupabaseProvider>
        </ChunkErrorBoundary>
      </body>
    </html>
  )
}
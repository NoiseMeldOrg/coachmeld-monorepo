'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasChunkError: boolean
  errorInfo: string | null
}

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasChunkError: false, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a chunk loading error
    const isChunkError = error.name === 'ChunkLoadError' || 
                        error.message.includes('Loading chunk') || 
                        error.message.includes('Loading CSS chunk')
    
    if (isChunkError) {
      return {
        hasChunkError: true,
        errorInfo: error.message
      }
    }
    
    // Let other errors be handled by other error boundaries
    throw error
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log chunk loading errors for debugging
    console.error('Chunk loading error caught:', error, errorInfo)
  }

  handleReload = () => {
    // Clear any cached resources and reload the page
    if (typeof window !== 'undefined') {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name)
          })
        }).finally(() => {
          (window as any).location.reload()
        })
      } else {
        (window as any).location.reload()
      }
    }
  }

  render() {
    if (this.state.hasChunkError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Resource Loading Error
              </CardTitle>
              <CardDescription>
                A resource failed to load. This usually happens after an app update.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  The application has been updated and needs to refresh to load the latest resources.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={this.handleReload}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Application
              </Button>
              
              {this.state.errorInfo && (
                <details className="text-xs text-muted-foreground mt-4">
                  <summary className="cursor-pointer">Technical Details</summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {this.state.errorInfo}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
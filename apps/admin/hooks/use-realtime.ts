import { useEffect, useRef } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { subscribeToTable, subscribeToMultipleTables, RealtimeOptions, RealtimeEvent } from '@/lib/supabase/realtime'

export interface UseRealtimeOptions extends RealtimeOptions {
  enabled?: boolean
}

/**
 * Hook to subscribe to real-time changes on a single table
 */
export function useRealtimeTable<T = any>(
  table: string,
  callback: (payload: { eventType: RealtimeEvent; new: T; old: T }) => void,
  options: UseRealtimeOptions = {}
) {
  const { supabase } = useSupabase()
  const subscriptionRef = useRef<ReturnType<typeof subscribeToTable> | null>(null)

  useEffect(() => {
    if (!supabase || options.enabled === false) return

    subscriptionRef.current = subscribeToTable(supabase, table, callback, options)

    return () => {
      subscriptionRef.current?.unsubscribe()
    }
  }, [supabase, table, callback, options.enabled, options.event, options.schema, options.filter])
}

/**
 * Hook to subscribe to multiple tables
 */
export function useRealtimeTables(
  subscriptions: Array<{
    table: string
    callback: (payload: any) => void
    options?: RealtimeOptions
  }>,
  enabled = true
) {
  const { supabase } = useSupabase()
  const subscriptionsRef = useRef<ReturnType<typeof subscribeToMultipleTables> | null>(null)

  useEffect(() => {
    if (!supabase || !enabled) return

    subscriptionsRef.current = subscribeToMultipleTables(supabase, subscriptions)

    return () => {
      subscriptionsRef.current?.forEach(sub => sub.unsubscribe())
    }
  }, [supabase, subscriptions, enabled])
}

/**
 * Hook for document sources real-time updates
 */
export function useDocumentSourcesRealtime(
  onInsert?: (document: any) => void,
  onUpdate?: (document: any) => void,
  onDelete?: (document: any) => void
) {
  useRealtimeTable('document_sources', (payload) => {
    switch (payload.eventType) {
      case 'INSERT':
        onInsert?.(payload.new)
        break
      case 'UPDATE':
        onUpdate?.(payload.new)
        break
      case 'DELETE':
        onDelete?.(payload.old)
        break
    }
  })
}

/**
 * Hook for coach documents real-time updates
 */
export function useCoachDocumentsRealtime(
  onInsert?: (document: any) => void,
  onUpdate?: (document: any) => void,
  onDelete?: (document: any) => void,
  sourceId?: string
) {
  const options: UseRealtimeOptions = sourceId 
    ? { filter: `source_id=eq.${sourceId}` }
    : {}

  useRealtimeTable('coach_documents', (payload) => {
    switch (payload.eventType) {
      case 'INSERT':
        onInsert?.(payload.new)
        break
      case 'UPDATE':
        onUpdate?.(payload.new)
        break
      case 'DELETE':
        onDelete?.(payload.old)
        break
    }
  }, options)
}

/**
 * Hook for user activity real-time updates
 */
export function useUserActivityRealtime(
  onUserJoin?: (user: any) => void,
  onUserLeave?: (user: any) => void
) {
  const { supabase } = useSupabase()
  
  useEffect(() => {
    if (!supabase) return

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        onUserJoin?.(session.user)
      } else if (event === 'SIGNED_OUT') {
        onUserLeave?.(session?.user)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, onUserJoin, onUserLeave])
}
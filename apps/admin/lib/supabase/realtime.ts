import { SupabaseClient } from '@supabase/supabase-js'
import { RealtimeChannel } from '@supabase/supabase-js'

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RealtimeSubscription {
  channel: RealtimeChannel
  unsubscribe: () => void
}

export interface RealtimeOptions {
  event?: RealtimeEvent | RealtimeEvent[]
  schema?: string
  filter?: string
}

/**
 * Subscribe to real-time changes on a table
 */
export function subscribeToTable<T = any>(
  supabase: SupabaseClient,
  table: string,
  callback: (payload: {
    eventType: RealtimeEvent
    new: T
    old: T
  }) => void,
  options: RealtimeOptions = {}
): RealtimeSubscription {
  const channel = supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes' as any,
      {
        event: options.event || '*',
        schema: options.schema || 'public',
        table,
        filter: options.filter,
      },
      (payload: any) => {
        callback({
          eventType: payload.eventType as RealtimeEvent,
          new: payload.new as T,
          old: payload.old as T,
        })
      }
    )
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

/**
 * Subscribe to multiple tables at once
 */
export function subscribeToMultipleTables(
  supabase: SupabaseClient,
  subscriptions: Array<{
    table: string
    callback: (payload: any) => void
    options?: RealtimeOptions
  }>
): RealtimeSubscription[] {
  return subscriptions.map(({ table, callback, options }) =>
    subscribeToTable(supabase, table, callback, options)
  )
}

/**
 * Create a presence channel for tracking online users
 */
export function createPresenceChannel(
  supabase: SupabaseClient,
  channelName: string,
  userData: Record<string, any>
) {
  const channel = supabase.channel(channelName)
  
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      console.log('Online users:', state)
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key, newPresences)
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key, leftPresences)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(userData)
      }
    })

  return {
    channel,
    unsubscribe: () => {
      channel.untrack()
      supabase.removeChannel(channel)
    },
  }
}

/**
 * Broadcast messages to all connected clients
 */
export function createBroadcastChannel(
  supabase: SupabaseClient,
  channelName: string,
  onMessage: (payload: any) => void
) {
  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'message' }, onMessage)
    .subscribe()

  return {
    channel,
    send: (message: any) => {
      channel.send({
        type: 'broadcast',
        event: 'message',
        payload: message,
      })
    },
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}
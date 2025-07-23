'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Users,
  Brain,
  Youtube,
  Settings,
  Database,
  Home,
  Bot,
  Shield,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Coaches', href: '/dashboard/coaches', icon: Bot },
  { name: 'RAG Documents', href: '/dashboard/rag', icon: FileText },
  { name: 'YouTube Transcripts', href: '/dashboard/youtube', icon: Youtube },
  { name: 'Knowledge Base', href: '/dashboard/knowledge', icon: Brain },
  { name: 'GDPR Requests', href: '/dashboard/gdpr', icon: Shield },
  { name: 'Database', href: '/dashboard/database', icon: Database },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from('account_deletion_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      
      setPendingCount(count || 0)
    }

    fetchPendingCount()

    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000)
    return () => clearInterval(interval)
  }, [supabase])

  return (
    <div className="flex h-full w-64 flex-col bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">CoachMeld Admin</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-secondary-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.name}</span>
              {item.name === 'GDPR Requests' && pendingCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Version 0.1.0
        </p>
      </div>
    </div>
  )
}
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { RealtimeNotifications } from '@/components/realtime-notifications'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
          {children}
        </main>
      </div>
      <RealtimeNotifications />
    </div>
  )
}
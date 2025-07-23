'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDistanceToNow } from '@/lib/utils'
import { 
  Users, 
  Search, 
  UserPlus, 
  Mail, 
  Shield, 
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Loader2
} from 'lucide-react'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  phone?: string
  app_metadata?: any
  user_metadata?: any
  role?: string
  updated_at?: string
}

interface UserStats {
  total: number
  confirmed: number
  unconfirmed: number
  recentlyActive: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    confirmed: 0,
    unconfirmed: 0,
    recentlyActive: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users/list')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.users)
      setStats(data.stats)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])


  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_metadata?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const createTestUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users/create-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useDefaults: true })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast({
        title: 'Success',
        description: data.message
      })

      // Refresh users list
      fetchUsers()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create test users',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteAllTestUsers = async () => {
    if (!confirm('Are you sure you want to delete all test users?')) return

    setLoading(true)
    try {
      const response = await fetch('/api/users/create-test', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast({
        title: 'Success',
        description: data.message
      })

      // Refresh users list
      fetchUsers()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete test users',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">
          Manage users and monitor account activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unconfirmed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unconfirmed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active (7d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentlyActive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={createTestUsers}
            disabled={loading}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Create Test Users
          </Button>
          <Button 
            variant="destructive"
            onClick={deleteAllTestUsers}
            disabled={loading}
          >
            Delete Test Users
          </Button>
        </div>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${filteredUsers.length} users found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                No users found. Create some test users to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Created {formatDistanceToNow(new Date(user.created_at))}</span>
                        {user.last_sign_in_at && (
                          <>
                            <span>•</span>
                            <span>Last seen {formatDistanceToNow(new Date(user.last_sign_in_at))}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.email_confirmed_at ? (
                      <Badge variant="default">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Confirmed
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                    {user.user_metadata?.testAccount && (
                      <Badge variant="outline">Test User</Badge>
                    )}
                    {user.role && (
                      <Badge variant="outline">
                        <Shield className="mr-1 h-3 w-3" />
                        {user.role}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
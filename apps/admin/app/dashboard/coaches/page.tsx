'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  Bot,
  DollarSign,
  Users,
  Activity,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { Coaches } from '@/types/coachmeld'
import { CoachDialog } from '@/components/coaches/coach-dialog'

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coaches[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCoach, setEditingCoach] = useState<Coaches | undefined>()
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    free: 0,
    paid: 0,
  })

  useEffect(() => {
    loadCoaches()
  }, [])

  const loadCoaches = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/coaches/list')
      if (!response.ok) throw new Error('Failed to load coaches')
      
      const data = await response.json()
      setCoaches(data.coaches || [])
      
      // Calculate stats
      const coachesList = data.coaches || []
      setStats({
        total: coachesList.length,
        active: coachesList.filter((c: Coaches) => c.is_active).length,
        inactive: coachesList.filter((c: Coaches) => !c.is_active).length,
        free: coachesList.filter((c: Coaches) => c.is_free).length,
        paid: coachesList.filter((c: Coaches) => !c.is_free).length,
      })
    } catch (error) {
      console.error('Error loading coaches:', error)
      toast.error('Failed to load coaches')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCoach(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (coach: Coaches) => {
    setEditingCoach(coach)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: Partial<Coaches>) => {
    try {
      if (editingCoach) {
        // Update existing coach
        const response = await fetch(`/api/coaches/${editingCoach.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) throw new Error('Failed to update coach')
        toast.success('Coach updated successfully')
      } else {
        // Create new coach
        const response = await fetch('/api/coaches/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) throw new Error('Failed to create coach')
        toast.success('Coach created successfully')
      }
      
      await loadCoaches()
    } catch (error) {
      console.error('Error saving coach:', error)
      toast.error('Failed to save coach')
      throw error
    }
  }

  const handleToggleActive = async (coach: Coaches) => {
    try {
      const response = await fetch(`/api/coaches/${coach.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...coach, is_active: !coach.is_active }),
      })
      
      if (!response.ok) throw new Error('Failed to update coach')
      toast.success(`Coach ${coach.is_active ? 'deactivated' : 'activated'}`)
      await loadCoaches()
    } catch (error) {
      console.error('Error toggling coach:', error)
      toast.error('Failed to update coach')
    }
  }

  const handleDelete = async (coach: Coaches) => {
    if (!confirm(`Are you sure you want to deactivate ${coach.name}?`)) return
    
    try {
      const response = await fetch(`/api/coaches/${coach.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to delete coach')
      toast.success('Coach deactivated successfully')
      await loadCoaches()
    } catch (error) {
      console.error('Error deleting coach:', error)
      toast.error('Failed to delete coach')
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    
    const newCoaches = [...filteredCoaches]
    const temp = newCoaches[index]
    newCoaches[index] = newCoaches[index - 1]
    newCoaches[index - 1] = temp
    
    await updateSortOrder(newCoaches)
  }

  const handleMoveDown = async (index: number) => {
    if (index === filteredCoaches.length - 1) return
    
    const newCoaches = [...filteredCoaches]
    const temp = newCoaches[index]
    newCoaches[index] = newCoaches[index + 1]
    newCoaches[index + 1] = temp
    
    await updateSortOrder(newCoaches)
  }

  const updateSortOrder = async (orderedCoaches: Coaches[]) => {
    try {
      const response = await fetch('/api/coaches/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coaches: orderedCoaches }),
      })
      
      if (!response.ok) throw new Error('Failed to update order')
      toast.success('Order updated successfully')
      await loadCoaches()
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Failed to update order')
    }
  }

  const filteredCoaches = coaches
    .filter(coach => {
      if (!showInactive && !coach.is_active) return false
      if (!searchQuery) return true
      
      const query = searchQuery.toLowerCase()
      return (
        coach.name.toLowerCase().includes(query) ||
        coach.description?.toLowerCase().includes(query) ||
        coach.coach_type.toLowerCase().includes(query)
      )
    })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coaches</h1>
          <p className="text-muted-foreground">Manage AI coaches and their configurations</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Coach
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coaches</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.free}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paid}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search coaches by name, description, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive">Show inactive</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coaches List */}
      <Card>
        <CardHeader>
          <CardTitle>Coach List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCoaches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No coaches found matching your search.' : 'No coaches created yet.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCoaches.map((coach, index) => (
                <div
                  key={coach.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                  style={{
                    borderColor: coach.is_active ? coach.color_theme?.primary : undefined,
                    opacity: coach.is_active ? 1 : 0.6,
                  }}
                >
                  {/* Drag Handle */}
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === filteredCoaches.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Coach Icon */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                    style={{ backgroundColor: coach.color_theme?.primary || '#0084ff' }}
                  >
                    {coach.name?.[0] || 'C'}
                  </div>

                  {/* Coach Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{coach.name}</h3>
                      <Badge variant="outline">{coach.coach_type}</Badge>
                      {coach.is_free ? (
                        <Badge variant="secondary">Free</Badge>
                      ) : (
                        <Badge variant="secondary">${coach.monthly_price}/mo</Badge>
                      )}
                      {coach.knowledge_base_enabled && <Badge variant="secondary">KB</Badge>}
                      {!coach.is_active && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                    {coach.description && (
                      <p className="text-sm text-muted-foreground mt-1">{coach.description}</p>
                    )}
                    {coach.features && coach.features.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {coach.features.map((feature, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={coach.is_active !== false}
                      onCheckedChange={() => handleToggleActive(coach)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(coach)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(coach)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coach Dialog */}
      <CoachDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        coach={editingCoach}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
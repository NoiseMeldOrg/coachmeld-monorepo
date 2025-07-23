'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { 
  Brain, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  Search,
  Filter,
  Download,
  Upload,
  History,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface KnowledgeEntry {
  id: string
  title: string
  content: string
  category: string
  diet_type: string
  tags: string[]
  version: number
  created_at: string
  updated_at: string
  created_by: string
}

interface KnowledgeVersion {
  id: string
  entry_id: string
  version: number
  content: string
  changed_by: string
  changed_at: string
  change_summary: string
}

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<KnowledgeEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDietType, setFilterDietType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    diet_type: 'shared',
    tags: ''
  })

  const { toast } = useToast()
  const supabase = createClient()

  const categories = [
    { value: 'general', label: 'General Information' },
    { value: 'nutrition', label: 'Nutrition Facts' },
    { value: 'health', label: 'Health Benefits' },
    { value: 'recipes', label: 'Recipes' },
    { value: 'tips', label: 'Tips & Guidelines' },
    { value: 'science', label: 'Scientific Research' },
    { value: 'faq', label: 'FAQs' }
  ]

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      // Mock data - replace with actual API call
      const mockEntries: KnowledgeEntry[] = [
        {
          id: '1',
          title: 'Introduction to Carnivore Diet',
          content: 'The carnivore diet is a dietary approach that involves eating only animal products...',
          category: 'general',
          diet_type: 'carnivore',
          tags: ['basics', 'introduction', 'getting-started'],
          version: 1,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          created_by: 'admin@noisemeld.com'
        },
        {
          id: '2',
          title: 'Keto Macronutrient Ratios',
          content: 'The ketogenic diet typically consists of 70-80% fat, 15-25% protein, and 5-10% carbohydrates...',
          category: 'nutrition',
          diet_type: 'keto',
          tags: ['macros', 'nutrition', 'ratios'],
          version: 2,
          created_at: '2024-01-14T09:00:00Z',
          updated_at: '2024-01-16T14:30:00Z',
          created_by: 'admin@noisemeld.com'
        },
        {
          id: '3',
          title: 'Benefits of Intermittent Fasting',
          content: 'Intermittent fasting can provide numerous health benefits including improved insulin sensitivity...',
          category: 'health',
          diet_type: 'shared',
          tags: ['fasting', 'health', 'benefits'],
          version: 1,
          created_at: '2024-01-13T11:00:00Z',
          updated_at: '2024-01-13T11:00:00Z',
          created_by: 'admin@noisemeld.com'
        }
      ]

      setEntries(mockEntries)
      setFilteredEntries(mockEntries)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch knowledge entries',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    // Filter entries based on search and filters
    let filtered = entries

    if (searchQuery) {
      filtered = filtered.filter(entry =>
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (filterDietType !== 'all') {
      filtered = filtered.filter(entry => entry.diet_type === filterDietType)
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(entry => entry.category === filterCategory)
    }

    setFilteredEntries(filtered)
  }, [entries, searchQuery, filterDietType, filterCategory])

  const handleCreate = () => {
    setIsCreating(true)
    setIsEditing(false)
    setSelectedEntry(null)
    setFormData({
      title: '',
      content: '',
      category: 'general',
      diet_type: 'shared',
      tags: ''
    })
  }

  const handleEdit = (entry: KnowledgeEntry) => {
    setSelectedEntry(entry)
    setIsEditing(true)
    setIsCreating(false)
    setFormData({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      diet_type: entry.diet_type,
      tags: entry.tags.join(', ')
    })
  }

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast({
        title: 'Error',
        description: 'Title and content are required',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)

      if (isCreating) {
        // Create new entry
        const newEntry: KnowledgeEntry = {
          id: Date.now().toString(),
          title: formData.title,
          content: formData.content,
          category: formData.category,
          diet_type: formData.diet_type,
          tags,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'admin@noisemeld.com'
        }

        setEntries(prev => [...prev, newEntry])
        toast({
          title: 'Success',
          description: 'Knowledge entry created successfully'
        })
      } else if (isEditing && selectedEntry) {
        // Update existing entry
        const updatedEntry = {
          ...selectedEntry,
          title: formData.title,
          content: formData.content,
          category: formData.category,
          diet_type: formData.diet_type,
          tags,
          version: selectedEntry.version + 1,
          updated_at: new Date().toISOString()
        }

        setEntries(prev => prev.map(e => e.id === selectedEntry.id ? updatedEntry : e))
        toast({
          title: 'Success',
          description: 'Knowledge entry updated successfully'
        })
      }

      // Reset form
      setIsCreating(false)
      setIsEditing(false)
      setSelectedEntry(null)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save knowledge entry',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (entry: KnowledgeEntry) => {
    if (!confirm(`Are you sure you want to delete "${entry.title}"?`)) {
      return
    }

    setLoading(true)
    try {
      setEntries(prev => prev.filter(e => e.id !== entry.id))
      toast({
        title: 'Success',
        description: 'Knowledge entry deleted successfully'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete knowledge entry',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsCreating(false)
    setIsEditing(false)
    setSelectedEntry(null)
  }

  const exportEntries = () => {
    const data = JSON.stringify(filteredEntries, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `knowledge-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getDietTypeColor = (dietType: string) => {
    switch (dietType) {
      case 'carnivore':
        return 'bg-red-100 text-red-800'
      case 'keto':
        return 'bg-green-100 text-green-800'
      case 'shared':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Knowledge Base</h2>
          <p className="text-muted-foreground">
            Manage diet-specific content and information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportEntries}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterDietType} onValueChange={setFilterDietType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Diets</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                    <SelectItem value="carnivore">Carnivore</SelectItem>
                    <SelectItem value="paleo">Paleo</SelectItem>
                    <SelectItem value="keto">Keto</SelectItem>
                    <SelectItem value="ketovore">Ketovore</SelectItem>
                    <SelectItem value="lowcarb">Low Carb</SelectItem>
                    <SelectItem value="lion">Lion</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Entry List or Form */}
          {isCreating || isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {isCreating ? 'Create New Entry' : 'Edit Entry'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter title..."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diet-type">Diet Type</Label>
                    <Select 
                      value={formData.diet_type} 
                      onValueChange={(value) => setFormData({ ...formData, diet_type: value })}
                    >
                      <SelectTrigger id="diet-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shared">Shared</SelectItem>
                        <SelectItem value="carnivore">Carnivore</SelectItem>
                        <SelectItem value="paleo">Paleo</SelectItem>
                        <SelectItem value="keto">Keto</SelectItem>
                        <SelectItem value="ketovore">Ketovore</SelectItem>
                        <SelectItem value="lowcarb">Low Carb</SelectItem>
                        <SelectItem value="lion">Lion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="health, nutrition, tips..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter content..."
                    className="min-h-[200px]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {loading && filteredEntries.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  </CardContent>
                </Card>
              ) : filteredEntries.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery || filterDietType !== 'all' || filterCategory !== 'all'
                        ? 'No entries match your filters'
                        : 'No knowledge entries yet'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredEntries.map((entry) => (
                  <Card key={entry.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{entry.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {entry.content}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge className={getDietTypeColor(entry.diet_type)}>
                              {entry.diet_type}
                            </Badge>
                            <Badge variant="outline">
                              {categories.find(c => c.value === entry.category)?.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              v{entry.version} • Updated {new Date(entry.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex gap-1 mt-2">
                            {entry.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(entry)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Entries</span>
                <span className="font-medium">{entries.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Carnivore</span>
                <span className="font-medium">
                  {entries.filter(e => e.diet_type === 'carnivore').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Keto</span>
                <span className="font-medium">
                  {entries.filter(e => e.diet_type === 'keto').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shared</span>
                <span className="font-medium">
                  {entries.filter(e => e.diet_type === 'shared').length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Upload className="mr-2 h-4 w-4" />
                Import Entries
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <History className="mr-2 h-4 w-4" />
                View History
              </Button>
            </CardContent>
          </Card>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Knowledge entries are used to provide context-specific information in the RAG system
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}
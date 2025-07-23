'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, X } from 'lucide-react'
import { Coaches } from '@/types/coachmeld'
import { toast } from 'sonner'

const COACH_TYPES = [
  { value: 'carnivore', label: 'Carnivore' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'keto', label: 'Keto' },
  { value: 'ketovore', label: 'Ketovore' },
  { value: 'lowcarb', label: 'Low Carb' },
  { value: 'lion', label: 'Lion' },
]


interface CoachFormProps {
  coach?: Coaches
  onSubmit: (data: Partial<Coaches>) => Promise<void>
  onCancel: () => void
}

export function CoachForm({ coach, onSubmit, onCancel }: CoachFormProps) {
  const [formData, setFormData] = useState<Partial<Coaches>>({
    name: '',
    description: '',
    coach_type: 'carnivore',
    is_free: false,
    monthly_price: 0,
    color_theme: { primary: '#0084ff', secondary: '#44bec7' },
    icon_name: 'chatbubbles',
    features: [],
    knowledge_base_enabled: false,
    is_active: true,
    sort_order: 999,
    ...coach,
  })
  const [newFeature, setNewFeature] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.coach_type) {
      toast.error('Name and coach type are required')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), newFeature.trim()],
      })
      setNewFeature('')
    }
  }

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features?.filter((_, i) => i !== index) || [],
    })
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Core details about the coach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Carnivore Coach"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coach_type">Coach Type *</Label>
              <Select
                value={formData.coach_type}
                onValueChange={(value) => setFormData({ ...formData, coach_type: value })}
              >
                <SelectTrigger id="coach_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COACH_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the coach"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort_order">Sort Order</Label>
            <Input
              id="sort_order"
              type="number"
              value={formData.sort_order || 999}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 999 })}
              min={0}
            />
            <p className="text-sm text-muted-foreground">Lower numbers appear first</p>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Settings</CardTitle>
          <CardDescription>Configure pricing and availability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_free"
              checked={formData.is_free || false}
              onCheckedChange={(checked) => setFormData({ ...formData, is_free: !!checked })}
            />
            <Label htmlFor="is_free" className="cursor-pointer">Free Coach</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly_price">Monthly Price ($)</Label>
            <Input
              id="monthly_price"
              type="number"
              value={formData.monthly_price || 0}
              onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) || 0 })}
              min={0}
              step={0.01}
              disabled={formData.is_free}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the coach looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={formData.color_theme?.primary || '#0084ff'}
                  onChange={(e) => setFormData({
                    ...formData,
                    color_theme: { ...formData.color_theme, primary: e.target.value }
                  })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.color_theme?.primary || '#0084ff'}
                  onChange={(e) => setFormData({
                    ...formData,
                    color_theme: { ...formData.color_theme, primary: e.target.value }
                  })}
                  placeholder="#0084ff"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={formData.color_theme?.secondary || '#44bec7'}
                  onChange={(e) => setFormData({
                    ...formData,
                    color_theme: { ...formData.color_theme, secondary: e.target.value }
                  })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.color_theme?.secondary || '#44bec7'}
                  onChange={(e) => setFormData({
                    ...formData,
                    color_theme: { ...formData.color_theme, secondary: e.target.value }
                  })}
                  placeholder="#44bec7"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="icon_name">Icon Name</Label>
            <Input
              id="icon_name"
              value={formData.icon_name || ''}
              onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
              placeholder="e.g., chatbubbles, nutrition"
            />
            <p className="text-sm text-muted-foreground">
              Ionicons name. See{' '}
              <a
                href="https://ionic.io/ionicons"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Ionicons
              </a>
            </p>
          </div>

          {/* Preview Card */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div
              className="p-4 rounded-lg border-2 max-w-sm"
              style={{
                borderColor: formData.color_theme?.primary || '#0084ff',
                background: `linear-gradient(135deg, ${formData.color_theme?.primary}10 0%, ${formData.color_theme?.secondary}10 100%)`,
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: formData.color_theme?.primary || '#0084ff' }}
                >
                  {formData.name?.[0] || 'C'}
                </div>
                <div>
                  <h3 className="font-semibold">{formData.name || 'Coach Name'}</h3>
                  <p className="text-sm text-muted-foreground">{formData.coach_type}</p>
                </div>
              </div>
              {formData.description && (
                <p className="text-sm text-muted-foreground mb-2">{formData.description}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {formData.is_free ? (
                  <Badge variant="secondary">Free</Badge>
                ) : (
                  <Badge variant="secondary">${formData.monthly_price}/mo</Badge>
                )}
                {formData.knowledge_base_enabled && <Badge variant="secondary">KB</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features & Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>Features & Capabilities</CardTitle>
          <CardDescription>Configure coach features and abilities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Features</Label>
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add a feature"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              />
              <Button type="button" onClick={addFeature} variant="secondary">
                Add
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap mt-2">
              {formData.features?.map((feature, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {feature}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFeature(index)}
                  />
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="knowledge_base_enabled"
                checked={formData.knowledge_base_enabled || false}
                onCheckedChange={(checked) => setFormData({ ...formData, knowledge_base_enabled: !!checked })}
              />
              <Label htmlFor="knowledge_base_enabled" className="cursor-pointer">
                Knowledge Base Enabled
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active !== false}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {coach ? 'Update Coach' : 'Create Coach'}
        </Button>
      </div>
    </form>
  )
}
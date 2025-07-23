'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { 
  getAllCoaches, 
  CoachAccessConfig, 
  AccessTier 
} from '@/lib/coach-mapping'

interface CoachAccessSelectorProps {
  currentAccess?: Array<{ coach_id: string; access_tier?: string }>
  onChange?: (coachAccess: CoachAccessConfig[]) => void
  defaultTier?: AccessTier
  defaultSelectAll?: boolean
}

export function CoachAccessSelector({
  currentAccess = [],
  onChange,
  defaultTier = 'pro',
  defaultSelectAll = false
}: CoachAccessSelectorProps) {
  const allCoaches = useMemo(() => getAllCoaches(), [])
  
  // Initialize state with a function to avoid re-runs
  const [coachAccess, setCoachAccess] = useState<CoachAccessConfig[]>(() => {
    const access = allCoaches.map(coach => {
      const existing = currentAccess.find(a => a.coach_id === coach.id)
      if (existing) {
        return {
          coachId: coach.id,
          accessTier: (existing.access_tier || defaultTier) as AccessTier,
          selected: true
        }
      }
      return {
        coachId: coach.id,
        accessTier: defaultTier,
        selected: defaultSelectAll
      }
    })
    return access
  })

  // Call onChange on mount if defaultSelectAll is true
  useEffect(() => {
    if (defaultSelectAll && currentAccess.length === 0) {
      onChange?.(coachAccess)
    }
  }, []) // Only run on mount

  const handleCoachToggle = (coachId: string, selected: boolean) => {
    const updated = coachAccess.map(access => 
      access.coachId === coachId ? { ...access, selected } : access
    )
    setCoachAccess(updated)
    onChange?.(updated)
  }

  const handleAccessTierChange = (coachId: string, tier: AccessTier) => {
    const updated = coachAccess.map(access => 
      access.coachId === coachId ? { ...access, accessTier: tier } : access
    )
    setCoachAccess(updated)
    onChange?.(updated)
  }

  const selectAll = () => {
    const updated = coachAccess.map(access => ({ ...access, selected: true }))
    setCoachAccess(updated)
    onChange?.(updated)
  }

  const deselectAll = () => {
    const updated = coachAccess.map(access => ({ ...access, selected: false }))
    setCoachAccess(updated)
    onChange?.(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={selectAll}>
            Select All
          </Button>
          <Button size="sm" variant="outline" onClick={deselectAll}>
            Deselect All
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Selected: {coachAccess.filter(a => a.selected).length} coaches
        </div>
      </div>

      <div className="space-y-2">
        {allCoaches.map((coach) => {
          const access = coachAccess.find(a => a.coachId === coach.id)
          
          return (
            <div 
              key={coach.id} 
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  id={coach.id}
                  checked={access?.selected || false}
                  onCheckedChange={(checked) => 
                    handleCoachToggle(coach.id, !!checked)
                  }
                />
                <Label 
                  htmlFor={coach.id} 
                  className="cursor-pointer font-medium"
                >
                  {coach.name}
                </Label>
              </div>
              
              <Select
                value={access?.accessTier || defaultTier}
                onValueChange={(value) => 
                  handleAccessTierChange(coach.id, value as AccessTier)
                }
                disabled={!access?.selected}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>
    </div>
  )
}
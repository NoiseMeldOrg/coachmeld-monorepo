'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { CreateGDPRRequestPayload, DATA_CATEGORIES, DataCategory } from '@/types/gdpr'
import { Loader2, AlertCircle, User } from 'lucide-react'

interface DeletionRequestFormProps {
  onSubmit: (data: CreateGDPRRequestPayload) => Promise<void>
  onCancel: () => void
}

export function DeletionRequestForm({ onSubmit, onCancel }: DeletionRequestFormProps) {
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [searchingUser, setSearchingUser] = useState(false)
  const [userFound, setUserFound] = useState(false)
  const [softDelete, setSoftDelete] = useState(true)
  const [deletionReason, setDeletionReason] = useState('')
  const [notes, setNotes] = useState('')
  const [includedData, setIncludedData] = useState<DataCategory[]>(['profile', 'chat_history'])
  const { toast } = useToast()
  const router = useRouter()

  const handleUserSearch = async () => {
    if (!userEmail.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter a user email to search',
        variant: 'destructive'
      })
      return
    }

    setSearchingUser(true)
    try {
      // Search for user by email
      const response = await fetch(`/api/users/search?email=${encodeURIComponent(userEmail)}`)
      const data = await response.json()

      if (response.ok && data.user) {
        setUserId(data.user.id)
        setUserFound(true)
        toast({
          title: 'User found',
          description: `Found user: ${data.user.email}`
        })
      } else {
        setUserFound(false)
        setUserId('')
        toast({
          title: 'User not found',
          description: 'No user found with this email address',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to search for user',
        variant: 'destructive'
      })
    } finally {
      setSearchingUser(false)
    }
  }

  const handleDataToggle = (categoryId: DataCategory) => {
    setIncludedData(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      toast({
        title: 'User required',
        description: 'Please search for and select a user first',
        variant: 'destructive'
      })
      return
    }

    if (includedData.length === 0) {
      toast({
        title: 'Data selection required',
        description: 'Please select at least one data category to delete',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const payload: CreateGDPRRequestPayload = {
        user_id: userId,
        request_type: 'delete',
        requested_by: `Admin: ${userEmail}`,
        notes: notes.trim(),
        deletion_details: {
          soft_delete: softDelete,
          deletion_reason: deletionReason.trim(),
          included_data: includedData,
          excluded_data: DATA_CATEGORIES
            .map(c => c.id)
            .filter(id => !includedData.includes(id as DataCategory))
        }
      }

      await onSubmit(payload)
      toast({
        title: 'Success',
        description: 'Deletion request created successfully'
      })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create deletion request',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Search */}
      <div className="space-y-2">
        <Label htmlFor="user-email">User Email*</Label>
        <div className="flex gap-2">
          <Input
            id="user-email"
            type="email"
            placeholder="user@example.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            disabled={searchingUser}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleUserSearch}
            disabled={searchingUser}
          >
            {searchingUser ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <User className="h-4 w-4" />
            )}
            Search
          </Button>
        </div>
        {userFound && (
          <p className="text-sm text-muted-foreground">
            User ID: <span className="font-mono">{userId}</span>
          </p>
        )}
      </div>

      {/* Deletion Type */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="soft-delete">Deletion Type</Label>
          <div className="flex items-center space-x-2">
            <Label htmlFor="soft-delete" className="text-sm font-normal">
              Hard Delete
            </Label>
            <Switch
              id="soft-delete"
              checked={softDelete}
              onCheckedChange={setSoftDelete}
            />
            <Label htmlFor="soft-delete" className="text-sm font-normal">
              Soft Delete
            </Label>
          </div>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {softDelete
              ? 'Soft delete: Data will be marked for deletion with a 30-day grace period for recovery.'
              : 'Hard delete: Data will be permanently deleted immediately. This action cannot be undone.'}
          </AlertDescription>
        </Alert>
      </div>

      {/* Deletion Reason */}
      <div className="space-y-2">
        <Label htmlFor="deletion-reason">Deletion Reason*</Label>
        <Textarea
          id="deletion-reason"
          placeholder="Provide a clear reason for this deletion request..."
          value={deletionReason}
          onChange={(e) => setDeletionReason(e.target.value)}
          rows={3}
          required
        />
      </div>

      {/* Data Categories */}
      <div className="space-y-2">
        <Label>Data to Delete*</Label>
        <div className="space-y-3 border rounded-lg p-4">
          {DATA_CATEGORIES.map((category) => (
            <div key={category.id} className="flex items-start space-x-3">
              <Checkbox
                id={category.id}
                checked={includedData.includes(category.id as DataCategory)}
                onCheckedChange={() => handleDataToggle(category.id as DataCategory)}
              />
              <div className="flex-1">
                <Label
                  htmlFor={category.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {category.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {category.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any additional information about this request..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="destructive"
          disabled={loading || !userFound || includedData.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Deletion Request'
          )}
        </Button>
      </div>
    </form>
  )
}
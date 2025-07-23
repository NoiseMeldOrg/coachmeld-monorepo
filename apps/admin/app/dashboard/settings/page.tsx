'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Settings, 
  Key, 
  Bell, 
  Shield, 
  Database,
  Globe,
  Zap,
  Save,
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2
} from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  key: string
  created_at: string
  last_used?: string
  permissions: string[]
}

interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  active: boolean
  created_at: string
  last_triggered?: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [showApiKey, setShowApiKey] = useState<string | null>(null)
  const { toast } = useToast()

  // Settings state
  const [settings, setSettings] = useState({
    // General
    appName: 'CoachMeld Admin',
    appUrl: 'https://admin.coachmeld.com',
    timezone: 'UTC',
    
    // RAG Settings
    chunkSize: '1000',
    chunkOverlap: '200',
    embeddingModel: 'gemini',
    vectorDimension: '768',
    similarityThreshold: '0.7',
    
    // API Settings
    rateLimit: '100',
    rateLimitWindow: '60',
    maxUploadSize: '10',
    
    // Notifications
    emailNotifications: true,
    webhookNotifications: false,
    errorAlerts: true,
    
    // Security
    requireAuth: true,
    allowRegistration: false,
    sessionTimeout: '1440',
    mfaEnabled: false
  })

  const [apiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Production API',
      key: 'sk_live_1234567890abcdef',
      created_at: '2024-01-15T10:00:00Z',
      last_used: '2024-01-20T14:30:00Z',
      permissions: ['read', 'write']
    },
    {
      id: '2',
      name: 'Development API',
      key: 'sk_test_abcdef1234567890',
      created_at: '2024-01-10T09:00:00Z',
      permissions: ['read']
    }
  ])

  const [webhooks] = useState<WebhookEndpoint[]>([
    {
      id: '1',
      url: 'https://api.example.com/webhook',
      events: ['document.created', 'document.deleted'],
      active: true,
      created_at: '2024-01-12T11:00:00Z',
      last_triggered: '2024-01-19T16:45:00Z'
    }
  ])

  const handleSaveSettings = async () => {
    setLoading(true)
    try {
      // Mock save - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: 'Settings saved',
        description: 'Your configuration has been updated successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const generateApiKey = async () => {
    setLoading(true)
    try {
      // Mock API key generation
      const newKey = `sk_live_${Math.random().toString(36).substring(2, 15)}`
      
      toast({
        title: 'API Key Generated',
        description: 'Your new API key has been created',
      })
      
      // Show the new key
      setShowApiKey(newKey)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate API key',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard'
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure your application settings and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="rag">RAG System</TabsTrigger>
          <TabsTrigger value="api">API & Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic application configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="app-name">Application Name</Label>
                  <Input
                    id="app-name"
                    value={settings.appName}
                    onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-url">Application URL</Label>
                  <Input
                    id="app-url"
                    value={settings.appUrl}
                    onChange={(e) => setSettings({ ...settings, appUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={settings.timezone} onValueChange={(value) => setSettings({ ...settings, timezone: value })}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configure how you receive alerts and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email alerts for important events
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="webhook-notifications">Webhook Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send events to configured webhook endpoints
                  </p>
                </div>
                <Switch
                  id="webhook-notifications"
                  checked={settings.webhookNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, webhookNotifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="error-alerts">Error Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified immediately when errors occur
                  </p>
                </div>
                <Switch
                  id="error-alerts"
                  checked={settings.errorAlerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, errorAlerts: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="rag" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>RAG System Configuration</CardTitle>
              <CardDescription>
                Configure document processing and embedding settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chunk-size">Chunk Size (characters)</Label>
                  <Input
                    id="chunk-size"
                    type="number"
                    value={settings.chunkSize}
                    onChange={(e) => setSettings({ ...settings, chunkSize: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum characters per document chunk
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chunk-overlap">Chunk Overlap (characters)</Label>
                  <Input
                    id="chunk-overlap"
                    type="number"
                    value={settings.chunkOverlap}
                    onChange={(e) => setSettings({ ...settings, chunkOverlap: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Overlap between consecutive chunks
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="embedding-model">Embedding Model</Label>
                <Select value={settings.embeddingModel} onValueChange={(value) => setSettings({ ...settings, embeddingModel: value })}>
                  <SelectTrigger id="embedding-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini (768d)</SelectItem>
                    <SelectItem value="openai">OpenAI Ada (1536d)</SelectItem>
                    <SelectItem value="cohere">Cohere (1024d)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="similarity-threshold">Similarity Threshold</Label>
                <Input
                  id="similarity-threshold"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={settings.similarityThreshold}
                  onChange={(e) => setSettings({ ...settings, similarityThreshold: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum similarity score for search results (0-1)
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Rate limiting and API settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rate-limit">Rate Limit (requests)</Label>
                  <Input
                    id="rate-limit"
                    type="number"
                    value={settings.rateLimit}
                    onChange={(e) => setSettings({ ...settings, rateLimit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate-window">Window (seconds)</Label>
                  <Input
                    id="rate-window"
                    type="number"
                    value={settings.rateLimitWindow}
                    onChange={(e) => setSettings({ ...settings, rateLimitWindow: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-size">Max Upload Size (MB)</Label>
                <Input
                  id="upload-size"
                  type="number"
                  value={settings.maxUploadSize}
                  onChange={(e) => setSettings({ ...settings, maxUploadSize: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage API keys for external access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={generateApiKey} disabled={loading}>
                  <Key className="mr-2 h-4 w-4" />
                  Generate New Key
                </Button>
              </div>

              {showApiKey && (
                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <p className="text-sm font-medium">New API Key Generated</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-muted rounded text-xs">
                          {showApiKey}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(showApiKey)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Save this key securely. It won&apos;t be shown again.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                {apiKeys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div>
                      <h4 className="font-medium">{apiKey.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-muted-foreground">
                          {apiKey.key.substring(0, 10)}...
                        </code>
                        {apiKey.permissions.map(perm => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(apiKey.created_at).toLocaleDateString()}
                        {apiKey.last_used && ` • Last used ${new Date(apiKey.last_used).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Endpoints</CardTitle>
              <CardDescription>
                Configure webhook endpoints for event notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Endpoint
                </Button>
              </div>

              <div className="space-y-2">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium">{webhook.url}</h4>
                        <Badge variant={webhook.active ? 'default' : 'secondary'}>
                          {webhook.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {webhook.events.map(event => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(webhook.created_at).toLocaleDateString()}
                        {webhook.last_triggered && ` • Last triggered ${new Date(webhook.last_triggered).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure authentication and security options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="require-auth">Require Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    All requests must be authenticated
                  </p>
                </div>
                <Switch
                  id="require-auth"
                  checked={settings.requireAuth}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireAuth: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-registration">Allow Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    New users can create accounts
                  </p>
                </div>
                <Switch
                  id="allow-registration"
                  checked={settings.allowRegistration}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowRegistration: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mfa">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all admin users
                  </p>
                </div>
                <Switch
                  id="mfa"
                  checked={settings.mfaEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, mfaEnabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Automatically log out users after this period of inactivity
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

import { Plus, Trash2 } from 'lucide-react'
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Code, 
  Copy, 
  Check,
  FileText,
  Send,
  ChevronRight,
  ExternalLink,
  AlertCircle
} from 'lucide-react'

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  parameters?: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
  requestBody?: {
    type: string
    example: any
  }
  responses: {
    [code: string]: {
      description: string
      example?: any
    }
  }
}

export default function ApiDocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const apiEndpoints: Record<string, ApiEndpoint[]> = {
    'RAG System': [
      {
        method: 'POST',
        path: '/api/rag/upload',
        description: 'Upload a document to the RAG system',
        requestBody: {
          type: 'FormData',
          example: {
            file: 'File',
            dietType: 'shared | carnivore | keto'
          }
        },
        responses: {
          '200': {
            description: 'Document uploaded successfully',
            example: {
              success: true,
              document: {
                id: 'doc_123',
                title: 'example.txt',
                diet_type: 'shared',
                chunks_created: 15
              }
            }
          },
          '400': { description: 'Invalid request' },
          '401': { description: 'Unauthorized' }
        }
      },
      {
        method: 'POST',
        path: '/api/rag/search',
        description: 'Search the RAG knowledge base',
        requestBody: {
          type: 'JSON',
          example: {
            query: 'carnivore diet benefits',
            dietType: 'carnivore',
            limit: 5
          }
        },
        responses: {
          '200': {
            description: 'Search results',
            example: {
              success: true,
              query: 'carnivore diet benefits',
              results: [
                {
                  id: 'chunk_123',
                  content: 'The carnivore diet has several benefits...',
                  similarity: 0.89,
                  document: {
                    title: 'Carnivore Guide',
                    diet_type: 'carnivore'
                  }
                }
              ],
              count: 1
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/rag/documents',
        description: 'List all RAG documents',
        parameters: [
          { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page (default: 10)' },
          { name: 'dietType', type: 'string', required: false, description: 'Filter by diet type' },
          { name: 'search', type: 'string', required: false, description: 'Search in titles' }
        ],
        responses: {
          '200': {
            description: 'Paginated document list',
            example: {
              success: true,
              documents: [],
              pagination: {
                page: 1,
                limit: 10,
                total: 50,
                totalPages: 5,
                hasMore: true
              }
            }
          }
        }
      },
      {
        method: 'DELETE',
        path: '/api/rag/documents',
        description: 'Delete a document and its embeddings',
        requestBody: {
          type: 'JSON',
          example: {
            documentId: 'doc_123'
          }
        },
        responses: {
          '200': {
            description: 'Document deleted successfully',
            example: {
              success: true,
              message: 'Document deleted successfully'
            }
          }
        }
      }
    ],
    'YouTube': [
      {
        method: 'POST',
        path: '/api/youtube/process',
        description: 'Process YouTube video or playlist transcripts',
        requestBody: {
          type: 'JSON',
          example: {
            url: 'https://youtube.com/watch?v=...',
            dietType: 'shared',
            isSingle: true
          }
        },
        responses: {
          '200': {
            description: 'Processing started',
            example: {
              success: true,
              jobId: 'job_123',
              videoCount: 1
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/youtube/process',
        description: 'Check if a video has been processed',
        parameters: [
          { name: 'videoId', type: 'string', required: true, description: 'YouTube video ID' }
        ],
        responses: {
          '200': {
            description: 'Processing status',
            example: {
              processed: true,
              documentId: 'doc_123',
              processedAt: '2024-01-20T10:00:00Z'
            }
          }
        }
      }
    ],
    'Users': [
      {
        method: 'POST',
        path: '/api/users/create-test',
        description: 'Create a test user with subscription',
        requestBody: {
          type: 'JSON',
          example: {
            email: 'test@example.com',
            dietType: 'carnivore',
            tier: 'pro'
          }
        },
        responses: {
          '201': {
            description: 'Test user created',
            example: {
              success: true,
              user: {
                id: 'user_123',
                email: 'test@example.com',
                testUserType: 'pro_test'
              },
              credentials: {
                email: 'test@example.com',
                password: 'temporary_password_123'
              }
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/users/create-test',
        description: 'List all test users',
        responses: {
          '200': {
            description: 'Test user list',
            example: {
              success: true,
              users: []
            }
          }
        }
      }
    ],
    'Analytics': [
      {
        method: 'POST',
        path: '/api/analytics/events',
        description: 'Track analytics events',
        requestBody: {
          type: 'JSON',
          example: {
            events: [
              {
                event: 'query_executed',
                properties: {
                  query: 'test',
                  results: 5
                }
              }
            ]
          }
        },
        responses: {
          '200': {
            description: 'Events tracked',
            example: {
              success: true,
              tracked: 1
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/analytics/events',
        description: 'Retrieve analytics events',
        parameters: [
          { name: 'timeRange', type: 'string', required: false, description: 'Time range (1d, 7d, 30d)' },
          { name: 'event', type: 'string', required: false, description: 'Filter by event name' }
        ],
        responses: {
          '200': {
            description: 'Event statistics',
            example: {
              success: true,
              events: [],
              stats: {
                total: 1000,
                unique_users: 50
              }
            }
          }
        }
      }
    ],
    'Knowledge Base': [
      {
        method: 'GET',
        path: '/api/knowledge',
        description: 'List knowledge entries',
        parameters: [
          { name: 'dietType', type: 'string', required: false, description: 'Filter by diet type' },
          { name: 'category', type: 'string', required: false, description: 'Filter by category' },
          { name: 'search', type: 'string', required: false, description: 'Search in content' }
        ],
        responses: {
          '200': {
            description: 'Knowledge entries',
            example: {
              success: true,
              entries: []
            }
          }
        }
      },
      {
        method: 'POST',
        path: '/api/knowledge',
        description: 'Create a knowledge entry',
        requestBody: {
          type: 'JSON',
          example: {
            title: 'Carnivore Diet Basics',
            content: 'The carnivore diet consists of...',
            category: 'general',
            diet_type: 'carnivore',
            tags: ['basics', 'introduction']
          }
        },
        responses: {
          '200': {
            description: 'Entry created',
            example: {
              success: true,
              entry: {}
            }
          }
        }
      }
    ]
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-green-100 text-green-800'
      case 'POST':
        return 'bg-blue-100 text-blue-800'
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">API Documentation</h2>
        <p className="text-muted-foreground">
          Complete API reference for the CoachMeld Admin system
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          All API endpoints require authentication. Include your API key in the Authorization header:
          <code className="ml-2 text-sm bg-muted px-2 py-1 rounded">
            Authorization: Bearer YOUR_API_KEY
          </code>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(apiEndpoints).map(([category, endpoints]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
                <CardDescription>
                  {endpoints.length} endpoints available
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {endpoints.map((endpoint, idx) => {
                  const endpointId = `${category}-${idx}`
                  const isActive = activeEndpoint === endpointId

                  return (
                    <div
                      key={idx}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors text-left"
                        onClick={() => setActiveEndpoint(isActive ? null : endpointId)}
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={getMethodColor(endpoint.method)}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-medium">{endpoint.path}</code>
                        </div>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                      </button>

                      {isActive && (
                        <div className="border-t p-4 bg-muted/50 space-y-4">
                          <p className="text-sm">{endpoint.description}</p>

                          {endpoint.parameters && (
                            <div>
                              <h4 className="font-medium text-sm mb-2">Parameters</h4>
                              <div className="space-y-2">
                                {endpoint.parameters.map((param) => (
                                  <div key={param.name} className="text-sm">
                                    <code className="bg-background px-2 py-1 rounded">
                                      {param.name}
                                    </code>
                                    <span className="ml-2 text-muted-foreground">
                                      {param.type}
                                      {param.required && <span className="text-red-500 ml-1">*</span>}
                                    </span>
                                    <p className="text-xs text-muted-foreground mt-1 ml-4">
                                      {param.description}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {endpoint.requestBody && (
                            <div>
                              <h4 className="font-medium text-sm mb-2">Request Body</h4>
                              <div className="relative">
                                <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(endpoint.requestBody?.example, null, 2)}
                                </pre>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="absolute top-2 right-2"
                                  onClick={() => copyToClipboard(
                                    JSON.stringify(endpoint.requestBody?.example, null, 2),
                                    `${endpointId}-request`
                                  )}
                                >
                                  {copiedCode === `${endpointId}-request` ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="font-medium text-sm mb-2">Responses</h4>
                            <div className="space-y-2">
                              {Object.entries(endpoint.responses).map(([code, response]) => (
                                <div key={code}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={code.startsWith('2') ? 'default' : 'destructive'}>
                                      {code}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {response.description}
                                    </span>
                                  </div>
                                  {response.example && (
                                    <div className="relative">
                                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
                                        {JSON.stringify(response.example, null, 2)}
                                      </pre>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(
                                          JSON.stringify(response.example, null, 2),
                                          `${endpointId}-response-${code}`
                                        )}
                                      >
                                        {copiedCode === `${endpointId}-response-${code}` ? (
                                          <Check className="h-3 w-3" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Start</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Base URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value="https://admin.coachmeld.com"
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard('https://admin.coachmeld.com', 'base-url')}
                  >
                    {copiedCode === 'base-url' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Authentication</Label>
                <code className="block p-2 bg-muted rounded text-xs">
                  Authorization: Bearer YOUR_API_KEY
                </code>
              </div>

              <div className="space-y-2">
                <Label>Content Type</Label>
                <code className="block p-2 bg-muted rounded text-xs">
                  Content-Type: application/json
                </code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Example Request</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="curl" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="js">JavaScript</TabsTrigger>
                </TabsList>
                <TabsContent value="curl" className="space-y-2">
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`curl -X POST \\
  https://admin.coachmeld.com/api/rag/search \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "carnivore benefits",
    "dietType": "carnivore",
    "limit": 5
  }'`}
                  </pre>
                </TabsContent>
                <TabsContent value="js" className="space-y-2">
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`const response = await fetch(
  'https://admin.coachmeld.com/api/rag/search',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'carnivore benefits',
      dietType: 'carnivore',
      limit: 5
    })
  }
);

const data = await response.json();`}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Download OpenAPI Spec
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <ExternalLink className="mr-2 h-4 w-4" />
                Postman Collection
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Code className="mr-2 h-4 w-4" />
                SDK Documentation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
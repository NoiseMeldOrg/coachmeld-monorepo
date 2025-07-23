# Coach Meld Admin API Documentation

**Version**: 0.2.0  
**Last Updated**: July 2, 2025

This document describes the API routes available in the Coach Meld Admin application.

## Authentication

All API routes require authentication via Supabase. Include the authentication token in your requests.

## API Routes

### 1. RAG Documents Management

#### List Documents
```
GET /api/rag/documents
```

Query Parameters:
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Number of items per page (default: 10)
- `dietType` (string): Filter by diet type ('shared', 'keto', 'paleo', etc.)
- `search` (string): Search documents by title

Response:
```json
{
  "success": true,
  "documents": [
    {
      "id": "uuid",
      "title": "Document Title",
      "content": "...",
      "diet_type": "shared",
      "chunk_count": 5,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasMore": true
  }
}
```

#### Delete Document
```
DELETE /api/rag/documents
```

Request Body:
```json
{
  "documentId": "uuid"
}
```

Response:
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### 2. YouTube Transcript Processing

#### Process YouTube Content
```
POST /api/youtube/process
```

Request Body:
```json
{
  "playlistId": "playlist-id",  // Optional
  "videoId": "video-id",        // Optional (either playlistId or videoId required)
  "dietType": "shared"          // Default: "shared"
}
```

Response:
```json
{
  "success": true,
  "message": "Processed 3 videos successfully, 0 failed",
  "results": [
    {
      "videoId": "video-id",
      "success": true,
      "documentId": "uuid",
      "title": "Video Title",
      "chunksCreated": 10
    }
  ],
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0
  }
}
```

#### Check Video Processing Status
```
GET /api/youtube/process?videoId=video-id
```

Response:
```json
{
  "exists": true,
  "videoId": "video-id",
  "document": {
    "id": "uuid",
    "title": "Video Title",
    "dietType": "shared",
    "createdAt": "2024-01-01T00:00:00Z",
    "chunkCount": 10
  }
}
```

### 3. Test Users Management

#### Create Test Users
```
POST /api/users/create-test
```

Request Body:
```json
{
  "useDefaults": true,  // Use default test users
  "users": [            // Or provide custom users
    {
      "email": "test@example.com",
      "password": "password123",
      "tier": "pro",
      "metadata": {
        "name": "Test User"
      }
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "message": "Created 3 test users, 0 failed",
  "results": [
    {
      "email": "test@example.com",
      "userId": "uuid",
      "tier": "pro",
      "success": true,
      "message": "Test user created successfully"
    }
  ],
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0
  }
}
```

#### List Test Users
```
GET /api/users/create-test
```

Response:
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "email": "test@example.com",
      "subscription_tier": "pro",
      "user_subscriptions": {
        "tier": "pro",
        "status": "active",
        "limits": {
          "max_documents": 100,
          "max_queries_per_day": 500,
          "max_storage_mb": 1000
        }
      }
    }
  ],
  "count": 3
}
```

#### Delete Test Users
```
DELETE /api/users/create-test
```

Request Body:
```json
{
  "userId": "uuid",      // Delete specific user
  "deleteAll": false     // Or delete all test users
}
```

### 4. Analytics Events

#### Track Events
```
POST /api/analytics/events
```

Request Body (single event):
```json
{
  "singleEvent": {
    "event": "document_uploaded",
    "properties": {
      "documentId": "uuid",
      "fileSize": 1024
    },
    "distinctId": "user-id",    // Optional
    "timestamp": "2024-01-01T00:00:00Z"  // Optional
  }
}
```

Request Body (batch events):
```json
{
  "events": [
    {
      "event": "event_name",
      "properties": {},
      "distinctId": "user-id"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "message": "Tracked 2 events, 0 failed",
  "results": [
    {
      "event": "document_uploaded",
      "success": true,
      "id": "uuid"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

#### Retrieve Analytics Events
```
GET /api/analytics/events
```

Query Parameters:
- `page` (number): Page number (default: 1)
- `limit` (number): Events per page (default: 50)
- `eventName` (string): Filter by event name
- `startDate` (string): Filter events after this date
- `endDate` (string): Filter events before this date
- `userId` (string): Filter by user ID

Response:
```json
{
  "success": true,
  "events": [
    {
      "id": "uuid",
      "event_name": "document_uploaded",
      "properties": {},
      "user_id": "uuid",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "totalPages": 20,
    "hasMore": true
  },
  "statistics": {
    "eventCounts": {
      "document_uploaded": 150,
      "document_searched": 500
    },
    "totalEvents30Days": 650
  }
}
```

#### Clean Up Old Events
```
DELETE /api/analytics/events
```

Request Body:
```json
{
  "daysToKeep": 90  // Delete events older than 90 days
}
```

Response:
```json
{
  "success": true,
  "message": "Deleted 1000 events older than 90 days",
  "deletedCount": 1000,
  "cutoffDate": "2023-10-01T00:00:00Z"
}
```

### 5. GDPR Compliance Management

#### List GDPR Requests
```
GET /api/gdpr/requests
```

Query Parameters:
- `status` (string): Filter by status ('pending', 'processing', 'completed', 'failed', 'cancelled')
- `type` (string): Filter by request type ('delete', 'export', 'rectify', 'portability')
- `include_stats` (boolean): Include statistics in response (default: false)

Response:
```json
{
  "success": true,
  "requests": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_email": "user@example.com",
      "user_full_name": "John Doe",
      "request_type": "delete",
      "status": "pending",
      "requested_at": "2025-07-01T00:00:00Z",
      "sla_deadline": "2025-07-31T00:00:00Z",
      "sla_status": "on_track",
      "metadata": {
        "source": "mobile_app"
      }
    }
  ],
  "stats": {
    "total": 50,
    "pending": 10,
    "processing": 5,
    "completed": 30,
    "failed": 3,
    "cancelled": 2,
    "overdue": 1,
    "dueSoon": 3
  }
}
```

#### Create GDPR Request
```
POST /api/gdpr/requests
```

Request Body:
```json
{
  "user_email": "user@example.com",
  "request_type": "delete",
  "reason": "User requested account deletion",
  "metadata": {
    "source": "admin_dashboard"
  }
}
```

Response:
```json
{
  "success": true,
  "message": "GDPR request created successfully",
  "request": {
    "id": "uuid",
    "status": "pending",
    "sla_deadline": "2025-07-31T00:00:00Z"
  }
}
```

#### Update GDPR Request
```
PUT /api/gdpr/requests/:id
```

Request Body:
```json
{
  "notes": "Verified user identity, proceeding with deletion"
}
```

Response:
```json
{
  "success": true,
  "message": "Request updated successfully"
}
```

#### Cancel GDPR Request
```
DELETE /api/gdpr/requests/:id
```

Request Body:
```json
{
  "reason": "User withdrew their request"
}
```

Response:
```json
{
  "success": true,
  "message": "Request cancelled successfully"
}
```

#### Process Deletion Request
```
POST /api/gdpr/delete
```

Request Body:
```json
{
  "request_id": "uuid",
  "confirm": true,
  "source": "mobile",
  "confirm_manual_deletion": true
}
```

Response:
```json
{
  "success": true,
  "message": "Deletion request processed successfully",
  "requiresManualDeletion": false
}
```

#### Export GDPR Requests
```
GET /api/gdpr/export
```

Query Parameters:
- `format` (string): Export format ('csv' only currently)
- `source` (string): Filter by source ('all', 'mobile_app', 'admin_dashboard')
- `status` (string): Filter by status

Response: CSV file download

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `401`: Unauthorized (not authenticated)
- `400`: Bad Request (missing or invalid parameters)
- `500`: Internal Server Error

## Rate Limiting

API endpoints may be subject to rate limiting based on the user's subscription tier:
- Free: 50 requests per day
- Pro: 500 requests per day
- Enterprise: Unlimited requests

## Best Practices

1. **Pagination**: Always use pagination for list endpoints to avoid loading too much data at once.
2. **Error Handling**: Implement proper error handling for all API calls.
3. **Batch Operations**: Use batch endpoints when processing multiple items to reduce API calls.
4. **Authentication**: Ensure authentication tokens are securely stored and refreshed as needed.
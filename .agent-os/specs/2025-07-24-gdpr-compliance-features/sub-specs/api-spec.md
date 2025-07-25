# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-24-gdpr-compliance-features/spec.md

> Created: 2025-07-24
> Version: 1.0.0

## Endpoints

### POST /api/gdpr/consent

**Purpose:** Record user consent for data processing activities
**Parameters:** 
- `consent_type` (string): Type of consent ('data_processing', 'analytics', 'marketing')
- `consent_given` (boolean): Whether consent was granted
- `legal_basis` (string): Legal basis for processing
- `consent_text` (string): Exact consent text shown to user
- `version` (string): Privacy policy/terms version
**Response:** 
```json
{
  "success": true,
  "consent_id": "uuid",
  "recorded_at": "2025-07-24T10:00:00Z"
}
```
**Errors:** 400 (Invalid consent type), 401 (Unauthorized), 422 (Validation error)

### GET /api/gdpr/consent

**Purpose:** Retrieve user's current consent settings
**Parameters:** None (uses authenticated user)
**Response:**
```json
{
  "consents": [
    {
      "consent_type": "data_processing",
      "consent_given": true,
      "legal_basis": "consent",
      "version": "1.0",
      "created_at": "2025-07-24T10:00:00Z"
    }
  ]
}
```
**Errors:** 401 (Unauthorized)

### POST /api/gdpr/data-request

**Purpose:** Submit GDPR data request (export, deletion, correction)
**Parameters:**
- `request_type` (string): 'export', 'deletion', or 'correction'
- `request_details` (object): Additional request parameters
- `reason` (string, optional): User's reason for the request
**Response:**
```json
{
  "success": true,
  "request_id": "uuid",
  "status": "pending",
  "estimated_completion": "2025-07-25T10:00:00Z"
}
```
**Errors:** 400 (Invalid request type), 401 (Unauthorized), 429 (Rate limited)

### GET /api/gdpr/data-request/:id

**Purpose:** Check status of GDPR data request
**Parameters:** Request ID in URL path
**Response:**
```json
{
  "request_id": "uuid",
  "request_type": "export",
  "status": "completed",
  "created_at": "2025-07-24T10:00:00Z",
  "completed_at": "2025-07-24T12:00:00Z",
  "export_url": "https://example.com/exports/user-data.json",
  "notes": "Export completed successfully"
}
```
**Errors:** 401 (Unauthorized), 404 (Request not found)

### GET /api/gdpr/my-data

**Purpose:** Retrieve comprehensive user data export
**Parameters:** 
- `format` (string, optional): 'json' or 'csv' (default: 'json')
**Response:** 
```json
{
  "user_profile": {...},
  "chat_history": [...],
  "health_metrics": [...],
  "subscription_data": {...},
  "consent_records": [...],
  "generated_at": "2025-07-24T10:00:00Z"
}
```
**Errors:** 401 (Unauthorized), 429 (Rate limited - max 1 per day)

### PUT /api/gdpr/privacy-settings

**Purpose:** Update user's privacy preferences
**Parameters:**
- `privacy_settings` (object): User's privacy preferences
- `data_retention_preference` (string): User's data retention preference
**Response:**
```json
{
  "success": true,
  "updated_settings": {...},
  "updated_at": "2025-07-24T10:00:00Z"
}
```
**Errors:** 401 (Unauthorized), 422 (Invalid settings)

## Admin API Endpoints

### GET /admin/api/gdpr/requests

**Purpose:** List all GDPR requests for admin processing
**Parameters:**
- `status` (string, optional): Filter by status
- `request_type` (string, optional): Filter by type
- `page` (number, optional): Pagination
- `limit` (number, optional): Results per page
**Response:**
```json
{
  "requests": [...],
  "total": 50,
  "page": 1,
  "has_more": true
}
```
**Errors:** 401 (Unauthorized), 403 (Not admin)

### PUT /admin/api/gdpr/requests/:id/process

**Purpose:** Process a GDPR request (admin action)
**Parameters:**
- `action` (string): 'approve', 'reject', 'complete'
- `notes` (string, optional): Admin notes
- `export_data` (object, optional): For export requests
**Response:**
```json
{
  "success": true,
  "request_id": "uuid",
  "new_status": "completed",
  "processed_at": "2025-07-24T10:00:00Z"
}
```
**Errors:** 401 (Unauthorized), 403 (Not admin), 404 (Request not found)

### GET /admin/api/gdpr/compliance-report

**Purpose:** Generate GDPR compliance report
**Parameters:**
- `start_date` (string): Start date for report
- `end_date` (string): End date for report
- `include_details` (boolean): Include detailed breakdown
**Response:**
```json
{
  "period": "2025-07-01 to 2025-07-24",
  "total_requests": 25,
  "completed_on_time": 24,
  "sla_compliance_rate": 96,
  "request_breakdown": {...},
  "generated_at": "2025-07-24T10:00:00Z"
}
```
**Errors:** 401 (Unauthorized), 403 (Not admin)

## Controllers and Business Logic

### GDPRController (Mobile App Edge Functions)
- **recordConsent()**: Validates and stores user consent with audit trail
- **getUserConsents()**: Retrieves user's current consent status
- **submitDataRequest()**: Creates new GDPR data request with rate limiting
- **getRequestStatus()**: Returns current status of user's requests
- **exportUserData()**: Generates comprehensive data export
- **updatePrivacySettings()**: Updates user privacy preferences with validation

### GDPRAdminController (Admin App API)
- **listRequests()**: Paginated list of all GDPR requests with filtering
- **processRequest()**: Admin action to approve/reject/complete requests
- **generateComplianceReport()**: Creates detailed compliance analytics
- **auditUserActivity()**: Tracks and reports user GDPR-related actions
- **manageRetentionPolicies()**: Automates data retention and purging

## Rate Limiting and Security

### Rate Limits
- **Data Export**: 1 request per user per day
- **Data Requests**: 3 requests per user per month
- **Consent Updates**: 10 requests per user per hour
- **Admin Operations**: 100 requests per admin per minute

### Security Measures
- **Authentication**: All endpoints require valid Supabase JWT
- **Authorization**: RLS policies enforce data access restrictions
- **Input Validation**: Comprehensive parameter validation and sanitization
- **Audit Logging**: All GDPR operations logged with user context
- **Data Encryption**: Sensitive data encrypted in transit and at rest

## Error Handling Strategy

### Standard Error Response Format
```json
{
  "error": true,
  "message": "Human-readable error description",
  "code": "GDPR_INVALID_REQUEST",
  "details": {...},
  "timestamp": "2025-07-24T10:00:00Z"
}
```

### Error Categories
- **Validation Errors (422)**: Invalid request parameters or data
- **Authentication Errors (401)**: Missing or invalid authentication
- **Authorization Errors (403)**: Insufficient permissions
- **Rate Limiting Errors (429)**: Request rate exceeded
- **Processing Errors (500)**: Server-side processing failures
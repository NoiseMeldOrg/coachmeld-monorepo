# Admin Guide for CoachMeld

This guide explains how to set up and use admin functionality in CoachMeld.

## Overview

Admins have special privileges in CoachMeld for managing content, monitoring compliance, and maintaining the RAG system. 

## Setting Up Admin Users

### Prerequisites
Ensure you've run the admin support script:
```bash
cat scripts/add-admin-support.sql
# Copy and run in Supabase SQL Editor
```

### Making a User an Admin

1. **Find the user's ID** (if needed):
```sql
SELECT id, email, full_name FROM profiles WHERE email = 'user@example.com';
```

2. **Grant admin role**:
```sql
UPDATE profiles 
SET metadata = jsonb_set(metadata, '{role}', '"admin"'::jsonb)
WHERE email = 'admin@example.com';
```

3. **Verify admin status**:
```sql
-- Using the helper function
SELECT is_admin('user-uuid-here');

-- Or check all admins
SELECT id, email, full_name 
FROM profiles 
WHERE metadata->>'role' = 'admin';
```

### Removing Admin Access
```sql
UPDATE profiles 
SET metadata = metadata - 'role'
WHERE email = 'user@example.com';
```

## Admin Capabilities

### 1. RAG Document Management
- Upload and manage document sources
- Set document access tiers (free/premium)
- Manage document versions
- View usage statistics

See: [Admin Source Management Guide](./ADMIN_SOURCE_MANAGEMENT.md)

### 2. Partner & Content Management
- Manage partner agreements
- Track content sources and attribution
- Handle licensing and permissions
- Audit content changes

### 3. Legal & Compliance
- View disclaimer acceptances
- Manage content flags
- Access compliance audit logs
- Review reported content

### 4. Storage Management
- Configure document storage preferences
- Manage storage buckets
- Set file size and type limits

## Admin Operations

### Adding Documents to RAG System

1. **Track a new document source**:
```sql
SELECT track_content_source(
    'Carnivore Diet Guide',      -- source name
    'carnivore',                 -- coach ID
    'Dr. Expert Name',           -- supplied by
    'partner_doctor',            -- supplier type
    'doctor@example.com',        -- email (optional)
    NULL,                        -- agreement ID (optional)
    '{"access_tier": "free"}'    -- metadata
);
```

2. **View source provenance**:
```sql
SELECT * FROM get_source_provenance('source-uuid-here');
```

### Managing Content Flags

1. **View pending flags**:
```sql
SELECT cf.*, cd.title, cd.content 
FROM content_flags cf
JOIN coach_documents cd ON cf.document_id = cd.id
WHERE cf.status = 'pending';
```

2. **Resolve a flag**:
```sql
UPDATE content_flags 
SET 
    status = 'resolved',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    resolution = 'Content verified as accurate'
WHERE id = 'flag-uuid';
```

### Viewing Audit Trails

```sql
-- Recent content changes
SELECT * FROM content_audit_trail 
ORDER BY action_date DESC 
LIMIT 50;

-- Compliance events
SELECT * FROM compliance_audit_log 
ORDER BY created_at DESC 
LIMIT 50;
```

## Security Considerations

1. **Limit Admin Access**: Only grant admin to trusted team members
2. **Audit Regularly**: Review audit logs for unauthorized changes
3. **Document Sources**: Always verify copyright before uploading content
4. **Backup Before Changes**: Major operations should be preceded by backups

## Future Admin Features

Currently, admin operations are SQL-based. Planned features include:
- Web-based admin dashboard
- Bulk document upload interface
- Automated content moderation
- Partner self-service portal

## Troubleshooting

### "Permission denied" errors
- Verify user has admin role: `SELECT is_admin(auth.uid());`
- Check RLS policies are enabled
- Ensure metadata column exists in profiles

### Cannot see admin functions
- Run pending migrations (005, 006, 007)
- Verify pgvector extension is enabled
- Check function permissions

### Need Help?
- Review migration files for policy details
- Check Supabase logs for specific errors
- Test with SQL Editor's auth context
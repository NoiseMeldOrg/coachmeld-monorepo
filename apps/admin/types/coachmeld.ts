// Types matching CoachMeld's database schema
// IMPORTANT: These types mirror the actual database tables in CoachMeld
// If the database schema changes in CoachMeld, update these types to match
// This is the source of truth for database structure in the admin tool
//
// Last synced: 2025-07-23T16:28:52.082Z
// Auto-generated from CoachMeld migrations - DO NOT EDIT MANUALLY
// Run: npm run sync-types to update

export interface Coaches {
  id?: string
  name: string
  description?: string
  coach_type: string
  is_free?: boolean
  monthly_price?: any
  color_theme: any
  icon_name?: string
  features?: string[]
  knowledge_base_enabled?: boolean
  is_active?: boolean
  sort_order?: number
  created_at?: string
  updated_at?: string
  IF?: any
}

export interface UserCoachPreferences {
  user_id?: string
  active_coach_id?: string
  custom_coach_names?: any
  favorite_coaches?: any
  last_used_coach_id?: string
  coach_history?: any
  created_at?: string
  updated_at?: string
}

export interface CoachKnowledgeBase {
  id?: string
  coach_id?: string
  category: string
  subcategory?: string
  question_patterns: string[]
  answer_template: string
  variables?: any
  min_confidence?: any
  priority?: number
  is_active?: boolean
  usage_count?: number
  created_at?: string
  updated_at?: string
}

export interface DocumentSources {
  id?: string
  type: string
  title: string
  filename?: string
  url?: string
  content?: string
  metadata?: any
  created_at?: string
  updated_at?: string
}

export interface CoachDocuments {
  id?: string
  embedding?: number[]
  source_id?: string
  created_at?: string
  updated_at?: string
  title?: string
  is_active?: boolean
}

export interface CoachAccessTiers {
  id?: string
  coach_id: any
  document_id?: string
  required_tier?: any
  created_at?: string
}

export interface RagQueryCache {
  id?: string
  query_hash: any
  coach_id: any
  query_text: string
  query_embedding?: number[]
  retrieved_documents: any
  retrieval_count?: number
  created_at?: string
  expires_at?: string
  last_accessed?: string
}

export interface DocumentVersions {
  id?: string
  document_id: string
  version_number: number
  content: string
  embedding?: number[]
  metadata?: any
  changed_by?: string
  change_summary?: string
  created_at?: string
}

export interface DocumentUsageStats {
  id?: string
  document_id?: string
  retrieved_at?: string
  query_similarity_score?: any
  user_id?: string
  was_helpful?: boolean
  feedback_text?: string
}

export interface RagStoragePreferences {
  id?: string
  coach_id: any
  store_originals_default?: boolean
  storage_method_default?: any
  max_file_size_mb?: number
  allowed_file_types?: string[]
  created_at?: string
  updated_at?: string
}

export interface PartnerCoaches {
  id?: string
  coach_id: any
  partner_id?: string
  coach_name: any
  coach_title?: any
  credentials?: any
  specialties?: string[]
  photo_url?: string
  is_active?: boolean
  launch_date?: string
  created_at?: string
}

export interface CoachDocumentAccess {
  document_id?: string
  coach_id?: string
  access_level?: string
  granted_at?: string
}

// View types for displaying grouped documents
export interface DocumentWithSource extends CoachDocuments {
  source?: DocumentSources
}

export interface DocumentGroup {
  source: DocumentSources
  documents: CoachDocuments[]
  totalChunks: number
}

// Search result types
export interface SearchResult {
  id: string
  document_id: string
  content: string
  similarity: number
  metadata?: any
  chunk_index: number
  document_title: string
  source_name?: string
}

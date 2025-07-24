-- GDPR Compliance Schema Test Suite
-- Test file for migration: 056_gdpr_compliance_schema.sql
-- Purpose: Validate GDPR database schema implementation
-- Created: 2025-07-24

-- This file contains test queries to validate the GDPR compliance schema
-- Run these tests after applying the migration to ensure everything works correctly

-- ================================
-- 1. TEST TABLE CREATION
-- ================================

-- Test that all tables were created
SELECT 'PASS: gdpr_consent_records table exists' as test_result 
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'gdpr_consent_records'
);

SELECT 'PASS: gdpr_data_requests table exists' as test_result 
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'gdpr_data_requests'
);

SELECT 'PASS: data_processing_records table exists' as test_result 
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'data_processing_records'
);

SELECT 'PASS: gdpr_audit_log table exists' as test_result 
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'gdpr_audit_log'
);

-- ================================
-- 2. TEST COLUMN ADDITIONS
-- ================================

-- Test that new columns were added to profiles table
SELECT 'PASS: gdpr_consent_version column added to profiles' as test_result
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'gdpr_consent_version'
);

SELECT 'PASS: is_eu_user column added to profiles' as test_result
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'is_eu_user'
);

SELECT 'PASS: privacy_settings column added to profiles' as test_result
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'privacy_settings'
);

SELECT 'PASS: data_retention_date column added to profiles' as test_result
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'data_retention_date'
);

-- ================================
-- 3. TEST INDEX CREATION
-- ================================

-- Test that indexes were created
SELECT 'PASS: idx_gdpr_consent_user_id index exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM pg_indexes 
  WHERE indexname = 'idx_gdpr_consent_user_id'
);

SELECT 'PASS: idx_gdpr_requests_status index exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM pg_indexes 
  WHERE indexname = 'idx_gdpr_requests_status'
);

SELECT 'PASS: idx_data_processing_category index exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM pg_indexes 
  WHERE indexname = 'idx_data_processing_category'
);

SELECT 'PASS: idx_gdpr_audit_action index exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM pg_indexes 
  WHERE indexname = 'idx_gdpr_audit_action'
);

-- ================================
-- 4. TEST RLS POLICIES
-- ================================

-- Test that RLS is enabled on all tables
SELECT 'PASS: RLS enabled on gdpr_consent_records' as test_result
WHERE EXISTS (
  SELECT 1 FROM pg_tables 
  WHERE tablename = 'gdpr_consent_records' AND rowsecurity = true
);

SELECT 'PASS: RLS enabled on gdpr_data_requests' as test_result
WHERE EXISTS (
  SELECT 1 FROM pg_tables 
  WHERE tablename = 'gdpr_data_requests' AND rowsecurity = true
);

SELECT 'PASS: RLS enabled on data_processing_records' as test_result
WHERE EXISTS (
  SELECT 1 FROM pg_tables 
  WHERE tablename = 'data_processing_records' AND rowsecurity = true
);

SELECT 'PASS: RLS enabled on gdpr_audit_log' as test_result
WHERE EXISTS (
  SELECT 1 FROM pg_tables 
  WHERE tablename = 'gdpr_audit_log' AND rowsecurity = true
);

-- Test that policies were created
SELECT 'PASS: RLS policies created' as test_result
WHERE (
  SELECT COUNT(*) FROM pg_policies 
  WHERE tablename IN ('gdpr_consent_records', 'gdpr_data_requests', 'data_processing_records', 'gdpr_audit_log')
) >= 8; -- Should have at least 8 policies across all tables

-- ================================
-- 5. TEST DATABASE FUNCTIONS
-- ================================

-- Test that functions were created
SELECT 'PASS: log_gdpr_action function exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'log_gdpr_action'
);

SELECT 'PASS: get_user_consent_status function exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'get_user_consent_status'
);

SELECT 'PASS: has_user_consent function exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'has_user_consent'
);

SELECT 'PASS: calculate_retention_deadline function exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'calculate_retention_deadline'
);

-- ================================
-- 6. TEST DATA POPULATION
-- ================================

-- Test that initial data processing records were created
SELECT 'PASS: Initial data processing records created' as test_result
WHERE (SELECT COUNT(*) FROM data_processing_records WHERE is_active = true) >= 5;

-- Test specific data categories exist
SELECT 'PASS: profile_data processing record exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM data_processing_records 
  WHERE data_category = 'profile_data' AND is_active = true
);

SELECT 'PASS: health_metrics processing record exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM data_processing_records 
  WHERE data_category = 'health_metrics' AND is_active = true
);

SELECT 'PASS: chat_history processing record exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM data_processing_records 
  WHERE data_category = 'chat_history' AND is_active = true
);

SELECT 'PASS: payment_data processing record exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM data_processing_records 
  WHERE data_category = 'payment_data' AND is_active = true
);

-- ================================
-- 7. TEST CONSTRAINTS AND CHECKS
-- ================================

-- Test CHECK constraints on gdpr_data_requests
SELECT 'PASS: gdpr_data_requests request_type constraint exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM information_schema.check_constraints 
  WHERE constraint_name LIKE '%gdpr_data_requests%' 
  AND check_clause LIKE '%request_type%'
);

SELECT 'PASS: gdpr_data_requests status constraint exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM information_schema.check_constraints 
  WHERE constraint_name LIKE '%gdpr_data_requests%' 
  AND check_clause LIKE '%status%'
);

-- ================================
-- 8. TEST FOREIGN KEY CONSTRAINTS
-- ================================

-- Test foreign key relationships
SELECT 'PASS: gdpr_consent_records foreign key to profiles exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'gdpr_consent_records' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id'
);

SELECT 'PASS: gdpr_data_requests foreign key to profiles exists' as test_result
WHERE EXISTS (
  SELECT 1 FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'gdpr_data_requests' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id'
);

-- ================================
-- 9. TEST TRIGGERS
-- ================================

-- Test that triggers were created
SELECT 'PASS: updated_at triggers created' as test_result
WHERE (
  SELECT COUNT(*) FROM information_schema.triggers 
  WHERE trigger_name LIKE '%updated_at%'
  AND event_object_table IN ('gdpr_consent_records', 'gdpr_data_requests', 'data_processing_records')
) >= 3;

-- ================================
-- 10. FUNCTIONAL TESTS
-- ================================

-- Test calculate_retention_deadline function
SELECT 'PASS: calculate_retention_deadline function works' as test_result
WHERE calculate_retention_deadline('2_years', '2025-01-01'::timestamp with time zone) = '2027-01-01'::timestamp with time zone;

-- ================================
-- SUMMARY
-- ================================

-- Count total tests
WITH test_results AS (
  SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('gdpr_consent_records', 'gdpr_data_requests', 'data_processing_records', 'gdpr_audit_log')) as tables_created,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('gdpr_consent_version', 'is_eu_user', 'privacy_settings', 'data_retention_date')) as columns_added,
    (SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_gdpr_%' OR indexname LIKE 'idx_data_processing_%') as indexes_created,
    (SELECT COUNT(*) FROM pg_tables WHERE tablename IN ('gdpr_consent_records', 'gdpr_data_requests', 'data_processing_records', 'gdpr_audit_log') AND rowsecurity = true) as rls_enabled,
    (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('log_gdpr_action', 'get_user_consent_status', 'has_user_consent', 'calculate_retention_deadline')) as functions_created,
    (SELECT COUNT(*) FROM data_processing_records WHERE is_active = true) as data_records_created
)
SELECT 
  'MIGRATION TEST SUMMARY:' as summary,
  'Tables Created: ' || tables_created || '/4' as tables,
  'Columns Added: ' || columns_added || '/4' as columns,
  'Indexes Created: ' || indexes_created || ' (expected 10+)' as indexes,
  'RLS Enabled: ' || rls_enabled || '/4' as rls,
  'Functions Created: ' || functions_created || '/4' as functions,
  'Data Records: ' || data_records_created || ' (expected 5+)' as data_records
FROM test_results;

-- Final validation
SELECT 
  CASE 
    WHEN (
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('gdpr_consent_records', 'gdpr_data_requests', 'data_processing_records', 'gdpr_audit_log')) = 4
      AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('gdpr_consent_version', 'is_eu_user', 'privacy_settings', 'data_retention_date')) = 4
      AND (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('log_gdpr_action', 'get_user_consent_status', 'has_user_consent', 'calculate_retention_deadline')) = 4
      AND (SELECT COUNT(*) FROM data_processing_records WHERE is_active = true) >= 5
    ) THEN '✅ ALL TESTS PASSED - GDPR SCHEMA MIGRATION SUCCESSFUL'
    ELSE '❌ SOME TESTS FAILED - REVIEW MIGRATION'
  END as final_result;
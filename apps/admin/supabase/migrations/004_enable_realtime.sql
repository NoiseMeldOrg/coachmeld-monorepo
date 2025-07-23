-- Enable real-time for document_sources table
ALTER PUBLICATION supabase_realtime ADD TABLE document_sources;

-- Enable real-time for coach_documents table
ALTER PUBLICATION supabase_realtime ADD TABLE coach_documents;

-- Note: Real-time is automatically enabled for auth.users through Supabase Auth
-- No need to explicitly enable it for user activity tracking
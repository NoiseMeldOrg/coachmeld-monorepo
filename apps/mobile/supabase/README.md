# Supabase Setup for CoachMeld

This directory contains the Supabase configuration for the CoachMeld app.

## Setup Instructions

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Note your project URL and anon key

2. **Run the Database Schema**
   - In your Supabase dashboard, go to SQL Editor
   - Copy and paste the contents of `schema.sql`
   - Run the SQL to create all tables and policies

3. **Run the Migrations**
   - Apply each migration file in order (002-008)
   - These add multi-coach system, RAG capabilities, and more

4. **Environment Variables**
   - Create a `.env` file in the root directory:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   GEMINI_API_KEY=your-gemini-api-key
   SUPABASE_SERVICE_KEY=your-service-key
   ```

## Database Structure

- **profiles**: User profile data (extends auth.users)
- **messages**: Chat message history
- **meal_plans**: User meal plans
- **progress**: User progress tracking (future feature)
- **ai_coach_requests**: Tracks AI coach API calls
- **coach_documents**: RAG system documents with embeddings
- **document_sources**: Document metadata and attribution
- **subscriptions**: User subscription management

## AI Integration

The app uses Google's Gemini API for:
1. Generating responses in the coach chat
2. Creating embeddings for the RAG system
3. Processing and understanding user queries

## Email Confirmation

### Development Setup
For development, you can disable email confirmation:
1. Go to Authentication > Providers > Email in Supabase dashboard
2. Turn OFF "Confirm email"
3. Users can now sign up and immediately access the app

### Production Setup
For production environments:
1. Keep email confirmation enabled
2. Set proper redirect URLs in Authentication > URL Configuration
3. Configure email templates in Authentication > Email Templates
4. The app handles confirmation with user-friendly messages

### How Email Confirmation Works
1. User signs up → Receives confirmation email
2. Email contains link with redirect to app origin
3. After confirmation, user can sign in normally
4. If user tries to sign in before confirming, they see a helpful message

## Security

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- Edge function uses service role key for database operations
- Email confirmation adds an extra layer of account verification
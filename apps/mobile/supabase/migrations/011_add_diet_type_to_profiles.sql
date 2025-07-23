-- Add diet_type column to profiles table
ALTER TABLE profiles 
ADD COLUMN diet_type TEXT CHECK (diet_type IN ('paleo', 'lowcarb', 'keto', 'ketovore', 'carnivore', 'lion'));

-- Add activity_level and goal_weight columns while we're at it
ALTER TABLE profiles 
ADD COLUMN activity_level TEXT DEFAULT 'moderately_active' CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
ADD COLUMN goal_weight_kg NUMERIC;

-- Create an index on diet_type for performance
CREATE INDEX idx_profiles_diet_type ON profiles(diet_type);
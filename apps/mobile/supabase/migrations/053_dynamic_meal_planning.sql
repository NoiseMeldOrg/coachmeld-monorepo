-- Migration: Dynamic Meal Planning System
-- Creates tables for meal plans, recipes, and user favorites

-- Drop existing tables if they exist (clean slate approach)
DROP TABLE IF EXISTS favorite_recipes CASCADE;
DROP TABLE IF EXISTS meal_plans CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;

-- Create recipes table to store all recipes
CREATE TABLE IF NOT EXISTS recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    calories INTEGER,
    protein_g NUMERIC,
    fat_g NUMERIC,
    carbs_g NUMERIC,
    cooking_method TEXT,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    ingredients JSONB NOT NULL DEFAULT '[]',
    instructions JSONB NOT NULL DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meal_plans table to store generated meal plans
CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    breakfast_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    lunch_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    dinner_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    total_calories INTEGER,
    total_protein_g NUMERIC,
    total_fat_g NUMERIC,
    total_carbs_g NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create favorite_recipes table for user's saved recipes
CREATE TABLE IF NOT EXISTS favorite_recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, recipe_id)
);

-- Add cooking preferences to user profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cooking_methods TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS favorite_foods TEXT,
ADD COLUMN IF NOT EXISTS disliked_foods TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes(meal_type);
CREATE INDEX IF NOT EXISTS idx_recipes_is_favorite ON recipes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_favorite_recipes_user_id ON favorite_recipes(user_id);

-- Enable RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_recipes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can create own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON recipes;
DROP POLICY IF EXISTS "Service role has full access to recipes" ON recipes;

DROP POLICY IF EXISTS "Users can view own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can create own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Service role has full access to meal_plans" ON meal_plans;

DROP POLICY IF EXISTS "Users can view own favorites" ON favorite_recipes;
DROP POLICY IF EXISTS "Users can add own favorites" ON favorite_recipes;
DROP POLICY IF EXISTS "Users can remove own favorites" ON favorite_recipes;
DROP POLICY IF EXISTS "Service role has full access to favorite_recipes" ON favorite_recipes;

-- RLS Policies for recipes
CREATE POLICY "Users can view own recipes" ON recipes
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create own recipes" ON recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes" ON recipes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes" ON recipes
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for meal_plans
CREATE POLICY "Users can view own meal plans" ON meal_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meal plans" ON meal_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans" ON meal_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal plans" ON meal_plans
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for favorite_recipes
CREATE POLICY "Users can view own favorites" ON favorite_recipes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add own favorites" ON favorite_recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own favorites" ON favorite_recipes
    FOR DELETE USING (auth.uid() = user_id);

-- Service role access for all tables
CREATE POLICY "Service role has full access to recipes" ON recipes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to meal_plans" ON meal_plans
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to favorite_recipes" ON favorite_recipes
    FOR ALL USING (auth.role() = 'service_role');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meal_plans TO authenticated;
GRANT SELECT, INSERT, DELETE ON favorite_recipes TO authenticated;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Dynamic meal planning migration completed successfully';
    RAISE NOTICE 'Created tables: recipes, meal_plans, favorite_recipes';
    RAISE NOTICE 'Added cooking preferences to profiles table';
END $$;
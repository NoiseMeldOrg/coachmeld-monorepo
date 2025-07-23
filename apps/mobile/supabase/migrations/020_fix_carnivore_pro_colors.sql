-- Migration: Fix Carnivore Coach Pro colors to match free version
-- Version: 020
-- Description: Updates Carnivore Coach Pro color theme to use red/pink colors instead of brown/orange

-- Add icon_library column if it doesn't exist (for storing which icon library to use)
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS icon_library TEXT DEFAULT 'Ionicons';

-- Update Carnivore Coach Pro to use the same red/pink color scheme as free Carnivore Coach
UPDATE coaches 
SET color_theme = '{"primary": "#FF6B6B", "secondary": "#FFE0E0", "accent": "#FF4444"}'
WHERE coach_type = 'carnivore' AND name = 'Carnivore Coach Pro';

-- Also update the icon to match the steak icon used in the app
UPDATE coaches 
SET icon_name = 'food-steak',
    icon_library = 'MaterialCommunityIcons'
WHERE coach_type = 'carnivore' AND name = 'Carnivore Coach Pro';

-- Also update the free Carnivore Coach to have the correct icon library
UPDATE coaches 
SET icon_name = 'food-steak',
    icon_library = 'MaterialCommunityIcons'
WHERE coach_type = 'carnivore' AND name = 'Carnivore Coach';
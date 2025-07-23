-- Migration: Fix coach icon libraries
-- Version: 023
-- Description: Ensures coaches have the correct icon_library set for their icons

-- Update coaches that use MaterialCommunityIcons icons
UPDATE coaches 
SET icon_library = 'MaterialCommunityIcons'
WHERE icon_name IN ('food-steak', 'food-drumstick', 'paw', 'silverware-fork-knife')
AND (icon_library IS NULL OR icon_library != 'MaterialCommunityIcons');

-- Specifically fix the Ketovore Coach
UPDATE coaches
SET icon_library = 'MaterialCommunityIcons'
WHERE coach_type = 'ketovore' 
AND icon_name = 'food-drumstick';

-- Ensure all other coaches default to Ionicons if not set
UPDATE coaches
SET icon_library = 'Ionicons'
WHERE icon_library IS NULL
AND icon_name NOT IN ('food-steak', 'food-drumstick', 'paw', 'silverware-fork-knife');
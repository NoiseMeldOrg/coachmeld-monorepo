-- Update coach icons to be more appropriate
UPDATE coaches 
SET icon_name = 'restaurant' 
WHERE name = 'Carnivore Coach Pro';

-- Note: Ionicons doesn't have a specific steak icon, so 'restaurant' is used
-- Alternative options: 'restaurant', 'pizza' (closest to food), 'flame' (for grilling)
-- In the future, could use custom SVG icons for more specific representations
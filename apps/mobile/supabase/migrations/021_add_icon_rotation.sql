-- Migration: Add icon rotation support for coaches
-- Version: 021
-- Description: Adds icon_rotation column to coaches table for configurable icon rotation

-- Add icon_rotation column to coaches table (in degrees, positive = clockwise)
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS icon_rotation INTEGER DEFAULT 0;

-- Update carnivore coaches to have 90 degree counter-clockwise rotation (-90)
UPDATE coaches 
SET icon_rotation = -90
WHERE coach_type = 'carnivore';

-- All other coaches remain at 0 degrees (default)
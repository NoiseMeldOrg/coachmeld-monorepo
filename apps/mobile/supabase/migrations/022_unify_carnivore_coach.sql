-- Migration: Unify Carnivore Coach - Single Coach with Tiered Access
-- Version: 022
-- Description: Consolidates free and pro carnivore coaches into a single coach with free tier access

-- Add columns for free tier support
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS free_tier_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS free_tier_daily_limit INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS free_tier_features TEXT[] DEFAULT NULL;

-- Update Carnivore Coach Pro to support free tier access
UPDATE coaches 
SET 
    free_tier_enabled = true,
    free_tier_daily_limit = 5,
    free_tier_features = ARRAY[
        'Basic carnivore principles',
        'Limited to 5 messages/day', 
        'General meal ideas',
        'Community support'
    ]
WHERE coach_type = 'carnivore' 
AND name = 'Carnivore Coach Pro';

-- Handle migration from free carnivore coach to pro
DO $$
DECLARE
    pro_coach_id UUID;
    free_coach_id UUID;
BEGIN
    -- Get Carnivore Coach Pro ID
    SELECT id INTO pro_coach_id 
    FROM coaches 
    WHERE coach_type = 'carnivore' 
    AND name = 'Carnivore Coach Pro'
    LIMIT 1;
    
    -- Get free Carnivore Coach ID if it exists
    SELECT id INTO free_coach_id
    FROM coaches 
    WHERE coach_type = 'carnivore' 
    AND is_free = true
    AND name = 'Carnivore Coach'
    LIMIT 1;
    
    -- Only migrate if both exist
    IF pro_coach_id IS NOT NULL AND free_coach_id IS NOT NULL THEN
        -- Update active coach preferences
        UPDATE user_coach_preferences 
        SET active_coach_id = pro_coach_id
        WHERE active_coach_id = free_coach_id;
        
        -- Update last used coach
        UPDATE user_coach_preferences 
        SET last_used_coach_id = pro_coach_id
        WHERE last_used_coach_id = free_coach_id;
        
        -- Update messages to point to pro coach
        UPDATE messages
        SET coach_id = pro_coach_id
        WHERE coach_id = free_coach_id;
        
        -- Update AI coach requests
        UPDATE ai_coach_requests
        SET coach_id = pro_coach_id
        WHERE coach_id = free_coach_id;
        
        -- Update any subscriptions (though free coach shouldn't have any)
        UPDATE subscriptions
        SET coach_id = pro_coach_id
        WHERE coach_id = free_coach_id;
        
        -- Update conversation memories if table exists
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_memories') THEN
            UPDATE conversation_memories
            SET coach_id = pro_coach_id
            WHERE coach_id = free_coach_id;
        END IF;
        
        -- Now safe to delete the free carnivore coach
        DELETE FROM coaches 
        WHERE id = free_coach_id;
    END IF;
END $$;

-- Add index for free tier queries
CREATE INDEX IF NOT EXISTS idx_coaches_free_tier ON coaches(free_tier_enabled) WHERE free_tier_enabled = true;
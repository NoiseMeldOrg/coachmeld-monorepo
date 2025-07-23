-- Check all coach types in the system
SELECT 
    coach_type,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as coaches,
    CASE 
        WHEN coach_type IN ('carnivore', 'paleo', 'keto', 'lowcarb', 'ketovore', 'lion') THEN 'Diet Coach'
        WHEN coach_type = 'fitness' THEN 'Fitness Coach'
        WHEN coach_type = 'mindfulness' THEN 'Mindfulness Coach'
        WHEN coach_type = 'basic' THEN 'Basic Health Coach'
        ELSE 'Other'
    END as category
FROM coaches
WHERE is_active = true
GROUP BY coach_type
ORDER BY category, coach_type;
-- Migration: Add date_of_birth column to profiles table
-- This allows accurate age calculation and removes the need to update age annually

-- Add date_of_birth column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Create a function to calculate age from date_of_birth
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- For existing users with age but no date_of_birth, 
-- estimate their birth date (this is approximate)
UPDATE profiles 
SET date_of_birth = CURRENT_DATE - INTERVAL '1 year' * age - INTERVAL '6 months'
WHERE age IS NOT NULL 
  AND age > 0 
  AND date_of_birth IS NULL;

-- Create a computed column for age (PostgreSQL doesn't support stored computed columns)
-- Instead, we'll create a view that includes calculated age
CREATE OR REPLACE VIEW profiles_with_age AS
SELECT 
    p.*,
    CASE 
        WHEN p.date_of_birth IS NOT NULL THEN calculate_age(p.date_of_birth)
        ELSE p.age
    END AS calculated_age
FROM profiles p;

-- Create index on date_of_birth for performance
CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth ON profiles(date_of_birth);

-- Add a trigger to clear the old age column when date_of_birth is set
CREATE OR REPLACE FUNCTION sync_age_with_dob()
RETURNS TRIGGER AS $$
BEGIN
    -- If date_of_birth is being set, calculate and update age
    IF NEW.date_of_birth IS NOT NULL THEN
        NEW.age = calculate_age(NEW.date_of_birth);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_age_from_dob ON profiles;
CREATE TRIGGER update_age_from_dob
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_age_with_dob();

-- Grant permissions
GRANT SELECT ON profiles_with_age TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_age(DATE) TO authenticated;

-- Add comment explaining the column
COMMENT ON COLUMN profiles.date_of_birth IS 'User birth date for accurate age calculation';
COMMENT ON COLUMN profiles.age IS 'Deprecated - use date_of_birth instead. Kept for backward compatibility.';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Added date_of_birth column to profiles table';
    RAISE NOTICE 'Created calculate_age function';
    RAISE NOTICE 'Estimated birth dates for existing users with age';
    RAISE NOTICE 'Created profiles_with_age view for calculated ages';
    RAISE NOTICE 'Age column is now deprecated but maintained for compatibility';
END $$;
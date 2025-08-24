-- Direct fix for the blood_type trigger error
-- The issue is a trigger trying to access NEW.blood_type but the field doesn't exist

-- First, let's drop any problematic triggers
DROP TRIGGER IF EXISTS update_inventory_on_approval ON donations;
DROP FUNCTION IF EXISTS update_blood_inventory_on_approval();

-- Create a corrected trigger function that doesn't reference blood_type
CREATE OR REPLACE FUNCTION update_blood_inventory_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    donor_blood_group VARCHAR(5);
    units_to_add INTEGER;
    center_name TEXT;
BEGIN
    -- Only process when status changes to approved/completed
    IF NEW.status IN ('approved', 'completed') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'completed')) THEN
        
        -- Get donor blood group from user profile first
        SELECT blood_group INTO donor_blood_group
        FROM users 
        WHERE id = NEW.donor_id;
        
        -- If not found in user profile, try the donation record field
        -- NOTE: Using donor_blood_group, NOT blood_type (which doesn't exist)
        IF donor_blood_group IS NULL AND NEW.donor_blood_group IS NOT NULL THEN
            donor_blood_group := NEW.donor_blood_group;
        END IF;
        
        -- If still no blood group, log warning and exit
        IF donor_blood_group IS NULL OR donor_blood_group = '' THEN
            RAISE WARNING 'Could not determine blood group for donation ID %. Skipping inventory update.', NEW.id;
            RETURN NEW;
        END IF;
        
        -- Get units and center
        units_to_add := COALESCE(NEW.units_donated, 1);
        center_name := COALESCE(NEW.donation_center, 'Walk-in Center');
        
        -- Update or insert into blood_inventory
        INSERT INTO blood_inventory (blood_group, units_available, location, expiry_date, updated_at)
        VALUES (
            donor_blood_group,
            units_to_add,
            center_name,
            (CURRENT_DATE + INTERVAL '42 days')::DATE,
            NOW()
        )
        ON CONFLICT (blood_group) 
        DO UPDATE SET 
            units_available = blood_inventory.units_available + units_to_add,
            updated_at = NOW();
        
        RAISE NOTICE 'Blood inventory updated: Added % units of % from donation %', 
            units_to_add, donor_blood_group, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_inventory_on_approval
    AFTER UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_blood_inventory_on_approval();

-- Log completion
SELECT 'Trigger fixed: blood_type reference removed' AS result;

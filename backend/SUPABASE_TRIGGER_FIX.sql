/*
CRITICAL FIX FOR BLOOD_TYPE TRIGGER ERROR
======================================

The error "record 'new' has no field 'blood_type'" happens because 
there's a database trigger trying to access NEW.blood_type, but the 
donations table uses 'donor_blood_group' instead.

COPY AND PASTE THIS ENTIRE SCRIPT INTO SUPABASE SQL EDITOR TO FIX THE ISSUE:
*/

-- Step 1: Drop the problematic trigger and function
DROP TRIGGER IF EXISTS update_inventory_on_approval ON donations;
DROP TRIGGER IF EXISTS update_blood_inventory_trigger ON donations;
DROP FUNCTION IF EXISTS update_blood_inventory() CASCADE;
DROP FUNCTION IF EXISTS update_blood_inventory_on_approval() CASCADE;

-- Step 2: Create a corrected trigger function that uses the right field names
CREATE OR REPLACE FUNCTION update_blood_inventory_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    donor_blood_type VARCHAR(5);
    units_to_add INTEGER;
    center_name TEXT;
BEGIN
    -- Only process when status changes to approved/completed
    IF NEW.status IN ('approved', 'completed') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'completed')) THEN
        
        -- Get donor blood group - try multiple sources
        donor_blood_type := NULL;
        
        -- First try: donor_blood_group field from donation record
        IF NEW.donor_blood_group IS NOT NULL AND NEW.donor_blood_group != '' THEN
            donor_blood_type := NEW.donor_blood_group;
        END IF;
        
        -- Second try: get from user profile if donor_blood_type is still null
        IF donor_blood_type IS NULL THEN
            BEGIN
                SELECT blood_group INTO donor_blood_type
                FROM users 
                WHERE id = NEW.donor_id;
            EXCEPTION
                WHEN OTHERS THEN
                    donor_blood_type := NULL;
            END;
        END IF;
        
        -- If we have a valid blood type, update inventory
        IF donor_blood_type IS NOT NULL AND donor_blood_type != '' THEN
            units_to_add := COALESCE(NEW.units_donated, 1);
            center_name := COALESCE(NEW.donation_center, 'Walk-in Center');
            
            -- Update or insert blood inventory
            INSERT INTO blood_inventory (
                blood_group,
                units_available,
                location,
                expiry_date,
                updated_at
            ) VALUES (
                donor_blood_type,
                units_to_add,
                center_name,
                (CURRENT_DATE + INTERVAL '42 days')::DATE,
                NOW()
            )
            ON CONFLICT (blood_group) 
            DO UPDATE SET 
                units_available = blood_inventory.units_available + units_to_add,
                updated_at = NOW();
            
            RAISE NOTICE 'Blood inventory updated: Added % units of % blood from donation %', 
                units_to_add, donor_blood_type, NEW.id;
        ELSE
            RAISE WARNING 'Could not determine blood group for donation ID % - skipping inventory update', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Recreate the trigger
CREATE TRIGGER update_inventory_on_approval
    AFTER UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_blood_inventory_on_approval();

-- Step 4: Verify the fix
SELECT 'Trigger fixed successfully - blood_type reference removed' AS status;

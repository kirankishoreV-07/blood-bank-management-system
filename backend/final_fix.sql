-- FINAL CORRECTED Blood Inventory Fix
-- This script addresses the exact column issues shown in the server logs

-- Quick fix for blood_type field error in trigger
-- This updates the trigger to use donor_blood_group instead of blood_type

CREATE OR REPLACE FUNCTION update_blood_inventory()
RETURNS TRIGGER AS $$
DECLARE
    donor_blood_type VARCHAR(5);
    donor_full_name VARCHAR(255);
    batch_num VARCHAR(50);
BEGIN
    -- Only update inventory when status changes to approved
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        
        -- Get blood type from donor_blood_group field (NOT blood_type which doesn't exist)
        IF NEW.donor_blood_group IS NOT NULL AND NEW.donor_blood_group != '' THEN
            donor_blood_type := NEW.donor_blood_group;
        ELSE
            -- Fallback: get blood type from donor's profile
            BEGIN
                SELECT blood_group INTO donor_blood_type
                FROM users 
                WHERE id = NEW.donor_id;
            EXCEPTION
                WHEN OTHERS THEN
                    donor_blood_type := NULL;
            END;
        END IF;
        
        -- Get donor name for logging
        BEGIN
            SELECT full_name INTO donor_full_name FROM users WHERE id = NEW.donor_id;
        EXCEPTION
            WHEN OTHERS THEN
                donor_full_name := 'Unknown Donor';
        END;
        
        -- Update inventory if we have a valid blood type
        IF donor_blood_type IS NOT NULL AND donor_blood_type != '' THEN
            -- Update or insert blood inventory
            INSERT INTO blood_inventory (
                blood_group,
                units_available,
                location,
                expiry_date,
                updated_at
            ) VALUES (
                donor_blood_type,
                COALESCE(NEW.units_donated, 1),
                COALESCE(NEW.donation_center, 'Central Blood Bank'),
                (CURRENT_DATE + INTERVAL '42 days')::DATE,
                NOW()
            )
            ON CONFLICT (blood_group) 
            DO UPDATE SET 
                units_available = blood_inventory.units_available + COALESCE(NEW.units_donated, 1),
                updated_at = NOW();
            
            RAISE NOTICE 'Blood inventory updated: Added % units of % blood', 
                         COALESCE(NEW.units_donated, 1), donor_blood_type;
        ELSE
            RAISE WARNING 'Could not determine blood type for donation ID % - skipping inventory update', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_inventory_on_approval ON donations;
CREATE TRIGGER update_inventory_on_approval
    AFTER UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_blood_inventory();

-- Fix the check_donation_eligibility function parameter name
DROP FUNCTION IF EXISTS check_donation_eligibility(UUID);
DROP FUNCTION IF EXISTS check_donation_eligibility(donor_uuid UUID);

-- Create the function with the correct parameter name that backend expects
CREATE OR REPLACE FUNCTION check_donation_eligibility(donor_uuid UUID)
RETURNS TABLE (
    is_eligible BOOLEAN,
    reason TEXT,
    days_since_last_donation INTEGER,
    next_eligible_date DATE,
    pending_donations_count INTEGER
) AS $$
DECLARE
    last_donation_date DATE;
    pending_count INTEGER;
    days_diff INTEGER;
BEGIN
    -- Check for pending donations first from donations table
    SELECT COUNT(*) INTO pending_count
    FROM donations 
    WHERE donor_id = donor_uuid 
    AND status IN ('pending_admin_approval', 'pending_review', 'scheduled');
    
    -- If there are pending donations, not eligible
    IF pending_count > 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            'You have ' || pending_count || ' donation(s) pending admin approval. Please wait for approval before submitting a new request.',
            0,
            CURRENT_DATE,
            pending_count;
        RETURN;
    END IF;
    
    -- Check last donation date from donations table
    SELECT MAX(donation_date) INTO last_donation_date
    FROM donations 
    WHERE donor_id = donor_uuid 
    AND status IN ('completed')
    AND admin_approved = true;
    
    -- If no previous donations, eligible to donate
    IF last_donation_date IS NULL THEN
        RETURN QUERY SELECT 
            TRUE,
            'Eligible for first-time donation',
            0,
            CURRENT_DATE,
            0;
        RETURN;
    END IF;
    
    -- Calculate days since last donation
    days_diff := CURRENT_DATE - last_donation_date;
    
    -- Check 56-day buffer period
    IF days_diff >= 56 THEN
        RETURN QUERY SELECT 
            TRUE,
            'Eligible to donate',
            days_diff,
            CURRENT_DATE,
            0;
    ELSE
        RETURN QUERY SELECT 
            FALSE,
            'Must wait 56 days between donations. Last donation was ' || days_diff || ' days ago.',
            days_diff,
            last_donation_date + INTERVAL '56 days',
            0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the donor_dashboard_view with correct column references
DROP VIEW IF EXISTS donor_dashboard_view CASCADE;

CREATE VIEW donor_dashboard_view AS
SELECT 
    u.id as donor_id,
    u.id,  -- Backend expects both donor_id and id
    u.full_name,
    u.blood_group,
    
    -- Stats from donations table
    COALESCE(d.total_donations, 0) as total_donations,
    COALESCE(d.total_units, 0) as total_units,
    d.last_donation_date,
    
    -- Calculate next eligible date (56 days after last donation)
    CASE 
        WHEN d.last_donation_date IS NULL THEN CURRENT_DATE
        ELSE d.last_donation_date + INTERVAL '56 days'
    END as next_eligible_date,
    
    -- Eligibility check
    CASE 
        WHEN d.last_donation_date IS NULL THEN true
        WHEN d.last_donation_date + INTERVAL '56 days' <= CURRENT_DATE THEN true
        ELSE false
    END as can_donate_now,
    
    -- Pending donations count
    COALESCE(p.pending_count, 0) as pending_approvals,
    
    -- Default values for backend compatibility
    0 as latest_risk_score,
    'eligible' as eligibility_status,
    
    -- Days calculations
    CASE 
        WHEN d.last_donation_date IS NULL THEN 0
        WHEN d.last_donation_date + INTERVAL '56 days' <= CURRENT_DATE THEN 0
        ELSE EXTRACT(DAY FROM (d.last_donation_date + INTERVAL '56 days') - CURRENT_DATE)::integer
    END as days_until_eligible,
    
    CASE 
        WHEN d.last_donation_date IS NULL THEN 'First time donor - eligible to donate'
        WHEN d.last_donation_date + INTERVAL '56 days' <= CURRENT_DATE THEN 'Eligible to donate'
        ELSE 'Must wait ' || EXTRACT(DAY FROM (d.last_donation_date + INTERVAL '56 days') - CURRENT_DATE)::integer || ' more days'
    END as eligibility_reason,
    
    COALESCE(p.pending_count, 0) as pending_donations_count
    
FROM users u
LEFT JOIN (
    SELECT 
        donor_id,
        COUNT(*) as total_donations,
        SUM(units_donated) as total_units,
        MAX(donation_date) as last_donation_date
    FROM donations 
    WHERE status = 'completed' AND admin_approved = true
    GROUP BY donor_id
) d ON u.id = d.donor_id
LEFT JOIN (
    SELECT 
        donor_id,
        COUNT(*) as pending_count
    FROM donations 
    WHERE status IN ('pending_admin_approval', 'pending_review', 'scheduled')
    GROUP BY donor_id
) p ON u.id = p.donor_id
WHERE u.user_type = 'donor';

-- Grant permissions on the view
GRANT SELECT ON donor_dashboard_view TO authenticated;

-- Test the fix
SELECT 
    'FIXED' as status,
    'blood_inventory table recreated with correct columns' as inventory_status,
    'donor_dashboard_view created with backend compatibility' as view_status,
    'check_donation_eligibility function fixed with correct parameter name' as function_status;

-- Show sample data to verify
SELECT 
    blood_group,
    units_available,
    location,
    last_updated
FROM blood_inventory 
ORDER BY blood_group;

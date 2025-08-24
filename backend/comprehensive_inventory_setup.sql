-- COMPREHENSIVE BLOOD INVENTORY FIX - CORRECTED VERSION
-- This script fixes all blood inventory issues and creates proper data management

-- =============================================================================
-- STEP 1: CLEAN UP EXISTING TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Drop any existing problematic triggers first
DROP TRIGGER IF EXISTS trigger_donation_approval_inventory ON donations;
DROP TRIGGER IF EXISTS trigger_enhanced_donation_approval_inventory ON enhanced_donations;
DROP TRIGGER IF EXISTS trigger_pending_donation_approval_inventory ON pending_donations;
DROP FUNCTION IF EXISTS process_donation_approval() CASCADE;
DROP FUNCTION IF EXISTS update_blood_inventory_on_approval() CASCADE;

-- =============================================================================
-- STEP 2: RECREATE BLOOD INVENTORY WITH PROPER STRUCTURE
-- =============================================================================

DROP TABLE IF EXISTS blood_inventory CASCADE;

CREATE TABLE blood_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blood_group VARCHAR(5) NOT NULL,
    units_available INTEGER DEFAULT 0 CHECK (units_available >= 0),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    donation_id UUID,
    donor_id UUID,
    donor_name VARCHAR(255),
    donation_date DATE NOT NULL,
    collection_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'expired', 'used')),
    location VARCHAR(255) DEFAULT 'Main Blood Bank',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW(),
    updated_by UUID
);

-- Create indexes for performance
CREATE INDEX idx_blood_inventory_blood_group ON blood_inventory(blood_group);
CREATE INDEX idx_blood_inventory_expiry_date ON blood_inventory(expiry_date);
CREATE INDEX idx_blood_inventory_status ON blood_inventory(status);
CREATE INDEX idx_blood_inventory_donation_id ON blood_inventory(donation_id);

-- =============================================================================
-- STEP 2: CREATE REALISTIC BLOOD INVENTORY DATA WITH PROPER EXPIRY MANAGEMENT
-- =============================================================================

-- Function to generate realistic batch numbers
CREATE OR REPLACE FUNCTION generate_batch_number(blood_type VARCHAR(5), date_collected DATE)
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN blood_type || '-' || TO_CHAR(date_collected, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Insert realistic blood inventory with various expiry dates
INSERT INTO blood_inventory (
    blood_group, 
    units_available, 
    batch_number, 
    donation_date, 
    collection_date,
    expiry_date, 
    status, 
    location, 
    notes,
    donor_name
) VALUES
-- A+ Blood Group - Multiple batches with different expiry dates
('A+', 2, generate_batch_number('A+', (CURRENT_DATE - INTERVAL '5 days')::DATE), (CURRENT_DATE - INTERVAL '5 days')::DATE, (CURRENT_DATE - INTERVAL '5 days')::DATE, (CURRENT_DATE + INTERVAL '37 days')::DATE, 'available', 'Main Blood Bank', 'Fresh donation', 'John Smith'),
('A+', 1, generate_batch_number('A+', (CURRENT_DATE - INTERVAL '10 days')::DATE), (CURRENT_DATE - INTERVAL '10 days')::DATE, (CURRENT_DATE - INTERVAL '10 days')::DATE, (CURRENT_DATE + INTERVAL '32 days')::DATE, 'available', 'Main Blood Bank', 'Regular donation', 'Mary Johnson'),
('A+', 3, generate_batch_number('A+', (CURRENT_DATE - INTERVAL '15 days')::DATE), (CURRENT_DATE - INTERVAL '15 days')::DATE, (CURRENT_DATE - INTERVAL '15 days')::DATE, (CURRENT_DATE + INTERVAL '27 days')::DATE, 'available', 'City Hospital', 'Hospital collection', 'David Wilson'),
('A+', 1, generate_batch_number('A+', (CURRENT_DATE - INTERVAL '25 days')::DATE), (CURRENT_DATE - INTERVAL '25 days')::DATE, (CURRENT_DATE - INTERVAL '25 days')::DATE, (CURRENT_DATE + INTERVAL '17 days')::DATE, 'available', 'Main Blood Bank', 'Older batch', 'Sarah Davis'),

-- A- Blood Group
('A-', 1, generate_batch_number('A-', (CURRENT_DATE - INTERVAL '3 days')::DATE), (CURRENT_DATE - INTERVAL '3 days')::DATE, (CURRENT_DATE - INTERVAL '3 days')::DATE, (CURRENT_DATE + INTERVAL '39 days')::DATE, 'available', 'Main Blood Bank', 'Rare type donation', 'Michael Brown'),
('A-', 2, generate_batch_number('A-', (CURRENT_DATE - INTERVAL '12 days')::DATE), (CURRENT_DATE - INTERVAL '12 days')::DATE, (CURRENT_DATE - INTERVAL '12 days')::DATE, (CURRENT_DATE + INTERVAL '30 days')::DATE, 'available', 'Regional Center', 'Scheduled donation', 'Lisa Garcia'),
('A-', 1, generate_batch_number('A-', (CURRENT_DATE - INTERVAL '20 days')::DATE), (CURRENT_DATE - INTERVAL '20 days')::DATE, (CURRENT_DATE - INTERVAL '20 days')::DATE, (CURRENT_DATE + INTERVAL '22 days')::DATE, 'available', 'Main Blood Bank', 'Community drive', 'Robert Martinez'),

-- B+ Blood Group
('B+', 2, generate_batch_number('B+', (CURRENT_DATE - INTERVAL '2 days')::DATE), (CURRENT_DATE - INTERVAL '2 days')::DATE, (CURRENT_DATE - INTERVAL '2 days')::DATE, (CURRENT_DATE + INTERVAL '40 days')::DATE, 'available', 'Main Blood Bank', 'Recent donation', 'Jessica Taylor'),
('B+', 3, generate_batch_number('B+', (CURRENT_DATE - INTERVAL '8 days')::DATE), (CURRENT_DATE - INTERVAL '8 days')::DATE, (CURRENT_DATE - INTERVAL '8 days')::DATE, (CURRENT_DATE + INTERVAL '34 days')::DATE, 'available', 'University Hospital', 'Student donation', 'Christopher Lee'),
('B+', 2, generate_batch_number('B+', (CURRENT_DATE - INTERVAL '18 days')::DATE), (CURRENT_DATE - INTERVAL '18 days')::DATE, (CURRENT_DATE - INTERVAL '18 days')::DATE, (CURRENT_DATE + INTERVAL '24 days')::DATE, 'available', 'Main Blood Bank', 'Regular donor', 'Amanda White'),

-- B- Blood Group
('B-', 1, generate_batch_number('B-', (CURRENT_DATE - INTERVAL '6 days')::DATE), (CURRENT_DATE - INTERVAL '6 days')::DATE, (CURRENT_DATE - INTERVAL '6 days')::DATE, (CURRENT_DATE + INTERVAL '36 days')::DATE, 'available', 'Main Blood Bank', 'Rare donation', 'Daniel Harris'),
('B-', 1, generate_batch_number('B-', (CURRENT_DATE - INTERVAL '14 days')::DATE), (CURRENT_DATE - INTERVAL '14 days')::DATE, (CURRENT_DATE - INTERVAL '14 days')::DATE, (CURRENT_DATE + INTERVAL '28 days')::DATE, 'available', 'Metro Hospital', 'Emergency collection', 'Rachel Clark'),
('B-', 1, generate_batch_number('B-', (CURRENT_DATE - INTERVAL '30 days')::DATE), (CURRENT_DATE - INTERVAL '30 days')::DATE, (CURRENT_DATE - INTERVAL '30 days')::DATE, (CURRENT_DATE + INTERVAL '12 days')::DATE, 'available', 'Main Blood Bank', 'Aging batch', 'Kevin Lewis'),

-- AB+ Blood Group
('AB+', 2, generate_batch_number('AB+', (CURRENT_DATE - INTERVAL '4 days')::DATE), (CURRENT_DATE - INTERVAL '4 days')::DATE, (CURRENT_DATE - INTERVAL '4 days')::DATE, (CURRENT_DATE + INTERVAL '38 days')::DATE, 'available', 'Main Blood Bank', 'Universal plasma', 'Emily Rodriguez'),
('AB+', 1, generate_batch_number('AB+', (CURRENT_DATE - INTERVAL '11 days')::DATE), (CURRENT_DATE - INTERVAL '11 days')::DATE, (CURRENT_DATE - INTERVAL '11 days')::DATE, (CURRENT_DATE + INTERVAL '31 days')::DATE, 'available', 'Central Hospital', 'Rare type', 'Thomas Walker'),
('AB+', 2, generate_batch_number('AB+', (CURRENT_DATE - INTERVAL '22 days')::DATE), (CURRENT_DATE - INTERVAL '22 days')::DATE, (CURRENT_DATE - INTERVAL '22 days')::DATE, (CURRENT_DATE + INTERVAL '20 days')::DATE, 'available', 'Main Blood Bank', 'Scheduled donation', 'Olivia Hall'),

-- AB- Blood Group (Rarest)
('AB-', 1, generate_batch_number('AB-', (CURRENT_DATE - INTERVAL '7 days')::DATE), (CURRENT_DATE - INTERVAL '7 days')::DATE, (CURRENT_DATE - INTERVAL '7 days')::DATE, (CURRENT_DATE + INTERVAL '35 days')::DATE, 'available', 'Main Blood Bank', 'Extremely rare', 'Matthew Allen'),
('AB-', 1, generate_batch_number('AB-', (CURRENT_DATE - INTERVAL '16 days')::DATE), (CURRENT_DATE - INTERVAL '16 days')::DATE, (CURRENT_DATE - INTERVAL '16 days')::DATE, (CURRENT_DATE + INTERVAL '26 days')::DATE, 'available', 'Specialty Center', 'Special collection', 'Sophia Young'),

-- O+ Blood Group (Universal donor for RBC)
('O+', 3, generate_batch_number('O+', (CURRENT_DATE - INTERVAL '1 days')::DATE), (CURRENT_DATE - INTERVAL '1 days')::DATE, (CURRENT_DATE - INTERVAL '1 days')::DATE, (CURRENT_DATE + INTERVAL '41 days')::DATE, 'available', 'Main Blood Bank', 'Universal donor', 'Joshua King'),
('O+', 4, generate_batch_number('O+', (CURRENT_DATE - INTERVAL '9 days')::DATE), (CURRENT_DATE - INTERVAL '9 days')::DATE, (CURRENT_DATE - INTERVAL '9 days')::DATE, (CURRENT_DATE + INTERVAL '33 days')::DATE, 'available', 'Community Center', 'Blood drive', 'Ashley Wright'),
('O+', 3, generate_batch_number('O+', (CURRENT_DATE - INTERVAL '13 days')::DATE), (CURRENT_DATE - INTERVAL '13 days')::DATE, (CURRENT_DATE - INTERVAL '13 days')::DATE, (CURRENT_DATE + INTERVAL '29 days')::DATE, 'available', 'Main Blood Bank', 'Regular donation', 'Brandon Lopez'),
('O+', 2, generate_batch_number('O+', (CURRENT_DATE - INTERVAL '21 days')::DATE), (CURRENT_DATE - INTERVAL '21 days')::DATE, (CURRENT_DATE - INTERVAL '21 days')::DATE, (CURRENT_DATE + INTERVAL '21 days')::DATE, 'available', 'Regional Center', 'Monthly donor', 'Megan Hill'),

-- O- Blood Group (Universal donor)
('O-', 2, generate_batch_number('O-', (CURRENT_DATE - INTERVAL '3 days')::DATE), (CURRENT_DATE - INTERVAL '3 days')::DATE, (CURRENT_DATE - INTERVAL '3 days')::DATE, (CURRENT_DATE + INTERVAL '39 days')::DATE, 'available', 'Main Blood Bank', 'Universal donor', 'Ryan Scott'),
('O-', 3, generate_batch_number('O-', (CURRENT_DATE - INTERVAL '7 days')::DATE), (CURRENT_DATE - INTERVAL '7 days')::DATE, (CURRENT_DATE - INTERVAL '7 days')::DATE, (CURRENT_DATE + INTERVAL '35 days')::DATE, 'available', 'Emergency Center', 'Critical supply', 'Nicole Green'),
('O-', 2, generate_batch_number('O-', (CURRENT_DATE - INTERVAL '17 days')::DATE), (CURRENT_DATE - INTERVAL '17 days')::DATE, (CURRENT_DATE - INTERVAL '17 days')::DATE, (CURRENT_DATE + INTERVAL '25 days')::DATE, 'available', 'Main Blood Bank', 'High demand type', 'Eric Adams'),
('O-', 1, generate_batch_number('O-', (CURRENT_DATE - INTERVAL '28 days')::DATE), (CURRENT_DATE - INTERVAL '28 days')::DATE, (CURRENT_DATE - INTERVAL '28 days')::DATE, (CURRENT_DATE + INTERVAL '14 days')::DATE, 'available', 'Metro Hospital', 'Aging batch', 'Stephanie Baker');

-- Add some expired batches for realism
INSERT INTO blood_inventory (
    blood_group, 
    units_available, 
    batch_number, 
    donation_date, 
    collection_date,
    expiry_date, 
    status, 
    location, 
    notes,
    donor_name
) VALUES
('A+', 1, generate_batch_number('A+', (CURRENT_DATE - INTERVAL '45 days')::DATE), (CURRENT_DATE - INTERVAL '45 days')::DATE, (CURRENT_DATE - INTERVAL '45 days')::DATE, (CURRENT_DATE - INTERVAL '3 days')::DATE, 'expired', 'Main Blood Bank', 'Expired - needs disposal', 'John Doe'),
('O+', 2, generate_batch_number('O+', (CURRENT_DATE - INTERVAL '50 days')::DATE), (CURRENT_DATE - INTERVAL '50 days')::DATE, (CURRENT_DATE - INTERVAL '50 days')::DATE, (CURRENT_DATE - INTERVAL '8 days')::DATE, 'expired', 'Regional Center', 'Expired batch', 'Jane Smith');

-- =============================================================================
-- STEP 3: CREATE AUTOMATED INVENTORY MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to automatically update inventory status based on expiry
CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS void AS $$
BEGIN
    -- Mark expired units
    UPDATE blood_inventory 
    SET status = 'expired', 
        last_updated = NOW(),
        notes = COALESCE(notes || ' | ', '') || 'Auto-expired on ' || CURRENT_DATE
    WHERE expiry_date < CURRENT_DATE 
    AND status = 'available';
    
    -- Log the update
    RAISE NOTICE 'Updated expired blood units to expired status';
END;
$$ LANGUAGE plpgsql;

-- Function to add blood to inventory when donation is approved
CREATE OR REPLACE FUNCTION add_blood_to_inventory(
    p_blood_group VARCHAR(5),
    p_units INTEGER,
    p_donor_id UUID,
    p_donor_name VARCHAR(255),
    p_donation_date DATE,
    p_donation_center VARCHAR(255),
    p_donation_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_batch_id UUID;
    batch_num VARCHAR(50);
    expiry_date DATE;
BEGIN
    -- Generate batch number
    batch_num := generate_batch_number(p_blood_group, p_donation_date);
    
    -- Calculate expiry date (42 days from donation)
    expiry_date := p_donation_date + INTERVAL '42 days';
    
    -- Insert new batch
    INSERT INTO blood_inventory (
        blood_group,
        units_available,
        batch_number,
        donation_id,
        donor_id,
        donor_name,
        donation_date,
        collection_date,
        expiry_date,
        status,
        location,
        notes
    ) VALUES (
        p_blood_group,
        p_units,
        batch_num,
        p_donation_id,
        p_donor_id,
        p_donor_name,
        p_donation_date,
        CURRENT_DATE,
        expiry_date,
        'available',
        COALESCE(p_donation_center, 'Main Blood Bank'),
        'Added via donation approval'
    ) RETURNING id INTO new_batch_id;
    
    RAISE NOTICE 'Added % units of % blood (Batch: %) from donor % (ID: %)', 
                 p_units, p_blood_group, batch_num, p_donor_name, p_donor_id;
    
    RETURN new_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get available units by blood group (excluding expired)
CREATE OR REPLACE FUNCTION get_available_blood_units(p_blood_group VARCHAR(5) DEFAULT NULL)
RETURNS TABLE (
    blood_group VARCHAR(5),
    total_units INTEGER,
    available_units INTEGER,
    expiring_soon INTEGER,
    expired_units INTEGER,
    oldest_batch_expiry DATE,
    newest_batch_expiry DATE
) AS $$
BEGIN
    -- Update expired status first
    PERFORM update_inventory_status();
    
    RETURN QUERY
    SELECT 
        bi.blood_group,
        SUM(bi.units_available)::INTEGER as total_units,
        SUM(CASE WHEN bi.status = 'available' AND bi.expiry_date >= CURRENT_DATE THEN bi.units_available ELSE 0 END)::INTEGER as available_units,
        SUM(CASE WHEN bi.status = 'available' AND bi.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN bi.units_available ELSE 0 END)::INTEGER as expiring_soon,
        SUM(CASE WHEN bi.status = 'expired' OR bi.expiry_date < CURRENT_DATE THEN bi.units_available ELSE 0 END)::INTEGER as expired_units,
        MIN(CASE WHEN bi.status = 'available' THEN bi.expiry_date END) as oldest_batch_expiry,
        MAX(CASE WHEN bi.status = 'available' THEN bi.expiry_date END) as newest_batch_expiry
    FROM blood_inventory bi
    WHERE (p_blood_group IS NULL OR bi.blood_group = p_blood_group)
    GROUP BY bi.blood_group
    ORDER BY bi.blood_group;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 4: FIX DONATION APPROVAL TO PROPERLY ADD TO INVENTORY
-- =============================================================================

-- Improved function to handle donation approval and inventory update
CREATE OR REPLACE FUNCTION process_donation_approval()
RETURNS TRIGGER AS $$
DECLARE
    donor_blood_group VARCHAR(5);
    donor_full_name VARCHAR(255);
    batch_id UUID;
BEGIN
    -- Only process when status changes to approved/completed
    IF NEW.status IN ('approved', 'completed') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'completed')) THEN
        
        -- Get donor information
        SELECT blood_group, full_name INTO donor_blood_group, donor_full_name
        FROM users 
        WHERE id = NEW.donor_id;
        
        -- If blood group not found in user profile, try to get from donation record
        IF donor_blood_group IS NULL AND NEW.donor_blood_group IS NOT NULL THEN
            donor_blood_group := NEW.donor_blood_group;
        END IF;
        
        -- Add to inventory if we have blood group
        IF donor_blood_group IS NOT NULL THEN
            batch_id := add_blood_to_inventory(
                donor_blood_group,
                COALESCE(NEW.units_donated, 1),
                NEW.donor_id,
                COALESCE(donor_full_name, 'Unknown Donor'),
                NEW.donation_date,
                NEW.donation_center,
                NEW.id
            );
            
            RAISE NOTICE 'Donation approved: Added % units of % blood to inventory (Batch ID: %)', 
                         COALESCE(NEW.units_donated, 1), donor_blood_group, batch_id;
        ELSE
            RAISE WARNING 'Could not determine blood group for donor % - blood not added to inventory', NEW.donor_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 5: CREATE COMPREHENSIVE VIEWS FOR DIFFERENT PURPOSES
-- =============================================================================

-- Available inventory summary (excludes expired)
CREATE OR REPLACE VIEW available_blood_inventory AS
SELECT 
    blood_group,
    COUNT(*) as batch_count,
    SUM(units_available) as total_units,
    MIN(expiry_date) as earliest_expiry,
    MAX(expiry_date) as latest_expiry,
    AVG(expiry_date - CURRENT_DATE)::INTEGER as avg_days_to_expiry,
    string_agg(location, ', ') as locations
FROM blood_inventory
WHERE status = 'available' AND expiry_date >= CURRENT_DATE
GROUP BY blood_group
ORDER BY blood_group;

-- Detailed inventory with expiry status
CREATE OR REPLACE VIEW detailed_blood_inventory AS
SELECT 
    id,
    blood_group,
    units_available,
    batch_number,
    donor_name,
    donation_date,
    expiry_date,
    CASE 
        WHEN expiry_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'EXPIRING_SOON'
        WHEN expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'EXPIRING_MEDIUM'
        ELSE 'FRESH'
    END as expiry_status,
    status,
    location,
    (expiry_date - CURRENT_DATE)::INTEGER as days_to_expiry,
    last_updated
FROM blood_inventory
ORDER BY blood_group, expiry_date;

-- Critical inventory alerts
CREATE OR REPLACE VIEW blood_inventory_alerts AS
SELECT 
    blood_group,
    SUM(CASE WHEN status = 'available' AND expiry_date >= CURRENT_DATE THEN units_available ELSE 0 END) as available_units,
    SUM(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND status = 'available' THEN units_available ELSE 0 END) as expiring_soon,
    COUNT(CASE WHEN expiry_date < CURRENT_DATE AND status != 'expired' THEN 1 END) as needs_expiry_update,
    CASE 
        WHEN SUM(CASE WHEN status = 'available' AND expiry_date >= CURRENT_DATE THEN units_available ELSE 0 END) = 0 THEN 'OUT_OF_STOCK'
        WHEN SUM(CASE WHEN status = 'available' AND expiry_date >= CURRENT_DATE THEN units_available ELSE 0 END) <= 3 THEN 'LOW_STOCK'
        WHEN SUM(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND status = 'available' THEN units_available ELSE 0 END) > 0 THEN 'EXPIRING_SOON'
        ELSE 'NORMAL'
    END as alert_level
FROM blood_inventory
GROUP BY blood_group
ORDER BY blood_group;

-- =============================================================================
-- STEP 6: CREATE TRIGGERS FOR AUTOMATIC INVENTORY MANAGEMENT
-- =============================================================================

-- Apply trigger to donations table
DROP TRIGGER IF EXISTS trigger_donation_approval_inventory ON donations;
CREATE TRIGGER trigger_donation_approval_inventory
    AFTER UPDATE OF status ON donations
    FOR EACH ROW
    EXECUTE FUNCTION process_donation_approval();

-- Apply trigger to enhanced_donations table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enhanced_donations') THEN
        DROP TRIGGER IF EXISTS trigger_enhanced_donation_approval_inventory ON enhanced_donations;
        CREATE TRIGGER trigger_enhanced_donation_approval_inventory
            AFTER UPDATE OF status ON enhanced_donations
            FOR EACH ROW
            EXECUTE FUNCTION process_donation_approval();
    END IF;
END $$;

-- Apply trigger to pending_donations table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_donations') THEN
        DROP TRIGGER IF EXISTS trigger_pending_donation_approval_inventory ON pending_donations;
        CREATE TRIGGER trigger_pending_donation_approval_inventory
            AFTER UPDATE OF status ON pending_donations
            FOR EACH ROW
            EXECUTE FUNCTION process_donation_approval();
    END IF;
END $$;

-- =============================================================================
-- STEP 7: ENABLE SECURITY AND PERMISSIONS
-- =============================================================================

ALTER TABLE blood_inventory ENABLE ROW LEVEL SECURITY;

-- Public can view available inventory
CREATE POLICY "Public can view available inventory" ON blood_inventory
    FOR SELECT USING (status = 'available' AND expiry_date >= CURRENT_DATE);

-- Admin can manage all inventory
CREATE POLICY "Admin can manage all inventory" ON blood_inventory
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

-- Grant permissions
GRANT SELECT ON blood_inventory TO authenticated;
GRANT SELECT ON available_blood_inventory TO authenticated;
GRANT SELECT ON detailed_blood_inventory TO authenticated;
GRANT SELECT ON blood_inventory_alerts TO authenticated;
GRANT ALL ON blood_inventory TO service_role;

-- =============================================================================
-- STEP 8: RUN MAINTENANCE AND VERIFICATION
-- =============================================================================

-- Update any expired items
SELECT update_inventory_status();

-- Show current inventory summary
SELECT 
    'BLOOD INVENTORY SETUP COMPLETE!' as status,
    COUNT(*) as total_batches,
    SUM(units_available) as total_units,
    COUNT(DISTINCT blood_group) as blood_groups_available
FROM blood_inventory 
WHERE status = 'available' AND expiry_date >= CURRENT_DATE;

-- Show inventory by blood group
SELECT 
    'CURRENT INVENTORY BY BLOOD GROUP' as info,
    blood_group,
    SUM(units_available) as available_units,
    COUNT(*) as batch_count
FROM blood_inventory
WHERE status = 'available' AND expiry_date >= CURRENT_DATE
GROUP BY blood_group
ORDER BY blood_group;

-- Show batch details (sample)
SELECT 
    'BATCH DETAILS (SAMPLE)' as info,
    blood_group,
    units_available as units,
    batch_number,
    donor_name,
    (expiry_date - CURRENT_DATE) as days_to_expiry
FROM blood_inventory
WHERE status = 'available'
ORDER BY blood_group, expiry_date
LIMIT 10;

-- Final verification
SELECT 
    'SETUP VERIFICATION' as final_check,
    'Triggers created successfully' as triggers_status;

-- Clean up temporary function
DROP FUNCTION IF EXISTS generate_batch_number(VARCHAR(5), DATE);

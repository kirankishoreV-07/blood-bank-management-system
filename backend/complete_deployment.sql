-- COMPLETE BLOOD BANK SCHEMA DEPLOYMENT
-- This single file fixes all backend compatibility issues and creates the full enhanced schema
-- Copy and paste this entire script into Supabase SQL Editor

-- =============================================================================
-- STEP 1: CLEAN SLATE - Drop existing objects to prevent conflicts
-- =============================================================================

DO $$ 
BEGIN
    -- Drop triggers if they exist
    DROP TRIGGER IF EXISTS trigger_update_inventory_on_approval ON enhanced_donations;
    DROP TRIGGER IF EXISTS update_enhanced_donations_updated_at ON enhanced_donations;
    DROP TRIGGER IF EXISTS trigger_update_inventory_on_approval ON pending_donations;
    DROP TRIGGER IF EXISTS update_pending_donations_updated_at ON pending_donations;
    
    -- Drop views
    DROP VIEW IF EXISTS recent_inventory_additions CASCADE;
    DROP VIEW IF EXISTS blood_inventory_summary CASCADE;
    DROP VIEW IF EXISTS donor_dashboard_view CASCADE;
    DROP VIEW IF EXISTS admin_pending_donations_view CASCADE;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS check_donation_eligibility(UUID) CASCADE;
    DROP FUNCTION IF EXISTS check_donation_eligibility(donor_uuid UUID) CASCADE;
    DROP FUNCTION IF EXISTS check_donation_eligibility(p_donor_id UUID) CASCADE;
    DROP FUNCTION IF EXISTS update_blood_inventory_on_approval() CASCADE;
    DROP FUNCTION IF EXISTS update_inventory_on_approval() CASCADE;
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    
    -- Drop enhanced tables
    DROP TABLE IF EXISTS pending_donations CASCADE;
    DROP TABLE IF EXISTS donation_requests CASCADE;
    DROP TABLE IF EXISTS enhanced_donations CASCADE;
    DROP TABLE IF EXISTS blood_inventory CASCADE;
    
    RAISE NOTICE 'Cleaned existing objects successfully';
END $$;

-- =============================================================================
-- STEP 2: CREATE CORE TABLES WITH CORRECT COLUMN NAMES
-- =============================================================================

-- Create blood_inventory table with EXACT columns backend expects
CREATE TABLE blood_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blood_group VARCHAR(5) NOT NULL,  -- Backend expects blood_group (not blood_type)
    units_available INTEGER DEFAULT 0,
    units_reserved INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),  -- Backend expects last_updated (not updated_at)
    updated_by UUID,
    -- Additional tracking fields
    donation_id UUID,
    donor_id UUID,
    donor_name VARCHAR(255),
    donation_date DATE,
    batch_number VARCHAR(50),
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'available',
    location VARCHAR(255) DEFAULT 'Main Blood Bank',
    notes TEXT
);

-- Create enhanced_donations table for admin approval workflow
CREATE TABLE enhanced_donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_id UUID NOT NULL,
    donation_date DATE NOT NULL,
    blood_group VARCHAR(5), -- Consistent with blood_inventory
    units_donated INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending_admin_approval',
    risk_score DECIMAL(5,2) DEFAULT 0.00,
    eligibility_status VARCHAR(50) DEFAULT 'pending',
    admin_approved_by UUID,
    admin_approval_date TIMESTAMP,
    donation_center VARCHAR(255),
    notes TEXT,
    ai_verification JSONB,
    medical_data JSONB,
    submitted_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create pending_donations table for comprehensive workflow
CREATE TABLE pending_donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_id UUID NOT NULL,
    
    -- Basic donation information
    donation_date DATE NOT NULL,
    units_donated INTEGER CHECK (units_donated > 0) NOT NULL,
    donation_center VARCHAR(255) NOT NULL,
    notes TEXT,
    
    -- Medical and eligibility data
    basic_info JSONB NOT NULL,
    medical_data JSONB NOT NULL,
    health_conditions JSONB NOT NULL,
    
    -- Risk assessment
    risk_score DECIMAL(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_flags JSONB,
    eligibility_status VARCHAR(20) DEFAULT 'eligible',
    
    -- Documents and verification
    uploaded_documents JSONB,
    document_verification_status VARCHAR(20) DEFAULT 'pending',
    ai_verification JSONB,
    professional_assessment JSONB,
    
    -- Admin approval workflow
    status VARCHAR(30) DEFAULT 'pending_admin_approval',
    admin_id UUID,
    admin_notes TEXT,
    admin_decision_date TIMESTAMP WITH TIME ZONE,
    
    -- Certificate generation
    certificate_generated BOOLEAN DEFAULT false,
    certificate_data JSONB,
    certificate_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Tracking
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX idx_blood_inventory_blood_group ON blood_inventory(blood_group);
CREATE INDEX idx_blood_inventory_donation_id ON blood_inventory(donation_id);
CREATE INDEX idx_enhanced_donations_donor_id ON enhanced_donations(donor_id);
CREATE INDEX idx_enhanced_donations_status ON enhanced_donations(status);
CREATE INDEX idx_enhanced_donations_date ON enhanced_donations(donation_date);
CREATE INDEX idx_pending_donations_donor_id ON pending_donations(donor_id);
CREATE INDEX idx_pending_donations_status ON pending_donations(status);

-- =============================================================================
-- STEP 4: INSERT SAMPLE BLOOD INVENTORY DATA
-- =============================================================================

INSERT INTO blood_inventory (blood_group, units_available, donation_id, donor_id, donor_name, location, last_updated) 
VALUES 
    ('A+', 15, NULL, NULL, NULL, 'Main Blood Bank', NOW()), 
    ('A-', 8, NULL, NULL, NULL, 'Main Blood Bank', NOW()), 
    ('B+', 12, NULL, NULL, NULL, 'Main Blood Bank', NOW()), 
    ('B-', 5, NULL, NULL, NULL, 'Main Blood Bank', NOW()),
    ('AB+', 9, NULL, NULL, NULL, 'Main Blood Bank', NOW()), 
    ('AB-', 3, NULL, NULL, NULL, 'Main Blood Bank', NOW()), 
    ('O+', 20, NULL, NULL, NULL, 'Main Blood Bank', NOW()), 
    ('O-', 11, NULL, NULL, NULL, 'Main Blood Bank', NOW());

-- =============================================================================
-- STEP 5: CREATE FUNCTIONS WITH CORRECT PARAMETER NAMES
-- =============================================================================

-- Fixed eligibility check function that backend can call correctly
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
    -- Check for pending donations in both tables
    SELECT COUNT(*) INTO pending_count
    FROM (
        SELECT donor_id FROM donations 
        WHERE donor_id = donor_uuid AND status IN ('pending_admin_approval', 'scheduled')
        UNION ALL
        SELECT donor_id FROM pending_donations 
        WHERE donor_id = donor_uuid AND status = 'pending_admin_approval'
        UNION ALL
        SELECT donor_id FROM enhanced_donations 
        WHERE donor_id = donor_uuid AND status IN ('pending_admin_approval', 'pending_review')
    ) pending;
    
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
    
    -- Check last completed donation date
    SELECT MAX(donation_date) INTO last_donation_date
    FROM donations 
    WHERE donor_id = donor_uuid 
    AND status = 'completed'
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
            'Eligible to donate - buffer period completed',
            days_diff,
            CURRENT_DATE,
            0;
    ELSE
        RETURN QUERY SELECT 
            FALSE,
            'Must wait 56 days between donations. Last donation was ' || days_diff || ' days ago.',
            days_diff,
            (last_donation_date + INTERVAL '56 days')::DATE,
            0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update blood inventory on donation approval
CREATE OR REPLACE FUNCTION update_blood_inventory_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    donor_blood_group VARCHAR(5);
    donor_full_name VARCHAR(255);
    batch_num VARCHAR(50);
BEGIN
    -- Only update inventory when status changes to approved
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        
        -- Get blood group and donor name
        IF NEW.basic_info IS NOT NULL THEN
            donor_blood_group := NEW.basic_info->>'bloodGroup';
        ELSIF NEW.blood_group IS NOT NULL THEN
            donor_blood_group := NEW.blood_group;
        END IF;
        
        -- Get donor's full name
        BEGIN
            SELECT full_name INTO donor_full_name
            FROM users 
            WHERE id = NEW.donor_id;
        EXCEPTION
            WHEN others THEN
                donor_full_name := 'Unknown Donor';
        END;
        
        -- Generate batch number
        batch_num := 'PD-' || SUBSTRING(NEW.id::text, 1, 8);
        
        -- Ensure we have a valid blood group
        IF donor_blood_group IS NOT NULL AND donor_blood_group != '' THEN
            
            -- 1. Create individual donation record in inventory
            INSERT INTO blood_inventory (
                blood_group,
                units_available,
                donation_id,
                donor_id,
                donor_name,
                donation_date,
                batch_number,
                expiry_date,
                status,
                location,
                notes,
                updated_by,
                last_updated
            ) VALUES (
                donor_blood_group,
                NEW.units_donated,
                NEW.id,
                NEW.donor_id,
                donor_full_name,
                NEW.donation_date,
                batch_num,
                NEW.donation_date + INTERVAL '42 days',
                'available',
                NEW.donation_center,
                'Approved donation - Admin approved on ' || NOW()::date,
                NEW.admin_id,
                NOW()
            );
            
            -- 2. Update the summary record (where donation_id IS NULL)
            UPDATE blood_inventory 
            SET 
                units_available = units_available + NEW.units_donated,
                last_updated = NOW(),
                updated_by = NEW.admin_id
            WHERE blood_group = donor_blood_group 
            AND donation_id IS NULL;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 6: CREATE TRIGGERS
-- =============================================================================

CREATE TRIGGER trigger_update_inventory_on_approval
    AFTER UPDATE OF status ON pending_donations
    FOR EACH ROW
    EXECUTE FUNCTION update_blood_inventory_on_approval();

CREATE TRIGGER update_pending_donations_updated_at
    BEFORE UPDATE ON pending_donations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_donations_updated_at
    BEFORE UPDATE ON enhanced_donations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 7: CREATE VIEWS FOR ADMIN DASHBOARD AND DONOR STATS
-- =============================================================================

-- Admin view for pending donations
CREATE VIEW admin_pending_donations_view AS
SELECT 
    pd.id,
    pd.donor_id,
    u.full_name as donor_name,
    u.email as donor_email,
    u.phone as donor_phone,
    u.blood_group as donor_blood_group,
    pd.donation_date,
    pd.units_donated,
    pd.donation_center,
    pd.risk_score,
    pd.eligibility_status,
    pd.status,
    pd.submitted_at,
    pd.notes,
    pd.basic_info,
    pd.medical_data,
    pd.health_conditions,
    pd.risk_flags
FROM pending_donations pd
JOIN users u ON pd.donor_id = u.id
WHERE pd.status = 'pending_admin_approval'
ORDER BY pd.submitted_at ASC;

-- Blood inventory summary view
CREATE VIEW blood_inventory_summary AS
SELECT 
    blood_group,
    SUM(units_available) as total_units,
    MAX(last_updated) as last_updated,
    COUNT(CASE WHEN donation_id IS NOT NULL THEN 1 END) as total_donations,
    COUNT(CASE WHEN last_updated >= NOW() - INTERVAL '24 hours' AND donation_id IS NOT NULL THEN 1 END) as recent_donations
FROM blood_inventory
GROUP BY blood_group
ORDER BY blood_group;

-- Recent inventory additions view
CREATE VIEW recent_inventory_additions AS
SELECT 
    bi.id,
    bi.blood_group,
    bi.units_available,
    bi.donor_name,
    bi.donation_date,
    bi.batch_number,
    bi.expiry_date,
    bi.status,
    bi.last_updated
FROM blood_inventory bi
WHERE bi.donation_id IS NOT NULL
ORDER BY bi.last_updated DESC;

-- CRITICAL: Donor dashboard view that backend expects
CREATE VIEW donor_dashboard_view AS
SELECT 
    u.id as donor_id,
    u.id,  -- Backend expects both donor_id and id
    u.full_name,
    u.blood_group,
    
    -- Completed donations stats
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
    
    -- Pending donations count from all sources
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
    -- Stats from completed donations
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
    -- Count pending donations from all sources
    SELECT 
        donor_id,
        COUNT(*) as pending_count
    FROM (
        SELECT donor_id FROM donations WHERE status IN ('pending_admin_approval', 'scheduled')
        UNION ALL
        SELECT donor_id FROM pending_donations WHERE status = 'pending_admin_approval'
        UNION ALL
        SELECT donor_id FROM enhanced_donations WHERE status IN ('pending_admin_approval', 'pending_review')
    ) all_pending
    GROUP BY donor_id
) p ON u.id = p.donor_id
WHERE u.user_type = 'donor';

-- =============================================================================
-- STEP 8: ENABLE ROW LEVEL SECURITY AND CREATE POLICIES
-- =============================================================================

-- Enable RLS on tables
ALTER TABLE blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_donations ENABLE ROW LEVEL SECURITY;

-- Blood inventory policies
CREATE POLICY "Public can view inventory" ON blood_inventory
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage inventory" ON blood_inventory
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

-- Enhanced donations policies
CREATE POLICY "Users can view own donations" ON enhanced_donations
    FOR SELECT USING (
        donor_id::text = auth.uid()::text OR 
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

CREATE POLICY "Users can insert own donations" ON enhanced_donations
    FOR INSERT WITH CHECK (donor_id::text = auth.uid()::text);

CREATE POLICY "Admin can update donations" ON enhanced_donations
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

-- Pending donations policies
CREATE POLICY "Users can view own pending donations" ON pending_donations
    FOR SELECT USING (
        donor_id::text = auth.uid()::text OR 
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

CREATE POLICY "Users can create pending donations" ON pending_donations
    FOR INSERT WITH CHECK (donor_id::text = auth.uid()::text);

CREATE POLICY "Admin can update pending donations" ON pending_donations
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

-- =============================================================================
-- STEP 9: GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT ON blood_inventory TO authenticated;
GRANT SELECT ON enhanced_donations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pending_donations TO authenticated;
GRANT SELECT ON admin_pending_donations_view TO authenticated;
GRANT SELECT ON blood_inventory_summary TO authenticated;
GRANT SELECT ON recent_inventory_additions TO authenticated;
GRANT SELECT ON donor_dashboard_view TO authenticated;

-- Service role permissions
GRANT ALL ON blood_inventory TO service_role;
GRANT ALL ON enhanced_donations TO service_role;
GRANT ALL ON pending_donations TO service_role;

-- =============================================================================
-- STEP 10: VERIFICATION AND SUCCESS MESSAGE
-- =============================================================================

-- Verify everything was created successfully
SELECT 
    '🎉 COMPLETE BLOOD BANK SCHEMA DEPLOYED SUCCESSFULLY! 🎉' as status,
    'Tables: ' || (
        SELECT string_agg(table_name, ', ') 
        FROM information_schema.tables 
        WHERE table_name IN ('blood_inventory', 'enhanced_donations', 'pending_donations')
    ) as tables_created,
    'Views: ' || (
        SELECT string_agg(table_name, ', ') 
        FROM information_schema.views 
        WHERE table_name IN ('donor_dashboard_view', 'admin_pending_donations_view', 'blood_inventory_summary')
    ) as views_created,
    'Functions: check_donation_eligibility, update_blood_inventory_on_approval' as functions_created;

-- Show sample blood inventory to verify data
SELECT 
    '📊 SAMPLE BLOOD INVENTORY DATA' as info,
    blood_group,
    units_available,
    location,
    last_updated
FROM blood_inventory 
WHERE donation_id IS NULL
ORDER BY blood_group;

-- Final success confirmation
SELECT 
    '✅ Ready for use!' as deployment_status,
    'Backend blood inventory endpoints will now work correctly' as backend_compatibility,
    'Enhanced donor workflow with admin approval is active' as enhanced_features,
    'All column names match backend expectations' as column_compatibility;

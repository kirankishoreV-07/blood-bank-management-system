-- ENHANCED BLOOD BANK SCHEMA FOR DEPLOYMENT
-- This version handles existing policies and functions gracefully

-- Step 1: Clean drop of all existing objects
DO $$ 
BEGIN
    -- Drop triggers if they exist
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_update_inventory_on_approval') THEN
        DROP TRIGGER trigger_update_inventory_on_approval ON enhanced_donations;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_enhanced_donations_updated_at') THEN
        DROP TRIGGER update_enhanced_donations_updated_at ON enhanced_donations;
    END IF;
END $$;

-- Drop views and functions
DROP VIEW IF EXISTS recent_inventory_additions CASCADE;
DROP VIEW IF EXISTS blood_inventory_summary CASCADE;
DROP VIEW IF EXISTS donor_dashboard_view CASCADE;
DROP FUNCTION IF EXISTS check_donation_eligibility(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_blood_inventory_on_approval() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop tables completely (this will drop all policies automatically)
DROP TABLE IF EXISTS donation_requests CASCADE;
DROP TABLE IF EXISTS enhanced_donations CASCADE;
DROP TABLE IF EXISTS blood_inventory CASCADE;

-- Create blood inventory table first (no foreign keys initially)
CREATE TABLE blood_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blood_group VARCHAR(5) NOT NULL,  -- Changed from blood_type to blood_group for consistency
    units_available INTEGER DEFAULT 0,
    units_reserved INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    updated_by UUID,
    -- Additional fields for tracking individual donations
    donation_id UUID, -- No foreign key constraint initially
    donor_id UUID,
    donor_name VARCHAR(255),
    donation_date DATE,
    batch_number VARCHAR(50),
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'available',
    location VARCHAR(255) DEFAULT 'Main Blood Bank',
    notes TEXT
);

-- Create enhanced blood donations table
CREATE TABLE enhanced_donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_id UUID NOT NULL,
    donation_date DATE NOT NULL,
    blood_type VARCHAR(5), -- Made optional since it can be derived from donor profile
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

-- Create donation requests tracking table
CREATE TABLE donation_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_id UUID NOT NULL,
    request_data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_admin_approval',
    risk_score DECIMAL(5,2) DEFAULT 0.00,
    eligibility_status VARCHAR(50) DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    admin_notes TEXT
);

-- Create indexes and constraints
CREATE INDEX idx_enhanced_donations_donor_id ON enhanced_donations(donor_id);
CREATE INDEX idx_enhanced_donations_status ON enhanced_donations(status);
CREATE INDEX idx_enhanced_donations_date ON enhanced_donations(donation_date);
CREATE INDEX idx_donation_requests_donor_id ON donation_requests(donor_id);
CREATE INDEX idx_donation_requests_status ON donation_requests(status);
CREATE INDEX idx_blood_inventory_blood_group ON blood_inventory(blood_group);
CREATE INDEX idx_blood_inventory_donation_id ON blood_inventory(donation_id);

-- Create unique index for blood_group summary records
CREATE UNIQUE INDEX idx_blood_inventory_summary 
ON blood_inventory (blood_group) 
WHERE donation_id IS NULL;

-- Insert default blood types (summary records only)
INSERT INTO blood_inventory (blood_group, units_available, donation_id, donor_id, donor_name, location) 
VALUES 
    ('A+', 0, NULL, NULL, NULL, 'Main Blood Bank'), 
    ('A-', 0, NULL, NULL, NULL, 'Main Blood Bank'), 
    ('B+', 0, NULL, NULL, NULL, 'Main Blood Bank'), 
    ('B-', 0, NULL, NULL, NULL, 'Main Blood Bank'),
    ('AB+', 0, NULL, NULL, NULL, 'Main Blood Bank'), 
    ('AB-', 0, NULL, NULL, NULL, 'Main Blood Bank'), 
    ('O+', 0, NULL, NULL, NULL, 'Main Blood Bank'), 
    ('O-', 0, NULL, NULL, NULL, 'Main Blood Bank');

-- NOW CREATE FUNCTIONS (after tables exist)
-- Enhanced eligibility check function with pending donations validation
CREATE OR REPLACE FUNCTION check_donation_eligibility(p_donor_id UUID)
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
    -- Check for pending donations first
    SELECT COUNT(*) INTO pending_count
    FROM enhanced_donations 
    WHERE donor_id = p_donor_id 
    AND status IN ('pending_admin_approval', 'pending_review');
    
    -- Also check donation_requests table
    SELECT COUNT(*) + pending_count INTO pending_count
    FROM donation_requests 
    WHERE donor_id = p_donor_id 
    AND status IN ('pending_admin_approval', 'pending_review');
    
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
    
    -- Check last donation date from enhanced_donations
    SELECT MAX(donation_date) INTO last_donation_date
    FROM enhanced_donations 
    WHERE donor_id = p_donor_id 
    AND status IN ('approved', 'completed');
    
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

-- Enable RLS and create policies
ALTER TABLE enhanced_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_inventory ENABLE ROW LEVEL SECURITY;

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

-- Donation requests policies
CREATE POLICY "Users can view own requests" ON donation_requests
    FOR SELECT USING (
        donor_id::text = auth.uid()::text OR 
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

CREATE POLICY "Users can insert own requests" ON donation_requests
    FOR INSERT WITH CHECK (donor_id::text = auth.uid()::text);

CREATE POLICY "Admin can update requests" ON donation_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

-- Blood inventory policies
CREATE POLICY "Public can view inventory" ON blood_inventory
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage inventory" ON blood_inventory
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

-- Create function to automatically update blood inventory when donation is approved
CREATE OR REPLACE FUNCTION update_blood_inventory_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    donor_blood_type VARCHAR(5);
    donor_full_name VARCHAR(255);
    batch_num VARCHAR(50);
BEGIN
    -- Only update inventory when status changes to approved
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        
        -- Get blood type from donor's profile or from donor_blood_group field
        IF NEW.donor_blood_group IS NOT NULL AND NEW.donor_blood_group != '' THEN
            donor_blood_type := NEW.donor_blood_group;
        ELSE
            -- Fallback: get blood type from donor's profile (if users table exists)
            BEGIN
                SELECT blood_group INTO donor_blood_type
                FROM users 
                WHERE id = NEW.donor_id;
            EXCEPTION
                WHEN others THEN
                    -- If users table doesn't exist or other error, try medical_data
                    IF NEW.medical_data IS NOT NULL THEN
                        donor_blood_type := NEW.medical_data->>'bloodGroup';
                    END IF;
            END;
            
            -- If still no blood type found, try to extract from medical_data JSONB
            IF donor_blood_type IS NULL OR donor_blood_type = '' THEN
                IF NEW.medical_data IS NOT NULL THEN
                    donor_blood_type := NEW.medical_data->>'bloodGroup';
                END IF;
            END IF;
        END IF;
        
        -- Get donor's full name (with error handling)
        BEGIN
            SELECT full_name INTO donor_full_name
            FROM users 
            WHERE id = NEW.donor_id;
        EXCEPTION
            WHEN others THEN
                donor_full_name := 'Unknown Donor';
        END;
        
        -- Generate batch number
        batch_num := 'ENH-' || SUBSTRING(NEW.id::text, 1, 8);
        
        -- Ensure we have a valid blood type
        IF donor_blood_type IS NOT NULL AND donor_blood_type != '' THEN
            
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
                donor_blood_type,
                NEW.units_donated,
                NEW.id,
                NEW.donor_id,
                donor_full_name,
                NEW.donation_date,
                batch_num,
                NEW.donation_date + INTERVAL '42 days', -- Blood expires after 42 days
                'available',
                COALESCE(NEW.donation_center, 'Main Blood Bank'),
                'Approved enhanced donation - Admin approved on ' || NOW()::date,
                NEW.admin_approved_by,
                NOW()
            );
            
            -- 2. Update the summary record (where donation_id IS NULL)
            UPDATE blood_inventory 
            SET 
                units_available = units_available + NEW.units_donated,
                last_updated = NOW(),
                updated_by = NEW.admin_approved_by
            WHERE blood_group = donor_blood_type 
            AND donation_id IS NULL;
            
            -- If summary record doesn't exist, create it
            IF NOT FOUND THEN
                INSERT INTO blood_inventory (
                    blood_group, 
                    units_available, 
                    updated_by, 
                    donation_id, 
                    donor_id, 
                    donor_name, 
                    location
                )
                VALUES (
                    donor_blood_type, 
                    NEW.units_donated, 
                    NEW.admin_approved_by, 
                    NULL, 
                    NULL, 
                    NULL, 
                    'Main Blood Bank'
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_inventory_on_approval
    AFTER UPDATE OF status ON enhanced_donations
    FOR EACH ROW
    EXECUTE FUNCTION update_blood_inventory_on_approval();

CREATE TRIGGER update_enhanced_donations_updated_at
    BEFORE UPDATE ON enhanced_donations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create helpful views for admin dashboard
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
    bi.last_updated,
    ed.id as donation_id,
    ed.admin_approval_date
FROM blood_inventory bi
LEFT JOIN enhanced_donations ed ON bi.donation_id = ed.id
WHERE bi.donation_id IS NOT NULL  -- Only individual donation records
ORDER BY bi.last_updated DESC;

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

-- Create donor dashboard view (expected by backend)
CREATE VIEW donor_dashboard_view AS
SELECT 
    u.id as donor_id,
    u.full_name,
    u.blood_group,
    
    -- Completed donations stats from enhanced_donations
    COALESCE(completed_stats.total_donations, 0) as total_donations,
    COALESCE(completed_stats.total_units, 0) as total_units,
    completed_stats.last_donation_date,
    completed_stats.next_eligible_date,
    
    -- Pending donations count
    COALESCE(pending_stats.pending_count, 0) as pending_approvals,
    
    -- Risk assessment from latest submission
    COALESCE(latest_risk.risk_score, 0) as latest_risk_score,
    COALESCE(latest_risk.eligibility_status, 'eligible') as eligibility_status,
    
    -- Buffer period eligibility using the function
    eligibility_check.is_eligible as can_donate_now,
    eligibility_check.days_since_last_donation as days_until_eligible,
    eligibility_check.reason as eligibility_reason,
    eligibility_check.pending_donations_count
    
FROM users u
LEFT JOIN (
    -- Stats from enhanced_donations (approved/completed only)
    SELECT 
        donor_id,
        COUNT(*) as total_donations,
        SUM(units_donated) as total_units,
        MAX(donation_date) as last_donation_date,
        MAX(donation_date) + INTERVAL '56 days' as next_eligible_date
    FROM enhanced_donations 
    WHERE status IN ('approved', 'completed')
    GROUP BY donor_id
) completed_stats ON u.id = completed_stats.donor_id
LEFT JOIN (
    -- Pending donations count
    SELECT 
        donor_id,
        COUNT(*) as pending_count
    FROM enhanced_donations 
    WHERE status IN ('pending_admin_approval', 'pending_review')
    GROUP BY donor_id
) pending_stats ON u.id = pending_stats.donor_id
LEFT JOIN (
    -- Latest risk assessment
    SELECT DISTINCT ON (donor_id)
        donor_id,
        risk_score,
        eligibility_status
    FROM enhanced_donations
    ORDER BY donor_id, submitted_at DESC
) latest_risk ON u.id = latest_risk.donor_id
LEFT JOIN LATERAL (
    -- Use our eligibility check function
    SELECT * FROM check_donation_eligibility(u.id)
) eligibility_check ON true
WHERE u.user_type = 'donor';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON enhanced_donations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON donation_requests TO authenticated;
GRANT SELECT ON blood_inventory TO authenticated;
GRANT SELECT ON recent_inventory_additions TO authenticated;
GRANT SELECT ON blood_inventory_summary TO authenticated;
GRANT SELECT ON donor_dashboard_view TO authenticated;
GRANT ALL ON blood_inventory TO service_role;

-- Success message
SELECT 'Enhanced Blood Bank Schema deployed successfully! 🎉' as deployment_status;

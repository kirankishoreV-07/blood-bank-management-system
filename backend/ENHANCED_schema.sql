-- ENHANCED Blood Bank Database Schema with Pending Donations Support
-- This schema supports the admin approval workflow and risk score validation

-- Add pending_donations table for admin approval workflow
CREATE TABLE IF NOT EXISTS pending_donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic donation information
    donation_date DATE NOT NULL,
    units_donated INTEGER CHECK (units_donated > 0) NOT NULL,
    donation_center VARCHAR(255) NOT NULL,
    notes TEXT,
    
    -- Medical and eligibility data
    basic_info JSONB NOT NULL, -- age, weight, lastDonationDate, bloodGroup, emergencyContact
    medical_data JSONB NOT NULL, -- bloodPressure, hemoglobin, heartRate, temperature, etc.
    health_conditions JSONB NOT NULL, -- recentIllness, chronicConditions, medications, allergies
    
    -- Risk assessment
    risk_score DECIMAL(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_flags JSONB, -- Array of risk flags
    eligibility_status VARCHAR(20) CHECK (eligibility_status IN ('eligible', 'ineligible', 'requires_review')) DEFAULT 'eligible',
    
    -- Documents
    uploaded_documents JSONB, -- selfie, government_id, medical_reports
    document_verification_status VARCHAR(20) CHECK (document_verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
    
    -- AI and professional assessments
    ai_verification JSONB, -- AI analysis results
    professional_assessment JSONB, -- Doctor/nurse approval
    
    -- Admin approval workflow
    status VARCHAR(30) CHECK (status IN ('pending_admin_approval', 'approved', 'rejected')) DEFAULT 'pending_admin_approval',
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_donations_donor_id ON pending_donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_pending_donations_status ON pending_donations(status);
CREATE INDEX IF NOT EXISTS idx_pending_donations_admin_id ON pending_donations(admin_id);
CREATE INDEX IF NOT EXISTS idx_pending_donations_risk_score ON pending_donations(risk_score);
CREATE INDEX IF NOT EXISTS idx_pending_donations_eligibility ON pending_donations(eligibility_status);

-- Update the donations table to link with pending_donations
ALTER TABLE donations ADD COLUMN IF NOT EXISTS pending_donation_id UUID REFERENCES pending_donations(id) ON DELETE SET NULL;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS eligibility_check_passed BOOLEAN DEFAULT true;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for pending_donations
DROP TRIGGER IF EXISTS update_pending_donations_updated_at ON pending_donations;
CREATE TRIGGER update_pending_donations_updated_at 
    BEFORE UPDATE ON pending_donations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for pending_donations
ALTER TABLE pending_donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pending_donations
DROP POLICY IF EXISTS "Donors can view their own pending donations" ON pending_donations;
CREATE POLICY "Donors can view their own pending donations" ON pending_donations
    FOR SELECT USING (donor_id = auth.uid()::uuid);

DROP POLICY IF EXISTS "Donors can create pending donations" ON pending_donations;
CREATE POLICY "Donors can create pending donations" ON pending_donations
    FOR INSERT WITH CHECK (donor_id = auth.uid()::uuid);

DROP POLICY IF EXISTS "Admins can view all pending donations" ON pending_donations;
CREATE POLICY "Admins can view all pending donations" ON pending_donations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND user_type = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update pending donations" ON pending_donations;
CREATE POLICY "Admins can update pending donations" ON pending_donations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND user_type = 'admin'
        )
    );

-- Update blood_inventory to track approved donations
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS pending_donation_id UUID REFERENCES pending_donations(id) ON DELETE SET NULL;
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS donation_id UUID REFERENCES donations(id) ON DELETE SET NULL;
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS donor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS donor_name VARCHAR(255);
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS donation_date DATE;
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS collected_date DATE;
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'available';
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create a function to automatically update blood inventory when donation is approved
CREATE OR REPLACE FUNCTION update_inventory_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    donation_record_id UUID;
BEGIN
    -- Only process if status changed to 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Create actual donation record first
        INSERT INTO donations (
            donor_id,
            donation_date,
            units_donated,
            donation_center,
            notes,
            status,
            admin_approved,
            admin_id,
            admin_notes,
            approved_at,
            pending_donation_id,
            risk_score,
            eligibility_check_passed
        ) VALUES (
            NEW.donor_id,
            NEW.donation_date,
            NEW.units_donated,
            NEW.donation_center,
            NEW.notes,
            'completed',
            true,
            NEW.admin_id,
            NEW.admin_notes,
            NEW.admin_decision_date,
            NEW.id,
            NEW.risk_score,
            CASE WHEN NEW.risk_score <= 60 THEN true ELSE false END
        ) RETURNING id INTO donation_record_id;
        
        -- Then insert into blood_inventory with the donation_id
        INSERT INTO blood_inventory (
            blood_group,
            units_available,
            location,
            donation_id,
            donor_id,
            donor_name,
            donation_date,
            batch_number,
            collected_date,
            status,
            notes,
            pending_donation_id,
            approval_date,
            expiry_date
        )
        SELECT 
            (NEW.basic_info->>'bloodGroup')::VARCHAR(5),
            NEW.units_donated,
            NEW.donation_center,
            donation_record_id,
            NEW.donor_id,
            u.full_name,
            NEW.donation_date,
            'PD-' || SUBSTRING(NEW.id::text, 1, 8),
            NEW.donation_date,
            'available',
            'Approved donation from pending queue',
            NEW.id,
            NOW(),
            NEW.donation_date + INTERVAL '42 days' -- Blood expires after 42 days
        FROM users u
        WHERE u.id = NEW.donor_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic inventory update
DROP TRIGGER IF EXISTS trigger_update_inventory_on_approval ON pending_donations;
CREATE TRIGGER trigger_update_inventory_on_approval
    AFTER UPDATE ON pending_donations
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_approval();

-- Create view for admin dashboard pending donations
CREATE OR REPLACE VIEW admin_pending_donations_view AS
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
    pd.risk_flags,
    pd.ai_verification,
    pd.professional_assessment,
    pd.document_verification_status,
    pd.uploaded_documents
FROM pending_donations pd
JOIN users u ON pd.donor_id = u.id
WHERE pd.status = 'pending_admin_approval'
ORDER BY pd.submitted_at ASC;

-- Function to check donation eligibility (buffer period validation + pending check)
CREATE OR REPLACE FUNCTION check_donation_eligibility(donor_uuid UUID)
RETURNS TABLE (
    is_eligible BOOLEAN,
    last_donation_date DATE,
    next_eligible_date DATE,
    days_remaining INTEGER,
    reason TEXT,
    pending_donations_count INTEGER
) AS $$
DECLARE
    last_approved_donation_date DATE;
    days_since_last INTEGER;
    buffer_period_days INTEGER := 56; -- 56 days buffer period
    pending_count INTEGER := 0;
BEGIN
    -- Check for pending donations first
    SELECT COUNT(*) INTO pending_count
    FROM pending_donations pd
    WHERE pd.donor_id = donor_uuid 
    AND pd.status = 'pending_admin_approval';
    
    -- If there are pending donations, donor cannot submit new ones
    IF pending_count > 0 THEN
        RETURN QUERY SELECT 
            false::BOOLEAN,
            NULL::DATE,
            NULL::DATE,
            0::INTEGER,
            format('You have %s pending donation%s awaiting admin approval. Please wait for approval before submitting new requests.', 
                   pending_count, 
                   CASE WHEN pending_count > 1 THEN 's' ELSE '' END)::TEXT,
            pending_count::INTEGER;
        RETURN;
    END IF;
    
    -- Get the most recent completed donation date for this donor
    SELECT MAX(d.donation_date) INTO last_approved_donation_date
    FROM donations d
    WHERE d.donor_id = donor_uuid 
    AND d.status = 'completed' 
    AND d.admin_approved = true;
    
    -- If no previous donations found, donor is eligible
    IF last_approved_donation_date IS NULL THEN
        RETURN QUERY SELECT 
            true::BOOLEAN,
            NULL::DATE,
            CURRENT_DATE::DATE,
            0::INTEGER,
            'First time donor - eligible to donate'::TEXT,
            pending_count::INTEGER;
        RETURN;
    END IF;
    
    -- Calculate days since last donation
    days_since_last := CURRENT_DATE - last_approved_donation_date;
    
    -- Check if buffer period has passed
    IF days_since_last >= buffer_period_days THEN
        RETURN QUERY SELECT 
            true::BOOLEAN,
            last_approved_donation_date,
            last_approved_donation_date + INTERVAL '56 days',
            0::INTEGER,
            'Buffer period completed - eligible to donate'::TEXT,
            pending_count::INTEGER;
    ELSE
        RETURN QUERY SELECT 
            false::BOOLEAN,
            last_approved_donation_date,
            (last_approved_donation_date + INTERVAL '56 days')::DATE,
            (buffer_period_days - days_since_last)::INTEGER,
            format('Buffer period active - must wait %s more days until %s', 
                   buffer_period_days - days_since_last,
                   (last_approved_donation_date + INTERVAL '56 days')::DATE)::TEXT,
            pending_count::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for donor dashboard
CREATE OR REPLACE VIEW donor_dashboard_view AS
SELECT 
    u.id as donor_id,
    u.full_name,
    u.blood_group,
    
    -- Completed donations stats
    COALESCE(completed_stats.total_donations, 0) as total_donations,
    COALESCE(completed_stats.total_units, 0) as total_units,
    completed_stats.last_donation_date,
    completed_stats.next_eligible_date,
    
    -- Pending donations count
    COALESCE(pending_stats.pending_count, 0) as pending_approvals,
    
    -- Risk assessment
    COALESCE(latest_risk.risk_score, 0) as latest_risk_score,
    COALESCE(latest_risk.eligibility_status, 'eligible') as eligibility_status,
    
    -- Buffer period eligibility
    eligibility_check.is_eligible as can_donate_now,
    eligibility_check.days_remaining as days_until_eligible,
    eligibility_check.reason as eligibility_reason
    
FROM users u
LEFT JOIN (
    SELECT 
        donor_id,
        COUNT(*) as total_donations,
        SUM(units_donated) as total_units,
        MAX(donation_date) as last_donation_date,
        MAX(donation_date) + INTERVAL '56 days' as next_eligible_date
    FROM donations 
    WHERE status = 'completed' AND admin_approved = true
    GROUP BY donor_id
) completed_stats ON u.id = completed_stats.donor_id
LEFT JOIN (
    SELECT 
        donor_id,
        COUNT(*) as pending_count
    FROM pending_donations 
    WHERE status = 'pending_admin_approval'
    GROUP BY donor_id
) pending_stats ON u.id = pending_stats.donor_id
LEFT JOIN (
    SELECT DISTINCT ON (donor_id)
        donor_id,
        risk_score,
        eligibility_status
    FROM pending_donations
    ORDER BY donor_id, submitted_at DESC
) latest_risk ON u.id = latest_risk.donor_id
LEFT JOIN LATERAL (
    SELECT * FROM check_donation_eligibility(u.id)
) eligibility_check ON true
WHERE u.user_type = 'donor';

-- Sample data for testing (optional)
-- Insert a test pending donation (you can remove this in production)
-- This is just for demonstration purposes
/*
INSERT INTO pending_donations (
    donor_id,
    donation_date,
    units_donated,
    donation_center,
    basic_info,
    medical_data,
    health_conditions,
    risk_score,
    eligibility_status,
    notes
) 
SELECT 
    id,
    CURRENT_DATE,
    1,
    'Test Blood Center',
    '{"age": 25, "weight": 70, "bloodGroup": "O+"}',
    '{"bloodPressure": {"systolic": 120, "diastolic": 80}, "hemoglobin": 14.5}',
    '{"recentIllness": false, "chronicConditions": false}',
    25.5,
    'eligible',
    'Test pending donation for admin approval'
FROM users 
WHERE user_type = 'donor' 
LIMIT 1;
*/

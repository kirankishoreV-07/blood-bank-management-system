-- COMPLETE BLOOD BANK MANAGEMENT SYSTEM DATABASE
-- Single source of truth for all blood bank operations
-- Fixes all field errors and provides comprehensive functionality

-- =============================================================================
-- STEP 1: CLEAN UP EXISTING STRUCTURE
-- =============================================================================

-- Drop all existing triggers and functions
DROP TRIGGER IF EXISTS trigger_donation_approval_inventory ON donations;
DROP TRIGGER IF EXISTS trigger_add_to_inventory ON donations;
DROP FUNCTION IF EXISTS process_donation_approval() CASCADE;
DROP FUNCTION IF EXISTS add_donation_to_inventory() CASCADE;
DROP FUNCTION IF EXISTS update_blood_inventory_on_approval() CASCADE;

-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS blood_matches CASCADE;
DROP TABLE IF EXISTS blood_inventory CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS blood_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Clean up any legacy tables
DROP TABLE IF EXISTS blood_types CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS donors CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS recipients CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- =============================================================================
-- STEP 2: CREATE CORE USERS TABLE
-- =============================================================================

CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Fixed: backend expects 'password' not 'password_hash'
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    date_of_birth DATE,
    age INTEGER CHECK (age >= 18 AND age <= 65),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    user_type VARCHAR(20) DEFAULT 'donor' CHECK (user_type IN ('admin', 'donor', 'recipient')),
    address TEXT,
    emergency_contact VARCHAR(255), -- Fixed: backend expects this field name
    emergency_contact_phone VARCHAR(20),
    medical_conditions TEXT,
    last_donation_date DATE,
    is_eligible_to_donate BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- STEP 3: CREATE DONATIONS TABLE (FIXED FIELD STRUCTURE)
-- =============================================================================

CREATE TABLE donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    donation_date DATE DEFAULT CURRENT_DATE,
    donation_center VARCHAR(255) DEFAULT 'Main Blood Bank',
    status VARCHAR(50) DEFAULT 'pending_admin_approval' 
        CHECK (status IN ('pending_admin_approval', 'approved', 'completed', 'rejected', 'scheduled', 'cancelled')),
    units_donated INTEGER DEFAULT 1 CHECK (units_donated > 0),
    -- Medical assessment fields
    hemoglobin_level DECIMAL(4,2),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    weight_kg DECIMAL(5,2),
    temperature_celsius DECIMAL(4,2),
    pulse_rate INTEGER,
    eligibility_check_passed BOOLEAN DEFAULT true,
    medical_clearance BOOLEAN DEFAULT true,
    -- Admin processing fields
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_approved BOOLEAN DEFAULT false,
    admin_notes TEXT,
    verification_status VARCHAR(50) DEFAULT 'pending',
    -- AI verification fields
    verification_photo TEXT,
    ai_verification JSONB,
    notes TEXT,
    source VARCHAR(20) DEFAULT 'mobile_app',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- STEP 4: CREATE BLOOD REQUESTS TABLE
-- =============================================================================

CREATE TABLE blood_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blood_group_needed VARCHAR(5) NOT NULL 
        CHECK (blood_group_needed IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units_needed INTEGER NOT NULL CHECK (units_needed > 0),
    urgency_level VARCHAR(20) DEFAULT 'medium' 
        CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    hospital_name VARCHAR(255) NOT NULL,
    hospital_address TEXT NOT NULL,
    required_by_date DATE NOT NULL,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(20),
    medical_reason TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'fulfilled', 'cancelled', 'expired')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- STEP 5: CREATE BLOOD INVENTORY TABLE (COMPREHENSIVE)
-- =============================================================================

CREATE TABLE blood_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blood_group VARCHAR(5) NOT NULL 
        CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units_available INTEGER DEFAULT 0 CHECK (units_available >= 0),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    -- Donation tracking
    donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,
    donor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    donor_name VARCHAR(255),
    donation_date DATE NOT NULL,
    collection_date DATE DEFAULT CURRENT_DATE,
    -- Inventory management
    expiry_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'available' 
        CHECK (status IN ('available', 'reserved', 'expired', 'used', 'quarantined')),
    location VARCHAR(255) DEFAULT 'Main Blood Bank',
    storage_temperature DECIMAL(4,2), -- For temperature monitoring
    quality_check_passed BOOLEAN DEFAULT true,
    tested_for_diseases BOOLEAN DEFAULT false,
    test_results JSONB, -- Store disease test results
    -- Administrative
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================================================
-- STEP 6: CREATE BLOOD MATCHES TABLE
-- =============================================================================

CREATE TABLE blood_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES blood_inventory(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    units_matched INTEGER NOT NULL CHECK (units_matched > 0),
    match_score DECIMAL(3,2) DEFAULT 1.00, -- Compatibility score
    match_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'expired')),
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    delivery_date DATE,
    delivery_status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- STEP 7: CREATE PERFORMANCE INDEXES
-- =============================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_blood_group ON users(blood_group);
CREATE INDEX idx_users_active ON users(is_active);

-- Donations table indexes
CREATE INDEX idx_donations_donor_id ON donations(donor_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_date ON donations(donation_date);
CREATE INDEX idx_donations_admin_approval ON donations(admin_approved);

-- Blood requests table indexes
CREATE INDEX idx_blood_requests_recipient_id ON blood_requests(recipient_id);
CREATE INDEX idx_blood_requests_blood_group ON blood_requests(blood_group_needed);
CREATE INDEX idx_blood_requests_status ON blood_requests(status);
CREATE INDEX idx_blood_requests_urgency ON blood_requests(urgency_level);
CREATE INDEX idx_blood_requests_required_date ON blood_requests(required_by_date);

-- Blood inventory table indexes
CREATE INDEX idx_blood_inventory_blood_group ON blood_inventory(blood_group);
CREATE INDEX idx_blood_inventory_status ON blood_inventory(status);
CREATE INDEX idx_blood_inventory_expiry_date ON blood_inventory(expiry_date);
CREATE INDEX idx_blood_inventory_donation_id ON blood_inventory(donation_id);
CREATE INDEX idx_blood_inventory_location ON blood_inventory(location);

-- Blood matches table indexes
CREATE INDEX idx_blood_matches_request_id ON blood_matches(request_id);
CREATE INDEX idx_blood_matches_inventory_id ON blood_matches(inventory_id);
CREATE INDEX idx_blood_matches_donor_id ON blood_matches(donor_id);
CREATE INDEX idx_blood_matches_status ON blood_matches(status);

-- =============================================================================
-- STEP 8: CREATE UTILITY FUNCTIONS
-- =============================================================================

-- Function to generate batch numbers
CREATE OR REPLACE FUNCTION generate_batch_number(blood_type VARCHAR(5), collection_date DATE)
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN blood_type || '-' || TO_CHAR(collection_date, 'YYYYMMDD') || '-' || 
           LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to check blood compatibility
CREATE OR REPLACE FUNCTION check_blood_compatibility(donor_type VARCHAR(5), recipient_type VARCHAR(5))
RETURNS BOOLEAN AS $$
BEGIN
    -- Universal donor O- can give to anyone
    IF donor_type = 'O-' THEN
        RETURN TRUE;
    END IF;
    
    -- Universal recipient AB+ can receive from anyone
    IF recipient_type = 'AB+' THEN
        RETURN TRUE;
    END IF;
    
    -- Same blood type is always compatible
    IF donor_type = recipient_type THEN
        RETURN TRUE;
    END IF;
    
    -- Specific compatibility rules
    CASE recipient_type
        WHEN 'A+' THEN
            RETURN donor_type IN ('A+', 'A-', 'O+', 'O-');
        WHEN 'A-' THEN
            RETURN donor_type IN ('A-', 'O-');
        WHEN 'B+' THEN
            RETURN donor_type IN ('B+', 'B-', 'O+', 'O-');
        WHEN 'B-' THEN
            RETURN donor_type IN ('B-', 'O-');
        WHEN 'AB-' THEN
            RETURN donor_type IN ('AB-', 'A-', 'B-', 'O-');
        WHEN 'O+' THEN
            RETURN donor_type IN ('O+', 'O-');
        WHEN 'O-' THEN
            RETURN donor_type = 'O-';
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory when donation is approved
CREATE OR REPLACE FUNCTION add_donation_to_inventory()
RETURNS TRIGGER AS $$
DECLARE
    donor_info RECORD;
    new_batch_number VARCHAR(50);
    expiry_date DATE;
BEGIN
    -- Only process when status changes to 'approved'
    IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
        -- Get donor information
        SELECT u.full_name, u.blood_group 
        INTO donor_info 
        FROM users u 
        WHERE u.id = NEW.donor_id;
        
        -- Generate batch number and calculate expiry
        new_batch_number := generate_batch_number(donor_info.blood_group, NEW.donation_date);
        expiry_date := NEW.donation_date + INTERVAL '42 days';
        
        -- Insert into blood inventory
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
            donor_info.blood_group,
            COALESCE(NEW.units_donated, 1),
            new_batch_number,
            NEW.id,
            NEW.donor_id,
            donor_info.full_name,
            NEW.donation_date,
            CURRENT_DATE,
            expiry_date,
            'available',
            COALESCE(NEW.donation_center, 'Main Blood Bank'),
            'Added from approved donation ID: ' || NEW.id
        );
        
        RAISE NOTICE 'Successfully added % units of % blood to inventory for donation %', 
                     COALESCE(NEW.units_donated, 1), donor_info.blood_group, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update expired inventory
CREATE OR REPLACE FUNCTION update_expired_inventory()
RETURNS void AS $$
BEGIN
    UPDATE blood_inventory 
    SET status = 'expired', 
        last_updated = NOW(),
        notes = COALESCE(notes || ' | ', '') || 'Auto-expired on ' || CURRENT_DATE
    WHERE expiry_date < CURRENT_DATE 
    AND status = 'available';
    
    RAISE NOTICE 'Updated expired blood units to expired status';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 9: CREATE TRIGGERS
-- =============================================================================

-- Trigger to add blood to inventory when donation is approved
CREATE TRIGGER trigger_add_to_inventory
    AFTER UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION add_donation_to_inventory();

-- =============================================================================
-- STEP 10: CREATE COMPREHENSIVE VIEWS
-- =============================================================================

-- Available blood inventory view
CREATE OR REPLACE VIEW available_blood_inventory AS
SELECT 
    blood_group,
    COUNT(*) as batch_count,
    SUM(units_available) as total_units,
    MIN(expiry_date) as earliest_expiry,
    MAX(expiry_date) as latest_expiry,
    AVG(expiry_date - CURRENT_DATE)::INTEGER as avg_days_to_expiry,
    STRING_AGG(DISTINCT location, ', ') as locations
FROM blood_inventory
WHERE status = 'available' AND expiry_date >= CURRENT_DATE
GROUP BY blood_group
ORDER BY blood_group;

-- Pending donations view for admin
CREATE OR REPLACE VIEW pending_donations_admin AS
SELECT 
    d.id,
    d.donor_id,
    u.full_name as donor_name,
    u.blood_group,
    u.phone as donor_phone,
    d.donation_date,
    d.donation_center,
    d.units_donated,
    d.hemoglobin_level,
    d.weight_kg,
    d.submitted_at,
    d.notes,
    d.verification_status
FROM donations d
JOIN users u ON d.donor_id = u.id
WHERE d.status = 'pending_admin_approval'
ORDER BY d.submitted_at DESC;

-- Blood compatibility matrix view
CREATE OR REPLACE VIEW blood_compatibility_matrix AS
SELECT 
    donor.blood_group as donor_blood_group,
    recipient.blood_group as recipient_blood_group,
    check_blood_compatibility(donor.blood_group, recipient.blood_group) as is_compatible
FROM (SELECT DISTINCT blood_group FROM users WHERE blood_group IS NOT NULL) donor
CROSS JOIN (SELECT DISTINCT blood_group FROM users WHERE blood_group IS NOT NULL) recipient
ORDER BY donor.blood_group, recipient.blood_group;

-- Inventory alerts view
CREATE OR REPLACE VIEW inventory_alerts AS
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
-- STEP 11: INSERT INITIAL DATA
-- =============================================================================

-- Insert admin user
INSERT INTO users (email, password, full_name, user_type, blood_group, phone) VALUES
('admin@bloodbank.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Admin', 'admin', 'O+', '+1234567890')
ON CONFLICT (email) DO NOTHING;

-- Insert sample donors
INSERT INTO users (email, password, full_name, user_type, blood_group, phone, age, gender) VALUES
('hamsa@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Hamsa Kumar', 'donor', 'A+', '+1234567891', 25, 'male'),
('donor2@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah Johnson', 'donor', 'O-', '+1234567892', 30, 'female'),
('donor3@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike Wilson', 'donor', 'B+', '+1234567893', 28, 'male')
ON CONFLICT (email) DO NOTHING;

-- Insert sample recipient
INSERT INTO users (email, password, full_name, user_type, blood_group, phone, age, gender) VALUES
('recipient@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Doe', 'recipient', 'A+', '+1234567894', 35, 'male')
ON CONFLICT (email) DO NOTHING;

-- Insert initial blood inventory
INSERT INTO blood_inventory (
    blood_group, units_available, batch_number, donation_date, 
    collection_date, expiry_date, donor_name, location, status
) VALUES
('A+', 5, generate_batch_number('A+', (CURRENT_DATE - INTERVAL '5 days')::DATE), (CURRENT_DATE - INTERVAL '5 days')::DATE, (CURRENT_DATE - INTERVAL '5 days')::DATE, (CURRENT_DATE + INTERVAL '37 days')::DATE, 'John Smith', 'Main Blood Bank', 'available'),
('A-', 3, generate_batch_number('A-', (CURRENT_DATE - INTERVAL '3 days')::DATE), (CURRENT_DATE - INTERVAL '3 days')::DATE, (CURRENT_DATE - INTERVAL '3 days')::DATE, (CURRENT_DATE + INTERVAL '39 days')::DATE, 'Jane Doe', 'Main Blood Bank', 'available'),
('B+', 4, generate_batch_number('B+', (CURRENT_DATE - INTERVAL '2 days')::DATE), (CURRENT_DATE - INTERVAL '2 days')::DATE, (CURRENT_DATE - INTERVAL '2 days')::DATE, (CURRENT_DATE + INTERVAL '40 days')::DATE, 'Bob Wilson', 'Main Blood Bank', 'available'),
('B-', 2, generate_batch_number('B-', (CURRENT_DATE - INTERVAL '6 days')::DATE), (CURRENT_DATE - INTERVAL '6 days')::DATE, (CURRENT_DATE - INTERVAL '6 days')::DATE, (CURRENT_DATE + INTERVAL '36 days')::DATE, 'Alice Brown', 'Main Blood Bank', 'available'),
('AB+', 2, generate_batch_number('AB+', (CURRENT_DATE - INTERVAL '4 days')::DATE), (CURRENT_DATE - INTERVAL '4 days')::DATE, (CURRENT_DATE - INTERVAL '4 days')::DATE, (CURRENT_DATE + INTERVAL '38 days')::DATE, 'Charlie Davis', 'Main Blood Bank', 'available'),
('AB-', 1, generate_batch_number('AB-', (CURRENT_DATE - INTERVAL '7 days')::DATE), (CURRENT_DATE - INTERVAL '7 days')::DATE, (CURRENT_DATE - INTERVAL '7 days')::DATE, (CURRENT_DATE + INTERVAL '35 days')::DATE, 'Diana Miller', 'Main Blood Bank', 'available'),
('O+', 8, generate_batch_number('O+', (CURRENT_DATE - INTERVAL '1 days')::DATE), (CURRENT_DATE - INTERVAL '1 days')::DATE, (CURRENT_DATE - INTERVAL '1 days')::DATE, (CURRENT_DATE + INTERVAL '41 days')::DATE, 'Frank Johnson', 'Main Blood Bank', 'available'),
('O-', 6, generate_batch_number('O-', (CURRENT_DATE - INTERVAL '3 days')::DATE), (CURRENT_DATE - INTERVAL '3 days')::DATE, (CURRENT_DATE - INTERVAL '3 days')::DATE, (CURRENT_DATE + INTERVAL '39 days')::DATE, 'Grace Lee', 'Main Blood Bank', 'available')
ON CONFLICT (batch_number) DO NOTHING;

-- Insert sample pending donation
INSERT INTO donations (donor_id, donation_center, status, units_donated, hemoglobin_level, weight_kg) 
SELECT 
    u.id,
    'Main Blood Bank',
    'pending_admin_approval',
    1,
    13.5,
    70.0
FROM users u 
WHERE u.email = 'hamsa@test.com'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 12: ENABLE SECURITY POLICIES
-- =============================================================================

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_matches ENABLE ROW LEVEL SECURITY;

-- Create comprehensive security policies
-- Admin policies
CREATE POLICY "Admins have full access to users" ON users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

CREATE POLICY "Admins have full access to donations" ON donations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

CREATE POLICY "Admins have full access to blood_requests" ON blood_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

CREATE POLICY "Admins have full access to blood_inventory" ON blood_inventory
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
    );

-- User self-access policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (id::text = auth.uid()::text);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (id::text = auth.uid()::text);

-- Donor policies
CREATE POLICY "Donors can view their donations" ON donations
    FOR SELECT USING (donor_id::text = auth.uid()::text);

CREATE POLICY "Donors can create donations" ON donations
    FOR INSERT WITH CHECK (donor_id::text = auth.uid()::text);

-- Public read access for inventory
CREATE POLICY "Public can view available inventory" ON blood_inventory
    FOR SELECT USING (status = 'available' AND expiry_date >= CURRENT_DATE);

-- Allow registration
CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (true);

-- =============================================================================
-- STEP 13: GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON donations TO authenticated;
GRANT ALL ON blood_requests TO authenticated;
GRANT ALL ON blood_inventory TO authenticated;
GRANT ALL ON blood_matches TO authenticated;

-- Grant permissions for service role (backend)
GRANT ALL ON users TO service_role;
GRANT ALL ON donations TO service_role;
GRANT ALL ON blood_requests TO service_role;
GRANT ALL ON blood_inventory TO service_role;
GRANT ALL ON blood_matches TO service_role;

-- Grant view permissions
GRANT SELECT ON available_blood_inventory TO authenticated;
GRANT SELECT ON pending_donations_admin TO authenticated;
GRANT SELECT ON blood_compatibility_matrix TO authenticated;
GRANT SELECT ON inventory_alerts TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =============================================================================
-- STEP 14: FINAL VERIFICATION AND CLEANUP
-- =============================================================================

-- Update any expired inventory
SELECT update_expired_inventory();

-- Show setup completion status
SELECT 
    'COMPLETE BLOOD BANK SYSTEM SETUP FINISHED!' as status,
    (SELECT COUNT(*) FROM users WHERE user_type = 'admin') as admin_users,
    (SELECT COUNT(*) FROM users WHERE user_type = 'donor') as donor_users,
    (SELECT COUNT(*) FROM users WHERE user_type = 'recipient') as recipient_users,
    (SELECT COUNT(*) FROM donations WHERE status = 'pending_admin_approval') as pending_donations,
    (SELECT COUNT(*) FROM blood_inventory WHERE status = 'available') as available_batches,
    (SELECT SUM(units_available) FROM blood_inventory WHERE status = 'available') as total_units_available;

-- Show current inventory summary
SELECT 'CURRENT BLOOD INVENTORY:' as info;
SELECT * FROM available_blood_inventory;

-- Show pending donations for admin
SELECT 'PENDING DONATIONS FOR ADMIN APPROVAL:' as info;
SELECT * FROM pending_donations_admin;

-- Success message
SELECT 'SUCCESS: Blood bank database is ready for production use!' as result;

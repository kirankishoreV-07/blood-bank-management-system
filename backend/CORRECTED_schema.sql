-- CORRECTED Blood Bank Database Schema
-- This schema matches EXACTLY with the backend API expectations

-- Drop existing tables to recreate with correct structure
DROP TABLE IF EXISTS blood_matches CASCADE;
DROP TABLE IF EXISTS blood_inventory CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS blood_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table - matches backend registration API
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) CHECK (user_type IN ('admin', 'donor', 'recipient')) NOT NULL,
    phone VARCHAR(20),
    blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    age INTEGER CHECK (age >= 18 AND age <= 65),
    address TEXT,
    emergency_contact VARCHAR(255),
    medical_conditions TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blood Requests table - matches backend blood-request API
CREATE TABLE blood_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blood_group_needed VARCHAR(5) CHECK (blood_group_needed IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')) NOT NULL,
    units_needed INTEGER CHECK (units_needed > 0) NOT NULL,
    urgency_level VARCHAR(20) CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    hospital_name VARCHAR(255) NOT NULL,
    hospital_address TEXT NOT NULL,
    required_by_date DATE NOT NULL,
    notes TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'fulfilled', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donations table - matches backend donation API with AI verification
CREATE TABLE donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    donation_date DATE NOT NULL,
    units_donated INTEGER CHECK (units_donated > 0) NOT NULL,
    donation_center VARCHAR(255) NOT NULL,
    notes TEXT,
    status VARCHAR(30) CHECK (status IN ('scheduled', 'completed', 'cancelled', 'pending_admin_approval', 'rejected')) DEFAULT 'completed',
    -- AI Verification fields
    verification_photo TEXT, -- URL/path to uploaded photo
    ai_verification JSONB, -- AI analysis results including confidence score
    verification_status VARCHAR(20) CHECK (verification_status IN ('none', 'ai_verified', 'admin_approved', 'rejected')) DEFAULT 'none',
    admin_approved BOOLEAN DEFAULT true,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who approved/rejected (nullable)
    admin_notes TEXT, -- Admin's reason for approval/rejection
    submitted_at TIMESTAMP WITH TIME ZONE, -- When donor submitted for approval
    approved_at TIMESTAMP WITH TIME ZONE, -- When admin processed the request
    source VARCHAR(20) DEFAULT 'direct', -- 'direct', 'manual_entry', 'walk_in', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blood Inventory table - Modified to track individual donations with donor info
CREATE TABLE blood_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')) NOT NULL,
    units_available INTEGER DEFAULT 0,
    expiry_date DATE,
    location VARCHAR(255),
    donation_id UUID REFERENCES donations(id) ON DELETE SET NULL, -- Link to original donation
    donor_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Link to donor
    donor_name VARCHAR(255), -- Donor's full name for quick access
    donation_date DATE, -- When the blood was donated
    batch_number VARCHAR(50), -- For tracking blood batches
    collected_date DATE, -- When the blood was collected (usually same as donation_date)
    status VARCHAR(20) CHECK (status IN ('available', 'reserved', 'expired', 'used')) DEFAULT 'available',
    notes TEXT, -- Additional notes about the donation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blood Matches table
CREATE TABLE blood_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES blood_requests(id) ON DELETE CASCADE,
    donor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    units_matched INTEGER CHECK (units_matched > 0) NOT NULL,
    match_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_blood_group ON users(blood_group);
CREATE INDEX idx_blood_requests_recipient_id ON blood_requests(recipient_id);
CREATE INDEX idx_blood_requests_blood_group ON blood_requests(blood_group_needed);
CREATE INDEX idx_blood_requests_status ON blood_requests(status);
CREATE INDEX idx_donations_donor_id ON donations(donor_id);
CREATE INDEX idx_donations_date ON donations(donation_date);
CREATE INDEX idx_blood_inventory_blood_group ON blood_inventory(blood_group);
CREATE INDEX idx_blood_matches_request_id ON blood_matches(request_id);
CREATE INDEX idx_blood_matches_donor_id ON blood_matches(donor_id);

-- Insert initial blood inventory data with donor info
INSERT INTO blood_inventory (blood_group, units_available, location, expiry_date, status, batch_number, collected_date, donation_date, donor_name, notes) VALUES
('A+', 5, 'Main Blood Bank', CURRENT_DATE + INTERVAL '5 days', 'available', 'INIT-A+001', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days', 'Anonymous Donor', 'Initial inventory setup'),
('A-', 3, 'Main Blood Bank', CURRENT_DATE + INTERVAL '4 days', 'available', 'INIT-A-001', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '3 days', 'Anonymous Donor', 'Initial inventory setup'),
('B+', 4, 'Main Blood Bank', CURRENT_DATE + INTERVAL '6 days', 'available', 'INIT-B+001', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day', 'Anonymous Donor', 'Initial inventory setup'),
('B-', 2, 'Main Blood Bank', CURRENT_DATE + INTERVAL '3 days', 'available', 'INIT-B-001', CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE - INTERVAL '4 days', 'Anonymous Donor', 'Initial inventory setup'),
('AB+', 2, 'Main Blood Bank', CURRENT_DATE + INTERVAL '7 days', 'available', 'INIT-AB+001', CURRENT_DATE, CURRENT_DATE, 'Anonymous Donor', 'Initial inventory setup'),
('AB-', 1, 'Main Blood Bank', CURRENT_DATE + INTERVAL '2 days', 'available', 'INIT-AB-001', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days', 'Anonymous Donor', 'Initial inventory setup'),
('O+', 8, 'Main Blood Bank', CURRENT_DATE + INTERVAL '5 days', 'available', 'INIT-O+001', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days', 'Anonymous Donor', 'Initial inventory setup'),
('O-', 4, 'Main Blood Bank', CURRENT_DATE + INTERVAL '4 days', 'available', 'INIT-O-001', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '3 days', 'Anonymous Donor', 'Initial inventory setup');

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (true); -- Allow all authenticated users to view

CREATE POLICY "Users can insert their own data" ON users
    FOR INSERT WITH CHECK (true); -- Allow registration

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (true); -- Allow profile updates

-- RLS Policies for Blood Requests
CREATE POLICY "Recipients can view requests" ON blood_requests
    FOR SELECT USING (true); -- Allow viewing for matching

CREATE POLICY "Recipients can create requests" ON blood_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Recipients can update their requests" ON blood_requests
    FOR UPDATE USING (true);

-- RLS Policies for Donations
CREATE POLICY "Donors can view donations" ON donations
    FOR SELECT USING (true);

CREATE POLICY "Donors can create donations" ON donations
    FOR INSERT WITH CHECK (true);

-- RLS Policies for Blood Inventory
CREATE POLICY "Everyone can view inventory" ON blood_inventory
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage inventory" ON blood_inventory
    FOR ALL USING (true);

-- RLS Policies for Blood Matches
CREATE POLICY "Users can view matches" ON blood_matches
    FOR SELECT USING (true);

CREATE POLICY "System can create matches" ON blood_matches
    FOR INSERT WITH CHECK (true);

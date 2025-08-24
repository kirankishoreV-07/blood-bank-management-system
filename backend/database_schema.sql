-- Blood Bank Management System Database Schema
-- Execute this SQL in your Supabase SQL Editor

-- Enable RLS (Row Level Security)
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) CHECK (user_type IN ('admin', 'donor', 'recipient')) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    age INTEGER CHECK (age >= 18 AND age <= 65),
    address TEXT,
    emergency_contact VARCHAR(255),
    medical_conditions TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Blood Requests table
CREATE TABLE IF NOT EXISTS blood_requests (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    donation_date DATE NOT NULL,
    units_donated INTEGER CHECK (units_donated > 0) NOT NULL,
    donation_center VARCHAR(255) NOT NULL,
    notes TEXT,
    status VARCHAR(20) CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Blood Inventory table (for tracking available blood units)
CREATE TABLE IF NOT EXISTS blood_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')) NOT NULL,
    units_available INTEGER DEFAULT 0,
    expiry_date DATE,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Blood Matching table (to track matches between donors and recipients)
CREATE TABLE IF NOT EXISTS blood_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES blood_requests(id) ON DELETE CASCADE,
    donor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    units_matched INTEGER CHECK (units_matched > 0) NOT NULL,
    match_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_blood_group ON users(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_recipient_id ON blood_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON blood_requests(blood_group_needed);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_blood_inventory_blood_group ON blood_inventory(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_matches_request_id ON blood_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_blood_matches_donor_id ON blood_matches(donor_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blood_requests_updated_at ON blood_requests;
CREATE TRIGGER update_blood_requests_updated_at BEFORE UPDATE ON blood_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_donations_updated_at ON donations;
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blood_inventory_updated_at ON blood_inventory;
CREATE TRIGGER update_blood_inventory_updated_at BEFORE UPDATE ON blood_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial blood inventory data
INSERT INTO blood_inventory (blood_group, units_available, location) VALUES
('A+', 10, 'Main Blood Bank'),
('A-', 5, 'Main Blood Bank'),
('B+', 8, 'Main Blood Bank'),
('B-', 3, 'Main Blood Bank'),
('AB+', 4, 'Main Blood Bank'),
('AB-', 2, 'Main Blood Bank'),
('O+', 15, 'Main Blood Bank'),
('O-', 7, 'Main Blood Bank')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND user_type = 'admin'
        )
    );

-- Blood requests policies  
CREATE POLICY "Recipients can view their own requests" ON blood_requests
    FOR SELECT USING (recipient_id::text = auth.uid()::text);

CREATE POLICY "Admins and donors can view all requests" ON blood_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND user_type IN ('admin', 'donor')
        )
    );

CREATE POLICY "Recipients can create requests" ON blood_requests
    FOR INSERT WITH CHECK (recipient_id::text = auth.uid()::text);

-- Donations policies
CREATE POLICY "Donors can view their own donations" ON donations
    FOR SELECT USING (donor_id::text = auth.uid()::text);

CREATE POLICY "Admins can view all donations" ON donations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND user_type = 'admin'
        )
    );

CREATE POLICY "Donors can create donations" ON donations
    FOR INSERT WITH CHECK (donor_id::text = auth.uid()::text);

-- Blood inventory policies
CREATE POLICY "Everyone can view inventory" ON blood_inventory
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage inventory" ON blood_inventory
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND user_type = 'admin'
        )
    );

-- Blood matches policies
CREATE POLICY "Users can view their matches" ON blood_matches
    FOR SELECT USING (
        donor_id::text = auth.uid()::text 
        OR EXISTS (
            SELECT 1 FROM blood_requests br 
            WHERE br.id = blood_matches.request_id 
            AND br.recipient_id::text = auth.uid()::text
        )
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND user_type = 'admin'
        )
    );

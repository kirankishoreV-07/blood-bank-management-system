
-- Insert test donor user
INSERT INTO users (email, password, full_name, user_type, phone, blood_group, age, address) 
VALUES (
    'testdonor@example.com',
    '$2b$10$XYZ123',
    'Test Donor',
    'donor',
    '+1234567890',
    'O+',
    28,
    '123 Test Street, Test City'
) ON CONFLICT (email) DO NOTHING;

-- Get the donor ID and insert sample donations
DO $$
DECLARE
    donor_uuid UUID;
BEGIN
    SELECT id INTO donor_uuid FROM users WHERE email = 'testdonor@example.com';
    
    IF donor_uuid IS NOT NULL THEN
        -- Insert completed donations
        INSERT INTO donations (donor_id, donation_date, units_donated, donation_center, status, ai_verified, eligibility_score)
        VALUES 
            (donor_uuid, CURRENT_DATE - INTERVAL '90 days', 1, 'City Blood Center', 'completed', true, 95),
            (donor_uuid, CURRENT_DATE - INTERVAL '60 days', 1, 'Hospital Blood Bank', 'completed', true, 92),
            (donor_uuid, CURRENT_DATE - INTERVAL '30 days', 1, 'Community Health Center', 'completed', true, 88);
            
        -- Insert a pending donation
        INSERT INTO donations (donor_id, donation_date, units_donated, donation_center, status, ai_verified, eligibility_score)
        VALUES 
            (donor_uuid, CURRENT_DATE, 1, 'Mobile Blood Drive', 'pending_admin_approval', true, 90);
    END IF;
END $$;

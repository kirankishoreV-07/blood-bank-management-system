-- QUICK TABLE STRUCTURE FIX
-- Run this in Supabase if you still get column errors after running complete_deployment.sql

-- Check current blood_inventory table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'blood_inventory' 
ORDER BY ordinal_position;

-- If the table has wrong columns, recreate it
DO $$
BEGIN
    -- Check if blood_inventory exists with wrong structure
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'blood_inventory' 
        AND column_name = 'updated_at'
    ) THEN
        -- Table has wrong column name, recreate it
        DROP TABLE IF EXISTS blood_inventory CASCADE;
        
        CREATE TABLE blood_inventory (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            blood_group VARCHAR(5) NOT NULL,
            units_available INTEGER DEFAULT 0,
            units_reserved INTEGER DEFAULT 0,
            last_updated TIMESTAMP DEFAULT NOW(),  -- Correct column name
            updated_by UUID,
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
        
        -- Recreate indexes
        CREATE INDEX idx_blood_inventory_blood_group ON blood_inventory(blood_group);
        CREATE INDEX idx_blood_inventory_donation_id ON blood_inventory(donation_id);
        
        -- Insert sample data
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
        
        -- Enable RLS and policies
        ALTER TABLE blood_inventory ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Public can view inventory" ON blood_inventory
            FOR SELECT USING (true);
        
        CREATE POLICY "Admin can manage inventory" ON blood_inventory
            FOR ALL USING (
                EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND user_type = 'admin')
            );
        
        GRANT SELECT ON blood_inventory TO authenticated;
        GRANT ALL ON blood_inventory TO service_role;
        
        RAISE NOTICE 'Blood inventory table recreated with correct structure (last_updated column)';
    ELSE
        RAISE NOTICE 'Blood inventory table already has correct structure';
    END IF;
END
$$;

-- Verify the fix
SELECT 
    'Table structure check:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'blood_inventory' 
AND column_name IN ('last_updated', 'updated_at', 'blood_group', 'blood_type')
ORDER BY column_name;

-- Test query that backend will run
SELECT 
    'Backend compatibility test:' as test,
    blood_group,
    units_available,
    last_updated
FROM blood_inventory 
ORDER BY last_updated DESC 
LIMIT 3;

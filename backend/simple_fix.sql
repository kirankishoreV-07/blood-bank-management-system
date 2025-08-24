-- Simple fix for blood inventory issues
-- Run this if you want to keep existing data and just fix the structure

-- Check if blood_inventory table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'blood_inventory') THEN
        -- Create blood inventory table
        CREATE TABLE blood_inventory (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            blood_group VARCHAR(5) NOT NULL,
            units_available INTEGER DEFAULT 0,
            units_reserved INTEGER DEFAULT 0,
            last_updated TIMESTAMP DEFAULT NOW(),
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

        -- Create indexes
        CREATE INDEX idx_blood_inventory_blood_group ON blood_inventory(blood_group);
        CREATE INDEX idx_blood_inventory_donation_id ON blood_inventory(donation_id);

        -- Insert default blood types
        INSERT INTO blood_inventory (blood_group, units_available, donation_id, donor_id, donor_name, location) 
        VALUES 
            ('A+', 5, NULL, NULL, NULL, 'Main Blood Bank'), 
            ('A-', 3, NULL, NULL, NULL, 'Main Blood Bank'), 
            ('B+', 7, NULL, NULL, NULL, 'Main Blood Bank'), 
            ('B-', 2, NULL, NULL, NULL, 'Main Blood Bank'),
            ('AB+', 4, NULL, NULL, NULL, 'Main Blood Bank'), 
            ('AB-', 1, NULL, NULL, NULL, 'Main Blood Bank'), 
            ('O+', 10, NULL, NULL, NULL, 'Main Blood Bank'), 
            ('O-', 6, NULL, NULL, NULL, 'Main Blood Bank');

        -- Enable RLS
        ALTER TABLE blood_inventory ENABLE ROW LEVEL SECURITY;

        -- Create policy for public read access
        CREATE POLICY "Public can view inventory" ON blood_inventory
            FOR SELECT USING (true);

        -- Grant permissions
        GRANT SELECT ON blood_inventory TO authenticated;
        GRANT ALL ON blood_inventory TO service_role;

        RAISE NOTICE 'Blood inventory table created successfully with sample data';
    ELSE
        -- Check if blood_group column exists, if not add it
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'blood_inventory' AND column_name = 'blood_group') THEN
            -- If the table has blood_type, rename it to blood_group
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'blood_inventory' AND column_name = 'blood_type') THEN
                ALTER TABLE blood_inventory RENAME COLUMN blood_type TO blood_group;
                RAISE NOTICE 'Renamed blood_type column to blood_group';
            ELSE
                -- Add blood_group column if neither exists
                ALTER TABLE blood_inventory ADD COLUMN blood_group VARCHAR(5);
                RAISE NOTICE 'Added blood_group column';
            END IF;
        END IF;

        -- Check if we have any data, if not add some
        IF NOT EXISTS (SELECT 1 FROM blood_inventory LIMIT 1) THEN
            INSERT INTO blood_inventory (blood_group, units_available, donation_id, donor_id, donor_name, location) 
            VALUES 
                ('A+', 5, NULL, NULL, NULL, 'Main Blood Bank'), 
                ('A-', 3, NULL, NULL, NULL, 'Main Blood Bank'), 
                ('B+', 7, NULL, NULL, NULL, 'Main Blood Bank'), 
                ('B-', 2, NULL, NULL, NULL, 'Main Blood Bank'),
                ('AB+', 4, NULL, NULL, NULL, 'Main Blood Bank'), 
                ('AB-', 1, NULL, NULL, NULL, 'Main Blood Bank'), 
                ('O+', 10, NULL, NULL, NULL, 'Main Blood Bank'), 
                ('O-', 6, NULL, NULL, NULL, 'Main Blood Bank');
            RAISE NOTICE 'Added sample blood inventory data';
        END IF;

        RAISE NOTICE 'Blood inventory table already exists and has been checked';
    END IF;
END
$$;

-- Create or replace the donor_dashboard_view (simple version)
CREATE OR REPLACE VIEW donor_dashboard_view AS
SELECT 
    u.id as donor_id,
    u.id,  -- Add this for backend compatibility
    u.full_name,
    u.blood_group,
    
    -- Simple stats from donations table
    COALESCE(d.total_donations, 0) as total_donations,
    COALESCE(d.total_units, 0) as total_units,
    d.last_donation_date,
    
    -- Calculate next eligible date (56 days after last donation)
    CASE 
        WHEN d.last_donation_date IS NULL THEN CURRENT_DATE
        ELSE d.last_donation_date + INTERVAL '56 days'
    END as next_eligible_date,
    
    -- Simple eligibility check
    CASE 
        WHEN d.last_donation_date IS NULL THEN true
        WHEN d.last_donation_date + INTERVAL '56 days' <= CURRENT_DATE THEN true
        ELSE false
    END as can_donate_now,
    
    -- Default values for backend compatibility
    0 as pending_approvals,
    0 as latest_risk_score,
    'eligible' as eligibility_status,
    CASE 
        WHEN d.last_donation_date IS NULL THEN 0
        ELSE EXTRACT(DAY FROM CURRENT_DATE - d.last_donation_date)::integer
    END as days_until_eligible,
    'Available for donation' as eligibility_reason,
    0 as pending_donations_count
    
FROM users u
LEFT JOIN (
    SELECT 
        donor_id,
        COUNT(*) as total_donations,
        SUM(units_donated) as total_units,
        MAX(donation_date) as last_donation_date
    FROM donations 
    WHERE status = 'completed'
    GROUP BY donor_id
) d ON u.id = d.donor_id
WHERE u.user_type = 'donor';

-- Grant permissions on the view
GRANT SELECT ON donor_dashboard_view TO authenticated;

SELECT 'Blood inventory fix applied successfully! 🎉' as status,
       'Table: ' || CASE WHEN EXISTS(SELECT FROM information_schema.tables WHERE table_name = 'blood_inventory') THEN 'EXISTS' ELSE 'MISSING' END as table_status,
       'View: ' || CASE WHEN EXISTS(SELECT FROM information_schema.views WHERE table_name = 'donor_dashboard_view') THEN 'EXISTS' ELSE 'MISSING' END as view_status;

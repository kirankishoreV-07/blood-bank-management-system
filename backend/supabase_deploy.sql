-- Supabase Deployment Script for Missing donor_dashboard_view
-- Copy and paste this entire script into the Supabase SQL editor

-- First, let's check if the view already exists and drop it if needed
DROP VIEW IF EXISTS donor_dashboard_view;

-- Create the donor_dashboard_view that the backend API expects
CREATE OR REPLACE VIEW donor_dashboard_view AS
SELECT 
    u.id,
    u.id as donor_id,
    u.full_name,
    u.email,
    u.blood_group,
    u.phone,
    u.age,
    
    -- Donation statistics from completed donations
    COALESCE(d.total_donations, 0) as total_donations,
    COALESCE(d.total_units, 0) as total_units,
    d.last_donation_date,
    
    -- Calculate next eligible date (56 days after last donation)
    CASE 
        WHEN d.last_donation_date IS NULL THEN CURRENT_DATE
        ELSE d.last_donation_date + INTERVAL '56 days'
    END as next_eligible_date,
    
    -- Check eligibility status
    CASE 
        WHEN d.last_donation_date IS NULL THEN true
        WHEN d.last_donation_date + INTERVAL '56 days' <= CURRENT_DATE THEN true
        ELSE false
    END as is_eligible,
    
    -- Pending approvals count
    COALESCE(p.pending_approvals, 0) as pending_approvals,
    
    -- Days since last donation
    CASE 
        WHEN d.last_donation_date IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM CURRENT_DATE - d.last_donation_date)::integer
    END as days_since_last_donation,
    
    -- Days remaining until eligible
    CASE 
        WHEN d.last_donation_date IS NULL THEN 0
        WHEN d.last_donation_date + INTERVAL '56 days' <= CURRENT_DATE THEN 0
        ELSE EXTRACT(DAY FROM (d.last_donation_date + INTERVAL '56 days') - CURRENT_DATE)::integer
    END as days_until_eligible,
    
    -- Risk score (default to 0 if no pending donations)
    COALESCE(p.latest_risk_score, 0) as latest_risk_score,
    
    -- Overall eligibility status
    CASE 
        WHEN p.pending_approvals > 0 THEN 'pending'
        WHEN d.last_donation_date IS NULL THEN 'eligible'
        WHEN d.last_donation_date + INTERVAL '56 days' <= CURRENT_DATE THEN 'eligible'
        ELSE 'not_eligible'
    END as eligibility_status

FROM users u
LEFT JOIN (
    -- Aggregate completed donations
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
    -- Count pending donations and get latest risk score
    SELECT 
        donor_id,
        COUNT(*) as pending_approvals,
        MAX(risk_score) as latest_risk_score
    FROM donations 
    WHERE status = 'pending_admin_approval'
    GROUP BY donor_id
) p ON u.id = p.donor_id

WHERE u.user_type = 'donor';

-- Grant permissions to the view
GRANT SELECT ON donor_dashboard_view TO authenticated;

-- Enable RLS for the view
ALTER TABLE donor_dashboard_view ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for donors to see only their own data
CREATE POLICY "Donors can only see their own dashboard data" ON donor_dashboard_view
    FOR SELECT USING (id = auth.uid());

-- Verify the view was created successfully
SELECT 'donor_dashboard_view created successfully' as status;

-- Show a sample of the view data
SELECT 
    full_name,
    blood_group,
    total_donations,
    total_units,
    pending_approvals,
    eligibility_status
FROM donor_dashboard_view 
LIMIT 5;

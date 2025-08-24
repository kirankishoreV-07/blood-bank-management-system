-- Quick check for pending donations in the donations table
SELECT 
    d.id,
    d.donor_id,
    u.full_name,
    u.blood_group,
    d.donation_date,
    d.donation_center,
    d.units_donated,
    d.status,
    d.submitted_at
FROM donations d
LEFT JOIN users u ON d.donor_id = u.id
WHERE d.status = 'pending_admin_approval'
ORDER BY d.submitted_at DESC
LIMIT 10;

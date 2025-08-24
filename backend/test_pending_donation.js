const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://emqnhhyvpzwyhyujlstl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcW5oaHl2cHp3eWh5dWpsc3RsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjYzNTM1OCwiZXhwIjoyMDQ4MjExMzU4fQ.f0ZBLrZnwGiWHjNYCzuKKZJHBw0UGu7FhGDJSLkfAH4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestPendingDonation() {
    try {
        console.log('🧪 Creating test pending donation...');
        
        // First, get a donor user (using service key to bypass RLS)
        const { data: donor, error: donorError } = await supabase
            .from('users')
            .select('id, full_name, blood_group')
            .eq('user_type', 'donor')
            .limit(1)
            .single();
            
        if (donorError || !donor) {
            console.error('❌ No donor found:', donorError);
            return;
        }
        
        console.log('👤 Found donor:', donor.full_name, 'Blood group:', donor.blood_group);
        
        // Create test pending donation
        const testDonation = {
            donor_id: donor.id,
            donation_date: new Date().toISOString().split('T')[0],
            units_donated: 1,
            donation_center: 'Test Blood Bank (via API)',
            notes: 'Test pending donation for admin dashboard verification',
            status: 'pending_admin_approval',
            verification_photo: 'test_photo_url',
            verification_status: 'ai_verified',
            admin_approved: false,
            submitted_at: new Date().toISOString(),
            source: 'walk_in'
        };
        
        console.log('📝 Creating donation record:', testDonation);
        
        const { data, error } = await supabase
            .from('donations')
            .insert([testDonation])
            .select()
            .single();
            
        if (error) {
            console.error('❌ Error creating donation:', error);
            return;
        }
        
        console.log('✅ Test pending donation created successfully!');
        console.log('🆔 Donation ID:', data.id);
        console.log('👤 Donor:', donor.full_name);
        console.log('🩸 Blood Group:', donor.blood_group);
        console.log('📅 Date:', data.donation_date);
        console.log('📍 Center:', data.donation_center);
        console.log('📊 Status:', data.status);
        
        // Verify it shows up in the pending list
        console.log('\n🔍 Verifying donation appears in pending list...');
        const { data: pendingList, error: pendingError } = await supabase
            .from('donations')
            .select(`
                *,
                users!donor_id (
                    id,
                    full_name,
                    email,
                    blood_group
                )
            `)
            .eq('status', 'pending_admin_approval')
            .order('submitted_at', { ascending: false });
            
        if (pendingError) {
            console.error('❌ Error fetching pending list:', pendingError);
            return;
        }
        
        console.log('📋 Total pending donations:', pendingList?.length || 0);
        pendingList?.forEach((pending, index) => {
            console.log(`${index + 1}. ${pending.users.full_name} - ${pending.users.blood_group} - ${pending.donation_center} (${pending.submitted_at})`);
        });
        
    } catch (error) {
        console.error('💥 Test failed:', error);
    }
}

// Run the test
createTestPendingDonation();

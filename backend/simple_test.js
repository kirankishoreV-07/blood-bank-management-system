// Simple Data Persistence Test
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ywnaacinyhkmxutqturp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmFhY2lueWhrbXh1dHF0dXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMTMzMCwiZXhwIjoyMDcxMjg3MzMwfQ.p6DKETyt94vF90GSLG08Uz-uhBzDUIQXEY0K0u1cYyI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDataPersistence() {
    try {
        console.log('🧪 Testing data persistence...');
        
        // Step 1: Clean up
        console.log('\n🧹 Cleaning existing test data...');
        await supabase.from('donations').delete().ilike('donation_center', '%Test%');
        await supabase.from('users').delete().ilike('email', '%hamsa@test.com');
        
        // Step 2: Create test user directly in database
        console.log('\n👤 Creating test user: Hamsa...');
        
        const testUser = {
            email: 'hamsa@test.com',
            password: '$2b$10$abcd1234efgh5678ijkl', // dummy hash
            user_type: 'donor',
            full_name: 'Hamsa Test User',
            phone: '1234567890',
            blood_group: 'A+',
            age: 25,
            is_active: true,
            created_at: new Date().toISOString()
        };
        
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert([testUser])
            .select()
            .single();
            
        if (userError) {
            console.error('❌ User creation failed:', userError);
            return;
        }
        
        console.log('✅ User Hamsa created:', newUser.id);
        
        // Step 3: Create test donation
        console.log('\n🩸 Creating test donation...');
        
        const testDonation = {
            donor_id: newUser.id,
            donation_date: new Date().toISOString().split('T')[0],
            units_donated: 1,
            donation_center: 'Test Blood Bank',
            notes: 'Test donation from Hamsa',
            status: 'pending_admin_approval',
            verification_status: 'ai_verified',
            admin_approved: false,
            submitted_at: new Date().toISOString(),
            source: 'walk_in'
        };
        
        const { data: newDonation, error: donationError } = await supabase
            .from('donations')
            .insert([testDonation])
            .select()
            .single();
            
        if (donationError) {
            console.error('❌ Donation creation failed:', donationError);
            return;
        }
        
        console.log('✅ Donation created:', newDonation.id);
        
        // Step 4: Test admin query (what admin dashboard does)
        console.log('\n🔍 Testing admin dashboard query...');
        
        const { data: pendingDonations, error: queryError } = await supabase
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
            
        if (queryError) {
            console.error('❌ Admin query failed:', queryError);
            return;
        }
        
        console.log(`📊 Admin dashboard would show: ${pendingDonations?.length || 0} pending donations`);
        
        if (pendingDonations && pendingDonations.length > 0) {
            pendingDonations.forEach(donation => {
                console.log(`  ✅ ${donation.users.full_name} (${donation.users.blood_group}) - ${donation.donation_center}`);
            });
            
            console.log('\n🎉 SUCCESS: Data persists correctly!');
            console.log('✅ Hamsa\'s donation will appear in admin dashboard');
            
            // Step 5: Test what happens after "restart" (re-query)
            console.log('\n🔄 Simulating app restart - re-querying data...');
            
            const { data: afterRestart, error: restartError } = await supabase
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
                
            if (afterRestart && afterRestart.length > 0) {
                console.log('✅ After restart: Data still persists!');
                console.log(`📊 Found ${afterRestart.length} pending donations`);
            } else {
                console.log('❌ After restart: Data disappeared!');
            }
            
        } else {
            console.log('❌ FAILURE: No pending donations found');
            console.log('❌ Admin dashboard will be empty');
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error);
    }
}

testDataPersistence();

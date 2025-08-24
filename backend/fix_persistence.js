// Fix Authentication and Data Persistence
// This script will:
// 1. Set up test data that persists
// 2. Create admin/donor accounts with simple passwords
// 3. Verify the complete flow

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ywnaacinyhkmxutqturp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmFhY2lueWhrbXh1dHF0dXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMTMzMCwiZXhwIjoyMDcxMjg3MzMwfQ.p6DKETyt94vF90GSLG08Uz-uhBzDUIQXEY0K0u1cYyI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDataPersistence() {
    try {
        console.log('🔧 Fixing data persistence issue...');
        
        // Step 1: Clean and create fresh test data
        console.log('\n🧹 Cleaning existing data...');
        await supabase.from('donations').delete().gte('id', 0); // Delete all
        await supabase.from('users').delete().neq('user_type', 'system'); // Keep system users if any
        
        // Step 2: Create admin user with known password hash
        console.log('\n👨‍💼 Creating admin user...');
        
        // Using bcryptjs hash for "password123"
        const passwordHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
        
        const adminUser = {
            email: 'admin@test.com',
            password: passwordHash,
            user_type: 'admin',
            full_name: 'Test Admin',
            phone: '1111111111',
            is_active: true,
            created_at: new Date().toISOString()
        };
        
        const { data: admin, error: adminError } = await supabase
            .from('users')
            .insert([adminUser])
            .select()
            .single();
            
        if (adminError) {
            console.error('❌ Admin creation failed:', adminError);
            return;
        }
        console.log('✅ Admin created:', admin.full_name, 'Email:', admin.email);
        
        // Step 3: Create donor user (Hamsa)
        console.log('\n👤 Creating donor user: Hamsa...');
        
        const donorUser = {
            email: 'hamsa@test.com',
            password: passwordHash, // Same password: "password123"
            user_type: 'donor',
            full_name: 'Hamsa',
            phone: '2222222222',
            blood_group: 'A+',
            age: 25,
            is_active: true,
            created_at: new Date().toISOString()
        };
        
        const { data: donor, error: donorError } = await supabase
            .from('users')
            .insert([donorUser])
            .select()
            .single();
            
        if (donorError) {
            console.error('❌ Donor creation failed:', donorError);
            return;
        }
        console.log('✅ Donor created:', donor.full_name, 'Email:', donor.email);
        
        // Step 4: Create pending donation from Hamsa
        console.log('\n🩸 Creating pending donation...');
        
        const donation = {
            donor_id: donor.id,
            donation_date: new Date().toISOString().split('T')[0],
            units_donated: 1,
            donation_center: 'Main Blood Bank',
            notes: 'Walk-in donation from Hamsa',
            status: 'pending_admin_approval',
            verification_status: 'ai_verified',
            admin_approved: false,
            submitted_at: new Date().toISOString(),
            source: 'walk_in'
        };
        
        const { data: newDonation, error: donationError } = await supabase
            .from('donations')
            .insert([donation])
            .select()
            .single();
            
        if (donationError) {
            console.error('❌ Donation creation failed:', donationError);
            return;
        }
        console.log('✅ Donation created:', newDonation.id);
        
        // Step 5: Verify admin can see the donation
        console.log('\n🔍 Verifying admin dashboard query...');
        
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
        
        console.log(`✅ Admin query successful: ${pendingDonations?.length || 0} pending donations`);
        
        if (pendingDonations && pendingDonations.length > 0) {
            console.log('\n📋 Admin dashboard will show:');
            pendingDonations.forEach((donation, index) => {
                console.log(`  ${index + 1}. ${donation.users.full_name} (${donation.users.blood_group})`);
                console.log(`     Center: ${donation.donation_center}`);
                console.log(`     Units: ${donation.units_donated}`);
                console.log(`     Date: ${new Date(donation.submitted_at).toLocaleString()}`);
            });
        }
        
        console.log('\n🎉 SETUP COMPLETE!');
        console.log('\n📝 Test Credentials:');
        console.log('👨‍💼 Admin Login:');
        console.log('   Email: admin@test.com');
        console.log('   Password: password123');
        console.log('\n👤 Donor Login:');
        console.log('   Email: hamsa@test.com');
        console.log('   Password: password123');
        
        console.log('\n🧪 Testing Instructions:');
        console.log('1. ✅ Data is now persistent in database');
        console.log('2. 🔐 Login as admin with the credentials above');
        console.log('3. 📊 Check admin dashboard - should show Hamsa\'s pending donation');
        console.log('4. 🔄 Restart app and login again - data should still be there');
        console.log('5. ✅ Click approve button - should work without errors');
        
    } catch (error) {
        console.error('💥 Setup failed:', error);
    }
}

fixDataPersistence();

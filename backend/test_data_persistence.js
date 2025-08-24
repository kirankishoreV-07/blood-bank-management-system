// Complete Data Persistence Test
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const fetch = require('node-fetch');

const supabaseUrl = 'https://emqnhhyvpzwyhyujlstl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcW5oaHl2cHp3eWh5dWpsc3RsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjYzNTM1OCwiZXhwIjoyMDQ4MjExMzU4fQ.f0ZBLrZnwGiWHjNYCzuKKZJHBw0UGu7FhGDJSLkfAH4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCompleteFlow() {
    try {
        console.log('🧪 Testing complete data persistence flow...');
        
        // Step 1: Clean up any existing test data
        console.log('\n🧹 Cleaning up existing test data...');
        await supabase.from('donations').delete().ilike('donation_center', '%Test%');
        await supabase.from('users').delete().ilike('email', '%test.com');
        
        // Step 2: Test direct database insertion (bypass RLS)
        console.log('\n📝 Testing direct database user creation...');
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const testUser = {
            email: 'hamsa@test.com',
            password: hashedPassword,
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
        
        console.log('✅ User created successfully:', newUser.full_name, newUser.id);
        
        // Step 3: Test donation creation
        console.log('\n🩸 Testing donation creation...');
        
        const testDonation = {
            donor_id: newUser.id,
            donation_date: new Date().toISOString().split('T')[0],
            units_donated: 1,
            donation_center: 'Test Blood Bank Center',
            notes: 'Test donation for persistence verification',
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
        
        console.log('✅ Donation created successfully:', newDonation.id);
        
        // Step 4: Test data retrieval (simulate admin dashboard query)
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
            console.error('❌ Query failed:', queryError);
            return;
        }
        
        console.log('📊 Found pending donations:', pendingDonations?.length || 0);
        pendingDonations?.forEach(donation => {
            console.log(`  - ${donation.users.full_name} (${donation.users.blood_group}) - ${donation.donation_center}`);
        });
        
        // Step 5: Test API endpoints
        console.log('\n🌐 Testing API endpoints...');
        
        // Test registration endpoint
        const registerResponse = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'john@test.com',
                password: 'password123',
                user_type: 'donor',
                full_name: 'John Test User',
                phone: '0987654321',
                blood_group: 'B+',
                age: 30
            })
        });
        
        if (registerResponse.ok) {
            const regResult = await registerResponse.json();
            console.log('✅ API Registration successful:', regResult.user.full_name);
            
            // Test login
            const loginResponse = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'john@test.com',
                    password: 'password123',
                    user_type: 'donor'
                })
            });
            
            if (loginResponse.ok) {
                const loginResult = await loginResponse.json();
                console.log('✅ API Login successful');
                
                // Test donation submission
                const donationResponse = await fetch('http://localhost:3000/api/donor/walk-in-donation', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${loginResult.token}`
                    },
                    body: JSON.stringify({
                        donation_center: 'API Test Blood Center',
                        units_donated: 1,
                        notes: 'API test donation',
                        status: 'pending_admin_approval'
                    })
                });
                
                if (donationResponse.ok) {
                    console.log('✅ API Donation submission successful');
                } else {
                    const donationError = await donationResponse.text();
                    console.error('❌ API Donation failed:', donationError);
                }
            } else {
                const loginError = await loginResponse.text();
                console.error('❌ API Login failed:', loginError);
            }
        } else {
            const regError = await registerResponse.text();
            console.error('❌ API Registration failed:', regError);
        }
        
        // Step 6: Final verification
        console.log('\n🔍 Final verification - checking all data...');
        
        const { data: allUsers } = await supabase
            .from('users')
            .select('full_name, user_type, email')
            .eq('user_type', 'donor');
            
        const { data: allDonations } = await supabase
            .from('donations')
            .select('id, donation_center, status')
            .eq('status', 'pending_admin_approval');
            
        console.log(`📊 Total donors in database: ${allUsers?.length || 0}`);
        console.log(`📊 Total pending donations: ${allDonations?.length || 0}`);
        
        if (allUsers?.length > 0 && allDonations?.length > 0) {
            console.log('🎉 Data persistence test PASSED - data is being saved correctly!');
        } else {
            console.log('❌ Data persistence test FAILED - data is not persisting');
        }
        
    } catch (error) {
        console.error('💥 Test failed with error:', error);
    }
}

// Run the test
testCompleteFlow();

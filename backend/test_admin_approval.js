// Test the admin approval process
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://emqnhhyvpzwyhyujlstl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcW5oaHl2cHp3eWh5dWpsc3RsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjYzNTM1OCwiZXhwIjoyMDQ4MjExMzU4fQ.f0ZBLrZnwGiWHjNYCzuKKZJHBw0UGu7FhGDJSLkfAH4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testApprovalFlow() {
    try {
        console.log('🧪 Testing admin approval flow...');
        
        // 1. Check current pending donations
        console.log('\n📋 Checking pending donations...');
        const { data: pendingDonations, error: pendingError } = await supabase
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
            console.error('❌ Error fetching pending donations:', pendingError);
            return;
        }
        
        console.log(`📊 Found ${pendingDonations?.length || 0} pending donations`);
        
        if (!pendingDonations || pendingDonations.length === 0) {
            console.log('⚠️ No pending donations found. Creating test donation...');
            
            // Get a donor user
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
            
            // Create test donation
            const testDonation = {
                donor_id: donor.id,
                donation_date: new Date().toISOString().split('T')[0],
                units_donated: 1,
                donation_center: 'Test Blood Bank',
                notes: 'Test donation for approval flow',
                status: 'pending_admin_approval',
                verification_status: 'ai_verified',
                admin_approved: false,
                submitted_at: new Date().toISOString(),
                source: 'walk_in'
            };
            
            const { data: newDonation, error: createError } = await supabase
                .from('donations')
                .insert([testDonation])
                .select(`
                    *,
                    users!donor_id (
                        id,
                        full_name,
                        email,
                        blood_group
                    )
                `)
                .single();
                
            if (createError) {
                console.error('❌ Error creating test donation:', createError);
                return;
            }
            
            console.log('✅ Created test donation:', newDonation.id);
            pendingDonations.push(newDonation);
        }
        
        // 2. Test approval process on first pending donation
        const testDonation = pendingDonations[0];
        console.log(`\n🔄 Testing approval for donation ${testDonation.id} by ${testDonation.users.full_name}`);
        
        // Get current blood inventory before approval
        const { data: beforeInventory } = await supabase
            .from('blood_inventory')
            .select('units_available')
            .eq('blood_group', testDonation.users.blood_group)
            .single();
            
        console.log(`📊 ${testDonation.users.blood_group} inventory before approval: ${beforeInventory?.units_available || 0} units`);
        
        // 3. Simulate admin approval
        const updateData = {
            status: 'completed',
            admin_approved: true,
            admin_notes: 'Test approval via script',
            approved_at: new Date().toISOString(),
            verification_status: 'admin_approved'
        };
        
        const { error: updateError } = await supabase
            .from('donations')
            .update(updateData)
            .eq('id', testDonation.id);
            
        if (updateError) {
            console.error('❌ Error updating donation:', updateError);
            return;
        }
        
        console.log('✅ Donation status updated to completed');
        
        // 4. Update blood inventory
        const bloodGroup = testDonation.users.blood_group;
        const unitsToAdd = testDonation.units_donated;
        
        if (beforeInventory) {
            // Update existing inventory
            const newTotal = beforeInventory.units_available + unitsToAdd;
            const { error: inventoryError } = await supabase
                .from('blood_inventory')
                .update({
                    units_available: newTotal,
                    updated_at: new Date().toISOString()
                })
                .eq('blood_group', bloodGroup);
                
            if (inventoryError) {
                console.error('❌ Error updating inventory:', inventoryError);
            } else {
                console.log(`✅ Updated ${bloodGroup} inventory: ${beforeInventory.units_available} → ${newTotal} units`);
            }
        } else {
            // Create new inventory
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7);
            
            const { error: inventoryError } = await supabase
                .from('blood_inventory')
                .insert({
                    blood_group: bloodGroup,
                    units_available: unitsToAdd,
                    location: testDonation.donation_center,
                    expiry_date: expiryDate.toISOString().split('T')[0]
                });
                
            if (inventoryError) {
                console.error('❌ Error creating inventory:', inventoryError);
            } else {
                console.log(`✅ Created new ${bloodGroup} inventory: ${unitsToAdd} units`);
            }
        }
        
        console.log('\n🎉 Admin approval flow test completed successfully!');
        
    } catch (error) {
        console.error('💥 Test failed:', error);
    }
}

testApprovalFlow();

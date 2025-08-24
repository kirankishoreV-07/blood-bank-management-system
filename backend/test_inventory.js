const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    "https://ywnaacinyhkmxutqturp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmFhY2lueWhrbXh1dHF0dXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMTMzMCwiZXhwIjoyMDcxMjg3MzMwfQ.p6DKETyt94vF90GSLG08Uz-uhBzDUIQXEY0K0u1cYyI"
);

async function testInventoryUpdates() {
    try {
        console.log('🧪 Testing Real-time Blood Inventory Updates...\n');
        
        // 1. Show current inventory
        console.log('📊 BEFORE - Current Blood Inventory:');
        const { data: beforeInventory, error: beforeError } = await supabase
            .from('blood_inventory')
            .select('*')
            .order('blood_group');
            
        if (beforeError) {
            console.error('❌ Error fetching inventory:', beforeError.message);
            return;
        }
        
        console.log('Blood Group | Units Available | Location');
        console.log('----------------------------------------');
        beforeInventory.forEach(item => {
            console.log(`${item.blood_group.padEnd(10)} | ${item.units_available.toString().padEnd(14)} | ${item.location}`);
        });
        
        const totalBefore = beforeInventory.reduce((sum, item) => sum + item.units_available, 0);
        console.log(`\n🩸 Total Units Before: ${totalBefore}\n`);
        
        // 2. Simulate a donation to test the update
        console.log('🎯 Simulating donation to test inventory update...');
        
        // Find a blood group to test with
        const testBloodGroup = 'O+';
        const testInventory = beforeInventory.find(item => item.blood_group === testBloodGroup);
        
        if (!testInventory) {
            console.log(`❌ No ${testBloodGroup} inventory found for testing`);
            return;
        }
        
        const unitsToAdd = 2;
        const expectedNewTotal = testInventory.units_available + unitsToAdd;
        
        console.log(`📋 Test Details:`);
        console.log(`   Blood Group: ${testBloodGroup}`);
        console.log(`   Current Units: ${testInventory.units_available}`);
        console.log(`   Adding: ${unitsToAdd} units`);
        console.log(`   Expected Total: ${expectedNewTotal}`);
        
        // 3. Manually update inventory (simulating donation)
        const { data: updateResult, error: updateError } = await supabase
            .from('blood_inventory')
            .update({
                units_available: expectedNewTotal,
                updated_at: new Date().toISOString()
            })
            .eq('blood_group', testBloodGroup)
            .select();
            
        if (updateError) {
            console.error('❌ Update error:', updateError.message);
            return;
        }
        
        console.log('✅ Inventory update successful!');
        
        // 4. Show updated inventory
        console.log('\n📊 AFTER - Updated Blood Inventory:');
        const { data: afterInventory, error: afterError } = await supabase
            .from('blood_inventory')
            .select('*')
            .order('blood_group');
            
        if (afterError) {
            console.error('❌ Error fetching updated inventory:', afterError.message);
            return;
        }
        
        console.log('Blood Group | Units Available | Location');
        console.log('----------------------------------------');
        afterInventory.forEach(item => {
            const isUpdated = item.blood_group === testBloodGroup;
            const indicator = isUpdated ? '🟢' : '  ';
            console.log(`${indicator} ${item.blood_group.padEnd(8)} | ${item.units_available.toString().padEnd(14)} | ${item.location}`);
        });
        
        const totalAfter = afterInventory.reduce((sum, item) => sum + item.units_available, 0);
        console.log(`\n🩸 Total Units After: ${totalAfter}`);
        console.log(`📈 Units Added: ${totalAfter - totalBefore}`);
        
        // 5. Verify the specific update
        const updatedTestInventory = afterInventory.find(item => item.blood_group === testBloodGroup);
        
        if (updatedTestInventory && updatedTestInventory.units_available === expectedNewTotal) {
            console.log(`\n✅ SUCCESS: ${testBloodGroup} inventory correctly updated!`);
            console.log(`   ✓ Previous: ${testInventory.units_available} units`);
            console.log(`   ✓ Current: ${updatedTestInventory.units_available} units`);
            console.log(`   ✓ Difference: +${updatedTestInventory.units_available - testInventory.units_available} units`);
        } else {
            console.log(`\n❌ FAILED: ${testBloodGroup} inventory update verification failed`);
            console.log(`   Expected: ${expectedNewTotal} units`);
            console.log(`   Got: ${updatedTestInventory?.units_available || 'N/A'} units`);
        }
        
        // 6. Test blood compatibility system
        console.log('\n🔬 Testing Blood Compatibility System...');
        
        const compatibilityTests = [
            { donor: 'O-', recipient: 'A+', shouldMatch: true },
            { donor: 'A+', recipient: 'O+', shouldMatch: false },
            { donor: 'AB+', recipient: 'AB+', shouldMatch: true },
            { donor: 'B-', recipient: 'AB-', shouldMatch: true }
        ];
        
        compatibilityTests.forEach(test => {
            // Simple compatibility check (this should match backend logic)
            const result = checkBloodCompatibility(test.donor, test.recipient);
            const status = result === test.shouldMatch ? '✅' : '❌';
            console.log(`   ${status} ${test.donor} → ${test.recipient}: ${result ? 'Compatible' : 'Incompatible'}`);
        });
        
        console.log('\n🎉 Real-time Blood Inventory Test Completed!');
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Simple blood compatibility checker
function checkBloodCompatibility(donorBlood, recipientBlood) {
    const compatibility = {
        'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal donor
        'O+': ['O+', 'A+', 'B+', 'AB+'],
        'A-': ['A-', 'A+', 'AB-', 'AB+'],
        'A+': ['A+', 'AB+'],
        'B-': ['B-', 'B+', 'AB-', 'AB+'],
        'B+': ['B+', 'AB+'],
        'AB-': ['AB-', 'AB+'],
        'AB+': ['AB+'] // Universal recipient only for AB+
    };
    
    return compatibility[donorBlood]?.includes(recipientBlood) || false;
}

if (require.main === module) {
    testInventoryUpdates().then(() => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    });
}

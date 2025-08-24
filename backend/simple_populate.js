const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    "https://ywnaacinyhkmxutqturp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmFhY2lueWhrbXh1dHF0dXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMTMzMCwiZXhwIjoyMDcxMjg3MzMwfQ.p6DKETyt94vF90GSLG08Uz-uhBzDUIQXEY0K0u1cYyI"
);

async function simplePopulateInventory() {
    try {
        console.log('🩸 Populating blood inventory with donor information...');
        
        // Clear existing inventory
        console.log('🔄 Clearing existing inventory...');
        const { error: deleteError } = await supabase
            .from('blood_inventory')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
            
        if (deleteError) {
            console.log('⚠️ Clear warning:', deleteError.message);
        }
        
        // Create basic inventory entries with minimal fields first
        const basicInventory = [
            { blood_group: 'A+', units_available: 5, location: 'Main Blood Bank', donor_name: 'John Smith' },
            { blood_group: 'A-', units_available: 3, location: 'Main Blood Bank', donor_name: 'Maria Garcia' },
            { blood_group: 'B+', units_available: 4, location: 'General Hospital', donor_name: 'David Johnson' },
            { blood_group: 'B-', units_available: 2, location: 'General Hospital', donor_name: 'Sarah Wilson' },
            { blood_group: 'AB+', units_available: 2, location: 'Community Center', donor_name: 'Michael Brown' },
            { blood_group: 'AB-', units_available: 1, location: 'Community Center', donor_name: 'Jessica Davis' },
            { blood_group: 'O+', units_available: 8, location: 'Red Cross Center', donor_name: 'Robert Miller' },
            { blood_group: 'O-', units_available: 4, location: 'Red Cross Center', donor_name: 'Ashley Taylor' }
        ];
        
        console.log('📊 Inserting basic inventory...');
        const { data: inserted, error: insertError } = await supabase
            .from('blood_inventory')
            .insert(basicInventory)
            .select();
            
        if (insertError) {
            console.error('❌ Insert error:', insertError.message);
            console.log('🔍 Let me check table structure...');
            
            // Try to get one record to see the actual structure
            const { data: sample, error: sampleError } = await supabase
                .from('blood_inventory')
                .select('*')
                .limit(1);
                
            if (sampleError) {
                console.error('❌ Sample query error:', sampleError.message);
            } else {
                console.log('✅ Table exists and is accessible');
                console.log('🏗️ Sample structure:', sample);
            }
            
            return;
        }
        
        console.log(`✅ Successfully inserted ${inserted.length} basic inventory records`);
        
        // Now add more detailed entries
        const detailedInventory = [];
        const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const centers = [
            'City Blood Bank - Main Branch',
            'General Hospital Blood Center', 
            'Community Health Center',
            'Red Cross Blood Drive Center',
            'University Medical Center'
        ];
        
        const donorNames = [
            'Christopher Anderson', 'Jennifer Thomas', 'Matthew Jackson',
            'Amanda White', 'Daniel Harris', 'Emily Martin', 'James Thompson',
            'Lisa Rodriguez', 'Kevin Lee', 'Rachel Green', 'Mark Williams',
            'Stephanie Clark', 'Paul Martinez', 'Nicole Young', 'Tony Scott'
        ];
        
        // Create 40 more entries
        for (let i = 0; i < 40; i++) {
            const bloodGroup = bloodGroups[Math.floor(Math.random() * bloodGroups.length)];
            const donorName = donorNames[Math.floor(Math.random() * donorNames.length)];
            const center = centers[Math.floor(Math.random() * centers.length)];
            const units = Math.floor(Math.random() * 3) + 1; // 1-3 units
            
            detailedInventory.push({
                blood_group: bloodGroup,
                units_available: units,
                location: center,
                donor_name: donorName
            });
        }
        
        // Insert in smaller batches
        const batchSize = 8;
        let totalInserted = 8; // From basic inventory
        
        for (let i = 0; i < detailedInventory.length; i += batchSize) {
            const batch = detailedInventory.slice(i, i + batchSize);
            
            const { data, error } = await supabase
                .from('blood_inventory')
                .insert(batch)
                .select();
                
            if (error) {
                console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
            } else {
                totalInserted += data.length;
                console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: +${data.length} records`);
            }
        }
        
        // Final summary
        const { data: finalInventory, error: finalError } = await supabase
            .from('blood_inventory')
            .select('blood_group, units_available, donor_name, location')
            .order('blood_group');
            
        if (finalError) {
            console.error('❌ Final query error:', finalError.message);
        } else {
            console.log(`\n🎉 Blood Inventory Successfully Populated!`);
            console.log(`📈 Total records: ${finalInventory.length}`);
            
            // Show summary by blood group
            const summary = {};
            let totalUnits = 0;
            
            finalInventory.forEach(item => {
                if (!summary[item.blood_group]) {
                    summary[item.blood_group] = { units: 0, count: 0, donors: new Set() };
                }
                summary[item.blood_group].units += item.units_available;
                summary[item.blood_group].count++;
                summary[item.blood_group].donors.add(item.donor_name);
                totalUnits += item.units_available;
            });
            
            console.log('\n📊 Blood Group Summary:');
            Object.entries(summary).forEach(([bloodGroup, stats]) => {
                console.log(`${bloodGroup}: ${stats.units} units from ${stats.count} donations (${stats.donors.size} unique donors)`);
            });
            
            console.log(`\n🩸 Total Blood Units Available: ${totalUnits}`);
            console.log(`👥 Total Donations Recorded: ${finalInventory.length}`);
            
            console.log('\n🏥 Recent Donations:');
            finalInventory.slice(0, 5).forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.blood_group} - ${item.units_available} units by ${item.donor_name} at ${item.location}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Population error:', error);
    }
}

if (require.main === module) {
    simplePopulateInventory().then(() => {
        console.log('\n✅ Blood inventory population completed!');
        process.exit(0);
    });
}

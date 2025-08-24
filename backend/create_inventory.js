const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    "https://ywnaacinyhkmxutqturp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmFhY2lueWhrbXh1dHF0dXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMTMzMCwiZXhwIjoyMDcxMjg3MzMwfQ.p6DKETyt94vF90GSLG08Uz-uhBzDUIQXEY0K0u1cYyI"
);

async function addInventoryWithCurrentSchema() {
    try {
        console.log('🔍 Checking current blood_inventory schema...');
        
        // First, let's add data with only the basic columns that definitely exist
        const basicInventory = [
            { 
                blood_group: 'A+', 
                units_available: 5, 
                location: 'Main Blood Bank',
                expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 5 days from now
            },
            { 
                blood_group: 'A-', 
                units_available: 3, 
                location: 'General Hospital',
                expiry_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            { 
                blood_group: 'B+', 
                units_available: 4, 
                location: 'Community Center',
                expiry_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            { 
                blood_group: 'B-', 
                units_available: 2, 
                location: 'Red Cross Center',
                expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            { 
                blood_group: 'AB+', 
                units_available: 2, 
                location: 'University Medical',
                expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            { 
                blood_group: 'AB-', 
                units_available: 1, 
                location: 'Main Blood Bank',
                expiry_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            { 
                blood_group: 'O+', 
                units_available: 8, 
                location: 'General Hospital',
                expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            { 
                blood_group: 'O-', 
                units_available: 4, 
                location: 'Community Center',
                expiry_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }
        ];
        
        console.log('📊 Inserting basic blood inventory...');
        const { data: inserted, error: insertError } = await supabase
            .from('blood_inventory')
            .insert(basicInventory)
            .select();
            
        if (insertError) {
            console.error('❌ Insert error:', insertError.message);
            return;
        }
        
        console.log(`✅ Successfully inserted ${inserted.length} inventory records`);
        
        // Add more diverse inventory
        const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const locations = [
            'City Blood Bank - Main Branch',
            'General Hospital Blood Center', 
            'Community Health Center',
            'Red Cross Blood Drive Center',
            'University Medical Center',
            'Metro Health Blood Bank',
            'Regional Medical Center',
            'Downtown Blood Collection'
        ];
        
        const additionalInventory = [];
        
        // Create 40 more entries with realistic distribution
        for (let i = 0; i < 40; i++) {
            const bloodGroup = bloodGroups[Math.floor(Math.random() * bloodGroups.length)];
            const location = locations[Math.floor(Math.random() * locations.length)];
            const units = Math.floor(Math.random() * 4) + 1; // 1-4 units
            
            // Random expiry date between 1-7 days
            const daysToExpiry = Math.floor(Math.random() * 7) + 1;
            const expiryDate = new Date(Date.now() + daysToExpiry * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            additionalInventory.push({
                blood_group: bloodGroup,
                units_available: units,
                location: location,
                expiry_date: expiryDate
            });
        }
        
        // Insert additional inventory in batches
        const batchSize = 10;
        let totalInserted = inserted.length;
        
        for (let i = 0; i < additionalInventory.length; i += batchSize) {
            const batch = additionalInventory.slice(i, i + batchSize);
            
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
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Final summary
        const { data: finalInventory, error: finalError } = await supabase
            .from('blood_inventory')
            .select('*')
            .order('blood_group');
            
        if (finalError) {
            console.error('❌ Final query error:', finalError.message);
        } else {
            console.log(`\n🎉 Blood Inventory Successfully Created!`);
            console.log(`📈 Total records: ${finalInventory.length}`);
            
            // Show summary by blood group
            const summary = {};
            let totalUnits = 0;
            
            finalInventory.forEach(item => {
                if (!summary[item.blood_group]) {
                    summary[item.blood_group] = { units: 0, count: 0 };
                }
                summary[item.blood_group].units += item.units_available;
                summary[item.blood_group].count++;
                totalUnits += item.units_available;
            });
            
            console.log('\n📊 Blood Group Summary:');
            Object.entries(summary).forEach(([bloodGroup, stats]) => {
                console.log(`${bloodGroup}: ${stats.units} units from ${stats.count} donations`);
            });
            
            console.log(`\n🩸 Total Blood Units Available: ${totalUnits}`);
            console.log(`🏥 Total Inventory Records: ${finalInventory.length}`);
            
            console.log('\n📋 Sample Inventory:');
            finalInventory.slice(0, 8).forEach((item, index) => {
                const daysToExpiry = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                const status = daysToExpiry > 0 ? `${daysToExpiry}d left` : 'expired';
                console.log(`   ${index + 1}. ${item.blood_group} - ${item.units_available} units at ${item.location} (${status})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Inventory creation error:', error);
    }
}

if (require.main === module) {
    addInventoryWithCurrentSchema().then(() => {
        console.log('\n✅ Blood inventory creation completed!');
        process.exit(0);
    });
}

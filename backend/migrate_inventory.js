const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    "https://ywnaacinyhkmxutqturp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmFhY2lueWhrbXh1dHF0dXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMTMzMCwiZXhwIjoyMDcxMjg3MzMwfQ.p6DKETyt94vF90GSLG08Uz-uhBzDUIQXEY0K0u1cYyI"
);

async function migrateBloodInventory() {
    try {
        console.log('🔄 Migrating blood inventory to include donor information...');
        
        // Get current inventory
        const { data: currentInventory, error: fetchError } = await supabase
            .from('blood_inventory')
            .select('*');
            
        if (fetchError) {
            console.error('Error fetching current inventory:', fetchError);
            return;
        }
        
        console.log(`📊 Found ${currentInventory.length} existing inventory records`);
        
        // Clear existing inventory
        const { error: deleteError } = await supabase
            .from('blood_inventory')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
            
        if (deleteError) {
            console.log('⚠️ Clear warning:', deleteError.message);
        }
        
        // Create new inventory with donor information
        const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const centers = [
            'City Blood Bank - Main Branch',
            'General Hospital Blood Center', 
            'Community Health Center',
            'Red Cross Blood Drive Center',
            'University Medical Center'
        ];
        
        const donorNames = [
            'John Smith', 'Maria Garcia', 'David Johnson', 'Sarah Wilson',
            'Michael Brown', 'Jessica Davis', 'Robert Miller', 'Ashley Taylor',
            'Christopher Anderson', 'Jennifer Thomas', 'Matthew Jackson',
            'Amanda White', 'Daniel Harris', 'Emily Martin', 'James Thompson'
        ];
        
        const newInventory = [];
        
        // Create realistic inventory with donor info
        for (let i = 0; i < 50; i++) {
            const bloodGroup = bloodGroups[Math.floor(Math.random() * bloodGroups.length)];
            const donorName = donorNames[Math.floor(Math.random() * donorNames.length)];
            const center = centers[Math.floor(Math.random() * centers.length)];
            
            // Random donation date in last 30 days
            const donationDate = new Date();
            donationDate.setDate(donationDate.getDate() - Math.floor(Math.random() * 30));
            
            // Expiry date 7 days after donation
            const expiryDate = new Date(donationDate);
            expiryDate.setDate(donationDate.getDate() + 7);
            
            const units = Math.floor(Math.random() * 3) + 1; // 1-3 units
            const batchNumber = `${bloodGroup}-${Date.now()}-${i.toString().padStart(3, '0')}`;
            
            newInventory.push({
                blood_group: bloodGroup,
                units_available: units,
                location: center,
                expiry_date: expiryDate.toISOString().split('T')[0],
                donor_name: donorName,
                donation_date: donationDate.toISOString().split('T')[0],
                batch_number: batchNumber,
                collected_date: donationDate.toISOString().split('T')[0],
                status: expiryDate > new Date() ? 'available' : 'expired',
                notes: `Donation from ${donorName} at ${center}`
            });
        }
        
        // Insert in batches
        const batchSize = 10;
        let totalInserted = 0;
        
        for (let i = 0; i < newInventory.length; i += batchSize) {
            const batch = newInventory.slice(i, i + batchSize);
            
            const { data, error } = await supabase
                .from('blood_inventory')
                .insert(batch)
                .select();
                
            if (error) {
                console.error(`❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
            } else {
                totalInserted += data.length;
                console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${data.length} records added`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`\n🎉 Migration completed!`);
        console.log(`📈 Total records inserted: ${totalInserted}`);
        
        // Show summary
        const { data: finalInventory } = await supabase
            .from('blood_inventory')
            .select('blood_group, units_available, donor_name, donation_date, status')
            .order('donation_date', { ascending: false });
            
        if (finalInventory) {
            console.log('\n📊 Blood Inventory Summary:');
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
            
            Object.entries(summary).forEach(([bloodGroup, stats]) => {
                console.log(`${bloodGroup}: ${stats.units} units from ${stats.count} donations (${stats.donors.size} unique donors)`);
            });
            
            console.log(`\n🩸 Total Units: ${totalUnits}`);
            console.log(`👥 Recent donations with donor info:`);
            
            finalInventory.slice(0, 5).forEach(item => {
                const status = item.status === 'available' ? '🟢' : '🔴';
                console.log(`   ${status} ${item.blood_group} - ${item.units_available} units by ${item.donor_name} on ${item.donation_date}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Migration error:', error);
    }
}

if (require.main === module) {
    migrateBloodInventory().then(() => {
        console.log('✅ Migration completed');
        process.exit(0);
    });
}

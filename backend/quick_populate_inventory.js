const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    "https://ywnaacinyhkmxutqturp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmFhY2lueWhrbXh1dHF0dXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMTMzMCwiZXhwIjoyMDcxMjg3MzMwfQ.p6DKETyt94vF90GSLG08Uz-uhBzDUIQXEY0K0u1cYyI"
);

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const centers = [
    'City Blood Bank - Main',
    'General Hospital Center',
    'Community Health Center',
    'Red Cross Blood Drive',
    'University Medical Center',
    'Emergency Blood Services'
];

// Generate random date in last 30 days
function getRandomDate() {
    const today = new Date();
    const daysBack = Math.floor(Math.random() * 30);
    const date = new Date(today);
    date.setDate(today.getDate() - daysBack);
    return date;
}

// Add 7 days for expiry
function getExpiryDate(donationDate) {
    const expiry = new Date(donationDate);
    expiry.setDate(donationDate.getDate() + 7);
    return expiry;
}

async function quickPopulateInventory() {
    try {
        console.log('🩸 Quick blood inventory population...');
        
        // Update existing blood groups with more realistic data
        const updates = [];
        
        for (const bloodGroup of bloodGroups) {
            // Generate 60-80 units for each blood group with random distribution across dates
            const unitsForThisGroup = 60 + Math.floor(Math.random() * 21); // 60-80 units
            
            const donationDate = getRandomDate();
            const expiryDate = getExpiryDate(donationDate);
            const location = centers[Math.floor(Math.random() * centers.length)];
            
            updates.push({
                blood_group: bloodGroup,
                units_available: unitsForThisGroup,
                expiry_date: expiryDate.toISOString().split('T')[0],
                location: location,
                created_at: donationDate.toISOString(),
                updated_at: donationDate.toISOString()
            });
        }
        
        // Use upsert to handle existing records
        for (const update of updates) {
            const { data, error } = await supabase
                .from('blood_inventory')
                .upsert(update, { 
                    onConflict: 'blood_group',
                    ignoreDuplicates: false 
                })
                .select();
                
            if (error) {
                console.log(`⚠️ Warning for ${update.blood_group}:`, error.message);
            } else {
                console.log(`✅ Updated ${update.blood_group}: ${update.units_available} units`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n🎉 Blood inventory updated successfully!');
        
        // Show final summary
        const { data: finalInventory } = await supabase
            .from('blood_inventory')
            .select('*')
            .order('blood_group');
            
        if (finalInventory) {
            console.log('\n📊 Final Blood Inventory:');
            let totalUnits = 0;
            
            finalInventory.forEach(item => {
                const isExpired = new Date(item.expiry_date) < new Date();
                const status = isExpired ? '🔴 EXPIRED' : '🟢 VALID';
                console.log(`${item.blood_group}: ${item.units_available} units ${status} (Expires: ${item.expiry_date})`);
                totalUnits += item.units_available;
            });
            
            console.log(`\n🩸 Total Blood Units: ${totalUnits}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

if (require.main === module) {
    quickPopulateInventory().then(() => {
        console.log('✅ Quick population completed');
        process.exit(0);
    });
}

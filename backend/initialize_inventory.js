const { createClient } = require('@supabase/supabase-js');

// Supabase Configuration
const supabaseUrl = "https://ywnaacinyhkmxutqturp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmFhY2lueWhrbXh1dHF0dXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMTMzMCwiZXhwIjoyMDcxMjg3MzMwfQ.p6DKETyt94vF90GSLG08Uz-uhBzDUIQXEY0K0u1cYyI";
const supabase = createClient(supabaseUrl, supabaseKey);

async function initializeBloodInventory() {
    console.log('🩸 Initializing Blood Inventory...');
    
    try {
        // First, let's check what tables exist
        console.log('📋 Checking existing inventory...');
        const { data: existingInventory, error: checkError } = await supabase
            .from('blood_inventory')
            .select('*');
            
        if (checkError) {
            console.error('❌ Error checking inventory:', checkError);
            return;
        }
        
        console.log(`✅ Found ${existingInventory?.length || 0} existing inventory items`);
        
        if (existingInventory && existingInventory.length > 0) {
            console.log('📊 Current inventory:');
            existingInventory.forEach(item => {
                console.log(`   ${item.blood_group}: ${item.units_available} units (expires: ${item.expiry_date})`);
            });
        }
        
        // If we have less than 8 blood groups, add missing ones
        const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const existingGroups = existingInventory?.map(item => item.blood_group) || [];
        const missingGroups = bloodGroups.filter(group => !existingGroups.includes(group));
        
        if (missingGroups.length > 0) {
            console.log(`📝 Adding missing blood groups: ${missingGroups.join(', ')}`);
            
            const newInventoryItems = missingGroups.map(bloodGroup => ({
                blood_group: bloodGroup,
                units_available: Math.floor(Math.random() * 10) + 1, // 1-10 units
                location: 'Main Blood Bank',
                expiry_date: new Date(Date.now() + Math.floor(Math.random() * 7 + 3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3-10 days from now
                status: 'available',
                batch_number: `INIT-${bloodGroup}-${Date.now()}`,
                collected_date: new Date().toISOString().split('T')[0],
                donation_date: new Date().toISOString().split('T')[0],
                donor_name: 'Anonymous Donor',
                notes: 'Initial inventory setup'
            }));
            
            const { data: insertedData, error: insertError } = await supabase
                .from('blood_inventory')
                .insert(newInventoryItems)
                .select('*');
                
            if (insertError) {
                console.error('❌ Error inserting inventory:', insertError);
            } else {
                console.log(`✅ Added ${insertedData?.length || 0} new inventory items`);
            }
        } else {
            console.log('✅ All blood groups are already present in inventory');
        }
        
        // Final check
        const { data: finalInventory, error: finalError } = await supabase
            .from('blood_inventory')
            .select('*')
            .order('blood_group');
            
        if (finalError) {
            console.error('❌ Error in final check:', finalError);
        } else {
            console.log('\n📊 Final Blood Inventory:');
            console.log('================================');
            finalInventory?.forEach(item => {
                console.log(`${item.blood_group.padEnd(4)}: ${item.units_available.toString().padEnd(2)} units | Expires: ${item.expiry_date} | Location: ${item.location}`);
            });
            console.log('================================');
            console.log(`Total Units: ${finalInventory?.reduce((sum, item) => sum + item.units_available, 0) || 0}`);
        }
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
    }
}

// Run the initialization
initializeBloodInventory().then(() => {
    console.log('🏁 Blood inventory initialization complete!');
    process.exit(0);
});

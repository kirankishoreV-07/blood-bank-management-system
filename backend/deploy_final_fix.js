const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// You'll need to add your Supabase credentials here
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deployFinalFix() {
    try {
        console.log('🩸 Starting Blood Bank Database Final Fix Deployment...');
        
        // Read the comprehensive SQL setup
        const sqlFilePath = path.join(__dirname, 'FINAL_comprehensive_inventory_setup.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('📋 Executing comprehensive database setup...');
        
        // Execute the SQL
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: sqlContent
        });
        
        if (error) {
            console.error('❌ Error executing SQL:', error);
            return;
        }
        
        console.log('✅ Database setup completed successfully!');
        
        // Test the fix by checking if the tables exist
        console.log('🔍 Verifying database structure...');
        
        const { data: tables, error: tableError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .in('table_name', ['users', 'donations', 'blood_inventory']);
            
        if (tableError) {
            console.error('❌ Error checking tables:', tableError);
            return;
        }
        
        console.log('📊 Database tables verified:', tables?.map(t => t.table_name));
        
        // Check blood inventory
        const { data: inventory, error: invError } = await supabase
            .from('blood_inventory')
            .select('blood_group, units_available')
            .limit(5);
            
        if (invError) {
            console.error('❌ Error checking inventory:', invError);
            return;
        }
        
        console.log('🩸 Sample blood inventory:', inventory);
        
        console.log('🎉 DEPLOYMENT COMPLETE! The blood_type and donor_blood_group errors should now be fixed.');
        console.log('💡 You can now test admin approval functionality.');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
    }
}

// Instructions for manual deployment
console.log(`
=============================================================================
🩸 BLOOD BANK DATABASE FIX - DEPLOYMENT INSTRUCTIONS
=============================================================================

Since you need to add your Supabase credentials, please follow these steps:

METHOD 1 - MANUAL (RECOMMENDED):
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of 'FINAL_comprehensive_inventory_setup.sql'
4. Click 'Run' to execute the script

METHOD 2 - AUTOMATED:
1. Edit this file (deploy_final_fix.js) 
2. Add your SUPABASE_URL and SUPABASE_SERVICE_KEY
3. Run: node deploy_final_fix.js

WHAT THIS FIX DOES:
✅ Creates proper users, donations, and blood_inventory tables
✅ Adds correct trigger function that uses blood_group instead of blood_type
✅ Populates sample blood inventory data
✅ Sets up proper indexes and relationships
✅ Fixes all field reference errors (blood_type, donor_blood_group)

AFTER DEPLOYMENT:
- Test admin approval functionality
- The "blood_type" and "donor_blood_group" errors should be gone
- Blood inventory will be automatically populated when donations are approved

=============================================================================
`);

module.exports = { deployFinalFix };

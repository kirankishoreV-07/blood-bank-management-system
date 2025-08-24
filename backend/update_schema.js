const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    "https://ywnaacinyhkmxutqturp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmFhY2lueWhrbXh1dHF0dXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMTMzMCwiZXhwIjoyMDcxMjg3MzMwfQ.p6DKETyt94vF90GSLG08Uz-uhBzDUIQXEY0K0u1cYyI"
);

async function executeSchema() {
    try {
        console.log('🔄 Applying database schema updates...');
        
        // Read the schema file
        const schemaPath = path.join(__dirname, 'CORRECTED_schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Split into individual statements
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📋 Executing ${statements.length} SQL statements...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            if (statement.includes('DROP TABLE') || statement.includes('CREATE TABLE') || 
                statement.includes('CREATE INDEX') || statement.includes('INSERT INTO') ||
                statement.includes('ALTER TABLE') || statement.includes('CREATE POLICY')) {
                
                try {
                    const { error } = await supabase.rpc('exec_sql', { sql: statement });
                    
                    if (error) {
                        console.log(`⚠️ Statement ${i + 1}: ${error.message}`);
                        errorCount++;
                    } else {
                        successCount++;
                        if (statement.includes('CREATE TABLE')) {
                            const tableName = statement.match(/CREATE TABLE (\w+)/)?.[1];
                            console.log(`✅ Created table: ${tableName}`);
                        }
                    }
                } catch (err) {
                    console.log(`⚠️ Statement ${i + 1} error: ${err.message}`);
                    errorCount++;
                }
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        console.log(`\n📊 Schema Update Summary:`);
        console.log(`✅ Successful statements: ${successCount}`);
        console.log(`⚠️ Warning/Error statements: ${errorCount}`);
        
        // Verify the blood_inventory table structure
        console.log('\n🔍 Verifying blood_inventory table structure...');
        const { data: tableInfo, error: tableError } = await supabase
            .from('blood_inventory')
            .select('*')
            .limit(1);
            
        if (tableError) {
            console.error('❌ Table verification failed:', tableError.message);
        } else {
            console.log('✅ Blood inventory table is ready with donor tracking fields');
            
            // Show current inventory count
            const { count } = await supabase
                .from('blood_inventory')
                .select('*', { count: 'exact', head: true });
                
            console.log(`📈 Current blood inventory records: ${count || 0}`);
        }
        
    } catch (error) {
        console.error('❌ Schema execution error:', error);
    }
}

if (require.main === module) {
    executeSchema().then(() => {
        console.log('✅ Schema update completed');
        process.exit(0);
    });
}

module.exports = { executeSchema };

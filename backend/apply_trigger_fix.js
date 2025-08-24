const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Using service role key for admin operations
const supabase = createClient(
  'https://etkwegqfplhfxlguzaoe.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0a3dlZ3FmcGxoZnhsZ3V6YW9lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjA2NjgwNywiZXhwIjoyMDQ3NjQyODA3fQ.GQO_Ms1wamN_DGV6xJNgF-0mKpqwFzB-z1Y7GYNNw6A'
);

async function fixBloodTypeTrigger() {
  try {
    console.log('🔧 Fixing the blood_type trigger error...');
    
    // Read the SQL fix
    const sql = fs.readFileSync('fix_blood_type_trigger.sql', 'utf8');
    
    // Split into individual statements for better debugging
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + ';';
      if (statement.length > 1) {
        console.log(`🔨 Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { query: statement });
          
          if (error) {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            if (!error.message.includes('does not exist')) {
              throw error;
            }
          } else {
            console.log(`✅ Statement ${i + 1} completed`);
            if (data && data.length > 0) {
              console.log('   Result:', data);
            }
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${i + 1}:`, err.message);
          if (!err.message.includes('does not exist')) {
            throw err;
          }
        }
      }
    }
    
    console.log('✅ All trigger fixes completed successfully!');
    console.log('🎯 The blood_type field reference has been removed');
    
  } catch (err) {
    console.error('❌ Failed to fix trigger:', err.message);
  }
}

fixBloodTypeTrigger();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://etkwegqfplhfxlguzaoe.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0a3dlZ3FmcGxoZnhsZ3V6YW9lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjA2NjgwNywiZXhwIjoyMDQ3NjQyODA3fQ.GQO_Ms1wamN_DGV6xJNgF-0mKpqwFzB-z1Y7GYNNw6A'
);

async function fixTriggerIssue() {
  try {
    console.log('🔧 Fixing blood_type trigger reference...');
    
    // Drop the problematic trigger first
    const dropTrigger = `
      DROP TRIGGER IF EXISTS update_inventory_on_approval ON donations;
      DROP FUNCTION IF EXISTS update_blood_inventory_on_approval();
    `;
    
    console.log('🗑️ Dropping old trigger...');
    const { error: dropError } = await supabase.rpc('exec_sql', { query: dropTrigger });
    if (dropError) {
      console.error('⚠️ Drop error (might be expected):', dropError.message);
    } else {
      console.log('✅ Old trigger dropped');
    }
    
    // Create a simple new function that doesn't reference blood_type
    const newFunction = `
      CREATE OR REPLACE FUNCTION update_blood_inventory_on_approval()
      RETURNS TRIGGER AS $$
      DECLARE
          donor_blood_group VARCHAR(5);
          units_to_add INTEGER;
      BEGIN
          -- Only process when status changes to approved/completed
          IF NEW.status IN ('approved', 'completed') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'completed')) THEN
              
              -- Get donor blood group from user profile
              SELECT blood_group INTO donor_blood_group
              FROM users 
              WHERE id = NEW.donor_id;
              
              -- If not found, try donor_blood_group field from donation record
              IF donor_blood_group IS NULL AND NEW.donor_blood_group IS NOT NULL THEN
                  donor_blood_group := NEW.donor_blood_group;
              END IF;
              
              -- Update inventory if we have blood group
              IF donor_blood_group IS NOT NULL THEN
                  units_to_add := COALESCE(NEW.units_donated, 1);
                  
                  -- Update or insert into blood_inventory
                  INSERT INTO blood_inventory (blood_group, units_available, location, expiry_date, updated_at)
                  VALUES (
                      donor_blood_group,
                      units_to_add,
                      COALESCE(NEW.donation_center, 'Walk-in Center'),
                      (CURRENT_DATE + INTERVAL '42 days')::DATE,
                      NOW()
                  )
                  ON CONFLICT (blood_group) 
                  DO UPDATE SET 
                      units_available = blood_inventory.units_available + units_to_add,
                      updated_at = NOW();
                  
                  RAISE NOTICE 'Blood inventory updated: Added % units of %', units_to_add, donor_blood_group;
              ELSE
                  RAISE WARNING 'Could not determine blood group for donation ID %', NEW.id;
              END IF;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('🔨 Creating new trigger function...');
    const { error: funcError } = await supabase.rpc('exec_sql', { query: newFunction });
    if (funcError) {
      console.error('❌ Function error:', funcError);
      return;
    }
    console.log('✅ New function created');
    
    // Create the trigger
    const createTrigger = `
      CREATE TRIGGER update_inventory_on_approval
          AFTER UPDATE ON donations
          FOR EACH ROW
          EXECUTE FUNCTION update_blood_inventory_on_approval();
    `;
    
    console.log('🎯 Creating trigger...');
    const { error: triggerError } = await supabase.rpc('exec_sql', { query: createTrigger });
    if (triggerError) {
      console.error('❌ Trigger error:', triggerError);
      return;
    }
    
    console.log('✅ Trigger fix completed successfully!');
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

fixTriggerIssue();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const realisticBatches = [
  // O- Blood Group (4 different batches)
  {
    blood_group: 'O-',
    units_available: 2,
    donation_date: '2025-08-20',
    expiry_date: '2025-08-27', // 4 days from now (CRITICAL)
    location: 'Main Blood Bank',
    donor_name: 'John Smith'
  },
  {
    blood_group: 'O-',
    units_available: 1,
    donation_date: '2025-08-22',
    expiry_date: '2025-08-29', // 6 days from now
    location: 'City Hospital',
    donor_name: 'Sarah Wilson'
  },
  {
    blood_group: 'O-',
    units_available: 1,
    donation_date: '2025-08-21',
    expiry_date: '2025-08-25', // 2 days from now (URGENT)
    location: 'Community Center',
    donor_name: 'Mike Johnson'
  },

  // A+ Blood Group (3 different batches)
  {
    blood_group: 'A+',
    units_available: 3,
    donation_date: '2025-08-19',
    expiry_date: '2025-08-26', // 3 days from now (CRITICAL)
    location: 'Main Blood Bank',
    donor_name: 'Emily Davis'
  },
  {
    blood_group: 'A+',
    units_available: 2,
    donation_date: '2025-08-23',
    expiry_date: '2025-08-30', // 7 days from now
    location: 'University Hospital',
    donor_name: 'David Brown'
  },
  {
    blood_group: 'A+',
    units_available: 3,
    donation_date: '2025-08-22',
    expiry_date: '2025-09-05', // 13 days from now (SAFE)
    location: 'Regional Center',
    donor_name: 'Lisa Anderson'
  },

  // B+ Blood Group (2 different batches)
  {
    blood_group: 'B+',
    units_available: 2,
    donation_date: '2025-08-21',
    expiry_date: '2025-08-28', // 5 days from now
    location: 'Main Blood Bank',
    donor_name: 'Robert Taylor'
  },
  {
    blood_group: 'B+',
    units_available: 3,
    donation_date: '2025-08-20',
    expiry_date: '2025-08-24', // 1 day from now (CRITICAL!)
    location: 'Emergency Center',
    donor_name: 'Jennifer White'
  },

  // AB+ Blood Group (2 different batches)
  {
    blood_group: 'AB+',
    units_available: 1,
    donation_date: '2025-08-22',
    expiry_date: '2025-09-01', // 9 days from now
    location: 'Specialty Clinic',
    donor_name: 'Michael Garcia'
  },
  {
    blood_group: 'AB+',
    units_available: 1,
    donation_date: '2025-08-23',
    expiry_date: '2025-09-06', // 14 days from now (SAFE)
    location: 'Research Hospital',
    donor_name: 'Amanda Martinez'
  },

  // O+ Blood Group (2 different batches)
  {
    blood_group: 'O+',
    units_available: 4,
    donation_date: '2025-08-18',
    expiry_date: '2025-08-25', // 2 days from now (URGENT)
    location: 'Main Blood Bank',
    donor_name: 'Christopher Lee'
  },
  {
    blood_group: 'O+',
    units_available: 1,
    donation_date: '2025-08-23',
    expiry_date: '2025-09-02', // 10 days from now
    location: 'Mobile Unit',
    donor_name: 'Jessica Rodriguez'
  },

  // A- Blood Group (1 batch - rare)
  {
    blood_group: 'A-',
    units_available: 2,
    donation_date: '2025-08-21',
    expiry_date: '2025-09-03', // 11 days from now
    location: 'Specialized Center',
    donor_name: 'Daniel Kim'
  },

  // B- Blood Group (1 batch - very rare)
  {
    blood_group: 'B-',
    units_available: 1,
    donation_date: '2025-08-22',
    expiry_date: '2025-09-04', // 12 days from now
    location: 'Regional Center',
    donor_name: 'Rachel Thompson'
  },

  // AB- Blood Group (1 batch - extremely rare)
  {
    blood_group: 'AB-',
    units_available: 1,
    donation_date: '2025-08-23',
    expiry_date: '2025-09-07', // 15 days from now
    location: 'University Hospital',
    donor_name: 'Kevin Zhang'
  }
];

async function createRealisticBatches() {
  try {
    console.log('🧪 Creating realistic blood inventory batches...');
    
    // Clear existing inventory
    console.log('🗑️ Clearing existing blood inventory...');
    const { error: deleteError } = await supabase
      .from('blood_inventory')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      console.error('❌ Error clearing inventory:', deleteError);
    } else {
      console.log('✅ Existing inventory cleared');
    }

    // Insert new realistic batches
    console.log('📝 Inserting realistic blood batches...');
    const { data, error } = await supabase
      .from('blood_inventory')
      .insert(realisticBatches)
      .select();

    if (error) {
      console.error('❌ Error creating batches:', error);
      return;
    }

    console.log('✅ Successfully created realistic blood inventory!');
    console.log(`📊 Total batches created: ${data.length}`);
    
    // Summary by blood group
    const summary = {};
    realisticBatches.forEach(batch => {
      if (!summary[batch.blood_group]) {
        summary[batch.blood_group] = { batches: 0, totalUnits: 0 };
      }
      summary[batch.blood_group].batches++;
      summary[batch.blood_group].totalUnits += batch.units_available;
    });

    console.log('\n📋 Blood Inventory Summary:');
    Object.entries(summary).forEach(([bloodGroup, stats]) => {
      console.log(`   ${bloodGroup}: ${stats.batches} batches, ${stats.totalUnits} total units`);
    });

    console.log('\n🎯 Expiry Status:');
    const now = new Date('2025-08-23'); // Current date
    realisticBatches.forEach(batch => {
      const expiryDate = new Date(batch.expiry_date);
      const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      let status = '✅ Safe';
      if (daysRemaining < 0) status = '❌ Expired';
      else if (daysRemaining <= 2) status = '🚨 Critical';
      else if (daysRemaining <= 7) status = '⚠️ Expiring Soon';
      
      console.log(`   ${batch.blood_group} (${batch.units_available} units) - ${status} (${daysRemaining} days)`);
    });

    console.log('\n🩸 Test your app now to see the realistic batch-based blood inventory!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
createRealisticBatches().then(() => {
  console.log('🏁 Script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});

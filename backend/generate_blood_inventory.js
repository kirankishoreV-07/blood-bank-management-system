const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || "https://ywnaacinyhkmxutqturp.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmFhY2lueWhrbXh1dHF0dXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMTMzMCwiZXhwIjoyMDcxMjg3MzMwfQ.p6DKETyt94vF90GSLG08Uz-uhBzDUIQXEY0K0u1cYyI";

const supabase = createClient(supabaseUrl, supabaseKey);

// Blood groups and compatibility rules
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Blood compatibility matrix - who can receive from whom
const bloodCompatibility = {
    'A+': ['A+', 'A-', 'O+', 'O-'],     // A+ can receive from A+, A-, O+, O-
    'A-': ['A-', 'O-'],                  // A- can receive from A-, O-
    'B+': ['B+', 'B-', 'O+', 'O-'],     // B+ can receive from B+, B-, O+, O-
    'B-': ['B-', 'O-'],                  // B- can receive from B-, O-
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // AB+ is universal recipient
    'AB-': ['A-', 'B-', 'AB-', 'O-'],   // AB- can receive from A-, B-, AB-, O-
    'O+': ['O+', 'O-'],                  // O+ can receive from O+, O-
    'O-': ['O-']                         // O- can only receive from O-
};

// Blood donation matrix - who can donate to whom
const bloodDonation = {
    'A+': ['A+', 'AB+'],                 // A+ can donate to A+, AB+
    'A-': ['A+', 'A-', 'AB+', 'AB-'],   // A- can donate to A+, A-, AB+, AB-
    'B+': ['B+', 'AB+'],                 // B+ can donate to B+, AB+
    'B-': ['B+', 'B-', 'AB+', 'AB-'],   // B- can donate to B+, B-, AB+, AB-
    'AB+': ['AB+'],                      // AB+ can only donate to AB+
    'AB-': ['AB+', 'AB-'],               // AB- can donate to AB+, AB-
    'O+': ['A+', 'B+', 'AB+', 'O+'],    // O+ can donate to A+, B+, AB+, O+
    'O-': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] // O- is universal donor
};

// Blood group rarity and demand factors
const bloodGroupData = {
    'O-': { rarity: 'rare', demand: 'very_high', population_percentage: 6.6 },
    'O+': { rarity: 'common', demand: 'high', population_percentage: 37.4 },
    'A-': { rarity: 'uncommon', demand: 'medium', population_percentage: 6.3 },
    'A+': { rarity: 'common', demand: 'medium', population_percentage: 35.7 },
    'B-': { rarity: 'rare', demand: 'medium', population_percentage: 1.5 },
    'B+': { rarity: 'uncommon', demand: 'medium', population_percentage: 8.5 },
    'AB-': { rarity: 'very_rare', demand: 'low', population_percentage: 0.6 },
    'AB+': { rarity: 'rare', demand: 'low', population_percentage: 3.4 }
};

// Donation centers
const donationCenters = [
    'City Blood Bank - Main Branch',
    'General Hospital Blood Center',
    'Community Health Center',
    'Red Cross Blood Drive Center',
    'University Medical Center',
    'Central Blood Bank',
    'Emergency Blood Services',
    'Mobile Blood Drive Unit',
    'Regional Medical Center',
    'District Health Center',
    'Metropolitan Blood Bank',
    'Suburban Health Center',
    'Downtown Medical Plaza',
    'Riverside Hospital Center',
    'Northside Community Center',
    'Westside Medical Complex',
    'East District Blood Center',
    'South Regional Hospital',
    'Children\'s Hospital Blood Bank',
    'Veterans Medical Center'
];

// Generate random date within last 30 days
function getRandomDonationDate() {
    const today = new Date();
    const daysBack = Math.floor(Math.random() * 30); // 0 to 29 days back
    const donationDate = new Date(today);
    donationDate.setDate(today.getDate() - daysBack);
    return donationDate;
}

// Generate expiry date (7 days from donation)
function getExpiryDate(donationDate) {
    const expiryDate = new Date(donationDate);
    expiryDate.setDate(donationDate.getDate() + 7);
    return expiryDate;
}

// Get compatible blood groups for a patient
function getCompatibleDonors(patientBloodGroup) {
    return bloodCompatibility[patientBloodGroup] || [];
}

// Get patients who can receive this blood group
function getCompatibleRecipients(donorBloodGroup) {
    return bloodDonation[donorBloodGroup] || [];
}

// Generate weighted blood group based on real-world distribution
function getWeightedBloodGroup() {
    const rand = Math.random() * 100;
    let cumulativePercentage = 0;
    
    for (const [bloodGroup, data] of Object.entries(bloodGroupData)) {
        cumulativePercentage += data.population_percentage;
        if (rand <= cumulativePercentage) {
            return bloodGroup;
        }
    }
    
    return 'O+'; // fallback
}

// Generate inventory items compatible with current schema
function generateInventoryItems(count = 500) {
    const inventoryItems = [];
    
    for (let i = 0; i < count; i++) {
        const bloodGroup = getWeightedBloodGroup(); // Use realistic distribution
        const donationCenter = donationCenters[Math.floor(Math.random() * donationCenters.length)];
        const donationDate = getRandomDonationDate();
        const expiryDate = getExpiryDate(donationDate);
        const unitsAvailable = Math.floor(Math.random() * 3) + 1; // 1 to 3 units per donation
        
        // Add blood group metadata
        const bloodGroupInfo = bloodGroupData[bloodGroup];
        const compatibleRecipients = getCompatibleRecipients(bloodGroup);
        
        inventoryItems.push({
            blood_group: bloodGroup,
            units_available: unitsAvailable,
            expiry_date: expiryDate.toISOString().split('T')[0], // YYYY-MM-DD format
            location: donationCenter,
            created_at: donationDate.toISOString(),
            updated_at: donationDate.toISOString()
        });
        
        // Store metadata separately for analysis (not saved to DB)
        inventoryItems[inventoryItems.length - 1]._analysis = {
            rarity: bloodGroupInfo.rarity,
            demand: bloodGroupInfo.demand,
            compatibleRecipients: compatibleRecipients,
            isUniversalDonor: bloodGroup === 'O-',
            isUniversalRecipient: bloodGroup === 'AB+'
        };
    }
    
    return inventoryItems;
}

// Main function to populate inventory
async function populateBloodInventory() {
    try {
        console.log('🩸 Starting blood inventory population...');
        
        // First, clear existing inventory data (except the basic 8 blood group entries)
        console.log('🧹 Clearing existing detailed inventory...');
        const { error: deleteError } = await supabase
            .from('blood_inventory')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
        
        if (deleteError) {
            console.log('⚠️ Clear inventory warning:', deleteError.message);
        } else {
            console.log('✅ Existing inventory cleared');
        }
        
        // Generate 500+ inventory items
        const inventoryItems = generateInventoryItems(500);
        
        console.log(`📊 Generated ${inventoryItems.length} inventory items`);
        
        // Insert in batches of 50 to avoid timeout (smaller batches for reliability)
        const batchSize = 50;
        const batches = [];
        
        for (let i = 0; i < inventoryItems.length; i += batchSize) {
            batches.push(inventoryItems.slice(i, i + batchSize));
        }
        
        console.log(`📦 Processing ${batches.length} batches of ${batchSize} items each...`);
        
        let totalInserted = 0;
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`🔄 Processing batch ${i + 1}/${batches.length}...`);
            
            // Remove analysis data before insertion
            const cleanBatch = batch.map(item => {
                const { _analysis, ...cleanItem } = item;
                return cleanItem;
            });
            
            const { data, error } = await supabase
                .from('blood_inventory')
                .insert(cleanBatch)
                .select();
            
            if (error) {
                console.error(`❌ Error in batch ${i + 1}:`, error.message);
                continue;
            }
            
            totalInserted += data.length;
            console.log(`✅ Batch ${i + 1} completed: ${data.length} items added`);
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`\n🎉 Blood inventory population completed!`);
        console.log(`📈 Total items inserted: ${totalInserted}`);
        
        // Generate summary with compatibility info
        const summary = {};
        const compatibilityStats = {
            universalDonorUnits: 0,
            universalRecipientUnits: 0,
            rareBloodUnits: 0,
            criticalShortages: []
        };
        
        inventoryItems.forEach(item => {
            const analysis = item._analysis;
            if (!summary[item.blood_group]) {
                summary[item.blood_group] = { 
                    count: 0, 
                    units: 0, 
                    expired: 0, 
                    valid: 0,
                    rarity: analysis.rarity,
                    demand: analysis.demand,
                    canDonateTo: analysis.compatibleRecipients,
                    isUniversalDonor: analysis.isUniversalDonor,
                    isUniversalRecipient: analysis.isUniversalRecipient
                };
            }
            summary[item.blood_group].count++;
            summary[item.blood_group].units += item.units_available;
            
            const isExpired = new Date(item.expiry_date) < new Date();
            if (isExpired) {
                summary[item.blood_group].expired += item.units_available;
            } else {
                summary[item.blood_group].valid += item.units_available;
                
                // Track special blood types
                if (analysis.isUniversalDonor) compatibilityStats.universalDonorUnits += item.units_available;
                if (analysis.isUniversalRecipient) compatibilityStats.universalRecipientUnits += item.units_available;
                if (analysis.rarity === 'rare' || analysis.rarity === 'very_rare') {
                    compatibilityStats.rareBloodUnits += item.units_available;
                }
            }
        });
        
        // Identify critical shortages
        Object.entries(summary).forEach(([bloodGroup, stats]) => {
            if (stats.valid < 5 || (stats.rarity === 'very_rare' && stats.valid < 3)) {
                compatibilityStats.criticalShortages.push({
                    bloodGroup,
                    validUnits: stats.valid,
                    rarity: stats.rarity,
                    canDonateTo: stats.canDonateTo
                });
            }
        });
        
        console.log('\n📊 Blood Group Summary with Compatibility:');
        Object.entries(summary).forEach(([bloodGroup, stats]) => {
            const urgency = stats.valid < 3 ? '🚨' : stats.valid < 5 ? '⚠️' : '✅';
            const rarity = stats.rarity === 'very_rare' ? '💎' : stats.rarity === 'rare' ? '🔶' : '🔵';
            console.log(`${urgency} ${rarity} ${bloodGroup}: ${stats.count} donations, ${stats.units} total units (${stats.valid} valid, ${stats.expired} expired)`);
            console.log(`   Can donate to: ${stats.canDonateTo.join(', ')}`);
            console.log(`   Rarity: ${stats.rarity}, Demand: ${stats.demand}`);
        });
        
        const totalUnits = Object.values(summary).reduce((sum, stats) => sum + stats.units, 0);
        const totalValid = Object.values(summary).reduce((sum, stats) => sum + stats.valid, 0);
        const totalExpired = Object.values(summary).reduce((sum, stats) => sum + stats.expired, 0);
        
        console.log(`\n🩸 Overall Summary:`);
        console.log(`Total Units: ${totalUnits}`);
        console.log(`Valid Units: ${totalValid}`);
        console.log(`Expired Units: ${totalExpired}`);
        console.log(`Expiry Rate: ${((totalExpired / totalUnits) * 100).toFixed(1)}%`);
        
        console.log(`\n🎯 Compatibility Analysis:`);
        console.log(`🩸 Universal Donor (O-) Units: ${compatibilityStats.universalDonorUnits}`);
        console.log(`🏥 Universal Recipient (AB+) Units: ${compatibilityStats.universalRecipientUnits}`);
        console.log(`💎 Rare Blood Type Units: ${compatibilityStats.rareBloodUnits}`);
        
        if (compatibilityStats.criticalShortages.length > 0) {
            console.log(`\n🚨 Critical Shortages:`);
            compatibilityStats.criticalShortages.forEach(shortage => {
                console.log(`   ${shortage.bloodGroup}: Only ${shortage.validUnits} units available (${shortage.rarity})`);
                console.log(`   Critical for patients: ${shortage.canDonateTo.join(', ')}`);
            });
        } else {
            console.log(`\n✅ No critical blood shortages detected`);
        }
        
    } catch (error) {
        console.error('❌ Error populating blood inventory:', error);
    }
}

// Run the population script
if (require.main === module) {
    populateBloodInventory().then(() => {
        console.log('✅ Script completed');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}

module.exports = { generateInventoryItems, populateBloodInventory };

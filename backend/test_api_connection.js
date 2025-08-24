const axios = require('axios');

async function testAPIConnection() {
    try {
        console.log('🔄 Testing API connection to backend...');
        
        // Test the debug blood inventory endpoint
        const response = await axios.get('http://192.168.29.212:3001/api/debug/blood-inventory');
        
        console.log('✅ API Connection Success!');
        console.log('📊 Blood Inventory Data:');
        console.log('Total entries:', response.data.count);
        
        if (response.data.inventory && response.data.inventory.length > 0) {
            console.log('\n📋 Sample Blood Inventory:');
            response.data.inventory.slice(0, 3).forEach((item, index) => {
                console.log(`${index + 1}. ${item.blood_group}: ${item.units_available} units at ${item.location}`);
            });
        }
        
        console.log('\n🎯 Frontend should now be able to connect to:', 'http://192.168.29.212:3001/api');
        
    } catch (error) {
        console.error('❌ API Connection Failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Backend server might not be running on the expected address');
            console.log('🔧 Try starting backend with: cd backend && node server.js');
        }
    }
}

testAPIConnection();

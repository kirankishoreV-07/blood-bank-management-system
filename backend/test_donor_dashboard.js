const axios = require('axios');
const jwt = require('jsonwebtoken');

// Test configuration
const BASE_URL = 'http://192.168.29.212:3000';
const JWT_SECRET = 'your_jwt_secret_key_here_make_it_secure';

// Create a test token for a donor
const testDonorPayload = {
  id: '550e8400-e29b-41d4-a716-446655440000', // Sample UUID
  email: 'testdonor@example.com',
  user_type: 'donor',
  full_name: 'Test Donor'
};

const testToken = jwt.sign(testDonorPayload, JWT_SECRET, { expiresIn: '1h' });

async function testDonorEndpoints() {
  console.log('🧪 Testing Donor Dashboard Endpoints');
  console.log('=====================================\n');
  
  const headers = {
    'Authorization': `Bearer ${testToken}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Donor Stats
    console.log('1. Testing /api/donor/stats');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/api/donor/stats`, { headers });
      console.log('✅ Stats endpoint working');
      console.log('📊 Stats data:', JSON.stringify(statsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Stats endpoint error:', error.response?.data || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Pending Donations
    console.log('2. Testing /api/donor/pending-donations');
    try {
      const pendingResponse = await axios.get(`${BASE_URL}/api/donor/pending-donations`, { headers });
      console.log('✅ Pending donations endpoint working');
      console.log('📋 Pending donations:', JSON.stringify(pendingResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Pending donations error:', error.response?.data || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Eligibility Check
    console.log('3. Testing /api/donor/eligibility');
    try {
      const eligibilityResponse = await axios.get(`${BASE_URL}/api/donor/eligibility`, { headers });
      console.log('✅ Eligibility endpoint working');
      console.log('🩺 Eligibility data:', JSON.stringify(eligibilityResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Eligibility error:', error.response?.data || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Blood Inventory (for dashboard context)
    console.log('4. Testing /api/blood-inventory');
    try {
      const inventoryResponse = await axios.get(`${BASE_URL}/api/blood-inventory`);
      console.log('✅ Blood inventory endpoint working');
      console.log('🩸 Sample inventory:', JSON.stringify(inventoryResponse.data.slice(0, 2), null, 2));
    } catch (error) {
      console.log('❌ Inventory error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.log('❌ General error:', error.message);
  }
}

// Run the tests
testDonorEndpoints().then(() => {
  console.log('\n🏁 Testing completed');
}).catch(error => {
  console.error('Test runner error:', error);
});

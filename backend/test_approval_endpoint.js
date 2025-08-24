const axios = require('axios');

async function testApproval() {
  try {
    console.log('🧪 Testing admin approval endpoint...');
    
    // First, let's get an admin token
    const loginResponse = await axios.post('http://192.168.29.212:3000/api/login', {
      email: 'admin@test.com',
      password: 'admin123',
      user_type: 'admin'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');
    
    // Get pending donations
    const donationsResponse = await axios.get('http://192.168.29.212:3000/api/admin/pending-donations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`📋 Found ${donationsResponse.data.length} pending donations`);
    
    if (donationsResponse.data.length > 0) {
      const donationId = donationsResponse.data[0].id;
      console.log(`🎯 Testing approval for donation: ${donationId}`);
      
      // Try to approve
      const approvalResponse = await axios.post(
        `http://192.168.29.212:3000/api/admin/approve-donation/${donationId}`,
        { action: 'approve', admin_notes: 'Test approval' },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      console.log('✅ Approval successful:', approvalResponse.data);
    } else {
      console.log('❌ No pending donations to test with');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testApproval();

const axios = require('axios');

async function createAdminAndTest() {
  try {
    console.log('👤 Creating admin user...');
    
    // Create admin user
    const signupResponse = await axios.post('http://192.168.29.212:3000/api/signup', {
      email: 'admin@test.com',
      password: 'admin123',
      full_name: 'Test Admin',
      user_type: 'admin',
      phone: '1234567890'
    });
    
    console.log('✅ Admin user created:', signupResponse.data);
    
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      console.log('ℹ️ Admin user already exists');
    } else {
      console.error('❌ Failed to create admin:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }
  
  try {
    console.log('🔑 Testing admin login...');
    
    // Login as admin
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
      const donation = donationsResponse.data[0];
      console.log(`🎯 Testing approval for donation:`, {
        id: donation.id,
        donor: donation.donor_name,
        status: donation.status,
        fields: Object.keys(donation)
      });
      
      // Try to approve - this should trigger the blood_type error
      const approvalResponse = await axios.post(
        `http://192.168.29.212:3000/api/admin/approve-donation/${donation.id}`,
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

createAdminAndTest();

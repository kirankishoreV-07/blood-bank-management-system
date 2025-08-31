import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base API URL - Multiple options for different network configurations
// Try different IP addresses based on your network setup
const API_ENDPOINTS = [
  'http://192.168.29.237:3000/api',   // Current working IP (August 31, 2025 - FIXED PORT 3000)
  'http://10.12.87.71:3000/api',      // Previous IP
  'http://10.12.85.87:3000/api',      // Previous IP
  'http://10.12.85.63:3000/api',      // Previous IP
  'http://192.168.29.212:3000/api',   // Previous IP
  'http://10.12.87.10:3000/api',      // Previous IP
  'http://10.46.61.122:3000/api',     // Previous IP
  'http://localhost:3000/api',        // Localhost for simulator
  'http://127.0.0.1:3000/api'         // Fallback localhost
];

// Test connectivity function for debugging
const testConnectivity = async () => {
  console.log('🧪 Starting comprehensive connectivity test...');
  
  const testEndpoints = [
    'http://192.168.29.237:3000/api/network-test', // Current working IP (FIXED PORT 3000)
    'http://10.12.87.71:3000/api/network-test',    // Previous IP
    'http://10.12.85.87:3000/api/network-test',    // Previous IP
    'http://10.12.85.63:3000/api/network-test',    // Previous IP
    'http://192.168.29.212:3000/api/network-test', // Previous IP
    'http://10.12.87.10:3000/api/network-test',    // Previous IP
    'http://10.46.61.122:3000/api/network-test',   // Previous IP
    'http://localhost:3000/api/network-test',       // Localhost for simulator
    'http://127.0.0.1:3000/api/network-test'        // Fallback localhost
  ];

  for (const endpoint of testEndpoints) {
    try {
      console.log(`🔍 Testing: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BloodBankApp/1.0 (React Native)'
        },
        timeout: 10000
      });
      
      const data = await response.json();
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      console.log(`✅ Response:`, data);
      
      if (response.ok) {
        return endpoint.replace('/network-test', '');
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error:`, error.message);
    }
  }
  
  console.log('❌ All connectivity tests failed');
  return null;
};

// Function to test which endpoint is working
const findWorkingEndpoint = async () => {
  for (const endpoint of API_ENDPOINTS) {
    try {
      const testUrl = endpoint.replace('/api', '/api/network-test');
      console.log('🔍 Testing endpoint:', testUrl);
      const response = await axios.get(testUrl, { 
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BloodBankApp/1.0'
        }
      });
      if (response.status === 200 && response.data.status === 'SUCCESS') {
        console.log('✅ Working API endpoint found:', endpoint);
        console.log('✅ Server response:', response.data.message);
        return endpoint;
      }
    } catch (error) {
      console.log('❌ Failed endpoint:', endpoint, error.code || error.message);
      if (error.response) {
        console.log('❌ Response status:', error.response.status);
        console.log('❌ Response data:', error.response.data);
      }
    }
  }
  console.error('❌ No working API endpoint found');
  return API_ENDPOINTS[0]; // Fallback to first endpoint
};

// Set the working endpoint
let BASE_URL = API_ENDPOINTS[0]; // Default

// Test endpoints on app startup
findWorkingEndpoint().then(workingEndpoint => {
  BASE_URL = workingEndpoint;
  console.log('🔗 API Base URL set to:', BASE_URL);
});

// Create axios instance with dynamic base URL and enhanced error handling
const createApiInstance = () => {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000, // Increased to 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
    // Add retry configuration
    retry: 3,
    retryDelay: 2000,
  });
  
  // Enhanced response interceptor for debugging
  instance.interceptors.response.use(
    (response) => {
      console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`);
      return response;
    },
    async (error) => {
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
      
      if (error.response) {
        console.error('📊 Response status:', error.response.status);
        console.error('📊 Response data:', error.response.data);
      } else if (error.request) {
        console.error('📡 No response received');
        console.error('📡 Request details:', {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          timeout: error.config?.timeout
        });
        
        // For network errors, try alternative endpoints
        if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
          console.log('🔄 Network error detected, attempting endpoint fallback...');
          const workingEndpoint = await findWorkingEndpoint();
          if (workingEndpoint && workingEndpoint !== BASE_URL) {
            console.log('🔄 Switching to working endpoint:', workingEndpoint);
            updateApiInstance(workingEndpoint);
            // Retry the original request with new endpoint
            return instance.request(error.config);
          }
        }
      }
      
      return Promise.reject(error);
    }
  );
  
  return instance;
};

// Initial API instance
let api = createApiInstance();

// Function to update API instance with working endpoint
const updateApiInstance = (newBaseUrl) => {
  console.log('🔄 Updating API instance...');
  console.log('🔄 Old base URL:', BASE_URL);
  console.log('🔄 New base URL:', newBaseUrl);
  
  BASE_URL = newBaseUrl;
  api = createApiInstance();
  
  console.log('✅ API instance updated successfully');
  console.log('✅ Current base URL:', BASE_URL);
  
  // Re-add request interceptor to new instance
  api.interceptors.request.use(
    async (config) => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔑 Auth token added to request');
        } else {
          console.warn('⚠️ No auth token found');
        }
      } catch (error) {
        console.error('❌ Error getting auth token:', error);
      }
      return config;
    },
    (error) => {
      console.error('❌ Request interceptor error:', error);
      return Promise.reject(error);
    }
  );
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.log('🔍 API Error Details:', {
      message: error.message,
      code: error.code,
      baseURL: api.defaults.baseURL,
      url: error.config?.url
    });

    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      // Try to find a working endpoint
      console.log('🔄 Network error detected, trying alternative endpoints...');
      const workingEndpoint = await findWorkingEndpoint();
      if (workingEndpoint !== BASE_URL) {
        updateApiInstance(workingEndpoint);
        // Retry the original request with new endpoint
        return api.request(error.config);
      }
    }

    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    }
    
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
    // Register user
  register: async (userData) => {
    try {
      console.log('Registering user with data:', userData);
      const response = await api.post('/register', userData);
      console.log('Registration response:', response.data);
      
      if (response.data.token) {
        await AsyncStorage.setItem('authToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle different types of errors
      if (error.code === 'ECONNABORTED') {
        throw { error: 'Request timeout', message: 'The request took too long. Please check your internet connection and try again.' };
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw { error: 'Network error', message: 'Unable to connect to the server. Please check your internet connection.' };
      } else if (error.response?.data) {
        throw error.response.data;
      } else {
        throw { error: 'Registration failed', message: 'An unexpected error occurred. Please try again.' };
      }
    }
  },

  // Login user
  login: async (email, password, userType) => {
    try {
      console.log('Logging in user:', { email, userType });
      const response = await api.post('/login', {
        email: email.toLowerCase(),
        password,
        user_type: userType,
      });
      console.log('Login response:', response.data);
      
      if (response.data.token) {
        await AsyncStorage.setItem('authToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different types of errors
      if (error.code === 'ECONNABORTED') {
        throw { error: 'Request timeout', message: 'The request took too long. Please check your internet connection and try again.' };
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw { error: 'Network error', message: 'Unable to connect to the server. Please check your internet connection.' };
      } else if (error.response?.data) {
        throw error.response.data;
      } else {
        throw { error: 'Login failed', message: 'An unexpected error occurred. Please try again.' };
      }
    }
  },

  // Logout user
  logout: async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },

  // Get stored user data
  getCurrentUser: async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return !!token;
    } catch (error) {
      return false;
    }
  },
};

// User Services
export const userService = {
  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/profile', profileData);
      if (response.data.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Blood Request Services
export const bloodRequestService = {
  // Create blood request
  createRequest: async (requestData) => {
    try {
      const response = await api.post('/blood-request', requestData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get blood requests
  getRequests: async () => {
    try {
      const response = await api.get('/blood-requests');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Donation Services
export const donationService = {
  // Record donation
  recordDonation: async (donationData) => {
    try {
      const response = await api.post('/donation', donationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get donations
  getDonations: async () => {
    try {
      const response = await api.get('/donations');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Enhanced Donor Services
export const donorService = {
  // Check donor eligibility (buffer period validation)
  checkEligibility: async () => {
    try {
      const response = await api.get('/donor/check-eligibility');
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get donation centers
  getDonationCenters: async () => {
    try {
      const response = await api.get('/donation-centers');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Schedule donation appointment
  scheduleDonation: async (appointmentData) => {
    try {
      const response = await api.post('/donor/schedule-donation', appointmentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get pending donations for donor
  getPendingDonations: async () => {
    try {
      const response = await api.get('/donor/pending-donations');
      return { success: true, pendingDonations: response.data.pendingDonations };
    } catch (error) {
      console.error('Get pending donations error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch pending donations' 
      };
    }
  },

  // Enhanced: Submit donation request for admin approval with risk assessment
  submitDonationRequest: async (donationRequestData) => {
    try {
      const response = await api.post('/donor/submit-donation-request', donationRequestData);
      return { success: true, ...response.data };
    } catch (error) {
      console.error('Submit donation request error:', error);
      throw error.response?.data || error;
    }
  },

  // Enhanced: Get donor statistics with pending approvals and risk assessment
  getEnhancedStats: async () => {
    try {
      const response = await api.get('/donor/enhanced-stats');
      return response.data;
    } catch (error) {
      console.error('Get enhanced donor stats error:', error);
      throw error.response?.data || error;
    }
  },

  // Submit walk-in donation (enhanced with better error handling and retry logic)
  submitWalkInDonation: async (donationData) => {
    try {
      console.log('🩸 Submitting walk-in donation:', donationData);
      console.log('🔗 Using API base URL:', BASE_URL);
      
      // Ensure we have a valid auth token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }
      console.log('🔑 Auth token found, length:', token.length);
      
      // Test connectivity first
      try {
        console.log('🧪 Testing API connectivity before donation submission...');
        const testResponse = await api.get('/network-test');
        console.log('✅ Connectivity test passed:', testResponse.data);
      } catch (testError) {
        console.warn('⚠️ Connectivity test failed, but proceeding with submission:', testError.message);
      }
      
      // Attempt submission with retry logic
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 Donation submission attempt ${attempt}/3`);
          const response = await api.post('/donor/walk-in-donation', donationData);
          console.log('✅ Donation submission successful:', response.data);
          return { success: true, ...response.data };
        } catch (attemptError) {
          lastError = attemptError;
          console.error(`❌ Attempt ${attempt} failed:`, attemptError.message);
          
          if (attempt < 3) {
            console.log(`⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // All attempts failed, throw the last error
      throw lastError;
      
    } catch (error) {
      console.error('💥 Submit walk-in donation error:', error);
      
      // Enhanced error details for debugging
      if (error.response) {
        console.error('📊 Error response status:', error.response.status);
        console.error('📊 Error response data:', error.response.data);
        console.error('📊 Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('📡 No response received:', error.request);
        console.error('📡 Request config:', error.config);
      } else {
        console.error('⚙️ Request setup error:', error.message);
      }
      
      throw error; // Re-throw to handle in component
    }
  },

  // Record walk-in donation (legacy method)
  recordWalkInDonation: async (donationData) => {
    try {
      const response = await api.post('/donor/walk-in-donation', donationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get donor statistics (legacy)
  getDonorStats: async () => {
    try {
      // Try enhanced stats first, fallback to regular stats
      try {
        const enhancedResponse = await api.get('/donor/enhanced-stats');
        return enhancedResponse.data;
      } catch (enhancedError) {
        console.log('Enhanced stats not available, using legacy endpoint');
        const response = await api.get('/donor/stats');
        return response.data;
      }
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Schedule appointment
  scheduleAppointment: async (appointmentData) => {
    try {
      const response = await api.post('/donor/schedule-donation', appointmentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Record past donation
  recordPastDonation: async (donationData) => {
    try {
      const response = await api.post('/donor/past-donation', donationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Debug and Testing Utilities
export const debugService = {
  // Test API connectivity
  testConnection: async () => {
    try {
      console.log('🧪 Testing API connection...');
      console.log('🔗 Current base URL:', BASE_URL);
      
      const response = await api.get('/network-test');
      console.log('✅ Connection test successful:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test authentication
  testAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        return { success: false, error: 'No auth token found' };
      }
      
      console.log('🔑 Testing authentication...');
      const response = await api.get('/debug/auth-test');
      console.log('✅ Auth test successful:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Auth test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test donation submission with dummy data
  testDonationSubmission: async () => {
    try {
      console.log('🩸 Testing donation submission...');
      const dummyData = {
        donation_center: 'Test Center',
        units_donated: 1,
        notes: 'API Test Donation',
        status: 'pending_admin_approval'
      };
      
      const response = await api.post('/donor/walk-in-donation', dummyData);
      console.log('✅ Test donation submission successful:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Test donation submission failed:', error);
      return { success: false, error: error.message, details: error.response?.data };
    }
  },

  // Get current API configuration
  getApiConfig: () => {
    return {
      baseURL: BASE_URL,
      endpoints: API_ENDPOINTS,
      timeout: 30000
    };
  },

  // Force endpoint refresh
  refreshEndpoint: async () => {
    console.log('🔄 Forcing endpoint refresh...');
    const workingEndpoint = await findWorkingEndpoint();
    if (workingEndpoint) {
      updateApiInstance(workingEndpoint);
      return { success: true, endpoint: workingEndpoint };
    } else {
      return { success: false, error: 'No working endpoint found' };
    }
  }
};

// Admin Services
export const adminService = {
  // Get dashboard stats
  getDashboard: async () => {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all users
  getAllUsers: async () => {
    try {
      const response = await api.get('/admin/users');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update user status
  updateUserStatus: async (userId, isActive) => {
    try {
      const response = await api.post(`/admin/update-user-status/${userId}`, { isActive });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get user analytics
  getUserAnalytics: async () => {
    try {
      const response = await api.get('/admin/user-analytics');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get donation analytics
  getDonationAnalytics: async () => {
    try {
      const response = await api.get('/admin/donation-analytics');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get inventory analytics
  getInventoryAnalytics: async () => {
    try {
      const response = await api.get('/admin/inventory-analytics');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get system health
  getSystemHealth: async () => {
    try {
      const response = await api.get('/admin/system-health');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get pending donations for approval (fixed to use legacy endpoint)
  getPendingDonations: async () => {
    try {
      // Use legacy endpoint that queries 'donations' table directly
      // This matches where donor submissions actually go
      console.log('🔍 Admin getting pending donations from /admin/pending-donations');
      const response = await api.get('/admin/pending-donations');
      console.log('✅ Admin pending donations response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Admin pending donations error:', error);
      throw error.response?.data || error;
    }
  },

  // Enhanced: Process donation request (approve/reject with risk validation)
  processDonationRequest: async (pendingId, action, adminNotes = '') => {
    try {
      const response = await api.post(`/admin/process-donation-request/${pendingId}`, {
        action,
        admin_notes: adminNotes
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Approve or reject donation (fixed to use correct endpoint)
  approveDonation: async (donationId, action, adminNotes = '') => {
    try {
      console.log('🔄 Processing donation approval:', { donationId, action, adminNotes });
      
      // Use legacy endpoint that works with 'donations' table
      // This matches where walk-in donations are stored
      const response = await api.post(`/admin/approve-donation/${donationId}`, {
        action,
        admin_notes: adminNotes
      });
      
      console.log('✅ Donation approval response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Donation approval error:', error);
      console.error('❌ Error details:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  // Get blood inventory
  getBloodInventory: async () => {
    try {
      console.log('🔍 Fetching blood inventory from admin endpoint...');
      
      // Try the admin endpoint first
      try {
        const response = await api.get('/admin/blood-inventory');
        console.log('✅ Admin endpoint successful');
        return response.data;
      } catch (adminError) {
        console.log('⚠️ Admin endpoint failed, trying debug endpoint...');
        console.error('Admin endpoint error:', adminError.message);
        
        // Fallback to debug endpoint that doesn't require auth
        const debugResponse = await fetch(`${BASE_URL.replace('/api', '')}/api/debug/blood-inventory-public`);
        const debugData = await debugResponse.json();
        
        if (debugData.success) {
          console.log('✅ Debug endpoint successful');
          // Transform the debug data to match expected format
          return {
            inventory: debugData.inventory || [],
            summary: {
              totalUnits: debugData.inventory?.reduce((sum, item) => sum + item.units_available, 0) || 0,
              bloodGroups: debugData.inventory?.length || 0
            }
          };
        } else {
          throw new Error('Debug endpoint failed: ' + debugData.message);
        }
      }
    } catch (error) {
      console.error('❌ Blood inventory fetch failed:', error);
      throw error.response?.data || error;
    }
  },

  // Get blood compatibility for a patient
  getBloodCompatibility: async (patientBloodGroup) => {
    try {
      const response = await api.get(`/blood-compatibility/${patientBloodGroup}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default api;

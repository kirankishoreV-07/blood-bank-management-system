// Simple fetch-based API service for testing
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.29.237:3000/api';

// Simple fetch wrapper
const apiRequest = async (endpoint, options = {}) => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'BloodBankApp/1.0'
    };
    
    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }
    
    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };
    
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🌐 Making request to: ${url}`);
    console.log(`🌐 Config:`, config);
    
    const response = await fetch(url, config);
    
    console.log(`🌐 Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`🌐 Response data:`, data);
    
    return data;
  } catch (error) {
    console.error(`🌐 API Request failed:`, error);
    throw error;
  }
};

// Test connectivity
export const testConnection = async () => {
  try {
    console.log('🧪 Testing connection with fetch...');
    const response = await apiRequest('/network-test');
    console.log('✅ Connection test successful:', response);
    return response;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    throw error;
  }
};

// Login function
export const login = async (email, userType, password) => {
  try {
    console.log('🔐 Attempting login...');
    const response = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        userType,
        password
      })
    });
    
    if (response.token) {
      await AsyncStorage.setItem('authToken', response.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
    }
    
    return response;
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
};

export default {
  testConnection,
  login
};

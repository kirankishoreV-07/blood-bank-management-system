import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { testConnection } from '../services/simpleApi';

const NetworkTestScreen = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addTestResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { message, type, timestamp }]);
  };

  const runNetworkTest = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    addTestResult('🧪 Starting network connectivity test...', 'info');
    
    try {
      // Test simple fetch to network-test endpoint
      addTestResult('📡 Testing fetch to network-test endpoint...', 'info');
      const result = await testConnection();
      addTestResult(`✅ Success: ${result.message}`, 'success');
      addTestResult(`📊 Server timestamp: ${result.timestamp}`, 'info');
    } catch (error) {
      addTestResult(`❌ Network test failed: ${error.message}`, 'error');
    }
    
    // Test different endpoints
    const testUrls = [
      'http://10.46.61.122:3001/api/health',
      'http://10.46.61.122:3001/api/network-test',
      'http://10.12.87.10:3001/api/health',
      'http://10.12.87.10:3002/api/test',
      'http://192.168.29.212:3001/api/health',
      'http://localhost:3001/api/health'
    ];
    
    for (const url of testUrls) {
      try {
        addTestResult(`🔍 Testing: ${url}`, 'info');
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        if (response.ok) {
          const data = await response.json();
          addTestResult(`✅ ${url} - OK`, 'success');
        } else {
          addTestResult(`⚠️ ${url} - Status: ${response.status}`, 'warning');
        }
      } catch (error) {
        addTestResult(`❌ ${url} - Error: ${error.message}`, 'error');
      }
    }
    
    addTestResult('🏁 Network test completed', 'info');
    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getResultColor = (type) => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      default: return '#2196F3';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Connectivity Test</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: isLoading ? '#ccc' : '#2196F3' }]}
          onPress={runNetworkTest}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Run Network Test'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#757575' }]}
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={[styles.timestamp, { color: getResultColor(result.type) }]}>
              {result.timestamp}
            </Text>
            <Text style={[styles.resultText, { color: getResultColor(result.type) }]}>
              {result.message}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 10
  },
  resultItem: {
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  timestamp: {
    fontSize: 12,
    marginRight: 10,
    minWidth: 80
  },
  resultText: {
    fontSize: 14,
    fontFamily: 'monospace',
    flex: 1
  }
});

export default NetworkTestScreen;

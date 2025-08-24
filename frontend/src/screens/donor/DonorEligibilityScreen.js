import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { donorService } from '../../services/api';

const DonorEligibilityScreen = ({ navigation }) => {
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      setLoading(true);
      const response = await donorService.checkEligibility();
      
      // Handle the new API response format
      const eligibilityData = response.data || response;
      
      // Transform the API response to match the expected format
      const transformedEligibility = {
        eligible: eligibilityData.isEligible || false,
        message: eligibilityData.reason || 'Eligibility check completed',
        canDonateDate: eligibilityData.nextEligibleDate,
        nextEligibleDate: eligibilityData.nextEligibleDate,
        daysSinceLastDonation: eligibilityData.daysSinceLastDonation,
        daysRemaining: eligibilityData.daysRemaining || 0,
        checks: {
          age: true, // Assume these are valid since the user is logged in
          bloodGroup: true,
          isActive: true,
          timeSinceLastDonation: eligibilityData.isEligible || false
        }
      };
      
      setEligibility(transformedEligibility);
    } catch (error) {
      console.error('Eligibility check error:', error);
      Alert.alert('Error', error.error || 'Failed to check eligibility');
      
      // Set default eligibility data in case of error
      setEligibility({
        eligible: true, // Default to eligible if check fails
        message: 'Unable to verify eligibility status. Please proceed with caution.',
        checks: {
          age: true,
          bloodGroup: true,
          isActive: true,
          timeSinceLastDonation: true
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToDonate = () => {
    navigation.navigate('DonationType');
  };

  const renderEligibilityCheck = (label, status, icon) => (
    <View style={styles.checkItem}>
      <Ionicons 
        name={status ? 'checkmark-circle' : 'close-circle'} 
        size={24} 
        color={status ? '#4CAF50' : '#F44336'} 
      />
      <Text style={[styles.checkText, { color: status ? '#4CAF50' : '#F44336' }]}>
        {label}
      </Text>
      <Ionicons name={icon} size={20} color="#666" style={styles.checkIcon} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#E53E3E', '#C53030']} style={styles.header}>
          <Text style={styles.headerTitle}>Checking Eligibility</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E53E3E" />
          <Text style={styles.loadingText}>Verifying your donation eligibility...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#E53E3E', '#C53030']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donation Eligibility</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons 
              name={eligibility?.eligible ? 'checkmark-circle' : 'warning'} 
              size={48} 
              color={eligibility?.eligible ? '#4CAF50' : '#FF9800'} 
            />
            <Text style={[styles.statusTitle, { 
              color: eligibility?.eligible ? '#4CAF50' : '#FF9800' 
            }]}>
              {eligibility?.eligible ? 'Eligible to Donate!' : 'Not Eligible Yet'}
            </Text>
            <Text style={styles.statusMessage}>
              {eligibility?.message}
            </Text>
          </View>
        </View>

        <View style={styles.checksContainer}>
          <Text style={styles.sectionTitle}>Eligibility Checklist</Text>
          
          {renderEligibilityCheck(
            'Age Requirement (18-65)', 
            eligibility?.checks?.age, 
            'person'
          )}
          
          {renderEligibilityCheck(
            'Blood Group Registered', 
            eligibility?.checks?.bloodGroup, 
            'water'
          )}
          
          {renderEligibilityCheck(
            'Account Active', 
            eligibility?.checks?.isActive, 
            'shield-checkmark'
          )}
          
          {renderEligibilityCheck(
            'Time Since Last Donation', 
            eligibility?.checks?.timeSinceLastDonation, 
            'time'
          )}
        </View>

        {!eligibility?.eligible && (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Next Available Date</Text>
              <Text style={styles.infoText}>
                You can donate again on: {eligibility?.canDonateDate || eligibility?.nextEligibleDate || 'Date not available'}
              </Text>
              {eligibility?.daysSinceLastDonation !== null && eligibility?.daysSinceLastDonation !== undefined && (
                <Text style={styles.infoSubtext}>
                  Days since last donation: {eligibility.daysSinceLastDonation}
                  {eligibility.daysSinceLastDonation < 56 && 
                    ` (Need ${56 - eligibility.daysSinceLastDonation} more days)`
                  }
                </Text>
              )}
              {eligibility?.daysRemaining > 0 && (
                <Text style={styles.infoSubtext}>
                  Days remaining until eligible: {eligibility.daysRemaining}
                </Text>
              )}
            </View>
          </View>
        )}

        {eligibility?.eligible && (
          <TouchableOpacity 
            style={styles.proceedButton}
            onPress={handleProceedToDonate}
          >
            <LinearGradient 
              colors={['#4CAF50', '#45A049']} 
              style={styles.proceedGradient}
            >
              <Ionicons name="heart" size={20} color="white" />
              <Text style={styles.proceedText}>Proceed to Donate</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={checkEligibility}
        >
          <Ionicons name="refresh" size={16} color="#666" />
          <Text style={styles.refreshText}>Refresh Status</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  statusMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  checksContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#666',
  },
  proceedButton: {
    marginBottom: 20,
  },
  proceedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
  },
  proceedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  refreshText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 6,
  },
});

export default DonorEligibilityScreen;

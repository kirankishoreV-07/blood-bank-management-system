import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CheckBox from 'expo-checkbox';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const WalkInDonationScreenNew = ({ navigation }) => {
  // Simple state management
  const [currentStep, setCurrentStep] = useState(1);
  const [eligibilityScore, setEligibilityScore] = useState(100);
  const [lastDonation, setLastDonation] = useState('');
  const [weight, setWeight] = useState('');
  const [recentIllness, setRecentIllness] = useState(false);
  const [alcohol24h, setAlcohol24h] = useState(false);

  // Calculate eligibility score
  const calculateScore = () => {
    let score = 100;
    
    // Check last donation (56 days gap required)
    if (lastDonation && lastDonation.trim()) {
      try {
        const lastDate = new Date(lastDonation);
        const currentDate = new Date();
        const daysSince = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
        
        if (!isNaN(daysSince) && daysSince < 56) {
          score -= 50;
        }
      } catch (error) {
        // Invalid date format
      }
    }
    
    // Check weight
    const weightNum = parseFloat(weight);
    if (weight && !isNaN(weightNum)) {
      if (weightNum < 50) {
        score -= 40;
      } else if (weightNum < 55) {
        score -= 10;
      }
    }
    
    // Check other factors
    if (recentIllness) score -= 25;
    if (alcohol24h) score -= 20;
    
    const finalScore = Math.max(0, Math.min(100, score));
    setEligibilityScore(finalScore);
    return finalScore;
  };

  // Update score when inputs change
  useEffect(() => {
    calculateScore();
  }, [lastDonation, weight, recentIllness, alcohol24h]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#4CAF50', '#45A049']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Walk-In Donation</Text>
      </LinearGradient>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${(currentStep / 5) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Step {currentStep} of 5: {
            currentStep === 1 ? 'Eligibility Check' :
            currentStep === 2 ? 'Health Screening' :
            currentStep === 3 ? 'Location Selection' :
            currentStep === 4 ? 'Appointment Booking' :
            'Confirmation'
          }
        </Text>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        
        {/* Impact Tracker - Show only on Step 1 */}
        {currentStep === 1 && (
          <View style={styles.impactCard}>
            <Text style={styles.impactTitle}>❤️ Your Donation Impact</Text>
            <View style={styles.impactStats}>
              <View style={styles.impactStat}>
                <Text style={styles.impactNumber}>0</Text>
                <Text style={styles.impactLabel}>Total Donations</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.impactNumber}>0</Text>
                <Text style={styles.impactLabel}>Lives Impacted</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.impactNumber}>5</Text>
                <Text style={styles.impactLabel}>To Next Badge</Text>
              </View>
            </View>
          </View>
        )}

        {/* Step 1: Eligibility Check */}
        {currentStep === 1 && (
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <Ionicons name="medical" size={24} color="#2196F3" />
            <Text style={styles.stepTitle}>🩸 Blood Donation Eligibility Check</Text>
          </View>
          
          {/* Eligibility Score */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Your Eligibility Score</Text>
            <Text style={[
              styles.scoreValue,
              { color: eligibilityScore >= 80 ? '#4CAF50' : eligibilityScore >= 60 ? '#FF9800' : '#F44336' }
            ]}>
              {eligibilityScore}%
            </Text>
            <View style={styles.scoreBar}>
              <View style={[
                styles.scoreProgress,
                { 
                  width: `${eligibilityScore}%`,
                  backgroundColor: eligibilityScore >= 80 ? '#4CAF50' : eligibilityScore >= 60 ? '#FF9800' : '#F44336'
                }
              ]} />
            </View>
            <Text style={styles.scoreDescription}>
              {eligibilityScore >= 80 ? '✅ Excellent! You are highly eligible.' :
               eligibilityScore >= 60 ? '⚠️ Good! You meet basic requirements.' :
               '❌ Please address issues below.'}
            </Text>
          </View>

          {/* Questions */}
          <View style={styles.questionsSection}>
            <Text style={styles.sectionTitle}>Health Screening Questions</Text>
            
            {/* Last Donation */}
            <View style={styles.questionBlock}>
              <Text style={styles.questionLabel}>📅 When was your last blood donation?</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (Leave blank if first time)"
                value={lastDonation}
                onChangeText={setLastDonation}
              />
              <Text style={styles.helperText}>Minimum 56 days (8 weeks) gap required</Text>
            </View>

            {/* Weight */}
            <View style={styles.questionBlock}>
              <Text style={styles.questionLabel}>⚖️ Your approximate weight (kg)?</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum 50kg required"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
              <Text style={styles.helperText}>Must be at least 50kg to donate safely</Text>
            </View>

            {/* Recent Illness */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRecentIllness(!recentIllness)}
            >
              <Ionicons 
                name={recentIllness ? "checkbox" : "square-outline"} 
                size={20} 
                color={recentIllness ? "#F44336" : "#4CAF50"} 
              />
              <Text style={styles.checkboxLabel}>🤒 I have been ill in the past 2 weeks</Text>
            </TouchableOpacity>

            {/* Alcohol */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAlcohol24h(!alcohol24h)}
            >
              <Ionicons 
                name={alcohol24h ? "checkbox" : "square-outline"} 
                size={20} 
                color={alcohol24h ? "#F44336" : "#4CAF50"} 
              />
              <Text style={styles.checkboxLabel}>🍺 I consumed alcohol in the last 24 hours</Text>
            </TouchableOpacity>
          </View>

          {/* Continue Button */}
          <TouchableOpacity 
            style={[
              styles.continueButton,
              { backgroundColor: eligibilityScore >= 60 ? '#4CAF50' : '#d1d5db' }
            ]}
            onPress={() => {
              if (eligibilityScore >= 60) {
                setCurrentStep(2);
                Alert.alert('Success!', 'You are eligible! Proceeding to next step...');
              } else {
                Alert.alert(
                  'Eligibility Requirements Not Met', 
                  'Please address the highlighted issues before proceeding.',
                  [{ text: 'OK' }]
                );
              }
            }}
            disabled={eligibilityScore < 60}
          >
            <Text style={[
              styles.continueButtonText,
              { color: eligibilityScore >= 60 ? '#fff' : '#9ca3af' }
            ]}>
              {eligibilityScore >= 60 ? '✅ Continue to Health Screening →' : '⚠️ Address Issues First'}
            </Text>
          </TouchableOpacity>
        </View>
        )}

        {/* Step 2: Health Screening */}
        {currentStep === 2 && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Ionicons name="heart" size={24} color="#2196F3" />
              <Text style={styles.stepTitle}>🏥 Health Screening</Text>
            </View>
            
            <Text style={styles.stepDescription}>
              Please confirm you meet these health requirements:
            </Text>
            
            <View style={styles.healthChecks}>
              <Text style={styles.healthCheckItem}>✅ Feel well and healthy today</Text>
              <Text style={styles.healthCheckItem}>✅ Had adequate sleep (6+ hours)</Text>
              <Text style={styles.healthCheckItem}>✅ Eaten a meal in the last 4 hours</Text>
              <Text style={styles.healthCheckItem}>✅ Stayed hydrated today</Text>
              <Text style={styles.healthCheckItem}>✅ No alcohol in last 24 hours</Text>
              <Text style={styles.healthCheckItem}>✅ No recent tattoos or piercings</Text>
            </View>

            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentStep(1)}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => setCurrentStep(3)}
              >
                <Text style={styles.continueButtonText}>Continue →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Location Selection */}
        {currentStep === 3 && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Ionicons name="location" size={24} color="#2196F3" />
              <Text style={styles.stepTitle}>📍 Select Donation Center</Text>
            </View>
            
            <Text style={styles.stepDescription}>
              Choose your preferred donation location:
            </Text>
            
            <View style={styles.locationOptions}>
              <TouchableOpacity style={styles.locationCard}>
                <Text style={styles.locationName}>City Blood Bank</Text>
                <Text style={styles.locationAddress}>123 Main Street, City Center</Text>
                <Text style={styles.locationHours}>9:00 AM - 6:00 PM</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.locationCard}>
                <Text style={styles.locationName}>General Hospital Blood Center</Text>
                <Text style={styles.locationAddress}>456 Hospital Road, Medical District</Text>
                <Text style={styles.locationHours}>8:00 AM - 8:00 PM</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentStep(2)}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => setCurrentStep(4)}
              >
                <Text style={styles.continueButtonText}>Continue →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 4: Appointment Booking */}
        {currentStep === 4 && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Ionicons name="calendar" size={24} color="#2196F3" />
              <Text style={styles.stepTitle}>📅 Book Appointment</Text>
            </View>
            
            <Text style={styles.stepDescription}>
              Select your preferred time slot:
            </Text>
            
            <View style={styles.timeSlots}>
              <TouchableOpacity style={styles.timeSlot}>
                <Text style={styles.timeSlotText}>Today - 2:00 PM</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timeSlot}>
                <Text style={styles.timeSlotText}>Today - 3:30 PM</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timeSlot}>
                <Text style={styles.timeSlotText}>Today - 5:00 PM</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentStep(3)}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => setCurrentStep(5)}
              >
                <Text style={styles.continueButtonText}>Continue →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 5: Confirmation */}
        {currentStep === 5 && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.stepTitle}>✅ Confirmation</Text>
            </View>
            
            <Text style={styles.stepDescription}>
              Please review your walk-in donation details:
            </Text>
            
            <View style={styles.confirmationDetails}>
              <Text style={styles.confirmationItem}>📍 Location: City Blood Bank</Text>
              <Text style={styles.confirmationItem}>📅 Time: Today - 2:00 PM</Text>
              <Text style={styles.confirmationItem}>🩸 Type: Whole Blood Donation</Text>
              <Text style={styles.confirmationItem}>⭐ Eligibility: {eligibilityScore}% - Eligible</Text>
            </View>

            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentStep(4)}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  Alert.alert(
                    'Appointment Confirmed!',
                    'Your walk-in donation has been scheduled. Please arrive 10 minutes early.',
                    [
                      {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                      }
                    ]
                  );
                }}
              >
                <Text style={styles.confirmButtonText}>Confirm Appointment</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  impactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  impactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  impactStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  impactStat: {
    alignItems: 'center',
  },
  impactNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  impactLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginLeft: 12,
    flex: 1,
  },
  scoreCard: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#0891b2',
    marginBottom: 10,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  scoreBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#e0e7ff',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 5,
  },
  scoreDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  questionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 20,
  },
  questionBlock: {
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    fontStyle: 'italic',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  continueButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  healthChecks: {
    marginBottom: 25,
  },
  healthCheckItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 10,
    paddingLeft: 10,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.4,
  },
  backButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  locationOptions: {
    marginBottom: 20,
  },
  locationCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 5,
  },
  locationAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 3,
  },
  locationHours: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  timeSlots: {
    marginBottom: 20,
  },
  timeSlot: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmationDetails: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  confirmationItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.55,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default WalkInDonationScreenNew;

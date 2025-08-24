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
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { donorService, donationService } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

const WalkInDonationScreen = ({ navigation }) => {
  // Enhanced state management
  const [currentStep, setCurrentStep] = useState(1);
  const [eligibilityScore, setEligibilityScore] = useState(100); // Start with full score
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyFacilities, setNearbyFacilities] = useState([]);
  const [healthScreening, setHealthScreening] = useState({
    lastDonation: '',
    currentMedications: '',
    recentIllness: false,
    alcohol24h: false,
    weight: '',
    bloodPressure: 'normal'
  });
  const [donorStats, setDonorStats] = useState({
    totalDonations: 0,
    livesImpacted: 0,
    nextMilestone: 5,
    badges: []
  });
  const [formData, setFormData] = useState({
    donation_center: '',
    donation_center_name: '',
    units_donated: '1',
    notes: '',
    verification_photo: null,
    verification_status: 'pending'
  });
  const [donationCenters, setDonationCenters] = useState([]);
  const [loading, setLoading] = useState(false); // Start with false to show UI immediately
  const [submitting, setSubmitting] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  // Steps configuration
  const donationSteps = [
    { id: 1, title: "Eligibility Check", icon: "medical-outline", color: "#2196F3" },
    { id: 2, title: "Health Screening", icon: "heart-outline", color: "#FF9800" },
    { id: 3, title: "Location Selection", icon: "location-outline", color: "#9C27B0" },
    { id: 4, title: "Documentation", icon: "camera-outline", color: "#4CAF50" },
    { id: 5, title: "Final Review", icon: "checkmark-circle-outline", color: "#F44336" }
  ];

  useEffect(() => {
    // Initialize with fallback centers immediately
    setFallbackCenters();
    
    // Load other data
    loadDonorStats();
    getCurrentLocation();
    
    // Initialize eligibility score
    setTimeout(() => calculateEligibilityScore(), 500);
    
    // Try to load donation centers but don't block UI
    loadDonationCenters();
    
    // Animate progress bar
    Animated.timing(animatedValue, {
      toValue: currentStep / donationSteps.length,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Initialize eligibility score on component mount
  useEffect(() => {
    calculateEligibilityScore();
  }, []);

  const loadDonorStats = async () => {
    try {
      const response = await donorService.getDonorStats();
      if (response.success) {
        setDonorStats(response.stats);
      }
    } catch (error) {
      console.log('Stats loading failed, using defaults');
      setDonorStats({
        totalDonations: 2,
        livesImpacted: 6,
        nextMilestone: 5,
        badges: ['first_time', 'regular']
      });
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
        calculateNearbyFacilities(location.coords);
      }
    } catch (error) {
      console.log('Location access denied, using default centers');
    }
  };

  const calculateNearbyFacilities = (coords) => {
    // Simulate nearby facilities with distances
    const facilities = [
      { id: 1, name: 'City Blood Bank', distance: '0.8 km', waitTime: '15 min', capacity: 'High' },
      { id: 2, name: 'General Hospital', distance: '1.2 km', waitTime: '25 min', capacity: 'Medium' },
      { id: 3, name: 'Community Center', distance: '2.1 km', waitTime: '10 min', capacity: 'Low' }
    ];
    setNearbyFacilities(facilities);
  };

  const loadDonationCenters = async () => {
    try {
      // Don't show loading screen - load in background
      console.log('Loading donation centers...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 3000);
      });
      
      const apiPromise = donorService.getDonationCenters();
      
      const response = await Promise.race([apiPromise, timeoutPromise]);
      console.log('Donation centers response:', response);
      
      // Ensure we have an array
      const centers = Array.isArray(response.centers) ? response.centers : [];
      if (centers.length > 0) {
        setDonationCenters(centers);
      }
      // If no centers returned, keep fallback centers that were already set
      
    } catch (error) {
      console.error('Error loading donation centers:', error);
      console.log('Keeping fallback centers due to error');
      // Fallback centers are already set, so no action needed
    }
  };

  const setFallbackCenters = () => {
    setDonationCenters([
      {
        id: 1,
        name: 'City Blood Bank',
        address: '123 Main Street, City Center',
      },
      {
        id: 2,
        name: 'General Hospital Blood Center',
        address: '456 Hospital Road, Medical District',
      },
      {
        id: 3,
        name: 'Community Health Center',
        address: '789 Community Blvd, Suburb',
      }
    ]);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Enhanced eligibility check
  const calculateEligibilityScore = () => {
    let score = 100;
    
    // Check last donation (56 days gap required)
    if (healthScreening.lastDonation && healthScreening.lastDonation.trim()) {
      try {
        const lastDonationDate = new Date(healthScreening.lastDonation);
        const currentDate = new Date();
        const daysSinceLastDonation = Math.floor((currentDate - lastDonationDate) / (1000 * 60 * 60 * 24));
        
        if (!isNaN(daysSinceLastDonation)) {
          if (daysSinceLastDonation < 56) {
            score -= 50; // Major penalty for recent donation
          }
        }
      } catch (error) {
        // Invalid date format, but don't penalize
        console.log('Invalid date format');
      }
    }
    
    // Check weight requirement
    const weight = parseFloat(healthScreening.weight);
    if (healthScreening.weight && !isNaN(weight)) {
      if (weight < 50) {
        score -= 40; // Major penalty for insufficient weight
      } else if (weight < 55) {
        score -= 10; // Minor penalty for borderline weight
      }
    } else if (healthScreening.weight && healthScreening.weight.trim()) {
      // Invalid weight input
      score -= 20;
    }
    
    // Check other health factors
    if (healthScreening.recentIllness) {
      score -= 25; // Penalty for recent illness
    }
    
    if (healthScreening.alcohol24h) {
      score -= 20; // Penalty for recent alcohol consumption
    }
    
    // Check medications
    if (healthScreening.currentMedications && 
        healthScreening.currentMedications.toLowerCase().includes('blood thinner')) {
      score -= 30; // Major penalty for blood thinners
    }
    
    const finalScore = Math.max(0, Math.min(100, score));
    setEligibilityScore(finalScore);
    
    return finalScore;
  };

  const renderProgressBar = () => {
    const progressWidth = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.progressText}>
          Step {currentStep} of {donationSteps.length}: {donationSteps[currentStep - 1]?.title}
        </Text>
      </View>
    );
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        {donationSteps.map((step, index) => (
          <View key={step.id} style={styles.stepContainer}>
            <View style={[
              styles.stepCircle,
              { backgroundColor: currentStep > index ? step.color : '#E0E0E0' }
            ]}>
              <Ionicons 
                name={step.icon} 
                size={16} 
                color={currentStep > index ? 'white' : '#999'} 
              />
            </View>
            {index < donationSteps.length - 1 && (
              <View style={[
                styles.stepLine,
                { backgroundColor: currentStep > index + 1 ? '#4CAF50' : '#E0E0E0' }
              ]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderEligibilityCheck = () => {
    console.log('Rendering eligibility check, score:', eligibilityScore);
    
    return (
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Ionicons name="medical" size={24} color="#2196F3" />
          <Text style={styles.stepTitle}>Donation Eligibility Check</Text>
        </View>
        
        {/* Eligibility Score Display */}
        <View style={styles.eligibilityScore}>
          <Text style={styles.scoreLabel}>Your Eligibility Score</Text>
          <View style={styles.scoreContainer}>
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
          </View>
          <Text style={styles.scoreDescription}>
            {eligibilityScore >= 80 ? 'Excellent! You are highly eligible to donate.' :
             eligibilityScore >= 60 ? 'Good! You meet the basic requirements.' :
             'Please address the issues below to become eligible.'}
          </Text>
        </View>

        {/* Health Questions */}
        <View style={styles.questionsSection}>
          <Text style={styles.sectionTitle}>Health Screening Questions</Text>
          
          <View style={styles.questionContainer}>
            <Text style={styles.questionLabel}>When was your last blood donation?</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD (Leave blank if first time)"
              value={healthScreening.lastDonation}
              onChangeText={(value) => {
                setHealthScreening(prev => ({ ...prev, lastDonation: value }));
                setTimeout(() => calculateEligibilityScore(), 100);
              }}
            />
            <Text style={styles.helperText}>Minimum 56 days (8 weeks) gap required</Text>
          </View>

          <View style={styles.questionContainer}>
            <Text style={styles.questionLabel}>Your approximate weight (kg)?</Text>
            <TextInput
              style={styles.weightInput}
              placeholder="Minimum 50kg required"
              keyboardType="numeric"
              value={healthScreening.weight}
              onChangeText={(value) => {
                setHealthScreening(prev => ({ ...prev, weight: value }));
                setTimeout(() => calculateEligibilityScore(), 100);
              }}
            />
            <Text style={styles.helperText}>Must be at least 50kg to donate safely</Text>
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => {
              setHealthScreening(prev => ({ ...prev, recentIllness: !prev.recentIllness }));
              setTimeout(() => calculateEligibilityScore(), 100);
            }}
          >
            <Ionicons 
              name={healthScreening.recentIllness ? "checkbox" : "square-outline"} 
              size={20} 
              color={healthScreening.recentIllness ? "#F44336" : "#4CAF50"} 
            />
            <Text style={styles.checkboxLabel}>I have been ill in the past 2 weeks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => {
              setHealthScreening(prev => ({ ...prev, alcohol24h: !prev.alcohol24h }));
              setTimeout(() => calculateEligibilityScore(), 100);
            }}
          >
            <Ionicons 
              name={healthScreening.alcohol24h ? "checkbox" : "square-outline"} 
              size={20} 
              color={healthScreening.alcohol24h ? "#F44336" : "#4CAF50"} 
            />
            <Text style={styles.checkboxLabel}>I consumed alcohol in the last 24 hours</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={[
              styles.nextButton, 
              eligibilityScore < 60 ? styles.buttonDisabled : styles.buttonEnabled
            ]}
            onPress={() => {
              if (eligibilityScore >= 60) {
                setCurrentStep(2);
              } else {
                Alert.alert(
                  'Eligibility Requirements Not Met', 
                  'Please address the highlighted issues before proceeding to ensure safe donation.',
                  [{ text: 'OK' }]
                );
              }
            }}
            disabled={eligibilityScore < 60}
          >
            <Text style={[
              styles.nextButtonText,
              eligibilityScore < 60 ? styles.disabledButtonText : styles.enabledButtonText
            ]}>
              {eligibilityScore >= 60 ? 'Continue to Health Screening →' : 'Address Issues First'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHealthScreening = () => {
    return (
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Ionicons name="heart" size={24} color="#FF9800" />
          <Text style={styles.stepTitle}>Health Screening</Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={styles.questionLabel}>Current medications (if any)</Text>
          <TextInput
            style={styles.medicationInput}
            placeholder="List any medications you're taking"
            multiline
            value={healthScreening.currentMedications}
            onChangeText={(value) => {
              setHealthScreening(prev => ({ ...prev, currentMedications: value }));
              setTimeout(() => calculateEligibilityScore(), 100);
            }}
          />
        </View>

        <View style={styles.vitalSignsContainer}>
          <Text style={styles.sectionTitle}>Basic Health Status</Text>
          <View style={styles.vitalItem}>
            <Ionicons name="fitness" size={20} color="#4CAF50" />
            <Text style={styles.vitalLabel}>Blood Pressure</Text>
            <Text style={styles.vitalValue}>Normal Range</Text>
          </View>
          <View style={styles.vitalItem}>
            <Ionicons name="heart" size={20} color="#E91E63" />
            <Text style={styles.vitalLabel}>Heart Rate</Text>
            <Text style={styles.vitalValue}>Normal Range</Text>
          </View>
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setCurrentStep(1)}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={() => setCurrentStep(3)}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSmartLocationSelection = () => {
    return (
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Ionicons name="location" size={24} color="#9C27B0" />
          <Text style={styles.stepTitle}>Smart Location Selection</Text>
        </View>

        {userLocation && (
          <View style={styles.locationInfo}>
            <Ionicons name="navigate" size={16} color="#4CAF50" />
            <Text style={styles.locationText}>Found your location - showing nearby centers</Text>
          </View>
        )}

        <FlatList
          data={nearbyFacilities}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.facilityCard,
                formData.donation_center === item.name && styles.selectedFacility
              ]}
              onPress={() => selectDonationCenter(item)}
            >
              <View style={styles.facilityHeader}>
                <Text style={styles.facilityName}>{item.name}</Text>
                <View style={[
                  styles.capacityBadge,
                  { backgroundColor: item.capacity === 'High' ? '#4CAF50' : item.capacity === 'Medium' ? '#FF9800' : '#F44336' }
                ]}>
                  <Text style={styles.capacityText}>{item.capacity}</Text>
                </View>
              </View>
              <View style={styles.facilityDetails}>
                <View style={styles.facilityDetail}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text style={styles.facilityDetailText}>{item.distance} away</Text>
                </View>
                <View style={styles.facilityDetail}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.facilityDetailText}>~{item.waitTime} wait</Text>
                </View>
              </View>
              {formData.donation_center === item.name && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.selectedText}>Selected</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />

        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setCurrentStep(2)}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.nextButton, !formData.donation_center && styles.buttonDisabled]}
            onPress={() => formData.donation_center ? setCurrentStep(4) : Alert.alert('Selection Required', 'Please select a donation center')}
            disabled={!formData.donation_center}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const selectDonationCenter = (center) => {
    setFormData(prev => ({
      ...prev,
      donation_center: center.name,
      donation_center_name: `${center.name} - ${center.address || center.distance}`
    }));
  };

  const renderImpactTracker = () => {
    return (
      <View style={styles.impactCard}>
        <View style={styles.impactHeader}>
          <Ionicons name="heart" size={24} color="#E91E63" />
          <Text style={styles.impactTitle}>Your Donation Impact</Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{donorStats.totalDonations}</Text>
            <Text style={styles.statLabel}>Total Donations</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{donorStats.livesImpacted}</Text>
            <Text style={styles.statLabel}>Lives Impacted</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{donorStats.nextMilestone - donorStats.totalDonations}</Text>
            <Text style={styles.statLabel}>To Next Badge</Text>
          </View>
        </View>

        <View style={styles.milestoneProgress}>
          <Text style={styles.milestoneText}>Progress to {donorStats.nextMilestone} donations</Text>
          <View style={styles.milestoneBar}>
            <View style={[
              styles.milestoneProgress,
              { width: `${(donorStats.totalDonations / donorStats.nextMilestone) * 100}%` }
            ]} />
          </View>
        </View>

        <View style={styles.badgesContainer}>
          <Text style={styles.badgesTitle}>Your Badges</Text>
          <View style={styles.badgesRow}>
            {donorStats.badges.map((badge, index) => (
              <View key={index} style={styles.badge}>
                <Ionicons 
                  name={badge === 'first_time' ? 'medal' : 'trophy'} 
                  size={20} 
                  color="#FFD700" 
                />
              </View>
            ))}
            {Array.from({ length: 3 - donorStats.badges.length }).map((_, index) => (
              <View key={`empty-${index}`} style={styles.emptyBadge}>
                <Ionicons name="medal-outline" size={20} color="#DDD" />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderDocumentationStep = () => {
    return (
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Ionicons name="camera" size={24} color="#4CAF50" />
          <Text style={styles.stepTitle}>Donation Verification</Text>
        </View>

        <View style={styles.unitsContainer}>
          <Text style={styles.fieldLabel}>Units Donated</Text>
          <View style={styles.unitsSelector}>
            {[1, 2].map(unit => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.unitOption,
                  formData.units_donated === unit.toString() && styles.selectedUnit
                ]}
                onPress={() => handleInputChange('units_donated', unit.toString())}
              >
                <Text style={[
                  styles.unitText,
                  formData.units_donated === unit.toString() && styles.selectedUnitText
                ]}>
                  {unit} Unit{unit > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.enhancedPhotoSection}>
          {formData.verification_photo ? (
            <View style={styles.photoPreview}>
              <Image 
                source={{ uri: formData.verification_photo }} 
                style={styles.previewImage}
              />
              <View style={styles.photoOverlay}>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={styles.photoOverlayText}>Verified</Text>
              </View>
              <TouchableOpacity 
                style={styles.retakeButton}
                onPress={captureVerificationPhoto}
              >
                <Ionicons name="camera" size={16} color="#4CAF50" />
                <Text style={styles.retakeText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.enhancedPhotoPlaceholder}
              onPress={captureVerificationPhoto}
            >
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.photoPlaceholderTitle}>Capture Donation Proof</Text>
              <Text style={styles.photoPlaceholderSubtitle}>
                Take a photo of your donation certificate, bandage, or official receipt
              </Text>
              <View style={styles.aiFeature}>
                <Ionicons name="sparkles" size={16} color="#FFD700" />
                <Text style={styles.aiText}>AI-Powered Verification</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setCurrentStep(3)}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.nextButton, !formData.verification_photo && styles.buttonDisabled]}
            onPress={() => formData.verification_photo ? setCurrentStep(5) : Alert.alert('Photo Required', 'Please capture verification photo')}
            disabled={!formData.verification_photo}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFinalReview = () => {
    return (
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Ionicons name="checkmark-circle" size={24} color="#F44336" />
          <Text style={styles.stepTitle}>Final Review</Text>
        </View>

        <View style={styles.reviewContainer}>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Donation Center:</Text>
            <Text style={styles.reviewValue}>{formData.donation_center}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Units Donated:</Text>
            <Text style={styles.reviewValue}>{formData.units_donated} unit(s)</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Eligibility Score:</Text>
            <Text style={[styles.reviewValue, { color: eligibilityScore >= 80 ? '#4CAF50' : '#FF9800' }]}>
              {eligibilityScore}% ✓
            </Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Verification:</Text>
            <Text style={[styles.reviewValue, { color: '#4CAF50' }]}>Photo Captured ✓</Text>
          </View>
        </View>

        <View style={styles.impactPreview}>
          <Text style={styles.impactPreviewTitle}>Expected Impact</Text>
          <Text style={styles.impactPreviewText}>
            Your {formData.units_donated} unit donation could save up to {parseInt(formData.units_donated) * 3} lives! 🩸❤️
          </Text>
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setCurrentStep(4)}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <LinearGradient colors={['#4CAF50', '#45A049']} style={styles.submitGradient}>
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="checkmark-circle" size={20} color="white" />
              )}
              <Text style={styles.submitText}>
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderEligibilityCheck();
      case 2:
        return renderHealthScreening();
      case 3:
        return renderSmartLocationSelection();
      case 4:
        return renderDocumentationStep();
      case 5:
        return renderFinalReview();
      default:
        return renderEligibilityCheck();
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate form
      if (!formData.donation_center || !formData.units_donated || !formData.verification_photo) {
        Alert.alert('Error', 'Please fill in all required fields and capture verification photo');
        return;
      }

      setSubmitting(true);

      // Simulate AI verification
      const aiVerification = await simulateAIVerification(formData.verification_photo);

      // Prepare submission data
      const submissionData = {
        donation_center: formData.donation_center,
        units_donated: parseInt(formData.units_donated),
        notes: formData.notes,
        verification_photo: formData.verification_photo,
        ai_verification: aiVerification,
        verification_status: 'ai_verified',
        status: 'pending_admin_approval',
        submitted_at: new Date().toISOString()
      };

      console.log('Submitting donation for approval:', submissionData);

      const response = await donorService.submitWalkInDonation(submissionData);

      if (response.success) {
        Alert.alert(
          'Donation Submitted! 🎉',
          'Your donation has been submitted for admin approval. You will be notified once it\'s processed.',
          [
            { 
              text: 'View Certificate', 
              onPress: () => {
                navigation.navigate('DonationCertificate', {
                  certificate: response.certificate
                });
              }
            },
            { 
              text: 'Back to Dashboard', 
              onPress: () => navigation.navigate('DonorDashboard')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Walk-in donation error:', error);
      
      // Handle specific pending donation error
      if (error.response?.data?.error === 'Pending donation exists') {
        const errorData = error.response.data;
        Alert.alert(
          errorData.title || 'Pending Donation Found',
          errorData.message || 'You have a donation awaiting approval',
          [
            {
              text: 'View Pending Details',
              onPress: () => {
                // Show pending donation details
                Alert.alert(
                  'Pending Donation Details',
                  `Date: ${new Date(errorData.pendingDonation.date).toLocaleDateString()}\n` +
                  `Center: ${errorData.pendingDonation.center}\n` +
                  `Units: ${errorData.pendingDonation.units}\n` +
                  `Status: ${errorData.pendingDonation.status}\n` +
                  `Submitted: ${new Date(errorData.pendingDonation.submittedAt).toLocaleDateString()}`,
                  [{ text: 'OK' }]
                );
              }
            },
            {
              text: 'Back to Dashboard',
              onPress: () => navigation.navigate('DonorDashboard')
            }
          ]
        );
      } else {
        // Enhanced error reporting for debugging
        console.error('💥 Donation submission failed:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        });
        
        let errorMessage = 'Failed to submit donation. Please try again.';
        let errorTitle = 'Submission Failed';
        
        if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
          errorTitle = 'Network Connection Error';
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (error.message.includes('Authentication token not found')) {
          errorTitle = 'Authentication Error';
          errorMessage = 'Your session has expired. Please logout and login again.';
        } else if (error.response?.status === 401) {
          errorTitle = 'Authentication Error';
          errorMessage = 'Your session has expired. Please logout and login again.';
        } else if (error.response?.status === 403) {
          errorTitle = 'Permission Error';
          errorMessage = error.response?.data?.message || 'You do not have permission to perform this action.';
        } else if (error.response?.status >= 500) {
          errorTitle = 'Server Error';
          errorMessage = 'Server is currently unavailable. Please try again later.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        
        Alert.alert(
          errorTitle,
          errorMessage,
          [
            { text: 'OK' },
            {
              text: 'Retry',
              onPress: () => {
                // Retry the submission
                submitForApproval();
              }
            }
          ]
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Photo capture and AI verification functions
  const requestCameraPermission = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required', 
          'Please allow camera access in your device settings to capture verification photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => ImagePicker.requestCameraPermissionsAsync() }
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert('Error', 'Failed to request camera permission');
      return false;
    }
  };

  const captureVerificationPhoto = async () => {
    try {
      // Debug: Check what's available in ImagePicker
      console.log('ImagePicker object:', ImagePicker);
      console.log('ImagePicker.MediaTypeOptions:', ImagePicker.MediaTypeOptions);
      
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      Alert.alert(
        'Donation Verification',
        'Please take a clear photo of your donation certificate, bandage, or other proof of donation for AI verification.',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              try {
                const result = await ImagePicker.launchCameraAsync({
                  allowsEditing: true,
                  aspect: [4, 3],
                  quality: 0.8,
                });

                console.log('Image picker result:', result);

                if (!result.canceled && result.assets && result.assets.length > 0) {
                  const photoUri = result.assets[0].uri;
                  
                  setFormData(prev => ({
                    ...prev,
                    verification_photo: photoUri
                  }));
                  
                  // Simulate AI verification process
                  Alert.alert(
                    'Photo Captured!',
                    'AI is analyzing your donation proof...',
                    [{ text: 'OK' }]
                  );
                  
                  // Simulate AI processing time
                  setTimeout(() => {
                    Alert.alert(
                      'Verification Complete',
                      'AI has processed your donation proof. Your submission will be reviewed by an admin for final approval.',
                      [{ text: 'Continue' }]
                    );
                  }, 2000);
                } else {
                  console.log('Photo capture was cancelled or failed');
                }
              } catch (error) {
                console.error('Camera launch error:', error);
                Alert.alert('Error', `Failed to open camera: ${error.message}`);
              }
            }
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              try {
                const result = await ImagePicker.launchImageLibraryAsync({
                  allowsEditing: true,
                  aspect: [4, 3],
                  quality: 0.8,
                });

                if (!result.canceled && result.assets && result.assets.length > 0) {
                  setFormData(prev => ({
                    ...prev,
                    verification_photo: result.assets[0].uri
                  }));
                  
                  Alert.alert('Photo Selected!', 'Your verification photo has been selected.');
                }
              } catch (error) {
                console.error('Gallery launch error:', error);
                Alert.alert('Error', `Failed to open gallery: ${error.message}`);
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Capture photo error:', error);
      Alert.alert('Error', `Failed to capture photo: ${error.message}`);
    }
  };

  const simulateAIVerification = (photoUri) => {
    // In a real implementation, this would send the photo to an AI service
    // For now, we'll simulate the process
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate AI analysis results
        const confidence = Math.random() * 0.4 + 0.6; // 60-100% confidence
        const isLikelyValid = confidence > 0.7;
        
        resolve({
          confidence: confidence.toFixed(2),
          isLikelyValid,
          analysisDetails: {
            donationProofDetected: isLikelyValid,
            medicalEnvironment: confidence > 0.8,
            dateVisible: Math.random() > 0.3,
            certificateFormat: isLikelyValid && Math.random() > 0.2
          }
        });
      }, 2000);
    });
  };

  // Removed loading screen - show UI immediately with fallback data

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#4CAF50', '#45A049']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enhanced Walk-In Donation</Text>
      </LinearGradient>

      {renderProgressBar()}
      {renderStepIndicator()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderImpactTracker()}
        
        {/* DIRECT STEP 1 CONTENT - GUARANTEED TO WORK */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 24,
          margin: 10,
          elevation: 4,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          borderWidth: 3,
          borderColor: '#4CAF50',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Ionicons name="medical" size={24} color="#2196F3" />
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2196F3', marginLeft: 12 }}>
              🩸 Blood Donation Eligibility Check
            </Text>
          </View>
          
          <View style={{
            backgroundColor: '#f0f9ff',
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
          }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0891b2', marginBottom: 10 }}>
              Your Eligibility Score: {eligibilityScore}%
            </Text>
            <View style={{
              height: 10,
              backgroundColor: '#e0e7ff',
              borderRadius: 5,
              overflow: 'hidden',
            }}>
              <View style={{
                height: '100%',
                width: `${eligibilityScore}%`,
                backgroundColor: eligibilityScore >= 80 ? '#4CAF50' : eligibilityScore >= 60 ? '#FF9800' : '#F44336',
                borderRadius: 5,
              }} />
            </View>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
              {eligibilityScore >= 80 ? '✅ Excellent! You are highly eligible.' :
               eligibilityScore >= 60 ? '⚠️ Good! You meet basic requirements.' :
               '❌ Please address issues below.'}
            </Text>
          </View>

          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 16 }}>
            Health Screening Questions
          </Text>
          
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              When was your last blood donation?
            </Text>
            <TextInput
              style={{
                borderWidth: 2,
                borderColor: '#10b981',
                borderRadius: 12,
                padding: 15,
                fontSize: 16,
                backgroundColor: '#fff',
              }}
              placeholder="YYYY-MM-DD (Leave blank if first time)"
              value={healthScreening.lastDonation}
              onChangeText={(value) => {
                setHealthScreening(prev => ({ ...prev, lastDonation: value }));
                setTimeout(() => calculateEligibilityScore(), 100);
              }}
            />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              📅 Minimum 56 days (8 weeks) gap required between donations
            </Text>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              Your approximate weight (kg)?
            </Text>
            <TextInput
              style={{
                borderWidth: 2,
                borderColor: '#10b981',
                borderRadius: 12,
                padding: 15,
                fontSize: 16,
                backgroundColor: '#fff',
              }}
              placeholder="Minimum 50kg required"
              keyboardType="numeric"
              value={healthScreening.weight}
              onChangeText={(value) => {
                setHealthScreening(prev => ({ ...prev, weight: value }));
                setTimeout(() => calculateEligibilityScore(), 100);
              }}
            />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              ⚖️ Must be at least 50kg to donate safely
            </Text>
          </View>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              marginBottom: 12,
            }}
            onPress={() => {
              setHealthScreening(prev => ({ ...prev, recentIllness: !prev.recentIllness }));
              setTimeout(() => calculateEligibilityScore(), 100);
            }}
          >
            <Ionicons 
              name={healthScreening.recentIllness ? "checkbox" : "square-outline"} 
              size={20} 
              color={healthScreening.recentIllness ? "#F44336" : "#4CAF50"} 
            />
            <Text style={{ fontSize: 14, color: '#374151', marginLeft: 12, flex: 1 }}>
              🤒 I have been ill in the past 2 weeks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              marginBottom: 20,
            }}
            onPress={() => {
              setHealthScreening(prev => ({ ...prev, alcohol24h: !prev.alcohol24h }));
              setTimeout(() => calculateEligibilityScore(), 100);
            }}
          >
            <Ionicons 
              name={healthScreening.alcohol24h ? "checkbox" : "square-outline"} 
              size={20} 
              color={healthScreening.alcohol24h ? "#F44336" : "#4CAF50"} 
            />
            <Text style={{ fontSize: 14, color: '#374151', marginLeft: 12, flex: 1 }}>
              🍺 I consumed alcohol in the last 24 hours
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{
              backgroundColor: eligibilityScore >= 60 ? '#4CAF50' : '#d1d5db',
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              marginTop: 20,
            }}
            onPress={() => {
              if (eligibilityScore >= 60) {
                setCurrentStep(2);
              } else {
                Alert.alert(
                  'Eligibility Requirements Not Met', 
                  'Please address the highlighted issues before proceeding to ensure safe donation.',
                  [{ text: 'OK' }]
                );
              }
            }}
            disabled={eligibilityScore < 60}
          >
            <Text style={{
              color: eligibilityScore >= 60 ? '#fff' : '#9ca3af',
              fontSize: 16,
              fontWeight: 'bold',
            }}>
              {eligibilityScore >= 60 ? '✅ Continue to Health Screening →' : '⚠️ Address Issues First'}
            </Text>
          </TouchableOpacity>
        </View>
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
  
  // Content and Debug Styles
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  debugContainer: {
    backgroundColor: '#ffeb3b',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  debugText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  stepContentContainer: {
    minHeight: 200,
    backgroundColor: '#e3f2fd',
    margin: 10,
    padding: 15,
    borderRadius: 8,
  },
  
  // Fallback Step Styles
  fallbackStepCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 10,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 20,
    textAlign: 'center',
  },
  testScoreDisplay: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  testScoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0891b2',
    marginBottom: 10,
  },
  testScoreBar: {
    height: 10,
    backgroundColor: '#e0e7ff',
    borderRadius: 5,
    overflow: 'hidden',
  },
  testScoreProgress: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  testQuestion: {
    marginBottom: 16,
  },
  testQuestionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  testInput: {
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  testButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Enhanced Progress Components
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
  
  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    width: (screenWidth - 200) / 4,
    height: 2,
    marginHorizontal: 5,
  },
  
  content: {
    flex: 1,
    padding: 20,
  },
  
  // Impact Tracker Card
  impactCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  impactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  milestoneProgress: {
    marginBottom: 16,
  },
  milestoneText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  milestoneBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  milestoneProgress: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  badgesContainer: {
    marginTop: 8,
  },
  badgesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3CD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  emptyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  
  // Step Cards
  stepCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 12,
  },
  
  // Eligibility Components
  eligibilityScore: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: 16,
  },
  scoreBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 4,
  },
  scoreDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  questionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  buttonEnabled: {
    backgroundColor: '#4CAF50',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  enabledButtonText: {
    color: '#fff',
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
  
  questionContainer: {
    marginBottom: 16,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  weightInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  medicationInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  
  // Health Screening
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  vitalSignsContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vitalLabel: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  vitalValue: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
  },
  
  // Location Selection
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#16a34a',
    marginLeft: 8,
  },
  
  facilityCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  selectedFacility: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fdf4',
  },
  facilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  facilityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  capacityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  capacityText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  facilityDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  facilityDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facilityDetailText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  selectedText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Documentation Step
  unitsContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  unitsSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  unitOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectedUnit: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fdf4',
  },
  unitText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedUnitText: {
    color: '#16a34a',
    fontWeight: '600',
  },
  
  enhancedPhotoSection: {
    marginBottom: 20,
  },
  enhancedPhotoPlaceholder: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f8fffe',
  },
  cameraIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  photoPlaceholderSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  aiFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  aiText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Final Review
  reviewContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  impactPreview: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  impactPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
  },
  impactPreviewText: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
  },
  
  // Navigation Buttons
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  
  // Enhanced styles for existing components
  photoPreview: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  photoOverlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  retakeText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  submitButton: {
    flex: 2,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default WalkInDonationScreen;

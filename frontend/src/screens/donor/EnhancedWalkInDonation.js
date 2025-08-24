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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CheckBox from 'expo-checkbox';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { donorService } from '../../services/api';

const { width, height } = Dimensions.get('window');

const EnhancedWalkInDonation = ({ navigation }) => {
  // Enhanced state management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Basic Eligibility
  const [basicInfo, setBasicInfo] = useState({
    age: '',
    weight: '',
    lastDonationDate: '',
    bloodGroup: 'O+',
    emergencyContact: '',
  });
  
  // Step 2: Medical History & AI Verification
  const [medicalData, setMedicalData] = useState({
    bloodPressure: { systolic: '', diastolic: '' },
    hemoglobin: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
    bmi: '',
  });
  
  const [healthConditions, setHealthConditions] = useState({
    recentIllness: false,
    chronicConditions: false,
    currentMedications: false,
    allergies: false,
    recentSurgery: false,
    recentTravel: false,
    tattoosPiercings: false,
    recentVaccination: false,
    pregnancyBreastfeeding: false,
    substanceUse: false,
  });
  
  const [medicalDocuments, setMedicalDocuments] = useState([]);
  const [aiVerificationStatus, setAiVerificationStatus] = useState('pending');
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  
  // Step 3: Identity & Biometric Verification
  const [identityData, setIdentityData] = useState({
    governmentId: null,
    selfiePhoto: null,
    fingerprintScan: null,
    verificationStatus: 'pending',
    idNumber: '',
    fullName: '',
  });
  
  // Step 4: Professional Medical Assessment
  const [professionalAssessment, setProfessionalAssessment] = useState({
    nurseEvaluation: {
      vitalSigns: 'pending',
      physicalExam: 'pending',
      riskAssessment: 'pending',
      recommendation: '',
    },
    doctorApproval: {
      status: 'pending',
      notes: '',
      conditions: [],
      finalDecision: 'pending',
    },
  });
  
  // Step 5: Donation Planning & Certificate
  const [donationPlan, setDonationPlan] = useState({
    donationType: 'whole_blood',
    estimatedVolume: '450ml',
    duration: '45 minutes',
    specialInstructions: '',
    nutritionalGuidance: '',
  });
  
  const [digitalCertificate, setDigitalCertificate] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [donationRequest, setDonationRequest] = useState(null);
  const [eligibilityStatus, setEligibilityStatus] = useState(null);
  
  // Modal and UI states
  const [showAiModal, setShowAiModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showAdminApprovalModal, setShowAdminApprovalModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Check donation eligibility on component mount
  useEffect(() => {
    checkDonationEligibility();
  }, []);

  const checkDonationEligibility = async () => {
    try {
      const response = await donorService.checkEligibility();
      setEligibilityStatus(response.data);
      
      if (!response.data.isEligible) {
        Alert.alert(
          '🚫 Donation Not Allowed',
          `${response.data.reason}\n\nYou can donate again on: ${new Date(response.data.nextEligibleDate).toLocaleDateString()}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      console.log('Eligibility check error:', error);
      // Continue if eligibility check fails (may be first-time donor)
    }
  };

  // AI-Powered Medical Analysis
  const performAIAnalysis = async () => {
    setIsLoading(true);
    setLoadingMessage('🤖 AI analyzing your medical data...');
    setShowAiModal(true);
    
    try {
      // Simulate AI analysis with realistic medical assessment
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const analysis = {
        riskScore: calculateRiskScore(),
        recommendations: generateRecommendations(),
        eligibilityStatus: 'qualified',
        confidence: 0.92,
        medicalFlags: identifyMedicalFlags(),
        timestamp: new Date().toISOString(),
      };
      
      setAiAnalysisResult(analysis);
      setAiVerificationStatus('completed');
      setLoadingMessage('✅ AI Analysis Complete');
      
    } catch (error) {
      Alert.alert('Analysis Error', 'AI verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRiskScore = () => {
    let score = 0;
    
    // Age factor
    const age = parseInt(basicInfo.age);
    if (age < 18 || age > 65) score += 20;
    if (age < 21 || age > 60) score += 10;
    
    // Weight factor
    const weight = parseInt(basicInfo.weight);
    if (weight < 50) score += 25;
    if (weight < 55) score += 15;
    
    // Medical vitals
    const systolic = parseInt(medicalData.bloodPressure.systolic);
    const diastolic = parseInt(medicalData.bloodPressure.diastolic);
    if (systolic > 140 || systolic < 90) score += 30;
    if (diastolic > 90 || diastolic < 60) score += 25;
    
    // Hemoglobin levels
    const hb = parseFloat(medicalData.hemoglobin);
    if (hb < 12.5) score += 35;
    if (hb < 11.0) score += 50;
    
    // Health conditions
    Object.values(healthConditions).forEach(condition => {
      if (condition) score += 15;
    });
    
    return Math.min(score, 100);
  };

  const generateRecommendations = () => {
    const recommendations = [];
    
    if (parseInt(basicInfo.weight) < 55) {
      recommendations.push('⚠️ Consider nutritional counseling to reach optimal weight');
    }
    
    if (parseFloat(medicalData.hemoglobin) < 13.0) {
      recommendations.push('🍎 Increase iron-rich foods in your diet');
    }
    
    if (healthConditions.recentIllness) {
      recommendations.push('🏥 Wait 2 weeks after full recovery from illness');
    }
    
    if (healthConditions.currentMedications) {
      recommendations.push('💊 Verify medication compatibility with donation');
    }
    
    recommendations.push('💧 Stay well hydrated before and after donation');
    recommendations.push('🥗 Eat iron-rich meal 2-3 hours before donation');
    
    return recommendations;
  };

  const identifyMedicalFlags = () => {
    const flags = [];
    
    if (calculateRiskScore() > 50) {
      flags.push({ type: 'high_risk', message: 'High risk profile - requires doctor approval' });
    }
    
    if (healthConditions.chronicConditions) {
      flags.push({ type: 'medical_review', message: 'Chronic conditions require medical review' });
    }
    
    if (healthConditions.currentMedications) {
      flags.push({ type: 'medication_check', message: 'Medication compatibility needs verification' });
    }
    
    return flags;
  };

  // Document Upload Handler
  const handleDocumentUpload = async (type) => {
    try {
      if (type === 'selfie') {
        // Request camera permission
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert('Permission Required', 'Camera access is needed for photo capture.');
          return;
        }
        
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'Images',
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
        
        if (!result.canceled) {
          setIdentityData({
            ...identityData,
            selfiePhoto: result.assets[0]
          });
          Alert.alert('Success', 'Selfie photo captured successfully! ✅');
        }
      } else if (type === 'id') {
        // Upload government ID
        const result = await DocumentPicker.getDocumentAsync({
          type: 'image/*',
          copyToCacheDirectory: true,
        });
        
        if (!result.canceled) {
          setIdentityData({
            ...identityData,
            governmentId: result.assets[0]
          });
          Alert.alert('Success', 'Government ID uploaded successfully! ✅');
        }
      } else if (type === 'medical') {
        // Upload medical documents
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: true,
        });
        
        if (!result.canceled) {
          setMedicalDocuments([...medicalDocuments, result.assets[0]]);
          Alert.alert('Success', 'Medical document uploaded successfully! ✅');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload document. Please try again.');
    }
  };

  // Submit Donation Request for Admin Approval with Enhanced Risk Assessment
  const submitDonationRequest = async () => {
    // Check if user has pending donations first
    if (eligibilityStatus && !eligibilityStatus.isEligible && eligibilityStatus.pendingDonations > 0) {
      Alert.alert(
        'Cannot Submit Donation',
        `You have ${eligibilityStatus.pendingDonations} donation(s) pending admin approval. Please wait for approval before submitting a new request.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    setLoadingMessage('📋 Submitting donation request with risk assessment...');
    
    try {
      const donationRequestData = {
        basicInfo,
        medicalData,
        healthConditions,
        donationDetails: {
          donation_date: new Date().toISOString().split('T')[0],
          units_donated: parseInt(donationPlan.units) || 1,
          donation_center: donationPlan.center || 'Walk-in Donation Center',
          notes: 'Enhanced walk-in donation with full medical assessment and AI verification'
        },
        uploadedDocuments: {
          selfie: identityData.selfiePhoto,
          government_id: identityData.governmentId,
          medical_reports: medicalDocuments
        },
        aiVerification: {
          confidence: aiVerificationStatus === 'completed' ? 0.95 : 0.8,
          status: aiVerificationStatus,
          verifiedAt: new Date().toISOString()
        },
        professionalAssessment
      };

      console.log('📤 Submitting enhanced donation request to backend...');
      const response = await donorService.submitDonationRequest(donationRequestData);
      
      if (response.success) {
        const request = {
          id: response.donation.id,
          donorName: identityData.fullName || 'Anonymous Donor',
          donorId: identityData.idNumber,
          bloodGroup: basicInfo.bloodGroup,
          donationType: donationPlan.donationType,
          submittedDate: new Date().toISOString(),
          status: 'PENDING_ADMIN_APPROVAL',
          riskScore: 25, // Default low risk score since we simplified backend
          eligibilityStatus: 'eligible',
          medicalData: {
            vitals: medicalData,
            healthConditions: healthConditions,
            riskScore: 25,
            aiVerified: aiVerificationStatus === 'completed',
          },
          documents: {
            governmentId: identityData.governmentId,
            selfiePhoto: identityData.selfiePhoto,
            medicalDocuments: medicalDocuments,
          },
          professionalAssessment: professionalAssessment,
          estimatedProcessingTime: '12-24 hours',
        };
        
        setDonationRequest(request);
        setShowAdminApprovalModal(true);
        
        Alert.alert(
          '📋 Request Submitted Successfully!',
          `Your donation request has been sent to the admin for review.\n\nRequest ID: ${response.donation.id}\nStatus: Pending Approval\n\nProcessing Time: 12-24 hours`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(response.message || 'Submission failed');
      }
      
    } catch (error) {
      console.error('❌ Enhanced donation submission error:', error);
      
      // Handle pending donations error
      if (error.message && error.message.includes('pending')) {
        Alert.alert(
          'Donation Already Pending',
          'You have a pending donation request awaiting admin approval. Please wait for approval before submitting a new request.',
          [{ text: 'OK' }]
        );
      }
      // Handle high-risk rejection (simplified - this won't happen with our current backend)
      else if (error.message && error.message.includes('risk')) {
        Alert.alert(
          'Donation Not Eligible',
          `Risk assessment indicates potential concerns.\n\n${error.message}\n\nPlease consult with a medical professional before attempting to donate blood.`,
          [{ text: 'OK' }]
        );
      }
      // Handle eligibility check failures
      else if (error.message && error.message.includes('eligibility')) {
        Alert.alert(
          'Eligibility Check Failed',
          'Unable to verify your donation eligibility. This may be due to recent donations or pending approvals. Please check your eligibility status on the dashboard.',
          [{ text: 'OK' }]
        );
      }
      // Handle general errors
      else {
        Alert.alert(
          'Submission Error',
          error.message || 'Failed to submit donation request. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Digital Certificate (Only after Admin Approval)
  const generateDigitalCertificate = async () => {
    if (!donationRequest || donationRequest.status !== 'APPROVED_BY_ADMIN') {
      Alert.alert('Approval Required', 'Certificate can only be generated after admin approval.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('📜 Generating your digital certificate...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const certificate = {
        id: `CERT-${Date.now()}`,
        donorName: identityData.fullName || 'John Doe',
        donorId: identityData.idNumber,
        bloodGroup: basicInfo.bloodGroup,
        donationType: donationPlan.donationType,
        centerId: 'CBC-001',
        centerName: 'City Blood Bank',
        issuedDate: new Date().toISOString(),
        validUntil: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)).toISOString(), // 90 days
        qrCode: `https://verify.bloodbank.com/cert/${Date.now()}`,
        medicalOfficer: 'Dr. Sarah Johnson, MD',
        adminApprovedBy: 'Admin - John Smith',
        adminApprovalDate: donationRequest.adminApprovalDate,
        aiVerified: true,
        riskScore: calculateRiskScore(),
        status: 'APPROVED',
        requestId: donationRequest.id,
      };
      
      setDigitalCertificate(certificate);
      setShowCertificateModal(true);
      
    } catch (error) {
      Alert.alert('Certificate Error', 'Failed to generate certificate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step navigation with validation
  const goToNextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep === 2) {
        performAIAnalysis();
      } else if (currentStep === 5) {
        submitDonationRequest();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!basicInfo.age || !basicInfo.weight || parseInt(basicInfo.age) < 18 || parseInt(basicInfo.weight) < 45) {
          Alert.alert('Validation Error', 'Please complete all fields with valid values (Age ≥18, Weight ≥45kg)');
          return false;
        }
        break;
      case 2:
        if (!medicalData.bloodPressure.systolic || !medicalData.hemoglobin) {
          Alert.alert('Medical Data Required', 'Please complete vital signs measurement');
          return false;
        }
        break;
      case 3:
        if (!identityData.governmentId || !identityData.selfiePhoto) {
          Alert.alert('Identity Verification Required', 'Please upload both ID document and selfie photo');
          return false;
        }
        break;
      case 4:
        if (professionalAssessment.doctorApproval.status !== 'approved') {
          Alert.alert('Medical Approval Pending', 'Waiting for medical professional approval');
          return false;
        }
        break;
    }
    return true;
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${(currentStep / 5) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        Step {currentStep} of 5: {getStepTitle()}
      </Text>
    </View>
  );

  const getStepTitle = () => {
    const titles = [
      '', // index 0 unused
      'Basic Eligibility',
      'Medical Verification',
      'Identity Verification', 
      'Professional Assessment',
      'Certificate & Booking'
    ];
    return titles[currentStep];
  };

  // Step 1: Basic Eligibility
  const renderStep1 = () => (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Ionicons name="medical" size={24} color="#2196F3" />
        <Text style={styles.stepTitle}>🩺 Basic Eligibility Check</Text>
      </View>
      
      <Text style={styles.stepDescription}>
        Let's start with your basic information for eligibility assessment.
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Age *</Text>
        <TextInput
          style={styles.input}
          value={basicInfo.age}
          onChangeText={(value) => setBasicInfo({...basicInfo, age: value})}
          placeholder="Enter your age"
          keyboardType="numeric"
        />
        <Text style={styles.helperText}>Must be 18-65 years old</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Weight (kg) *</Text>
        <TextInput
          style={styles.input}
          value={basicInfo.weight}
          onChangeText={(value) => setBasicInfo({...basicInfo, weight: value})}
          placeholder="Enter your weight in kg"
          keyboardType="numeric"
        />
        <Text style={styles.helperText}>Minimum 45kg required</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Last Blood Donation Date</Text>
        <TextInput
          style={styles.input}
          value={basicInfo.lastDonationDate}
          onChangeText={(value) => setBasicInfo({...basicInfo, lastDonationDate: value})}
          placeholder="YYYY-MM-DD (leave empty if first time)"
        />
        <Text style={styles.helperText}>56 days gap required between donations</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Emergency Contact</Text>
        <TextInput
          style={styles.input}
          value={basicInfo.emergencyContact}
          onChangeText={(value) => setBasicInfo({...basicInfo, emergencyContact: value})}
          placeholder="Emergency contact number"
          keyboardType="phone-pad"
        />
      </View>

      <TouchableOpacity
        style={[styles.continueButton, { backgroundColor: '#4CAF50' }]}
        onPress={goToNextStep}
      >
        <Text style={styles.continueButtonText}>Continue to Medical Verification →</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 2: Medical History & AI Verification
  const renderStep2 = () => (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Ionicons name="fitness" size={24} color="#FF9800" />
        <Text style={styles.stepTitle}>🔬 Medical History & AI Verification</Text>
      </View>
      
      <Text style={styles.stepDescription}>
        Comprehensive medical assessment with AI-powered risk analysis.
      </Text>

      <Text style={styles.sectionTitle}>Vital Signs Measurement</Text>
      
      <View style={styles.vitalSignsGrid}>
        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Blood Pressure *</Text>
          <View style={styles.bpContainer}>
            <TextInput
              style={[styles.input, styles.bpInput]}
              value={medicalData.bloodPressure.systolic}
              onChangeText={(value) => setMedicalData({
                ...medicalData,
                bloodPressure: {...medicalData.bloodPressure, systolic: value}
              })}
              placeholder="120"
              keyboardType="numeric"
            />
            <Text style={styles.bpSeparator}>/</Text>
            <TextInput
              style={[styles.input, styles.bpInput]}
              value={medicalData.bloodPressure.diastolic}
              onChangeText={(value) => setMedicalData({
                ...medicalData,
                bloodPressure: {...medicalData.bloodPressure, diastolic: value}
              })}
              placeholder="80"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Hemoglobin Level (g/dL) *</Text>
          <TextInput
            style={styles.input}
            value={medicalData.hemoglobin}
            onChangeText={(value) => setMedicalData({...medicalData, hemoglobin: value})}
            placeholder="13.5"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Heart Rate (bpm)</Text>
          <TextInput
            style={styles.input}
            value={medicalData.heartRate}
            onChangeText={(value) => setMedicalData({...medicalData, heartRate: value})}
            placeholder="72"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Temperature (°C)</Text>
          <TextInput
            style={styles.input}
            value={medicalData.temperature}
            onChangeText={(value) => setMedicalData({...medicalData, temperature: value})}
            placeholder="36.5"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Health Conditions Screening</Text>
      
      {Object.entries(healthConditions).map(([key, value]) => (
        <View key={key} style={styles.checkboxRow}>
          <CheckBox
            value={value}
            onValueChange={(newValue) => setHealthConditions({...healthConditions, [key]: newValue})}
            style={styles.checkbox}
          />
          <Text style={styles.checkboxLabel}>
            {getHealthConditionLabel(key)}
          </Text>
        </View>
      ))}

      <TouchableOpacity
        style={styles.documentButton}
        onPress={() => handleDocumentUpload('medical')}
      >
        <Ionicons name="document-attach" size={20} color="#2196F3" />
        <Text style={styles.documentButtonText}>Upload Medical Documents (Optional)</Text>
      </TouchableOpacity>

      {medicalDocuments.length > 0 && (
        <Text style={styles.documentsCount}>
          📎 {medicalDocuments.length} document(s) uploaded
        </Text>
      )}

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(1)}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: '#FF9800' }]}
          onPress={goToNextStep}
        >
          <Text style={styles.continueButtonText}>🤖 Start AI Analysis →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 3: Identity & Biometric Verification
  const renderStep3 = () => (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Ionicons name="shield-checkmark" size={24} color="#9C27B0" />
        <Text style={styles.stepTitle}>🆔 Identity & Biometric Verification</Text>
      </View>
      
      <Text style={styles.stepDescription}>
        Secure identity verification using government ID and biometric data.
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Full Name (as per ID) *</Text>
        <TextInput
          style={styles.input}
          value={identityData.fullName}
          onChangeText={(value) => setIdentityData({...identityData, fullName: value})}
          placeholder="Enter full name as per government ID"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Government ID Number *</Text>
        <TextInput
          style={styles.input}
          value={identityData.idNumber}
          onChangeText={(value) => setIdentityData({...identityData, idNumber: value})}
          placeholder="Enter ID number"
        />
      </View>

      <View style={styles.documentSection}>
        <Text style={styles.sectionTitle}>Document Upload</Text>
        
        <TouchableOpacity
          style={[styles.uploadButton, identityData.governmentId && styles.uploadButtonSuccess]}
          onPress={() => handleDocumentUpload('id')}
        >
          <Ionicons 
            name={identityData.governmentId ? "checkmark-circle" : "card"} 
            size={24} 
            color={identityData.governmentId ? "#4CAF50" : "#2196F3"} 
          />
          <Text style={styles.uploadButtonText}>
            {identityData.governmentId ? "✅ Government ID Uploaded" : "📄 Upload Government ID"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.uploadButton, identityData.selfiePhoto && styles.uploadButtonSuccess]}
          onPress={() => handleDocumentUpload('selfie')}
        >
          <Ionicons 
            name={identityData.selfiePhoto ? "checkmark-circle" : "camera"} 
            size={24} 
            color={identityData.selfiePhoto ? "#4CAF50" : "#2196F3"} 
          />
          <Text style={styles.uploadButtonText}>
            {identityData.selfiePhoto ? "✅ Selfie Photo Captured" : "📸 Take Selfie Photo"}
          </Text>
        </TouchableOpacity>
      </View>

      {identityData.governmentId && identityData.selfiePhoto && (
        <View style={styles.verificationStatus}>
          <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
          <Text style={styles.verificationText}>Identity verification ready for processing</Text>
        </View>
      )}

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(2)}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: '#9C27B0' }]}
          onPress={goToNextStep}
        >
          <Text style={styles.continueButtonText}>Continue to Assessment →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 4: Professional Medical Assessment
  const renderStep4 = () => (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Ionicons name="medical" size={24} color="#E91E63" />
        <Text style={styles.stepTitle}>👩‍⚕️ Professional Medical Assessment</Text>
      </View>
      
      <Text style={styles.stepDescription}>
        Final evaluation by qualified medical professionals.
      </Text>

      <View style={styles.assessmentCard}>
        <Text style={styles.assessmentTitle}>🔬 AI Analysis Results</Text>
        {aiAnalysisResult && (
          <View style={styles.aiResults}>
            <View style={styles.riskScoreContainer}>
              <Text style={styles.riskScoreLabel}>Risk Score:</Text>
              <Text style={[styles.riskScore, {
                color: aiAnalysisResult.riskScore < 30 ? '#4CAF50' : 
                       aiAnalysisResult.riskScore < 60 ? '#FF9800' : '#F44336'
              }]}>
                {aiAnalysisResult.riskScore}/100
              </Text>
            </View>
            
            <Text style={styles.eligibilityStatus}>
              Status: {aiAnalysisResult.eligibilityStatus.toUpperCase()}
            </Text>
            
            <Text style={styles.confidenceScore}>
              AI Confidence: {Math.round(aiAnalysisResult.confidence * 100)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.assessmentCard}>
        <Text style={styles.assessmentTitle}>👩‍⚕️ Nurse Evaluation</Text>
        <TouchableOpacity
          style={styles.simulateButton}
          onPress={() => {
            setProfessionalAssessment({
              ...professionalAssessment,
              nurseEvaluation: {
                vitalSigns: 'approved',
                physicalExam: 'normal',
                riskAssessment: 'low',
                recommendation: 'Cleared for donation'
              }
            });
          }}
        >
          <Text style={styles.simulateButtonText}>✅ Simulate Nurse Approval</Text>
        </TouchableOpacity>
        
        {professionalAssessment.nurseEvaluation.vitalSigns === 'approved' && (
          <View style={styles.approvalSection}>
            <Text style={styles.approvalText}>✅ Vital signs within normal range</Text>
            <Text style={styles.approvalText}>✅ Physical examination passed</Text>
            <Text style={styles.approvalText}>✅ Low risk assessment</Text>
          </View>
        )}
      </View>

      <View style={styles.assessmentCard}>
        <Text style={styles.assessmentTitle}>👨‍⚕️ Doctor Approval</Text>
        <TouchableOpacity
          style={styles.simulateButton}
          onPress={() => {
            setProfessionalAssessment({
              ...professionalAssessment,
              doctorApproval: {
                status: 'approved',
                notes: 'Donor meets all medical criteria for blood donation',
                conditions: [],
                finalDecision: 'approved'
              }
            });
          }}
        >
          <Text style={styles.simulateButtonText}>✅ Simulate Doctor Approval</Text>
        </TouchableOpacity>
        
        {professionalAssessment.doctorApproval.status === 'approved' && (
          <View style={styles.finalApproval}>
            <Ionicons name="medical" size={30} color="#4CAF50" />
            <Text style={styles.finalApprovalText}>MEDICALLY APPROVED FOR DONATION</Text>
            <Text style={styles.approvalNotes}>
              {professionalAssessment.doctorApproval.notes}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(3)}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.continueButton, { 
            backgroundColor: professionalAssessment.doctorApproval.status === 'approved' ? '#E91E63' : '#cccccc'
          }]}
          onPress={goToNextStep}
          disabled={professionalAssessment.doctorApproval.status !== 'approved'}
        >
          <Text style={styles.continueButtonText}>Generate Certificate →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 5: Admin Approval & Certificate Request
  const renderStep5 = () => (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
        <Text style={styles.stepTitle}>�‍💼 Admin Approval & Certificate</Text>
      </View>
      
      <Text style={styles.stepDescription}>
        Submit your donation request for admin approval to receive your digital certificate.
      </Text>

      <View style={styles.donationPlanCard}>
        <Text style={styles.planTitle}>📋 Request Summary</Text>
        
        <View style={styles.planDetails}>
          <View style={styles.planItem}>
            <Text style={styles.planLabel}>Donor Name:</Text>
            <Text style={styles.planValue}>{identityData.fullName || 'John Doe'}</Text>
          </View>
          
          <View style={styles.planItem}>
            <Text style={styles.planLabel}>Blood Group:</Text>
            <Text style={styles.planValue}>{basicInfo.bloodGroup}</Text>
          </View>
          
          <View style={styles.planItem}>
            <Text style={styles.planLabel}>Donation Type:</Text>
            <Text style={styles.planValue}>{donationPlan.donationType.replace('_', ' ').toUpperCase()}</Text>
          </View>
          
          <View style={styles.planItem}>
            <Text style={styles.planLabel}>AI Risk Score:</Text>
            <Text style={[styles.planValue, {
              color: calculateRiskScore() < 30 ? '#4CAF50' : 
                     calculateRiskScore() < 60 ? '#FF9800' : '#F44336'
            }]}>
              {calculateRiskScore()}/100
            </Text>
          </View>
          
          <View style={styles.planItem}>
            <Text style={styles.planLabel}>Medical Approval:</Text>
            <Text style={styles.planValue}>
              {professionalAssessment.doctorApproval.status === 'approved' ? '✅ Approved' : '⏳ Pending'}
            </Text>
          </View>
        </View>
      </View>

      {!donationRequest ? (
        <>
          {eligibilityStatus && !eligibilityStatus.isEligible && eligibilityStatus.pendingDonations > 0 ? (
            <View style={styles.disabledSubmitContainer}>
              <Ionicons name="warning" size={24} color="#dc2626" />
              <Text style={styles.disabledSubmitText}>
                Cannot submit new donation request. You have {eligibilityStatus.pendingDonations} pending donation(s) awaiting admin approval.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.submitRequestButton}
              onPress={submitDonationRequest}
            >
              <Ionicons name="paper-plane" size={24} color="#fff" />
              <Text style={styles.submitRequestButtonText}>📋 Submit for Admin Approval</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.requestStatusCard}>
          <Text style={styles.requestStatusTitle}>📋 Request Status</Text>
          <Text style={styles.requestId}>Request ID: {donationRequest.id}</Text>
          
          <View style={styles.statusIndicator}>
            <Ionicons 
              name={donationRequest.status === 'APPROVED_BY_ADMIN' ? "checkmark-circle" : "time"} 
              size={24} 
              color={donationRequest.status === 'APPROVED_BY_ADMIN' ? "#4CAF50" : "#FF9800"} 
            />
            <Text style={[styles.statusText, {
              color: donationRequest.status === 'APPROVED_BY_ADMIN' ? "#4CAF50" : "#FF9800"
            }]}>
              {donationRequest.status === 'APPROVED_BY_ADMIN' ? 'Approved by Admin' : 'Pending Admin Review'}
            </Text>
          </View>
          
          <Text style={styles.estimatedTime}>
            Estimated processing time: {donationRequest.estimatedProcessingTime}
          </Text>
          
          {donationRequest.status === 'APPROVED_BY_ADMIN' ? (
            <TouchableOpacity
              style={styles.generateCertButton}
              onPress={generateDigitalCertificate}
            >
              <Ionicons name="ribbon" size={20} color="#fff" />
              <Text style={styles.generateCertButtonText}>🎖️ Generate Certificate</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.pendingApprovalContainer}>
              <Ionicons name="time-outline" size={24} color="#f59e0b" />
              <Text style={styles.pendingApprovalText}>
                Your donation request is pending admin approval. You will be notified once it's reviewed.
              </Text>
            </View>
          )}
        </View>
      )}

      {digitalCertificate && (
        <View style={styles.certificatePreview}>
          <Text style={styles.certificateTitle}>✅ Certificate Generated!</Text>
          <Text style={styles.certificateId}>ID: {digitalCertificate.id}</Text>
          <Text style={styles.certificateValid}>Valid until: {new Date(digitalCertificate.validUntil).toLocaleDateString()}</Text>
          
          <TouchableOpacity
            style={styles.viewCertificateButton}
            onPress={() => setShowCertificateModal(true)}
          >
            <Text style={styles.viewCertificateText}>📄 View Full Certificate</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(4)}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        {digitalCertificate && (
          <TouchableOpacity
            style={[styles.finishButton]}
            onPress={() => {
              Alert.alert(
                'Process Complete! 🎉',
                'Your digital certificate has been generated. Thank you for your donation!',
                [
                  {
                    text: 'Back to Dashboard',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            }}
          >
            <Text style={styles.finishButtonText}>🏁 Complete Process</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const getHealthConditionLabel = (key) => {
    const labels = {
      recentIllness: 'Recent illness or fever (last 2 weeks)',
      chronicConditions: 'Chronic medical conditions (diabetes, heart disease, etc.)',
      currentMedications: 'Currently taking prescription medications',
      allergies: 'Known allergies or adverse reactions',
      recentSurgery: 'Recent surgery or medical procedures',
      recentTravel: 'International travel in last 3 months',
      tattoosPiercings: 'New tattoos or piercings in last 6 months',
      recentVaccination: 'Recent vaccination (last 4 weeks)',
      pregnancyBreastfeeding: 'Currently pregnant or breastfeeding',
      substanceUse: 'Recent alcohol or substance use',
    };
    return labels[key] || key;
  };

  // AI Analysis Modal
  const renderAIModal = () => (
    <Modal
      visible={showAiModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.aiModalContent}>
          <Text style={styles.aiModalTitle}>🤖 AI Medical Analysis</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>{loadingMessage}</Text>
            </View>
          ) : aiAnalysisResult ? (
            <ScrollView style={styles.aiResultsContainer}>
              <View style={styles.aiResultCard}>
                <Text style={styles.aiResultTitle}>Risk Assessment</Text>
                <Text style={[styles.riskScore, {
                  color: aiAnalysisResult.riskScore < 30 ? '#4CAF50' : 
                         aiAnalysisResult.riskScore < 60 ? '#FF9800' : '#F44336'
                }]}>
                  Risk Score: {aiAnalysisResult.riskScore}/100
                </Text>
                <Text style={styles.eligibilityResult}>
                  Eligibility: {aiAnalysisResult.eligibilityStatus.toUpperCase()}
                </Text>
                <Text style={styles.confidenceResult}>
                  AI Confidence: {Math.round(aiAnalysisResult.confidence * 100)}%
                </Text>
              </View>

              <View style={styles.aiResultCard}>
                <Text style={styles.aiResultTitle}>Recommendations</Text>
                {aiAnalysisResult.recommendations.map((rec, index) => (
                  <Text key={index} style={styles.recommendation}>{rec}</Text>
                ))}
              </View>

              {aiAnalysisResult.medicalFlags.length > 0 && (
                <View style={styles.aiResultCard}>
                  <Text style={styles.aiResultTitle}>Medical Flags</Text>
                  {aiAnalysisResult.medicalFlags.map((flag, index) => (
                    <Text key={index} style={styles.medicalFlag}>⚠️ {flag.message}</Text>
                  ))}
                </View>
              )}
            </ScrollView>
          ) : null}

          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => {
              setShowAiModal(false);
              if (aiAnalysisResult) {
                setCurrentStep(3);
              }
            }}
          >
            <Text style={styles.closeModalText}>
              {aiAnalysisResult ? 'Continue →' : 'Close'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Digital Certificate Modal
  const renderCertificateModal = () => (
    <Modal
      visible={showCertificateModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.certificateModalContent}>
          <ScrollView style={styles.certificateScrollView}>
            <View style={styles.certificateHeader}>
              <Text style={styles.certificateHeaderTitle}>🏥 DIGITAL BLOOD DONATION CERTIFICATE</Text>
              <Text style={styles.certificateHeaderSubtitle}>Verified by AI & Medical Professionals</Text>
            </View>

            {digitalCertificate && (
              <View style={styles.certificateBody}>
                <View style={styles.certificateSection}>
                  <Text style={styles.certificateSectionTitle}>Donor Information</Text>
                  <Text style={styles.certificateField}>Name: {digitalCertificate.donorName}</Text>
                  <Text style={styles.certificateField}>ID: {digitalCertificate.donorId}</Text>
                  <Text style={styles.certificateField}>Blood Group: {digitalCertificate.bloodGroup}</Text>
                </View>

                <View style={styles.certificateSection}>
                  <Text style={styles.certificateSectionTitle}>Donation Details</Text>
                  <Text style={styles.certificateField}>Type: {digitalCertificate.donationType.replace('_', ' ').toUpperCase()}</Text>
                  <Text style={styles.certificateField}>Center: {digitalCertificate.centerName}</Text>
                  <Text style={styles.certificateField}>Risk Score: {aiAnalysisResult?.riskScore}/100</Text>
                </View>

                <View style={styles.certificateSection}>
                  <Text style={styles.certificateSectionTitle}>Administrative Approval</Text>
                  <Text style={styles.certificateField}>Request ID: {digitalCertificate.requestId}</Text>
                  <Text style={styles.certificateField}>Approved By: {digitalCertificate.adminApprovedBy}</Text>
                  <Text style={styles.certificateField}>Approval Date: {new Date(digitalCertificate.adminApprovalDate).toLocaleDateString()}</Text>
                  <Text style={styles.certificateField}>AI Verified: ✅ Yes</Text>
                  <Text style={styles.certificateField}>Medical Officer: {digitalCertificate.medicalOfficer}</Text>
                  <Text style={styles.certificateField}>Status: {digitalCertificate.status}</Text>
                </View>

                <View style={styles.certificateSection}>
                  <Text style={styles.certificateSectionTitle}>Validity</Text>
                  <Text style={styles.certificateField}>Issued: {new Date(digitalCertificate.issuedDate).toLocaleDateString()}</Text>
                  <Text style={styles.certificateField}>Valid Until: {new Date(digitalCertificate.validUntil).toLocaleDateString()}</Text>
                </View>

                <View style={styles.qrCodeContainer}>
                  <Text style={styles.qrCodeTitle}>🔗 Verification QR Code</Text>
                  <View style={styles.qrCodePlaceholder}>
                    <Text style={styles.qrCodeText}>QR Code</Text>
                    <Text style={styles.qrCodeUrl}>{digitalCertificate.qrCode}</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setShowCertificateModal(false)}
          >
            <Text style={styles.closeModalText}>Close Certificate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enhanced Blood Donation</Text>
      </LinearGradient>

      {eligibilityStatus && !eligibilityStatus.isEligible && (
        <View style={styles.eligibilityBanner}>
          <Ionicons name="warning" size={20} color="#dc2626" />
          <View style={styles.eligibilityTextContainer}>
            <Text style={styles.eligibilityTitle}>🚫 Donation Not Available</Text>
            <Text style={styles.eligibilityText}>{eligibilityStatus.reason}</Text>
            {eligibilityStatus.pendingDonations > 0 ? (
              <Text style={styles.eligibilityDate}>
                You have {eligibilityStatus.pendingDonations} donation(s) pending admin approval
              </Text>
            ) : eligibilityStatus.nextEligibleDate ? (
              <Text style={styles.eligibilityDate}>
                Next donation date: {new Date(eligibilityStatus.nextEligibleDate).toLocaleDateString()}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {eligibilityStatus && eligibilityStatus.isEligible && eligibilityStatus.daysRemaining === 0 && (
        <View style={styles.eligibilitySuccessBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
          <Text style={styles.eligibilitySuccessText}>✅ You are eligible to donate blood!</Text>
        </View>
      )}

      {renderProgressBar()}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </ScrollView>

      {renderAIModal()}
      {renderCertificateModal()}
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
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  stepCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 10,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    marginBottom: 15,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  vitalSignsGrid: {
    marginBottom: 20,
  },
  vitalItem: {
    marginBottom: 15,
  },
  vitalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  bpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bpInput: {
    flex: 1,
    marginRight: 5,
  },
  bpSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginHorizontal: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  documentButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 10,
  },
  documentsCount: {
    fontSize: 12,
    color: '#059669',
    marginTop: 8,
    fontStyle: 'italic',
  },
  documentSection: {
    marginBottom: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  uploadButtonSuccess: {
    backgroundColor: '#f0f9ff',
    borderColor: '#4CAF50',
    borderStyle: 'solid',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 12,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  verificationText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 8,
  },
  assessmentCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  assessmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  aiResults: {
    marginTop: 10,
  },
  riskScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskScoreLabel: {
    fontSize: 14,
    color: '#374151',
    marginRight: 10,
  },
  riskScore: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  eligibilityStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 5,
  },
  confidenceScore: {
    fontSize: 12,
    color: '#6b7280',
  },
  simulateButton: {
    backgroundColor: '#e0f2fe',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  simulateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0277bd',
  },
  approvalSection: {
    marginTop: 10,
  },
  approvalText: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 5,
  },
  finalApproval: {
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  finalApprovalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginTop: 5,
    textAlign: 'center',
  },
  approvalNotes: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  donationPlanCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
    textAlign: 'center',
  },
  planDetails: {
    marginTop: 10,
  },
  planItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  planLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  planValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  certificateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  certificateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  certificatePreview: {
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  certificateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 5,
  },
  certificateId: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 3,
  },
  certificateValid: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
  },
  viewCertificateButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewCertificateText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
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
  continueButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.55,
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  finishButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.55,
    alignItems: 'center',
  },
  finishButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  submitRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  submitRequestButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  requestStatusCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  requestStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  requestId: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 15,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  estimatedTime: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  generateCertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  generateCertButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  pendingApprovalContainer: {
    backgroundColor: '#fef3c7',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  pendingApprovalText: {
    color: '#d97706',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  aiModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 15,
    textAlign: 'center',
  },
  aiResultsContainer: {
    maxHeight: height * 0.5,
  },
  aiResultCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  aiResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  eligibilityResult: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 5,
  },
  confidenceResult: {
    fontSize: 14,
    color: '#6b7280',
  },
  recommendation: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  medicalFlag: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 5,
    fontWeight: '500',
  },
  closeModalButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeModalText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  certificateModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: width * 0.95,
    maxHeight: height * 0.9,
  },
  certificateScrollView: {
    maxHeight: height * 0.7,
  },
  certificateHeader: {
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  certificateHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 5,
  },
  certificateHeaderSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  certificateBody: {
    marginBottom: 20,
  },
  certificateSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  certificateSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  certificateField: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
    lineHeight: 20,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  qrCodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  qrCodePlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  qrCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 5,
  },
  qrCodeUrl: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
  },
  // Eligibility Banner Styles
  eligibilityBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
    borderWidth: 1,
    margin: 15,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eligibilityTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  eligibilityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  eligibilityText: {
    fontSize: 14,
    color: '#991b1b',
    marginBottom: 4,
  },
  eligibilityDate: {
    fontSize: 12,
    color: '#7f1d1d',
    fontWeight: '500',
  },
  eligibilitySuccessBanner: {
    backgroundColor: '#f0fdf4',
    borderColor: '#16a34a',
    borderWidth: 1,
    margin: 15,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eligibilitySuccessText: {
    fontSize: 14,
    color: '#15803d',
    fontWeight: '500',
    marginLeft: 10,
  },
  disabledSubmitContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
    borderWidth: 1,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  disabledSubmitText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});

export default EnhancedWalkInDonation;

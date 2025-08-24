import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { donorService } from '../../services/api';

const RecordPastDonationScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [donationCenters, setDonationCenters] = useState([]);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [formData, setFormData] = useState({
    donation_center: '',
    donation_center_name: '',
    donation_date: '',
    units_donated: '1',
    notes: '',
    certificate_number: '',
  });

  // Generate past dates (last 90 days)
  const getPastDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      dates.push({
        date: date,
        formatted: date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        value: date.toISOString().split('T')[0]
      });
    }
    return dates;
  };

  useEffect(() => {
    loadDonationCenters();
  }, []);

  const loadDonationCenters = async () => {
    try {
      const response = await donorService.getDonationCenters();
      console.log('Donation centers response:', response);
      
      // Ensure we have an array
      const centers = Array.isArray(response.centers) ? response.centers : [];
      
      // Add option for "Other" center
      const centersWithOther = [
        ...centers,
        { 
          id: 'other', 
          name: 'Other Center', 
          address: 'Different donation center',
          isOther: true 
        }
      ];
      setDonationCenters(centersWithOther);
    } catch (error) {
      console.error('Error loading donation centers:', error);
      Alert.alert('Error', 'Failed to load donation centers');
      
      // Set fallback centers if API fails
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
        },
        { 
          id: 'other', 
          name: 'Other Center', 
          address: 'Different donation center',
          isOther: true 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectDonationCenter = (center) => {
    setFormData(prev => ({
      ...prev,
      donation_center: center.name,
      donation_center_name: center.isOther ? '' : `${center.name} - ${center.address}`,
      isOtherCenter: center.isOther
    }));
    setShowCenterModal(false);
  };

  const validateForm = () => {
    if (!formData.donation_center) {
      Alert.alert('Error', 'Please select a donation center');
      return false;
    }

    if (!formData.donation_date) {
      Alert.alert('Error', 'Please select the donation date');
      return false;
    }

    // Check if date is within last 90 days
    const donationDate = new Date(formData.donation_date);
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    if (donationDate < ninetyDaysAgo || donationDate > today) {
      Alert.alert('Error', 'Donation date must be within the last 90 days');
      return false;
    }

    const units = parseInt(formData.units_donated);
    if (isNaN(units) || units < 1 || units > 2) {
      Alert.alert('Error', 'Units donated must be between 1 and 2');
      return false;
    }

    if (formData.isOtherCenter && !formData.donation_center_name.trim()) {
      Alert.alert('Error', 'Please specify the donation center name');
      return false;
    }

    return true;
  };

  const handleRecordDonation = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      const donationData = {
        donation_center: formData.isOtherCenter ? formData.donation_center_name : formData.donation_center,
        donation_date: formData.donation_date,
        units_donated: parseInt(formData.units_donated),
        notes: formData.notes || `Past donation recorded - ${formData.certificate_number ? `Certificate: ${formData.certificate_number}` : 'Manual entry'}`,
        status: 'completed', // Past donations are always completed
        source: 'manual_entry'
      };

      const response = await donorService.recordPastDonation(donationData);

      Alert.alert(
        'Donation Recorded!',
        `Your past donation has been successfully added to your history.\n\nDate: ${formData.donation_date}\nCenter: ${donationData.donation_center}\nUnits: ${formData.units_donated}`,
        [
          {
            text: 'View Certificate',
            onPress: () => navigation.navigate('DonationCertificate', { 
              certificate: response.certificate 
            })
          },
          {
            text: 'Add Another',
            onPress: () => {
              setFormData({
                donation_center: '',
                donation_center_name: '',
                donation_date: '',
                units_donated: '1',
                notes: '',
                certificate_number: '',
              });
            }
          },
          {
            text: 'Back to Dashboard',
            onPress: () => navigation.navigate('DonorDashboard')
          }
        ]
      );

    } catch (error) {
      Alert.alert(
        'Error',
        error.error || 'Failed to record donation. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderCenterItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.listItem}
      onPress={() => selectDonationCenter(item)}
    >
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        <Text style={styles.itemSubtitle}>
          {item.isOther ? 'Specify your own center' : item.address}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderDateItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.listItem}
      onPress={() => {
        setFormData(prev => ({ ...prev, donation_date: item.value }));
        setShowDateModal(false);
      }}
    >
      <Text style={styles.itemTitle}>{item.formatted}</Text>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#10b981', '#059669']} style={styles.header}>
          <Text style={styles.headerTitle}>Loading...</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#10b981', '#059669']} style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Record Past Donation</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Previous Donation</Text>
          <Text style={styles.formSubtitle}>
            Record a blood donation you made at another center within the last 90 days
          </Text>

          {/* Donation Center Selection */}
          <Text style={styles.fieldLabel}>Donation Center *</Text>
          <TouchableOpacity 
            style={styles.selector}
            onPress={() => setShowCenterModal(true)}
          >
            <View style={styles.selectorContent}>
              <Ionicons name="business-outline" size={20} color="#6b7280" />
              <Text style={[
                styles.selectorText,
                !formData.donation_center && styles.placeholderText
              ]}>
                {formData.donation_center_name || formData.donation_center || 'Select Donation Center'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {/* Custom Center Name (if Other selected) */}
          {formData.isOtherCenter && (
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter donation center name *"
                value={formData.donation_center_name}
                onChangeText={(value) => handleInputChange('donation_center_name', value)}
                placeholderTextColor="#9ca3af"
              />
            </View>
          )}

          {/* Date Selection */}
          <Text style={styles.fieldLabel}>Donation Date *</Text>
          <TouchableOpacity 
            style={styles.selector}
            onPress={() => setShowDateModal(true)}
          >
            <View style={styles.selectorContent}>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <Text style={[
                styles.selectorText,
                !formData.donation_date && styles.placeholderText
              ]}>
                {formData.donation_date ? new Date(formData.donation_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Select Donation Date'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {/* Units Donated */}
          <Text style={styles.fieldLabel}>Units Donated *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="water-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter units (1-2)"
              value={formData.units_donated}
              onChangeText={(value) => handleInputChange('units_donated', value)}
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Certificate Number (Optional) */}
          <Text style={styles.fieldLabel}>Certificate Number (Optional)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="document-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter certificate number if available"
              value={formData.certificate_number}
              onChangeText={(value) => handleInputChange('certificate_number', value)}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Additional Notes */}
          <Text style={styles.fieldLabel}>Additional Notes (Optional)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="document-text-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional information..."
              value={formData.notes}
              onChangeText={(value) => handleInputChange('notes', value)}
              multiline
              textAlignVertical="top"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleRecordDonation}
            disabled={submitting}
          >
            <LinearGradient 
              colors={submitting ? ['#ccc', '#999'] : ['#10b981', '#059669']} 
              style={styles.submitGradient}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="checkmark-circle" size={20} color="white" />
              )}
              <Text style={styles.submitText}>
                {submitting ? 'Recording...' : 'Record Donation'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#10b981" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Important Guidelines</Text>
            <Text style={styles.infoText}>
              • Only record donations from the last 90 days{'\n'}
              • Ensure you have proper documentation or certificate{'\n'}
              • This helps maintain accurate donation history{'\n'}
              • All recorded donations will be verified if needed{'\n'}
              • This will update your personal donation statistics
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <Modal
        visible={showCenterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCenterModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Donation Center</Text>
              <TouchableOpacity 
                onPress={() => setShowCenterModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={donationCenters}
              keyExtractor={(item) => item.id || item.name}
              renderItem={renderCenterItem}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity 
                onPress={() => setShowDateModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getPastDates()}
              keyExtractor={(item) => item.value}
              renderItem={renderDateItem}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>
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
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    minHeight: 56,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  submitButton: {
    marginTop: 20,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  infoCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalList: {
    paddingHorizontal: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default RecordPastDonationScreen;

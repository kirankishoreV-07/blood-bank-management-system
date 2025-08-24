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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { donorService } from '../../services/api';

const ScheduleAppointmentScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [donationCenters, setDonationCenters] = useState([]);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  // Generate available dates (next 30 days, excluding weekends for some centers)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip Sundays for most centers
      if (date.getDay() !== 0) {
        dates.push({
          date: date,
          formatted: date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          }),
          value: date.toISOString().split('T')[0]
        });
      }
    }
    return dates;
  };

  // Generate available time slots
  const getAvailableTimeSlots = () => {
    const slots = [];
    const times = [
      '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
      '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
      '04:00 PM', '04:30 PM', '05:00 PM'
    ];
    
    times.forEach(time => {
      slots.push({ time, available: Math.random() > 0.3 }); // Simulate availability
    });
    
    return slots;
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
      setDonationCenters(centers);
      
      if (centers.length === 0) {
        // Set fallback centers if none returned
        setDonationCenters([
          {
            id: 1,
            name: 'City Blood Bank',
            address: '123 Main Street, City Center',
            workingHours: '9:00 AM - 6:00 PM'
          },
          {
            id: 2,
            name: 'General Hospital Blood Center',
            address: '456 Hospital Road, Medical District',
            workingHours: '8:00 AM - 8:00 PM'
          },
          {
            id: 3,
            name: 'Community Health Center',
            address: '789 Community Blvd, Suburb',
            workingHours: '10:00 AM - 5:00 PM'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading donation centers:', error);
      Alert.alert('Error', 'Failed to load donation centers');
      
      // Set fallback centers if API fails
      setDonationCenters([
        {
          id: 1,
          name: 'City Blood Bank',
          address: '123 Main Street, City Center',
          workingHours: '9:00 AM - 6:00 PM'
        },
        {
          id: 2,
          name: 'General Hospital Blood Center',
          address: '456 Hospital Road, Medical District',
          workingHours: '8:00 AM - 8:00 PM'
        },
        {
          id: 3,
          name: 'Community Health Center',
          address: '789 Community Blvd, Suburb',
          workingHours: '10:00 AM - 5:00 PM'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleAppointment = async () => {
    if (!selectedCenter || !selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please select center, date, and time for your appointment');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await donorService.scheduleAppointment({
        donation_center: selectedCenter.name,
        donation_date: selectedDate,
        donation_time: selectedTime,
        donation_type: 'scheduled',
        notes: `Scheduled appointment at ${selectedCenter.name}`
      });

      Alert.alert(
        'Appointment Scheduled!',
        `Your appointment has been scheduled for ${selectedDate} at ${selectedTime}.\n\nLocation: ${selectedCenter.name}`,
        [
          {
            text: 'View Details',
            onPress: () => navigation.navigate('AppointmentDetails', { 
              appointment: response.donation 
            })
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
        error.error || 'Failed to schedule appointment. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderCenterItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.listItem}
      onPress={() => {
        setSelectedCenter(item);
        setShowCenterModal(false);
      }}
    >
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        <Text style={styles.itemSubtitle}>{item.address}</Text>
        {item.workingHours && (
          <Text style={styles.itemHours}>Hours: {item.workingHours}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderDateItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.listItem}
      onPress={() => {
        setSelectedDate(item.value);
        setShowDateModal(false);
      }}
    >
      <Text style={styles.itemTitle}>{item.formatted}</Text>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderTimeItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.listItem,
        !item.available && styles.unavailableItem
      ]}
      onPress={() => {
        if (item.available) {
          setSelectedTime(item.time);
          setShowTimeModal(false);
        }
      }}
      disabled={!item.available}
    >
      <Text style={[
        styles.itemTitle,
        !item.available && styles.unavailableText
      ]}>
        {item.time}
      </Text>
      {item.available ? (
        <Ionicons name="chevron-forward" size={20} color="#666" />
      ) : (
        <Text style={styles.unavailableLabel}>Full</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.header}>
          <Text style={styles.headerTitle}>Loading...</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Appointment</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Book Your Donation</Text>
          <Text style={styles.formSubtitle}>
            Schedule your next blood donation appointment
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
                !selectedCenter && styles.placeholderText
              ]}>
                {selectedCenter ? `${selectedCenter.name} - ${selectedCenter.address}` : 'Select Donation Center'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {/* Date Selection */}
          <Text style={styles.fieldLabel}>Preferred Date *</Text>
          <TouchableOpacity 
            style={styles.selector}
            onPress={() => setShowDateModal(true)}
          >
            <View style={styles.selectorContent}>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <Text style={[
                styles.selectorText,
                !selectedDate && styles.placeholderText
              ]}>
                {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Select Date'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {/* Time Selection */}
          <Text style={styles.fieldLabel}>Preferred Time *</Text>
          <TouchableOpacity 
            style={styles.selector}
            onPress={() => setShowTimeModal(true)}
          >
            <View style={styles.selectorContent}>
              <Ionicons name="time-outline" size={20} color="#6b7280" />
              <Text style={[
                styles.selectorText,
                !selectedTime && styles.placeholderText
              ]}>
                {selectedTime || 'Select Time'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleScheduleAppointment}
            disabled={submitting}
          >
            <LinearGradient 
              colors={submitting ? ['#ccc', '#999'] : ['#3b82f6', '#2563eb']} 
              style={styles.submitGradient}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="calendar" size={20} color="white" />
              )}
              <Text style={styles.submitText}>
                {submitting ? 'Scheduling...' : 'Schedule Appointment'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3b82f6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Important Notes</Text>
            <Text style={styles.infoText}>
              • Appointments can be scheduled up to 30 days in advance{'\n'}
              • Please arrive 15 minutes before your scheduled time{'\n'}
              • Bring a valid ID and stay hydrated{'\n'}
              • You can reschedule up to 24 hours before your appointment
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
              data={getAvailableDates()}
              keyExtractor={(item) => item.value}
              renderItem={renderDateItem}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTimeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity 
                onPress={() => setShowTimeModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getAvailableTimeSlots()}
              keyExtractor={(item) => item.time}
              renderItem={renderTimeItem}
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
    backgroundColor: '#E3F2FD',
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
    color: '#1976D2',
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
    marginBottom: 2,
  },
  itemHours: {
    fontSize: 12,
    color: '#888',
  },
  unavailableItem: {
    opacity: 0.5,
  },
  unavailableText: {
    color: '#999',
  },
  unavailableLabel: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
});

export default ScheduleAppointmentScreen;

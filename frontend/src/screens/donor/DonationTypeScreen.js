import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const DonationTypeScreen = ({ navigation }) => {
  const handleWalkInDonation = () => {
    navigation.navigate('WalkInDonation');
  };

  const handleScheduleAppointment = () => {
    navigation.navigate('ScheduleDonation');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#E53E3E', '#C53030']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Donation Type</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <Text style={styles.subtitle}>
          Select how you would like to donate blood today
        </Text>

        <TouchableOpacity 
          style={styles.optionCard}
          onPress={handleWalkInDonation}
        >
          <LinearGradient 
            colors={['#4CAF50', '#45A049']} 
            style={styles.optionGradient}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="walk" size={40} color="white" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Walk-In Donation</Text>
              <Text style={styles.optionDescription}>
                Donate blood immediately at any available center
              </Text>
              <View style={styles.benefitsList}>
                <Text style={styles.benefit}>• Quick and immediate</Text>
                <Text style={styles.benefit}>• No appointment needed</Text>
                <Text style={styles.benefit}>• Instant impact</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.optionCard}
          onPress={handleScheduleAppointment}
        >
          <LinearGradient 
            colors={['#2196F3', '#1976D2']} 
            style={styles.optionGradient}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="calendar" size={40} color="white" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Schedule Appointment</Text>
              <Text style={styles.optionDescription}>
                Book a convenient time and location for donation
              </Text>
              <View style={styles.benefitsList}>
                <Text style={styles.benefit}>• Choose your preferred time</Text>
                <Text style={styles.benefit}>• Select convenient location</Text>
                <Text style={styles.benefit}>• Guaranteed slot</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2196F3" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Important Notes</Text>
            <Text style={styles.infoText}>
              • Bring a valid ID with you{'\n'}
              • Eat a healthy meal before donation{'\n'}
              • Stay hydrated{'\n'}
              • Avoid alcohol 24 hours before donation{'\n'}
              • Get adequate rest the night before
            </Text>
          </View>
        </View>

        <View style={styles.emergencyCard}>
          <Ionicons name="warning" size={24} color="#FF5722" />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Emergency Donations</Text>
            <Text style={styles.emergencyText}>
              For critical emergency cases, contact our 24/7 hotline:
            </Text>
            <Text style={styles.emergencyPhone}>+1-800-BLOOD-NOW</Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  optionCard: {
    marginBottom: 20,
    borderRadius: 15,
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
  },
  optionIcon: {
    marginRight: 15,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    lineHeight: 18,
  },
  benefitsList: {
    marginTop: 5,
  },
  benefit: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 15,
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
  emergencyCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  emergencyContent: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 5,
  },
  emergencyText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 18,
  },
  emergencyPhone: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
});

export default DonationTypeScreen;

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const navigateToUserType = (userType) => {
    navigation.navigate(`${userType}Login`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#dc2626', '#ef4444', '#f87171']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="medical" size={60} color="#fff" />
            </View>
            <Text style={styles.title}>BloodBank+</Text>
            <Text style={styles.subtitle}>Saving Lives, One Drop at a Time</Text>
          </View>

          {/* Welcome Message */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>
              Welcome to our Blood Bank Management System
            </Text>
            <Text style={styles.descriptionText}>
              Connect donors with recipients and help save lives in your community
            </Text>
          </View>

          {/* User Type Selection */}
          <View style={styles.userTypeContainer}>
            <Text style={styles.sectionTitle}>Choose Your Role</Text>
            
            {/* Admin Card */}
            <TouchableOpacity
              style={styles.userTypeCard}
              onPress={() => navigateToUserType('Admin')}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="settings" size={40} color="#dc2626" />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Administrator</Text>
                  <Text style={styles.cardDescription}>
                    Manage blood bank operations, users, and inventory
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#dc2626" />
              </View>
            </TouchableOpacity>

            {/* Donor Card */}
            <TouchableOpacity
              style={styles.userTypeCard}
              onPress={() => navigateToUserType('Donor')}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="heart" size={40} color="#dc2626" />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Blood Donor</Text>
                  <Text style={styles.cardDescription}>
                    Donate blood and track your donation history
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#dc2626" />
              </View>
            </TouchableOpacity>

            {/* Recipient Card */}
            <TouchableOpacity
              style={styles.userTypeCard}
              onPress={() => navigateToUserType('Recipient')}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="medical-outline" size={40} color="#dc2626" />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Recipient</Text>
                  <Text style={styles.cardDescription}>
                    Request blood and manage your medical needs
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#dc2626" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Emergency Contact */}
          <View style={styles.emergencyContainer}>
            <View style={styles.emergencyContent}>
              <Ionicons name="call" size={24} color="#fff" />
              <View style={styles.emergencyText}>
                <Text style={styles.emergencyTitle}>Emergency?</Text>
                <Text style={styles.emergencySubtitle}>Call 911 or your local emergency number</Text>
              </View>
            </View>
          </View>

          {/* Network Test Button - For debugging */}
          <View style={styles.debugContainer}>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => navigation.navigate('NetworkTest')}
            >
              <Ionicons name="settings-outline" size={20} color="#666" />
              <Text style={styles.debugText}>Network Test</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Together, we can make a difference in saving lives
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  logoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 40,
    padding: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fef2f2',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  welcomeContainer: {
    paddingHorizontal: 30,
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#fef2f2',
    textAlign: 'center',
    lineHeight: 24,
  },
  userTypeContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  userTypeCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginRight: 15,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  emergencyContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  emergencyContent: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyText: {
    marginLeft: 12,
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emergencySubtitle: {
    fontSize: 12,
    color: '#fef2f2',
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#fef2f2',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  debugContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  debugText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
  },
});

export default WelcomeScreen;

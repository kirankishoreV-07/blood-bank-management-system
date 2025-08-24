import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const DonationCertificateScreen = ({ navigation, route }) => {
  const { certificate } = route.params || {};

  const handleShare = async () => {
    try {
      const message = `🩸 Blood Donation Certificate 🩸

🏥 ${certificate?.center || 'Blood Bank Center'}
👤 Donor: ${certificate?.donorName || 'Anonymous Donor'}
🩸 Blood Group: ${certificate?.bloodGroup || 'N/A'}
📅 Date: ${certificate?.date || new Date().toLocaleDateString()}
💉 Units Donated: ${certificate?.units || 1}

Thank you for saving lives! Your donation can help save up to ${(certificate?.units || 1) * 3} lives.

#BloodDonation #SaveLives #HealthcareHero`;

      await Share.share({
        message: message,
        title: 'Blood Donation Certificate',
      });
    } catch (error) {
      console.error('Error sharing certificate:', error);
      Alert.alert('Error', 'Unable to share certificate');
    }
  };

  const handleDownload = () => {
    Alert.alert(
      'Certificate Download',
      'Certificate download feature will be available in the next update. For now, you can share or take a screenshot.',
      [{ text: 'OK' }]
    );
  };

  if (!certificate) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Certificate Not Found</Text>
          <Text style={styles.errorText}>No certificate data available</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#10b981', '#059669']} style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerBackButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donation Certificate</Text>
        <TouchableOpacity 
          onPress={handleShare}
          style={styles.shareButton}
        >
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Certificate Card */}
        <View style={styles.certificateCard}>
          {/* Header with Icons */}
          <View style={styles.certificateHeader}>
            <View style={styles.iconRow}>
              <Ionicons name="heart" size={32} color="#dc2626" />
              <View style={styles.hospitalIcon}>
                <Ionicons name="medical" size={24} color="#fff" />
              </View>
              <Ionicons name="heart" size={32} color="#dc2626" />
            </View>
            <Text style={styles.certificateTitle}>BLOOD DONATION</Text>
            <Text style={styles.certificateSubtitle}>CERTIFICATE OF APPRECIATION</Text>
          </View>

          {/* Decorative Border */}
          <View style={styles.decorativeBorder}>
            <View style={styles.borderLine} />
            <Ionicons name="star" size={16} color="#10b981" />
            <View style={styles.borderLine} />
          </View>

          {/* Certificate Content */}
          <View style={styles.certificateContent}>
            <Text style={styles.presentedText}>This is to certify that</Text>
            
            <Text style={styles.donorName}>
              {certificate.donorName || 'Anonymous Donor'}
            </Text>
            
            <Text style={styles.hasText}>has generously donated</Text>
            
            <View style={styles.donationDetails}>
              <View style={styles.detailBox}>
                <Text style={styles.detailValue}>{certificate.units || 1}</Text>
                <Text style={styles.detailLabel}>Unit{(certificate.units || 1) > 1 ? 's' : ''}</Text>
              </View>
              <Text style={styles.ofText}>of</Text>
              <View style={styles.detailBox}>
                <Text style={styles.detailValue}>{certificate.bloodGroup || 'N/A'}</Text>
                <Text style={styles.detailLabel}>Blood Group</Text>
              </View>
            </View>

            <Text style={styles.dateLocationText}>
              on {new Date(certificate.date || new Date()).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>

            <Text style={styles.centerText}>
              at {certificate.center || 'Blood Bank Center'}
            </Text>

            {/* Impact Statement */}
            <View style={styles.impactSection}>
              <Ionicons name="people" size={24} color="#10b981" />
              <Text style={styles.impactText}>
                Your donation can potentially save up to{' '}
                <Text style={styles.impactNumber}>{(certificate.units || 1) * 3} lives</Text>
              </Text>
            </View>

            {/* Appreciation Message */}
            <Text style={styles.appreciationText}>
              Thank you for your life-saving contribution to our community.
              Your generosity and compassion make a real difference.
            </Text>

            {/* Certificate Number */}
            <View style={styles.certificateNumber}>
              <Text style={styles.certNumberLabel}>Certificate No.</Text>
              <Text style={styles.certNumberValue}>
                {`BD${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`}
              </Text>
            </View>

            {/* Signature Section */}
            <View style={styles.signatureSection}>
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Medical Officer</Text>
              </View>
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Blood Bank Manager</Text>
              </View>
            </View>

            {/* Date Issued */}
            <Text style={styles.issuedDate}>
              Issued on: {new Date().toLocaleDateString()}
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.certificateFooter}>
            <Text style={styles.footerText}>
              🩸 Every donation saves lives • Thank you for being a hero 🩸
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.shareActionButton} onPress={handleShare}>
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.actionGradient}>
              <Ionicons name="share-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Share Certificate</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.actionGradient}>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Download PDF</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3b82f6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Important Information</Text>
            <Text style={styles.infoText}>
              • Keep this certificate for your records{'\n'}
              • You can donate again after 56 days{'\n'}
              • Contact us if you need verification{'\n'}
              • Share to inspire others to donate
            </Text>
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
  headerBackButton: {
    marginRight: 15,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  shareButton: {
    marginLeft: 15,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  certificateCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  certificateHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    gap: 20,
  },
  hospitalIcon: {
    backgroundColor: '#10b981',
    borderRadius: 25,
    padding: 8,
  },
  certificateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    letterSpacing: 2,
    marginBottom: 5,
  },
  certificateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  decorativeBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    gap: 10,
  },
  borderLine: {
    height: 1,
    backgroundColor: '#10b981',
    flex: 1,
  },
  certificateContent: {
    alignItems: 'center',
  },
  presentedText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 10,
  },
  donorName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
    paddingBottom: 5,
  },
  hasText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
  },
  donationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 15,
  },
  detailBox: {
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 15,
    padding: 15,
    minWidth: 80,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  detailValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  ofText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  dateLocationText: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  centerText: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 25,
    textAlign: 'center',
    fontWeight: '600',
  },
  impactSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    gap: 10,
  },
  impactText: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  impactNumber: {
    fontWeight: 'bold',
    color: '#10b981',
    fontSize: 16,
  },
  appreciationText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
    fontStyle: 'italic',
  },
  certificateNumber: {
    alignItems: 'center',
    marginBottom: 30,
  },
  certNumberLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
  },
  certNumberValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
  },
  signatureBox: {
    alignItems: 'center',
    flex: 1,
  },
  signatureLine: {
    height: 1,
    backgroundColor: '#6b7280',
    width: '80%',
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  issuedDate: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  certificateFooter: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 12,
    color: '#10b981',
    textAlign: 'center',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  shareActionButton: {
    flex: 1,
  },
  downloadButton: {
    flex: 1,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DonationCertificateScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { authService, donationService, donorService } from '../../services/api';

const DonorDashboard = (props = {}) => {
  // Destructure navigation with fallback
  const { navigation: navigationProp } = props;
  
  // Use the navigation hook as fallback if prop is not available
  const hookNavigation = useNavigation();
  const navigation = navigationProp || hookNavigation;

  // Add safety check
  if (!navigation) {
    console.warn('DonorDashboard: No navigation object available');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }
  const [user, setUser] = useState(null);
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({ livesSaved: 0, impact: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [showPendingAlert, setShowPendingAlert] = useState(false);
  const [bufferPeriodEligibility, setBufferPeriodEligibility] = useState(null);

  const calculateLivesSaved = (donationsList) => {
    // More sophisticated calculation based on research:
    // 1 blood donation can save up to 3 lives
    // Consider ONLY admin-approved AND completed donations
    // Factor in units donated and time period
    const completedDonations = donationsList.filter(d => 
      d.status === 'completed' && d.admin_approved === true && d.verification_status === 'admin_approved'
    );
    const totalUnits = completedDonations.reduce((sum, d) => sum + (d.units_donated || 1), 0);
    
    // Base calculation: Each unit can potentially save 1-3 lives
    // Use a more realistic factor based on actual usage patterns
    const baseLives = totalUnits * 2.5; // Average 2.5 lives per unit
    
    // Bonus for consistent donation (every donation beyond first adds 0.5 multiplier)
    const consistencyBonus = Math.min(completedDonations.length * 0.1, 1);
    const livesSaved = Math.round(baseLives + (baseLives * consistencyBonus));
    
    // Generate impact message
    let impact = '';
    if (livesSaved === 0) {
      impact = 'Start your life-saving journey!';
    } else if (livesSaved < 5) {
      impact = 'Every drop counts! 🩸';
    } else if (livesSaved < 15) {
      impact = 'Amazing impact! 🌟';
    } else if (livesSaved < 30) {
      impact = 'True hero! 🦸‍♂️';
    } else {
      impact = 'Legendary life-saver! 🏆';
    }
    
    return { livesSaved, impact };
  };

  const loadPendingDonations = async () => {
    try {
      // Check if we have pending donations from enhanced stats
      if (stats.pendingDonations && stats.pendingDonations.length > 0) {
        setPendingDonations(stats.pendingDonations);
        setShowPendingAlert(true);
        return;
      }
      
      // Fallback to legacy method
      const response = await donorService.getPendingDonations();
      if (response.success) {
        setPendingDonations(response.pendingDonations || []);
        setShowPendingAlert(response.pendingDonations?.length > 0);
      }
    } catch (error) {
      console.error('Error loading pending donations:', error);
    }
  };

  const checkBufferPeriodEligibility = async () => {
    try {
      const response = await donorService.checkEligibility();
      const eligibilityData = response.data || response;
      setBufferPeriodEligibility(eligibilityData);
    } catch (error) {
      console.error('Error checking buffer period eligibility:', error);
      // Don't set anything if eligibility check fails
    }
  };

  useEffect(() => {
    loadUserData();
    loadDonations();
    loadPendingDonations();
    checkBufferPeriodEligibility();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDonations = async () => {
    try {
      // Get enhanced donor stats from backend
      const statsResponse = await donorService.getEnhancedStats();
      if (statsResponse.success && statsResponse.stats) {
        const { stats } = statsResponse;
        setDonations(stats.donationHistory || []);
        
        // FIXED: Count pending donations from donation history
        const pendingFromHistory = (stats.donationHistory || []).filter(
          d => d.status === 'pending_admin_approval' || 
               (d.status === 'completed' && d.admin_approved === false) ||
               d.verification_status === 'pending'
        );
        
        // Calculate lives saved from actual donation data
        const calculatedStats = calculateLivesSaved(stats.donationHistory || []);
        setStats({
          ...calculatedStats,
          totalDonations: stats.total_donations || 0,
          totalUnits: stats.total_units || 0,
          lastDonationDate: stats.last_donation_date,
          nextEligibleDate: stats.next_eligible_date,
          pendingApprovals: Math.max(stats.pending_approvals || 0, pendingFromHistory.length),
          latestRiskScore: stats.latest_risk_score || 0,
          eligibilityStatus: stats.latest_risk_score > 0 ? (stats.eligibility_status || 'eligible') : null,
          pendingDonations: stats.pendingDonations || []
        });
        
        // FIXED: Also set pendingDonations state from actual data
        setPendingDonations(pendingFromHistory);
        setShowPendingAlert(pendingFromHistory.length > 0);
      }
    } catch (error) {
      console.error('Error loading enhanced donor stats:', error);
      // Fallback to using donation service if enhanced stats fail
      try {
        const statsResponse = await donorService.getDonorStats();
        if (statsResponse.stats) {
          const { stats } = statsResponse;
          setDonations(stats.donationHistory || []);
          
          // FIXED: Count pending donations in fallback too
          const pendingFromHistory = (stats.donationHistory || []).filter(
            d => d.status === 'pending_admin_approval' || 
                 (d.status === 'completed' && d.admin_approved === false) ||
                 d.verification_status === 'pending'
          );
          
          // Calculate lives saved from actual donation data
          const calculatedStats = calculateLivesSaved(stats.donationHistory || []);
          setStats({
            ...calculatedStats,
            totalDonations: stats.totalDonations,
            totalUnits: stats.totalUnits,
            lastDonationDate: stats.lastDonationDate,
            nextEligibleDate: stats.nextEligibleDate,
            pendingApprovals: pendingFromHistory.length
          });
          
          setPendingDonations(pendingFromHistory);
          setShowPendingAlert(pendingFromHistory.length > 0);
        }
      } catch (fallbackError) {
        console.error('Error loading donor stats fallback:', fallbackError);
        // Final fallback to using donation service
        try {
          const response = await donationService.getDonations();
          const donationsList = response.donations || [];
          setDonations(donationsList);
          
          // FIXED: Count pending donations in final fallback
          const pendingFromHistory = donationsList.filter(
            d => d.status === 'pending_admin_approval' || 
                 (d.status === 'completed' && d.admin_approved === false) ||
                 d.verification_status === 'pending'
          );
          
          const calculatedStats = calculateLivesSaved(donationsList);
          setStats({
            ...calculatedStats,
            pendingApprovals: pendingFromHistory.length
          });
          
          setPendingDonations(pendingFromHistory);
          setShowPendingAlert(pendingFromHistory.length > 0);
        } catch (finalError) {
          console.error('Error loading donations final fallback:', finalError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDonations();
    await loadPendingDonations();
    await checkBufferPeriodEligibility();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            navigation.replace('Welcome');
          },
        },
      ]
    );
  };

  const DonationCard = ({ donation }) => (
    <View style={styles.donationCard}>
      <View style={styles.donationHeader}>
        <Text style={styles.donationDate}>
          {new Date(donation.donation_date).toLocaleDateString()}
        </Text>
        <View style={[
          styles.statusBadge,
          donation.status === 'completed' && donation.admin_approved === true && styles.completedBadge,
          donation.status === 'pending_admin_approval' && styles.pendingBadge,
          donation.status === 'rejected' && styles.rejectedBadge
        ]}>
          <Text style={styles.statusText}>
            {donation.status === 'pending_admin_approval' ? 'pending' : donation.status}
          </Text>
        </View>
      </View>
      <Text style={styles.donationDetails}>
        Units: {donation.units_donated} • Center: {donation.donation_center}
      </Text>
      {donation.notes && (
        <Text style={styles.donationNotes}>{donation.notes}</Text>
      )}
      
      {/* Certificate Button ONLY for Completed AND Admin-Approved Donations */}
      {donation.status === 'completed' && donation.admin_approved === true && donation.verification_status === 'admin_approved' && (
        <TouchableOpacity 
          style={styles.certificateButton}
          onPress={() => viewCertificate(donation)}
        >
          <Ionicons name="ribbon" size={16} color="#10b981" />
          <Text style={styles.certificateButtonText}>View Certificate</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const viewCertificate = (donation) => {
    const certificateData = {
      donorName: user?.full_name || 'Valued Donor',
      units: donation.units_donated,
      center: donation.donation_center,
      date: donation.donation_date,
      certificateNumber: `CERT-${donation.id.substring(0, 8).toUpperCase()}`,
      livesImpacted: donation.units_donated * 3,
      bloodGroup: user?.blood_group,
      status: donation.status
    };

    navigation.navigate('DonationCertificate', { 
      certificate: certificateData 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <LinearGradient colors={['#10b981', '#059669']} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Hello, Hero!</Text>
              <Text style={styles.userName}>{user?.full_name || 'Donor'}</Text>
              <Text style={styles.bloodGroup}>Blood Group: {user?.blood_group || 'Not specified'}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="heart" size={30} color="#10b981" />
            <Text style={styles.statNumber}>
              {donations.filter(d => d.status === 'completed' && d.admin_approved === true && d.verification_status === 'admin_approved').length}
            </Text>
            <Text style={styles.statLabel}>Total Donations</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="water-outline" size={30} color="#3b82f6" />
            <Text style={styles.statNumber}>
              {donations
                .filter(d => d.status === 'completed' && d.admin_approved === true && d.verification_status === 'admin_approved')
                .reduce((sum, d) => sum + (d.units_donated || 1), 0)
              }
            </Text>
            <Text style={styles.statLabel}>Units Donated</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people" size={30} color="#ef4444" />
            <Text style={styles.statNumber}>{stats.livesSaved}</Text>
            <Text style={styles.statLabel}>Lives Saved</Text>
            <Text style={styles.impactLabel}>{stats.impact}</Text>
          </View>
        </View>

        {/* Verification Pending Status - Prominent Display */}
        {(pendingDonations.length > 0 || stats.pendingApprovals > 0) && (
          <View style={styles.verificationStatusContainer}>
            <View style={styles.verificationStatusCard}>
              <View style={styles.verificationHeader}>
                <Ionicons name="hourglass-outline" size={28} color="#f59e0b" />
                <View style={styles.verificationTextContainer}>
                  <Text style={styles.verificationTitle}>Verification Pending</Text>
                  <Text style={styles.verificationSubtitle}>
                    {stats.pendingApprovals || pendingDonations.length} donation{(stats.pendingApprovals || pendingDonations.length) > 1 ? 's' : ''} awaiting admin approval
                  </Text>
                </View>
                <View style={styles.verificationBadge}>
                  <Text style={styles.verificationBadgeText}>PENDING</Text>
                </View>
              </View>
              
              <View style={styles.verificationMessage}>
                <Ionicons name="information-circle-outline" size={16} color="#f59e0b" />
                <Text style={styles.verificationMessageText}>
                  You cannot submit new donations or generate certificates until current submissions are reviewed by our medical team.
                </Text>
              </View>
              
              <View style={styles.verificationActions}>
                <TouchableOpacity 
                  style={styles.viewDetailsButton}
                  onPress={() => {
                    const pendingCount = stats.pendingApprovals || pendingDonations.length;
                    Alert.alert(
                      'Pending Verifications',
                      `You have ${pendingCount} donation${pendingCount > 1 ? 's' : ''} pending admin approval. Please wait for verification before submitting new requests.`,
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text style={styles.viewDetailsButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Buffer Period Eligibility Status */}
        {(bufferPeriodEligibility || pendingDonations.length > 0 || stats.pendingApprovals > 0) && (
          <View style={styles.eligibilityStatusContainer}>
            <Text style={styles.sectionTitle}>Donation Eligibility</Text>
            <View style={[
              styles.eligibilityStatusCard,
              { 
                borderLeftColor: (pendingDonations.length > 0 || stats.pendingApprovals > 0) 
                  ? '#ef4444' 
                  : (bufferPeriodEligibility?.isEligible ? '#10b981' : '#dc2626') 
              }
            ]}>
              <View style={styles.eligibilityHeader}>
                <Ionicons 
                  name={
                    (pendingDonations.length > 0 || stats.pendingApprovals > 0) 
                      ? "hourglass-outline"
                      : (bufferPeriodEligibility?.isEligible ? "checkmark-circle" : "time-outline")
                  } 
                  size={24} 
                  color={
                    (pendingDonations.length > 0 || stats.pendingApprovals > 0) 
                      ? "#ef4444"
                      : (bufferPeriodEligibility?.isEligible ? "#10b981" : "#dc2626")
                  } 
                />
                <Text style={[
                  styles.eligibilityTitle,
                  { 
                    color: (pendingDonations.length > 0 || stats.pendingApprovals > 0) 
                      ? "#ef4444"
                      : (bufferPeriodEligibility?.isEligible ? "#10b981" : "#dc2626") 
                  }
                ]}>
                  {(pendingDonations.length > 0 || stats.pendingApprovals > 0) 
                    ? '🔄 Verification in Progress'
                    : (bufferPeriodEligibility?.isEligible ? '✅ Eligible to Donate' : '⏱️ Buffer Period Active')
                  }
                </Text>
              </View>
              
              <Text style={styles.eligibilityReason}>
                {(pendingDonations.length > 0 || stats.pendingApprovals > 0) 
                  ? `You have ${stats.pendingApprovals || pendingDonations.length} donation(s) pending admin approval. New donations cannot be submitted until verification is complete.`
                  : bufferPeriodEligibility?.reason
                }
              </Text>
              
              {(pendingDonations.length > 0 || stats.pendingApprovals > 0) ? (
                <View style={styles.nextEligibleContainer}>
                  <Text style={styles.nextEligibleLabel}>Status:</Text>
                  <Text style={styles.nextEligibleDate}>
                    Awaiting Admin Review
                  </Text>
                </View>
              ) : (
                !bufferPeriodEligibility?.isEligible && bufferPeriodEligibility?.nextEligibleDate && (
                  <View style={styles.nextEligibleContainer}>
                    <Text style={styles.nextEligibleLabel}>Next eligible date:</Text>
                    <Text style={styles.nextEligibleDate}>
                      {new Date(bufferPeriodEligibility.nextEligibleDate).toLocaleDateString()}
                    </Text>
                    {bufferPeriodEligibility.daysRemaining > 0 && (
                      <Text style={styles.daysRemaining}>
                        ({bufferPeriodEligibility.daysRemaining} days remaining)
                      </Text>
                    )}
                  </View>
                )
              )}
            </View>
          </View>
        )}

        {/* Additional Stats Row with Risk Assessment */}
        <View style={styles.additionalStatsContainer}>
          <View style={styles.additionalStatCard}>
            <Ionicons name="calendar-outline" size={24} color="#8b5cf6" />
            <Text style={styles.additionalStatLabel}>Last Donation</Text>
            <Text style={styles.additionalStatValue}>
              {stats.lastDonationDate ? new Date(stats.lastDonationDate).toLocaleDateString() : 'No donations yet'}
            </Text>
          </View>
          <View style={styles.additionalStatCard}>
            <Ionicons 
              name={
                (pendingDonations.length > 0 || stats.pendingApprovals > 0) 
                  ? "time-outline" 
                  : "checkmark-circle-outline"
              } 
              size={24} 
              color={
                (pendingDonations.length > 0 || stats.pendingApprovals > 0) 
                  ? "#ef4444" 
                  : "#10b981"
              } 
            />
            <Text style={styles.additionalStatLabel}>Donation Status</Text>
            <Text style={[
              styles.additionalStatValue,
              (pendingDonations.length > 0 || stats.pendingApprovals > 0) && { color: '#ef4444' }
            ]}>
              {(pendingDonations.length > 0 || stats.pendingApprovals > 0) 
                ? 'Pending Approval' 
                : (stats.nextEligibleDate ? new Date(stats.nextEligibleDate).toLocaleDateString() : 'Eligible Now')
              }
            </Text>
          </View>
        </View>

        {/* Risk Assessment & Eligibility Status */}
                /* Risk Assessment & Eligibility Status */
        {(stats.latestRiskScore > 0 || (stats.eligibilityStatus && stats.eligibilityStatus !== 'eligible') || stats.pendingApprovals > 0) && (
          <View style={styles.riskAssessmentContainer}>
            <Text style={styles.sectionTitle}>Health Assessment</Text>
            <View style={styles.riskAssessmentCard}>
              <View style={styles.riskHeader}>
                <Ionicons 
                  name={
                    stats.latestRiskScore > 60 ? "warning" : 
                    stats.latestRiskScore > 40 ? "alert-circle" : 
                    stats.pendingApprovals > 0 ? "time-outline" :
                    "checkmark-circle"
                  } 
                  size={24} 
                  color={
                    stats.latestRiskScore > 60 ? "#dc2626" : 
                    stats.latestRiskScore > 40 ? "#f59e0b" : 
                    stats.pendingApprovals > 0 ? "#f59e0b" :
                    "#10b981"
                  } 
                />
                <Text style={styles.riskTitle}>
                  {stats.pendingApprovals > 0 ? 
                    `${stats.pendingApprovals} Donation${stats.pendingApprovals > 1 ? 's' : ''} Pending Review` :
                    `Eligibility Status: ${
                      stats.eligibilityStatus === 'eligible' ? 'Eligible' : 
                      stats.eligibilityStatus === 'ineligible' ? 'Not Eligible' :
                      'Requires Review'
                    }`
                  }
                </Text>
              </View>
              
              {stats.latestRiskScore > 0 && (
                <View style={styles.riskScoreContainer}>
                  <Text style={styles.riskScoreLabel}>Latest Risk Score:</Text>
                  <View style={[
                    styles.riskScoreBadge, 
                    { backgroundColor: stats.latestRiskScore > 60 ? "#dc2626" : stats.latestRiskScore > 40 ? "#f59e0b" : "#10b981" }
                  ]}>
                    <Text style={styles.riskScoreText}>{stats.latestRiskScore.toFixed(1)}%</Text>
                  </View>
                </View>
              )}
              
              <Text style={styles.riskDescription}>
                {stats.pendingApprovals > 0 ? 
                  "⏳ Your recent donation submissions are being reviewed by our medical team. Please wait for approval before submitting new donations." :
                  stats.latestRiskScore > 60 ? 
                  "⚠️ High risk score detected. Please consult with a medical professional before donating." :
                  stats.latestRiskScore > 40 ?
                  "⚡ Medium risk score. Some health factors may need monitoring." :
                  stats.latestRiskScore > 0 ?
                  "✅ Low risk score. You're in good health for donation!" :
                  "📋 Complete a health assessment to view your eligibility status."
                }
              </Text>
            </View>
          </View>
        )}

        {/* Pending Donations Alert */}
        {showPendingAlert && pendingDonations.length > 0 && (
          <View style={styles.pendingAlert}>
            <View style={styles.pendingAlertHeader}>
              <Ionicons name="time-outline" size={24} color="#f59e0b" />
              <Text style={styles.pendingAlertTitle}>
                {pendingDonations.length} Donation{pendingDonations.length > 1 ? 's' : ''} Pending Approval
              </Text>
            </View>
            <Text style={styles.pendingAlertMessage}>
              Your recent donation submissions are awaiting admin approval. 
              You cannot submit new donations until these are processed.
            </Text>
            
            {/* Show risk scores for pending donations */}
            {pendingDonations.some(d => d.risk_score !== undefined) && (
              <View style={styles.pendingRiskInfo}>
                <Text style={styles.pendingRiskTitle}>Risk Assessment Status:</Text>
                {pendingDonations.map((donation, index) => (
                  donation.risk_score !== undefined && (
                    <View key={index} style={styles.pendingRiskItem}>
                      <Text style={styles.pendingRiskText}>
                        Donation {index + 1}: {donation.risk_score.toFixed(1)}% risk 
                        {donation.risk_score > 60 && " ⚠️ High Risk"}
                      </Text>
                    </View>
                  )
                ))}
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.viewPendingButton}
              onPress={() => {
                const alertMessage = pendingDonations.map((donation, index) => {
                  let msg = `${index + 1}. ${donation.donation_center} - ${donation.units_donated} units (${new Date(donation.donation_date || donation.submitted_at).toLocaleDateString()})`;
                  if (donation.risk_score !== undefined) {
                    msg += `\n   Risk Score: ${donation.risk_score.toFixed(1)}%`;
                    msg += ` - ${donation.eligibility_status}`;
                  }
                  return msg;
                }).join('\n\n');
                
                Alert.alert(
                  'Pending Donations',
                  alertMessage,
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.viewPendingText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dismissAlert}
              onPress={() => setShowPendingAlert(false)}
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {/* Check if user has pending donations and disable button accordingly */}
          {(pendingDonations.length > 0 || stats.pendingApprovals > 0) ? (
            // Disabled button when pending donations exist
            <View style={styles.disabledDonateButton}>
              <LinearGradient 
                colors={['#9ca3af', '#6b7280']} 
                style={styles.donateGradient}
              >
                <View style={styles.donateIconContainer}>
                  <Ionicons name="time-outline" size={32} color="#fff" />
                </View>
                <View style={styles.donateTextContainer}>
                  <Text style={styles.donateTitle}>Donation Pending Review</Text>
                  <Text style={styles.donateSubtitle}>
                    Wait for approval before new donation
                  </Text>
                </View>
                <Ionicons name="lock-closed" size={24} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </View>
          ) : (
            // Enabled button when no pending donations
            <TouchableOpacity 
              style={styles.donateButton}
              onPress={() => navigation.navigate('DonorEligibility')}
            >
              <LinearGradient 
                colors={['#4CAF50', '#45A049']} 
                style={styles.donateGradient}
              >
                <View style={styles.donateIconContainer}>
                  <Ionicons name="heart" size={32} color="#fff" />
                </View>
                <View style={styles.donateTextContainer}>
                  <Text style={styles.donateTitle}>Donate Blood</Text>
                  <Text style={styles.donateSubtitle}>Check eligibility & donate today</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* My Certificates Section */}
        <View style={styles.certificatesContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Certificates</Text>
            <Text style={styles.sectionSubtitle}>
              {donations.filter(d => d.status === 'completed' && d.admin_approved === true && d.verification_status === 'admin_approved').length} certificates available
            </Text>
          </View>
          
          {donations.filter(d => d.status === 'completed' && d.admin_approved === true && d.verification_status === 'admin_approved').length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.certificatesScroll}>
              {donations
                .filter(d => d.status === 'completed' && d.admin_approved === true && d.verification_status === 'admin_approved')
                .slice(0, 5) // Show latest 5 certificates
                .map((donation) => (
                  <TouchableOpacity
                    key={donation.id}
                    style={styles.certificateCard}
                    onPress={() => viewCertificate(donation)}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      style={styles.certificateGradient}
                    >
                      <Ionicons name="ribbon" size={24} color="white" />
                      <Text style={styles.certificateTitle}>
                        Donation Certificate
                      </Text>
                      <Text style={styles.certificateDate}>
                        {new Date(donation.donation_date).toLocaleDateString()}
                      </Text>
                      <Text style={styles.certificateUnits}>
                        {donation.units_donated} Unit{donation.units_donated > 1 ? 's' : ''}
                      </Text>
                      <View style={styles.certificateBadge}>
                        <Text style={styles.certificateBadgeText}>✓ Verified</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))
              }
              
              {/* View All Certificates Button */}
              {donations.filter(d => d.status === 'completed' && d.admin_approved === true && d.verification_status === 'admin_approved').length > 5 && (
                <TouchableOpacity style={styles.viewAllCard}>
                  <Ionicons name="add-circle-outline" size={32} color="#10b981" />
                  <Text style={styles.viewAllText}>View All</Text>
                  <Text style={styles.viewAllSubtext}>
                    {donations.filter(d => d.status === 'completed' && d.admin_approved === true && d.verification_status === 'admin_approved').length - 5} more
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            <View style={styles.emptyCertificates}>
              <Ionicons name="ribbon-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No certificates yet</Text>
              <Text style={styles.emptySubtext}>
                {pendingDonations.length > 0 || stats.pendingApprovals > 0 
                  ? 'Wait for admin approval to get certificates'
                  : 'Complete a donation to earn your first certificate'
                }
              </Text>
            </View>
          )}
        </View>

        {/* Donation History */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Donation History</Text>
          {donations.length > 0 ? (
            donations.map((donation) => (
              <DonationCard key={donation.id} donation={donation} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No donations recorded yet</Text>
              <Text style={styles.emptySubtext}>Start saving lives by recording your first donation</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#f0fdf4',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  bloodGroup: {
    fontSize: 14,
    color: '#f0fdf4',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  additionalStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  additionalStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  additionalStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  additionalStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginTop: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  impactLabel: {
    fontSize: 10,
    color: '#10b981',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  donateButton: {
    marginBottom: 15,
    borderRadius: 15,
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  disabledDonateButton: {
    marginBottom: 15,
    borderRadius: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    opacity: 0.7,
  },
  donateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
  },
  donateIconContainer: {
    marginRight: 15,
  },
  donateTextContainer: {
    flex: 1,
  },
  donateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  donateSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionIconContainer: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  historyContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  donationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  donationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  donationDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  donationDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  donationNotes: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },
  certificatesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  certificatesScroll: {
    marginHorizontal: -5,
  },
  certificateCard: {
    width: 180,
    marginHorizontal: 5,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  certificateGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  certificateTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  certificateDate: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 4,
  },
  certificateUnits: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 6,
  },
  certificateBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 8,
  },
  certificateBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  viewAllCard: {
    width: 120,
    height: 140,
    marginHorizontal: 5,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 8,
  },
  viewAllSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  certificateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  certificateButtonText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  completedBadge: {
    backgroundColor: '#10b981',
  },
  pendingBadge: {
    backgroundColor: '#f59e0b',
  },
  rejectedBadge: {
    backgroundColor: '#ef4444',
  },
  pendingAlert: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 10,
    position: 'relative',
  },
  pendingAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingAlertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  pendingAlertMessage: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
    marginBottom: 12,
  },
  viewPendingButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  viewPendingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  dismissAlert: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  riskAssessmentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  riskAssessmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  riskScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskScoreLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  riskScoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  riskScoreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  riskDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  pendingRiskInfo: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  pendingRiskTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pendingRiskItem: {
    marginBottom: 4,
  },
  pendingRiskText: {
    fontSize: 11,
    color: '#6b7280',
  },
  eligibilityStatusContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  eligibilityStatusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
  },
  eligibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eligibilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  eligibilityReason: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  nextEligibleContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  nextEligibleLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  nextEligibleDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  daysRemaining: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  verificationStatusContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  verificationStatusCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verificationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 2,
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#78350f',
  },
  verificationBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  verificationMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fde68a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  verificationMessageText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
    marginLeft: 6,
    flex: 1,
  },
  verificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewDetailsButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewDetailsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
});

// Add PropTypes for better type checking (optional)
DonorDashboard.defaultProps = {
  navigation: null,
};

export default DonorDashboard;

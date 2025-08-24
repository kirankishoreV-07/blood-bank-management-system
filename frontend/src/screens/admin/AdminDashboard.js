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
import { authService, adminService } from '../../services/api';
import api from '../../services/api';

const AdminDashboard = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [bloodInventory, setBloodInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // New state for blood group summary and detailed view
  const [selectedBloodGroup, setSelectedBloodGroup] = useState(null);
  const [bloodGroupSummary, setBloodGroupSummary] = useState([]);

  useEffect(() => {
    loadUserData();
    loadDashboardStats();
    loadPendingDonations();
    loadBloodInventory();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const response = await adminService.getDashboard();
      setStats(response.stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingDonations = async () => {
    try {
      console.log('🔄 Loading pending donations...');
      const response = await adminService.getPendingDonations();
      console.log('📥 Raw pending donations response:', response);
      
      if (response.success) {
        setPendingDonations(response.pendingDonations || []);
        console.log('✅ Loaded pending donations (success):', response.pendingDonations?.length || 0);
        console.log('📋 Pending donations list:', response.pendingDonations);
      } else {
        // Fallback for legacy format
        setPendingDonations(response.pendingDonations || []);
        console.log('✅ Loaded pending donations (legacy):', response.pendingDonations?.length || 0);
        console.log('📋 Pending donations list (legacy):', response.pendingDonations);
      }
    } catch (error) {
      console.error('❌ Error loading pending donations:', error);
      console.error('❌ Error details:', error.response?.data);
      setPendingDonations([]);
    }
  };

  const loadBloodInventory = async () => {
    try {
      console.log('🔄 Loading blood inventory...');
      console.log('🔗 API Base URL:', api.defaults.baseURL);
      
      const response = await adminService.getBloodInventory();
      
      console.log('📊 Blood inventory API response:', response);
      
      if (response && response.inventory) {
        setBloodInventory(response.inventory);
        console.log('✅ Blood inventory loaded successfully:', response.inventory.length, 'items');
        
        // Create realistic batch-based summary
        const summary = {};
        response.inventory.forEach(item => {
          if (!summary[item.blood_group]) {
            summary[item.blood_group] = {
              bloodGroup: item.blood_group,
              totalUnits: 0,
              batches: []
            };
          }
          
          // Each inventory item represents a separate donation batch
          const expiryDate = new Date(item.expiry_date);
          const donationDate = new Date(item.donation_date);
          const currentDate = new Date();
          const daysRemaining = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));
          
          // Determine status based on expiry
          let status = 'Available';
          if (daysRemaining < 0) {
            status = 'Expired';
          } else if (daysRemaining <= 2) {
            status = 'Critical';
          } else if (daysRemaining <= 7) {
            status = 'Expiring Soon';
          }
          
          // Check if recently added (within last 24 hours)
          const approvalDate = item.approval_date ? new Date(item.approval_date) : null;
          const isRecentlyAdded = approvalDate && (today - approvalDate) <= (24 * 60 * 60 * 1000);
          
          summary[item.blood_group].batches.push({
            id: item.id,
            batchId: `BAT-${item.id?.slice(-8) || Math.random().toString(36).slice(-8)}`,
            units: item.units_available,
            donationDate: item.donation_date,
            expiryDate: item.expiry_date,
            location: item.location || 'Main Blood Bank',
            donorName: item.donor_name || 'Anonymous Donor',
            daysRemaining,
            status,
            isExpired: daysRemaining < 0,
            isExpiringSoon: daysRemaining > 0 && daysRemaining <= 7,
            isCritical: daysRemaining > 0 && daysRemaining <= 2,
            isRecentlyAdded: isRecentlyAdded,
            approvalDate: item.approval_date
          });
          
          summary[item.blood_group].totalUnits += item.units_available;
        });
        
        // Sort batches by expiry date (most urgent first)
        Object.values(summary).forEach(group => {
          group.batches.sort((a, b) => {
            const dateA = new Date(a.expiryDate);
            const dateB = new Date(b.expiryDate);
            return dateA - dateB; // Earliest expiry first
          });
        });
        
        // Convert to array and sort by blood group
        const summaryArray = Object.values(summary).sort((a, b) => {
          const order = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
          return order.indexOf(a.bloodGroup) - order.indexOf(b.bloodGroup);
        });
        
        setBloodGroupSummary(summaryArray);
        
        // Log sample data for debugging
        if (response.inventory.length > 0) {
          console.log('📋 Sample inventory item:', response.inventory[0]);
        }
      } else {
        console.log('⚠️ No inventory data in response:', response);
        setBloodInventory([]);
        setBloodGroupSummary([]);
        
        // Try the debug endpoint as fallback
        console.log('🔧 Trying debug endpoint as fallback...');
        try {
          const debugResponse = await fetch(`${api.defaults.baseURL}/debug/blood-inventory-public`);
          const debugData = await debugResponse.json();
          
          if (debugData.success && debugData.inventory) {
            console.log('✅ Debug endpoint successful, using fallback data');
            setBloodInventory(debugData.inventory);
            
            // Create summary from debug data
            const summary = {};
            debugData.inventory.forEach(item => {
              if (!summary[item.blood_group]) {
                summary[item.blood_group] = {
                  bloodGroup: item.blood_group,
                  totalUnits: 0,
                  donations: []
                };
              }
              summary[item.blood_group].totalUnits += item.units_available;
              summary[item.blood_group].donations.push(item);
            });
            
            Object.values(summary).forEach(group => {
              group.donations.sort((a, b) => {
                const dateA = new Date(a.expiry_date || '9999-12-31');
                const dateB = new Date(b.expiry_date || '9999-12-31');
                return dateA - dateB;
              });
            });
            
            const summaryArray = Object.values(summary).sort((a, b) => {
              const order = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
              return order.indexOf(a.bloodGroup) - order.indexOf(b.bloodGroup);
            });
            
            setBloodGroupSummary(summaryArray);
          }
        } catch (debugError) {
          console.error('❌ Debug endpoint also failed:', debugError);
        }
      }
    } catch (error) {
      console.error('❌ Error loading blood inventory:', error);
      console.error('📋 Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Show user-friendly error message
      Alert.alert(
        'Blood Inventory Error',
        `Failed to load blood inventory: ${error.message}`,
        [
          { text: 'Retry', onPress: () => loadBloodInventory() },
          { text: 'OK' }
        ]
      );
      
      setBloodInventory([]);
      setBloodGroupSummary([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardStats();
    await loadPendingDonations();
    await loadBloodInventory();
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

  const handleDonationAction = async (donationId, action, adminNotes = '') => {
    try {
      let response;
      
      // Check if this is an enhanced pending donation with risk score
      const donation = pendingDonations.find(d => d.id === donationId);
      
      // Always use legacy processing for donations from 'donations' table
      // Enhanced processing is for 'pending_donations' table only
      console.log('🔄 Processing donation action:', { donationId, action, adminNotes });
      console.log('🔍 Donation data:', donation);
      
      response = await adminService.approveDonation(donationId, action, adminNotes);
      
      if (response.success || response.message) {
        const inventoryMessage = action === 'approve' ? 
          `\n✅ ${donation.units_donated} unit${donation.units_donated > 1 ? 's' : ''} of ${donation.users?.blood_group || 'unknown'} blood added to inventory` : '';
        
        Alert.alert(
          'Success',
          `Donation ${action}d successfully!${inventoryMessage}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Success',
          `Donation ${action}d successfully!`,
          [{ text: 'OK' }]
        );
      }
      
      // Reload pending donations, stats, and blood inventory
      await loadPendingDonations();
      await loadDashboardStats();
      await loadBloodInventory(); // Add this to refresh inventory after approval
      
    } catch (error) {
      console.error('❌ Error processing donation:', error);
      console.error('❌ Error response:', error.response?.data);
      
      const errorMessage = error.message || 
                          error.response?.data?.message || 
                          error.response?.data?.error || 
                          `Failed to ${action} donation`;
      
      Alert.alert(
        'Error', 
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  const showDonationActions = (donation) => {
    // Determine if this is an enhanced donation with risk assessment
    const isEnhanced = donation.risk_score !== undefined && donation.risk_score !== null;
    const riskLevel = isEnhanced ? getRiskLevel(donation.risk_score) : 'unknown';
    
    const donorName = donation.donor_name || donation.users?.full_name || 'Unknown Donor';
    const donorEmail = donation.donor_email || donation.users?.email || '';
    const bloodGroup = donation.donor_blood_group || donation.users?.blood_group || '';
    const units = donation.units_donated || 0;
    const center = donation.donation_center || 'Unknown Center';
    
    let alertTitle = 'Review Donation Request';
    let alertMessage = `Donor: ${donorName}${bloodGroup ? ` (${bloodGroup})` : ''}`;
    alertMessage += `\nCenter: ${center}`;
    alertMessage += `\nUnits: ${units}`;
    
    if (isEnhanced) {
      alertMessage += `\n\nRisk Assessment:`;
      alertMessage += `\nRisk Score: ${donation.risk_score?.toFixed(1) || 'N/A'}% (${riskLevel})`;
      alertMessage += `\nEligibility: ${donation.eligibility_status || 'Unknown'}`;
      
      if (donation.risk_flags && donation.risk_flags.length > 0) {
        alertMessage += `\n\nRisk Factors:`;
        donation.risk_flags.slice(0, 3).forEach(flag => {
          alertMessage += `\n• ${flag.message}`;
        });
        if (donation.risk_flags.length > 3) {
          alertMessage += `\n• ... and ${donation.risk_flags.length - 3} more`;
        }
      }
      
      if (donation.ai_verification?.confidence) {
        alertMessage += `\n\nAI Verification: ${(donation.ai_verification.confidence * 100).toFixed(1)}%`;
      }
    } else {
      // Legacy donation format
      if (donation.ai_verification?.confidence) {
        alertMessage += `\nAI Confidence: ${(donation.ai_verification.confidence * 100).toFixed(1)}%`;
      }
    }
    
    // Show warning for high-risk donations
    if (isEnhanced && donation.risk_score > 60) {
      Alert.alert(
        '⚠️ HIGH RISK DONATION',
        `${alertMessage}\n\n⚠️ WARNING: Risk score exceeds 60% threshold. This donation should be carefully reviewed or rejected for safety reasons.`,
        [
          {
            text: 'Reject (Recommended)',
            onPress: () => {
              Alert.prompt(
                'Rejection Reason',
                'Please provide a reason for rejection:',
                (text) => {
                  handleDonationAction(donation.id, 'reject', text || 'High risk score exceeds safety threshold');
                },
                'plain-text',
                'High risk score - safety concern'
              );
            },
            style: 'destructive'
          },
          {
            text: 'Review Anyway',
            onPress: () => showNormalDonationActions(donation, alertMessage)
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } else {
      showNormalDonationActions(donation, alertMessage);
    }
  };

  const showNormalDonationActions = (donation, alertMessage) => {
    Alert.alert(
      'Review Donation Request',
      alertMessage,
      [
        {
          text: 'Approve',
          onPress: () => handleDonationAction(donation.id, 'approve'),
          style: 'default'
        },
        {
          text: 'Reject',
          onPress: () => {
            Alert.prompt(
              'Rejection Reason',
              'Please provide a reason for rejection:',
              (text) => {
                if (text) {
                  handleDonationAction(donation.id, 'reject', text);
                }
              }
            );
          },
          style: 'destructive'
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const getRiskLevel = (riskScore) => {
    if (riskScore == null || riskScore === undefined) return 'Unknown';
    if (riskScore <= 20) return 'Low';
    if (riskScore <= 40) return 'Medium';
    if (riskScore <= 60) return 'High';
    return 'Critical';
  };

  const getRiskColor = (riskScore) => {
    if (riskScore == null || riskScore === undefined) return '#6b7280'; // Gray for unknown
    if (riskScore <= 20) return '#10b981'; // Green
    if (riskScore <= 40) return '#f59e0b'; // Yellow
    if (riskScore <= 60) return '#ef4444'; // Red
    return '#7c2d12'; // Dark red
  };

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const ActionButton = ({ title, subtitle, icon, color, onPress }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.actionIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={28} color="#fff" />
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
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
        <LinearGradient colors={['#dc2626', '#ef4444']} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.full_name || 'Admin'}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Users"
              value={stats?.total_users || 0}
              icon="people"
              color="#3b82f6"
            />
            <StatCard
              title="Blood Requests"
              value={stats?.total_requests || 0}
              icon="medical"
              color="#ef4444"
            />
            <StatCard
              title="Donations"
              value={stats?.total_donations || 0}
              icon="heart"
              color="#10b981"
            />
            <StatCard
              title="Pending Approvals"
              value={pendingDonations.length}
              icon="time"
              color="#f59e0b"
            />
          </View>
        </View>

        {/* AI Verification - Pending Donations */}
        <View style={styles.pendingContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI Verified Donations</Text>
            <Text style={styles.sectionSubtitle}>
              {pendingDonations.length} pending admin approval
            </Text>
          </View>
          
          {pendingDonations.length > 0 ? (
            pendingDonations.map((donation) => {
              const isEnhanced = donation.risk_score !== undefined && donation.risk_score !== null;
              const riskLevel = isEnhanced ? getRiskLevel(donation.risk_score) : null;
              const riskColor = isEnhanced ? getRiskColor(donation.risk_score) : '#10b981';
              const donorName = donation.donor_name || donation.users?.full_name || 'Unknown Donor';
              const donorEmail = donation.donor_email || donation.users?.email || '';
              const bloodGroup = donation.donor_blood_group || donation.users?.blood_group || '';
              
              return (
                <TouchableOpacity
                  key={donation.id}
                  style={[
                    styles.donationCard,
                    isEnhanced && donation.risk_score > 60 && styles.highRiskCard
                  ]}
                  onPress={() => showDonationActions(donation)}
                >
                  <View style={styles.donationHeader}>
                    <View style={styles.donorInfo}>
                      <Text style={styles.donorName}>{donorName}</Text>
                      <Text style={styles.donationDetails}>
                        {donation.donation_center} • {donation.units_donated} units
                        {bloodGroup && ` • ${bloodGroup}`}
                      </Text>
                      {isEnhanced && donation.risk_score != null && (
                        <Text style={styles.donationSubDetails}>
                          Risk Score: {donation.risk_score.toFixed(1)}% ({riskLevel}) • {donation.eligibility_status || 'Unknown'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.badgeContainer}>
                      {isEnhanced && donation.risk_score != null ? (
                        <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
                          <Text style={styles.riskText}>{donation.risk_score.toFixed(0)}%</Text>
                        </View>
                      ) : (
                        <View style={styles.verificationBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="white" />
                          <Text style={styles.verificationText}>
                            {donation.ai_verification?.confidence ? 
                              `${(donation.ai_verification.confidence * 100).toFixed(1)}%` : 
                              'Verified'
                            }
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {/* Risk Flags for Enhanced Donations */}
                  {isEnhanced && donation.risk_flags && donation.risk_flags.length > 0 && (
                    <View style={styles.riskFlagsContainer}>
                      <Text style={styles.riskFlagsTitle}>Risk Factors:</Text>
                      {donation.risk_flags.slice(0, 2).map((flag, index) => (
                        <View key={index} style={styles.riskFlag}>
                          <Ionicons 
                            name={flag.severity === 'high' ? 'warning' : 'alert-circle'} 
                            size={12} 
                            color={flag.severity === 'high' ? '#ef4444' : '#f59e0b'} 
                          />
                          <Text style={[
                            styles.riskFlagText,
                            flag.severity === 'high' && styles.highSeverityText
                          ]}>
                            {flag.message}
                          </Text>
                        </View>
                      ))}
                      {donation.risk_flags.length > 2 && (
                        <Text style={styles.moreRiskFlags}>
                          +{donation.risk_flags.length - 2} more risk factors
                        </Text>
                      )}
                    </View>
                  )}
                  
                  <View style={styles.donationFooter}>
                    <Text style={styles.donationDate}>
                      {new Date(donation.submitted_at || donation.donation_date).toLocaleDateString()}
                    </Text>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (isEnhanced && donation.risk_score != null && donation.risk_score > 60) {
                            Alert.alert(
                              'High Risk Warning',
                              `This donation has a risk score of ${donation.risk_score.toFixed(1)}% which exceeds the 60% safety threshold. Are you sure you want to approve?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { 
                                  text: 'Approve Anyway', 
                                  style: 'destructive',
                                  onPress: () => handleDonationAction(donation.id, 'approve', 'Admin override: High risk approved') 
                                }
                              ]
                            );
                          } else {
                            handleDonationAction(donation.id, 'approve');
                          }
                        }}
                      >
                        <Ionicons name="checkmark" size={16} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.prompt(
                            'Rejection Reason',
                            'Please provide a reason:',
                            (text) => {
                              if (text) {
                                handleDonationAction(donation.id, 'reject', text);
                              }
                            },
                            'plain-text',
                            isEnhanced && donation.risk_score > 60 ? 'High risk score exceeds safety threshold' : ''
                          );
                        }}
                      >
                        <Ionicons name="close" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle" size={48} color="#10b981" />
              <Text style={styles.emptyText}>All donations processed!</Text>
              <Text style={styles.emptySubtext}>No pending approvals at this time</Text>
            </View>
          )}
        </View>

        {/* Blood Inventory Section */}
        <View style={styles.inventoryContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.inventoryTitleContainer}>
              <Text style={styles.sectionTitle}>Blood Inventory</Text>
              {bloodGroupSummary && bloodGroupSummary.length > 0 && (
                <View style={styles.inventoryStats}>
                  {bloodGroupSummary.reduce((total, group) => 
                    total + (group.batches?.filter(batch => batch.isRecentlyAdded).length || 0), 0
                  ) > 0 && (
                    <View style={styles.recentUnitsIndicator}>
                      <Text style={styles.recentUnitsText}>
                        {bloodGroupSummary.reduce((total, group) => 
                          total + (group.batches?.filter(batch => batch.isRecentlyAdded)
                            .reduce((sum, batch) => sum + batch.units, 0) || 0), 0
                        )} new units added today
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            <View style={styles.headerActions}>
              {selectedBloodGroup && (
                <TouchableOpacity onPress={() => setSelectedBloodGroup(null)} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={20} color="#dc2626" />
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={loadBloodInventory} style={styles.refreshIconButton}>
                <Ionicons name="refresh" size={20} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
          
          {!selectedBloodGroup ? (
            // Summary View - Show blood groups with total units
            bloodGroupSummary && bloodGroupSummary.length > 0 ? (
              <View style={styles.summaryGrid}>
                {bloodGroupSummary.map((group, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.summaryCard}
                    activeOpacity={0.7}
                    onPress={() => setSelectedBloodGroup(group.bloodGroup)}
                  >
                    <View style={styles.summaryCardContent}>
                      <Text style={styles.summaryBloodGroup}>{group.bloodGroup}</Text>
                      <Text style={styles.summaryUnits}>{group.totalUnits} Units</Text>
                      <View style={styles.summaryFooter}>
                        <Ionicons name="chevron-forward" size={20} color="#dc2626" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="flask-outline" size={48} color="#6b7280" />
                <Text style={styles.emptyText}>Blood Inventory Loading...</Text>
                <Text style={styles.emptySubtext}>
                  {bloodInventory === null ? 'Fetching blood inventory data...' : 
                   bloodInventory && bloodInventory.length === 0 ? 'No blood inventory found. Donors need to complete donations.' :
                   'Please refresh to see the latest blood inventory.'}
                </Text>
                <TouchableOpacity 
                  style={styles.refreshButton} 
                  onPress={() => {
                    console.log('Manual refresh triggered');
                    loadBloodInventory();
                  }}
                >
                  <Ionicons name="refresh" size={20} color="#dc2626" />
                  <Text style={styles.refreshText}>Refresh Inventory</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            // Detail View - Show specific blood group donation batches sorted by expiry
            <View style={styles.detailView}>
              <Text style={styles.detailTitle}>
                {selectedBloodGroup} Blood Batches ({bloodGroupSummary.find(g => g.bloodGroup === selectedBloodGroup)?.totalUnits || 0} Total Units)
              </Text>
              <ScrollView style={styles.detailScroll}>
                {bloodGroupSummary
                  .find(group => group.bloodGroup === selectedBloodGroup)?.batches
                  ?.map((batch, index) => {
                    
                    return (
                      <View key={batch.id || index} style={[
                        styles.detailCard,
                        batch.isExpired && styles.expiredCard,
                        batch.isCritical && !batch.isExpired && styles.criticalCard,
                        batch.isExpiringSoon && !batch.isCritical && !batch.isExpired && styles.expiringCard
                      ]}>
                        {/* Priority indicator */}
                        <View style={[
                          styles.priorityIndicator,
                          batch.isExpired ? styles.expiredIndicator : 
                          batch.isCritical ? styles.criticalIndicator :
                          batch.isExpiringSoon ? styles.warningIndicator : styles.safeIndicator
                        ]} />
                        
                        {/* Batch Header */}
                        <View style={styles.batchHeader}>
                          <View style={styles.batchInfo}>
                            <View style={styles.batchIdContainer}>
                              <Text style={styles.batchId}>Batch #{batch.batchId}</Text>
                              {batch.isRecentlyAdded && (
                                <View style={styles.recentlyAddedBadge}>
                                  <Text style={styles.recentlyAddedText}>NEW</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.unitsContainer}>
                              <Text style={styles.detailUnits}>{batch.units}</Text>
                              <Text style={styles.unitsLabel}>Units</Text>
                            </View>
                          </View>
                          <View style={[
                            styles.statusBadge,
                            batch.isExpired ? styles.expiredBadge : 
                            batch.isCritical ? styles.criticalBadge :
                            batch.isExpiringSoon ? styles.expiringBadge : styles.availableBadge
                          ]}>
                            <Text style={styles.statusText}>{batch.status}</Text>
                          </View>
                        </View>
                        
                        {/* Expiry urgency indicator */}
                        <View style={[
                          styles.expiryIndicator,
                          batch.isExpired ? styles.expiredExpiryIndicator :
                          batch.isCritical ? styles.criticalExpiryIndicator :
                          batch.isExpiringSoon ? styles.warningExpiryIndicator : styles.safeExpiryIndicator
                        ]}>
                          <Ionicons 
                            name={batch.isExpired ? "alert-circle" : batch.isCritical ? "warning" : batch.isExpiringSoon ? "time" : "checkmark-circle"} 
                            size={18} 
                            color={batch.isExpired ? "#ef4444" : batch.isCritical ? "#dc2626" : batch.isExpiringSoon ? "#f59e0b" : "#10b981"} 
                          />
                          <Text style={[
                            styles.expiryText,
                            batch.isExpired && styles.expiredText,
                            batch.isCritical && !batch.isExpired && styles.criticalText,
                            batch.isExpiringSoon && !batch.isCritical && !batch.isExpired && styles.expiringText
                          ]}>
                            {batch.isExpired ? `Expired ${Math.abs(batch.daysRemaining)} days ago` : 
                             batch.isCritical ? `URGENT: ${batch.daysRemaining} days remaining` :
                             `${batch.daysRemaining} days remaining`}
                          </Text>
                        </View>
                        
                        {/* Batch Details */}
                        <View style={styles.inventoryDetails}>
                          <View style={styles.inventoryRow}>
                            <Ionicons name="person" size={18} color="#6b7280" />
                            <Text style={styles.inventoryLabel}>Donor:</Text>
                            <Text style={styles.inventoryValue} numberOfLines={1}>
                              {batch.donorName}
                            </Text>
                          </View>
                          
                          <View style={styles.inventoryRow}>
                            <Ionicons name="calendar" size={18} color="#6b7280" />
                            <Text style={styles.inventoryLabel}>Donated:</Text>
                            <Text style={styles.inventoryValue}>
                              {batch.donationDate ? 
                                new Date(batch.donationDate).toLocaleDateString() : 
                                'N/A'
                              }
                            </Text>
                          </View>
                          
                          <View style={styles.inventoryRow}>
                            <Ionicons name="time" size={18} color="#6b7280" />
                            <Text style={styles.inventoryLabel}>Expires:</Text>
                            <Text style={[
                              styles.inventoryValue,
                              batch.isExpired && styles.expiredText,
                              batch.isCritical && !batch.isExpired && styles.criticalText,
                              batch.isExpiringSoon && !batch.isCritical && !batch.isExpired && styles.expiringText
                            ]}>
                              {batch.expiryDate ? 
                                new Date(batch.expiryDate).toLocaleDateString() : 
                                'N/A'
                              }
                            </Text>
                          </View>
                          
                          <View style={styles.inventoryRow}>
                            <Ionicons name="location" size={18} color="#6b7280" />
                            <Text style={styles.inventoryLabel}>Location:</Text>
                            <Text style={styles.inventoryValue} numberOfLines={1}>
                              {batch.location}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <ActionButton
            title="Manage Users"
            subtitle="View and manage all registered users"
            icon="people-outline"
            color="#3b82f6"
            onPress={() => navigation.navigate('UserManagement')}
          />
          
          <ActionButton
            title="Blood Inventory"
            subtitle="Monitor blood stock levels"
            icon="flask-outline"
            color="#ef4444"
            onPress={() => navigation.navigate('BloodInventory')}
          />
          
          <ActionButton
            title="Blood Requests"
            subtitle="Review pending blood requests"
            icon="document-text-outline"
            color="#f59e0b"
            onPress={() => {
              Alert.alert(
                'Feature Coming Soon',
                'Blood requests management will be available in a future update.',
                [{ text: 'OK' }]
              );
            }}
          />
          
          <ActionButton
            title="Donation Records"
            subtitle="View all donation history"
            icon="heart-outline"
            color="#10b981"
            onPress={() => {
              Alert.alert(
                'Feature Coming Soon',
                'Donation records view will be available in a future update.',
                [{ text: 'OK' }]
              );
            }}
          />
          
          <ActionButton
            title="Reports & Analytics"
            subtitle="Generate system reports"
            icon="bar-chart-outline"
            color="#8b5cf6"
            onPress={() => navigation.navigate('ReportsAnalytics')}
          />
          
          <ActionButton
            title="System Settings"
            subtitle="Configure blood bank settings"
            icon="settings-outline"
            color="#6b7280"
            onPress={() => navigation.navigate('SystemSettings')}
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <Text style={styles.noActivityText}>No recent activity to display</Text>
          </View>
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
    color: '#fef2f2',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIconContainer: {
    borderRadius: 10,
    padding: 8,
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  activityContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noActivityText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  pendingContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
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
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  highRiskCard: {
    borderLeftColor: '#dc2626',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  donationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  donationDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  donationSubDetails: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontStyle: 'italic',
  },
  badgeContainer: {
    alignItems: 'flex-end',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  riskText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  riskFlagsContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  riskFlagsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  riskFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  riskFlagText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 6,
    flex: 1,
  },
  highSeverityText: {
    color: '#dc2626',
    fontWeight: '500',
  },
  moreRiskFlags: {
    fontSize: 10,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  donationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  donationDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: '#10b981',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
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
    color: '#10b981',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  inventoryContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inventoryGrid: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 4,
  },
  inventoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: 280,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  expiredCard: {
    borderLeftColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  expiringCard: {
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bloodGroup: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: '#d1fae5',
  },
  expiringBadge: {
    backgroundColor: '#fef3c7',
  },
  expiredBadge: {
    backgroundColor: '#fecaca',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  inventoryDetails: {
    gap: 8,
  },
  inventoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inventoryLabel: {
    fontSize: 14,
    color: '#6b7280',
    minWidth: 60,
  },
  inventoryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
  },
  expiredText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  expiringText: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  refreshText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
  // New styles for summary/detail view
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  summaryCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  summaryCardContent: {
    padding: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'space-between',
  },
  summaryBloodGroup: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
    textShadow: '0px 1px 3px rgba(0,0,0,0.1)',
  },
  summaryUnits: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryFooter: {
    alignSelf: 'flex-end',
    backgroundColor: '#fee2e2',
    borderRadius: 20,
    padding: 8,
    marginTop: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backText: {
    color: '#dc2626',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  detailView: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  detailScroll: {
    maxHeight: 450,
    paddingHorizontal: 4,
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  priorityIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4,
    height: '100%',
  },
  criticalIndicator: {
    backgroundColor: '#dc2626',
  },
  criticalCard: {
    borderColor: '#dc2626',
    borderWidth: 2,
  },
  criticalBadge: {
    backgroundColor: '#fecaca',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  criticalText: {
    color: '#dc2626',
    fontWeight: '700',
  },
  criticalExpiryIndicator: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  batchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  batchId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiredExpiryIndicator: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  warningExpiryIndicator: {
    backgroundColor: '#fffbeb',
    borderColor: '#fed7aa',
    borderWidth: 1,
  },
  safeExpiryIndicator: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
  },
  warningIndicator: {
    backgroundColor: '#f59e0b',
  },
  safeIndicator: {
    backgroundColor: '#10b981',
  },
  unitsContainer: {
    alignItems: 'center',
  },
  detailUnits: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  unitsLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 2,
  },
  expiryIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  expiryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  batchIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  recentlyAddedBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  recentlyAddedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  inventoryTitleContainer: {
    flex: 1,
  },
  inventoryStats: {
    marginTop: 4,
  },
  recentUnitsIndicator: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  recentUnitsText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default AdminDashboard;

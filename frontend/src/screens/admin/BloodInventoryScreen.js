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
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/api';

const BloodInventoryScreen = ({ navigation }) => {
  const [inventory, setInventory] = useState([]);
  const [bloodGroupSummary, setBloodGroupSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all', // all, available, expiring, expired, critical
    location: 'all',
    sortBy: 'expiry' // expiry, donation_date, blood_group
  });

  useEffect(() => {
    loadBloodInventory();
  }, []);

  const loadBloodInventory = async () => {
    try {
      console.log('🔄 Loading blood inventory...');
      const response = await adminService.getBloodInventory();
      
      if (response && response.inventory) {
        setInventory(response.inventory);
        console.log('✅ Blood inventory loaded:', response.inventory.length, 'items');
        
        // Process inventory into blood group summary
        processInventoryData(response.inventory);
      } else {
        console.log('⚠️ No inventory data received');
        setInventory([]);
        setBloodGroupSummary([]);
      }
    } catch (error) {
      console.error('❌ Error loading blood inventory:', error);
      Alert.alert('Error', 'Failed to load blood inventory');
      setInventory([]);
      setBloodGroupSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const processInventoryData = (inventoryData) => {
    const today = new Date();
    const summary = {};
    
    inventoryData.forEach(item => {
      if (!summary[item.blood_group]) {
        summary[item.blood_group] = {
          bloodGroup: item.blood_group,
          totalUnits: 0,
          availableUnits: 0,
          expiringUnits: 0,
          expiredUnits: 0,
          criticalUnits: 0,
          batches: []
        };
      }
      
      const expiryDate = new Date(item.expiry_date);
      const donationDate = new Date(item.donation_date);
      const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      let status = 'Available';
      if (daysRemaining < 0) {
        status = 'Expired';
        summary[item.blood_group].expiredUnits += item.units_available;
      } else if (daysRemaining <= 2) {
        status = 'Critical';
        summary[item.blood_group].criticalUnits += item.units_available;
      } else if (daysRemaining <= 7) {
        status = 'Expiring Soon';
        summary[item.blood_group].expiringUnits += item.units_available;
      } else {
        summary[item.blood_group].availableUnits += item.units_available;
      }
      
      const approvalDate = item.approval_date ? new Date(item.approval_date) : null;
      const isRecentlyAdded = approvalDate && (today - approvalDate) <= (24 * 60 * 60 * 1000);
      
      const batch = {
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
        isRecentlyAdded,
        approvalDate: item.approval_date,
        donorId: item.donor_id
      };
      
      summary[item.blood_group].batches.push(batch);
      summary[item.blood_group].totalUnits += item.units_available;
    });
    
    // Sort batches by expiry date (most urgent first)
    Object.values(summary).forEach(group => {
      group.batches.sort((a, b) => {
        const dateA = new Date(a.expiryDate);
        const dateB = new Date(b.expiryDate);
        return dateA - dateB;
      });
    });
    
    // Convert to array and sort by blood group
    const summaryArray = Object.values(summary).sort((a, b) => {
      const order = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
      return order.indexOf(a.bloodGroup) - order.indexOf(b.bloodGroup);
    });
    
    setBloodGroupSummary(summaryArray);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBloodInventory();
    setRefreshing(false);
  };

  const showBatchDetails = (batch) => {
    setSelectedBatch(batch);
    setModalVisible(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return '#10b981';
      case 'Expiring Soon': return '#f59e0b';
      case 'Critical': return '#dc2626';
      case 'Expired': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Available': return 'checkmark-circle';
      case 'Expiring Soon': return 'time';
      case 'Critical': return 'warning';
      case 'Expired': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getTotalStats = () => {
    const stats = {
      totalUnits: 0,
      availableUnits: 0,
      expiringUnits: 0,
      expiredUnits: 0,
      criticalUnits: 0,
      totalBatches: 0
    };

    bloodGroupSummary.forEach(group => {
      stats.totalUnits += group.totalUnits;
      stats.availableUnits += group.availableUnits;
      stats.expiringUnits += group.expiringUnits;
      stats.expiredUnits += group.expiredUnits;
      stats.criticalUnits += group.criticalUnits;
      stats.totalBatches += group.batches.length;
    });

    return stats;
  };

  const BloodGroupCard = ({ group }) => (
    <TouchableOpacity
      style={styles.bloodGroupCard}
      onPress={() => setSelectedBloodGroup(group.bloodGroup)}
      activeOpacity={0.7}
    >
      <View style={styles.bloodGroupHeader}>
        <Text style={styles.bloodGroupTitle}>{group.bloodGroup}</Text>
        <Text style={styles.bloodGroupUnits}>{group.totalUnits} Units</Text>
      </View>
      
      <View style={styles.bloodGroupStats}>
        <View style={styles.statRow}>
          <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.statText}>Available: {group.availableUnits}</Text>
        </View>
        <View style={styles.statRow}>
          <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.statText}>Expiring: {group.expiringUnits}</Text>
        </View>
        <View style={styles.statRow}>
          <View style={[styles.statusDot, { backgroundColor: '#dc2626' }]} />
          <Text style={styles.statText}>Critical: {group.criticalUnits}</Text>
        </View>
        <View style={styles.statRow}>
          <View style={[styles.statusDot, { backgroundColor: '#6b7280' }]} />
          <Text style={styles.statText}>Expired: {group.expiredUnits}</Text>
        </View>
      </View>
      
      <Text style={styles.batchCount}>{group.batches.length} Batches</Text>
    </TouchableOpacity>
  );

  const BatchCard = ({ batch }) => (
    <TouchableOpacity
      style={[
        styles.batchCard,
        batch.isExpired && styles.expiredCard,
        batch.isCritical && !batch.isExpired && styles.criticalCard,
        batch.isExpiringSoon && !batch.isCritical && !batch.isExpired && styles.expiringCard
      ]}
      onPress={() => showBatchDetails(batch)}
      activeOpacity={0.7}
    >
      <View style={styles.batchHeader}>
        <View style={styles.batchInfo}>
          <Text style={styles.batchId}>Batch #{batch.batchId}</Text>
          <Text style={styles.batchUnits}>{batch.units} Units</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(batch.status) }]}>
          <Ionicons name={getStatusIcon(batch.status)} size={12} color="white" />
          <Text style={styles.statusText}>{batch.status}</Text>
        </View>
      </View>
      
      <View style={styles.batchDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={14} color="#6b7280" />
          <Text style={styles.detailText}>{batch.donorName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={14} color="#6b7280" />
          <Text style={styles.detailText}>
            Expires: {new Date(batch.expiryDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={14} color="#6b7280" />
          <Text style={styles.detailText}>{batch.location}</Text>
        </View>
      </View>
      
      {batch.isRecentlyAdded && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Loading blood inventory...</Text>
      </View>
    );
  }

  const totalStats = getTotalStats();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#dc2626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blood Inventory</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerActionButton} 
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="filter" size={20} color="#dc2626" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Overall Stats */}
      <View style={styles.overallStatsContainer}>
        <LinearGradient colors={['#dc2626', '#ef4444']} style={styles.statsGradient}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalStats.totalUnits}</Text>
              <Text style={styles.statLabel}>Total Units</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalStats.availableUnits}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalStats.criticalUnits}</Text>
              <Text style={styles.statLabel}>Critical</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalStats.totalBatches}</Text>
              <Text style={styles.statLabel}>Batches</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!selectedBloodGroup ? (
          // Blood Group Summary View
          <View style={styles.summaryContainer}>
            <Text style={styles.sectionTitle}>Blood Groups</Text>
            {bloodGroupSummary.length > 0 ? (
              bloodGroupSummary.map((group, index) => (
                <BloodGroupCard key={index} group={group} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="flask-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No blood inventory found</Text>
                <Text style={styles.emptySubtext}>
                  Blood units will appear here after donation approvals
                </Text>
              </View>
            )}
          </View>
        ) : (
          // Detailed Batch View
          <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.backToSummaryButton}
                onPress={() => setSelectedBloodGroup(null)}
              >
                <Ionicons name="arrow-back" size={20} color="#dc2626" />
                <Text style={styles.backToSummaryText}>Back to Summary</Text>
              </TouchableOpacity>
              <Text style={styles.detailTitle}>
                {selectedBloodGroup} Blood Batches
              </Text>
            </View>
            
            {bloodGroupSummary
              .find(group => group.bloodGroup === selectedBloodGroup)?.batches
              .map((batch, index) => (
                <BatchCard key={index} batch={batch} />
              ))}
          </View>
        )}
      </ScrollView>

      {/* Batch Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Batch Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {selectedBatch && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Batch Information</Text>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Batch ID:</Text>
                  <Text style={styles.modalDetailValue}>{selectedBatch.batchId}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Units Available:</Text>
                  <Text style={styles.modalDetailValue}>{selectedBatch.units}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBatch.status) }]}>
                    <Ionicons name={getStatusIcon(selectedBatch.status)} size={12} color="white" />
                    <Text style={styles.statusText}>{selectedBatch.status}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Donation Details</Text>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Donor:</Text>
                  <Text style={styles.modalDetailValue}>{selectedBatch.donorName}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Donation Date:</Text>
                  <Text style={styles.modalDetailValue}>
                    {new Date(selectedBatch.donationDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Expiry Date:</Text>
                  <Text style={[
                    styles.modalDetailValue,
                    selectedBatch.isExpired && styles.expiredText,
                    selectedBatch.isCritical && !selectedBatch.isExpired && styles.criticalText,
                    selectedBatch.isExpiringSoon && !selectedBatch.isCritical && !selectedBatch.isExpired && styles.expiringText
                  ]}>
                    {new Date(selectedBatch.expiryDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Days Remaining:</Text>
                  <Text style={[
                    styles.modalDetailValue,
                    selectedBatch.isExpired && styles.expiredText,
                    selectedBatch.isCritical && !selectedBatch.isExpired && styles.criticalText,
                    selectedBatch.isExpiringSoon && !selectedBatch.isCritical && !selectedBatch.isExpired && styles.expiringText
                  ]}>
                    {selectedBatch.isExpired 
                      ? `Expired ${Math.abs(selectedBatch.daysRemaining)} days ago`
                      : `${selectedBatch.daysRemaining} days`
                    }
                  </Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Storage Information</Text>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Location:</Text>
                  <Text style={styles.modalDetailValue}>{selectedBatch.location}</Text>
                </View>
                {selectedBatch.approvalDate && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Approved On:</Text>
                    <Text style={styles.modalDetailValue}>
                      {new Date(selectedBatch.approvalDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.useButton]}
                  onPress={() => {
                    Alert.alert(
                      'Feature Coming Soon',
                      'Blood usage tracking will be available in a future update.',
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Ionicons name="medical" size={20} color="#fff" />
                  <Text style={styles.modalActionText}>Mark as Used</Text>
                </TouchableOpacity>
                
                {selectedBatch.isExpired && (
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.disposeButton]}
                    onPress={() => {
                      Alert.alert(
                        'Feature Coming Soon',
                        'Expired blood disposal tracking will be available in a future update.',
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Ionicons name="trash" size={20} color="#fff" />
                    <Text style={styles.modalActionText}>Dispose</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  overallStatsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsGradient: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fecaca',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    marginTop: 20,
  },
  summaryContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  bloodGroupCard: {
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
  bloodGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bloodGroupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  bloodGroupUnits: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  bloodGroupStats: {
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
  },
  batchCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  detailContainer: {
    paddingHorizontal: 20,
  },
  detailHeader: {
    marginBottom: 16,
  },
  backToSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backToSummaryText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  batchCard: {
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
    borderLeftColor: '#10b981',
    position: 'relative',
  },
  expiredCard: {
    borderLeftColor: '#6b7280',
    backgroundColor: '#f9fafb',
  },
  criticalCard: {
    borderLeftColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  expiringCard: {
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  batchInfo: {
    flex: 1,
  },
  batchId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  batchUnits: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  batchDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalDetailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  modalDetailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  expiredText: {
    color: '#ef4444',
    fontWeight: '700',
  },
  criticalText: {
    color: '#dc2626',
    fontWeight: '700',
  },
  expiringText: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  modalActions: {
    marginTop: 20,
    gap: 12,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  useButton: {
    backgroundColor: '#3b82f6',
  },
  disposeButton: {
    backgroundColor: '#ef4444',
  },
  modalActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BloodInventoryScreen;

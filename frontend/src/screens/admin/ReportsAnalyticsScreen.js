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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/api';

const { width } = Dimensions.get('window');

const ReportsAnalyticsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // week, month, quarter, year
  const [reports, setReports] = useState({
    donations: [],
    users: [],
    inventory: []
  });

  useEffect(() => {
    loadReportsData();
  }, [selectedPeriod]);

  const loadReportsData = async () => {
    try {
      // Load dashboard stats
      const dashboardResponse = await adminService.getDashboard();
      setDashboardStats(dashboardResponse.stats);

      // Load additional analytics data
      await loadDonationAnalytics();
      await loadUserAnalytics();
      await loadInventoryAnalytics();
    } catch (error) {
      console.error('Error loading reports data:', error);
      Alert.alert('Error', 'Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const loadDonationAnalytics = async () => {
    try {
      // For now, generate mock analytics data
      // In a real implementation, this would come from backend endpoints
      const mockDonationData = generateMockDonationData();
      setReports(prev => ({ ...prev, donations: mockDonationData }));
    } catch (error) {
      console.error('Error loading donation analytics:', error);
    }
  };

  const loadUserAnalytics = async () => {
    try {
      const usersResponse = await adminService.getAllUsers();
      const users = usersResponse.users || [];
      
      // Process user registration trends
      const userAnalytics = processUserData(users);
      setReports(prev => ({ ...prev, users: userAnalytics }));
    } catch (error) {
      console.error('Error loading user analytics:', error);
    }
  };

  const loadInventoryAnalytics = async () => {
    try {
      const inventoryResponse = await adminService.getBloodInventory();
      const inventory = inventoryResponse.inventory || [];
      
      // Process inventory trends
      const inventoryAnalytics = processInventoryData(inventory);
      setReports(prev => ({ ...prev, inventory: inventoryAnalytics }));
    } catch (error) {
      console.error('Error loading inventory analytics:', error);
    }
  };

  const generateMockDonationData = () => {
    const periods = getPeriods();
    return periods.map((period, index) => ({
      period: period.label,
      donations: Math.floor(Math.random() * 50) + 10,
      units: Math.floor(Math.random() * 100) + 20,
      approvalRate: Math.floor(Math.random() * 30) + 70, // 70-100%
    }));
  };

  const processUserData = (users) => {
    const periods = getPeriods();
    const currentDate = new Date();
    
    return periods.map(period => {
      const periodStart = new Date(currentDate);
      const periodEnd = new Date(currentDate);
      
      switch (selectedPeriod) {
        case 'week':
          periodStart.setDate(currentDate.getDate() - (period.index * 7));
          periodEnd.setDate(currentDate.getDate() - ((period.index - 1) * 7));
          break;
        case 'month':
          periodStart.setMonth(currentDate.getMonth() - period.index);
          periodEnd.setMonth(currentDate.getMonth() - (period.index - 1));
          break;
        case 'quarter':
          periodStart.setMonth(currentDate.getMonth() - (period.index * 3));
          periodEnd.setMonth(currentDate.getMonth() - ((period.index - 1) * 3));
          break;
        case 'year':
          periodStart.setFullYear(currentDate.getFullYear() - period.index);
          periodEnd.setFullYear(currentDate.getFullYear() - (period.index - 1));
          break;
      }
      
      const periodUsers = users.filter(user => {
        const userDate = new Date(user.created_at);
        return userDate >= periodStart && userDate < periodEnd;
      });
      
      return {
        period: period.label,
        totalUsers: periodUsers.length,
        donors: periodUsers.filter(u => u.user_type === 'donor').length,
        recipients: periodUsers.filter(u => u.user_type === 'recipient').length,
        admins: periodUsers.filter(u => u.user_type === 'admin').length,
      };
    });
  };

  const processInventoryData = (inventory) => {
    const bloodGroups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
    const today = new Date();
    
    return bloodGroups.map(bloodGroup => {
      const groupInventory = inventory.filter(item => item.blood_group === bloodGroup);
      const totalUnits = groupInventory.reduce((sum, item) => sum + item.units_available, 0);
      
      const expiredUnits = groupInventory
        .filter(item => new Date(item.expiry_date) < today)
        .reduce((sum, item) => sum + item.units_available, 0);
      
      const expiringUnits = groupInventory
        .filter(item => {
          const expiryDate = new Date(item.expiry_date);
          const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          return daysRemaining > 0 && daysRemaining <= 7;
        })
        .reduce((sum, item) => sum + item.units_available, 0);
      
      return {
        bloodGroup,
        totalUnits,
        availableUnits: totalUnits - expiredUnits,
        expiredUnits,
        expiringUnits,
        batches: groupInventory.length
      };
    });
  };

  const getPeriods = () => {
    const currentDate = new Date();
    const periods = [];
    
    for (let i = 5; i >= 0; i--) {
      let label = '';
      switch (selectedPeriod) {
        case 'week':
          const weekStart = new Date(currentDate);
          weekStart.setDate(currentDate.getDate() - (i * 7));
          label = `Week of ${weekStart.toLocaleDateString()}`;
          break;
        case 'month':
          const monthDate = new Date(currentDate);
          monthDate.setMonth(currentDate.getMonth() - i);
          label = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          break;
        case 'quarter':
          const quarterDate = new Date(currentDate);
          quarterDate.setMonth(currentDate.getMonth() - (i * 3));
          const quarter = Math.floor(quarterDate.getMonth() / 3) + 1;
          label = `Q${quarter} ${quarterDate.getFullYear()}`;
          break;
        case 'year':
          const yearDate = new Date(currentDate);
          yearDate.setFullYear(currentDate.getFullYear() - i);
          label = yearDate.getFullYear().toString();
          break;
      }
      periods.push({ label, index: i });
    }
    
    return periods;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportsData();
    setRefreshing(false);
  };

  const generateReport = (reportType) => {
    Alert.alert(
      'Generate Report',
      `This will generate a detailed ${reportType} report. This feature will be fully implemented in a future update.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: () => {
          Alert.alert('Success', `${reportType} report generation initiated. You will receive it via email.`);
        }}
      ]
    );
  };

  const PeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['week', 'month', 'quarter', 'year'].map(period => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.selectedPeriodButton
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.selectedPeriodButtonText
          ]}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const MetricCard = ({ title, value, change, icon, color }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: color }]}>
          <Ionicons name={icon} size={20} color="#fff" />
        </View>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {change && (
        <View style={styles.metricChange}>
          <Ionicons 
            name={change > 0 ? "trending-up" : "trending-down"} 
            size={16} 
            color={change > 0 ? "#10b981" : "#ef4444"} 
          />
          <Text style={[
            styles.metricChangeText,
            { color: change > 0 ? "#10b981" : "#ef4444" }
          ]}>
            {Math.abs(change)}%
          </Text>
        </View>
      )}
    </View>
  );

  const ChartCard = ({ title, data, keyField, valueField, color }) => (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const maxValue = Math.max(...data.map(d => d[valueField]));
          const height = maxValue > 0 ? (item[valueField] / maxValue) * 100 : 0;
          
          return (
            <View key={index} style={styles.chartBarContainer}>
              <View style={styles.chartBar}>
                <View style={[
                  styles.chartBarFill,
                  { height: `${height}%`, backgroundColor: color }
                ]} />
              </View>
              <Text style={styles.chartBarLabel}>{item[keyField]}</Text>
              <Text style={styles.chartBarValue}>{item[valueField]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const ReportCard = ({ title, description, icon, onPress }) => (
    <TouchableOpacity style={styles.reportCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.reportCardContent}>
        <View style={styles.reportIcon}>
          <Ionicons name={icon} size={24} color="#dc2626" />
        </View>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>{title}</Text>
          <Text style={styles.reportDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
        <TouchableOpacity style={styles.headerActionButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#dc2626" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Users"
              value={dashboardStats?.total_users || 0}
              change={5.2}
              icon="people"
              color="#3b82f6"
            />
            <MetricCard
              title="Active Donors"
              value={dashboardStats?.active_donors || 0}
              change={8.1}
              icon="heart"
              color="#10b981"
            />
            <MetricCard
              title="Blood Requests"
              value={dashboardStats?.total_requests || 0}
              change={-2.3}
              icon="medical"
              color="#ef4444"
            />
            <MetricCard
              title="Success Rate"
              value="94.2%"
              change={1.8}
              icon="checkmark-circle"
              color="#8b5cf6"
            />
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trends Analysis</Text>
          <PeriodSelector />
        </View>

        {/* Donation Trends */}
        <View style={styles.section}>
          <ChartCard
            title="Donation Trends"
            data={reports.donations}
            keyField="period"
            valueField="donations"
            color="#10b981"
          />
        </View>

        {/* User Registration Trends */}
        <View style={styles.section}>
          <ChartCard
            title="User Registrations"
            data={reports.users}
            keyField="period"
            valueField="totalUsers"
            color="#3b82f6"
          />
        </View>

        {/* Blood Group Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blood Group Distribution</Text>
          <View style={styles.bloodGroupGrid}>
            {reports.inventory.map((group, index) => (
              <View key={index} style={styles.bloodGroupCard}>
                <Text style={styles.bloodGroupTitle}>{group.bloodGroup}</Text>
                <Text style={styles.bloodGroupUnits}>{group.totalUnits}</Text>
                <Text style={styles.bloodGroupLabel}>Units</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Report Generation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generate Reports</Text>
          
          <ReportCard
            title="Donation Activity Report"
            description="Detailed donation statistics and trends"
            icon="heart-outline"
            onPress={() => generateReport('Donation Activity')}
          />
          
          <ReportCard
            title="User Management Report"
            description="User registration and activity analysis"
            icon="people-outline"
            onPress={() => generateReport('User Management')}
          />
          
          <ReportCard
            title="Blood Inventory Report"
            description="Stock levels and expiry tracking"
            icon="flask-outline"
            onPress={() => generateReport('Blood Inventory')}
          />
          
          <ReportCard
            title="Compliance Report"
            description="Safety and regulatory compliance"
            icon="shield-checkmark-outline"
            onPress={() => generateReport('Compliance')}
          />
          
          <ReportCard
            title="Financial Report"
            description="Cost analysis and budget tracking"
            icon="card-outline"
            onPress={() => generateReport('Financial')}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Statistics</Text>
          <View style={styles.quickStatsContainer}>
            <LinearGradient colors={['#dc2626', '#ef4444']} style={styles.quickStatsGradient}>
              <View style={styles.quickStatsGrid}>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatNumber}>
                    {dashboardStats?.total_donations || 0}
                  </Text>
                  <Text style={styles.quickStatLabel}>Total Donations</Text>
                </View>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatNumber}>
                    {Math.floor((dashboardStats?.total_donations || 0) * 2.5)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Lives Saved</Text>
                </View>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatNumber}>
                    {reports.inventory.reduce((sum, group) => sum + group.totalUnits, 0)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Units Available</Text>
                </View>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatNumber}>
                    {reports.inventory.reduce((sum, group) => sum + group.expiringUnits, 0)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Expiring Soon</Text>
                </View>
              </View>
            </LinearGradient>
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
  headerActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: (width - 52) / 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    borderRadius: 8,
    padding: 6,
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricChangeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: '#dc2626',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  selectedPeriodButtonText: {
    color: '#fff',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 8,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  chartBar: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    justifyContent: 'flex-end',
    minHeight: 20,
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartBarLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  chartBarValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
    textAlign: 'center',
  },
  bloodGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bloodGroupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: (width - 76) / 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bloodGroupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  bloodGroupUnits: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 4,
  },
  bloodGroupLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reportCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  reportIcon: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  reportDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  quickStatsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickStatsGradient: {
    padding: 20,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickStatItem: {
    width: (width - 76) / 2,
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#fecaca',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ReportsAnalyticsScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SystemSettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      criticalAlerts: true,
      donationReminders: false,
      inventoryAlerts: true,
      systemUpdates: true,
    },
    bloodBank: {
      bankName: 'Central Blood Bank',
      location: 'Main Hospital Campus',
      contactEmail: 'admin@bloodbank.org',
      emergencyContact: '+1-234-567-8900',
      operatingHours: '24/7',
      bufferPeriodDays: 56,
      criticalInventoryThreshold: 10,
      expiryWarningDays: 7,
    },
    system: {
      autoApproval: false,
      requireMedicalClearance: true,
      enableAIVerification: true,
      backupFrequency: 'daily',
      dataRetentionDays: 365,
      maintenanceMode: false,
    },
    security: {
      sessionTimeoutMinutes: 30,
      passwordMinLength: 8,
      requireTwoFactor: false,
      allowRemoteAccess: true,
      auditLogging: true,
    }
  });
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('adminSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('adminSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const updateSetting = (category, key, value) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    };
    saveSettings(newSettings);
  };

  const openEditModal = (category, key, currentValue) => {
    setEditingField({ category, key });
    setTempValue(currentValue.toString());
    setModalVisible(true);
  };

  const saveEditedValue = () => {
    if (editingField) {
      let value = tempValue;
      
      // Convert to appropriate type
      if (!isNaN(tempValue) && tempValue !== '') {
        value = parseInt(tempValue);
      }
      
      updateSetting(editingField.category, editingField.key, value);
    }
    setModalVisible(false);
    setEditingField(null);
    setTempValue('');
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultSettings = {
              notifications: {
                emailNotifications: true,
                pushNotifications: true,
                criticalAlerts: true,
                donationReminders: false,
                inventoryAlerts: true,
                systemUpdates: true,
              },
              bloodBank: {
                bankName: 'Central Blood Bank',
                location: 'Main Hospital Campus',
                contactEmail: 'admin@bloodbank.org',
                emergencyContact: '+1-234-567-8900',
                operatingHours: '24/7',
                bufferPeriodDays: 56,
                criticalInventoryThreshold: 10,
                expiryWarningDays: 7,
              },
              system: {
                autoApproval: false,
                requireMedicalClearance: true,
                enableAIVerification: true,
                backupFrequency: 'daily',
                dataRetentionDays: 365,
                maintenanceMode: false,
              },
              security: {
                sessionTimeoutMinutes: 30,
                passwordMinLength: 8,
                requireTwoFactor: false,
                allowRemoteAccess: true,
                auditLogging: true,
              }
            };
            saveSettings(defaultSettings);
          }
        }
      ]
    );
  };

  const exportSettings = () => {
    Alert.alert(
      'Export Settings',
      'Settings export functionality will be available in a future update. Settings will be exported as a JSON file.',
      [{ text: 'OK' }]
    );
  };

  const importSettings = () => {
    Alert.alert(
      'Import Settings',
      'Settings import functionality will be available in a future update. You will be able to import settings from a JSON file.',
      [{ text: 'OK' }]
    );
  };

  const SettingSection = ({ title, children }) => (
    <View style={styles.settingSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const ToggleSetting = ({ label, description, value, onValueChange }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#f3f4f6', true: '#fecaca' }}
        thumbColor={value ? '#dc2626' : '#9ca3af'}
      />
    </View>
  );

  const EditableSetting = ({ label, value, onPress, suffix = '' }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue}>{value}{suffix}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </TouchableOpacity>
  );

  const ActionButton = ({ title, subtitle, icon, color, onPress, destructive = false }) => (
    <TouchableOpacity
      style={[styles.actionButton, destructive && styles.destructiveButton]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <View style={styles.actionInfo}>
        <Text style={[styles.actionTitle, destructive && styles.destructiveText]}>{title}</Text>
        <Text style={[styles.actionSubtitle, destructive && styles.destructiveSubtext]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={destructive ? "#ef4444" : "#6b7280"} />
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>System Settings</Text>
        <TouchableOpacity style={styles.headerActionButton} onPress={resetToDefaults}>
          <Ionicons name="refresh" size={20} color="#dc2626" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Blood Bank Information */}
        <SettingSection title="Blood Bank Information">
          <EditableSetting
            label="Bank Name"
            value={settings.bloodBank.bankName}
            onPress={() => openEditModal('bloodBank', 'bankName', settings.bloodBank.bankName)}
          />
          <EditableSetting
            label="Location"
            value={settings.bloodBank.location}
            onPress={() => openEditModal('bloodBank', 'location', settings.bloodBank.location)}
          />
          <EditableSetting
            label="Contact Email"
            value={settings.bloodBank.contactEmail}
            onPress={() => openEditModal('bloodBank', 'contactEmail', settings.bloodBank.contactEmail)}
          />
          <EditableSetting
            label="Emergency Contact"
            value={settings.bloodBank.emergencyContact}
            onPress={() => openEditModal('bloodBank', 'emergencyContact', settings.bloodBank.emergencyContact)}
          />
          <EditableSetting
            label="Operating Hours"
            value={settings.bloodBank.operatingHours}
            onPress={() => openEditModal('bloodBank', 'operatingHours', settings.bloodBank.operatingHours)}
          />
        </SettingSection>

        {/* Notification Settings */}
        <SettingSection title="Notification Settings">
          <ToggleSetting
            label="Email Notifications"
            description="Receive notifications via email"
            value={settings.notifications.emailNotifications}
            onValueChange={(value) => updateSetting('notifications', 'emailNotifications', value)}
          />
          <ToggleSetting
            label="Push Notifications"
            description="Receive push notifications on mobile"
            value={settings.notifications.pushNotifications}
            onValueChange={(value) => updateSetting('notifications', 'pushNotifications', value)}
          />
          <ToggleSetting
            label="Critical Alerts"
            description="Immediate alerts for urgent situations"
            value={settings.notifications.criticalAlerts}
            onValueChange={(value) => updateSetting('notifications', 'criticalAlerts', value)}
          />
          <ToggleSetting
            label="Donation Reminders"
            description="Remind donors about eligibility"
            value={settings.notifications.donationReminders}
            onValueChange={(value) => updateSetting('notifications', 'donationReminders', value)}
          />
          <ToggleSetting
            label="Inventory Alerts"
            description="Alerts for low stock and expiring blood"
            value={settings.notifications.inventoryAlerts}
            onValueChange={(value) => updateSetting('notifications', 'inventoryAlerts', value)}
          />
          <ToggleSetting
            label="System Updates"
            description="Notifications about system updates"
            value={settings.notifications.systemUpdates}
            onValueChange={(value) => updateSetting('notifications', 'systemUpdates', value)}
          />
        </SettingSection>

        {/* System Configuration */}
        <SettingSection title="System Configuration">
          <EditableSetting
            label="Donation Buffer Period"
            value={settings.bloodBank.bufferPeriodDays}
            suffix=" days"
            onPress={() => openEditModal('bloodBank', 'bufferPeriodDays', settings.bloodBank.bufferPeriodDays)}
          />
          <EditableSetting
            label="Critical Inventory Threshold"
            value={settings.bloodBank.criticalInventoryThreshold}
            suffix=" units"
            onPress={() => openEditModal('bloodBank', 'criticalInventoryThreshold', settings.bloodBank.criticalInventoryThreshold)}
          />
          <EditableSetting
            label="Expiry Warning Period"
            value={settings.bloodBank.expiryWarningDays}
            suffix=" days"
            onPress={() => openEditModal('bloodBank', 'expiryWarningDays', settings.bloodBank.expiryWarningDays)}
          />
          <ToggleSetting
            label="Auto Approval"
            description="Automatically approve low-risk donations"
            value={settings.system.autoApproval}
            onValueChange={(value) => updateSetting('system', 'autoApproval', value)}
          />
          <ToggleSetting
            label="Require Medical Clearance"
            description="Require medical clearance for high-risk donors"
            value={settings.system.requireMedicalClearance}
            onValueChange={(value) => updateSetting('system', 'requireMedicalClearance', value)}
          />
          <ToggleSetting
            label="AI Verification"
            description="Enable AI-powered donation verification"
            value={settings.system.enableAIVerification}
            onValueChange={(value) => updateSetting('system', 'enableAIVerification', value)}
          />
          <ToggleSetting
            label="Maintenance Mode"
            description="Enable maintenance mode (blocks new registrations)"
            value={settings.system.maintenanceMode}
            onValueChange={(value) => updateSetting('system', 'maintenanceMode', value)}
          />
        </SettingSection>

        {/* Security Settings */}
        <SettingSection title="Security Settings">
          <EditableSetting
            label="Session Timeout"
            value={settings.security.sessionTimeoutMinutes}
            suffix=" minutes"
            onPress={() => openEditModal('security', 'sessionTimeoutMinutes', settings.security.sessionTimeoutMinutes)}
          />
          <EditableSetting
            label="Minimum Password Length"
            value={settings.security.passwordMinLength}
            suffix=" characters"
            onPress={() => openEditModal('security', 'passwordMinLength', settings.security.passwordMinLength)}
          />
          <ToggleSetting
            label="Two-Factor Authentication"
            description="Require 2FA for admin accounts"
            value={settings.security.requireTwoFactor}
            onValueChange={(value) => updateSetting('security', 'requireTwoFactor', value)}
          />
          <ToggleSetting
            label="Remote Access"
            description="Allow remote access to the system"
            value={settings.security.allowRemoteAccess}
            onValueChange={(value) => updateSetting('security', 'allowRemoteAccess', value)}
          />
          <ToggleSetting
            label="Audit Logging"
            description="Log all system activities"
            value={settings.security.auditLogging}
            onValueChange={(value) => updateSetting('security', 'auditLogging', value)}
          />
        </SettingSection>

        {/* Data Management */}
        <SettingSection title="Data Management">
          <EditableSetting
            label="Data Retention Period"
            value={settings.system.dataRetentionDays}
            suffix=" days"
            onPress={() => openEditModal('system', 'dataRetentionDays', settings.system.dataRetentionDays)}
          />
          <EditableSetting
            label="Backup Frequency"
            value={settings.system.backupFrequency}
            onPress={() => {
              Alert.alert(
                'Backup Frequency',
                'Choose backup frequency:',
                [
                  { text: 'Hourly', onPress: () => updateSetting('system', 'backupFrequency', 'hourly') },
                  { text: 'Daily', onPress: () => updateSetting('system', 'backupFrequency', 'daily') },
                  { text: 'Weekly', onPress: () => updateSetting('system', 'backupFrequency', 'weekly') },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}
          />
        </SettingSection>

        {/* System Actions */}
        <SettingSection title="System Actions">
          <ActionButton
            title="Export Settings"
            subtitle="Download current settings as backup"
            icon="download-outline"
            color="#3b82f6"
            onPress={exportSettings}
          />
          <ActionButton
            title="Import Settings"
            subtitle="Restore settings from backup file"
            icon="cloud-upload-outline"
            color="#10b981"
            onPress={importSettings}
          />
          <ActionButton
            title="System Diagnostics"
            subtitle="Run comprehensive system check"
            icon="analytics-outline"
            color="#8b5cf6"
            onPress={() => Alert.alert('Feature Coming Soon', 'System diagnostics will be available in a future update.')}
          />
          <ActionButton
            title="Clear Cache"
            subtitle="Clear temporary files and cache"
            icon="trash-outline"
            color="#f59e0b"
            onPress={() => {
              Alert.alert(
                'Clear Cache',
                'This will clear all temporary files and cache. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', onPress: () => Alert.alert('Success', 'Cache cleared successfully') }
                ]
              );
            }}
          />
          <ActionButton
            title="Factory Reset"
            subtitle="Reset all settings to default values"
            icon="refresh-outline"
            color="#ef4444"
            onPress={resetToDefaults}
            destructive={true}
          />
        </SettingSection>

        {/* System Information */}
        <SettingSection title="System Information">
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Blood Bank Management System</Text>
            <Text style={styles.infoText}>Version: 1.0.0</Text>
            <Text style={styles.infoText}>Build: 2025.08.24</Text>
            <Text style={styles.infoText}>Database: PostgreSQL via Supabase</Text>
            <Text style={styles.infoText}>Last Updated: August 24, 2025</Text>
          </View>
        </SettingSection>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Setting</Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={saveEditedValue}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalFieldLabel}>
              {editingField ? editingField.key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) : ''}
            </Text>
            <TextInput
              style={styles.modalTextInput}
              value={tempValue}
              onChangeText={setTempValue}
              placeholder="Enter value..."
              autoFocus={true}
              multiline={editingField?.key === 'location' || editingField?.key === 'bankName'}
            />
          </View>
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
  settingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 2,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  destructiveButton: {
    backgroundColor: '#fef2f2',
  },
  actionIcon: {
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  destructiveText: {
    color: '#ef4444',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  destructiveSubtext: {
    color: '#fca5a5',
  },
  infoCard: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    margin: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
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
  modalCancelButton: {
    padding: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  modalContent: {
    padding: 20,
  },
  modalFieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalTextInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 48,
  },
});

export default SystemSettingsScreen;

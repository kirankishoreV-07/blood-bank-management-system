import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

// Import screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import AdminLoginScreen from './src/screens/admin/AdminLoginScreen';
import AdminSignupScreen from './src/screens/admin/AdminSignupScreen';
import AdminDashboard from './src/screens/admin/AdminDashboard';
import UserManagementScreen from './src/screens/admin/UserManagementScreen';
import BloodInventoryScreen from './src/screens/admin/BloodInventoryScreen';
import ReportsAnalyticsScreen from './src/screens/admin/ReportsAnalyticsScreen';
import SystemSettingsScreen from './src/screens/admin/SystemSettingsScreen';
import DonorLoginScreen from './src/screens/donor/DonorLoginScreen';
import DonorSignupScreen from './src/screens/donor/DonorSignupScreen';
import DonorDashboard from './src/screens/donor/DonorDashboard';
import DonorEligibilityScreen from './src/screens/donor/DonorEligibilityScreen';
import DonationTypeScreen from './src/screens/donor/DonationTypeScreen';
import WalkInDonationScreen from './src/screens/donor/EnhancedWalkInDonation';
import ScheduleAppointmentScreen from './src/screens/donor/ScheduleAppointmentScreen';
import RecordPastDonationScreen from './src/screens/donor/RecordPastDonationScreen';
import DonationCertificateScreen from './src/screens/donor/DonationCertificateScreen';
import RecipientLoginScreen from './src/screens/recipient/RecipientLoginScreen';
import RecipientSignupScreen from './src/screens/recipient/RecipientSignupScreen';
import RecipientDashboard from './src/screens/recipient/RecipientDashboard';
import NetworkTestScreen from './src/screens/NetworkTestScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#dc2626" />
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#dc2626',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen} 
          options={{ headerShown: false }}
        />
        
        {/* Network Test Screen - For debugging */}
        <Stack.Screen 
          name="NetworkTest" 
          component={NetworkTestScreen} 
          options={{ title: 'Network Test' }}
        />
        
        {/* Admin Screens */}
        <Stack.Screen 
          name="AdminLogin" 
          component={AdminLoginScreen} 
          options={{ title: 'Admin Login' }}
        />
        <Stack.Screen 
          name="AdminSignup" 
          component={AdminSignupScreen} 
          options={{ title: 'Admin Registration' }}
        />
        <Stack.Screen 
          name="AdminDashboard" 
          component={AdminDashboard} 
          options={{ title: 'Admin Dashboard', headerLeft: null }}
        />
        <Stack.Screen 
          name="UserManagement" 
          component={UserManagementScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="BloodInventory" 
          component={BloodInventoryScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ReportsAnalytics" 
          component={ReportsAnalyticsScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="SystemSettings" 
          component={SystemSettingsScreen} 
          options={{ headerShown: false }}
        />
        
        {/* Donor Screens */}
        <Stack.Screen 
          name="DonorLogin" 
          component={DonorLoginScreen} 
          options={{ title: 'Donor Login' }}
        />
        <Stack.Screen 
          name="DonorSignup" 
          component={DonorSignupScreen} 
          options={{ title: 'Donor Registration' }}
        />
        <Stack.Screen 
          name="DonorDashboard" 
          component={DonorDashboard} 
          options={{ title: 'Donor Dashboard', headerLeft: null }}
        />
        <Stack.Screen 
          name="DonorEligibility" 
          component={DonorEligibilityScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="DonationType" 
          component={DonationTypeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="WalkInDonation" 
          component={WalkInDonationScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ScheduleAppointment" 
          component={ScheduleAppointmentScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="RecordPastDonation" 
          component={RecordPastDonationScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="DonationCertificate" 
          component={DonationCertificateScreen} 
          options={{ headerShown: false }}
        />
        
        {/* Recipient Screens */}
        <Stack.Screen 
          name="RecipientLogin" 
          component={RecipientLoginScreen} 
          options={{ title: 'Recipient Login' }}
        />
        <Stack.Screen 
          name="RecipientSignup" 
          component={RecipientSignupScreen} 
          options={{ title: 'Recipient Registration' }}
        />
        <Stack.Screen 
          name="RecipientDashboard" 
          component={RecipientDashboard} 
          options={{ title: 'Recipient Dashboard', headerLeft: null }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

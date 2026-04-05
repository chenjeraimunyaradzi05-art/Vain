/**
 * Ngurra Pathways Mobile App
 * Main entry point with navigation, drawer, and state persistence
 * 
 * Features:
 * - Bottom tab navigation with 5 main sections
 * - Drawer navigation for settings/profile access
 * - Navigation state persistence across app restarts
 * - Deep linking support
 * - Smooth screen transitions
 */

import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Context
import { NotificationProvider } from './context/NotificationContext';

// Components
import { OfflineIndicator } from './components';

// Screens
import HomeScreen from './screens/HomeScreen';
import JobsScreen from './screens/JobsScreen';
import JobDetailScreen from './screens/JobDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import MentorshipScreen from './screens/MentorshipScreen';
import SettingsScreen from './screens/SettingsScreen';
import CoursesScreen from './screens/CoursesScreen';
import CommunityScreen from './screens/CommunityScreen';
import MessagesScreen from './screens/MessagesScreen';
import ApplyScreen from './screens/ApplyScreen';
import MentorDetailScreen from './screens/MentorDetailScreen';
import BookSessionScreen from './screens/BookSessionScreen';
import CulturalCalendarScreen from './screens/CulturalCalendarScreen';
import ResourcesScreen from './screens/ResourcesScreen';
import MyApplicationsScreen from './screens/MyApplicationsScreen';
import SavedJobsScreen from './screens/SavedJobsScreen';
import WellnessScreen from './screens/WellnessScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import CourseDetailScreen from './screens/CourseDetailScreen';
import AccessibilitySettingsScreen from './screens/AccessibilitySettingsScreen';
import NotificationPreferencesScreen from './screens/NotificationPreferencesScreen';
import VideoResumeScreen from './screens/VideoResumeScreen';
import OnboardingScreen from './screens/OnboardingScreen';

// Theme
import { colors, spacing } from './theme';

// Deep linking configuration
import { linking } from './config/linking';

// Offline sync service
import { initializeOfflineSync } from './services/offlineSync';

// Accessibility service
import { initializeAccessibility } from './services/accessibility';

// Navigation state persistence key
const NAVIGATION_STATE_KEY = '@ngurra_nav_state';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Initialize services
initializeOfflineSync().catch(console.warn);
initializeAccessibility().catch(console.warn);

/**
 * Custom drawer content with user profile header
 */
function CustomDrawerContent(props) {
  const profile = { name: 'Guest User', email: '' };
  
  return (
    <DrawerContentScrollView 
      {...props}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ flex: 1 }}
    >
      {/* User Profile Header */}
      <View style={{
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: spacing.md,
      }}>
        <View style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.md,
        }}>
          <Ionicons name="person" size={32} color={colors.text} />
        </View>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: colors.text,
          marginBottom: 4,
        }}>
          {profile.name}
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: colors.textSecondary 
        }}>
          {profile.email}
        </Text>
      </View>
      
      {/* Drawer Items */}
      <DrawerItemList {...props} />
      
      {/* Spacer */}
      <View style={{ flex: 1 }} />
      
    </DrawerContentScrollView>
  );
}

/**
 * Main tab navigator for authenticated users
 */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Jobs':
              iconName = focused ? 'briefcase' : 'briefcase-outline';
              break;
            case 'Courses':
              iconName = focused ? 'school' : 'school-outline';
              break;
            case 'Community':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerLeft: () => null, // Hamburger menu added below
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={({ navigation }) => ({ 
          title: 'Dashboard',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => navigation.getParent()?.openDrawer()}
              style={{ marginLeft: spacing.md }}
              accessibilityLabel="Open menu"
              accessibilityRole="button"
            >
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Notifications')}
              style={{ marginRight: spacing.md }}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
            >
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen 
        name="Jobs" 
        component={JobsScreen}
        options={({ navigation }) => ({ 
          title: 'Jobs',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => navigation.getParent()?.openDrawer()}
              style={{ marginLeft: spacing.md }}
              accessibilityLabel="Open menu"
            >
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen 
        name="Courses" 
        component={CoursesScreen}
        options={({ navigation }) => ({ 
          title: 'Courses',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => navigation.getParent()?.openDrawer()}
              style={{ marginLeft: spacing.md }}
              accessibilityLabel="Open menu"
            >
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen 
        name="Community" 
        component={CommunityScreen}
        options={({ navigation }) => ({ 
          title: 'Community',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => navigation.getParent()?.openDrawer()}
              style={{ marginLeft: spacing.md }}
              accessibilityLabel="Open menu"
            >
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={({ navigation }) => ({ 
          title: 'Profile',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => navigation.getParent()?.openDrawer()}
              style={{ marginLeft: spacing.md }}
              accessibilityLabel="Open menu"
            >
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        })}
      />
    </Tab.Navigator>
  );
}

/**
 * Drawer navigator wrapping main tabs with quick access to settings
 */
function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.background,
          width: 280,
        },
        drawerLabelStyle: {
          color: colors.text,
          marginLeft: -16,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        swipeEnabled: true,
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen 
        name="MainTabs" 
        component={MainTabs}
        options={{
          title: 'Home',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="DrawerMyApplications" 
        component={MyApplicationsScreen}
        options={{
          title: 'My Applications',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="DrawerSavedJobs" 
        component={SavedJobsScreen}
        options={{
          title: 'Saved Jobs',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bookmark-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="DrawerNotifications" 
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="DrawerMessages" 
        component={MessagesScreen}
        options={{
          title: 'Messages',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="DrawerMentorship" 
        component={MentorshipScreen}
        options={{
          title: 'Mentorship',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="DrawerCulturalCalendar" 
        component={CulturalCalendarScreen}
        options={{
          title: 'Cultural Calendar',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="DrawerWellness" 
        component={WellnessScreen}
        options={{
          title: 'Wellness',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="DrawerSettings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

/**
 * Main stack navigator with drawer and detail screens
 */
function RootNavigator() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen 
        name="Main" 
        component={DrawerNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="JobDetail" 
        component={JobDetailScreen}
        options={{ title: 'Job Details' }}
      />
      <Stack.Screen 
        name="CourseDetail" 
        component={CourseDetailScreen}
        options={{ title: 'Course Details' }}
      />
      <Stack.Screen 
        name="Mentorship" 
        component={MentorshipScreen}
        options={{ title: 'Mentorship' }}
      />
      <Stack.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="Apply" 
        component={ApplyScreen}
        options={{ 
          title: 'Apply for Job',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="MentorDetail" 
        component={MentorDetailScreen}
        options={{ title: 'Mentor Profile' }}
      />
      <Stack.Screen 
        name="BookSession" 
        component={BookSessionScreen}
        options={{ 
          title: 'Book Session',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="CulturalCalendar" 
        component={CulturalCalendarScreen}
        options={{ title: 'Cultural Calendar' }}
      />
      <Stack.Screen 
        name="Resources" 
        component={ResourcesScreen}
        options={{ title: 'Resources' }}
      />
      <Stack.Screen 
        name="MyApplications" 
        component={MyApplicationsScreen}
        options={{ title: 'My Applications' }}
      />
      <Stack.Screen 
        name="SavedJobs" 
        component={SavedJobsScreen}
        options={{ title: 'Saved Jobs & Alerts' }}
      />
      <Stack.Screen 
        name="Wellness" 
        component={WellnessScreen}
        options={{ title: 'Wellness' }}
      />
      <Stack.Screen 
        name="AccessibilitySettings" 
        component={AccessibilitySettingsScreen}
        options={{ title: 'Accessibility' }}
      />
      <Stack.Screen 
        name="NotificationPreferences" 
        component={NotificationPreferencesScreen}
        options={{ title: 'Notification Preferences' }}
      />
      <Stack.Screen 
        name="VideoResume" 
        component={VideoResumeScreen}
        options={{ 
          title: 'Video Resume',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingScreen}
        options={{ 
          headerShown: false,
          animation: 'fade',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * App component with navigation state persistence
 */
export default function App() {
  const [isReady, setIsReady] = useState(!__DEV__); // Skip in production for faster startup
  const [initialState, setInitialState] = useState();

  // Restore navigation state from AsyncStorage
  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
        const state = savedStateString ? JSON.parse(savedStateString) : undefined;
        
        if (state !== undefined) {
          setInitialState(state);
        }
      } catch (e) {
        console.warn('Failed to restore navigation state:', e);
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState();
    }
  }, [isReady]);

  // Persist navigation state to AsyncStorage
  const onStateChange = useCallback((state) => {
    AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state)).catch((e) => {
      console.warn('Failed to persist navigation state:', e);
    });
  }, []);

  if (!isReady) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: colors.background, 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NotificationProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <OfflineIndicator />
        <NavigationContainer 
          linking={linking}
          initialState={initialState}
          onStateChange={onStateChange}
          theme={{
            dark: true,
            colors: {
              primary: colors.primary,
              background: colors.background,
              card: colors.surface,
              text: colors.text,
              border: colors.border,
              notification: colors.error,
            },
          }}
        >
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </View>
    </NotificationProvider>
  );
}

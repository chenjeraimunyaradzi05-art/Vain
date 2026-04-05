import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSession } from '../hooks/useSession';
import { useNotifications } from '../context/NotificationContext';
import { dataSovereigntyApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  NotificationPreferences: undefined;
  AccessibilitySettings: undefined;
};

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
}

interface SettingsState {
  biometricEnabled: boolean;
  notificationsEnabled: boolean;
  lowDataMode: boolean;
  analyticsConsent: boolean;
  marketingConsent: boolean;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { user, biometricEnabled, toggleBiometric } = useSession();
  const { notificationsEnabled, toggleNotifications } = useNotifications();
  
  const [settings, setSettings] = useState<SettingsState>({
    biometricEnabled: false,
    notificationsEnabled: true,
    lowDataMode: false,
    analyticsConsent: true,
    marketingConsent: false,
  });
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
    loadConsent();
  }, []);

  async function checkBiometricAvailability() {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);
    setSettings(prev => ({ ...prev, biometricEnabled: !!biometricEnabled }));
  }

  async function loadConsent() {
    try {
      const result = await dataSovereigntyApi.getConsent().catch(() => null);
      if (result && result.consent) {
        setSettings(prev => ({
          ...prev,
          analyticsConsent: result.consent.analytics ?? true,
          marketingConsent: result.consent.marketing ?? false,
        }));
      }
    } catch (error) {
      console.error('Failed to load consent:', error);
    }
  }

  async function handleBiometricToggle(value: boolean) {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric access',
      });
      if (result.success) {
        await toggleBiometric(true);
        setSettings(prev => ({ ...prev, biometricEnabled: true }));
      }
    } else {
      await toggleBiometric(false);
      setSettings(prev => ({ ...prev, biometricEnabled: false }));
    }
  }

  async function handleConsentChange(type: 'analyticsConsent' | 'marketingConsent', value: boolean) {
    setSettings(prev => ({ ...prev, [type]: value }));
    try {
      await dataSovereigntyApi.updateConsent({
        [type.replace('Consent', '')]: value,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update consent preferences');
      setSettings(prev => ({ ...prev, [type]: !value }));
    }
  }

  async function handleExportData() {
    Alert.alert(
      'Export Your Data',
      'This will generate a complete export of your personal data. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setIsLoading(true);
            try {
              await dataSovereigntyApi.exportData();
              Alert.alert('Success', 'Your data export has been requested. You will receive an email shortly.');
            } catch (error) {
              Alert.alert('Error', 'Failed to request data export');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="person-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{user?.email || 'Guest'}</Text>
              <Text style={styles.rowSubtitle}>Account</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          {biometricAvailable && (
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="finger-print-outline" size={22} color={colors.text} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Biometric Access</Text>
              </View>
              <Switch
                value={settings.biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                thumbColor={settings.biometricEnabled ? colors.primary : colors.textSecondary}
              />
            </View>
          )}
          
          <View style={[styles.row, styles.rowBorder]}>
            <View style={styles.rowIcon}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.border, true: `${colors.primary}80` }}
              thumbColor={notificationsEnabled ? colors.primary : colors.textSecondary}
            />
          </View>

          <TouchableOpacity 
            style={[styles.row, styles.rowBorder]}
            onPress={() => navigation.navigate('AccessibilitySettings')}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="accessibility-outline" size={22} color={colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Accessibility</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Sovereignty */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Sovereignty</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="analytics-outline" size={22} color={colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Analytics Consent</Text>
              <Text style={styles.rowSubtitle}>Help us improve the app</Text>
            </View>
            <Switch
              value={settings.analyticsConsent}
              onValueChange={(val) => handleConsentChange('analyticsConsent', val)}
              trackColor={{ false: colors.border, true: `${colors.primary}80` }}
              thumbColor={settings.analyticsConsent ? colors.primary : colors.textSecondary}
            />
          </View>

          <TouchableOpacity 
            style={[styles.row, styles.rowBorder]}
            onPress={handleExportData}
            disabled={isLoading}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="download-outline" size={22} color={colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Export My Data</Text>
              <Text style={styles.rowSubtitle}>Download a copy of your data</Text>
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.row}
            onPress={() => Linking.openURL('mailto:support@ngurra.com.au')}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="mail-outline" size={22} color={colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.row, styles.rowBorder]}
            onPress={() => Linking.openURL('https://ngurra.com.au/privacy')}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Version 1.0.0 (Build 100)</Text>
      <View style={styles.footerSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle2,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    ...typography.body,
    color: colors.text,
  },
  rowSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: `${colors.error}10`,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  versionText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  footerSpacer: {
    height: 40,
  },
});

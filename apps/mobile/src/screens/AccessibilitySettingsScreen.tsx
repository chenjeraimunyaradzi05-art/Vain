/**
 * Accessibility Settings Screen
 * Allows users to customize accessibility preferences
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  AccessibilityInfo,
  Platform,
  Linking,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import {
  getAccessibilityPrefs,
  updateAccessibilityPrefs,
  addAccessibilityListener,
  AccessibilityPreferences
} from '../services/accessibility';

interface SettingRowProps {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
  onPress?: () => void;
}

/**
 * Setting Row Component
 */
function SettingRow({ icon, title, description, children, onPress }: SettingRowProps) {
  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container 
      style={styles.settingRow}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={title}
      accessibilityHint={description}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={24} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <View style={styles.settingControl}>
        {children}
      </View>
    </Container>
  );
}

/**
 * Section Header
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <View 
      style={styles.sectionHeader}
      accessibilityRole="header"
    >
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/**
 * Accessibility Settings Screen Component
 */
export default function AccessibilitySettingsScreen() {
  const [prefs, setPrefs] = useState<AccessibilityPreferences>(getAccessibilityPrefs());
  
  useEffect(() => {
    const unsubscribe = addAccessibilityListener((newPrefs) => {
      setPrefs(newPrefs);
    });
    return unsubscribe;
  }, []);
  
  const updatePref = async (key: keyof AccessibilityPreferences, value: any) => {
    await updateAccessibilityPrefs({ [key]: value });
  };
  
  const openSystemSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('App-Prefs:root=ACCESSIBILITY');
    } else {
      Linking.openSettings();
    }
  };
  
  const fontScaleLabels: Record<number, string> = {
    0.85: 'Small',
    1.0: 'Default',
    1.15: 'Large',
    1.3: 'Extra Large',
    1.5: 'Largest',
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Accessibility</Text>
        <Text style={styles.headerSubtitle}>
          Customize your experience to meet your needs.
        </Text>
      </View>

      <SectionHeader title="Display" />
      
      <SettingRow
        icon="text"
        title="Text Size"
        description={`Current size: ${fontScaleLabels[prefs.fontScale] || 'Custom'}`}
      >
        <View style={styles.sliderContainer}>
          <Slider
            style={{ width: 120, height: 40 }}
            minimumValue={0.85}
            maximumValue={1.5}
            step={0.15}
            value={prefs.fontScale}
            onValueChange={(val) => updatePref('fontScale', parseFloat(val.toFixed(2)))}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
        </View>
      </SettingRow>

      <SettingRow
        icon="contrast"
        title="High Contrast"
        description="Increase contrast for better visibility"
      >
        <Switch
          value={prefs.highContrastMode}
          onValueChange={(val) => updatePref('highContrastMode', val)}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </SettingRow>

      <SettingRow
        icon="text-outline"
        title="Bold Text"
        description="Use bold text throughout the app"
      >
        <Switch
          value={prefs.boldText}
          onValueChange={(val) => updatePref('boldText', val)}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </SettingRow>

      <SectionHeader title="Motion & Interaction" />

      <SettingRow
        icon="move"
        title="Reduce Motion"
        description="Minimize animations and transitions"
      >
        <Switch
          value={prefs.reducedMotion}
          onValueChange={(val) => updatePref('reducedMotion', val)}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </SettingRow>

      <SectionHeader title="Screen Reader" />

      <SettingRow
        icon="volume-high"
        title="Screen Reader"
        description={prefs.screenReaderEnabled ? "Screen reader is active" : "Screen reader is inactive"}
        onPress={openSystemSettings}
      >
        <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
      </SettingRow>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color={colors.primary} style={styles.infoIcon} />
        <Text style={styles.infoText}>
          Some settings are managed by your device's system settings. We've detected your system preferences where possible.
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.systemSettingsButton}
        onPress={openSystemSettings}
      >
        <Text style={styles.systemSettingsText}>Open System Accessibility Settings</Text>
      </TouchableOpacity>
      
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIcon: {
    marginRight: spacing.md,
    width: 32,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  settingControl: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
  sliderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  systemSettingsButton: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  systemSettingsText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  spacer: {
    height: 40,
  },
});
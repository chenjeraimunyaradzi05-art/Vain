/**
 * Appearance Settings Screen
 * 
 * Allows users to switch between light/dark mode and customize appearance.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { spacing, typography, borderRadius } from '../theme';

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    mode: 'light',
    label: 'Light',
    icon: 'sunny',
    description: 'Always use light theme',
  },
  {
    mode: 'dark',
    label: 'Dark',
    icon: 'moon',
    description: 'Always use dark theme',
  },
  {
    mode: 'system',
    label: 'System',
    icon: 'phone-portrait-outline',
    description: 'Follow system settings',
  },
];

export default function AppearanceSettingsScreen() {
  const navigation = useNavigation();
  const { mode, isDark, colors, setMode } = useTheme();

  const handleSelectTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Appearance</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Theme Selection */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Theme
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {THEME_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option.mode}
              style={[
                styles.themeOption,
                index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                mode === option.mode && { backgroundColor: colors.primaryLight + '20' },
              ]}
              onPress={() => handleSelectTheme(option.mode)}
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === option.mode }}
            >
              <View style={styles.themeOptionLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.primary + '20' },
                  ]}
                >
                  <Ionicons name={option.icon} size={24} color={colors.primary} />
                </View>
                <View style={styles.themeTextContainer}>
                  <Text style={[styles.themeLabel, { color: colors.text }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.themeDescription, { color: colors.textSecondary }]}>
                    {option.description}
                  </Text>
                </View>
              </View>
              {mode === option.mode && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Current Theme Preview */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Preview
        </Text>
        <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>
              {isDark ? '🌙 Dark Mode Active' : '☀️ Light Mode Active'}
            </Text>
          </View>
          <View style={styles.previewContent}>
            <View
              style={[styles.previewBox, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.previewBoxText, { color: colors.textInverse }]}>
                Primary
              </Text>
            </View>
            <View
              style={[styles.previewBox, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.previewBoxText, { color: colors.textInverse }]}>
                Accent
              </Text>
            </View>
            <View
              style={[styles.previewBox, { backgroundColor: colors.success }]}
            >
              <Text style={[styles.previewBoxText, { color: colors.textInverse }]}>
                Success
              </Text>
            </View>
          </View>
          <View style={styles.previewTextContainer}>
            <Text style={[styles.previewBodyText, { color: colors.text }]}>
              Primary Text Color
            </Text>
            <Text style={[styles.previewBodyText, { color: colors.textSecondary }]}>
              Secondary Text Color
            </Text>
            <Text style={[styles.previewBodyText, { color: colors.textMuted }]}>
              Muted Text Color
            </Text>
          </View>
        </View>
      </View>

      {/* Additional Appearance Options */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Additional Options
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Ionicons name="text" size={22} color={colors.primary} />
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                Large Text
              </Text>
            </View>
            <Switch
              value={false}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              disabled
            />
          </View>
          <View style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={styles.optionLeft}>
              <Ionicons name="contrast" size={22} color={colors.primary} />
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                High Contrast
              </Text>
            </View>
            <Switch
              value={false}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              disabled
            />
          </View>
          <View style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={styles.optionLeft}>
              <Ionicons name="flash" size={22} color={colors.primary} />
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                Reduce Motion
              </Text>
            </View>
            <Switch
              value={false}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              disabled
            />
          </View>
        </View>
        <Text style={[styles.helpText, { color: colors.textMuted }]}>
          Additional accessibility options coming soon
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.card,
    overflow: 'hidden',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  themeLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  themeDescription: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  previewCard: {
    borderRadius: borderRadius.card,
    padding: spacing.md,
  },
  previewHeader: {
    marginBottom: spacing.md,
  },
  previewTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  previewBox: {
    width: 80,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBoxText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  previewTextContainer: {
    gap: spacing.xs,
  },
  previewBodyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionLabel: {
    fontSize: typography.fontSize.md,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.sm,
    paddingLeft: spacing.xs,
  },
});

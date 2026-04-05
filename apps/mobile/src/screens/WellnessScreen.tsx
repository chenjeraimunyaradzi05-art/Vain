/**
 * Wellness Screen
 * 
 * Check-in on wellbeing, access support resources, and track wellness over time.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../hooks/useSession';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { wellnessApi } from '../services/api';

interface MoodOption {
  emoji: string;
  label: string;
  value: number;
  color: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { emoji: '😊', label: 'Great', value: 5, color: '#10B981' },
  { emoji: '🙂', label: 'Good', value: 4, color: '#34D399' },
  { emoji: '😐', label: 'Okay', value: 3, color: '#FBBF24' },
  { emoji: '😔', label: 'Low', value: 2, color: '#F97316' },
  { emoji: '😢', label: 'Struggling', value: 1, color: '#EF4444' },
];

interface SupportResource {
  title: string;
  description: string;
  phone: string;
  icon: string;
  color: string;
}

const SUPPORT_RESOURCES: SupportResource[] = [
  {
    title: '13YARN',
    description: 'Aboriginal & Torres Strait Islander crisis support',
    phone: '13 92 76',
    icon: 'call',
    color: '#8B5CF6',
  },
  {
    title: 'Lifeline',
    description: '24/7 crisis support and suicide prevention',
    phone: '13 11 14',
    icon: 'heart',
    color: '#EC4899',
  },
  {
    title: 'Beyond Blue',
    description: 'Anxiety, depression & mental health support',
    phone: '1300 22 4636',
    icon: 'medical',
    color: '#3B82F6',
  },
  {
    title: 'Kids Helpline',
    description: 'For young people aged 5-25',
    phone: '1800 55 1800',
    icon: 'people',
    color: '#10B981',
  },
];

interface CheckIn {
  id: string;
  mood: number;
  createdAt: string;
}

interface WellnessStats {
  average: number;
  total: number;
  streak: number;
}

export default function WellnessScreen() {
  const { token } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<WellnessStats>({ average: 0, total: 0, streak: 0 });

  useEffect(() => {
    loadWellnessData();
  }, []);

  const loadWellnessData = async () => {
    try {
      const data = await wellnessApi.getCheckIns();
      setRecentCheckIns(data.checkIns || []);
      setStats(data.stats || { average: 0, total: 0, streak: 0 });
    } catch (error) {
      console.error('Error loading wellness data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const submitCheckIn = async () => {
    if (!selectedMood) {
      Alert.alert('Select a mood', 'Please select how you\'re feeling today.');
      return;
    }

    setSubmitting(true);
    try {
      await wellnessApi.submitCheckIn(selectedMood.value);

      Alert.alert('Check-in recorded', 'Thanks for checking in! Take care of yourself.');
      setSelectedMood(null);
      loadWellnessData();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWellnessData();
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="heart" size={32} color="#EC4899" />
        </View>
        <Text style={styles.headerTitle}>Wellness Check-in</Text>
        <Text style={styles.headerSubtitle}>
          Taking care of your wellbeing matters. Check in regularly.
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Check-ins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {MOOD_OPTIONS.find(m => m.value === Math.round(stats.average))?.emoji || '😐'}
          </Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
      </View>

      {/* Mood Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">How are you feeling today?</Text>
        <View style={styles.moodRow} accessibilityRole="radiogroup" accessibilityLabel="Mood selection">
          {MOOD_OPTIONS.map((mood) => (
            <TouchableOpacity
              key={mood.value}
              style={[
                styles.moodButton,
                selectedMood?.value === mood.value && {
                  borderColor: mood.color,
                  backgroundColor: `${mood.color}20`,
                },
              ]}
              onPress={() => setSelectedMood(mood)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedMood?.value === mood.value }}
              accessibilityLabel={`${mood.label} mood`}
              accessibilityHint={`Select ${mood.label.toLowerCase()} as your current mood`}
            >
              <Text style={styles.moodEmoji} accessibilityElementsHidden>{mood.emoji}</Text>
              <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity
          style={[styles.submitButton, !selectedMood && styles.submitButtonDisabled]}
          onPress={submitCheckIn}
          disabled={!selectedMood || submitting}
          accessibilityRole="button"
          accessibilityLabel={submitting ? 'Submitting check-in' : 'Submit check-in'}
          accessibilityState={{ disabled: !selectedMood || submitting }}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Check-in'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Support Resources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support Services</Text>
        <Text style={styles.sectionSubtitle}>
          If you need someone to talk to, these services are available 24/7.
        </Text>
        
        {SUPPORT_RESOURCES.map((resource, index) => (
          <TouchableOpacity
            key={index}
            style={styles.resourceCard}
            onPress={() => handleCall(resource.phone)}
          >
            <View style={[styles.resourceIcon, { backgroundColor: `${resource.color}20` }]}>
              <Ionicons name={resource.icon as any} size={24} color={resource.color} />
            </View>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>{resource.title}</Text>
              <Text style={styles.resourceDescription}>{resource.description}</Text>
              <Text style={[styles.resourcePhone, { color: resource.color }]}>
                <Ionicons name="call" size={12} /> {resource.phone}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
      
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
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginHorizontal: 4,
    ...shadows.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  moodButton: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    width: '18%',
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  resourcePhone: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  spacer: {
    height: 40,
  },
});
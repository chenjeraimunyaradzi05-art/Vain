/**
 * Notification Preferences Screen for React Native Mobile App
 * 
 * Allows users to configure which notifications they receive.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { notificationPreferencesApi } from '../services/api';
import { useSession } from '../hooks/useSession';

interface PreferenceCategory {
  id: string;
  name: string;
  desc: string;
  required?: boolean;
}

// Preference categories
const CATEGORY_GROUPS: Record<string, PreferenceCategory[]> = {
  'Jobs & Applications': [
    { id: 'job_alerts', name: 'Job Alerts', desc: 'New jobs matching your preferences' },
    { id: 'application_updates', name: 'Application Updates', desc: 'Status changes on your applications' },
    { id: 'job_recommendations', name: 'Recommendations', desc: 'Personalized job suggestions' },
  ],
  'Mentorship': [
    { id: 'mentor_sessions', name: 'Session Notifications', desc: 'Bookings and confirmations' },
    { id: 'mentor_messages', name: 'Mentor Messages', desc: 'Messages from your mentor' },
    { id: 'session_reminders', name: 'Session Reminders', desc: 'Upcoming session alerts' },
  ],
  'Training': [
    { id: 'course_updates', name: 'Course Updates', desc: 'Updates to enrolled courses' },
    { id: 'course_reminders', name: 'Course Reminders', desc: 'Assignment deadlines' },
    { id: 'certification_expiry', name: 'Certification Expiry', desc: 'Expiring certifications' },
  ],
  'Community': [
    { id: 'forum_replies', name: 'Forum Replies', desc: 'Replies to your posts' },
    { id: 'mentions', name: 'Mentions', desc: 'When someone mentions you' },
    { id: 'direct_messages', name: 'Direct Messages', desc: 'Private messages' },
  ],
  'Account': [
    { id: 'security_alerts', name: 'Security Alerts', desc: 'Account security (required)', required: true },
    { id: 'account_updates', name: 'Account Updates', desc: 'Important account info' },
  ],
};

interface Channel {
  id: string;
  name: string;
  icon: string;
}

// Channel types
const CHANNELS: Channel[] = [
  { id: 'push', name: 'Push', icon: 'notifications' },
  { id: 'email', name: 'Email', icon: 'mail' },
  { id: 'in_app', name: 'In-App', icon: 'phone-portrait' },
];

export default function NotificationPreferencesScreen() {
  const { token } = useSession();
  const [preferences, setPreferences] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!token) return;

    try {
      const data = await notificationPreferencesApi.getPreferences();
      setPreferences(data.preferences || {});
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const togglePreference = async (categoryId: string, channelId: string, currentValue: boolean) => {
    // Don't allow disabling security alerts
    if (categoryId === 'security_alerts') {
      return;
    }

    setSaving(true);

    try {
      const newValue = !currentValue;
      
      // Optimistic update
      setPreferences(prev => ({
        ...prev,
        [categoryId]: {
          ...prev[categoryId],
          [channelId]: newValue
        }
      }));

      await notificationPreferencesApi.updatePreference(categoryId, channelId, newValue);
    } catch (error) {
      console.error('Failed to update preference:', error);
      Alert.alert('Error', 'Failed to update preference');
      
      // Revert on error
      setPreferences(prev => ({
        ...prev,
        [categoryId]: {
          ...prev[categoryId],
          [channelId]: currentValue
        }
      }));
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPreferences();
  };

  const toggleGroup = (groupName: string) => {
    setExpandedCategory(expandedCategory === groupName ? null : groupName);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notification Preferences</Text>
        <Text style={styles.headerSubtitle}>
          Choose how and when you want to be notified.
        </Text>
      </View>

      {Object.entries(CATEGORY_GROUPS).map(([groupName, items]) => (
        <View key={groupName} style={styles.groupContainer}>
          <TouchableOpacity 
            style={styles.groupHeader} 
            onPress={() => toggleGroup(groupName)}
          >
            <Text style={styles.groupTitle}>{groupName}</Text>
            <Ionicons 
              name={expandedCategory === groupName ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          {expandedCategory === groupName && (
            <View style={styles.groupContent}>
              {items.map(item => (
                <View key={item.id} style={styles.preferenceItem}>
                  <View style={styles.preferenceInfo}>
                    <Text style={styles.preferenceName}>
                      {item.name}
                      {item.required && <Text style={styles.requiredText}> (Required)</Text>}
                    </Text>
                    <Text style={styles.preferenceDesc}>{item.desc}</Text>
                  </View>
                  
                  <View style={styles.channelsContainer}>
                    {CHANNELS.map(channel => {
                      const isEnabled = preferences[item.id]?.[channel.id] ?? false;
                      const isDisabled = item.required;
                      
                      return (
                        <TouchableOpacity
                          key={channel.id}
                          style={[
                            styles.channelButton,
                            isEnabled && styles.channelButtonActive,
                            isDisabled && styles.channelButtonDisabled
                          ]}
                          onPress={() => !isDisabled && togglePreference(item.id, channel.id, isEnabled)}
                          disabled={isDisabled || saving}
                        >
                          <Ionicons 
                            name={channel.icon as any} 
                            size={16} 
                            color={isEnabled ? '#fff' : colors.textSecondary} 
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
      
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Channels:</Text>
        <View style={styles.legendItems}>
          {CHANNELS.map(channel => (
            <View key={channel.id} style={styles.legendItem}>
              <Ionicons name={channel.icon as any} size={16} color={colors.textSecondary} />
              <Text style={styles.legendText}>{channel.name}</Text>
            </View>
          ))}
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
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
  groupContainer: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  groupContent: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  preferenceItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  preferenceInfo: {
    marginBottom: spacing.sm,
  },
  preferenceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  requiredText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: 'normal',
  },
  preferenceDesc: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  channelsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  channelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  channelButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  channelButtonDisabled: {
    opacity: 0.5,
  },
  legendContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  legendText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  spacer: {
    height: 40,
  },
});
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSession } from '../hooks/useSession';
import { memberApi, jobsApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

// Define navigation types
type RootStackParamList = {
  VideoResume: undefined;
  Jobs: undefined;
  Mentorship: undefined;
  Wellness: undefined;
  CulturalCalendar: undefined;
  MyApplications: undefined;
  SavedJobs: undefined;
  Resources: undefined;
  Settings: undefined;
  Profile: undefined;
  JobDetail: { id: string };
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Job {
  id: string;
  title: string;
  company: {
    name: string;
    logoUrl?: string;
  };
  location: string;
  employmentType: string;
  postedAt: string;
}

interface Profile {
  firstName: string;
  lastName: string;
  profileCompletionPercent: number;
  avatarUrl?: string;
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const [profileData, jobsData] = await Promise.all([
        memberApi.getProfile().catch(() => null),
        jobsApi.getJobs({ limit: 5 }).catch(() => ({ jobs: [] })),
      ]);
      
      if (profileData?.profile) {
        setProfile(profileData.profile);
      }
      
      if (jobsData?.jobs) {
        setRecentJobs(jobsData.jobs);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const quickActions = [
    { icon: 'videocam-outline', label: 'Video Resume', screen: 'VideoResume' as const, color: '#4F46E5' },
    { icon: 'briefcase-outline', label: 'Browse Jobs', screen: 'Jobs' as const, color: '#0EA5E9' },
    { icon: 'people-outline', label: 'Mentorship', screen: 'Mentorship' as const, color: '#8B5CF6' },
    { icon: 'heart-outline', label: 'Wellness', screen: 'Wellness' as const, color: '#EC4899' },
    { icon: 'calendar-outline', label: 'Cultural Events', screen: 'CulturalCalendar' as const, color: '#F59E0B' },
    { icon: 'document-text-outline', label: 'My Applications', screen: 'MyApplications' as const, color: '#10B981' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>
            {profile?.firstName || user?.email?.split('@')[0] || 'User'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {(profile?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Profile Completion Card */}
      {profile && profile.profileCompletionPercent < 100 && (
        <TouchableOpacity
          style={styles.completionCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.completionContent}>
            <View style={styles.completionIconContainer}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.warning} />
            </View>
            <View style={styles.completionText}>
              <Text style={styles.completionTitle}>Complete Your Profile</Text>
              <Text style={styles.completionSubtitle}>
                {profile.profileCompletionPercent}% complete
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${profile.profileCompletionPercent}%` },
              ]}
            />
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Actions Grid */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionItem}
            onPress={() => navigation.navigate(action.screen)}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
              <Ionicons name={action.icon as any} size={24} color={action.color} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Jobs */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Jobs</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      {recentJobs.length > 0 ? (
        <View style={styles.jobsList}>
          {recentJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => navigation.navigate('JobDetail', { id: job.id })}
            >
              <View style={styles.jobHeader}>
                <View style={styles.jobIcon}>
                  <Ionicons name="briefcase" size={20} color={colors.textSecondary} />
                </View>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={styles.companyName}>{job.company?.name || 'Company'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </View>
              <View style={styles.jobFooter}>
                <View style={styles.jobMeta}>
                  <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.metaText}>{job.location}</Text>
                </View>
                <View style={styles.jobMeta}>
                  <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.metaText}>{job.employmentType}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No jobs found</Text>
        </View>
      )}
      
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  userName: {
    ...typography.h2,
    color: colors.text,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    ...typography.h3,
    color: colors.white,
  },
  completionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  completionIconContainer: {
    marginRight: spacing.md,
  },
  completionText: {
    flex: 1,
  },
  completionTitle: {
    ...typography.subtitle1,
    color: colors.text,
    marginBottom: 2,
  },
  completionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  seeAll: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionItem: {
    width: '31%', // Approx 3 columns
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  jobsList: {
    gap: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  jobIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    ...typography.subtitle1,
    color: colors.text,
  },
  companyName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  jobFooter: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingLeft: 52, // Align with text
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body1,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  footerSpacer: {
    height: 80, // Space for bottom tab bar
  },
});

/**
 * Dashboard Screen
 * 
 * Main dashboard for authenticated users
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../hooks/useSession';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { memberApi, jobsApi, userAnalyticsApi, onboardingApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RootStackParamList = {
  OnboardingPurpose: undefined;
  Jobs: undefined;
  SavedJobs: undefined;
  MyApplications: undefined;
  Profile: undefined;
  Settings: undefined;
  JobDetail: { id: string };
  Mentorship: undefined;
  Wellness: undefined;
  Resources: undefined;
  VideoResume: undefined;
};

type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DashboardMetrics {
  totalApplications?: number;
  applicationsInTimeframe?: number;
  savedJobs?: number;
  savedJobsInTimeframe?: number;
  profileCompletion?: number;
  recentActivity?: number;
  engagementScore?: number;
  milestones?: any[];
  completionRate?: number;
}

interface Job {
  id: string;
  title: string;
  company: {
    name: string;
    logoUrl?: string;
  };
  location: string;
  employmentType: string;
  salaryMin?: number;
  salaryMax?: number;
  postedAt: string;
  status: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  userType: string;
}

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { session, isLoading: sessionLoading } = useSession();
  
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) {
      // User not logged in, redirect to onboarding
      navigation.replace('OnboardingPurpose');
      return;
    }

    if (session && !user) {
      setUser(session.user);
      loadDashboardData();
    }
  }, [session, sessionLoading, user]);

  const loadDashboardData = useCallback(async () => {
    if (!session?.token) return;

    try {
      setError(null);
      
      // Load user analytics
      const analyticsResponse = await userAnalyticsApi.getOverview('30d');
      
      // Load recent jobs
      const jobsResponse = await memberApi.getRecentJobs(5);
      
      setMetrics(analyticsResponse.data);
      setRecentJobs(jobsResponse.data || []);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    }
  }, [session?.token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const handleJobPress = (job: Job) => {
    navigation.navigate('JobDetail', { id: job.id });
  };

  const handleSavedJobsPress = () => {
    navigation.navigate('SavedJobs');
  };

  const handleApplicationsPress = () => {
    navigation.navigate('MyApplications');
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const renderWelcomeCard = () => {
    if (!user) return null;
    
    const firstName = user.firstName || 'Welcome';
    const lastName = user.lastName || '';
    const displayName = `${firstName} ${lastName}`.trim() || 'Welcome to Vantage';
    
    return (
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeHeader}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color={colors.textSecondary} />
          </View>
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeTitle}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{displayName}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.completeProfileButton} onPress={handleProfilePress}>
          <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.completeProfileButtonText}>Complete Profile</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMetricsCard = () => {
    if (!metrics) return null;

    return (
      <View style={styles.metricsCard}>
        <Text style={styles.cardTitle}>Your Progress</Text>
        
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics.totalApplications || 0}</Text>
            <Text style={styles.metricLabel}>Applications</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics.savedJobs || 0}</Text>
            <Text style={metricLabel}>Saved Jobs</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics.profileCompletion || 0}%</Text>
            <Text style={styles.metricLabel}>Profile Complete</Text>
          </View>
        </View>

        {metrics.engagementScore !== undefined && (
          <View style={styles.engagementScore}>
            <Text style={styles.engagementLabel}>Engagement Score</Text>
            <View style={styles.engagementBar}>
              <View style={[styles.engagementFill, { width: `${metrics.engagementScore}%` }]} />
            </View>
            <Text style={styles.engagementValue}>{metrics.engagementScore}%</Text>
          </View>
        )}
      </View>
    );
  };

  const renderRecentJobs = () => {
    if (recentJobs.length === 0) return null;

    return (
      <View style={styles.recentJobsCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recent Jobs</Text>
          <TouchableOpacity onPress={handleSavedJobsPress}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jobsScroll}>
          {recentJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => handleJobPress(job)}
            >
              <View style={styles.jobHeader}>
                <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
                <Text style={styles.jobCompany}>{job.company.name}</Text>
              </View>
              <View style={styles.jobDetails}>
                <View style={styles.jobDetail}>
                  <Ionicons name="location" size={14} color={colors.textSecondary} />
                  <Text style={styles.jobDetailText}>{job.location}</Text>
                </View>
                <View style={styles.jobDetail}>
                  <Ionicons name="briefcase" size={14} color={colors.textSecondary} />
                  <Text style={styles.jobDetailText}>{job.employmentType}</Text>
                </View>
              </View>
              {job.salaryMin && (
                <Text style={styles.jobSalary}>
                  ${job.salaryMin.toLocaleString()} - {job.salaryMax?.toLocaleString()}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderQuickActions = () => {
    return (
      <View style={styles.quickActionsCard}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleApplicationsPress}>
            <Ionicons name="document-text" size={24} color={colors.primary} />
            <Text style={styles.quickActionText}>My Applications</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} onPress={handleSavedJobsPress}>
            <Ionicons name="bookmark" size={24} color={colors.primary} />
            <Text style={styles.quickActionText}>Saved Jobs</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="search" size={24} color={colors.primary} />
            <Text style={styles.quickActionText}>Search Jobs</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="settings" size={24} color={colors.primary} />
            <Text style={styles.quickActionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderProgressMilestones = () => {
    if (!metrics?.milestones || metrics.milestones.length === 0) return null;

    return (
      <View style={styles.milestonesCard}>
        <Text style={styles.cardTitle}>Your Progress</Text>
        
        <View style={styles.milestonesList}>
          {metrics.milestones.map((milestone, index) => (
            <View key={milestone.id} style={styles.milestoneItem}>
              <View style={[styles.milestoneIcon, milestone.completed && styles.milestoneCompleted]}>
                <Ionicons 
                  name={milestone.completed ? 'checkmark-circle' : 'radio-button-off'} 
                  size={20} 
                  color={milestone.completed ? colors.success : colors.textSecondary} 
                />
              </View>
              <View style={styles.milestoneContent}>
                <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                <Text style={styles.milestoneDescription}>{milestone.description}</Text>
                {milestone.progress !== undefined && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${milestone.progress}%` }]} />
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.completionRate}>
          <Text style={styles.completionRateText}>
            {metrics.completionRate}% Complete
          </Text>
        </View>
      </View>
    );
  };

  if (sessionLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1f2937" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1f2937" />
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1f2937" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {renderWelcomeCard()}
          {renderMetricsCard()}
          {renderProgressMilestones()}
          {renderRecentJobs()}
          {renderQuickActions()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  welcomeCard: {
    backgroundColor: '#374151',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  welcomeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  completeProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  completeProfileButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  metricsCard: {
    backgroundColor: '#374151',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  engagementScore: {
    marginTop: spacing.md,
  },
  engagementLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  engagementBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  engagementFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  engagementValue: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recentJobsCard: {
    backgroundColor: '#374151',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobsScroll: {
    gap: spacing.md,
  },
  jobCard: {
    backgroundColor: '#1f2937',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginRight: spacing.md,
    width: 280,
    ...shadows.sm,
  },
  jobHeader: {
    marginBottom: spacing.sm,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  jobCompany: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  jobDetails: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  jobDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  jobDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  jobSalary: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
    marginTop: spacing.xs,
  },
  quickActionsCard: {
    backgroundColor: '#374151',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickActionButton: {
    backgroundColor: '#1f2937',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    flex: 1,
    minWidth: 100,
    ...shadows.sm,
  },
  quickActionText: {
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  milestonesCard: {
    backgroundColor: '#374151',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  milestonesList: {
    gap: spacing.md,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  milestoneIcon: {
    marginRight: spacing.md,
  },
  milestoneCompleted: {
    // Style for completed milestone icon
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  milestoneDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#1f2937',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 2,
  },
  completionRate: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  completionRateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
});

/**
 * Company Dashboard Screen
 * 
 * Comprehensive dashboard for employers to manage:
 * - Job listings and applications
 * - RAP certification progress
 * - Indigenous employment metrics
 * - Candidate pipeline
 * - Subscription and billing
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSession } from '../hooks/useSession';
import { api } from '../services/api';
import Svg, { Circle, Path } from 'react-native-svg';

// Theme colors
const colors = {
  primary: '#2d6a4f',
  primaryLight: '#40916c',
  primaryDark: '#1b4332',
  secondary: '#74c69d',
  accent: '#b7e4c7',
  background: '#f8faf9',
  card: '#ffffff',
  text: '#1b4332',
  textSecondary: '#52796f',
  textMuted: '#95a5a0',
  border: '#e8f0ed',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#ef4444',
  purple: '#8b5cf6',
  blue: '#3b82f6',
  ochre: '#d97706',
  terracotta: '#c2410c',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface JobListing {
  id: string;
  title: string;
  location: string;
  employmentType: string;
  applicationsCount: number;
  newApplications: number;
  viewsCount: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface ApplicationSummary {
  total: number;
  pending: number;
  shortlisted: number;
  interviewed: number;
  offered: number;
  hired: number;
  indigenousApplicants: number;
}

interface RAPProgress {
  level: 'REFLECT' | 'INNOVATE' | 'STRETCH' | 'ELEVATE' | null;
  targetLevel?: string;
  currentScore: number;
  targetScore: number;
  milestones: {
    id: string;
    title: string;
    isCompleted: boolean;
  }[];
}

interface IndigenousMetrics {
  currentPercentage: number;
  targetPercentage: number;
  totalEmployees: number;
  indigenousEmployees: number;
  hiredThisYear: number;
  targetHires: number;
}

interface Subscription {
  tier: string;
  status: string;
  jobPostsUsed: number;
  jobPostsLimit: number;
  featuredPostsRemaining: number;
  currentPeriodEnd: string;
}

interface CompanyDashboardScreenProps {
  navigation: any;
}

// RAP Level Badge Component
const RAPBadge = ({ level }: { level: string | null }) => {
  const getLevelColor = () => {
    switch (level) {
      case 'REFLECT': return '#6b7280';
      case 'INNOVATE': return '#3b82f6';
      case 'STRETCH': return '#8b5cf6';
      case 'ELEVATE': return '#f59e0b';
      default: return colors.textMuted;
    }
  };

  if (!level) {
    return (
      <TouchableOpacity style={styles.rapBadgeEmpty}>
        <Ionicons name="add-circle" size={24} color={colors.primary} />
        <Text style={styles.rapBadgeEmptyText}>Start RAP Journey</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.rapBadge, { backgroundColor: getLevelColor() + '15' }]}>
      <Ionicons name="shield-checkmark" size={20} color={getLevelColor()} />
      <Text style={[styles.rapBadgeText, { color: getLevelColor() }]}>
        RAP {level.charAt(0) + level.slice(1).toLowerCase()}
      </Text>
    </View>
  );
};

// Circular Progress Component
const CircularProgress = ({
  percentage,
  size = 80,
  strokeWidth = 8,
  color = colors.primary,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          stroke={colors.border}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.progressTextContainer, { width: size, height: size }]}>
        <Text style={styles.progressPercentage}>{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
};

// Pipeline Bar Component
const PipelineBar = ({ data }: { data: ApplicationSummary }) => {
  const total = data.total || 1;
  const segments = [
    { label: 'Pending', value: data.pending, color: colors.warning },
    { label: 'Shortlisted', value: data.shortlisted, color: colors.blue },
    { label: 'Interview', value: data.interviewed, color: colors.purple },
    { label: 'Offered', value: data.offered, color: colors.secondary },
    { label: 'Hired', value: data.hired, color: colors.success },
  ];

  return (
    <View style={styles.pipelineContainer}>
      <View style={styles.pipelineBar}>
        {segments.map((seg, idx) => (
          <View
            key={seg.label}
            style={[
              styles.pipelineSegment,
              {
                backgroundColor: seg.color,
                width: `${(seg.value / total) * 100}%`,
              },
              idx === 0 && styles.pipelineSegmentFirst,
              idx === segments.length - 1 && styles.pipelineSegmentLast,
            ]}
          />
        ))}
      </View>
      <View style={styles.pipelineLegend}>
        {segments.map(seg => (
          <View key={seg.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendText}>{seg.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Job Listing Card
const JobCard = ({
  job,
  onPress,
  onViewApplications,
}: {
  job: JobListing;
  onPress: () => void;
  onViewApplications: () => void;
}) => (
  <TouchableOpacity
    style={[styles.jobCard, !job.isActive && styles.jobCardInactive]}
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={`${job.title} - ${job.applicationsCount} applications`}
  >
    <View style={styles.jobHeader}>
      <View style={styles.jobTitleContainer}>
        <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
        {job.isFeatured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={10} color="#fff" />
          </View>
        )}
      </View>
      <Text style={[styles.jobStatus, job.isActive && styles.jobStatusActive]}>
        {job.isActive ? 'Active' : 'Closed'}
      </Text>
    </View>

    <View style={styles.jobMeta}>
      <View style={styles.jobMetaItem}>
        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
        <Text style={styles.jobMetaText}>{job.location}</Text>
      </View>
      <View style={styles.jobMetaItem}>
        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
        <Text style={styles.jobMetaText}>{job.employmentType}</Text>
      </View>
    </View>

    <View style={styles.jobStats}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{job.viewsCount}</Text>
        <Text style={styles.statLabel}>Views</Text>
      </View>
      <View style={styles.statDivider} />
      <TouchableOpacity style={styles.statItem} onPress={onViewApplications}>
        <View style={styles.applicationsBadge}>
          <Text style={styles.statNumber}>{job.applicationsCount}</Text>
          {job.newApplications > 0 && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>+{job.newApplications}</Text>
            </View>
          )}
        </View>
        <Text style={styles.statLabel}>Applications</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

// Main Component
export default function CompanyDashboardScreen({ navigation }: CompanyDashboardScreenProps) {
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [applications, setApplications] = useState<ApplicationSummary | null>(null);
  const [rapProgress, setRapProgress] = useState<RAPProgress | null>(null);
  const [indigenousMetrics, setIndigenousMetrics] = useState<IndigenousMetrics | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Auth
  const { user } = useSession();

  // Load data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Parallel requests
      const [jobsRes, appsRes, rapRes, metricsRes, subRes] = await Promise.all([
        api.get('/employer/jobs'),
        api.get('/employer/applications/summary'),
        api.get('/employer/rap-progress'),
        api.get('/employer/indigenous-metrics'),
        api.get('/employer/subscription'),
      ]);

      setJobs(jobsRes.data.jobs || []);
      setApplications(appsRes.data);
      setRapProgress(rapRes.data);
      setIndigenousMetrics(metricsRes.data);
      setSubscription(subRes.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      // Mock data for demo
      setJobs([
        {
          id: '1',
          title: 'Senior Software Engineer',
          location: 'Sydney, NSW',
          employmentType: 'Full-time',
          applicationsCount: 24,
          newApplications: 5,
          viewsCount: 342,
          isActive: true,
          isFeatured: true,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          title: 'Indigenous Traineeship Program',
          location: 'Melbourne, VIC',
          employmentType: 'Traineeship',
          applicationsCount: 18,
          newApplications: 3,
          viewsCount: 256,
          isActive: true,
          isFeatured: false,
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          title: 'Community Liaison Officer',
          location: 'Brisbane, QLD',
          employmentType: 'Part-time',
          applicationsCount: 12,
          newApplications: 0,
          viewsCount: 189,
          isActive: false,
          isFeatured: false,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
      setApplications({
        total: 54,
        pending: 15,
        shortlisted: 12,
        interviewed: 8,
        offered: 4,
        hired: 2,
        indigenousApplicants: 23,
      });
      setRapProgress({
        level: 'INNOVATE',
        targetLevel: 'STRETCH',
        currentScore: 68,
        targetScore: 100,
        milestones: [
          { id: '1', title: 'Complete cultural awareness training', isCompleted: true },
          { id: '2', title: 'Indigenous employment target set', isCompleted: true },
          { id: '3', title: 'Partner with Indigenous organization', isCompleted: false },
          { id: '4', title: 'Supplier diversity program', isCompleted: false },
        ],
      });
      setIndigenousMetrics({
        currentPercentage: 8.5,
        targetPercentage: 15,
        totalEmployees: 120,
        indigenousEmployees: 10,
        hiredThisYear: 4,
        targetHires: 8,
      });
      setSubscription({
        tier: 'PROFESSIONAL',
        status: 'active',
        jobPostsUsed: 3,
        jobPostsLimit: 10,
        featuredPostsRemaining: 2,
        currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const activeJobs = jobs.filter(j => j.isActive).length;
  const totalApplications = applications?.total || 0;
  const newApplications = jobs.reduce((sum, j) => sum + j.newApplications, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Employer Dashboard</Text>
              <Text style={styles.companyName}>Tech Innovators Pty Ltd</Text>
            </View>
            <RAPBadge level={rapProgress?.level || null} />
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{activeJobs}</Text>
              <Text style={styles.quickStatLabel}>Active Jobs</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{totalApplications}</Text>
              <Text style={styles.quickStatLabel}>Total Applications</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{newApplications}</Text>
              <Text style={styles.quickStatLabel}>New Today</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Application Pipeline */}
        {applications && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Application Pipeline</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllApplications')}>
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pipelineCard}>
              <PipelineBar data={applications} />
              <View style={styles.indigenousHighlight}>
                <Ionicons name="people" size={18} color={colors.ochre} />
                <Text style={styles.indigenousText}>
                  <Text style={styles.indigenousNumber}>{applications.indigenousApplicants}</Text> Indigenous applicants
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Indigenous Employment Goals */}
        {indigenousMetrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Indigenous Employment Progress</Text>
            <View style={styles.metricsCard}>
              <View style={styles.metricsContent}>
                <CircularProgress
                  percentage={(indigenousMetrics.currentPercentage / indigenousMetrics.targetPercentage) * 100}
                  size={90}
                  color={colors.ochre}
                />
                <View style={styles.metricsDetails}>
                  <Text style={styles.metricsValue}>
                    {indigenousMetrics.currentPercentage}%
                    <Text style={styles.metricsTarget}> / {indigenousMetrics.targetPercentage}%</Text>
                  </Text>
                  <Text style={styles.metricsLabel}>of workforce target</Text>
                  <View style={styles.metricsRow}>
                    <Text style={styles.metricsSubtext}>
                      {indigenousMetrics.indigenousEmployees} of {indigenousMetrics.totalEmployees} employees
                    </Text>
                  </View>
                  <View style={styles.hiringProgress}>
                    <Text style={styles.hiringText}>
                      {indigenousMetrics.hiredThisYear}/{indigenousMetrics.targetHires} hired this year
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* RAP Progress */}
        {rapProgress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RAP Journey</Text>
            <View style={styles.rapCard}>
              <View style={styles.rapHeader}>
                <View>
                  <Text style={styles.rapCurrentLevel}>
                    {rapProgress.level || 'Not Started'}
                  </Text>
                  {rapProgress.targetLevel && (
                    <Text style={styles.rapTargetLevel}>
                      Working towards {rapProgress.targetLevel}
                    </Text>
                  )}
                </View>
                <CircularProgress
                  percentage={rapProgress.currentScore}
                  size={60}
                  strokeWidth={6}
                  color={colors.purple}
                />
              </View>

              <Text style={styles.milestonesTitle}>Milestones</Text>
              {rapProgress.milestones.map(milestone => (
                <View key={milestone.id} style={styles.milestoneItem}>
                  <Ionicons
                    name={milestone.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={milestone.isCompleted ? colors.success : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.milestoneText,
                      milestone.isCompleted && styles.milestoneCompleted,
                    ]}
                  >
                    {milestone.title}
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.rapCta}
                onPress={() => navigation.navigate('RAPDetails')}
              >
                <Text style={styles.rapCtaText}>View RAP Details</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Job Listings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Job Listings</Text>
            <TouchableOpacity
              style={styles.postJobButton}
              onPress={() => navigation.navigate('PostJob')}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.postJobText}>Post Job</Text>
            </TouchableOpacity>
          </View>

          {jobs.length === 0 ? (
            <View style={styles.emptyJobs}>
              <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No job listings yet</Text>
              <Text style={styles.emptySubtitle}>
                Post your first job to start receiving applications
              </Text>
            </View>
          ) : (
            jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onPress={() => navigation.navigate('EditJob', { jobId: job.id })}
                onViewApplications={() => navigation.navigate('JobApplications', { jobId: job.id })}
              />
            ))
          )}
        </View>

        {/* Subscription */}
        {subscription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            <View style={styles.subscriptionCard}>
              <View style={styles.subscriptionHeader}>
                <View>
                  <Text style={styles.subscriptionTier}>{subscription.tier}</Text>
                  <Text style={styles.subscriptionRenewal}>
                    Renews {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => navigation.navigate('Subscription')}
                >
                  <Text style={styles.upgradeText}>Upgrade</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.usageContainer}>
                <View style={styles.usageItem}>
                  <Text style={styles.usageLabel}>Job Posts</Text>
                  <View style={styles.usageBar}>
                    <View
                      style={[
                        styles.usageProgress,
                        { width: `${(subscription.jobPostsUsed / subscription.jobPostsLimit) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.usageText}>
                    {subscription.jobPostsUsed} / {subscription.jobPostsLimit}
                  </Text>
                </View>
                <View style={styles.usageItem}>
                  <Text style={styles.usageLabel}>Featured Posts</Text>
                  <Text style={styles.usageValue}>{subscription.featuredPostsRemaining} remaining</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('CandidateSearch')}
            >
              <Ionicons name="search" size={24} color={colors.primary} />
              <Text style={styles.actionLabel}>Search Candidates</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('CompanyProfile')}
            >
              <Ionicons name="business" size={24} color={colors.primary} />
              <Text style={styles.actionLabel}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Analytics')}
            >
              <Ionicons name="bar-chart" size={24} color={colors.primary} />
              <Text style={styles.actionLabel}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Team')}
            >
              <Ionicons name="people" size={24} color={colors.primary} />
              <Text style={styles.actionLabel}>Team</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  rapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rapBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  rapBadgeEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rapBadgeEmptyText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 6,
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  quickStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },

  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },

  // Pipeline
  pipelineCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pipelineContainer: {},
  pipelineBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  pipelineSegment: {
    height: '100%',
  },
  pipelineSegmentFirst: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  pipelineSegmentLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  pipelineLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  indigenousHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  indigenousText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  indigenousNumber: {
    fontWeight: '700',
    color: colors.ochre,
  },

  // Metrics
  metricsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricsDetails: {
    marginLeft: 20,
    flex: 1,
  },
  metricsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  metricsTarget: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textMuted,
  },
  metricsLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricsRow: {
    marginTop: 8,
  },
  metricsSubtext: {
    fontSize: 12,
    color: colors.textMuted,
  },
  hiringProgress: {
    marginTop: 8,
    backgroundColor: colors.accent + '40',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  hiringText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  progressTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  // RAP
  rapCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rapCurrentLevel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  rapTargetLevel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  milestonesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  milestoneText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 10,
    flex: 1,
  },
  milestoneCompleted: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  rapCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rapCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
  },

  // Jobs
  postJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postJobText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  jobCardInactive: {
    opacity: 0.7,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  featuredBadge: {
    backgroundColor: colors.ochre,
    padding: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  jobStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  jobStatusActive: {
    color: colors.success,
  },
  jobMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  jobMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  jobMetaText: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 4,
  },
  jobStats: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  applicationsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  emptyJobs: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: colors.card,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  // Subscription
  subscriptionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionTier: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subscriptionRenewal: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  usageContainer: {},
  usageItem: {
    marginBottom: 12,
  },
  usageLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  usageBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageProgress: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  usageText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    margin: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ListRenderItem,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { memberApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

// Define navigation types
type RootStackParamList = {
  JobDetail: { jobId: string; applicationId?: string };
  Jobs: undefined;
};

type MyApplicationsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  appliedAt: string;
  status: string;
  interviewDate?: string;
  startDate?: string;
  notes?: string;
  feedback?: string;
}

interface StatusConfigItem {
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  SUBMITTED: { label: 'Submitted', color: '#64748b', icon: 'document-outline' },
  UNDER_REVIEW: { label: 'Under Review', color: '#3b82f6', icon: 'eye-outline' },
  SHORTLISTED: { label: 'Shortlisted', color: '#a855f7', icon: 'star-outline' },
  INTERVIEW_SCHEDULED: { label: 'Interview', color: '#f59e0b', icon: 'calendar-outline' },
  OFFER_EXTENDED: { label: 'Offer', color: '#22c55e', icon: 'gift-outline' },
  HIRED: { label: 'Hired', color: '#10b981', icon: 'checkmark-circle' },
  REJECTED: { label: 'Rejected', color: '#ef4444', icon: 'close-circle-outline' },
  WITHDRAWN: { label: 'Withdrawn', color: '#6b7280', icon: 'exit-outline' },
};

interface ApplicationCardProps {
  application: Application;
  onPress: (application: Application) => void;
}

function ApplicationCard({ application, onPress }: ApplicationCardProps) {
  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.SUBMITTED;
  const appliedDate = new Date(application.appliedAt).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const accessibilityLabel = `${application.jobTitle} at ${application.company}. Status: ${statusConfig.label}. Applied ${appliedDate}. ${application.location}`;

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onPress(application)} 
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to view application details"
    >
      <View style={styles.cardHeader}>
        <View style={styles.companyBadge} accessibilityElementsHidden>
          <Text style={styles.companyInitial}>{application.company[0]}</Text>
        </View>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.jobTitle} numberOfLines={1}>{application.jobTitle}</Text>
          <Text style={styles.company}>{application.company}</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{application.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>Applied {appliedDate}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>

        {application.status === 'INTERVIEW_SCHEDULED' && application.interviewDate && (
          <View style={styles.interviewBadge}>
            <Ionicons name="videocam-outline" size={14} color="#f59e0b" />
            <Text style={styles.interviewText}>
              {new Date(application.interviewDate).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
        )}

        {application.status === 'HIRED' && application.startDate && (
          <View style={styles.startDateBadge}>
            <Ionicons name="rocket-outline" size={14} color="#10b981" />
            <Text style={styles.startDateText}>Starts {new Date(application.startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface StatsCardProps {
  stats: {
    total: number;
    active: number;
    interviews: number;
    offers: number;
  };
}

function StatsCard({ stats }: StatsCardProps) {
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={[styles.statItem, styles.statDivider]}>
        <Text style={[styles.statNumber, { color: '#3b82f6' }]}>{stats.active}</Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={[styles.statItem, styles.statDivider]}>
        <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.interviews}</Text>
        <Text style={styles.statLabel}>Interviews</Text>
      </View>
      <View style={[styles.statItem, styles.statDivider]}>
        <Text style={[styles.statNumber, { color: '#10b981' }]}>{stats.offers}</Text>
        <Text style={styles.statLabel}>Offers</Text>
      </View>
    </View>
  );
}

interface FilterChipsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

function FilterChips({ activeFilter, onFilterChange }: FilterChipsProps) {
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'interviews', label: 'Interviews' },
    { key: 'offers', label: 'Offers' },
    { key: 'closed', label: 'Closed' },
  ];

  return (
    <View style={styles.filterContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filters}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === item.key && styles.filterChipActive,
            ]}
            onPress={() => onFilterChange(item.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === item.key && styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.filterList}
      />
    </View>
  );
}

export default function MyApplicationsScreen() {
  const navigation = useNavigation<MyApplicationsScreenNavigationProp>();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchApplications = useCallback(async () => {
    try {
      const result = await memberApi.getApplications();
      if (result && result.applications) {
        setApplications(result.applications);
      } else {
        // Fallback to empty array if API fails or returns unexpected structure
        setApplications([]);
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const handleApplicationPress = (application: Application) => {
    navigation.navigate('JobDetail', { 
      jobId: application.jobId,
      applicationId: application.id,
    });
  };

  // Calculate stats
  const stats = {
    total: applications.length,
    active: applications.filter(a => 
      ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED'].includes(a.status)
    ).length,
    interviews: applications.filter(a => a.status === 'INTERVIEW_SCHEDULED').length,
    offers: applications.filter(a => 
      ['OFFER_EXTENDED', 'HIRED'].includes(a.status)
    ).length,
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    switch (filter) {
      case 'active':
        return ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED'].includes(app.status);
      case 'interviews':
        return app.status === 'INTERVIEW_SCHEDULED';
      case 'offers':
        return ['OFFER_EXTENDED', 'HIRED'].includes(app.status);
      case 'closed':
        return ['REJECTED', 'WITHDRAWN', 'HIRED'].includes(app.status);
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats */}
      <StatsCard stats={stats} />

      {/* Filters */}
      <FilterChips activeFilter={filter} onFilterChange={setFilter} />

      {/* Applications List */}
      {filteredApplications.length > 0 ? (
        <FlatList
          data={filteredApplications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ApplicationCard application={item} onPress={handleApplicationPress} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No applications found</Text>
          <Text style={styles.emptyText}>
            {filter === 'all' 
              ? "Start applying to jobs to track them here"
              : "No applications match this filter"}
          </Text>
          {filter === 'all' && (
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('Jobs')}
            >
              <Text style={styles.browseButtonText}>Browse Jobs</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  filterContainer: {
    marginTop: spacing.md,
  },
  filterList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  companyBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  companyInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  company: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardDetails: {
    marginBottom: spacing.md,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  interviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    gap: 6,
  },
  interviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  startDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    gap: 6,
  },
  startDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  browseButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

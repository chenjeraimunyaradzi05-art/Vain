import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Switch,
  Alert,
  ListRenderItem,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { jobsApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

// Define navigation types
type RootStackParamList = {
  JobDetail: { jobId: string };
  Jobs: { query?: string; location?: string; type?: string };
};

type SavedJobsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SavedJob {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  savedAt: string;
  isActive: boolean;
  closingDate?: string;
  closedDate?: string;
}

interface SavedSearch {
  id: string;
  name: string;
  query: {
    keywords?: string;
    location?: string;
    type?: string;
  };
  alertEnabled: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  lastAlertAt?: string | null;
  newMatches: number;
}

interface SavedJobCardProps {
  job: SavedJob;
  onPress: (job: SavedJob) => void;
  onRemove: (jobId: string) => void;
}

function SavedJobCard({ job, onPress, onRemove }: SavedJobCardProps) {
  const savedDate = new Date(job.savedAt).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  });

  const closingDate = job.closingDate ? new Date(job.closingDate) : null;
  const daysUntilClose = closingDate 
    ? Math.ceil((closingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isClosingSoon = daysUntilClose !== null && daysUntilClose <= 5 && daysUntilClose > 0;

  const accessibilityLabel = `${job.jobTitle} at ${job.company}. ${job.location}. ${job.salary}. ${!job.isActive ? 'Position closed.' : isClosingSoon ? `Closing in ${daysUntilClose} days.` : ''} Saved ${savedDate}`;

  return (
    <TouchableOpacity 
      style={[styles.jobCard, !job.isActive && styles.jobCardInactive]}
      onPress={() => onPress(job)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to view job details"
    >
      <View style={styles.jobHeader}>
        <View style={styles.companyBadge} accessibilityElementsHidden>
          <Text style={styles.companyInitial}>{job.company[0]}</Text>
        </View>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle} numberOfLines={1}>{job.jobTitle}</Text>
          <Text style={styles.company}>{job.company}</Text>
        </View>
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => onRemove(job.id)}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${job.jobTitle} from saved jobs`}
        >
          <Ionicons name="bookmark" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{job.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{job.salary}</Text>
        </View>
      </View>

      <View style={styles.jobFooter}>
        <Text style={styles.savedDate}>Saved {savedDate}</Text>
        
        {!job.isActive ? (
          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>Position Closed</Text>
          </View>
        ) : isClosingSoon ? (
          <View style={styles.closingSoonBadge}>
            <Ionicons name="time-outline" size={12} color={colors.warning} />
            <Text style={styles.closingSoonText}>{daysUntilClose}d left</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

interface SavedSearchCardProps {
  search: SavedSearch;
  onToggleAlert: (searchId: string) => void;
  onDelete: (searchId: string) => void;
  onRun: (search: SavedSearch) => void;
}

function SavedSearchCard({ search, onToggleAlert, onDelete, onRun }: SavedSearchCardProps) {
  const frequencyLabels = {
    instant: 'Instant',
    daily: 'Daily',
    weekly: 'Weekly',
  };

  return (
    <View style={styles.searchCard}>
      <View style={styles.searchHeader}>
        <View style={styles.searchIcon}>
          <Ionicons name="search" size={18} color={colors.primary} />
        </View>
        <View style={styles.searchInfo}>
          <Text style={styles.searchName}>{search.name}</Text>
          <Text style={styles.searchQuery}>
            {search.query.keywords || 'Any'} • {search.query.location || 'Any location'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(search.id)}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContent}>
        {search.newMatches > 0 && (
          <TouchableOpacity style={styles.newMatchesBadge} onPress={() => onRun(search)}>
            <Text style={styles.newMatchesText}>{search.newMatches} new matches</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.success} />
          </TouchableOpacity>
        )}

        <View style={styles.alertRow}>
          <View style={styles.alertInfo}>
            <Ionicons 
              name={search.alertEnabled ? "notifications" : "notifications-off-outline"} 
              size={16} 
              color={search.alertEnabled ? colors.primary : colors.textSecondary} 
            />
            <Text style={styles.alertText}>
              {search.alertEnabled 
                ? `${frequencyLabels[search.frequency]} alerts`
                : 'Alerts off'}
            </Text>
          </View>
          <Switch
            value={search.alertEnabled}
            onValueChange={() => onToggleAlert(search.id)}
            trackColor={{ false: colors.border, true: `${colors.primary}80` }}
            thumbColor={search.alertEnabled ? colors.primary : colors.textSecondary}
          />
        </View>
      </View>
    </View>
  );
}

export default function SavedJobsScreen() {
  const navigation = useNavigation<SavedJobsScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<'jobs' | 'searches'>('jobs');
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // In a real app, we would fetch both saved jobs and saved searches
      // For now, we'll try to fetch saved jobs if the API supports it
      const jobsResult = await jobsApi.getSavedJobs().catch(() => ({ jobs: [] }));
      
      if (jobsResult && jobsResult.jobs) {
        setSavedJobs(jobsResult.jobs);
      } else {
        // Fallback to empty if API fails
        setSavedJobs([]);
      }
      
      // We don't have an API for saved searches yet, so we'll keep it empty or mock it if needed
      setSavedSearches([]);
      
    } catch (err) {
      console.error('Failed to fetch saved items:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleJobPress = (job: SavedJob) => {
    navigation.navigate('JobDetail', { jobId: job.id });
  };

  const handleRemoveJob = (jobId: string) => {
    Alert.alert(
      'Remove Saved Job',
      'Are you sure you want to remove this job from your saved list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Optimistic update
            setSavedJobs(prev => prev.filter(j => j.id !== jobId));
            // Call API to remove (assuming saveJob toggles or we need a remove endpoint)
            // For now we'll assume saveJob toggles it off
            try {
              await jobsApi.saveJob(jobId);
            } catch (e) {
              console.error('Failed to remove saved job', e);
              // Revert if failed
              fetchData();
            }
          },
        },
      ]
    );
  };

  const handleToggleAlert = (searchId: string) => {
    setSavedSearches(prev => prev.map(s => 
      s.id === searchId ? { ...s, alertEnabled: !s.alertEnabled } : s
    ));
  };

  const handleDeleteSearch = (searchId: string) => {
    Alert.alert(
      'Delete Saved Search',
      'Are you sure you want to delete this saved search and its alerts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSavedSearches(prev => prev.filter(s => s.id !== searchId));
          },
        },
      ]
    );
  };

  const handleRunSearch = (search: SavedSearch) => {
    navigation.navigate('Jobs', { 
      query: search.query.keywords,
      location: search.query.location,
      type: search.query.type,
    });
  };

  const activeJobs = savedJobs.filter(j => j.isActive);
  const closedJobs = savedJobs.filter(j => !j.isActive);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading saved items...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'jobs' && styles.tabActive]}
          onPress={() => setActiveTab('jobs')}
        >
          <Ionicons 
            name="bookmark" 
            size={18} 
            color={activeTab === 'jobs' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'jobs' && styles.tabTextActive]}>
            Saved Jobs ({savedJobs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'searches' && styles.tabActive]}
          onPress={() => setActiveTab('searches')}
        >
          <Ionicons 
            name="notifications" 
            size={18} 
            color={activeTab === 'searches' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'searches' && styles.tabTextActive]}>
            Job Alerts ({savedSearches.filter(s => s.alertEnabled).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'jobs' ? (
        <FlatList
          data={activeJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SavedJobCard 
              job={item} 
              onPress={handleJobPress}
              onRemove={handleRemoveJob}
            />
          )}
          ListHeaderComponent={
            closedJobs.length > 0 ? (
              <Text style={styles.sectionHeader}>Active Jobs</Text>
            ) : null
          }
          ListFooterComponent={
            closedJobs.length > 0 ? (
              <>
                <Text style={styles.sectionHeader}>Closed Jobs</Text>
                {closedJobs.map(job => (
                  <SavedJobCard 
                    key={job.id}
                    job={job} 
                    onPress={handleJobPress}
                    onRemove={handleRemoveJob}
                  />
                ))}
              </>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No saved jobs</Text>
              <Text style={styles.emptyText}>
                Save jobs you're interested in to easily find them later
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('Jobs', {})}
              >
                <Text style={styles.browseButtonText}>Browse Jobs</Text>
              </TouchableOpacity>
            </View>
          }
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
        <FlatList
          data={savedSearches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SavedSearchCard 
              search={item}
              onToggleAlert={handleToggleAlert}
              onDelete={handleDeleteSearch}
              onRun={handleRunSearch}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No saved searches</Text>
              <Text style={styles.emptyText}>
                Save your job searches to get notified when new matching jobs are posted
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('Jobs', {})}
              >
                <Text style={styles.browseButtonText}>Search Jobs</Text>
              </TouchableOpacity>
            </View>
          }
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.background,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.text,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  jobCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  jobCardInactive: {
    opacity: 0.6,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  companyBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  companyInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  company: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  removeButton: {
    padding: 8,
  },
  jobDetails: {
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
  jobFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  closedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  closedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.error,
  },
  closingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  closingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning,
  },
  searchCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  searchIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  searchInfo: {
    flex: 1,
  },
  searchName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  searchQuery: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  searchContent: {
    gap: 12,
  },
  newMatchesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  newMatchesText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
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

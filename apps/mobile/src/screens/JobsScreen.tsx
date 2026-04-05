import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
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
};

type JobsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Job {
  id: string;
  title: string;
  company: {
    name: string;
    logoUrl?: string;
  };
  location: string;
  employmentType: string;
  employment?: string; // Handling potential API inconsistency
  salaryLow?: number;
  salaryHigh?: number;
  postedAt: string;
  isFeatured?: boolean;
}

interface FilterOption {
  value: string;
  label: string;
}

const EMPLOYMENT_FILTERS: FilterOption[] = [
  { value: '', label: 'All' },
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'CASUAL', label: 'Casual' },
  { value: 'APPRENTICESHIP', label: 'Apprenticeship' },
];

export default function JobsScreen() {
  const navigation = useNavigation<JobsScreenNavigationProp>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [employment, setEmployment] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadJobs(true);
  }, [employment]);

  async function loadJobs(reset = false) {
    if (reset) {
      setIsLoading(true);
      setPage(1);
    }

    try {
      const params: any = {
        page: reset ? 1 : page,
        limit: 20,
      };
      if (search) params.search = search;
      if (employment) params.employment = employment;

      const result = await jobsApi.getJobs(params);
      const newJobs = result.jobs || [];

      if (reset) {
        setJobs(newJobs);
      } else {
        setJobs(prev => [...prev, ...newJobs]);
      }

      setHasMore(newJobs.length === 20);
      setPage(prev => reset ? 2 : prev + 1);
    } catch (error) {
      console.error('Load jobs error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  function onRefresh() {
    setIsRefreshing(true);
    loadJobs(true);
  }

  function onEndReached() {
    if (!isLoading && hasMore) {
      loadJobs(false);
    }
  }

  function handleSearch() {
    loadJobs(true);
  }

  const renderJob: ListRenderItem<Job> = useCallback(({ item }) => {
    const salaryText = (item.salaryLow || item.salaryHigh)
      ? `$${item.salaryLow?.toLocaleString() || '?'}${item.salaryHigh ? ` to $${item.salaryHigh.toLocaleString()}` : ''}`
      : '';
    
    const employmentType = item.employment || item.employmentType || '';
    
    const accessibilityLabel = `${item.title} at ${item.company?.name || 'Company'}. ${item.location || 'Remote location'}. ${employmentType.replace('_', ' ')}. ${salaryText}. ${item.isFeatured ? 'Featured job.' : ''} Posted ${formatDate(item.postedAt)}`;
    
    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to view job details"
      >
        <View style={styles.jobHeader}>
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.jobCompany}>{item.company?.name || 'Company'}</Text>
          </View>
          {item.isFeatured && (
            <View style={styles.featuredBadge} accessibilityElementsHidden>
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
        </View>

        <View style={styles.jobMeta} accessibilityElementsHidden>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.location || 'Remote'}</Text>
          </View>
          {employmentType ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>{employmentType.replace('_', ' ')}</Text>
            </View>
          ) : null}
        </View>

        {(item.salaryLow || item.salaryHigh) && (
          <View style={styles.salaryContainer} accessibilityElementsHidden>
            <Ionicons name="cash-outline" size={16} color={colors.accent} />
            <Text style={styles.salaryText}>
              ${item.salaryLow?.toLocaleString() || '?'}
              {item.salaryHigh && ` - $${item.salaryHigh.toLocaleString()}`}
            </Text>
          </View>
        )}

        <Text style={styles.postedDate} accessibilityElementsHidden>
          Posted {formatDate(item.postedAt)}
        </Text>
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessibilityLabel="Search jobs"
            accessibilityHint="Type to search for jobs by title, company, or location"
          />
          {search ? (
            <TouchableOpacity 
              onPress={() => { setSearch(''); loadJobs(true); }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filters */}
      <View>
        <FlatList
          horizontal
          data={EMPLOYMENT_FILTERS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          accessibilityRole="tablist"
          accessibilityLabel="Employment type filters"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                employment === item.value && styles.filterChipActive,
              ]}
              onPress={() => setEmployment(item.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: employment === item.value }}
              accessibilityLabel={`Filter by ${item.label}`}
            >
              <Text
                style={[
                  styles.filterText,
                  employment === item.value && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Job List */}
      {isLoading && jobs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading jobs...</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore && jobs.length > 0 ? (
              <ActivityIndicator style={styles.footer} color={colors.primary} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={60} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Jobs Found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function formatDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodySmall,
    marginTop: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  jobCompany: {
    color: colors.primary,
    fontSize: 14,
  },
  featuredBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  featuredText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  jobMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    textTransform: 'capitalize',
  },
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  salaryText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  postedDate: {
    ...typography.caption,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

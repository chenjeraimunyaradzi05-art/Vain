/**
 * Jobs Screen
 * 
 * Comprehensive job discovery with:
 * - Personalized job recommendations
 * - Advanced filtering
 * - Quick apply
 * - Save/bookmark jobs
 * - Indigenous employer prioritization
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
  Image,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Colors
const COLORS = {
  primary: '#1E3A5F',
  secondary: '#D4AF37',
  background: '#F5F5F5',
  white: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  success: '#27AE60',
  warning: '#F39C12',
  error: '#E74C3C',
  indigenous: '#8B4513',
};

// Types
interface Job {
  id: string;
  title: string;
  company: {
    id: string;
    name: string;
    logo?: string;
    isIndigenousOwned?: boolean;
    isRAP?: boolean; // Reconciliation Action Plan
  };
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'casual';
  salary?: {
    min?: number;
    max?: number;
    isVisible: boolean;
  };
  description: string;
  skills: string[];
  requirements: string[];
  benefits?: string[];
  isRemote: boolean;
  urgentHiring?: boolean;
  postedAt: Date;
  expiresAt?: Date;
  applicationCount?: number;
  matchScore?: number;
  saved?: boolean;
  applied?: boolean;
}

interface FilterState {
  search: string;
  location: string;
  jobTypes: string[];
  remote: boolean | null;
  salaryMin: number | null;
  salaryMax: number | null;
  indigenousEmployer: boolean;
  postedWithin: number | null;
  skills: string[];
}

// Mock data
const MOCK_JOBS: Job[] = [
  {
    id: '1',
    title: 'Software Developer',
    company: {
      id: 'c1',
      name: 'Dreamtime Tech',
      logo: 'https://via.placeholder.com/60',
      isIndigenousOwned: true,
    },
    location: 'Sydney, NSW',
    type: 'full-time',
    salary: { min: 80000, max: 120000, isVisible: true },
    description: 'Join our team building software that connects Indigenous communities...',
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
    requirements: ['3+ years experience', 'Strong communication skills'],
    benefits: ['Flexible hours', 'Cultural leave', 'Remote work'],
    isRemote: true,
    urgentHiring: true,
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    matchScore: 92,
    applicationCount: 15,
  },
  {
    id: '2',
    title: 'Community Engagement Officer',
    company: {
      id: 'c2',
      name: 'First Nations Foundation',
      logo: 'https://via.placeholder.com/60',
      isIndigenousOwned: true,
      isRAP: true,
    },
    location: 'Melbourne, VIC',
    type: 'full-time',
    salary: { min: 65000, max: 75000, isVisible: true },
    description: 'Work directly with Indigenous communities to develop programs...',
    skills: ['Community Engagement', 'Project Management', 'Cultural Knowledge'],
    requirements: ['Aboriginal or Torres Strait Islander heritage preferred'],
    benefits: ['NAIDOC Week off', 'Professional development'],
    isRemote: false,
    postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    matchScore: 85,
  },
  {
    id: '3',
    title: 'UX Designer',
    company: {
      id: 'c3',
      name: 'Koori Design Studio',
      logo: 'https://via.placeholder.com/60',
      isIndigenousOwned: true,
    },
    location: 'Brisbane, QLD',
    type: 'contract',
    salary: { min: 500, max: 700, isVisible: true },
    description: 'Design culturally inclusive digital experiences...',
    skills: ['Figma', 'User Research', 'Prototyping', 'Accessibility'],
    requirements: ['Portfolio required', 'Understanding of Indigenous design principles'],
    isRemote: true,
    postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    matchScore: 78,
  },
];

export const JobsScreen: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    location: '',
    jobTypes: [],
    remote: null,
    salaryMin: null,
    salaryMax: null,
    indigenousEmployer: false,
    postedWithin: null,
    skills: [],
  });

  // Filter jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(job =>
        job.title.toLowerCase().includes(search) ||
        job.company.name.toLowerCase().includes(search) ||
        job.skills.some(s => s.toLowerCase().includes(search))
      );
    }

    if (filters.location) {
      result = result.filter(job =>
        job.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.jobTypes.length > 0) {
      result = result.filter(job => filters.jobTypes.includes(job.type));
    }

    if (filters.remote !== null) {
      result = result.filter(job => job.isRemote === filters.remote);
    }

    if (filters.indigenousEmployer) {
      result = result.filter(job => job.company.isIndigenousOwned || job.company.isRAP);
    }

    // Sort by match score
    result.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return result;
  }, [jobs, filters]);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Fetch jobs from API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  // Toggle save
  const toggleSave = useCallback((jobId: string) => {
    setJobs(prev => prev.map(job =>
      job.id === jobId ? { ...job, saved: !job.saved } : job
    ));
  }, []);

  // Apply to job
  const applyToJob = useCallback((jobId: string) => {
    // Navigate to application flow
    setSelectedJob(null);
  }, []);

  // Format salary
  const formatSalary = (salary?: Job['salary']) => {
    if (!salary || !salary.isVisible) return 'Salary not disclosed';
    if (salary.min && salary.max) {
      return `$${(salary.min / 1000).toFixed(0)}k - $${(salary.max / 1000).toFixed(0)}k`;
    }
    if (salary.min) return `From $${(salary.min / 1000).toFixed(0)}k`;
    if (salary.max) return `Up to $${(salary.max / 1000).toFixed(0)}k`;
    return 'Competitive';
  };

  // Format date
  const formatPostedDate = (date: Date) => {
    const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  // Render job card
  const renderJobCard = ({ item: job }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => setSelectedJob(job)}
      activeOpacity={0.9}
    >
      {/* Urgent Badge */}
      {job.urgentHiring && (
        <View style={styles.urgentBadge}>
          <Ionicons name="flash" size={12} color={COLORS.white} />
          <Text style={styles.urgentText}>Urgent</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.cardHeader}>
        <Image
          source={{ uri: job.company.logo || 'https://via.placeholder.com/60' }}
          style={styles.companyLogo}
        />
        <View style={styles.cardHeaderContent}>
          <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
          <View style={styles.companyRow}>
            <Text style={styles.companyName}>{job.company.name}</Text>
            {job.company.isIndigenousOwned && (
              <View style={styles.indigenousBadge}>
                <Text style={styles.indigenousBadgeText}>Indigenous Owned</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => toggleSave(job.id)}
        >
          <Ionicons
            name={job.saved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={job.saved ? COLORS.secondary : COLORS.textTertiary}
          />
        </TouchableOpacity>
      </View>

      {/* Details */}
      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{job.location}</Text>
          {job.isRemote && (
            <View style={styles.remoteBadge}>
              <Text style={styles.remoteBadgeText}>Remote</Text>
            </View>
          )}
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{formatSalary(job.salary)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{job.type} • {formatPostedDate(job.postedAt)}</Text>
        </View>
      </View>

      {/* Skills */}
      <View style={styles.skillsContainer}>
        {job.skills.slice(0, 4).map((skill, index) => (
          <View key={index} style={styles.skillTag}>
            <Text style={styles.skillTagText}>{skill}</Text>
          </View>
        ))}
        {job.skills.length > 4 && (
          <Text style={styles.moreSkills}>+{job.skills.length - 4} more</Text>
        )}
      </View>

      {/* Match Score */}
      {job.matchScore !== undefined && (
        <View style={styles.matchScoreContainer}>
          <View style={styles.matchScoreBar}>
            <View 
              style={[styles.matchScoreFill, { width: `${job.matchScore}%` }]} 
            />
          </View>
          <Text style={styles.matchScoreText}>{job.matchScore}% Match</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.applicationCount}>
          {job.applicationCount || 0} applications
        </Text>
        <TouchableOpacity
          style={[styles.applyButton, job.applied && styles.appliedButton]}
          onPress={() => job.applied ? null : applyToJob(job.id)}
        >
          <Text style={[styles.applyButtonText, job.applied && styles.appliedButtonText]}>
            {job.applied ? 'Applied' : 'Quick Apply'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Render search header
  const renderSearchHeader = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, skills, companies..."
          placeholderTextColor={COLORS.textTertiary}
          value={filters.search}
          onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
        />
        {filters.search.length > 0 && (
          <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, search: '' }))}>
            <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[styles.filterButton, showFilters && styles.filterButtonActive]}
        onPress={() => setShowFilters(true)}
      >
        <Ionicons 
          name="options" 
          size={20} 
          color={showFilters ? COLORS.white : COLORS.primary} 
        />
      </TouchableOpacity>
    </View>
  );

  // Render filter chips
  const renderFilterChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipContainer}
    >
      <TouchableOpacity
        style={[styles.chip, filters.indigenousEmployer && styles.chipActive]}
        onPress={() => setFilters(prev => ({ 
          ...prev, 
          indigenousEmployer: !prev.indigenousEmployer 
        }))}
      >
        <Text style={[styles.chipText, filters.indigenousEmployer && styles.chipTextActive]}>
          🌿 Indigenous Employers
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.chip, filters.remote === true && styles.chipActive]}
        onPress={() => setFilters(prev => ({ 
          ...prev, 
          remote: prev.remote === true ? null : true 
        }))}
      >
        <Text style={[styles.chipText, filters.remote === true && styles.chipTextActive]}>
          Remote
        </Text>
      </TouchableOpacity>
      {['full-time', 'part-time', 'contract'].map(type => (
        <TouchableOpacity
          key={type}
          style={[styles.chip, filters.jobTypes.includes(type) && styles.chipActive]}
          onPress={() => setFilters(prev => ({
            ...prev,
            jobTypes: prev.jobTypes.includes(type)
              ? prev.jobTypes.filter(t => t !== type)
              : [...prev.jobTypes, type],
          }))}
        >
          <Text style={[styles.chipText, filters.jobTypes.includes(type) && styles.chipTextActive]}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Render stats header
  const renderStatsHeader = () => (
    <View style={styles.statsHeader}>
      <Text style={styles.resultCount}>
        {filteredJobs.length} jobs found
      </Text>
      <TouchableOpacity style={styles.sortButton}>
        <Text style={styles.sortText}>Best Match</Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Jobs</Text>
        <TouchableOpacity style={styles.savedButton}>
          <Ionicons name="bookmark" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      {renderSearchHeader()}

      {/* Filter Chips */}
      {renderFilterChips()}

      {/* Stats */}
      {renderStatsHeader()}

      {/* Job List */}
      <FlatList
        data={filteredJobs}
        keyExtractor={item => item.id}
        renderItem={renderJobCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No Jobs Found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your filters or search terms
            </Text>
          </View>
        }
      />

      {/* Job Detail Modal */}
      <Modal
        visible={selectedJob !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedJob(null)}
      >
        {selectedJob && (
          <JobDetailView
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onSave={() => toggleSave(selectedJob.id)}
            onApply={() => applyToJob(selectedJob.id)}
            formatSalary={formatSalary}
            formatPostedDate={formatPostedDate}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
};

// Job Detail View Component
const JobDetailView: React.FC<{
  job: Job;
  onClose: () => void;
  onSave: () => void;
  onApply: () => void;
  formatSalary: (salary?: Job['salary']) => string;
  formatPostedDate: (date: Date) => string;
}> = ({ job, onClose, onSave, onApply, formatSalary, formatPostedDate }) => (
  <SafeAreaView style={styles.detailContainer}>
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onSave} style={styles.detailSaveButton}>
          <Ionicons
            name={job.saved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={job.saved ? COLORS.secondary : COLORS.text}
          />
        </TouchableOpacity>
      </View>

      {/* Company */}
      <View style={styles.detailCompanySection}>
        <Image
          source={{ uri: job.company.logo || 'https://via.placeholder.com/80' }}
          style={styles.detailCompanyLogo}
        />
        <Text style={styles.detailJobTitle}>{job.title}</Text>
        <View style={styles.detailCompanyRow}>
          <Text style={styles.detailCompanyName}>{job.company.name}</Text>
          {job.company.isIndigenousOwned && (
            <View style={styles.indigenousBadgeLarge}>
              <Text style={styles.indigenousBadgeTextLarge}>🌿 Indigenous Owned</Text>
            </View>
          )}
        </View>
        <View style={styles.detailMeta}>
          <View style={styles.detailMetaItem}>
            <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.detailMetaText}>{job.location}</Text>
          </View>
          <View style={styles.detailMetaItem}>
            <Ionicons name="briefcase-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.detailMetaText}>{job.type}</Text>
          </View>
          <View style={styles.detailMetaItem}>
            <Ionicons name="cash-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.detailMetaText}>{formatSalary(job.salary)}</Text>
          </View>
        </View>
      </View>

      {/* Match Score */}
      {job.matchScore && (
        <View style={styles.detailMatchSection}>
          <View style={styles.detailMatchHeader}>
            <Text style={styles.detailMatchTitle}>Your Match Score</Text>
            <Text style={styles.detailMatchPercent}>{job.matchScore}%</Text>
          </View>
          <View style={styles.detailMatchBar}>
            <View style={[styles.detailMatchFill, { width: `${job.matchScore}%` }]} />
          </View>
          <Text style={styles.detailMatchHint}>
            Based on your skills, experience, and preferences
          </Text>
        </View>
      )}

      {/* Description */}
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>About this role</Text>
        <Text style={styles.detailDescription}>{job.description}</Text>
      </View>

      {/* Skills */}
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Required Skills</Text>
        <View style={styles.detailSkillsGrid}>
          {job.skills.map((skill, index) => (
            <View key={index} style={styles.detailSkillTag}>
              <Text style={styles.detailSkillText}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Requirements */}
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Requirements</Text>
        {job.requirements.map((req, index) => (
          <View key={index} style={styles.requirementItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.requirementText}>{req}</Text>
          </View>
        ))}
      </View>

      {/* Benefits */}
      {job.benefits && job.benefits.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Benefits</Text>
          {job.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <Ionicons name="gift" size={20} color={COLORS.secondary} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>

    {/* Apply Button */}
    <View style={styles.applyContainer}>
      <TouchableOpacity
        style={[styles.applyFullButton, job.applied && styles.appliedFullButton]}
        onPress={onApply}
        disabled={job.applied}
      >
        <Text style={[styles.applyFullButtonText, job.applied && styles.appliedFullButtonText]}>
          {job.applied ? 'Already Applied' : 'Apply Now'}
        </Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  savedButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  chipContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  urgentBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  urgentText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  cardHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  companyName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  indigenousBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: COLORS.indigenous + '20',
    borderRadius: 10,
  },
  indigenousBadgeText: {
    fontSize: 11,
    color: COLORS.indigenous,
    fontWeight: '500',
  },
  saveButton: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
  },
  cardDetails: {
    marginTop: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  remoteBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: COLORS.success + '20',
    borderRadius: 10,
  },
  remoteBadgeText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '500',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  skillTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
  },
  skillTagText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  moreSkills: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginLeft: 4,
    alignSelf: 'center',
  },
  matchScoreContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchScoreBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    marginRight: 8,
  },
  matchScoreFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  matchScoreText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  applicationCount: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  applyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  appliedButton: {
    backgroundColor: COLORS.background,
  },
  applyButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '600',
  },
  appliedButtonText: {
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  // Detail styles
  detailContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 8,
  },
  detailSaveButton: {
    padding: 8,
  },
  detailCompanySection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailCompanyLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginBottom: 16,
  },
  detailJobTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  detailCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailCompanyName: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  indigenousBadgeLarge: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.indigenous + '20',
    borderRadius: 12,
  },
  indigenousBadgeTextLarge: {
    fontSize: 12,
    color: COLORS.indigenous,
    fontWeight: '600',
  },
  detailMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  detailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailMetaText: {
    marginLeft: 6,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailMatchSection: {
    margin: 20,
    padding: 16,
    backgroundColor: COLORS.success + '10',
    borderRadius: 16,
  },
  detailMatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailMatchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailMatchPercent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  detailMatchBar: {
    height: 8,
    backgroundColor: COLORS.white,
    borderRadius: 4,
    marginBottom: 8,
  },
  detailMatchFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  detailMatchHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  detailSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textSecondary,
  },
  detailSkillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailSkillTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 16,
  },
  detailSkillText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requirementText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  applyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  applyFullButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  appliedFullButton: {
    backgroundColor: COLORS.background,
  },
  applyFullButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  appliedFullButtonText: {
    color: COLORS.textSecondary,
  },
});

export default JobsScreen;

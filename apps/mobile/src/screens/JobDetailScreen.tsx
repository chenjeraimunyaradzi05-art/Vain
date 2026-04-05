import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { jobsApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

// Define navigation types
type RootStackParamList = {
  JobDetail: { jobId: string };
};

type JobDetailScreenRouteProp = RouteProp<RootStackParamList, 'JobDetail'>;
type JobDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Job {
  id: string;
  title: string;
  description: string;
  company: {
    name: string;
    logoUrl?: string;
    industry?: string;
  };
  location: string;
  employmentType: string;
  employment?: string; // Handling potential API inconsistency
  salaryLow?: number;
  salaryHigh?: number;
  postedAt: string;
  expiresAt?: string;
  isFeatured?: boolean;
}

export default function JobDetailScreen() {
  const route = useRoute<JobDetailScreenRouteProp>();
  const navigation = useNavigation<JobDetailScreenNavigationProp>();
  const { jobId } = route.params;
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  async function loadJob() {
    try {
      const result = await jobsApi.getJob(jobId);
      setJob(result.job || result);
    } catch (error) {
      Alert.alert('Error', 'Failed to load job details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApply() {
    if (!job) return;
    
    Alert.alert(
      'Apply for Job',
      `Apply for ${job.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setIsApplying(true);
            try {
              await jobsApi.applyForJob(jobId, {});
              Alert.alert('Success', 'Your application has been submitted!');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to submit application');
            } finally {
              setIsApplying(false);
            }
          },
        },
      ]
    );
  }

  async function handleShare() {
    if (!job) return;
    
    try {
      await Share.share({
        message: `Check out this job: ${job.title} at ${job.company?.name || 'a great company'}\n\nApply on Ngurra Pathways`,
        title: job.title,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }

  async function handleSave() {
    try {
      await jobsApi.saveJob(jobId);
      Alert.alert('Saved', 'Job saved to your list');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save job');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={60} color={colors.error} />
        <Text style={styles.errorText}>Job not found</Text>
      </View>
    );
  }

  const employmentType = job.employment || job.employmentType || '';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.company}>{job.company?.name || 'Company'}</Text>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            {job.location && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                <Text style={styles.metaText}>{job.location}</Text>
              </View>
            )}
            {employmentType ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                <Text style={styles.metaText}>{employmentType.replace('_', ' ')}</Text>
              </View>
            ) : null}
          </View>

          {/* Salary */}
          {(job.salaryLow || job.salaryHigh) && (
            <View style={styles.salaryContainer}>
              <Ionicons name="cash-outline" size={20} color={colors.accent} />
              <Text style={styles.salaryText}>
                ${job.salaryLow?.toLocaleString() || '?'}
                {job.salaryHigh && ` - $${job.salaryHigh.toLocaleString()}`}
                <Text style={styles.salaryPeriod}> per year</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions} accessibilityRole="toolbar">
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Save this job"
          >
            <Ionicons name="bookmark-outline" size={22} color={colors.primary} />
            <Text style={styles.actionText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share this job"
          >
            <Ionicons name="share-outline" size={22} color={colors.primary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">About the Role</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {/* Company Info */}
        {job.company && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">About the Company</Text>
            <View style={styles.companyCard}>
              <View style={styles.companyIcon}>
                <Ionicons name="business" size={24} color={colors.primary} />
              </View>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{job.company.name}</Text>
                {job.company.industry && (
                  <Text style={styles.companyIndustry}>{job.company.industry}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Posted Date */}
        <View style={styles.postedContainer}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={styles.postedText}>
            Posted {formatDate(job.postedAt)}
          </Text>
          {job.expiresAt && (
            <Text style={styles.expiresText}>
              • Expires {formatDate(job.expiresAt)}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Apply Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.applyButton, isApplying && styles.applyButtonDisabled]}
          onPress={handleApply}
          disabled={isApplying}
          accessibilityRole="button"
          accessibilityLabel={isApplying ? 'Submitting application' : `Apply for ${job.title}`}
          accessibilityState={{ disabled: isApplying }}
        >
          {isApplying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={20} color="#fff" />
              <Text style={styles.applyButtonText}>Apply Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  company: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.body,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.accent}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  salaryText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 16,
  },
  salaryPeriod: {
    color: colors.textSecondary,
    fontWeight: 'normal',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  actionText: {
    color: colors.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    lineHeight: 24,
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  companyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    ...typography.body,
    fontWeight: '600',
  },
  companyIndustry: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  postedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  postedText: {
    ...typography.caption,
  },
  expiresText: {
    ...typography.caption,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applyButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  applyButtonDisabled: {
    opacity: 0.7,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

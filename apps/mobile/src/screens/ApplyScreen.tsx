import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { jobsApi, profileApi } from '../services/api';
import { useSession } from '../hooks/useSession';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Apply: { jobId: string };
  JobDetail: { jobId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Apply'>;

interface Job {
  id: string;
  title: string;
  company: {
    name: string;
  };
  requiresCoverLetter?: boolean;
  requiresResume?: boolean;
  screeningQuestions?: Array<{
    id: string;
    text: string;
    required: boolean;
  }>;
}

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  resumeUrl?: string;
}

export default function ApplyScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const { user } = useSession();
  const [job, setJob] = useState<Job | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [useProfileResume, setUseProfileResume] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [jobId]);

  async function loadData() {
    try {
      const [jobResult, profileResult] = await Promise.all([
        jobsApi.getJob(jobId),
        profileApi.getProfile(),
      ]);
      setJob(jobResult.job || jobResult);
      setProfile(profileResult.profile || profileResult);
      
      // Check if user has a resume on profile
      const profileData = profileResult.profile || profileResult;
      if (!profileData?.resumeUrl) {
        setUseProfileResume(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load job details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePickResume() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (file.size && file.size > 5 * 1024 * 1024) {
          Alert.alert('Error', 'File must be less than 5MB');
          return;
        }
        setResumeFile(file);
        setUseProfileResume(false);
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  }

  async function handleSubmit() {
    if (!job) return;

    // Validation
    if (!coverLetter.trim() && job.requiresCoverLetter) {
      Alert.alert('Required', 'Please write a cover letter');
      return;
    }
    
    if (!useProfileResume && !resumeFile && job.requiresResume !== false) {
      Alert.alert('Required', 'Please upload a resume or use your profile resume');
      return;
    }

    // Check screening questions
    if (job.screeningQuestions && job.screeningQuestions.length > 0) {
      for (const q of job.screeningQuestions) {
        if (q.required && (!answers[q.id] || !answers[q.id].trim())) {
          Alert.alert('Required', 'Please answer all required screening questions');
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const applicationData = {
        coverLetter,
        useProfileResume,
        resumeFile,
        answers,
      };

      await jobsApi.applyForJob(jobId, applicationData);
      
      Alert.alert(
        'Success',
        'Your application has been submitted!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('JobDetail', { jobId }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
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
        <Text style={styles.errorText}>Job not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Apply for {job.title}</Text>
          <Text style={styles.company}>{job.company?.name}</Text>
        </View>

        {/* Resume Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resume</Text>
          
          {profile?.resumeUrl && (
            <TouchableOpacity
              style={[styles.option, useProfileResume && styles.optionSelected]}
              onPress={() => setUseProfileResume(true)}
            >
              <View style={styles.optionIcon}>
                <Ionicons 
                  name={useProfileResume ? "radio-button-on" : "radio-button-off"} 
                  size={24} 
                  color={useProfileResume ? colors.primary : colors.textSecondary} 
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Use Profile Resume</Text>
                <Text style={styles.optionSubtitle}>Last updated recently</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.option, !useProfileResume && styles.optionSelected]}
            onPress={() => {
              setUseProfileResume(false);
              if (!resumeFile) handlePickResume();
            }}
          >
            <View style={styles.optionIcon}>
              <Ionicons 
                name={!useProfileResume ? "radio-button-on" : "radio-button-off"} 
                size={24} 
                color={!useProfileResume ? colors.primary : colors.textSecondary} 
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Upload New Resume</Text>
              {resumeFile ? (
                <Text style={styles.fileName} numberOfLines={1}>
                  {resumeFile.name}
                </Text>
              ) : (
                <Text style={styles.optionSubtitle}>PDF or Word (Max 5MB)</Text>
              )}
            </View>
            {!useProfileResume && (
              <TouchableOpacity onPress={handlePickResume} style={styles.changeButton}>
                <Text style={styles.changeText}>{resumeFile ? 'Change' : 'Upload'}</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {/* Cover Letter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Cover Letter {job.requiresCoverLetter ? '*' : '(Optional)'}
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Why are you a good fit for this role?"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={6}
            value={coverLetter}
            onChangeText={setCoverLetter}
            textAlignVertical="top"
          />
        </View>

        {/* Screening Questions */}
        {job.screeningQuestions && job.screeningQuestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Screening Questions</Text>
            {job.screeningQuestions.map((q, index) => (
              <View key={q.id} style={styles.questionContainer}>
                <Text style={styles.questionLabel}>
                  {index + 1}. {q.text} {q.required && '*'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your answer"
                  placeholderTextColor={colors.textTertiary}
                  value={answers[q.id] || ''}
                  onChangeText={(text) => setAnswers(prev => ({ ...prev, [q.id]: text }))}
                />
              </View>
            ))}
          </View>
        )}

        <View style={styles.footerSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Application</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
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
    color: colors.error,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  company: {
    ...typography.subtitle1,
    color: colors.primary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  optionIcon: {
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  optionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  fileName: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  changeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  changeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
    ...typography.body,
  },
  questionContainer: {
    marginBottom: spacing.md,
  },
  questionLabel: {
    ...typography.body,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
  },
  footerSpacer: {
    height: 100,
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
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

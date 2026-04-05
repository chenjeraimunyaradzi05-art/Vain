/**
 * Course Detail Screen
 * Displays course information and enrollment flow
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { coursesApi } from '../services/api';

// Define types
interface Module {
  id: string;
  title: string;
  duration: string;
  completed?: boolean;
}

interface Instructor {
  name: string;
  title: string;
  photoUrl?: string;
  expertise?: string;
}

interface Certification {
  name: string;
  issuer: string;
}

interface Course {
  id: string;
  title: string;
  category: string;
  duration: string;
  level: string;
  enrolled: number;
  imageUrl?: string;
  description: string;
  learningOutcomes?: string[];
  prerequisites?: string[];
  modules?: Module[];
  instructor?: Instructor;
  culturalContext?: string;
  certification?: Certification;
  price: number;
  originalPrice?: number;
  isEnrolled?: boolean;
  isSaved?: boolean;
  progress?: number;
}

type RootStackParamList = {
  CourseDetail: { courseId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'CourseDetail'>;

/**
 * Section Header Component
 */
function SectionHeader({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/**
 * Module Item Component
 */
function ModuleItem({ module, index, isLocked }: { module: Module; index: number; isLocked: boolean }) {
  return (
    <View style={[styles.moduleItem, isLocked && styles.moduleLocked]}>
      <View style={styles.moduleIndex}>
        <Text style={styles.moduleIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.moduleContent}>
        <Text style={[styles.moduleTitle, isLocked && styles.lockedText]}>
          {module.title}
        </Text>
        <View style={styles.moduleMeta}>
          <Ionicons 
            name={isLocked ? 'lock-closed' : 'time-outline'} 
            size={14} 
            color={colors.textMuted} 
          />
          <Text style={styles.moduleMetaText}>
            {isLocked ? 'Enroll to access' : module.duration}
          </Text>
        </View>
      </View>
      {!isLocked && module.completed && (
        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
      )}
    </View>
  );
}

/**
 * Instructor Card Component
 */
function InstructorCard({ instructor }: { instructor: Instructor }) {
  return (
    <View style={styles.instructorCard}>
      <View style={styles.instructorAvatar}>
        {instructor.photoUrl ? (
          <Image source={{ uri: instructor.photoUrl }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person" size={32} color={colors.text} />
        )}
      </View>
      <View style={styles.instructorInfo}>
        <Text style={styles.instructorName}>{instructor.name}</Text>
        <Text style={styles.instructorTitle}>{instructor.title}</Text>
        {instructor.expertise && (
          <Text style={styles.instructorExpertise} numberOfLines={2}>
            {instructor.expertise}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * Progress Bar Component
 */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>{progress}% Complete</Text>
    </View>
  );
}

/**
 * Course Detail Screen Component
 */
export default function CourseDetailScreen({ route, navigation }: Props) {
  const { courseId } = route.params;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Fetch course details
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await coursesApi.getCourse(courseId);
        const data = response.data;
        setCourse(data);
        setSaved(data.isSaved || false);
      } catch (error) {
        console.error('Failed to fetch course:', error);
        Alert.alert('Error', 'Failed to load course details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourse();
  }, [courseId, navigation]);
  
  // Handle enrollment
  const handleEnroll = async () => {
    if (!course) return;
    setEnrolling(true);
    try {
      await coursesApi.enroll(courseId);
      setCourse(prev => prev ? ({ ...prev, isEnrolled: true, progress: 0 }) : null);
      Alert.alert(
        'Enrolled!', 
        `You've successfully enrolled in ${course.title}. Start learning now!`,
        [{ text: 'Start Learning', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Failed to enroll:', error);
      Alert.alert('Error', 'Failed to enroll in course. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };
  
  // Handle unenrollment
  const handleUnenroll = () => {
    Alert.alert(
      'Unenroll from Course',
      'Are you sure you want to unenroll? Your progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unenroll', 
          style: 'destructive',
          onPress: async () => {
            try {
              await coursesApi.unenroll(courseId);
              setCourse(prev => prev ? ({ ...prev, isEnrolled: false }) : null);
            } catch (error) {
              console.error('Failed to unenroll:', error);
            }
          }
        },
      ]
    );
  };
  
  // Handle save
  const handleSave = async () => {
    try {
      if (saved) {
        await coursesApi.unsaveCourse(courseId);
      } else {
        await coursesApi.saveCourse(courseId);
      }
      setSaved(!saved);
    } catch (error) {
      console.error('Failed to save course:', error);
    }
  };
  
  // Handle share
  const handleShare = async () => {
    if (!course) return;
    try {
      await Share.share({
        message: `Check out this course: ${course.title} on Ngurra Pathways`,
        url: `https://ngurrapathways.com.au/courses/${courseId}`,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  if (!course) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Course Image */}
        {course.imageUrl && (
          <Image 
            source={{ uri: course.imageUrl }} 
            style={styles.courseImage}
            resizeMode="cover"
          />
        )}
        
        {/* Course Header */}
        <View style={styles.header}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{course.category}</Text>
          </View>
          
          <Text style={styles.title}>{course.title}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>{course.duration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="bar-chart-outline" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>{course.level}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>{course.enrolled} enrolled</Text>
            </View>
          </View>
          
          {/* Progress (if enrolled) */}
          {course.isEnrolled && (
            <ProgressBar progress={course.progress || 0} />
          )}
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleSave}
            accessibilityLabel={saved ? 'Remove from saved' : 'Save course'}
          >
            <Ionicons 
              name={saved ? 'bookmark' : 'bookmark-outline'} 
              size={24} 
              color={saved ? colors.primary : colors.text} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShare}
            accessibilityLabel="Share course"
          >
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        {/* About Section */}
        <View style={styles.section}>
          <SectionHeader title="About this course" icon="information-circle-outline" />
          <Text style={styles.description}>{course.description}</Text>
        </View>
        
        {/* What You'll Learn */}
        {course.learningOutcomes && course.learningOutcomes.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="What you'll learn" icon="checkmark-circle-outline" />
            {course.learningOutcomes.map((outcome, index) => (
              <View key={index} style={styles.outcomeItem}>
                <Ionicons name="checkmark" size={20} color={colors.success} />
                <Text style={styles.outcomeText}>{outcome}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Prerequisites */}
        {course.prerequisites && course.prerequisites.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Prerequisites" icon="list-outline" />
            {course.prerequisites.map((prereq, index) => (
              <View key={index} style={styles.prereqItem}>
                <Text style={styles.prereqText}>• {prereq}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Course Content */}
        <View style={styles.section}>
          <SectionHeader title="Course content" icon="book-outline" />
          <Text style={styles.moduleCount}>
            {course.modules?.length || 0} modules
          </Text>
          {course.modules?.map((module, index) => (
            <ModuleItem 
              key={module.id || index}
              module={module}
              index={index}
              isLocked={!course.isEnrolled}
            />
          ))}
        </View>
        
        {/* Instructor */}
        {course.instructor && (
          <View style={styles.section}>
            <SectionHeader title="Instructor" icon="person-outline" />
            <InstructorCard instructor={course.instructor} />
          </View>
        )}
        
        {/* Cultural Context */}
        {course.culturalContext && (
          <View style={styles.section}>
            <SectionHeader title="Cultural significance" icon="leaf-outline" />
            <View style={styles.culturalCard}>
              <Text style={styles.culturalText}>{course.culturalContext}</Text>
            </View>
          </View>
        )}
        
        {/* Certification */}
        {course.certification && (
          <View style={styles.section}>
            <SectionHeader title="Certification" icon="ribbon-outline" />
            <View style={styles.certCard}>
              <Ionicons name="medal-outline" size={32} color={colors.warning} />
              <View style={styles.certInfo}>
                <Text style={styles.certTitle}>{course.certification.name}</Text>
                <Text style={styles.certIssuer}>
                  Issued by {course.certification.issuer}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Enrollment Footer */}
      <View style={styles.footer}>
        {course.isEnrolled ? (
          <View style={styles.enrolledFooter}>
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={() => {
                // Navigate to continue learning
              }}
            >
              <Ionicons name="play" size={20} color={colors.text} />
              <Text style={styles.continueText}>Continue Learning</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.unenrollButton}
              onPress={handleUnenroll}
            >
              <Text style={styles.unenrollText}>Unenroll</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.enrollFooter}>
            <View style={styles.priceContainer}>
              {course.price === 0 ? (
                <Text style={styles.freeText}>FREE</Text>
              ) : (
                <>
                  <Text style={styles.priceText}>${course.price}</Text>
                  {course.originalPrice && (
                    <Text style={styles.originalPrice}>${course.originalPrice}</Text>
                  )}
                </>
              )}
            </View>
            <TouchableOpacity 
              style={styles.enrollButton}
              onPress={handleEnroll}
              disabled={enrolling}
            >
              {enrolling ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Ionicons name="school-outline" size={20} color={colors.text} />
                  <Text style={styles.enrollText}>Enroll Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  courseImage: {
    width: '100%',
    height: 200,
  },
  header: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  outcomeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  outcomeText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  prereqItem: {
    marginBottom: spacing.xs,
  },
  prereqText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  moduleCount: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  moduleLocked: {
    opacity: 0.6,
  },
  moduleIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleIndexText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  lockedText: {
    color: colors.textMuted,
  },
  moduleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  moduleMetaText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  instructorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  instructorTitle: {
    color: colors.primary,
    fontSize: 14,
    marginBottom: 4,
  },
  instructorExpertise: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  culturalCard: {
    padding: spacing.md,
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  culturalText: {
    fontSize: 16,
    color: colors.text,
    fontStyle: 'italic',
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  certInfo: {
    flex: 1,
  },
  certTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  certIssuer: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.md,
  },
  enrolledFooter: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  continueText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  unenrollButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceLight,
  },
  unenrollText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  enrollFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  freeText: {
    color: colors.success,
    fontSize: 24,
    fontWeight: 'bold',
  },
  priceText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  originalPrice: {
    color: colors.textMuted,
    fontSize: 16,
    textDecorationLine: 'line-through',
  },
  enrollButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  enrollText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});

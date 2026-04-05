/**
 * Mentor Detail Screen
 * Full mentor profile with booking and connection options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { mentorApi } from '../services/api';
import { useSession } from '../hooks/useSession';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

// Define types
interface Mentor {
  id: string;
  userId: string;
  name: string;
  title: string;
  avatarUrl?: string;
  verified?: boolean;
  industry?: string;
  yearsExperience?: number;
  sessionCount?: number;
  rating?: number;
  menteeCount?: number;
  bio?: string;
  skills?: string[];
  mentoringApproach?: string;
  availability?: string;
  timezone?: string;
  culturalBackground?: string;
  languages?: string[];
  linkedinUrl?: string;
}

type ConnectionStatus = 'connected' | 'pending' | 'rejected' | null;

type RootStackParamList = {
  MentorDetail: { mentorId: string };
  BookSession: { mentorId: string };
  Messages: { screen: string; params: { recipientId: string } };
};

type Props = NativeStackScreenProps<RootStackParamList, 'MentorDetail'>;

export default function MentorDetailScreen({ route, navigation }: Props) {
  const { mentorId } = route.params;
  const { user } = useSession();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(null);

  useEffect(() => {
    loadMentor();
  }, [mentorId]);

  async function loadMentor() {
    try {
      const result = await mentorApi.getMentor(mentorId);
      setMentor(result.data?.mentor || result.data);
      setConnectionStatus(result.data?.connectionStatus);
    } catch (error) {
      Alert.alert('Error', 'Failed to load mentor details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConnect() {
    if (connectionStatus === 'connected') {
      navigation.navigate('BookSession', { mentorId });
      return;
    }

    setIsConnecting(true);
    try {
      await mentorApi.requestMentor(mentorId);
      setConnectionStatus('pending');
      Alert.alert('Request Sent', 'Your connection request has been sent to the mentor.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send connection request');
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleBookSession() {
    navigation.navigate('BookSession', { mentorId });
  }

  async function handleMessage() {
    if (mentor) {
      navigation.navigate('Messages', { 
        screen: 'ChatScreen',
        params: { recipientId: mentor.userId },
      });
    }
  }

  function getConnectionButtonText() {
    switch (connectionStatus) {
      case 'connected':
        return 'Book a Session';
      case 'pending':
        return 'Request Pending';
      case 'rejected':
        return 'Request Again';
      default:
        return 'Request Connection';
    }
  }

  function getConnectionButtonIcon(): keyof typeof Ionicons.glyphMap {
    switch (connectionStatus) {
      case 'connected':
        return 'calendar';
      case 'pending':
        return 'hourglass';
      default:
        return 'person-add';
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading mentor profile...</Text>
      </View>
    );
  }

  if (!mentor) {
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {mentor.avatarUrl ? (
            <Image source={{ uri: mentor.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {mentor.name?.[0]?.toUpperCase() || 'M'}
              </Text>
            </View>
          )}
          {mentor.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            </View>
          )}
        </View>
        
        <Text style={styles.name}>{mentor.name || 'Mentor'}</Text>
        <Text style={styles.title}>{mentor.title || 'Professional Mentor'}</Text>
        
        {mentor.industry && (
          <View style={styles.industryBadge}>
            <Text style={styles.industryText}>{mentor.industry}</Text>
          </View>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{mentor.yearsExperience || 0}</Text>
          <Text style={styles.statLabel}>Years Exp</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{mentor.sessionCount || 0}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {mentor.rating ? mentor.rating.toFixed(1) : '–'}
          </Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{mentor.menteeCount || 0}</Text>
          <Text style={styles.statLabel}>Mentees</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            connectionStatus === 'pending' && styles.pendingButton,
          ]}
          onPress={handleConnect}
          disabled={isConnecting || connectionStatus === 'pending'}
        >
          {isConnecting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Ionicons 
                name={getConnectionButtonIcon()} 
                size={20} 
                color={colors.textInverse} 
              />
              <Text style={styles.primaryButtonText}>
                {getConnectionButtonText()}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {connectionStatus === 'connected' && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleMessage}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Message</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>
          {mentor.bio || 'This mentor has not added a bio yet.'}
        </Text>
      </View>

      {/* Skills Section */}
      {mentor.skills && mentor.skills.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expertise</Text>
          <View style={styles.skillsContainer}>
            {mentor.skills.map((skill, index) => (
              <View key={index} style={styles.skillBadge}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Mentoring Approach */}
      {mentor.mentoringApproach && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mentoring Approach</Text>
          <Text style={styles.approachText}>{mentor.mentoringApproach}</Text>
        </View>
      )}

      {/* Availability */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Availability</Text>
        <View style={styles.availabilityRow}>
          <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.availabilityText}>
            {mentor.availability || 'Available for mentoring sessions'}
          </Text>
        </View>
        {mentor.timezone && (
          <View style={styles.availabilityRow}>
            <Ionicons name="globe-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.availabilityText}>{mentor.timezone}</Text>
          </View>
        )}
      </View>

      {/* Session Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Types</Text>
        <View style={styles.sessionTypesContainer}>
          <View style={styles.sessionType}>
            <Ionicons name="videocam" size={24} color={colors.primary} />
            <Text style={styles.sessionTypeText}>Video Call</Text>
          </View>
          <View style={styles.sessionType}>
            <Ionicons name="call" size={24} color={colors.primary} />
            <Text style={styles.sessionTypeText}>Phone Call</Text>
          </View>
          <View style={styles.sessionType}>
            <Ionicons name="chatbubbles" size={24} color={colors.primary} />
            <Text style={styles.sessionTypeText}>Chat</Text>
          </View>
        </View>
      </View>

      {/* Cultural Connection (if applicable) */}
      {mentor.culturalBackground && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cultural Connection</Text>
          <View style={styles.culturalContainer}>
            <Ionicons name="leaf" size={20} color={colors.accent} />
            <Text style={styles.culturalText}>{mentor.culturalBackground}</Text>
          </View>
        </View>
      )}

      {/* Languages */}
      {mentor.languages && mentor.languages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Languages</Text>
          <View style={styles.languagesContainer}>
            {mentor.languages.map((lang, index) => (
              <View key={index} style={styles.languageBadge}>
                <Text style={styles.languageText}>{lang}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* LinkedIn Profile */}
      {mentor.linkedinUrl && (
        <TouchableOpacity 
          style={styles.linkedinButton}
          onPress={() => Linking.openURL(mentor.linkedinUrl!)}
        >
          <Ionicons name="logo-linkedin" size={20} color={colors.info} />
          <Text style={styles.linkedinText}>View LinkedIn Profile</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.fontSize.body,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    ...shadows.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.primaryLight,
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.textInverse,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  name: {
    fontSize: typography.fontSize.h1,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text,
    textAlign: 'center',
  },
  title: {
    fontSize: typography.fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  industryBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  industryText: {
    fontSize: typography.fontSize.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.h2,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  pendingButton: {
    backgroundColor: colors.warning,
  },
  primaryButtonText: {
    fontSize: typography.fontSize.button,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.textInverse,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.button,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.primary,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.h3,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  bio: {
    fontSize: typography.fontSize.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skillBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skillText: {
    fontSize: typography.fontSize.caption,
    color: colors.text,
  },
  approachText: {
    fontSize: typography.fontSize.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  availabilityText: {
    fontSize: typography.fontSize.body,
    color: colors.textSecondary,
  },
  sessionTypesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sessionType: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  sessionTypeText: {
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
  },
  culturalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent + '20', // Using opacity
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  culturalText: {
    fontSize: typography.fontSize.body,
    color: colors.text,
    flex: 1,
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  languageBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageText: {
    fontSize: typography.fontSize.caption,
    color: colors.text,
  },
  linkedinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  linkedinText: {
    fontSize: typography.fontSize.body,
    color: colors.info,
  },
});

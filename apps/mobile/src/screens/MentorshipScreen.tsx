/**
 * Mentorship Screen
 * Browse mentors, manage connections, schedule sessions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  ListRenderItem
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { mentorApi } from '../services/api';
import { useSession } from '../hooks/useSession';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

// Define types
interface Mentor {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  avatarUrl?: string;
  bio?: string;
  skills?: string[];
  mob?: string;
}

interface MyMentor {
  id: string;
  mentorId: string;
  mentorFirstName: string;
  mentorLastName: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
}

interface Session {
  id: string;
  mentorName?: string;
  scheduledAt: string;
  status: string;
  topic?: string;
  meetingUrl?: string;
}

type RootStackParamList = {
  ScheduleSession: { mentorId: string };
  Messages: { recipientId: string };
};

type MentorshipScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TABS = ['Find Mentor', 'My Mentors', 'Sessions'];

export default function MentorshipScreen() {
  const navigation = useNavigation<MentorshipScreenNavigationProp>();
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [myMentors, setMyMentors] = useState<MyMentor[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    industry: '',
    country: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setIsLoading(true);
    try {
      if (activeTab === 0) {
        await loadMentors();
      } else if (activeTab === 1) {
        await loadMyMentors();
      } else {
        await loadSessions();
      }
    } catch (error) {
      console.error('Failed to load mentorship data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMentors() {
    const result = await mentorApi.findMentors({
      search: searchQuery,
      ...filters,
    });
    setMentors(result.data?.mentors || []);
  }

  async function loadMyMentors() {
    const result = await mentorApi.getMyMentors();
    setMyMentors(result.data?.mentors || []);
  }

  async function loadSessions() {
    const result = await mentorApi.getSessions();
    setSessions(result.data?.sessions || []);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [activeTab]);

  async function handleRequestMentor(mentorId: string, mentorName: string) {
    Alert.alert(
      'Request Mentorship',
      `Would you like to request ${mentorName} as your mentor?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              await mentorApi.requestMentor(mentorId);
              Alert.alert('Success', 'Mentorship request sent!');
              loadMyMentors();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send request');
            }
          },
        },
      ]
    );
  }

  async function handleScheduleSession(mentorId: string) {
    // Navigate to scheduling screen
    navigation.navigate('ScheduleSession', { mentorId });
  }

  function renderTabContent() {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    switch (activeTab) {
      case 0:
        return renderFindMentor();
      case 1:
        return renderMyMentors();
      case 2:
        return renderSessions();
      default:
        return null;
    }
  }

  function renderFindMentor() {
    return (
      <>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search mentors by name, skill..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => loadMentors()}
              returnKeyType="search"
              accessibilityLabel="Search mentors"
              accessibilityHint="Type to search mentors by name or skill"
            />
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
          accessibilityRole="tablist"
          accessibilityLabel="Mentor filters"
        >
          <FilterPill
            label="Industry"
            value={filters.industry}
            onPress={() => {/* Show industry picker */}}
          />
          <FilterPill
            label="Country/Mob"
            value={filters.country}
            onPress={() => {/* Show country picker */}}
          />
        </ScrollView>

        {/* Mentor List */}
        {mentors.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No mentors found"
            message="Try adjusting your search or filters"
          />
        ) : (
          <FlatList
            data={mentors}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MentorCard
                mentor={item}
                onRequest={() => handleRequestMentor(item.id, item.firstName)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </>
    );
  }

  function renderMyMentors() {
    if (myMentors.length === 0) {
      return (
        <EmptyState
          icon="heart-outline"
          title="No mentor connections yet"
          message="Find a mentor to guide your career journey"
          action={{
            label: 'Find Mentors',
            onPress: () => setActiveTab(0),
          }}
        />
      );
    }

    return (
      <FlatList
        data={myMentors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MentorConnectionCard
            mentor={item}
            onSchedule={() => handleScheduleSession(item.mentorId)}
            onMessage={() => navigation.navigate('Messages', { recipientId: item.mentorId })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  }

  function renderSessions() {
    if (sessions.length === 0) {
      return (
        <EmptyState
          icon="calendar-outline"
          title="No scheduled sessions"
          message="Schedule a session with your mentor to get started"
        />
      );
    }

    const upcomingSessions = sessions.filter(s => new Date(s.scheduledAt) > new Date());
    const pastSessions = sessions.filter(s => new Date(s.scheduledAt) <= new Date());

    return (
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {upcomingSessions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
            {upcomingSessions.map((session) => (
              <SessionCard key={session.id} session={session} isUpcoming />
            ))}
          </>
        )}

        {pastSessions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Past Sessions</Text>
            {pastSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab, index) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === index && styles.tabActive]}
            onPress={() => setActiveTab(index)}
          >
            <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {renderTabContent()}
    </View>
  );
}

// Sub-components

function FilterPill({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.filterPill, !!value && styles.filterPillActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterPillText, !!value && styles.filterPillTextActive]}>
        {value || label}
      </Text>
      <Ionicons
        name="chevron-down"
        size={16}
        color={value ? colors.primary : colors.textMuted}
      />
    </TouchableOpacity>
  );
}

function MentorCard({ mentor, onRequest }: { mentor: Mentor; onRequest: () => void }) {
  return (
    <View style={styles.mentorCard}>
      <View style={styles.mentorAvatar}>
        <Ionicons name="person" size={28} color={colors.textMuted} />
      </View>
      <View style={styles.mentorInfo}>
        <Text style={styles.mentorName}>
          {mentor.firstName} {mentor.lastName}
        </Text>
        {mentor.industry && (
          <Text style={styles.mentorIndustry}>{mentor.industry}</Text>
        )}
        {mentor.mob && (
          <View style={styles.mobBadge}>
            <Ionicons name="leaf" size={12} color={colors.accent} />
            <Text style={styles.mobText}>{mentor.mob}</Text>
          </View>
        )}
        {mentor.bio && (
          <Text style={styles.mentorBio} numberOfLines={2}>{mentor.bio}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.requestButton} onPress={onRequest}>
        <Ionicons name="add" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function MentorConnectionCard({ mentor, onSchedule, onMessage }: { mentor: MyMentor; onSchedule: () => void; onMessage: () => void }) {
  const statusColors: Record<string, string> = {
    PENDING: colors.warning,
    ACTIVE: colors.success,
    COMPLETED: colors.textMuted,
  };

  return (
    <View style={styles.connectionCard}>
      <View style={styles.connectionHeader}>
        <View style={styles.mentorAvatar}>
          <Ionicons name="person" size={24} color={colors.textMuted} />
        </View>
        <View style={styles.connectionInfo}>
          <Text style={styles.mentorName}>
            {mentor.mentorFirstName} {mentor.mentorLastName}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColors[mentor.status]}30` }]}>
            <Text style={[styles.statusText, { color: statusColors[mentor.status] }]}>
              {mentor.status}
            </Text>
          </View>
        </View>
      </View>

      {mentor.status === 'ACTIVE' && (
        <View style={styles.connectionActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onMessage}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={styles.actionBtnText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={onSchedule}>
            <Ionicons name="calendar-outline" size={18} color="#fff" />
            <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Schedule</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SessionCard({ session, isUpcoming }: { session: Session; isUpcoming?: boolean }) {
  const sessionDate = new Date(session.scheduledAt);
  
  return (
    <View style={[styles.sessionCard, isUpcoming && styles.sessionCardUpcoming]}>
      <View style={styles.sessionDate}>
        <Text style={styles.sessionDay}>{sessionDate.getDate()}</Text>
        <Text style={styles.sessionMonth}>
          {sessionDate.toLocaleString('default', { month: 'short' })}
        </Text>
      </View>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle}>{session.topic || 'Mentoring Session'}</Text>
        <Text style={styles.sessionMentor}>
          with {session.mentorName || 'Mentor'}
        </Text>
        <Text style={styles.sessionTime}>
          {sessionDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {isUpcoming && session.meetingUrl && (
        <TouchableOpacity style={styles.joinButton}>
          <Ionicons name="videocam" size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptyState({ icon, title, message, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={60} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action && (
        <TouchableOpacity style={styles.emptyAction} onPress={action.onPress}>
          <Text style={styles.emptyActionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  filterContainer: {
    marginBottom: spacing.md,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  filterPillText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  filterPillTextActive: {
    color: colors.primary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  mentorCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  mentorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentorInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  mentorName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text,
  },
  mentorIndustry: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  mobBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  mobText: {
    color: colors.accent,
    fontSize: 12,
  },
  mentorBio: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  requestButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  connectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  connectionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
  },
  actionBtnText: {
    color: colors.primary,
    fontWeight: '600',
  },
  actionBtnTextPrimary: {
    color: '#fff',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sessionCardUpcoming: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  sessionDate: {
    width: 50,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sessionDay: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  sessionMonth: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text,
  },
  sessionMentor: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sessionTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  joinButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyMessage: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyAction: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyActionText: {
    color: '#fff',
    fontWeight: '600',
  },
});

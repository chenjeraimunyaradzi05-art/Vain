/**
 * Mentor Dashboard Screen
 * 
 * Comprehensive dashboard for mentors to manage:
 * - Upcoming and past sessions
 * - Earnings and payouts
 * - Mentee connections
 * - Availability calendar
 * - Session ratings and reviews
 * - Profile visibility settings
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Animated,
  FlatList,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, addDays, isSameDay, isAfter, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSession } from '../hooks/useSession';
import { api } from '../services/api';

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
  gold: '#f59e0b',
  purple: '#8b5cf6',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface MentorSession {
  id: string;
  menteeId: string;
  menteeName: string;
  menteePhoto?: string;
  scheduledAt: string;
  duration: number;
  topic?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  meetingUrl?: string;
  rating?: number;
  review?: string;
  earnings?: number;
}

interface MentorEarnings {
  totalEarnings: number;
  pendingPayout: number;
  lastPayout?: number;
  lastPayoutDate?: string;
  monthlyEarnings: number;
  completedSessions: number;
  avgSessionRating: number;
}

interface MenteeConnection {
  id: string;
  userId: string;
  name: string;
  photoUrl?: string;
  sessionsCompleted: number;
  lastSession?: string;
  isActive: boolean;
}

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface MentorDashboardScreenProps {
  navigation: any;
}

// Stat Card Component
const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  color,
  onPress,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    style={styles.statCard}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.8 : 1}
    accessibilityRole={onPress ? 'button' : 'text'}
    accessibilityLabel={`${title}: ${value}`}
  >
    <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={22} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </TouchableOpacity>
);

// Session Card Component
const SessionCard = ({
  session,
  onPress,
  onStartCall,
  onCancel,
}: {
  session: MentorSession;
  onPress: () => void;
  onStartCall?: () => void;
  onCancel?: () => void;
}) => {
  const sessionTime = parseISO(session.scheduledAt);
  const isUpcoming = isAfter(sessionTime, new Date());
  const canStart = isUpcoming && Math.abs(new Date().getTime() - sessionTime.getTime()) < 15 * 60 * 1000;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.success;
      case 'pending': return colors.warning;
      case 'completed': return colors.primary;
      case 'cancelled': return colors.textMuted;
      case 'no_show': return colors.error;
      default: return colors.textSecondary;
    }
  };

  return (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Session with ${session.menteeName} on ${format(sessionTime, 'PPP')} at ${format(sessionTime, 'p')}`}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionTimeContainer}>
          <Text style={styles.sessionDate}>{format(sessionTime, 'EEE, MMM d')}</Text>
          <Text style={styles.sessionTime}>{format(sessionTime, 'h:mm a')}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(session.status) }]}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.sessionDetails}>
        <Text style={styles.menteeName}>{session.menteeName}</Text>
        {session.topic && <Text style={styles.sessionTopic}>{session.topic}</Text>}
        <Text style={styles.sessionDuration}>{session.duration} minutes</Text>
      </View>

      {isUpcoming && session.status === 'confirmed' && (
        <View style={styles.sessionActions}>
          {canStart && (
            <TouchableOpacity
              style={styles.startCallButton}
              onPress={onStartCall}
              accessibilityLabel="Start video call"
            >
              <Ionicons name="videocam" size={18} color="#fff" />
              <Text style={styles.startCallText}>Start Call</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            accessibilityLabel="Cancel session"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {session.status === 'completed' && session.rating && (
        <View style={styles.ratingContainer}>
          {[...Array(5)].map((_, i) => (
            <Ionicons
              key={i}
              name={i < session.rating! ? 'star' : 'star-outline'}
              size={16}
              color={colors.gold}
            />
          ))}
          {session.earnings && (
            <Text style={styles.earningsText}>+${session.earnings.toFixed(2)}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Availability Day Selector
const AvailabilitySelector = ({
  slots,
  onChange,
}: {
  slots: AvailabilitySlot[];
  onChange: (slots: AvailabilitySlot[]) => void;
}) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleDay = (dayIndex: number) => {
    const newSlots = [...slots];
    const existingIndex = newSlots.findIndex(s => s.dayOfWeek === dayIndex);
    if (existingIndex >= 0) {
      newSlots[existingIndex].isActive = !newSlots[existingIndex].isActive;
    } else {
      newSlots.push({
        dayOfWeek: dayIndex,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
      });
    }
    onChange(newSlots);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.availabilityContainer}>
      {days.map((day, index) => {
        const slot = slots.find(s => s.dayOfWeek === index);
        const isActive = slot?.isActive ?? false;
        return (
          <TouchableOpacity
            key={day}
            style={[styles.dayButton, isActive && styles.dayButtonActive]}
            onPress={() => toggleDay(index)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isActive }}
            accessibilityLabel={`${day} ${isActive ? 'available' : 'not available'}`}
          >
            <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{day}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Main Component
export default function MentorDashboardScreen({ navigation }: MentorDashboardScreenProps) {
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [earnings, setEarnings] = useState<MentorEarnings | null>(null);
  const [mentees, setMentees] = useState<MenteeConnection[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);

  // Animation
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Auth
  const { user } = useSession();

  // Load data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [sessionsRes, earningsRes, menteesRes, availabilityRes] = await Promise.all([
        api.get('/mentor/sessions'),
        api.get('/mentor/earnings'),
        api.get('/mentor/mentees'),
        api.get('/mentor/availability'),
      ]);

      setSessions(sessionsRes.data.sessions || []);
      setEarnings(earningsRes.data);
      setMentees(menteesRes.data.mentees || []);
      setAvailability(availabilityRes.data.slots || []);
      setIsAvailable(availabilityRes.data.isAvailable ?? true);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      // Use mock data for demo
      setSessions([
        {
          id: '1',
          menteeId: 'u1',
          menteeName: 'Sarah Johnson',
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          duration: 45,
          topic: 'Career Transition Strategies',
          status: 'confirmed',
          meetingUrl: 'https://meet.ngurra.com.au/abc123',
        },
        {
          id: '2',
          menteeId: 'u2',
          menteeName: 'David Williams',
          scheduledAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
          duration: 30,
          topic: 'Resume Review',
          status: 'pending',
        },
        {
          id: '3',
          menteeId: 'u3',
          menteeName: 'Emily Brown',
          scheduledAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          duration: 60,
          topic: 'Leadership Development',
          status: 'completed',
          rating: 5,
          review: 'Incredibly helpful session!',
          earnings: 120,
        },
      ]);
      setEarnings({
        totalEarnings: 4250,
        pendingPayout: 360,
        lastPayout: 890,
        lastPayoutDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        monthlyEarnings: 1280,
        completedSessions: 32,
        avgSessionRating: 4.8,
      });
      setAvailability([
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isActive: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isActive: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '12:00', isActive: true },
      ]);
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

  // Toggle availability
  const handleToggleAvailability = async (value: boolean) => {
    setIsAvailable(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.put('/mentor/availability', { isAvailable: value });
    } catch (error) {
      console.error('Failed to update availability:', error);
      setIsAvailable(!value);
    }
  };

  // Start call
  const handleStartCall = (session: MentorSession) => {
    navigation.navigate('VideoCall', { sessionId: session.id, meetingUrl: session.meetingUrl });
  };

  // Cancel session
  const handleCancelSession = (session: MentorSession) => {
    Alert.alert(
      'Cancel Session',
      `Are you sure you want to cancel the session with ${session.menteeName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/mentor/sessions/${session.id}/cancel`);
              loadDashboardData();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel session');
            }
          },
        },
      ]
    );
  };

  // Request payout
  const handleRequestPayout = () => {
    if (!earnings || earnings.pendingPayout < 50) {
      Alert.alert('Minimum Payout', 'You need at least $50 in pending earnings to request a payout.');
      return;
    }

    Alert.alert(
      'Request Payout',
      `Request payout of $${earnings.pendingPayout.toFixed(2)} to your linked bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              await api.post('/mentor/payout');
              Alert.alert('Success', 'Payout requested! Funds will arrive in 2-3 business days.');
              loadDashboardData();
            } catch (error) {
              Alert.alert('Error', 'Failed to request payout');
            }
          },
        },
      ]
    );
  };

  // Filter sessions
  const upcomingSessions = sessions.filter(s => 
    isAfter(parseISO(s.scheduledAt), new Date()) && s.status !== 'cancelled'
  );
  const pastSessions = sessions.filter(s => 
    !isAfter(parseISO(s.scheduledAt), new Date()) || s.status === 'completed'
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

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
          colors={[colors.primary, colors.primaryLight]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Welcome back!</Text>
              <Text style={styles.headerTitle}>Mentor Dashboard</Text>
            </View>
            <View style={styles.availabilityToggle}>
              <Text style={styles.availabilityLabel}>Available</Text>
              <Switch
                value={isAvailable}
                onValueChange={handleToggleAvailability}
                trackColor={{ false: 'rgba(255,255,255,0.3)', true: colors.success }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="This Month"
            value={`$${earnings?.monthlyEarnings.toLocaleString() || 0}`}
            icon="trending-up"
            color={colors.success}
          />
          <StatCard
            title="Pending"
            value={`$${earnings?.pendingPayout.toFixed(2) || 0}`}
            icon="wallet"
            color={colors.purple}
            onPress={handleRequestPayout}
          />
          <StatCard
            title="Sessions"
            value={earnings?.completedSessions || 0}
            icon="videocam"
            color={colors.primary}
          />
          <StatCard
            title="Rating"
            value={earnings?.avgSessionRating.toFixed(1) || '0.0'}
            subtitle="/ 5.0"
            icon="star"
            color={colors.gold}
          />
        </View>

        {/* Total Earnings Card */}
        <TouchableOpacity
          style={styles.earningsCard}
          onPress={() => navigation.navigate('MentorEarnings')}
          activeOpacity={0.9}
        >
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
          <Text style={styles.totalEarnings}>
            ${earnings?.totalEarnings.toLocaleString() || 0}
          </Text>
          {earnings?.lastPayout && (
            <Text style={styles.lastPayout}>
              Last payout: ${earnings.lastPayout} on {format(parseISO(earnings.lastPayoutDate!), 'MMM d')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Availability Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly Availability</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AvailabilitySettings')}
              accessibilityLabel="Edit availability settings"
            >
              <Text style={styles.editLink}>Edit Times</Text>
            </TouchableOpacity>
          </View>
          <AvailabilitySelector slots={availability} onChange={setAvailability} />
        </View>

        {/* Sessions Tabs */}
        <View style={styles.section}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
              onPress={() => setActiveTab('upcoming')}
            >
              <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
                Upcoming ({upcomingSessions.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'past' && styles.activeTab]}
              onPress={() => setActiveTab('past')}
            >
              <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
                Past Sessions
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'upcoming' ? (
            upcomingSessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No upcoming sessions</Text>
                <Text style={styles.emptySubtitle}>
                  Your upcoming mentorship sessions will appear here
                </Text>
              </View>
            ) : (
              upcomingSessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
                  onStartCall={() => handleStartCall(session)}
                  onCancel={() => handleCancelSession(session)}
                />
              ))
            )
          ) : (
            pastSessions.slice(0, 5).map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
              />
            ))
          )}

          {pastSessions.length > 5 && activeTab === 'past' && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('SessionHistory')}
            >
              <Text style={styles.viewAllText}>View All Sessions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('EditMentorProfile')}
            >
              <Ionicons name="person-circle" size={24} color={colors.primary} />
              <Text style={styles.actionText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('MentorResources')}
            >
              <Ionicons name="library" size={24} color={colors.primary} />
              <Text style={styles.actionText}>Resources</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('MentorSupport')}
            >
              <Ionicons name="help-circle" size={24} color={colors.primary} />
              <Text style={styles.actionText}>Get Help</Text>
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
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  availabilityToggle: {
    alignItems: 'center',
  },
  availabilityLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: -20,
  },
  statCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Earnings Card
  earningsCard: {
    backgroundColor: colors.card,
    marginHorizontal: 18,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  earningsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  totalEarnings: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  lastPayout: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
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
  editLink: {
    fontSize: 14,
    color: colors.primary,
  },

  // Availability
  availabilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayTextActive: {
    color: '#fff',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#fff',
  },

  // Session Card
  sessionCard: {
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTimeContainer: {},
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sessionTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionDetails: {},
  menteeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sessionTopic: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  sessionDuration: {
    fontSize: 13,
    color: colors.textMuted,
  },
  sessionActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  startCallText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  earningsText: {
    marginLeft: 'auto',
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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

  // View All
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
  },
  actionText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
});

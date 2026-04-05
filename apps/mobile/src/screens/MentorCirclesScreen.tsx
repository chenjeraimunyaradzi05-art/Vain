/**
 * MentorCirclesScreen.tsx - Mentor Circles Screen
 * 
 * Features:
 * - Browse and join mentor circles
 * - View circle details and sessions
 * - Filter by topic, mentor, availability
 * - Track enrolled circles
 * - View upcoming sessions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../hooks/useSession';
import { mentorApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Types
interface CircleHost {
  id: string;
  name: string;
  avatar?: string;
  title?: string;
  expertise: string[];
}

interface CircleSession {
  id: string;
  sessionNumber: number;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  meetingUrl?: string;
  attendeeCount?: number;
}

interface MentorCircle {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImageUrl?: string;
  type: 'open' | 'cohort' | 'private';
  status: 'draft' | 'active' | 'full' | 'completed' | 'cancelled';
  host: CircleHost;
  coHosts?: { id: string; name: string; avatar?: string }[];
  startDate: string;
  endDate?: string;
  timezone: string;
  maxParticipants: number;
  currentParticipants: number;
  waitlistCount: number;
  topics: string[];
  targetAudience: string;
  outcomes: string[];
  isFree: boolean;
  price?: number;
  currency?: string;
  isJoined?: boolean;
  isWaitlisted?: boolean;
  rating?: number;
  reviewCount?: number;
  totalSessions: number;
  schedule: {
    frequency: string;
    dayOfWeek?: number;
    time: string;
    duration: number;
  };
  nextSession?: CircleSession;
}

type TabType = 'discover' | 'my_circles' | 'upcoming';

interface MentorCirclesScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

// Day of week mapping
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MentorCirclesScreen({ navigation }: MentorCirclesScreenProps) {
  const { user } = useSession();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [circles, setCircles] = useState<MentorCircle[]>([]);
  const [myCircles, setMyCircles] = useState<MentorCircle[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<CircleSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Detail modal state
  const [selectedCircle, setSelectedCircle] = useState<MentorCircle | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  // Popular topics
  const TOPICS = [
    'Career Development',
    'Leadership',
    'Tech Skills',
    'Entrepreneurship',
    'Work-Life Balance',
    'Cultural Identity',
    'Job Search',
    'Networking',
  ];
  
  // Load data on mount and tab change
  useEffect(() => {
    loadData();
  }, [activeTab, selectedTopic]);
  
  // Load data based on active tab
  const loadData = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
      setPage(1);
    } else {
      setIsLoading(true);
    }
    
    try {
      switch (activeTab) {
        case 'discover':
          const params: any = {
            page: refresh ? 1 : page,
            limit: 10,
            status: 'active',
          };
          if (selectedTopic) params.topic = selectedTopic;
          if (search) params.search = search;
          
          const result = await mentorApi.getCircles(params);
          if (refresh || page === 1) {
            setCircles(result.circles || []);
          } else {
            setCircles(prev => [...prev, ...(result.circles || [])]);
          }
          setHasMore(result.pagination?.hasNext || false);
          break;
          
        case 'my_circles':
          const myResult = await mentorApi.getMyCircles();
          setMyCircles(myResult.circles || []);
          break;
          
        case 'upcoming':
          const sessionsResult = await mentorApi.getUpcomingCircleSessions();
          setUpcomingSessions(sessionsResult.sessions || []);
          break;
      }
    } catch (err) {
      console.error('Load circles error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Refresh handler
  const onRefresh = useCallback(() => {
    loadData(true);
  }, [activeTab, selectedTopic, search]);
  
  // Load more handler
  const loadMore = () => {
    if (!isLoading && hasMore && activeTab === 'discover') {
      setPage(prev => prev + 1);
      loadData();
    }
  };
  
  // Search handler with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== '') {
        setPage(1);
        loadData(true);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [search]);
  
  // Open circle detail
  const openCircleDetail = async (circle: MentorCircle) => {
    setSelectedCircle(circle);
    setShowDetailModal(true);
  };
  
  // Join circle
  const handleJoinCircle = async (circle: MentorCircle) => {
    if (circle.isJoined) {
      Alert.alert(
        'Leave Circle',
        `Are you sure you want to leave ${circle.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              try {
                await mentorApi.leaveCircle(circle.id);
                updateCircleStatus(circle.id, { isJoined: false, currentParticipants: circle.currentParticipants - 1 });
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to leave circle');
              }
            },
          },
        ]
      );
      return;
    }
    
    setIsJoining(true);
    try {
      const isFull = circle.currentParticipants >= circle.maxParticipants;
      
      if (isFull) {
        await mentorApi.joinCircleWaitlist(circle.id);
        updateCircleStatus(circle.id, { isWaitlisted: true, waitlistCount: circle.waitlistCount + 1 });
        Alert.alert('Added to Waitlist', 'You\'ve been added to the waitlist. We\'ll notify you when a spot opens up.');
      } else {
        await mentorApi.joinCircle(circle.id);
        updateCircleStatus(circle.id, { isJoined: true, currentParticipants: circle.currentParticipants + 1 });
        Alert.alert('Joined!', `You've successfully joined ${circle.name}. Check your upcoming sessions!`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join circle');
    } finally {
      setIsJoining(false);
    }
  };
  
  // Update circle status in local state
  const updateCircleStatus = (circleId: string, updates: Partial<MentorCircle>) => {
    const updateFn = (c: MentorCircle) => c.id === circleId ? { ...c, ...updates } : c;
    setCircles(prev => prev.map(updateFn));
    setMyCircles(prev => prev.map(updateFn));
    if (selectedCircle?.id === circleId) {
      setSelectedCircle(prev => prev ? { ...prev, ...updates } : null);
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  // Format schedule
  const formatSchedule = (circle: MentorCircle) => {
    const { schedule } = circle;
    if (!schedule) return '';
    
    const day = schedule.dayOfWeek !== undefined ? DAYS[schedule.dayOfWeek] : '';
    const freq = schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1);
    return `${freq} on ${day}s at ${schedule.time}`;
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'full': return colors.warning;
      case 'completed': return colors.textSecondary;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };
  
  // Render topic filter
  const renderTopicFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.topicsContainer}
    >
      <TouchableOpacity
        style={[styles.topicChip, !selectedTopic && styles.topicChipActive]}
        onPress={() => setSelectedTopic(null)}
      >
        <Text style={[styles.topicChipText, !selectedTopic && styles.topicChipTextActive]}>
          All Topics
        </Text>
      </TouchableOpacity>
      {TOPICS.map(topic => (
        <TouchableOpacity
          key={topic}
          style={[styles.topicChip, selectedTopic === topic && styles.topicChipActive]}
          onPress={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
        >
          <Text style={[styles.topicChipText, selectedTopic === topic && styles.topicChipTextActive]}>
            {topic}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
  
  // Render circle card
  const renderCircleCard = ({ item }: { item: MentorCircle }) => {
    const spotsLeft = item.maxParticipants - item.currentParticipants;
    const isFull = spotsLeft <= 0;
    
    return (
      <TouchableOpacity
        style={styles.circleCard}
        onPress={() => openCircleDetail(item)}
        activeOpacity={0.7}
      >
        {item.coverImageUrl && (
          <Image
            source={{ uri: item.coverImageUrl }}
            style={styles.circleImage}
          />
        )}
        <View style={styles.circleContent}>
          {/* Status badge */}
          <View style={styles.circleHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
            {item.isFree ? (
              <View style={styles.freeBadge}>
                <Text style={styles.freeText}>FREE</Text>
              </View>
            ) : (
              <Text style={styles.priceText}>
                {item.currency || '$'}{item.price}
              </Text>
            )}
          </View>
          
          <Text style={styles.circleName}>{item.name}</Text>
          <Text style={styles.circleDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          {/* Host info */}
          <View style={styles.hostRow}>
            <Image
              source={{ uri: item.host.avatar || 'https://via.placeholder.com/40' }}
              style={styles.hostAvatar}
            />
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>Hosted by {item.host.name}</Text>
              <Text style={styles.hostTitle}>{item.host.title}</Text>
            </View>
          </View>
          
          {/* Topics */}
          <View style={styles.topicsRow}>
            {item.topics.slice(0, 3).map((topic, idx) => (
              <View key={idx} style={styles.topicTag}>
                <Text style={styles.topicTagText}>{topic}</Text>
              </View>
            ))}
            {item.topics.length > 3 && (
              <Text style={styles.moreTopics}>+{item.topics.length - 3}</Text>
            )}
          </View>
          
          {/* Schedule & spots */}
          <View style={styles.circleFooter}>
            <View style={styles.scheduleInfo}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.scheduleText}>{formatSchedule(item)}</Text>
            </View>
            <View style={styles.spotsInfo}>
              <Ionicons 
                name="people-outline" 
                size={14} 
                color={isFull ? colors.error : colors.textSecondary} 
              />
              <Text style={[styles.spotsText, isFull && styles.spotsTextFull]}>
                {isFull ? `Full (${item.waitlistCount} waiting)` : `${spotsLeft} spots left`}
              </Text>
            </View>
          </View>
          
          {/* Rating */}
          {item.rating !== undefined && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>
                {item.rating.toFixed(1)} ({item.reviewCount} reviews)
              </Text>
            </View>
          )}
          
          {/* Join button */}
          <TouchableOpacity
            style={[
              styles.joinButton,
              item.isJoined && styles.joinedButton,
              item.isWaitlisted && styles.waitlistedButton,
            ]}
            onPress={() => handleJoinCircle(item)}
            disabled={isJoining}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons 
                  name={item.isJoined ? 'checkmark-circle' : item.isWaitlisted ? 'time' : 'add-circle'} 
                  size={18} 
                  color={item.isJoined || item.isWaitlisted ? colors.white : colors.primary} 
                />
                <Text style={[
                  styles.joinButtonText,
                  (item.isJoined || item.isWaitlisted) && styles.joinedButtonText,
                ]}>
                  {item.isJoined ? 'Joined' : item.isWaitlisted ? 'On Waitlist' : isFull ? 'Join Waitlist' : 'Join Circle'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render my circle card (smaller variant)
  const renderMyCircleCard = ({ item }: { item: MentorCircle }) => (
    <TouchableOpacity
      style={styles.myCircleCard}
      onPress={() => openCircleDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.myCircleHeader}>
        <Image
          source={{ uri: item.coverImageUrl || 'https://via.placeholder.com/60' }}
          style={styles.myCircleImage}
        />
        <View style={styles.myCircleInfo}>
          <Text style={styles.myCircleName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.myCircleHost}>with {item.host.name}</Text>
        </View>
      </View>
      
      {item.nextSession && (
        <View style={styles.nextSessionRow}>
          <Ionicons name="time-outline" size={14} color={colors.primary} />
          <Text style={styles.nextSessionText}>
            Next: {formatDate(item.nextSession.scheduledAt)}
          </Text>
        </View>
      )}
      
      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(item.totalSessions > 0 ? 50 : 0)}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{item.totalSessions} sessions</Text>
      </View>
    </TouchableOpacity>
  );
  
  // Render upcoming session card
  const renderSessionCard = ({ item }: { item: CircleSession }) => {
    const sessionDate = new Date(item.scheduledAt);
    const isToday = sessionDate.toDateString() === new Date().toDateString();
    
    return (
      <TouchableOpacity
        style={[styles.sessionCard, isToday && styles.sessionCardToday]}
        onPress={() => {
          if (item.meetingUrl) {
            // Open meeting URL
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.sessionDateBadge}>
          <Text style={styles.sessionDateDay}>
            {sessionDate.toLocaleDateString('en-AU', { weekday: 'short' })}
          </Text>
          <Text style={styles.sessionDateNum}>{sessionDate.getDate()}</Text>
        </View>
        
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>{item.title}</Text>
          <Text style={styles.sessionTime}>
            {sessionDate.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
            {' • '}{item.duration} min
          </Text>
          {item.description && (
            <Text style={styles.sessionDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
        
        {item.status === 'in_progress' && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        
        {isToday && item.status === 'upcoming' && (
          <TouchableOpacity 
            style={styles.joinSessionButton}
            onPress={() => {
              if (item.meetingUrl) {
                // Open meeting
              }
            }}
          >
            <Text style={styles.joinSessionButtonText}>Join</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };
  
  // Render header based on tab
  const renderHeader = () => (
    <View>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search mentor circles..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['discover', 'my_circles', 'upcoming'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons 
              name={
                tab === 'discover' ? 'compass' : 
                tab === 'my_circles' ? 'people-circle' : 
                'calendar'
              } 
              size={16} 
              color={activeTab === tab ? colors.white : colors.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'my_circles' ? 'My Circles' : 
               tab === 'upcoming' ? 'Upcoming' :
               'Discover'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Topic filters (only for discover) */}
      {activeTab === 'discover' && renderTopicFilter()}
    </View>
  );
  
  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={
          activeTab === 'my_circles' ? 'people-circle-outline' :
          activeTab === 'upcoming' ? 'calendar-outline' :
          'compass-outline'
        } 
        size={64} 
        color={colors.textSecondary} 
      />
      <Text style={styles.emptyTitle}>
        {activeTab === 'my_circles' ? 'No circles joined' :
         activeTab === 'upcoming' ? 'No upcoming sessions' :
         'No circles found'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'my_circles' 
          ? 'Join mentor circles to learn and grow with others'
          : activeTab === 'upcoming'
          ? 'Your scheduled sessions will appear here'
          : 'Try adjusting your filters or search'}
      </Text>
    </View>
  );
  
  // Get data for current tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'my_circles': return myCircles;
      case 'upcoming': return upcomingSessions;
      default: return circles;
    }
  };
  
  // Get render item for current tab
  const getRenderItem = () => {
    switch (activeTab) {
      case 'my_circles': return renderMyCircleCard;
      case 'upcoming': return renderSessionCard;
      default: return renderCircleCard;
    }
  };
  
  // Detail modal
  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDetailModal(false)}
    >
      <View style={styles.modalContainer}>
        {/* Modal header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowDetailModal(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Circle Details</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {selectedCircle && (
          <ScrollView style={styles.modalContent}>
            {/* Cover image */}
            {selectedCircle.coverImageUrl && (
              <Image
                source={{ uri: selectedCircle.coverImageUrl }}
                style={styles.detailCoverImage}
              />
            )}
            
            <View style={styles.detailContent}>
              {/* Status and price */}
              <View style={styles.detailBadgeRow}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedCircle.status) }]}>
                  <Text style={styles.statusText}>{selectedCircle.status.toUpperCase()}</Text>
                </View>
                {selectedCircle.isFree ? (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeText}>FREE</Text>
                  </View>
                ) : (
                  <Text style={styles.priceText}>
                    {selectedCircle.currency || '$'}{selectedCircle.price}
                  </Text>
                )}
              </View>
              
              <Text style={styles.detailName}>{selectedCircle.name}</Text>
              <Text style={styles.detailDescription}>{selectedCircle.description}</Text>
              
              {/* Host */}
              <View style={styles.detailHostCard}>
                <Image
                  source={{ uri: selectedCircle.host.avatar || 'https://via.placeholder.com/60' }}
                  style={styles.detailHostAvatar}
                />
                <View style={styles.detailHostInfo}>
                  <Text style={styles.detailHostName}>{selectedCircle.host.name}</Text>
                  <Text style={styles.detailHostTitle}>{selectedCircle.host.title}</Text>
                  <View style={styles.hostExpertise}>
                    {selectedCircle.host.expertise?.slice(0, 3).map((skill, idx) => (
                      <View key={idx} style={styles.expertiseTag}>
                        <Text style={styles.expertiseTagText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
              
              {/* Schedule */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Schedule</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.detailRowText}>{formatSchedule(selectedCircle)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.detailRowText}>
                    {selectedCircle.totalSessions} sessions • {selectedCircle.schedule.duration} min each
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="globe-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.detailRowText}>{selectedCircle.timezone}</Text>
                </View>
              </View>
              
              {/* Participants */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Participants</Text>
                <View style={styles.participantsBar}>
                  <View 
                    style={[
                      styles.participantsFill, 
                      { width: `${(selectedCircle.currentParticipants / selectedCircle.maxParticipants) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.participantsText}>
                  {selectedCircle.currentParticipants} / {selectedCircle.maxParticipants} participants
                  {selectedCircle.waitlistCount > 0 && ` (${selectedCircle.waitlistCount} on waitlist)`}
                </Text>
              </View>
              
              {/* Topics */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Topics Covered</Text>
                <View style={styles.topicsGrid}>
                  {selectedCircle.topics.map((topic, idx) => (
                    <View key={idx} style={styles.topicTag}>
                      <Text style={styles.topicTagText}>{topic}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              {/* Outcomes */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>What You'll Learn</Text>
                {selectedCircle.outcomes.map((outcome, idx) => (
                  <View key={idx} style={styles.outcomeRow}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={styles.outcomeText}>{outcome}</Text>
                  </View>
                ))}
              </View>
              
              {/* Target audience */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Who Should Join</Text>
                <Text style={styles.audienceText}>{selectedCircle.targetAudience}</Text>
              </View>
              
              {/* Join button */}
              <TouchableOpacity
                style={[
                  styles.detailJoinButton,
                  selectedCircle.isJoined && styles.joinedButton,
                  selectedCircle.isWaitlisted && styles.waitlistedButton,
                ]}
                onPress={() => handleJoinCircle(selectedCircle)}
                disabled={isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.detailJoinButtonText}>
                    {selectedCircle.isJoined ? 'Leave Circle' : 
                     selectedCircle.isWaitlisted ? 'Leave Waitlist' : 
                     selectedCircle.currentParticipants >= selectedCircle.maxParticipants ? 'Join Waitlist' : 
                     'Join This Circle'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
  
  return (
    <View style={styles.container}>
      <FlatList
        data={getCurrentData() as any[]}
        keyExtractor={(item) => item.id}
        renderItem={getRenderItem() as any}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      
      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 100,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  
  // Topics
  topicsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topicChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  topicChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  topicChipTextActive: {
    color: colors.white,
  },
  
  // Circle card
  circleCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.small,
  },
  circleImage: {
    width: '100%',
    height: 150,
  },
  circleContent: {
    padding: spacing.md,
  },
  circleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
    fontSize: 10,
  },
  freeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.success,
  },
  freeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
    fontSize: 10,
  },
  priceText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  circleName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  circleDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  hostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
  },
  hostTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  topicTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  topicTagText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 11,
  },
  moreTopics: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  circleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  spotsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotsText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  spotsTextFull: {
    color: colors.error,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ratingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  joinedButton: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  waitlistedButton: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  joinButtonText: {
    ...typography.body,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  joinedButtonText: {
    color: colors.white,
  },
  
  // My circle card
  myCircleCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.small,
  },
  myCircleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  myCircleImage: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  myCircleInfo: {
    flex: 1,
  },
  myCircleName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  myCircleHost: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  nextSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  nextSessionText: {
    ...typography.caption,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  
  // Session card
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.small,
  },
  sessionCardToday: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  sessionDateBadge: {
    width: 50,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sessionDateDay: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  sessionDateNum: {
    ...typography.h2,
    color: colors.text,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  sessionTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sessionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
    marginRight: 4,
  },
  liveText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    fontSize: 10,
  },
  joinSessionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  joinSessionButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  // Loading
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
  },
  
  // Detail view
  detailCoverImage: {
    width: '100%',
    height: 200,
  },
  detailContent: {
    padding: spacing.md,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  detailHostCard: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  detailHostAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: spacing.md,
  },
  detailHostInfo: {
    flex: 1,
  },
  detailHostName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  detailHostTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  hostExpertise: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  expertiseTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: spacing.xs,
    marginTop: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  expertiseTagText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 10,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailSectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detailRowText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  participantsBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  participantsFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  participantsText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  outcomeText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  audienceText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailJoinButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  detailJoinButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
});

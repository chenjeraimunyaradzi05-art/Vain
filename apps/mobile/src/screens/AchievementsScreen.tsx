/**
 * Achievements Screen
 * 
 * Displays user's achievements, progress, level, and leaderboard.
 * Gamification hub for the Ngurra Pathways mobile app.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Image,
  Animated,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface Achievement {
  code: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  isSecret: boolean;
  earned?: boolean;
  earnedAt?: Date;
  progress?: number;
}

interface UserLevel {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  benefits: string[];
  icon: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  points: number;
  level: number;
  achievementCount: number;
}

interface GamificationProfile {
  points: number;
  level: UserLevel;
  achievements: Achievement[];
  rank: number;
  streak: { current: number; longest: number };
  nextLevelProgress: number;
}

// Theme colors
const COLORS = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceLight: '#334155',
  primary: '#22c55e',
  primaryDark: '#16a34a',
  secondary: '#3b82f6',
  gold: '#fbbf24',
  silver: '#94a3b8',
  bronze: '#d97706',
  platinum: '#a855f7',
  diamond: '#22d3ee',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  border: '#334155',
  streak: '#ef4444',
};

// Tier colors
const TIER_COLORS = {
  BRONZE: { bg: '#78350f', text: '#fbbf24', border: '#d97706' },
  SILVER: { bg: '#475569', text: '#f1f5f9', border: '#94a3b8' },
  GOLD: { bg: '#713f12', text: '#fef08a', border: '#fbbf24' },
  PLATINUM: { bg: '#581c87', text: '#e879f9', border: '#a855f7' },
  DIAMOND: { bg: '#164e63', text: '#67e8f9', border: '#22d3ee' },
};

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  PROFILE: 'person',
  CAREER: 'briefcase',
  MENTORSHIP: 'people',
  COMMUNITY: 'home',
  CULTURAL: 'earth',
  LEARNING: 'book',
  NETWORKING: 'git-network',
  VOLUNTEER: 'heart',
  ENGAGEMENT: 'flame',
};

export default function AchievementsScreen() {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [levels, setLevels] = useState<UserLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'progress' | 'achievements' | 'leaderboard'>('progress');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [achievementFilter, setAchievementFilter] = useState<string>('all');

  // Animation values
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const pointsAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (profile) {
      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: profile.nextLevelProgress / 100,
        duration: 1000,
        useNativeDriver: false,
      }).start();

      // Animate points counter
      Animated.timing(pointsAnim, {
        toValue: profile.points,
        duration: 1500,
        useNativeDriver: false,
      }).start();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileRes, achievementsRes, leaderboardRes, levelsRes] = await Promise.all([
        api.get('/gamification/profile'),
        api.get('/gamification/achievements'),
        api.get('/gamification/leaderboard?limit=50'),
        api.get('/gamification/levels'),
      ]);

      setProfile(profileRes.data.data);
      setAllAchievements(achievementsRes.data.data.achievements || []);
      setLeaderboard(leaderboardRes.data.data.leaderboard || []);
      setLevels(levelsRes.data.data || []);
    } catch (error) {
      console.error('Failed to load gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const getFilteredAchievements = () => {
    if (achievementFilter === 'all') return allAchievements;
    if (achievementFilter === 'earned') return allAchievements.filter(a => a.earned);
    if (achievementFilter === 'locked') return allAchievements.filter(a => !a.earned);
    return allAchievements.filter(a => a.category === achievementFilter);
  };

  const categories = ['all', 'earned', 'locked', ...Object.keys(CATEGORY_ICONS)];

  const renderProgressTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Level Card */}
      <View style={styles.levelCard}>
        <LinearGradient
          colors={['#1e293b', '#334155']}
          style={styles.levelGradient}
        >
          <View style={styles.levelHeader}>
            <Text style={styles.levelIcon}>{profile?.level.icon}</Text>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>Level {profile?.level.level}</Text>
              <Text style={styles.levelName}>{profile?.level.name}</Text>
            </View>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{profile?.rank || '-'}</Text>
              <Text style={styles.rankLabel}>Rank</Text>
            </View>
          </View>

          {/* Points */}
          <View style={styles.pointsContainer}>
            <Animated.Text style={styles.pointsValue}>
              {Math.floor(profile?.points || 0).toLocaleString()}
            </Animated.Text>
            <Text style={styles.pointsLabel}>Total Points</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(profile?.nextLevelProgress || 0)}% to next level
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Streak Card */}
      <View style={styles.streakCard}>
        <View style={styles.streakIcon}>
          <Ionicons name="flame" size={32} color={COLORS.streak} />
        </View>
        <View style={styles.streakInfo}>
          <Text style={styles.streakValue}>{profile?.streak.current || 0} days</Text>
          <Text style={styles.streakLabel}>Current Streak</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakInfo}>
          <Text style={styles.streakValueSmall}>{profile?.streak.longest || 0} days</Text>
          <Text style={styles.streakLabel}>Longest Streak</Text>
        </View>
      </View>

      {/* Recent Achievements */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Achievements</Text>
        <TouchableOpacity onPress={() => setActiveTab('achievements')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
        {allAchievements
          .filter(a => a.earned)
          .slice(0, 5)
          .map((achievement) => (
            <TouchableOpacity
              key={achievement.code}
              style={[
                styles.achievementCard,
                { borderColor: TIER_COLORS[achievement.tier].border },
              ]}
              onPress={() => setSelectedAchievement(achievement)}
            >
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              <Text style={styles.achievementName} numberOfLines={1}>
                {achievement.name}
              </Text>
              <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[achievement.tier].bg }]}>
                <Text style={[styles.tierText, { color: TIER_COLORS[achievement.tier].text }]}>
                  {achievement.tier}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        {allAchievements.filter(a => a.earned).length === 0 && (
          <View style={styles.emptyAchievements}>
            <Ionicons name="trophy-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No achievements yet</Text>
            <Text style={styles.emptySubtext}>Complete tasks to earn badges!</Text>
          </View>
        )}
      </ScrollView>

      {/* Level Benefits */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Benefits</Text>
      </View>
      <View style={styles.benefitsCard}>
        {profile?.level.benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      {/* Level Journey */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Level Journey</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelsScroll}>
        {levels.map((lvl) => (
          <View
            key={lvl.level}
            style={[
              styles.levelMilestone,
              lvl.level === profile?.level.level && styles.currentLevel,
              lvl.level < (profile?.level.level || 0) && styles.completedLevel,
            ]}
          >
            <Text style={styles.levelMilestoneIcon}>{lvl.icon}</Text>
            <Text style={styles.levelMilestoneNum}>Lvl {lvl.level}</Text>
            <Text style={styles.levelMilestoneName} numberOfLines={1}>{lvl.name}</Text>
            <Text style={styles.levelMilestonePoints}>
              {lvl.minPoints.toLocaleString()} pts
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderAchievementsTab = () => (
    <View style={styles.tabContent}>
      {/* Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterPill,
              achievementFilter === category && styles.filterPillActive,
            ]}
            onPress={() => setAchievementFilter(category)}
          >
            {category !== 'all' && category !== 'earned' && category !== 'locked' && (
              <Ionicons
                name={(CATEGORY_ICONS[category] || 'star') as any}
                size={14}
                color={achievementFilter === category ? '#fff' : COLORS.textMuted}
                style={{ marginRight: 4 }}
              />
            )}
            <Text
              style={[
                styles.filterPillText,
                achievementFilter === category && styles.filterPillTextActive,
              ]}
            >
              {category === 'all' ? 'All' : 
               category === 'earned' ? '🏆 Earned' :
               category === 'locked' ? '🔒 Locked' :
               category.charAt(0) + category.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Achievements Grid */}
      <FlatList
        data={getFilteredAchievements()}
        numColumns={2}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.achievementsGrid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.achievementGridItem,
              !item.earned && styles.achievementLocked,
              { borderColor: item.earned ? TIER_COLORS[item.tier].border : COLORS.border },
            ]}
            onPress={() => setSelectedAchievement(item)}
          >
            <Text style={[styles.achievementGridIcon, !item.earned && styles.iconLocked]}>
              {item.isSecret && !item.earned ? '❓' : item.icon}
            </Text>
            <Text style={[styles.achievementGridName, !item.earned && styles.textLocked]} numberOfLines={2}>
              {item.isSecret && !item.earned ? 'Secret Achievement' : item.name}
            </Text>
            {item.earned && (
              <View style={[styles.tierBadgeSmall, { backgroundColor: TIER_COLORS[item.tier].bg }]}>
                <Text style={[styles.tierTextSmall, { color: TIER_COLORS[item.tier].text }]}>
                  {item.tier}
                </Text>
              </View>
            )}
            {!item.earned && (
              <View style={styles.lockedOverlay}>
                <Ionicons name="lock-closed" size={16} color={COLORS.textMuted} />
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderLeaderboardTab = () => (
    <View style={styles.tabContent}>
      {/* User's Position Banner */}
      {profile && (
        <View style={styles.userPositionBanner}>
          <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.userPositionGradient}>
            <Text style={styles.userPositionText}>Your Rank</Text>
            <Text style={styles.userPositionRank}>#{profile.rank}</Text>
            <Text style={styles.userPositionPoints}>{profile.points.toLocaleString()} points</Text>
          </LinearGradient>
        </View>
      )}

      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.leaderboardList}
        renderItem={({ item }) => (
          <View style={[
            styles.leaderboardItem,
            item.rank <= 3 && styles.leaderboardTopItem,
          ]}>
            {/* Rank */}
            <View style={[
              styles.leaderboardRank,
              item.rank === 1 && styles.rankGold,
              item.rank === 2 && styles.rankSilver,
              item.rank === 3 && styles.rankBronze,
            ]}>
              {item.rank <= 3 ? (
                <Text style={styles.rankEmoji}>
                  {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}
                </Text>
              ) : (
                <Text style={styles.leaderboardRankText}>{item.rank}</Text>
              )}
            </View>

            {/* User Info */}
            <View style={styles.leaderboardUser}>
              {item.userAvatar ? (
                <Image source={{ uri: item.userAvatar }} style={styles.leaderboardAvatar} />
              ) : (
                <View style={styles.leaderboardAvatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {item.userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.leaderboardUserInfo}>
                <Text style={styles.leaderboardUserName}>{item.userName}</Text>
                <View style={styles.leaderboardMeta}>
                  <Text style={styles.leaderboardLevel}>Lvl {item.level}</Text>
                  <Text style={styles.leaderboardDot}>•</Text>
                  <Text style={styles.leaderboardAchievements}>
                    🏆 {item.achievementCount}
                  </Text>
                </View>
              </View>
            </View>

            {/* Points */}
            <View style={styles.leaderboardPoints}>
              <Text style={styles.leaderboardPointsValue}>
                {item.points.toLocaleString()}
              </Text>
              <Text style={styles.leaderboardPointsLabel}>pts</Text>
            </View>
          </View>
        )}
      />
    </View>
  );

  // Achievement Detail Modal
  const renderAchievementModal = () => (
    <Modal
      visible={!!selectedAchievement}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedAchievement(null)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setSelectedAchievement(null)}
      >
        <View style={styles.modalContent}>
          {selectedAchievement && (
            <>
              <View style={[
                styles.modalHeader,
                { borderBottomColor: TIER_COLORS[selectedAchievement.tier].border },
              ]}>
                <Text style={styles.modalIcon}>{selectedAchievement.icon}</Text>
                <Text style={styles.modalTitle}>{selectedAchievement.name}</Text>
                <View style={[
                  styles.modalTier,
                  { backgroundColor: TIER_COLORS[selectedAchievement.tier].bg },
                ]}>
                  <Text style={[
                    styles.modalTierText,
                    { color: TIER_COLORS[selectedAchievement.tier].text },
                  ]}>
                    {selectedAchievement.tier}
                  </Text>
                </View>
              </View>

              <Text style={styles.modalDescription}>
                {selectedAchievement.isSecret && !selectedAchievement.earned
                  ? 'Complete hidden objectives to unlock this secret achievement!'
                  : selectedAchievement.description}
              </Text>

              <View style={styles.modalMeta}>
                <View style={styles.modalMetaItem}>
                  <Ionicons
                    name={(CATEGORY_ICONS[selectedAchievement.category] || 'star') as any}
                    size={20}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.modalMetaText}>
                    {selectedAchievement.category.charAt(0) + 
                     selectedAchievement.category.slice(1).toLowerCase()}
                  </Text>
                </View>

                {selectedAchievement.earned ? (
                  <View style={styles.modalEarned}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    <Text style={styles.modalEarnedText}>Earned</Text>
                  </View>
                ) : (
                  <View style={styles.modalLocked}>
                    <Ionicons name="lock-closed" size={20} color={COLORS.textMuted} />
                    <Text style={styles.modalLockedText}>Locked</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedAchievement(null)}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Achievements</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="settings-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['progress', 'achievements', 'leaderboard'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={
                tab === 'progress' ? 'trending-up' :
                tab === 'achievements' ? 'trophy' : 'podium'
              }
              size={20}
              color={activeTab === tab ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'progress' && renderProgressTab()}
        {activeTab === 'achievements' && renderAchievementsTab()}
        {activeTab === 'leaderboard' && renderLeaderboardTab()}
      </View>

      {renderAchievementModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerBtn: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },

  // Level Card
  levelCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  levelGradient: {
    padding: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelIcon: {
    fontSize: 48,
    marginRight: 12,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  levelName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  rankBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  rankLabel: {
    fontSize: 10,
    color: COLORS.primary,
    opacity: 0.8,
  },
  pointsContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  pointsValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  pointsLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },

  // Streak Card
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.streak,
  },
  streakIcon: {
    marginRight: 12,
  },
  streakInfo: {
    flex: 1,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  streakValueSmall: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  streakLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
  },

  // Achievements Scroll
  achievementsScroll: {
    paddingLeft: 16,
  },
  achievementCard: {
    width: 120,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyAchievements: {
    width: SCREEN_WIDTH - 48,
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // Benefits
  benefitsCard: {
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
  },

  // Levels Journey
  levelsScroll: {
    paddingLeft: 16,
    marginBottom: 16,
  },
  levelMilestone: {
    width: 80,
    alignItems: 'center',
    padding: 12,
    marginRight: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    opacity: 0.5,
  },
  currentLevel: {
    opacity: 1,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  completedLevel: {
    opacity: 0.8,
  },
  levelMilestoneIcon: {
    fontSize: 24,
  },
  levelMilestoneNum: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  levelMilestoneName: {
    fontSize: 10,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 2,
  },
  levelMilestonePoints: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Filters
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  filterPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Achievements Grid
  achievementsGrid: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  achievementGridItem: {
    flex: 1,
    margin: 4,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 120,
  },
  achievementLocked: {
    opacity: 0.6,
  },
  achievementGridIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  iconLocked: {
    opacity: 0.5,
  },
  achievementGridName: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
    flex: 1,
  },
  textLocked: {
    color: COLORS.textMuted,
  },
  tierBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  tierTextSmall: {
    fontSize: 8,
    fontWeight: '600',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Leaderboard
  userPositionBanner: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  userPositionGradient: {
    padding: 16,
    alignItems: 'center',
  },
  userPositionText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  userPositionRank: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userPositionPoints: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  leaderboardList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 8,
  },
  leaderboardTopItem: {
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
  },
  leaderboardRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankGold: {
    backgroundColor: COLORS.gold + '20',
  },
  rankSilver: {
    backgroundColor: COLORS.silver + '20',
  },
  rankBronze: {
    backgroundColor: COLORS.bronze + '20',
  },
  rankEmoji: {
    fontSize: 20,
  },
  leaderboardRankText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  leaderboardUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  leaderboardAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  leaderboardUserInfo: {
    flex: 1,
  },
  leaderboardUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  leaderboardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  leaderboardLevel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  leaderboardDot: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginHorizontal: 4,
  },
  leaderboardAchievements: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  leaderboardPoints: {
    alignItems: 'flex-end',
  },
  leaderboardPointsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  leaderboardPointsLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH - 48,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 16,
    marginBottom: 16,
  },
  modalIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalTier: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalTierText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalMetaText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  modalEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalEarnedText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalLockedText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  modalCloseBtn: {
    marginTop: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

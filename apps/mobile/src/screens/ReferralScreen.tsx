/**
 * Referral Screen
 * 
 * Allows users to share their referral code and track referrals.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Share,
  Clipboard,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  hiredReferrals: number;
  totalPointsEarned: number;
  conversionRate: number;
  rank: number;
}

interface Referral {
  id: string;
  referredUser: {
    id: string;
    name: string;
    avatarUrl?: string;
    createdAt: string;
  };
  status: 'PENDING' | 'ACTIVE' | 'HIRED' | 'EXPIRED' | 'INVALID';
  createdAt: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  referralCount: number;
  hiredCount: number;
  pointsEarned: number;
}

interface ShareMessage {
  platform: string;
  message: string;
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
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  border: '#334155',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

// Status colors and labels
const STATUS_CONFIG = {
  PENDING: { color: '#f59e0b', label: 'Pending', icon: 'time' },
  ACTIVE: { color: '#22c55e', label: 'Active', icon: 'checkmark-circle' },
  HIRED: { color: '#a855f7', label: 'Hired! 🎉', icon: 'trophy' },
  EXPIRED: { color: '#64748b', label: 'Expired', icon: 'close-circle' },
  INVALID: { color: '#ef4444', label: 'Invalid', icon: 'alert-circle' },
};

// Milestones
const MILESTONES = [
  { count: 5, bonus: 100, name: 'Networker', icon: '🌱' },
  { count: 10, bonus: 250, name: 'Connector', icon: '🌿' },
  { count: 25, bonus: 500, name: 'Ambassador', icon: '🌳' },
  { count: 50, bonus: 1000, name: 'Champion', icon: '⭐' },
  { count: 100, bonus: 2500, name: 'Legend', icon: '👑' },
];

export default function ReferralScreen() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareMessages, setShareMessages] = useState<ShareMessage[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'share' | 'referrals' | 'leaderboard'>('share');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [codeRes, statsRes, referralsRes, leaderboardRes] = await Promise.all([
        api.get('/referrals/code'),
        api.get('/referrals/stats'),
        api.get('/referrals/mine'),
        api.get('/referrals/leaderboard?limit=30'),
      ]);

      setReferralCode(codeRes.data.data.code);
      setShareUrl(codeRes.data.data.shareUrl);
      setShareMessages(codeRes.data.data.shareMessages || []);
      setStats(statsRes.data.data);
      setReferrals(referralsRes.data.data.referrals || []);
      setLeaderboard(leaderboardRes.data.data || []);
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const copyCode = async () => {
    if (referralCode) {
      await Clipboard.setString(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareCode = async () => {
    if (!shareUrl || !referralCode) return;

    try {
      await Share.share({
        message: `Join Ngurra Pathways - Australia's Indigenous professional network! Use my referral code: ${referralCode}\n\n${shareUrl}`,
        title: 'Join Ngurra Pathways',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const shareOnPlatform = async (platform: string) => {
    const message = shareMessages.find(m => m.platform === platform);
    if (!message) return;

    try {
      await Share.share({
        message: message.message,
        title: 'Join Ngurra Pathways',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const getNextMilestone = () => {
    const successfulCount = stats?.successfulReferrals || 0;
    return MILESTONES.find(m => m.count > successfulCount);
  };

  const renderShareTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Referral Code Card */}
      <View style={styles.codeCard}>
        <LinearGradient
          colors={['#16a34a', '#22c55e', '#4ade80']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.codeGradient}
        >
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <Text style={styles.codeValue}>{referralCode || '------'}</Text>
          
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color="#fff" />
              <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
              <Ionicons name="share-social" size={20} color="#16a34a" />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.successfulReferrals || 0}</Text>
          <Text style={styles.statLabel}>Successful</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.pendingReferrals || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.gold }]}>
            {stats?.hiredReferrals || 0}
          </Text>
          <Text style={styles.statLabel}>Got Hired!</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>
            {stats?.totalPointsEarned || 0}
          </Text>
          <Text style={styles.statLabel}>Points Earned</Text>
        </View>
      </View>

      {/* How It Works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.howItWorks}>
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Ionicons name="share-social" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Share Your Code</Text>
              <Text style={styles.stepDesc}>Share your unique code with friends</Text>
            </View>
            <View style={styles.stepReward}>
              <Text style={styles.stepRewardText}>+25 pts</Text>
            </View>
          </View>
          
          <View style={styles.stepConnector} />
          
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Ionicons name="person-add" size={24} color={COLORS.secondary} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>They Sign Up</Text>
              <Text style={styles.stepDesc}>Friend creates their account</Text>
            </View>
            <View style={styles.stepReward}>
              <Text style={styles.stepRewardText}>+50 pts</Text>
            </View>
          </View>
          
          <View style={styles.stepConnector} />
          
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Ionicons name="trophy" size={24} color={COLORS.gold} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>They Get Hired</Text>
              <Text style={styles.stepDesc}>When they land a job</Text>
            </View>
            <View style={styles.stepReward}>
              <Text style={[styles.stepRewardText, { color: COLORS.gold }]}>+500 pts</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Next Milestone */}
      {getNextMilestone() && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Milestone</Text>
          <View style={styles.milestoneCard}>
            <Text style={styles.milestoneIcon}>{getNextMilestone()!.icon}</Text>
            <View style={styles.milestoneInfo}>
              <Text style={styles.milestoneName}>{getNextMilestone()!.name}</Text>
              <Text style={styles.milestoneProgress}>
                {stats?.successfulReferrals || 0} / {getNextMilestone()!.count} referrals
              </Text>
              <View style={styles.milestoneBar}>
                <View 
                  style={[
                    styles.milestoneBarFill, 
                    { width: `${((stats?.successfulReferrals || 0) / getNextMilestone()!.count) * 100}%` }
                  ]} 
                />
              </View>
            </View>
            <View style={styles.milestoneReward}>
              <Text style={styles.milestoneRewardText}>+{getNextMilestone()!.bonus}</Text>
              <Text style={styles.milestoneRewardLabel}>bonus</Text>
            </View>
          </View>
        </View>
      )}

      {/* Share Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Share On</Text>
        <View style={styles.shareButtons}>
          <TouchableOpacity 
            style={[styles.platformBtn, { backgroundColor: '#1DA1F2' }]}
            onPress={() => shareOnPlatform('twitter')}
          >
            <Ionicons name="logo-twitter" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.platformBtn, { backgroundColor: '#4267B2' }]}
            onPress={() => shareOnPlatform('facebook')}
          >
            <Ionicons name="logo-facebook" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.platformBtn, { backgroundColor: '#0A66C2' }]}
            onPress={() => shareOnPlatform('linkedin')}
          >
            <Ionicons name="logo-linkedin" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.platformBtn, { backgroundColor: COLORS.surfaceLight }]}
            onPress={() => shareOnPlatform('email')}
          >
            <Ionicons name="mail" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.platformBtn, { backgroundColor: '#25D366' }]}
            onPress={() => shareOnPlatform('sms')}
          >
            <Ionicons name="chatbubble" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderReferralsTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={referrals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.referralsList}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No referrals yet</Text>
            <Text style={styles.emptyDesc}>
              Share your code with friends to start earning rewards!
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={shareCode}>
              <Text style={styles.emptyBtnText}>Share Your Code</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.referralItem}>
            {item.referredUser.avatarUrl ? (
              <Image source={{ uri: item.referredUser.avatarUrl }} style={styles.referralAvatar} />
            ) : (
              <View style={styles.referralAvatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {item.referredUser.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            
            <View style={styles.referralInfo}>
              <Text style={styles.referralName}>{item.referredUser.name || 'Anonymous'}</Text>
              <Text style={styles.referralDate}>
                Joined {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={[
              styles.statusBadge,
              { backgroundColor: STATUS_CONFIG[item.status].color + '20' }
            ]}>
              <Ionicons 
                name={STATUS_CONFIG[item.status].icon as any} 
                size={14} 
                color={STATUS_CONFIG[item.status].color} 
              />
              <Text style={[styles.statusText, { color: STATUS_CONFIG[item.status].color }]}>
                {STATUS_CONFIG[item.status].label}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );

  const renderLeaderboardTab = () => (
    <View style={styles.tabContent}>
      {/* User Position Banner */}
      {stats && (
        <View style={styles.userRankBanner}>
          <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.userRankGradient}>
            <Text style={styles.userRankLabel}>Your Rank</Text>
            <Text style={styles.userRankValue}>#{stats.rank}</Text>
            <Text style={styles.userRankReferrals}>
              {stats.successfulReferrals} successful referrals
            </Text>
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
                <Text style={styles.leaderboardMeta}>
                  🎉 {item.hiredCount} hired • {item.pointsEarned.toLocaleString()} pts
                </Text>
              </View>
            </View>

            {/* Referrals Count */}
            <View style={styles.leaderboardCount}>
              <Text style={styles.leaderboardCountValue}>{item.referralCount}</Text>
              <Text style={styles.leaderboardCountLabel}>referrals</Text>
            </View>
          </View>
        )}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading referral info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Referrals</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="help-circle-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['share', 'referrals', 'leaderboard'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={
                tab === 'share' ? 'share-social' :
                tab === 'referrals' ? 'people' : 'podium'
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
      {activeTab === 'share' && renderShareTab()}
      {activeTab === 'referrals' && renderReferralsTab()}
      {activeTab === 'leaderboard' && renderLeaderboardTab()}
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
  tabContent: {
    flex: 1,
  },

  // Code Card
  codeCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  codeGradient: {
    padding: 24,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  codeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
    marginTop: 8,
  },
  codeActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    gap: 6,
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    gap: 6,
  },
  shareBtnText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  statCard: {
    width: '50%',
    padding: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },

  // How It Works
  howItWorks: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
    marginLeft: 12,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  stepDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stepReward: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.primary + '20',
    borderRadius: 4,
  },
  stepRewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  stepConnector: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.surfaceLight,
    marginLeft: 23,
    marginVertical: 4,
  },

  // Milestone
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  milestoneIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  milestoneProgress: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  milestoneBar: {
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  milestoneBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  milestoneReward: {
    alignItems: 'center',
    marginLeft: 12,
  },
  milestoneRewardText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  milestoneRewardLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },

  // Share Buttons
  shareButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  platformBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Referrals List
  referralsList: {
    padding: 16,
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  referralAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  referralAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  referralInfo: {
    flex: 1,
    marginLeft: 12,
  },
  referralName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  referralDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Leaderboard
  userRankBanner: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  userRankGradient: {
    padding: 16,
    alignItems: 'center',
  },
  userRankLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  userRankValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userRankReferrals: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  leaderboardList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
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
    backgroundColor: '#94a3b8' + '20',
  },
  rankBronze: {
    backgroundColor: '#d97706' + '20',
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
  leaderboardUserInfo: {
    flex: 1,
  },
  leaderboardUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  leaderboardMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  leaderboardCount: {
    alignItems: 'flex-end',
  },
  leaderboardCountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  leaderboardCountLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
});

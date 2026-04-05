/**
 * ConnectionsScreen.tsx - Connections Management Screen
 * 
 * Features:
 * - View all connections with tabs (Connections, Followers, Following, Pending)
 * - Send/accept/reject connection requests
 * - Search connections
 * - View mutual connections
 * - Block/report users
 * - Pull-to-refresh
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../hooks/useSession';
import { connectionsApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Types
interface Connection {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  title?: string;
  location?: string;
  mutualConnections: number;
  status: 'accepted' | 'pending';
  isSender: boolean;
  createdAt: string;
  message?: string;
}

interface FollowRelation {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  title?: string;
  isFollowingBack?: boolean;
}

type TabType = 'connections' | 'followers' | 'following' | 'pending';

interface ConnectionsScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

// Tab configuration
const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'connections', label: 'Connections', icon: 'people' },
  { key: 'followers', label: 'Followers', icon: 'person-add' },
  { key: 'following', label: 'Following', icon: 'person' },
  { key: 'pending', label: 'Pending', icon: 'time' },
];

export default function ConnectionsScreen({ navigation }: ConnectionsScreenProps) {
  const { user } = useSession();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('connections');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [followers, setFollowers] = useState<FollowRelation[]>([]);
  const [following, setFollowing] = useState<FollowRelation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ received: Connection[]; sent: Connection[] }>({
    received: [],
    sent: [],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({
    connections: 0,
    followers: 0,
    following: 0,
    pending: 0,
  });
  
  // Load data on mount and tab change
  useEffect(() => {
    loadData();
  }, [activeTab]);
  
  // Load data based on active tab
  const loadData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      switch (activeTab) {
        case 'connections':
          const connsResult = await connectionsApi.getConnections();
          setConnections(connsResult.connections || []);
          setCounts(prev => ({ ...prev, connections: connsResult.total || 0 }));
          break;
          
        case 'followers':
          const followersResult = await connectionsApi.getFollowers();
          setFollowers(followersResult.followers || []);
          setCounts(prev => ({ ...prev, followers: followersResult.total || 0 }));
          break;
          
        case 'following':
          const followingResult = await connectionsApi.getFollowing();
          setFollowing(followingResult.following || []);
          setCounts(prev => ({ ...prev, following: followingResult.total || 0 }));
          break;
          
        case 'pending':
          const pendingResult = await connectionsApi.getPendingRequests();
          setPendingRequests({
            received: pendingResult.received || [],
            sent: pendingResult.sent || [],
          });
          setCounts(prev => ({ 
            ...prev, 
            pending: (pendingResult.received?.length || 0) + (pendingResult.sent?.length || 0) 
          }));
          break;
      }
    } catch (err) {
      console.error('Load connections error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Refresh handler
  const onRefresh = useCallback(() => {
    loadData(true);
  }, [activeTab]);
  
  // Accept connection request
  const handleAccept = async (connectionId: string) => {
    try {
      await connectionsApi.acceptRequest(connectionId);
      
      // Update state optimistically
      setPendingRequests(prev => ({
        ...prev,
        received: prev.received.filter(c => c.id !== connectionId),
      }));
      
      // Refresh connections list
      const connsResult = await connectionsApi.getConnections();
      setConnections(connsResult.connections || []);
      setCounts(prev => ({ 
        ...prev, 
        connections: connsResult.total || 0,
        pending: prev.pending - 1,
      }));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to accept request');
    }
  };
  
  // Reject connection request
  const handleReject = async (connectionId: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this connection request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await connectionsApi.rejectRequest(connectionId);
              setPendingRequests(prev => ({
                ...prev,
                received: prev.received.filter(c => c.id !== connectionId),
              }));
              setCounts(prev => ({ ...prev, pending: prev.pending - 1 }));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reject request');
            }
          },
        },
      ]
    );
  };
  
  // Cancel sent request
  const handleCancelRequest = async (connectionId: string) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this connection request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await connectionsApi.cancelRequest(connectionId);
              setPendingRequests(prev => ({
                ...prev,
                sent: prev.sent.filter(c => c.id !== connectionId),
              }));
              setCounts(prev => ({ ...prev, pending: prev.pending - 1 }));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel request');
            }
          },
        },
      ]
    );
  };
  
  // Remove connection
  const handleRemoveConnection = async (connectionId: string, name: string) => {
    Alert.alert(
      'Remove Connection',
      `Are you sure you want to remove ${name} from your connections?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await connectionsApi.removeConnection(connectionId);
              setConnections(prev => prev.filter(c => c.id !== connectionId));
              setCounts(prev => ({ ...prev, connections: prev.connections - 1 }));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove connection');
            }
          },
        },
      ]
    );
  };
  
  // Follow/Unfollow user
  const handleFollowToggle = async (userId: string, isFollowing: boolean) => {
    try {
      if (isFollowing) {
        await connectionsApi.unfollowUser(userId);
        setFollowing(prev => prev.filter(f => f.userId !== userId));
        setCounts(prev => ({ ...prev, following: prev.following - 1 }));
      } else {
        await connectionsApi.followUser(userId);
        loadData(true); // Refresh to get updated list
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update follow status');
    }
  };
  
  // Filter connections by search
  const getFilteredData = () => {
    const query = search.toLowerCase();
    
    switch (activeTab) {
      case 'connections':
        return connections.filter(c => 
          c.name?.toLowerCase().includes(query) ||
          c.title?.toLowerCase().includes(query)
        );
      case 'followers':
        return followers.filter(f => 
          f.name?.toLowerCase().includes(query) ||
          f.title?.toLowerCase().includes(query)
        );
      case 'following':
        return following.filter(f => 
          f.name?.toLowerCase().includes(query) ||
          f.title?.toLowerCase().includes(query)
        );
      case 'pending':
        return [
          ...pendingRequests.received.filter(c => 
            c.name?.toLowerCase().includes(query)
          ),
          ...pendingRequests.sent.filter(c => 
            c.name?.toLowerCase().includes(query)
          ),
        ];
      default:
        return [];
    }
  };
  
  // Render connection card
  const renderConnectionCard = ({ item }: { item: Connection }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Profile', { userId: item.userId })}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.name}'s profile`}
    >
      {/* Avatar */}
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
      )}
      
      {/* Info */}
      <View style={styles.cardContent}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {item.title && (
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        )}
        {item.mutualConnections > 0 && (
          <Text style={styles.mutualText}>
            {item.mutualConnections} mutual connection{item.mutualConnections > 1 ? 's' : ''}
          </Text>
        )}
      </View>
      
      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => navigation.navigate('Chat', { 
            userId: item.userId,
            userName: item.name 
          })}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleRemoveConnection(item.id, item.name)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  // Render follower card
  const renderFollowerCard = ({ item }: { item: FollowRelation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Profile', { userId: item.userId })}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
      )}
      
      <View style={styles.cardContent}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {item.title && (
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        )}
      </View>
      
      <TouchableOpacity
        style={[
          styles.followButton,
          item.isFollowingBack && styles.followingButton
        ]}
        onPress={() => handleFollowToggle(item.userId, item.isFollowingBack || false)}
      >
        <Text style={[
          styles.followButtonText,
          item.isFollowingBack && styles.followingButtonText
        ]}>
          {item.isFollowingBack ? 'Following' : 'Follow Back'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
  
  // Render following card
  const renderFollowingCard = ({ item }: { item: FollowRelation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Profile', { userId: item.userId })}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
      )}
      
      <View style={styles.cardContent}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {item.title && (
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.followingButton}
        onPress={() => handleFollowToggle(item.userId, true)}
      >
        <Text style={styles.followingButtonText}>Following</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
  
  // Render pending request card
  const renderPendingCard = ({ item }: { item: Connection }) => {
    const isReceived = !item.isSender;
    
    return (
      <View style={styles.card}>
        {/* Badge for received/sent */}
        <View style={[
          styles.requestBadge,
          isReceived ? styles.receivedBadge : styles.sentBadge
        ]}>
          <Text style={styles.requestBadgeText}>
            {isReceived ? 'Received' : 'Sent'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.cardRow}
          onPress={() => navigation.navigate('Profile', { userId: item.userId })}
        >
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
          )}
          
          <View style={styles.cardContent}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            {item.message && (
              <Text style={styles.messageText} numberOfLines={2}>"{item.message}"</Text>
            )}
            <Text style={styles.timeText}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Action buttons */}
        <View style={styles.pendingActions}>
          {isReceived ? (
            <>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAccept(item.id)}
              >
                <Ionicons name="checkmark" size={18} color="white" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleReject(item.id)}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelRequest(item.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
  
  // Format time ago helper
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };
  
  // Render correct card type based on tab
  const renderItem = useCallback((props: { item: any }) => {
    switch (activeTab) {
      case 'connections':
        return renderConnectionCard(props);
      case 'followers':
        return renderFollowerCard(props);
      case 'following':
        return renderFollowingCard(props);
      case 'pending':
        return renderPendingCard(props);
      default:
        return null;
    }
  }, [activeTab]);
  
  // Empty state
  const renderEmpty = () => {
    if (isLoading) return null;
    
    const emptyMessages = {
      connections: "You don't have any connections yet. Start connecting with others!",
      followers: "You don't have any followers yet.",
      following: "You're not following anyone yet.",
      pending: "No pending connection requests.",
    };
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons 
          name={activeTab === 'pending' ? 'hourglass-outline' : 'people-outline'} 
          size={64} 
          color={colors.textSecondary} 
        />
        <Text style={styles.emptyText}>{emptyMessages[activeTab]}</Text>
        {activeTab === 'connections' && (
          <TouchableOpacity
            style={styles.discoverButton}
            onPress={() => navigation.navigate('Discover')}
          >
            <Text style={styles.discoverButtonText}>Discover People</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search connections..."
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
      
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Ionicons 
              name={activeTab === tab.key ? tab.icon as any : `${tab.icon}-outline` as any} 
              size={20} 
              color={activeTab === tab.key ? colors.primary : colors.textSecondary} 
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
            {tab.key === 'pending' && counts.pending > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{counts.pending}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Count summary */}
      <View style={styles.countSummary}>
        <Text style={styles.countText}>
          {counts[activeTab]} {activeTab === 'pending' ? 'request' : activeTab}
          {counts[activeTab] !== 1 ? 's' : ''}
        </Text>
      </View>
      
      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={getFilteredData()}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            getFilteredData().length === 0 && styles.emptyList
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.text,
    ...typography.body,
  },
  
  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Count summary
  countSummary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  countText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  
  // List
  listContent: {
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  cardRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  cardContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontWeight: '600',
    color: colors.text,
    ...typography.body,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  mutualText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  messageText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  
  // Card actions
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageButton: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  moreButton: {
    padding: spacing.sm,
  },
  
  // Follow buttons
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  followButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  followingButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  followingButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  
  // Pending request
  requestBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  receivedBadge: {
    backgroundColor: `${colors.primary}20`,
  },
  sentBadge: {
    backgroundColor: `${colors.secondary}20`,
  },
  requestBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: spacing.xs,
  },
  rejectButton: {
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    textAlign: 'center',
    ...typography.body,
  },
  discoverButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  discoverButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

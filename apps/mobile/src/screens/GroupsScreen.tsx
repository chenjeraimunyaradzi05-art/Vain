/**
 * GroupsScreen.tsx - Community Groups Screen
 * 
 * Features:
 * - Browse and discover community groups
 * - Filter by type, category, women-only
 * - View joined groups vs discover new
 * - Create new groups
 * - Join/leave groups
 * - Search groups
 * - Featured groups section
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
import { groupsApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Types
interface Group {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  iconUrl?: string;
  groupType: string;
  category?: string;
  visibility: 'public' | 'private' | 'secret';
  membershipType: 'open' | 'approval' | 'invite';
  womenOnly: boolean;
  memberCount: number;
  postCount: number;
  isOfficial: boolean;
  isFeatured: boolean;
  isMember?: boolean;
  memberRole?: 'member' | 'moderator' | 'admin';
  memberStatus?: 'active' | 'pending';
}

type TabType = 'discover' | 'joined';

interface GroupsScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

// Group type configuration
const GROUP_TYPES = [
  { key: 'industry', label: 'Industry', icon: 'business-outline' },
  { key: 'role', label: 'Career Role', icon: 'briefcase-outline' },
  { key: 'life_stage', label: 'Life Stage', icon: 'people-outline' },
  { key: 'location', label: 'Location', icon: 'location-outline' },
  { key: 'interest', label: 'Interest', icon: 'heart-outline' },
];

export default function GroupsScreen({ navigation }: GroupsScreenProps) {
  const { user } = useSession();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [groups, setGroups] = useState<Group[]>([]);
  const [featuredGroups, setFeaturedGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [womenOnly, setWomenOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create group form state
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    groupType: 'interest',
    visibility: 'public' as 'public' | 'private',
    membershipType: 'open' as 'open' | 'approval',
    womenOnly: false,
    safetyMode: true,
  });
  const [isCreating, setIsCreating] = useState(false);
  
  // Load data on mount and filter change
  useEffect(() => {
    loadGroups();
  }, [activeTab, selectedType, womenOnly]);
  
  // Load featured on mount
  useEffect(() => {
    loadFeaturedGroups();
  }, []);
  
  // Load groups
  const loadGroups = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const params: any = {
        search: search || undefined,
        type: selectedType || undefined,
        womenOnly: womenOnly || undefined,
      };
      
      if (activeTab === 'joined') {
        const result = await groupsApi.getMyGroups(params);
        setGroups(result.groups || []);
      } else {
        const result = await groupsApi.getGroups(params);
        setGroups(result.groups || []);
      }
    } catch (err) {
      console.error('Load groups error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Load featured groups
  const loadFeaturedGroups = async () => {
    try {
      const result = await groupsApi.getGroups({ featured: true, limit: 5 });
      setFeaturedGroups(result.groups || []);
    } catch (err) {
      console.error('Load featured groups error:', err);
    }
  };
  
  // Refresh handler
  const onRefresh = useCallback(() => {
    loadGroups(true);
    loadFeaturedGroups();
  }, [activeTab, selectedType, womenOnly, search]);
  
  // Search handler with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== '') {
        loadGroups();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [search]);
  
  // Join group
  const handleJoinGroup = async (group: Group) => {
    try {
      await groupsApi.joinGroup(group.id);
      
      // Update local state
      setGroups(prev => prev.map(g => 
        g.id === group.id 
          ? { ...g, isMember: true, memberStatus: group.membershipType === 'approval' ? 'pending' : 'active', memberCount: g.memberCount + 1 }
          : g
      ));
      
      if (group.membershipType === 'approval') {
        Alert.alert('Request Sent', 'Your request to join this group has been sent to the admins.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join group');
    }
  };
  
  // Leave group
  const handleLeaveGroup = async (group: Group) => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave ${group.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsApi.leaveGroup(group.id);
              
              if (activeTab === 'joined') {
                setGroups(prev => prev.filter(g => g.id !== group.id));
              } else {
                setGroups(prev => prev.map(g => 
                  g.id === group.id 
                    ? { ...g, isMember: false, memberRole: undefined, memberCount: g.memberCount - 1 }
                    : g
                ));
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to leave group');
            }
          },
        },
      ]
    );
  };
  
  // Create new group
  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const created = await groupsApi.createGroup(newGroup);
      
      setShowCreateModal(false);
      setNewGroup({
        name: '',
        description: '',
        groupType: 'interest',
        visibility: 'public',
        membershipType: 'open',
        womenOnly: false,
        safetyMode: true,
      });
      
      // Navigate to the new group
      navigation.navigate('GroupDetail', { 
        groupId: created.id,
        groupSlug: created.slug 
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };
  
  // Render featured groups carousel
  const renderFeaturedGroups = () => {
    if (featuredGroups.length === 0 || activeTab === 'joined') return null;
    
    return (
      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>Featured Groups</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredScroll}
        >
          {featuredGroups.map(group => (
            <TouchableOpacity
              key={group.id}
              style={styles.featuredCard}
              onPress={() => navigation.navigate('GroupDetail', { 
                groupId: group.id,
                groupSlug: group.slug 
              })}
            >
              {group.coverImageUrl ? (
                <Image 
                  source={{ uri: group.coverImageUrl }} 
                  style={styles.featuredCover}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.featuredCover, styles.featuredCoverPlaceholder]}>
                  <Ionicons name="people" size={32} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.featuredContent}>
                <View style={styles.featuredBadges}>
                  {group.isOfficial && (
                    <View style={styles.officialBadge}>
                      <Ionicons name="shield-checkmark" size={12} color="white" />
                    </View>
                  )}
                  {group.womenOnly && (
                    <View style={styles.womenOnlyBadge}>
                      <Text style={styles.womenOnlyText}>Women</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.featuredName} numberOfLines={2}>{group.name}</Text>
                <Text style={styles.featuredMembers}>
                  {formatMemberCount(group.memberCount)} members
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };
  
  // Render type filter chips
  const renderTypeFilters = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersContainer}
    >
      <TouchableOpacity
        style={[styles.filterChip, !selectedType && styles.filterChipActive]}
        onPress={() => setSelectedType(null)}
      >
        <Text style={[styles.filterChipText, !selectedType && styles.filterChipTextActive]}>
          All
        </Text>
      </TouchableOpacity>
      
      {GROUP_TYPES.map(type => (
        <TouchableOpacity
          key={type.key}
          style={[styles.filterChip, selectedType === type.key && styles.filterChipActive]}
          onPress={() => setSelectedType(selectedType === type.key ? null : type.key)}
        >
          <Ionicons 
            name={type.icon as any} 
            size={14} 
            color={selectedType === type.key ? 'white' : colors.textSecondary} 
          />
          <Text style={[
            styles.filterChipText, 
            selectedType === type.key && styles.filterChipTextActive
          ]}>
            {type.label}
          </Text>
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity
        style={[styles.filterChip, womenOnly && styles.womenOnlyChipActive]}
        onPress={() => setWomenOnly(!womenOnly)}
      >
        <Ionicons 
          name="female" 
          size={14} 
          color={womenOnly ? 'white' : '#EC4899'} 
        />
        <Text style={[
          styles.filterChipText, 
          womenOnly && styles.filterChipTextActive
        ]}>
          Women Only
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  // Render group card
  const renderGroupCard = ({ item: group }: { item: Group }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => navigation.navigate('GroupDetail', { 
        groupId: group.id,
        groupSlug: group.slug 
      })}
      accessibilityRole="button"
      accessibilityLabel={`View ${group.name} group`}
    >
      {/* Cover image */}
      <View style={styles.groupCoverContainer}>
        {group.coverImageUrl ? (
          <Image 
            source={{ uri: group.coverImageUrl }} 
            style={styles.groupCover}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.groupCover, styles.groupCoverPlaceholder]}>
            <Ionicons name="people" size={40} color={colors.textSecondary} />
          </View>
        )}
        
        {/* Badges overlay */}
        <View style={styles.groupBadges}>
          {group.isOfficial && (
            <View style={styles.officialBadge}>
              <Ionicons name="shield-checkmark" size={14} color="white" />
            </View>
          )}
          {group.visibility === 'private' && (
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed" size={12} color="white" />
            </View>
          )}
        </View>
        
        {/* Icon */}
        {group.iconUrl && (
          <Image 
            source={{ uri: group.iconUrl }}
            style={styles.groupIcon}
          />
        )}
      </View>
      
      {/* Content */}
      <View style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <View style={styles.groupTitleRow}>
            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
            {group.womenOnly && (
              <View style={styles.womenOnlyTag}>
                <Ionicons name="female" size={12} color="#EC4899" />
              </View>
            )}
          </View>
          <Text style={styles.groupType}>
            {GROUP_TYPES.find(t => t.key === group.groupType)?.label || group.groupType}
            {group.category && ` • ${group.category}`}
          </Text>
        </View>
        
        {group.description && (
          <Text style={styles.groupDescription} numberOfLines={2}>
            {group.description}
          </Text>
        )}
        
        <View style={styles.groupFooter}>
          <View style={styles.groupStats}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.statText}>{formatMemberCount(group.memberCount)}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubbles-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.statText}>{formatMemberCount(group.postCount)}</Text>
            </View>
          </View>
          
          {/* Join/Leave button */}
          {group.isMember ? (
            group.memberStatus === 'pending' ? (
              <View style={styles.pendingButton}>
                <Text style={styles.pendingButtonText}>Pending</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.joinedButton}
                onPress={() => handleLeaveGroup(group)}
              >
                <Ionicons name="checkmark" size={16} color={colors.primary} />
                <Text style={styles.joinedButtonText}>Joined</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => handleJoinGroup(group)}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
  
  // Format member count
  const formatMemberCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };
  
  // Empty state
  const renderEmpty = () => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>
          {activeTab === 'joined' 
            ? "You haven't joined any groups yet" 
            : "No groups found matching your criteria"}
        </Text>
        {activeTab === 'joined' && (
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => setActiveTab('discover')}
          >
            <Text style={styles.exploreButtonText}>Explore Groups</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  // Header component for FlatList
  const renderListHeader = () => (
    <>
      {renderFeaturedGroups()}
      {renderTypeFilters()}
      <Text style={styles.resultsCount}>
        {groups.length} group{groups.length !== 1 ? 's' : ''} found
      </Text>
    </>
  );
  
  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups..."
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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Ionicons 
            name={activeTab === 'discover' ? 'compass' : 'compass-outline'} 
            size={20} 
            color={activeTab === 'discover' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'joined' && styles.activeTab]}
          onPress={() => setActiveTab('joined')}
        >
          <Ionicons 
            name={activeTab === 'joined' ? 'people' : 'people-outline'} 
            size={20} 
            color={activeTab === 'joined' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'joined' && styles.activeTabText]}>
            My Groups
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Groups list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroupCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            groups.length === 0 && styles.emptyList
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Create group FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        accessibilityRole="button"
        accessibilityLabel="Create new group"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
      
      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowCreateModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TouchableOpacity 
              onPress={handleCreateGroup}
              disabled={isCreating || !newGroup.name.trim()}
              style={[
                styles.modalCreateButton,
                (isCreating || !newGroup.name.trim()) && styles.modalCreateButtonDisabled
              ]}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.modalCreateText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Group name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Group Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter group name"
                placeholderTextColor={colors.textSecondary}
                value={newGroup.name}
                onChangeText={(text) => setNewGroup(prev => ({ ...prev, name: text }))}
                maxLength={100}
              />
            </View>
            
            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder="What is this group about?"
                placeholderTextColor={colors.textSecondary}
                value={newGroup.description}
                onChangeText={(text) => setNewGroup(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>
            
            {/* Group type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Group Type</Text>
              <View style={styles.typeOptions}>
                {GROUP_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.typeOption,
                      newGroup.groupType === type.key && styles.typeOptionActive
                    ]}
                    onPress={() => setNewGroup(prev => ({ ...prev, groupType: type.key }))}
                  >
                    <Ionicons 
                      name={type.icon as any} 
                      size={20} 
                      color={newGroup.groupType === type.key ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.typeOptionText,
                      newGroup.groupType === type.key && styles.typeOptionTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Privacy */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Privacy</Text>
              <View style={styles.privacyOptions}>
                <TouchableOpacity
                  style={[
                    styles.privacyOption,
                    newGroup.visibility === 'public' && styles.privacyOptionActive
                  ]}
                  onPress={() => setNewGroup(prev => ({ ...prev, visibility: 'public' }))}
                >
                  <Ionicons name="globe-outline" size={24} color={colors.primary} />
                  <View style={styles.privacyOptionContent}>
                    <Text style={styles.privacyOptionTitle}>Public</Text>
                    <Text style={styles.privacyOptionDesc}>Anyone can see and join</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.privacyOption,
                    newGroup.visibility === 'private' && styles.privacyOptionActive
                  ]}
                  onPress={() => setNewGroup(prev => ({ ...prev, visibility: 'private' }))}
                >
                  <Ionicons name="lock-closed-outline" size={24} color={colors.secondary} />
                  <View style={styles.privacyOptionContent}>
                    <Text style={styles.privacyOptionTitle}>Private</Text>
                    <Text style={styles.privacyOptionDesc}>Only members can see posts</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Toggles */}
            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setNewGroup(prev => ({ ...prev, womenOnly: !prev.womenOnly }))}
              >
                <View style={styles.toggleContent}>
                  <Ionicons name="female" size={20} color="#EC4899" />
                  <Text style={styles.toggleLabel}>Women Only</Text>
                </View>
                <View style={[
                  styles.toggle,
                  newGroup.womenOnly && styles.toggleActive
                ]}>
                  <View style={[
                    styles.toggleHandle,
                    newGroup.womenOnly && styles.toggleHandleActive
                  ]} />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setNewGroup(prev => ({ ...prev, safetyMode: !prev.safetyMode }))}
              >
                <View style={styles.toggleContent}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                  <Text style={styles.toggleLabel}>Safety Mode</Text>
                  <Text style={styles.toggleDesc}>Content moderation enabled</Text>
                </View>
                <View style={[
                  styles.toggle,
                  newGroup.safetyMode && styles.toggleActive
                ]}>
                  <View style={[
                    styles.toggleHandle,
                    newGroup.safetyMode && styles.toggleHandleActive
                  ]} />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
  },
  
  // Featured section
  featuredSection: {
    marginTop: spacing.md,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    paddingHorizontal: spacing.md,
    fontWeight: '600',
    color: colors.text,
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  featuredScroll: {
    paddingHorizontal: spacing.md,
  },
  featuredCard: {
    width: 160,
    marginRight: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  featuredCover: {
    width: '100%',
    height: 80,
  },
  featuredCoverPlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredContent: {
    padding: spacing.sm,
  },
  featuredBadges: {
    flexDirection: 'row',
    position: 'absolute',
    top: -spacing.sm,
    left: spacing.sm,
  },
  featuredName: {
    fontWeight: '600',
    color: colors.text,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  featuredMembers: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  
  // Filters
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginLeft: spacing.xs,
  },
  filterChipTextActive: {
    color: 'white',
  },
  womenOnlyChipActive: {
    backgroundColor: '#EC4899',
  },
  
  // Results count
  resultsCount: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textSecondary,
    fontSize: 13,
  },
  
  // List
  listContent: {
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Group card
  groupCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  groupCoverContainer: {
    position: 'relative',
  },
  groupCover: {
    width: '100%',
    height: 100,
  },
  groupCoverPlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupBadges: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
  },
  officialBadge: {
    backgroundColor: colors.primary,
    padding: 4,
    borderRadius: borderRadius.full,
    marginLeft: spacing.xs,
  },
  privateBadge: {
    backgroundColor: colors.secondary,
    padding: 4,
    borderRadius: borderRadius.full,
    marginLeft: spacing.xs,
  },
  womenOnlyBadge: {
    backgroundColor: '#EC4899',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginLeft: spacing.xs,
  },
  womenOnlyText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  groupIcon: {
    position: 'absolute',
    bottom: -20,
    left: spacing.md,
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  groupContent: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  groupHeader: {
    marginBottom: spacing.sm,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupName: {
    fontWeight: '600',
    color: colors.text,
    ...typography.h3,
    flex: 1,
  },
  womenOnlyTag: {
    marginLeft: spacing.sm,
  },
  groupType: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  groupDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  groupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  groupStats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginLeft: spacing.xs,
  },
  joinButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  joinButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  joinedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  joinedButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: spacing.xs,
  },
  pendingButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
  },
  pendingButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
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
  exploreButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  exploreButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  modalCloseText: {
    color: colors.textSecondary,
  },
  modalTitle: {
    fontWeight: '600',
    ...typography.h3,
    color: colors.text,
  },
  modalCreateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  modalCreateButtonDisabled: {
    backgroundColor: colors.border,
  },
  modalCreateText: {
    color: 'white',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  
  // Form
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    ...typography.body,
  },
  formTextarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  
  // Type options
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeOptionActive: {
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  typeOptionText: {
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontSize: 13,
  },
  typeOptionTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  
  // Privacy options
  privacyOptions: {
    gap: spacing.sm,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  privacyOptionActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  privacyOptionContent: {
    marginLeft: spacing.md,
  },
  privacyOptionTitle: {
    fontWeight: '500',
    color: colors.text,
  },
  privacyOptionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  
  // Toggles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleLabel: {
    marginLeft: spacing.sm,
    color: colors.text,
    fontWeight: '500',
  },
  toggleDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: spacing.sm,
  },
  toggle: {
    width: 50,
    height: 28,
    backgroundColor: colors.border,
    borderRadius: 14,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleHandle: {
    width: 24,
    height: 24,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  toggleHandleActive: {
    transform: [{ translateX: 22 }],
  },
});

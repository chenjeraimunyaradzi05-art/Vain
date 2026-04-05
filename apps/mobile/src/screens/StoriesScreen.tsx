/**
 * StoriesScreen.tsx - Success Stories Screen
 * 
 * Features:
 * - Browse and read success stories
 * - Filter by category
 * - Featured stories carousel
 * - Story detail view
 * - Like, comment, and share stories
 * - Submit own story
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
  Modal,
  Dimensions,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../hooks/useSession';
import { storiesApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width: screenWidth } = Dimensions.get('window');

// Types
interface StoryAuthor {
  id: string;
  name: string;
  avatar?: string;
  title?: string;
  location?: string;
  trustLevel: 'basic' | 'verified' | 'trusted' | 'elder';
}

interface Story {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  coverImageUrl?: string;
  videoUrl?: string;
  author: StoryAuthor;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  hasLiked?: boolean;
  hasSaved?: boolean;
  publishedAt?: string;
  createdAt: string;
}

interface StoryComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  likeCount: number;
  hasLiked: boolean;
  createdAt: string;
}

type TabType = 'all' | 'featured' | 'saved';

interface StoriesScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

// Category configuration
const CATEGORIES = [
  { key: 'all', label: 'All Stories', icon: 'library-outline' },
  { key: 'career_journey', label: 'Career Journey', icon: 'trending-up-outline' },
  { key: 'education', label: 'Education', icon: 'school-outline' },
  { key: 'mentorship', label: 'Mentorship', icon: 'people-outline' },
  { key: 'entrepreneurship', label: 'Entrepreneurship', icon: 'bulb-outline' },
  { key: 'community_impact', label: 'Community Impact', icon: 'heart-outline' },
  { key: 'cultural_connection', label: 'Cultural Connection', icon: 'earth-outline' },
  { key: 'personal_growth', label: 'Personal Growth', icon: 'leaf-outline' },
];

export default function StoriesScreen({ navigation }: StoriesScreenProps) {
  const { user } = useSession();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stories, setStories] = useState<Story[]>([]);
  const [featuredStories, setFeaturedStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Detail modal state
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [storyComments, setStoryComments] = useState<StoryComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  
  // Load stories on mount
  useEffect(() => {
    loadStories();
    loadFeaturedStories();
  }, []);
  
  // Reload when tab or category changes
  useEffect(() => {
    setPage(1);
    setStories([]);
    loadStories(true);
  }, [activeTab, selectedCategory]);
  
  // Load stories
  const loadStories = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
      setPage(1);
    } else if (page === 1) {
      setIsLoading(true);
    }
    
    try {
      const params: any = {
        page: refresh ? 1 : page,
        limit: 10,
      };
      
      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      if (search) {
        params.search = search;
      }
      
      if (activeTab === 'featured') {
        params.featured = true;
      } else if (activeTab === 'saved') {
        params.saved = true;
      }
      
      const result = await storiesApi.getStories(params);
      
      if (refresh || page === 1) {
        setStories(result.stories || []);
      } else {
        setStories(prev => [...prev, ...(result.stories || [])]);
      }
      
      setHasMore(result.pagination?.hasNext || false);
    } catch (err) {
      console.error('Load stories error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Load featured stories for carousel
  const loadFeaturedStories = async () => {
    try {
      const result = await storiesApi.getStories({ featured: true, limit: 5 });
      setFeaturedStories(result.stories || []);
    } catch (err) {
      console.error('Load featured stories error:', err);
    }
  };
  
  // Refresh handler
  const onRefresh = useCallback(() => {
    loadStories(true);
    loadFeaturedStories();
  }, [selectedCategory, activeTab, search]);
  
  // Load more handler
  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
      loadStories();
    }
  };
  
  // Search handler with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== '') {
        setPage(1);
        loadStories(true);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [search]);
  
  // Open story detail
  const openStoryDetail = async (story: Story) => {
    setSelectedStory(story);
    setShowDetailModal(true);
    setIsLoadingDetail(true);
    
    try {
      // Load full story content
      const fullStory = await storiesApi.getStory(story.id);
      setSelectedStory(fullStory);
      
      // Load comments
      loadComments(story.id);
    } catch (err) {
      console.error('Load story detail error:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };
  
  // Load comments
  const loadComments = async (storyId: string) => {
    setIsLoadingComments(true);
    try {
      const result = await storiesApi.getComments(storyId);
      setStoryComments(result.comments || []);
    } catch (err) {
      console.error('Load comments error:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };
  
  // Like story
  const handleLikeStory = async (story: Story) => {
    try {
      if (story.hasLiked) {
        await storiesApi.unlikeStory(story.id);
      } else {
        await storiesApi.likeStory(story.id);
      }
      
      // Update local state
      const updateStory = (s: Story) => 
        s.id === story.id 
          ? { ...s, hasLiked: !s.hasLiked, likeCount: s.hasLiked ? s.likeCount - 1 : s.likeCount + 1 }
          : s;
      
      setStories(prev => prev.map(updateStory));
      setFeaturedStories(prev => prev.map(updateStory));
      if (selectedStory?.id === story.id) {
        setSelectedStory(updateStory(selectedStory) as Story);
      }
    } catch (err) {
      console.error('Like story error:', err);
    }
  };
  
  // Save story
  const handleSaveStory = async (story: Story) => {
    try {
      if (story.hasSaved) {
        await storiesApi.unsaveStory(story.id);
      } else {
        await storiesApi.saveStory(story.id);
      }
      
      // Update local state
      const updateStory = (s: Story) => 
        s.id === story.id 
          ? { ...s, hasSaved: !s.hasSaved }
          : s;
      
      setStories(prev => prev.map(updateStory));
      if (selectedStory?.id === story.id) {
        setSelectedStory(updateStory(selectedStory) as Story);
      }
    } catch (err) {
      console.error('Save story error:', err);
    }
  };
  
  // Share story
  const handleShareStory = async (story: Story) => {
    try {
      await Share.share({
        message: `Check out this inspiring story: ${story.title}`,
        url: `https://ngurra.com/stories/${story.slug}`,
        title: story.title,
      });
    } catch (err) {
      console.error('Share story error:', err);
    }
  };
  
  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedStory) return;
    
    try {
      const comment = await storiesApi.addComment(selectedStory.id, newComment);
      setStoryComments(prev => [comment, ...prev]);
      setNewComment('');
      
      // Update comment count
      setSelectedStory(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
    } catch (err) {
      console.error('Add comment error:', err);
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };
  
  // Get trust level badge
  const getTrustBadge = (level: string) => {
    switch (level) {
      case 'verified':
        return { icon: 'checkmark-circle', color: colors.primary };
      case 'trusted':
        return { icon: 'shield-checkmark', color: colors.success };
      case 'elder':
        return { icon: 'star', color: '#FFD700' };
      default:
        return null;
    }
  };
  
  // Render featured story card (for carousel)
  const renderFeaturedStory = ({ item }: { item: Story }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => openStoryDetail(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.coverImageUrl || 'https://via.placeholder.com/400x250' }}
        style={styles.featuredImage}
      />
      <View style={styles.featuredOverlay}>
        <View style={styles.featuredBadge}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={styles.featuredBadgeText}>Featured</Text>
        </View>
        <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.featuredAuthor}>
          <Image
            source={{ uri: item.author.avatar || 'https://via.placeholder.com/32' }}
            style={styles.featuredAvatar}
          />
          <Text style={styles.featuredAuthorName}>{item.author.name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  
  // Render story card
  const renderStoryCard = ({ item }: { item: Story }) => {
    const trustBadge = getTrustBadge(item.author.trustLevel);
    
    return (
      <TouchableOpacity
        style={styles.storyCard}
        onPress={() => openStoryDetail(item)}
        activeOpacity={0.7}
      >
        {item.coverImageUrl && (
          <Image
            source={{ uri: item.coverImageUrl }}
            style={styles.storyImage}
          />
        )}
        <View style={styles.storyContent}>
          <View style={styles.storyHeader}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {CATEGORIES.find(c => c.key === item.category)?.label || item.category}
              </Text>
            </View>
            {item.isFeatured && (
              <View style={styles.featuredTag}>
                <Ionicons name="star" size={12} color="#FFD700" />
              </View>
            )}
          </View>
          
          <Text style={styles.storyTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.storySummary} numberOfLines={3}>{item.summary}</Text>
          
          <View style={styles.storyAuthorRow}>
            <Image
              source={{ uri: item.author.avatar || 'https://via.placeholder.com/40' }}
              style={styles.storyAuthorAvatar}
            />
            <View style={styles.storyAuthorInfo}>
              <View style={styles.authorNameRow}>
                <Text style={styles.storyAuthorName}>{item.author.name}</Text>
                {trustBadge && (
                  <Ionicons 
                    name={trustBadge.icon as any} 
                    size={14} 
                    color={trustBadge.color} 
                    style={styles.trustIcon}
                  />
                )}
              </View>
              <Text style={styles.storyDate}>
                {formatDate(item.publishedAt || item.createdAt)}
              </Text>
            </View>
          </View>
          
          <View style={styles.storyStats}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => handleLikeStory(item)}
            >
              <Ionicons 
                name={item.hasLiked ? 'heart' : 'heart-outline'} 
                size={18} 
                color={item.hasLiked ? colors.error : colors.textSecondary} 
              />
              <Text style={styles.statText}>{item.likeCount}</Text>
            </TouchableOpacity>
            
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.statText}>{item.commentCount}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.statText}>{item.viewCount}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => handleSaveStory(item)}
            >
              <Ionicons 
                name={item.hasSaved ? 'bookmark' : 'bookmark-outline'} 
                size={18} 
                color={item.hasSaved ? colors.primary : colors.textSecondary} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => handleShareStory(item)}
            >
              <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render category pill
  const renderCategory = ({ item }: { item: typeof CATEGORIES[0] }) => (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        selectedCategory === item.key && styles.categoryPillActive,
      ]}
      onPress={() => setSelectedCategory(item.key)}
    >
      <Ionicons 
        name={item.icon as any} 
        size={14} 
        color={selectedCategory === item.key ? colors.white : colors.textSecondary} 
      />
      <Text style={[
        styles.categoryPillText,
        selectedCategory === item.key && styles.categoryPillTextActive,
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
  
  // Render header
  const renderHeader = () => (
    <View>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stories..."
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
        {(['all', 'featured', 'saved'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Categories */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        renderItem={renderCategory}
        contentContainerStyle={styles.categoriesContainer}
      />
      
      {/* Featured carousel (only on 'all' tab) */}
      {activeTab === 'all' && featuredStories.length > 0 && (
        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>Featured Stories</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={featuredStories}
            keyExtractor={(item) => item.id}
            renderItem={renderFeaturedStory}
            contentContainerStyle={styles.featuredList}
            snapToInterval={screenWidth - 60}
            decelerationRate="fast"
          />
        </View>
      )}
      
      <Text style={styles.sectionTitle}>
        {activeTab === 'featured' ? 'Featured Stories' : 
         activeTab === 'saved' ? 'Saved Stories' : 'All Stories'}
      </Text>
    </View>
  );
  
  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="book-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>
        {activeTab === 'saved' ? 'No saved stories' : 'No stories found'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'saved' 
          ? 'Save stories to read them later'
          : 'Check back later for inspiring success stories'}
      </Text>
    </View>
  );
  
  // Render footer (loading more)
  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };
  
  // Render comment item
  const renderComment = ({ item }: { item: StoryComment }) => (
    <View style={styles.commentItem}>
      <Image
        source={{ uri: item.authorAvatar || 'https://via.placeholder.com/32' }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{item.authorName}</Text>
          <Text style={styles.commentDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
        <TouchableOpacity style={styles.commentLikeButton}>
          <Ionicons 
            name={item.hasLiked ? 'heart' : 'heart-outline'} 
            size={14} 
            color={item.hasLiked ? colors.error : colors.textSecondary} 
          />
          <Text style={styles.commentLikeCount}>{item.likeCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Story detail modal
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
          <Text style={styles.modalTitle}>Story</Text>
          <TouchableOpacity onPress={() => selectedStory && handleShareStory(selectedStory)}>
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        {isLoadingDetail ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : selectedStory && (
          <ScrollView style={styles.modalContent}>
            {/* Cover image */}
            {selectedStory.coverImageUrl && (
              <Image
                source={{ uri: selectedStory.coverImageUrl }}
                style={styles.detailCoverImage}
              />
            )}
            
            {/* Category & title */}
            <View style={styles.detailContent}>
              <View style={styles.detailCategory}>
                <Text style={styles.detailCategoryText}>
                  {CATEGORIES.find(c => c.key === selectedStory.category)?.label || selectedStory.category}
                </Text>
              </View>
              
              <Text style={styles.detailTitle}>{selectedStory.title}</Text>
              
              {/* Author */}
              <View style={styles.detailAuthorRow}>
                <Image
                  source={{ uri: selectedStory.author.avatar || 'https://via.placeholder.com/48' }}
                  style={styles.detailAuthorAvatar}
                />
                <View style={styles.detailAuthorInfo}>
                  <Text style={styles.detailAuthorName}>{selectedStory.author.name}</Text>
                  <Text style={styles.detailAuthorTitle}>
                    {selectedStory.author.title} • {selectedStory.author.location}
                  </Text>
                </View>
              </View>
              
              {/* Stats */}
              <View style={styles.detailStats}>
                <View style={styles.detailStatItem}>
                  <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailStatText}>{selectedStory.viewCount} views</Text>
                </View>
                <View style={styles.detailStatItem}>
                  <Ionicons name="heart-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailStatText}>{selectedStory.likeCount} likes</Text>
                </View>
                <View style={styles.detailStatItem}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailStatText}>
                    {formatDate(selectedStory.publishedAt || selectedStory.createdAt)}
                  </Text>
                </View>
              </View>
              
              {/* Content */}
              <Text style={styles.detailBody}>{selectedStory.content}</Text>
              
              {/* Actions */}
              <View style={styles.detailActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, selectedStory.hasLiked && styles.actionButtonActive]}
                  onPress={() => handleLikeStory(selectedStory)}
                >
                  <Ionicons 
                    name={selectedStory.hasLiked ? 'heart' : 'heart-outline'} 
                    size={20} 
                    color={selectedStory.hasLiked ? colors.white : colors.primary} 
                  />
                  <Text style={[styles.actionButtonText, selectedStory.hasLiked && styles.actionButtonTextActive]}>
                    {selectedStory.hasLiked ? 'Liked' : 'Like'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, selectedStory.hasSaved && styles.actionButtonActive]}
                  onPress={() => handleSaveStory(selectedStory)}
                >
                  <Ionicons 
                    name={selectedStory.hasSaved ? 'bookmark' : 'bookmark-outline'} 
                    size={20} 
                    color={selectedStory.hasSaved ? colors.white : colors.primary} 
                  />
                  <Text style={[styles.actionButtonText, selectedStory.hasSaved && styles.actionButtonTextActive]}>
                    {selectedStory.hasSaved ? 'Saved' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Comments section */}
              <View style={styles.commentsSection}>
                <Text style={styles.commentsSectionTitle}>
                  Comments ({selectedStory.commentCount})
                </Text>
                
                {/* Add comment */}
                <View style={styles.addCommentContainer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Share your thoughts..."
                    placeholderTextColor={colors.textSecondary}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                  />
                  <TouchableOpacity 
                    style={[styles.sendCommentButton, !newComment.trim() && styles.sendCommentButtonDisabled]}
                    onPress={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    <Ionicons 
                      name="send" 
                      size={20} 
                      color={newComment.trim() ? colors.white : colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
                
                {isLoadingComments ? (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.commentsLoading} />
                ) : (
                  <FlatList
                    data={storyComments}
                    keyExtractor={(item) => item.id}
                    renderItem={renderComment}
                    scrollEnabled={false}
                    ListEmptyComponent={
                      <Text style={styles.noComments}>
                        Be the first to comment on this story
                      </Text>
                    }
                  />
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
  
  return (
    <View style={styles.container}>
      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        renderItem={renderStoryCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
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
      
      {isLoading && page === 1 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      
      {/* FAB to submit story */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('SubmitStory')}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
      
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  
  // Categories
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  categoryPillTextActive: {
    color: colors.white,
  },
  
  // Section title
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  
  // Featured carousel
  featuredSection: {
    marginBottom: spacing.md,
  },
  featuredList: {
    paddingLeft: spacing.md,
  },
  featuredCard: {
    width: screenWidth - 80,
    height: 200,
    marginRight: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.medium,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,215,0,0.2)',
    marginBottom: spacing.xs,
  },
  featuredBadgeText: {
    ...typography.caption,
    color: '#FFD700',
    marginLeft: 4,
  },
  featuredTitle: {
    ...typography.h3,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  featuredAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: spacing.xs,
  },
  featuredAuthorName: {
    ...typography.caption,
    color: colors.white,
  },
  
  // Story card
  storyCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.small,
  },
  storyImage: {
    width: '100%',
    height: 180,
  },
  storyContent: {
    padding: spacing.md,
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  categoryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  featuredTag: {
    padding: spacing.xs,
  },
  storyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  storySummary: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  storyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  storyAuthorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  storyAuthorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyAuthorName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  trustIcon: {
    marginLeft: spacing.xs,
  },
  storyDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  storyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
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
  loadingMore: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
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
    height: 250,
  },
  detailContent: {
    padding: spacing.md,
  },
  detailCategory: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.sm,
  },
  detailCategoryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  detailTitle: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailAuthorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.sm,
  },
  detailAuthorInfo: {
    flex: 1,
  },
  detailAuthorName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  detailAuthorTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  detailStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    marginBottom: spacing.xs,
  },
  detailStatText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  detailBody: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  
  // Actions
  detailActions: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonActive: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  actionButtonTextActive: {
    color: colors.white,
  },
  
  // Comments
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  commentsSectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
    ...typography.body,
    color: colors.text,
  },
  sendCommentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendCommentButtonDisabled: {
    backgroundColor: colors.border,
  },
  commentsLoading: {
    marginVertical: spacing.md,
  },
  noComments: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  
  // Comment item
  commentItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.sm,
  },
  commentContent: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  commentAuthor: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text,
  },
  commentDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  commentText: {
    ...typography.body,
    color: colors.text,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  commentLikeCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
});

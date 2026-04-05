/**
 * FeedScreen.tsx - Social Feed Screen
 * 
 * Features:
 * - Infinite scroll feed with personalized content
 * - Post creation with text, images, and video
 * - Reactions (like, love, support, celebrate)
 * - Comments and shares
 * - Pull-to-refresh
 * - Trust level badges for authors
 * - Real-time updates via WebSocket
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../hooks/useSession';
import { feedApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';

// Types
interface Author {
  id: string;
  name: string;
  avatar?: string;
  title?: string;
  trustLevel: 'basic' | 'verified' | 'trusted';
  isOrganization?: boolean;
}

interface Reaction {
  type: 'like' | 'love' | 'support' | 'celebrate';
  count: number;
  hasReacted: boolean;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likeCount: number;
}

interface Post {
  id: string;
  author: Author;
  content: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video';
  visibility: 'public' | 'connections' | 'private';
  createdAt: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  reactions: Record<string, Reaction>;
  userReaction?: string;
  isPinned?: boolean;
  isSponsored?: boolean;
}

interface FeedScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

// Reaction emoji mapping
const REACTION_EMOJIS: Record<string, string> = {
  like: '👍',
  love: '❤️',
  support: '🤝',
  celebrate: '🎉',
};

const REACTION_LABELS: Record<string, string> = {
  like: 'Like',
  love: 'Love',
  support: 'Support',
  celebrate: 'Celebrate',
};

// Trust level badge colors
const TRUST_BADGE_COLORS: Record<string, string> = {
  trusted: '#10B981',
  verified: '#3B82F6',
  basic: '#9CA3AF',
};

export default function FeedScreen({ navigation }: FeedScreenProps) {
  const { user } = useSession();
  
  // State
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  // Post creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [postVisibility, setPostVisibility] = useState<'public' | 'connections'>('public');
  
  // Reaction picker state
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const reactionPickerAnim = useRef(new Animated.Value(0)).current;
  
  // Load feed on mount
  useEffect(() => {
    loadFeed();
  }, []);
  
  // Load feed data
  const loadFeed = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
        setPage(1);
      }
      
      const response = await feedApi.getFeed({ page: refresh ? 1 : page, limit: 20 });
      
      if (refresh) {
        setPosts(response.posts || []);
      } else {
        setPosts(prev => [...prev, ...(response.posts || [])]);
      }
      
      setHasMore(response.hasMore !== false);
      setError(null);
    } catch (err: any) {
      console.error('Feed load error:', err);
      setError(err.message || 'Failed to load feed');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };
  
  // Pull to refresh
  const onRefresh = useCallback(() => {
    loadFeed(true);
  }, []);
  
  // Load more posts
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isRefreshing) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
      loadFeed();
    }
  }, [isLoadingMore, hasMore, isRefreshing]);
  
  // Handle reaction
  const handleReaction = async (postId: string, reactionType: string) => {
    try {
      setActiveReactionPicker(null);
      
      // Optimistic update
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const currentReaction = post.userReaction;
          const isSameReaction = currentReaction === reactionType;
          
          return {
            ...post,
            userReaction: isSameReaction ? undefined : reactionType,
            likeCount: isSameReaction 
              ? post.likeCount - 1 
              : post.likeCount + (currentReaction ? 0 : 1),
          };
        }
        return post;
      }));
      
      await feedApi.reactToPost(postId, reactionType);
    } catch (err) {
      console.error('Reaction error:', err);
      // Revert on error
      loadFeed(true);
    }
  };
  
  // Handle share
  const handleShare = async (post: Post) => {
    try {
      const result = await Share.share({
        message: `Check out this post on Ngurra Pathways: ${post.content.substring(0, 100)}...`,
        url: `https://ngurra.com/feed/${post.id}`,
      });
      
      if (result.action === Share.sharedAction) {
        await feedApi.sharePost(post.id);
        setPosts(prev => prev.map(p => 
          p.id === post.id ? { ...p, shareCount: p.shareCount + 1 } : p
        ));
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };
  
  // Pick image for new post
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4,
    });
    
    if (!result.canceled && result.assets) {
      setNewPostMedia(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 4));
    }
  };
  
  // Create new post
  const createPost = async () => {
    if (!newPostContent.trim() && newPostMedia.length === 0) {
      Alert.alert('Empty Post', 'Please add some content or images');
      return;
    }
    
    setIsPosting(true);
    
    try {
      const newPost = await feedApi.createPost({
        content: newPostContent,
        mediaUrls: newPostMedia,
        visibility: postVisibility,
      });
      
      setPosts(prev => [newPost, ...prev]);
      setShowCreateModal(false);
      setNewPostContent('');
      setNewPostMedia([]);
      setPostVisibility('public');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };
  
  // Show reaction picker with animation
  const showReactionPicker = (postId: string) => {
    setActiveReactionPicker(postId);
    Animated.spring(reactionPickerAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };
  
  // Hide reaction picker
  const hideReactionPicker = () => {
    Animated.timing(reactionPickerAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setActiveReactionPicker(null));
  };
  
  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return date.toLocaleDateString();
  };
  
  // Render post card
  const renderPost = ({ item: post }: { item: Post }) => {
    const isReactionPickerVisible = activeReactionPicker === post.id;
    
    return (
      <View style={styles.postCard}>
        {/* Sponsored/Pinned indicator */}
        {(post.isPinned || post.isSponsored) && (
          <View style={styles.postBadge}>
            <Ionicons 
              name={post.isPinned ? 'pin' : 'megaphone-outline'} 
              size={12} 
              color={colors.textSecondary} 
            />
            <Text style={styles.postBadgeText}>
              {post.isPinned ? 'Pinned' : 'Sponsored'}
            </Text>
          </View>
        )}
        
        {/* Author header */}
        <TouchableOpacity 
          style={styles.postHeader}
          onPress={() => navigation.navigate('Profile', { userId: post.author.id })}
          accessibilityRole="button"
          accessibilityLabel={`View ${post.author.name}'s profile`}
        >
          {post.author.avatar ? (
            <Image source={{ uri: post.author.avatar }} style={styles.authorAvatar} />
          ) : (
            <View style={[styles.authorAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {post.author.name?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{post.author.name}</Text>
              {post.author.trustLevel !== 'basic' && (
                <View 
                  style={[
                    styles.trustBadge, 
                    { backgroundColor: TRUST_BADGE_COLORS[post.author.trustLevel] }
                  ]}
                >
                  <Ionicons 
                    name={post.author.trustLevel === 'trusted' ? 'shield-checkmark' : 'checkmark-circle'} 
                    size={10} 
                    color="white" 
                  />
                </View>
              )}
            </View>
            <Text style={styles.authorTitle}>
              {post.author.title || 'Community Member'} • {formatTimeAgo(post.createdAt)}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => {/* Show post options */}}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
        
        {/* Content */}
        <Text style={styles.postContent}>{post.content}</Text>
        
        {/* Media */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <View style={styles.mediaContainer}>
            {post.mediaUrls.length === 1 ? (
              <Image 
                source={{ uri: post.mediaUrls[0] }} 
                style={styles.mediaSingle}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.mediaGrid}>
                {post.mediaUrls.slice(0, 4).map((uri, index) => (
                  <Image 
                    key={index}
                    source={{ uri }} 
                    style={[
                      styles.mediaGridItem,
                      post.mediaUrls!.length === 2 && styles.mediaGridItemHalf,
                      post.mediaUrls!.length === 3 && index === 0 && styles.mediaGridItemFull,
                    ]}
                    resizeMode="cover"
                  />
                ))}
                {post.mediaUrls.length > 4 && (
                  <View style={styles.mediaOverlay}>
                    <Text style={styles.mediaOverlayText}>+{post.mediaUrls.length - 4}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
        
        {/* Engagement stats */}
        {(post.likeCount > 0 || post.commentCount > 0 || post.shareCount > 0) && (
          <View style={styles.engagementStats}>
            {post.likeCount > 0 && (
              <Text style={styles.statText}>
                {REACTION_EMOJIS[post.userReaction || 'like']} {post.likeCount}
              </Text>
            )}
            {post.commentCount > 0 && (
              <Text style={styles.statText}>{post.commentCount} comments</Text>
            )}
            {post.shareCount > 0 && (
              <Text style={styles.statText}>{post.shareCount} shares</Text>
            )}
          </View>
        )}
        
        {/* Action buttons */}
        <View style={styles.postActions}>
          {/* Like button with long press for reaction picker */}
          <Pressable
            style={styles.actionButton}
            onPress={() => handleReaction(post.id, post.userReaction || 'like')}
            onLongPress={() => showReactionPicker(post.id)}
            delayLongPress={500}
          >
            {post.userReaction ? (
              <Text style={styles.reactionEmoji}>
                {REACTION_EMOJIS[post.userReaction]}
              </Text>
            ) : (
              <Ionicons name="thumbs-up-outline" size={20} color={colors.textSecondary} />
            )}
            <Text style={[styles.actionText, post.userReaction && styles.actionTextActive]}>
              {post.userReaction ? REACTION_LABELS[post.userReaction] : 'Like'}
            </Text>
          </Pressable>
          
          {/* Reaction picker popup */}
          {isReactionPickerVisible && (
            <Animated.View 
              style={[
                styles.reactionPicker,
                {
                  opacity: reactionPickerAnim,
                  transform: [{ scale: reactionPickerAnim }],
                }
              ]}
            >
              {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                <TouchableOpacity
                  key={type}
                  style={styles.reactionOption}
                  onPress={() => handleReaction(post.id, type)}
                >
                  <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleShare(post)}
          >
            <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Render create post header
  const renderHeader = () => (
    <TouchableOpacity 
      style={styles.createPostCard}
      onPress={() => setShowCreateModal(true)}
      accessibilityRole="button"
      accessibilityLabel="Create a new post"
    >
      <View style={[styles.authorAvatar, styles.avatarPlaceholder]}>
        <Text style={styles.avatarText}>
          {user?.email?.[0]?.toUpperCase() || 'U'}
        </Text>
      </View>
      <Text style={styles.createPostPlaceholder}>What's on your mind?</Text>
      <View style={styles.createPostActions}>
        <TouchableOpacity style={styles.createPostAction}>
          <Ionicons name="image-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.createPostAction}>
          <Ionicons name="videocam-outline" size={24} color={colors.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  // Render footer loader
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };
  
  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your feed...</Text>
      </View>
    );
  }
  
  // Error state
  if (error && posts.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadFeed(true)}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        // Hide reaction picker on scroll
        onScrollBeginDrag={hideReactionPicker}
      />
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        accessibilityRole="button"
        accessibilityLabel="Create new post"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
      
      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowCreateModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Post</Text>
            <TouchableOpacity 
              onPress={createPost}
              disabled={isPosting || (!newPostContent.trim() && newPostMedia.length === 0)}
              style={[
                styles.modalPostButton,
                (isPosting || (!newPostContent.trim() && newPostMedia.length === 0)) && 
                styles.modalPostButtonDisabled
              ]}
            >
              {isPosting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.modalPostText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Visibility selector */}
          <View style={styles.visibilitySelector}>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                postVisibility === 'public' && styles.visibilityOptionActive
              ]}
              onPress={() => setPostVisibility('public')}
            >
              <Ionicons 
                name="globe-outline" 
                size={16} 
                color={postVisibility === 'public' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.visibilityText,
                postVisibility === 'public' && styles.visibilityTextActive
              ]}>Public</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                postVisibility === 'connections' && styles.visibilityOptionActive
              ]}
              onPress={() => setPostVisibility('connections')}
            >
              <Ionicons 
                name="people-outline" 
                size={16} 
                color={postVisibility === 'connections' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.visibilityText,
                postVisibility === 'connections' && styles.visibilityTextActive
              ]}>Connections</Text>
            </TouchableOpacity>
          </View>
          
          {/* Post content input */}
          <TextInput
            style={styles.postInput}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textSecondary}
            multiline
            value={newPostContent}
            onChangeText={setNewPostContent}
            autoFocus
            maxLength={2000}
          />
          
          {/* Character count */}
          <Text style={styles.charCount}>
            {newPostContent.length}/2000
          </Text>
          
          {/* Media preview */}
          {newPostMedia.length > 0 && (
            <View style={styles.mediaPreviewContainer}>
              {newPostMedia.map((uri, index) => (
                <View key={index} style={styles.mediaPreviewItem}>
                  <Image source={{ uri }} style={styles.mediaPreview} />
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => setNewPostMedia(prev => prev.filter((_, i) => i !== index))}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          {/* Media actions */}
          <View style={styles.mediaActions}>
            <TouchableOpacity 
              style={styles.mediaActionButton}
              onPress={pickImage}
              disabled={newPostMedia.length >= 4}
            >
              <Ionicons 
                name="image-outline" 
                size={24} 
                color={newPostMedia.length >= 4 ? colors.textSecondary : colors.primary} 
              />
              <Text style={styles.mediaActionText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaActionButton}>
              <Ionicons name="videocam-outline" size={24} color={colors.secondary} />
              <Text style={styles.mediaActionText}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaActionButton}>
              <Ionicons name="location-outline" size={24} color="#EF4444" />
              <Text style={styles.mediaActionText}>Location</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    ...typography.body,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    textAlign: 'center',
    ...typography.body,
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Create post card
  createPostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  createPostPlaceholder: {
    flex: 1,
    marginLeft: spacing.md,
    color: colors.textSecondary,
    ...typography.body,
  },
  createPostActions: {
    flexDirection: 'row',
  },
  createPostAction: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  
  // Post card
  postCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  postBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  postBadgeText: {
    marginLeft: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  authorInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontWeight: '600',
    color: colors.text,
    ...typography.body,
  },
  trustBadge: {
    marginLeft: spacing.xs,
    padding: 2,
    borderRadius: 10,
  },
  authorTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  moreButton: {
    padding: spacing.sm,
  },
  postContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    color: colors.text,
    ...typography.body,
    lineHeight: 22,
  },
  
  // Media
  mediaContainer: {
    marginBottom: spacing.md,
  },
  mediaSingle: {
    width: '100%',
    height: 300,
    backgroundColor: colors.background,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mediaGridItem: {
    width: '50%',
    height: 150,
    padding: 1,
  },
  mediaGridItemHalf: {
    width: '50%',
    height: 200,
  },
  mediaGridItemFull: {
    width: '100%',
    height: 200,
  },
  mediaOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '50%',
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaOverlayText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  
  // Engagement stats
  engagementStats: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginRight: spacing.md,
  },
  
  // Actions
  postActions: {
    flexDirection: 'row',
    padding: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  actionText: {
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actionTextActive: {
    color: colors.primary,
  },
  reactionEmoji: {
    fontSize: 18,
  },
  
  // Reaction picker
  reactionPicker: {
    position: 'absolute',
    bottom: 50,
    left: spacing.md,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: spacing.xs,
    ...shadows.lg,
  },
  reactionOption: {
    padding: spacing.sm,
  },
  reactionOptionEmoji: {
    fontSize: 24,
  },
  
  // Footer
  footerLoader: {
    padding: spacing.lg,
    alignItems: 'center',
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
    ...typography.body,
  },
  modalTitle: {
    fontWeight: '600',
    ...typography.h3,
    color: colors.text,
  },
  modalPostButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minWidth: 70,
    alignItems: 'center',
  },
  modalPostButtonDisabled: {
    backgroundColor: colors.border,
  },
  modalPostText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Visibility selector
  visibilitySelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    backgroundColor: colors.background,
  },
  visibilityOptionActive: {
    backgroundColor: `${colors.primary}20`,
  },
  visibilityText: {
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontSize: 13,
  },
  visibilityTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  
  // Post input
  postInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: 18,
    color: colors.text,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    paddingRight: spacing.md,
    color: colors.textSecondary,
    fontSize: 12,
  },
  
  // Media preview
  mediaPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
  },
  mediaPreviewItem: {
    position: 'relative',
    margin: spacing.xs,
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  
  // Media actions
  mediaActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  mediaActionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  mediaActionText: {
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontSize: 13,
  },
});

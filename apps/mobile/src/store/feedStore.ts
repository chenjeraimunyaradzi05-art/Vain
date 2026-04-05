/**
 * Feed Store - Zustand state management for social feed
 * 
 * Manages:
 * - Feed posts with optimistic updates
 * - Post creation and editing
 * - Reactions and comments
 * - Infinite scroll pagination
 * - Real-time updates integration
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

// Types
export interface Author {
  id: string;
  name: string;
  avatar?: string;
  isVerified?: boolean;
  isMentor?: boolean;
}

export interface Reaction {
  id: string;
  type: 'like' | 'love' | 'support' | 'celebrate';
  userId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  authorId: string;
  author: Author;
  content: string;
  createdAt: string;
  likes: number;
  replies?: Comment[];
}

export interface Post {
  id: string;
  authorId: string;
  author: Author;
  content: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'document';
  createdAt: string;
  updatedAt: string;
  likes: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  userReaction?: Reaction | null;
  isSaved?: boolean;
  comments?: Comment[];
  // Ranking info (optional)
  score?: number;
  scoreComponents?: {
    recency: number;
    engagement: number;
    relationship: number;
    quality: number;
    culturalRelevance: number;
  };
}

export interface CreatePostInput {
  content: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'document';
}

interface FeedState {
  // Data
  posts: Post[];
  trendingPosts: Post[];
  userPosts: Record<string, Post[]>; // Posts by user ID
  
  // Pagination
  cursor: string | null;
  hasMore: boolean;
  trendingCursor: string | null;
  trendingHasMore: boolean;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isCreatingPost: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  fetchFeed: (refresh?: boolean) => Promise<void>;
  fetchTrending: (refresh?: boolean) => Promise<void>;
  fetchUserPosts: (userId: string, refresh?: boolean) => Promise<void>;
  createPost: (input: CreatePostInput) => Promise<Post | null>;
  updatePost: (postId: string, content: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  
  // Reactions
  addReaction: (postId: string, type: Reaction['type']) => Promise<void>;
  removeReaction: (postId: string) => Promise<void>;
  
  // Comments
  addComment: (postId: string, content: string) => Promise<Comment | null>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  
  // Saves
  savePost: (postId: string) => Promise<void>;
  unsavePost: (postId: string) => Promise<void>;
  
  // Real-time updates
  handleNewPost: (post: Post) => void;
  handlePostUpdated: (post: Post) => void;
  handlePostDeleted: (postId: string) => void;
  handleNewReaction: (postId: string, reaction: Reaction) => void;
  handleNewComment: (postId: string, comment: Comment) => void;
  
  // Utility
  clearError: () => void;
  reset: () => void;
}

// Helper to update a post in an array
const updatePostInArray = (posts: Post[], postId: string, update: Partial<Post>): Post[] => {
  return posts.map(p => p.id === postId ? { ...p, ...update } : p);
};

export const useFeedStore = create<FeedState>()(
  persist(
    (set, get) => ({
      // Initial state
      posts: [],
      trendingPosts: [],
      userPosts: {},
      cursor: null,
      hasMore: true,
      trendingCursor: null,
      trendingHasMore: true,
      isLoading: false,
      isRefreshing: false,
      isCreatingPost: false,
      error: null,

      // Fetch main feed
      fetchFeed: async (refresh = false) => {
        const { cursor, isLoading, isRefreshing } = get();
        
        if (isLoading || isRefreshing) return;
        
        set({ 
          isLoading: !refresh, 
          isRefreshing: refresh,
          error: null 
        });

        try {
          const response = await api.feed.getFeed(refresh ? undefined : cursor || undefined);
          
          set(state => ({
            posts: refresh 
              ? response.posts 
              : [...state.posts, ...response.posts],
            cursor: response.nextCursor,
            hasMore: response.hasMore,
            isLoading: false,
            isRefreshing: false
          }));
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch feed',
            isLoading: false,
            isRefreshing: false
          });
        }
      },

      // Fetch trending posts
      fetchTrending: async (refresh = false) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.feed.getTrending();
          
          set({
            trendingPosts: response.posts,
            trendingHasMore: response.hasMore,
            isLoading: false
          });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch trending',
            isLoading: false
          });
        }
      },

      // Fetch posts for a specific user
      fetchUserPosts: async (userId: string, refresh = false) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.feed.getUserPosts(userId);
          
          set(state => ({
            userPosts: {
              ...state.userPosts,
              [userId]: response.posts
            },
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch user posts',
            isLoading: false
          });
        }
      },

      // Create a new post
      createPost: async (input: CreatePostInput) => {
        set({ isCreatingPost: true, error: null });

        try {
          const newPost = await api.feed.createPost(input);
          
          // Add to beginning of feed (optimistic update)
          set(state => ({
            posts: [newPost, ...state.posts],
            isCreatingPost: false
          }));

          return newPost;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to create post',
            isCreatingPost: false
          });
          return null;
        }
      },

      // Update a post
      updatePost: async (postId: string, content: string) => {
        // Optimistic update
        set(state => ({
          posts: updatePostInArray(state.posts, postId, { content })
        }));

        try {
          await api.feed.updatePost(postId, { content });
        } catch (error: any) {
          // Revert on error
          set({ error: error.message || 'Failed to update post' });
          // Could reload the post here to revert
        }
      },

      // Delete a post
      deletePost: async (postId: string) => {
        const { posts } = get();
        const deletedPost = posts.find(p => p.id === postId);

        // Optimistic update
        set(state => ({
          posts: state.posts.filter(p => p.id !== postId)
        }));

        try {
          await api.feed.deletePost(postId);
        } catch (error: any) {
          // Revert on error
          if (deletedPost) {
            set(state => ({
              posts: [...state.posts, deletedPost].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              ),
              error: error.message || 'Failed to delete post'
            }));
          }
        }
      },

      // Add reaction to a post
      addReaction: async (postId: string, type: Reaction['type']) => {
        // Optimistic update
        set(state => ({
          posts: updatePostInArray(state.posts, postId, {
            likes: (state.posts.find(p => p.id === postId)?.likes || 0) + 1,
            userReaction: { 
              id: 'temp', 
              type, 
              userId: 'current', 
              createdAt: new Date().toISOString() 
            }
          })
        }));

        try {
          await api.feed.addReaction(postId, type);
        } catch (error: any) {
          // Revert on error
          set(state => ({
            posts: updatePostInArray(state.posts, postId, {
              likes: Math.max(0, (state.posts.find(p => p.id === postId)?.likes || 1) - 1),
              userReaction: null
            }),
            error: error.message
          }));
        }
      },

      // Remove reaction from a post
      removeReaction: async (postId: string) => {
        const { posts } = get();
        const post = posts.find(p => p.id === postId);
        const previousReaction = post?.userReaction;

        // Optimistic update
        set(state => ({
          posts: updatePostInArray(state.posts, postId, {
            likes: Math.max(0, (state.posts.find(p => p.id === postId)?.likes || 1) - 1),
            userReaction: null
          })
        }));

        try {
          await api.feed.removeReaction(postId);
        } catch (error: any) {
          // Revert on error
          set(state => ({
            posts: updatePostInArray(state.posts, postId, {
              likes: (state.posts.find(p => p.id === postId)?.likes || 0) + 1,
              userReaction: previousReaction
            }),
            error: error.message
          }));
        }
      },

      // Add comment to a post
      addComment: async (postId: string, content: string) => {
        set({ error: null });

        try {
          const newComment = await api.feed.addComment(postId, content);
          
          set(state => ({
            posts: updatePostInArray(state.posts, postId, {
              commentCount: (state.posts.find(p => p.id === postId)?.commentCount || 0) + 1,
              comments: [
                ...(state.posts.find(p => p.id === postId)?.comments || []),
                newComment
              ]
            })
          }));

          return newComment;
        } catch (error: any) {
          set({ error: error.message || 'Failed to add comment' });
          return null;
        }
      },

      // Delete comment
      deleteComment: async (postId: string, commentId: string) => {
        // Optimistic update
        set(state => ({
          posts: updatePostInArray(state.posts, postId, {
            commentCount: Math.max(0, (state.posts.find(p => p.id === postId)?.commentCount || 1) - 1),
            comments: state.posts.find(p => p.id === postId)?.comments?.filter(c => c.id !== commentId)
          })
        }));

        try {
          await api.feed.deleteComment(postId, commentId);
        } catch (error: any) {
          set({ error: error.message || 'Failed to delete comment' });
        }
      },

      // Save post
      savePost: async (postId: string) => {
        set(state => ({
          posts: updatePostInArray(state.posts, postId, {
            isSaved: true,
            saveCount: (state.posts.find(p => p.id === postId)?.saveCount || 0) + 1
          })
        }));

        try {
          await api.feed.savePost(postId);
        } catch (error: any) {
          set(state => ({
            posts: updatePostInArray(state.posts, postId, {
              isSaved: false,
              saveCount: Math.max(0, (state.posts.find(p => p.id === postId)?.saveCount || 1) - 1)
            }),
            error: error.message
          }));
        }
      },

      // Unsave post
      unsavePost: async (postId: string) => {
        set(state => ({
          posts: updatePostInArray(state.posts, postId, {
            isSaved: false,
            saveCount: Math.max(0, (state.posts.find(p => p.id === postId)?.saveCount || 1) - 1)
          })
        }));

        try {
          await api.feed.unsavePost(postId);
        } catch (error: any) {
          set(state => ({
            posts: updatePostInArray(state.posts, postId, {
              isSaved: true,
              saveCount: (state.posts.find(p => p.id === postId)?.saveCount || 0) + 1
            }),
            error: error.message
          }));
        }
      },

      // Real-time: Handle new post from socket
      handleNewPost: (post: Post) => {
        set(state => {
          // Don't add if already exists
          if (state.posts.some(p => p.id === post.id)) {
            return state;
          }
          return {
            posts: [post, ...state.posts]
          };
        });
      },

      // Real-time: Handle post update from socket
      handlePostUpdated: (post: Post) => {
        set(state => ({
          posts: state.posts.map(p => p.id === post.id ? post : p)
        }));
      },

      // Real-time: Handle post deletion from socket
      handlePostDeleted: (postId: string) => {
        set(state => ({
          posts: state.posts.filter(p => p.id !== postId)
        }));
      },

      // Real-time: Handle new reaction from socket
      handleNewReaction: (postId: string, reaction: Reaction) => {
        set(state => ({
          posts: updatePostInArray(state.posts, postId, {
            likes: (state.posts.find(p => p.id === postId)?.likes || 0) + 1
          })
        }));
      },

      // Real-time: Handle new comment from socket
      handleNewComment: (postId: string, comment: Comment) => {
        set(state => ({
          posts: updatePostInArray(state.posts, postId, {
            commentCount: (state.posts.find(p => p.id === postId)?.commentCount || 0) + 1,
            comments: [
              ...(state.posts.find(p => p.id === postId)?.comments || []),
              comment
            ]
          })
        }));
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Reset store
      reset: () => set({
        posts: [],
        trendingPosts: [],
        userPosts: {},
        cursor: null,
        hasMore: true,
        trendingCursor: null,
        trendingHasMore: true,
        isLoading: false,
        isRefreshing: false,
        isCreatingPost: false,
        error: null
      })
    }),
    {
      name: 'feed-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist posts (not loading states)
      partialize: (state) => ({
        posts: state.posts.slice(0, 50), // Only keep last 50 posts offline
        trendingPosts: state.trendingPosts.slice(0, 20)
      })
    }
  )
);

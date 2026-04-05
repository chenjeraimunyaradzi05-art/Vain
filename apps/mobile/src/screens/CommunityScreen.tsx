/**
 * Community Screen
 * Forum discussions and community features
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ListRenderItem
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { forumsApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { useSession } from '../hooks/useSession';

// Define types
interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface Thread {
  id: string;
  title: string;
  category?: {
    name: string;
  };
  _count?: {
    replies: number;
  };
  createdAt: string;
  author?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

type RootStackParamList = {
  ForumCategory: { categoryId: string; categoryName: string; slug: string };
  ForumThread: { threadId: string; threadTitle: string };
};

type CommunityScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CommunityScreen() {
  const navigation = useNavigation<CommunityScreenNavigationProp>();
  const { isAuthenticated } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentThreads, setRecentThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'categories' | 'recent'>('categories');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [categoriesResult, threadsResult] = await Promise.all([
        forumsApi.getCategories(),
        forumsApi.getRecentThreads({ limit: 10 }),
      ]);
      
      setCategories(categoriesResult.data?.categories || []);
      setRecentThreads(threadsResult.data?.threads || []);
    } catch (error) {
      console.error('Load community data error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  function onRefresh() {
    setIsRefreshing(true);
    loadData();
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  const renderCategory: ListRenderItem<Category> = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => navigation.navigate('ForumCategory', { 
        categoryId: item.id, 
        categoryName: item.name,
        slug: item.slug 
      })}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} category. ${item.description || 'Discuss and share with the community'}`}
      accessibilityHint="Double tap to view category discussions"
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.color || colors.primary }]} accessibilityElementsHidden>
        <Ionicons name={item.icon || 'chatbubbles'} size={24} color={colors.textInverse} />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryDescription} numberOfLines={2}>
          {item.description || 'Discuss and share with the community'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} accessibilityElementsHidden />
    </TouchableOpacity>
  ), [navigation]);

  const renderThread: ListRenderItem<Thread> = useCallback(({ item }) => {
    const replyCount = item._count?.replies || 0;
    const accessibilityLabel = `${item.title}. In ${item.category?.name || 'General'} category. ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}. Posted ${formatTimeAgo(item.createdAt)}`;
    
    return (
      <TouchableOpacity
        style={styles.threadCard}
        onPress={() => navigation.navigate('ForumThread', { 
          threadId: item.id,
          threadTitle: item.title
        })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to view discussion"
      >
        <View style={styles.threadContent}>
          <Text style={styles.threadTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.threadMeta} accessibilityElementsHidden>
            <Text style={styles.threadCategory}>{item.category?.name || 'General'}</Text>
            <Text style={styles.threadDot}>•</Text>
            <Text style={styles.threadTime}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
        
        <View style={styles.threadStats} accessibilityElementsHidden>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.threadCount}>{replyCount}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.activeTab]}
          onPress={() => setActiveTab('categories')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'categories' }}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.activeTabText]}>Categories</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
          onPress={() => setActiveTab('recent')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'recent' }}
        >
          <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>Recent Discussions</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'categories' ? categories : recentThreads}
          renderItem={activeTab === 'categories' ? renderCategory : renderThread as any}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {activeTab === 'categories' ? 'No categories found' : 'No recent discussions'}
              </Text>
            </View>
          }
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
  tabsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold as any,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.card,
    ...shadows.sm,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text,
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.card,
    ...shadows.sm,
  },
  threadContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  threadTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadCategory: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold as any,
  },
  threadDot: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginHorizontal: 4,
  },
  threadTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  threadStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  threadCount: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.lg,
    marginTop: spacing.md,
  },
});

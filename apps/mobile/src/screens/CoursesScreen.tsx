/**
 * Courses Screen
 * Browse training courses and enrolments
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  ListRenderItem
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { coursesApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

// Define types
interface Course {
  id: string;
  title: string;
  providerName?: string;
  category?: string;
  duration?: string;
  priceInCents?: number;
  price?: string;
  isOnline?: boolean;
  imageUrl?: string;
  description?: string;
}

interface CategoryFilter {
  value: string;
  label: string;
}

type RootStackParamList = {
  CourseDetail: { courseId: string };
};

type CoursesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORY_FILTERS: CategoryFilter[] = [
  { value: '', label: 'All Categories' },
  { value: 'business', label: 'Business' },
  { value: 'health', label: 'Health & Community' },
  { value: 'trades', label: 'Trades' },
  { value: 'technology', label: 'Technology' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'cultural', label: 'Cultural & Arts' },
];

export default function CoursesScreen() {
  const navigation = useNavigation<CoursesScreenNavigationProp>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadCourses(true);
  }, [category]);

  async function loadCourses(reset = false) {
    if (reset) {
      setIsLoading(true);
      setPage(1);
    }

    try {
      const params: any = {
        page: reset ? 1 : page,
        limit: 20,
      };
      if (search) params.search = search;
      if (category) params.category = category;

      const result = await coursesApi.getCourses(params);
      const newCourses = result.data?.courses || [];

      if (reset) {
        setCourses(newCourses);
      } else {
        setCourses(prev => [...prev, ...newCourses]);
      }

      setHasMore(newCourses.length === 20);
      setPage(prev => reset ? 2 : prev + 1);
    } catch (error) {
      console.error('Load courses error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  function onRefresh() {
    setIsRefreshing(true);
    loadCourses(true);
  }

  function onEndReached() {
    if (!isLoading && hasMore) {
      loadCourses(false);
    }
  }

  function handleSearch() {
    loadCourses(true);
  }

  const renderCourse: ListRenderItem<Course> = useCallback(({ item }) => {
    const priceText = item.priceInCents 
      ? `$${(item.priceInCents / 100).toFixed(0)}` 
      : item.price 
        ? `$${item.price}` 
        : 'Free';
    
    const accessibilityLabel = `${item.title} by ${item.providerName || 'Provider'}. ${item.category || ''}. ${item.duration || ''}. ${priceText}. ${item.isOnline ? 'Available online.' : ''}`;
    
    return (
      <TouchableOpacity
        style={styles.courseCard}
        onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <View style={styles.courseImageContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.courseImage} />
          ) : (
            <View style={[styles.courseImage, styles.placeholderImage]}>
              <Ionicons name="school-outline" size={32} color={colors.textMuted} />
            </View>
          )}
          {item.isOnline && (
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineText}>Online</Text>
            </View>
          )}
        </View>
        
        <View style={styles.courseContent}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryText}>{item.category || 'General'}</Text>
            <Text style={styles.priceText}>{priceText}</Text>
          </View>
          
          <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.providerText}>{item.providerName || 'Unknown Provider'}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{item.duration || 'Self-paced'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={14} color={colors.primary} />
              <Text style={styles.metaText}>4.8</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        
        <FlatList
          data={CATEGORY_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          keyExtractor={item => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                category === item.value && styles.categoryChipActive
              ]}
              onPress={() => setCategory(item.value)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  category === item.value && styles.categoryChipTextActive
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourse}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading && page > 1 ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} />
            ) : null
          }
          ListEmptyComponent={
            !isLoading && (
              <View style={styles.emptyContainer}>
                <Ionicons name="school-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyText}>No courses found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
              </View>
            )
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
  header: {
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.fontSize.md,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  categoryChipTextActive: {
    color: colors.textInverse,
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
  courseCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    ...shadows.sm,
  },
  courseImageContainer: {
    height: 140,
    backgroundColor: colors.surfaceLight,
    position: 'relative',
  },
  courseImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  onlineText: {
    color: colors.text,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold as any,
  },
  courseContent: {
    padding: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryText: {
    color: colors.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold as any,
    textTransform: 'uppercase',
  },
  priceText: {
    color: colors.success,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold as any,
  },
  courseTitle: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold as any,
    marginBottom: spacing.xs,
  },
  providerText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
  footerLoader: {
    paddingVertical: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
  },
  emptyText: {
    color: colors.text,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
    marginTop: spacing.md,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    marginTop: spacing.xs,
  },
});

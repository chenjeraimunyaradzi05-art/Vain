/**
 * Resources Screen
 * Learning resources, guides, and educational content
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useSession } from '../hooks/useSession';
import { resourcesApi } from '../services/api';

interface ResourceTypeConfig {
  icon: string;
  color: string;
  label: string;
}

const RESOURCE_TYPES: Record<string, ResourceTypeConfig> = {
  article: { icon: 'document-text-outline', color: '#3B82F6', label: 'Article' },
  video: { icon: 'play-circle-outline', color: '#EF4444', label: 'Video' },
  guide: { icon: 'book-outline', color: '#22C55E', label: 'Guide' },
  template: { icon: 'copy-outline', color: '#A855F7', label: 'Template' },
  webinar: { icon: 'videocam-outline', color: '#EAB308', label: 'Webinar' },
  podcast: { icon: 'mic-outline', color: '#F97316', label: 'Podcast' },
  course: { icon: 'school-outline', color: '#14B8A6', label: 'Course' },
  other: { icon: 'folder-outline', color: '#64748B', label: 'Resource' },
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'resume', label: 'Resume Help' },
  { id: 'interview', label: 'Interview Tips' },
  { id: 'career', label: 'Career Development' },
  { id: 'cultural', label: 'Cultural Resources' },
  { id: 'training', label: 'Training' },
];

interface Resource {
  id: string;
  title: string;
  description?: string;
  type: string;
  category: string;
  duration?: string;
  viewCount?: number;
  featured?: boolean;
  url?: string;
}

function ResourceCard({ resource, onPress, onBookmark, isBookmarked }: { resource: Resource; onPress: () => void; onBookmark: () => void; isBookmarked: boolean }) {
  const type = RESOURCE_TYPES[resource.type] || RESOURCE_TYPES.other;
  const accessibilityLabel = `${type.label}: ${resource.title}. ${resource.description || ''}. ${resource.duration ? `Duration: ${resource.duration}.` : ''}`;
  
  return (
    <TouchableOpacity 
      style={styles.resourceCard} 
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to open resource"
    >
      <View style={[styles.resourceIcon, { backgroundColor: type.color + '20' }]} accessibilityElementsHidden>
        <Ionicons name={type.icon as any} size={24} color={type.color} />
      </View>
      
      <View style={styles.resourceContent}>
        <View style={styles.resourceHeader}>
          <Text style={styles.resourceTitle} numberOfLines={2}>
            {resource.title}
          </Text>
          <TouchableOpacity 
            onPress={onBookmark}
            style={styles.bookmarkButton}
          >
            <Ionicons 
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'} 
              size={20} 
              color={isBookmarked ? colors.primary : colors.textMuted} 
            />
          </TouchableOpacity>
        </View>
        
        {resource.description && (
          <Text style={styles.resourceDescription} numberOfLines={2}>
            {resource.description}
          </Text>
        )}
        
        <View style={styles.resourceMeta}>
          <View style={[styles.typeBadge, { backgroundColor: type.color + '20' }]}>
            <Text style={[styles.typeText, { color: type.color }]}>
              {type.label}
            </Text>
          </View>
          
          {resource.duration && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{resource.duration}</Text>
            </View>
          )}
          
          {resource.viewCount !== undefined && resource.viewCount > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="eye-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{resource.viewCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FeaturedResourceCard({ resource, onPress }: { resource: Resource; onPress: () => void }) {
  const type = RESOURCE_TYPES[resource.type] || RESOURCE_TYPES.other;
  
  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress}>
      <View style={styles.featuredContent}>
        <View style={[styles.featuredBadge, { backgroundColor: type.color }]}>
          <Ionicons name={type.icon as any} size={16} color="white" />
          <Text style={styles.featuredBadgeText}>Featured</Text>
        </View>
        
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {resource.title}
        </Text>
        
        <Text style={styles.featuredDescription} numberOfLines={2}>
          {resource.description}
        </Text>
        
        <View style={styles.featuredFooter}>
          <Text style={styles.startButton}>Start Learning →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ResourcesScreen() {
  const { token } = useSession();
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock data for demo
  const mockResources: Resource[] = [
    {
      id: '1',
      title: 'How to Write a Standout Resume',
      description: 'Learn the essential elements of crafting a resume that gets noticed by employers.',
      type: 'guide',
      category: 'resume',
      duration: '10 min read',
      viewCount: 1234,
      featured: true,
      url: '#',
    },
    {
      id: '2',
      title: 'Interview Preparation Masterclass',
      description: 'Video series covering common interview questions and how to answer them confidently.',
      type: 'video',
      category: 'interview',
      duration: '45 mins',
      viewCount: 856,
      featured: false,
      url: '#',
    },
    {
      id: '3',
      title: 'Cultural Safety in the Workplace',
      description: 'Understanding and promoting cultural safety in Australian workplaces.',
      type: 'article',
      category: 'cultural',
      duration: '8 min read',
      viewCount: 654,
      featured: false,
      url: '#',
    },
    {
      id: '4',
      title: 'Cover Letter Template',
      description: 'Professional cover letter template with examples for different industries.',
      type: 'template',
      category: 'resume',
      duration: 'Download',
      viewCount: 432,
      featured: false,
      url: '#',
    },
    {
      id: '5',
      title: 'Career Pathways in Healthcare',
      description: 'Explore career opportunities in the healthcare sector for Indigenous Australians.',
      type: 'course',
      category: 'career',
      duration: '2 hours',
      viewCount: 321,
      featured: true,
      url: '#',
    },
  ];

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      // In a real app, we would fetch from API
      // const result = await resourcesApi.getResources({ category: selectedCategory, search: searchQuery });
      // setResources(result.resources);
      
      // For now, use mock data
      setResources(mockResources);
      
      // Fetch bookmarks
      // const bookmarksResult = await resourcesApi.getBookmarks();
      // setBookmarks(bookmarksResult.bookmarks);
    } catch (err) {
      console.error('Failed to fetch resources:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleResourcePress = (resource: Resource) => {
    if (resource.url) {
      // Open URL
      Linking.openURL(resource.url).catch(err => {
        Alert.alert('Error', 'Could not open resource');
      });
    } else {
      Alert.alert('Resource', 'This resource is not available yet.');
    }
  };

  const handleBookmark = async (id: string) => {
    try {
      // await resourcesApi.toggleBookmark(id);
      setBookmarks(prev => 
        prev.includes(id) 
          ? prev.filter(b => b !== id) 
          : [...prev, id]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update bookmark');
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredResources = resources.filter(r => r.featured);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search resources..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Featured Section (only show if no search/filter) */}
        {selectedCategory === 'all' && !searchQuery && featuredResources.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
              {featuredResources.map(resource => (
                <FeaturedResourceCard 
                  key={resource.id} 
                  resource={resource} 
                  onPress={() => handleResourcePress(resource)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.id && styles.categoryChipSelected
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === cat.id && styles.categoryTextSelected
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Resources List */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? 'All Resources' : CATEGORIES.find(c => c.id === selectedCategory)?.label}
          </Text>
          
          {filteredResources.length > 0 ? (
            filteredResources.map(resource => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onPress={() => handleResourcePress(resource)}
                onBookmark={() => handleBookmark(resource.id)}
                isBookmarked={bookmarks.includes(resource.id)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No resources found matching your criteria.</Text>
            </View>
          )}
        </View>
        
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: spacing.md,
    marginBottom: spacing.md,
  },
  featuredScroll: {
    paddingLeft: spacing.md,
  },
  featuredCard: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginRight: spacing.md,
    ...shadows.md,
    overflow: 'hidden',
  },
  featuredContent: {
    padding: spacing.lg,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  featuredBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  featuredDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  startButton: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  categoryContainer: {
    marginVertical: spacing.md,
  },
  categoryScroll: {
    paddingHorizontal: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: colors.text,
  },
  categoryTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: spacing.md,
  },
  resourceCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  resourceContent: {
    flex: 1,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  bookmarkButton: {
    padding: 4,
  },
  resourceDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  resourceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  typeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  spacer: {
    height: 40,
  },
});
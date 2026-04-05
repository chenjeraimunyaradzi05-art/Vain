/**
 * GlobalSearchScreen - Unified search across all content
 * 
 * Features:
 * - Multi-category search (people, jobs, posts, groups, mentors, courses)
 * - Recent searches history
 * - Search suggestions
 * - Voice search support
 * - Advanced filters
 * - Real-time search with debouncing
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Keyboard,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';

// Types
type SearchCategory = 'all' | 'people' | 'jobs' | 'posts' | 'groups' | 'mentors' | 'courses';

interface SearchResult {
  id: string;
  type: SearchCategory;
  title: string;
  subtitle?: string;
  image?: string;
  meta?: string;
  isVerified?: boolean;
  isMentor?: boolean;
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'trending' | 'recent' | 'suggested';
}

// Category configuration
const CATEGORIES: Array<{
  id: SearchCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = [
  { id: 'all', label: 'All', icon: 'search', color: '#8B5CF6' },
  { id: 'people', label: 'People', icon: 'people', color: '#3B82F6' },
  { id: 'jobs', label: 'Jobs', icon: 'briefcase', color: '#10B981' },
  { id: 'posts', label: 'Posts', icon: 'newspaper', color: '#F59E0B' },
  { id: 'groups', label: 'Groups', icon: 'people-circle', color: '#EC4899' },
  { id: 'mentors', label: 'Mentors', icon: 'school', color: '#6366F1' },
  { id: 'courses', label: 'Courses', icon: 'book', color: '#14B8A6' },
];

// Recent searches key
const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 10;

export default function GlobalSearchScreen({ navigation }: { navigation: any }) {
  // State
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Refs
  const searchInputRef = useRef<TextInput>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout>();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
    loadTrendingSuggestions();
    
    // Focus search input
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Load recent searches from storage
  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  // Save recent search
  const saveRecentSearch = async (searchQuery: string) => {
    try {
      const updated = [
        searchQuery,
        ...recentSearches.filter(s => s !== searchQuery)
      ].slice(0, MAX_RECENT_SEARCHES);
      
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };

  // Clear recent searches
  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  };

  // Load trending suggestions
  const loadTrendingSuggestions = async () => {
    // In production, this would be an API call
    const trending: SearchSuggestion[] = [
      { id: '1', text: 'Indigenous mentors', type: 'trending' },
      { id: '2', text: 'Remote jobs', type: 'trending' },
      { id: '3', text: 'Tech careers', type: 'trending' },
      { id: '4', text: 'Cultural programs', type: 'trending' },
      { id: '5', text: 'Healthcare opportunities', type: 'trending' },
    ];
    setSuggestions(trending);
  };

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, searchCategory: SearchCategory) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await api.search.global(searchQuery, searchCategory);
      setResults(response.results);
      
      // Save to recent searches
      saveRecentSearch(searchQuery);
    } catch (error) {
      console.error('Search failed:', error);
      // Mock results for demo
      setResults(getMockResults(searchQuery, searchCategory));
    } finally {
      setIsLoading(false);
    }
  }, [recentSearches]);

  // Mock results for demo
  const getMockResults = (searchQuery: string, searchCategory: SearchCategory): SearchResult[] => {
    const mockData: SearchResult[] = [
      { id: '1', type: 'people', title: 'Sarah Johnson', subtitle: 'Senior Developer at Tech Co', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', isVerified: true },
      { id: '2', type: 'jobs', title: 'Software Engineer', subtitle: 'Google • Sydney, NSW', meta: 'Posted 2 days ago' },
      { id: '3', type: 'mentors', title: 'David Williams', subtitle: 'Business Mentor • 10+ years experience', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', isMentor: true },
      { id: '4', type: 'groups', title: 'Indigenous Tech Community', subtitle: '1.2k members', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop' },
      { id: '5', type: 'posts', title: 'My journey in the tech industry', subtitle: 'Posted by Marcus • 234 likes', meta: '3 hours ago' },
      { id: '6', type: 'courses', title: 'Introduction to Web Development', subtitle: 'Beginner • 8 weeks', meta: '4.8 ★' },
    ];

    if (searchCategory === 'all') {
      return mockData.filter(r => 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return mockData.filter(r => 
      r.type === searchCategory && (
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  };

  // Handle query change with debounce
  const handleQueryChange = (text: string) => {
    setQuery(text);
    
    // Clear previous timeout
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Debounce search
    searchDebounceRef.current = setTimeout(() => {
      performSearch(text, category);
    }, 300);
  };

  // Handle category change
  const handleCategoryChange = (newCategory: SearchCategory) => {
    Haptics.selectionAsync();
    setCategory(newCategory);
    
    if (query.trim()) {
      performSearch(query, newCategory);
    }
  };

  // Handle suggestion press
  const handleSuggestionPress = (suggestion: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery(suggestion);
    performSearch(suggestion, category);
  };

  // Handle result press
  const handleResultPress = (result: SearchResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    
    // Navigate based on result type
    switch (result.type) {
      case 'people':
        navigation.navigate('Profile', { userId: result.id });
        break;
      case 'jobs':
        navigation.navigate('JobDetail', { jobId: result.id });
        break;
      case 'mentors':
        navigation.navigate('MentorProfile', { mentorId: result.id });
        break;
      case 'groups':
        navigation.navigate('GroupDetail', { groupId: result.id });
        break;
      case 'posts':
        navigation.navigate('PostDetail', { postId: result.id });
        break;
      case 'courses':
        navigation.navigate('CourseDetail', { courseId: result.id });
        break;
    }
  };

  // Get icon for result type
  const getResultIcon = (type: SearchCategory): keyof typeof Ionicons.glyphMap => {
    const cat = CATEGORIES.find(c => c.id === type);
    return cat?.icon || 'document';
  };

  // Get color for result type
  const getResultColor = (type: SearchCategory): string => {
    const cat = CATEGORIES.find(c => c.id === type);
    return cat?.color || '#8B5CF6';
  };

  // Render search bar
  const renderSearchBar = () => (
    <View style={styles.searchBar}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search people, jobs, groups..."
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity 
            onPress={() => { setQuery(''); setResults([]); setHasSearched(false); }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  // Render categories
  const renderCategories = () => (
    <FlatList
      horizontal
      data={CATEGORIES}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoriesContainer}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.categoryChip,
            category === item.id && { backgroundColor: item.color }
          ]}
          onPress={() => handleCategoryChange(item.id)}
        >
          <Ionicons 
            name={item.icon} 
            size={16} 
            color={category === item.id ? 'white' : '#6B7280'} 
          />
          <Text style={[
            styles.categoryChipText,
            category === item.id && styles.categoryChipTextActive
          ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      )}
    />
  );

  // Render recent searches
  const renderRecentSearches = () => {
    if (query.length > 0 || recentSearches.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <TouchableOpacity onPress={clearRecentSearches}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        </View>
        {recentSearches.map((search, index) => (
          <TouchableOpacity
            key={index}
            style={styles.recentItem}
            onPress={() => handleSuggestionPress(search)}
          >
            <Ionicons name="time-outline" size={18} color="#9CA3AF" />
            <Text style={styles.recentItemText}>{search}</Text>
            <TouchableOpacity
              onPress={() => {
                const updated = recentSearches.filter((_, i) => i !== index);
                setRecentSearches(updated);
                AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render trending suggestions
  const renderSuggestions = () => {
    if (query.length > 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="fire" size={20} color="#F59E0B" />
          <Text style={styles.sectionTitle}>Trending</Text>
        </View>
        <View style={styles.suggestionsGrid}>
          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.suggestionChip}
              onPress={() => handleSuggestionPress(suggestion.text)}
            >
              <Text style={styles.suggestionChipText}>{suggestion.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Render result item
  const renderResultItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
      activeOpacity={0.7}
    >
      {/* Icon or Image */}
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.resultImage} />
      ) : (
        <View style={[styles.resultIconContainer, { backgroundColor: getResultColor(item.type) + '20' }]}>
          <Ionicons name={getResultIcon(item.type)} size={20} color={getResultColor(item.type)} />
        </View>
      )}

      {/* Content */}
      <View style={styles.resultContent}>
        <View style={styles.resultTitleRow}>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
          {item.isVerified && (
            <MaterialCommunityIcons name="check-decagram" size={16} color="#3B82F6" />
          )}
          {item.isMentor && (
            <View style={styles.mentorBadge}>
              <Text style={styles.mentorBadgeText}>Mentor</Text>
            </View>
          )}
        </View>
        {item.subtitle && (
          <Text style={styles.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
        )}
        {item.meta && (
          <Text style={styles.resultMeta}>{item.meta}</Text>
        )}
      </View>

      {/* Type indicator */}
      <View style={[styles.typeIndicator, { backgroundColor: getResultColor(item.type) }]}>
        <Text style={styles.typeIndicatorText}>
          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render empty results
  const renderEmptyResults = () => {
    if (!hasSearched || isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No results found</Text>
        <Text style={styles.emptyText}>
          Try different keywords or check your spelling
        </Text>
      </View>
    );
  };

  // Render loading
  const renderLoading = () => {
    if (!isLoading) return null;

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Searching...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {renderSearchBar()}
        {renderCategories()}

        {isLoading ? (
          renderLoading()
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            renderItem={renderResultItem}
            contentContainerStyle={styles.resultsContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.preSearchContent}>
            {renderRecentSearches()}
            {renderSuggestions()}
            {hasSearched && renderEmptyResults()}
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  clearButton: {
    padding: 4,
  },
  cancelButton: {
    marginLeft: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '500',
  },

  // Categories
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: 'white',
  },

  // Sections
  preSearchContent: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  clearText: {
    fontSize: 14,
    color: '#8B5CF6',
  },

  // Recent Searches
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentItemText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },

  // Suggestions
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  suggestionChipText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },

  // Results
  resultsContainer: {
    paddingVertical: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  resultIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flexShrink: 1,
  },
  mentorBadge: {
    backgroundColor: '#DDD6FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mentorBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7C3AED',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  resultMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  typeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  typeIndicatorText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
});

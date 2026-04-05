/**
 * StoriesScreen - Success Stories from the Indigenous Community
 * 
 * Features:
 * - Featured success stories with video/image content
 * - Category filtering (career, education, mentorship, community)
 * - Story details with full testimonial
 * - Share and save functionality
 * - Indigenous cultural elements in design
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Animated,
  Share,
  Platform,
  StatusBar,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const FEATURED_HEIGHT = 400;

// Types
interface StoryAuthor {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  location?: string;
  nation?: string; // Indigenous nation/community
}

interface Story {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: StoryAuthor;
  category: 'career' | 'education' | 'mentorship' | 'community' | 'cultural';
  coverImage: string;
  videoUrl?: string;
  publishedAt: string;
  readTime: number;
  likes: number;
  shares: number;
  isSaved: boolean;
  isLiked: boolean;
  tags: string[];
}

// Categories with Indigenous-inspired colors
const CATEGORIES = [
  { id: 'all', label: 'All Stories', color: '#8B5CF6' },
  { id: 'career', label: 'Career', color: '#F59E0B' },
  { id: 'education', label: 'Education', color: '#10B981' },
  { id: 'mentorship', label: 'Mentorship', color: '#3B82F6' },
  { id: 'community', label: 'Community', color: '#EC4899' },
  { id: 'cultural', label: 'Cultural', color: '#EF4444' },
];

// Mock data
const MOCK_STORIES: Story[] = [
  {
    id: '1',
    title: 'From Country to Corporate: My Journey in Tech',
    summary: 'How I bridged two worlds while staying connected to my culture',
    content: `Growing up on Country in the Northern Territory, I never imagined I'd end up working in technology. But here I am, a Senior Software Engineer at a leading tech company, and I've never lost connection to my roots.

My journey started when an elder in my community encouraged me to pursue education. "Our stories need to be told in every language," she said, "including the language of computers."

Through Ngurra Pathways, I found a mentor who understood both worlds – the corporate landscape and the importance of cultural identity. Sarah, a Ngunnawal woman who had walked this path before me, showed me it was possible to succeed without compromising who I am.

Today, I help other Indigenous youth find their path in tech. We don't have to choose between our culture and our careers. We can bring our unique perspectives to make technology more inclusive for everyone.

My advice to young Indigenous people: Your culture is your strength. Bring all of yourself to whatever you do.`,
    author: {
      id: 'u1',
      name: 'Marcus Williams',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      role: 'Senior Software Engineer',
      location: 'Sydney, NSW',
      nation: 'Yolngu',
    },
    category: 'career',
    coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop',
    publishedAt: '2024-01-15T10:00:00Z',
    readTime: 5,
    likes: 234,
    shares: 45,
    isSaved: false,
    isLiked: false,
    tags: ['tech', 'career', 'culture', 'mentorship'],
  },
  {
    id: '2',
    title: 'Education Changed Everything for My Family',
    summary: 'First in my family to graduate university, now helping others do the same',
    content: `When I walked across that stage to receive my degree, I carried the hopes and dreams of generations before me. I am the first in my family to complete university, but I won't be the last.

Education wasn't always accessible for my mob. My grandmother wasn't allowed to attend school past primary level. My mother had to travel hundreds of kilometers just to get a high school education.

But things are changing. Through programs like Ngurra Pathways, more Indigenous students are finding support, scholarships, and most importantly, community.

I'm now a secondary school teacher in a remote community. Every day, I see young people who remind me of myself – full of potential, sometimes unsure of their path. I tell them what I wish someone had told me: "You belong here. Your dreams are valid. And your community is behind you."`,
    author: {
      id: 'u2',
      name: 'Emma Thompson',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
      role: 'High School Teacher',
      location: 'Alice Springs, NT',
      nation: 'Arrernte',
    },
    category: 'education',
    coverImage: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=600&fit=crop',
    publishedAt: '2024-01-10T10:00:00Z',
    readTime: 4,
    likes: 189,
    shares: 67,
    isSaved: true,
    isLiked: true,
    tags: ['education', 'teaching', 'community', 'first-generation'],
  },
  {
    id: '3',
    title: 'Finding My Mentor, Finding Myself',
    summary: 'How mentorship helped me reconnect with my identity',
    content: `I grew up away from my Country, in the suburbs of Melbourne. I always knew I was Indigenous, but I felt disconnected from my culture. Imposter syndrome followed me everywhere.

When I joined Ngurra Pathways, I was matched with Uncle David, a Gunditjmara elder who became my mentor. He didn't just help me with my career – he helped me understand who I am.

"Culture isn't just about where you live," he told me. "It's about who you are, how you treat others, and how you carry yourself in the world."

Through our sessions, I learned about my ancestors, my language, and my connection to Country. I also gained the confidence to pursue my dream of starting my own business.

Today, I run a successful consulting firm that helps companies understand and embrace Indigenous perspectives. And I pay it forward by mentoring young people who, like me, are on a journey of self-discovery.`,
    author: {
      id: 'u3',
      name: 'James Chen-Walker',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
      role: 'Founder & CEO',
      location: 'Melbourne, VIC',
      nation: 'Wiradjuri',
    },
    category: 'mentorship',
    coverImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
    publishedAt: '2024-01-05T10:00:00Z',
    readTime: 6,
    likes: 312,
    shares: 89,
    isSaved: false,
    isLiked: false,
    tags: ['mentorship', 'identity', 'business', 'culture'],
  },
];

// Featured Story Card Component
const FeaturedStoryCard: React.FC<{
  story: Story;
  onPress: () => void;
  onSave: () => void;
  onShare: () => void;
}> = ({ story, onPress, onSave, onShare }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.featuredCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Image source={{ uri: story.coverImage }} style={styles.featuredImage} />
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.featuredGradient}
        />

        {/* Category Badge */}
        <View style={[
          styles.categoryBadge,
          { backgroundColor: CATEGORIES.find(c => c.id === story.category)?.color || '#8B5CF6' }
        ]}>
          <Text style={styles.categoryBadgeText}>
            {story.category.charAt(0).toUpperCase() + story.category.slice(1)}
          </Text>
        </View>

        {/* Video indicator */}
        {story.videoUrl && (
          <View style={styles.videoIndicator}>
            <Ionicons name="play-circle" size={48} color="white" />
          </View>
        )}

        {/* Content */}
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTitle} numberOfLines={2}>
            {story.title}
          </Text>
          <Text style={styles.featuredSummary} numberOfLines={2}>
            {story.summary}
          </Text>

          {/* Author */}
          <View style={styles.featuredAuthor}>
            <Image 
              source={{ uri: story.author.avatar }} 
              style={styles.featuredAuthorAvatar}
            />
            <View style={styles.featuredAuthorInfo}>
              <Text style={styles.featuredAuthorName}>{story.author.name}</Text>
              <Text style={styles.featuredAuthorNation}>{story.author.nation}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.featuredActions}>
            <View style={styles.featuredStats}>
              <Ionicons name="heart" size={16} color="white" />
              <Text style={styles.featuredStatText}>{story.likes}</Text>
              <Ionicons name="time-outline" size={16} color="white" style={{ marginLeft: 12 }} />
              <Text style={styles.featuredStatText}>{story.readTime} min read</Text>
            </View>
            <View style={styles.featuredActionButtons}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={(e) => { e.stopPropagation(); onSave(); }}
              >
                <Ionicons 
                  name={story.isSaved ? 'bookmark' : 'bookmark-outline'} 
                  size={22} 
                  color="white" 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={(e) => { e.stopPropagation(); onShare(); }}
              >
                <Ionicons name="share-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Story Card Component
const StoryCard: React.FC<{
  story: Story;
  onPress: () => void;
  onSave: () => void;
}> = ({ story, onPress, onSave }) => {
  return (
    <TouchableOpacity style={styles.storyCard} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: story.coverImage }} style={styles.storyImage} />
      
      <View style={styles.storyContent}>
        <View style={[
          styles.storyCategory,
          { backgroundColor: CATEGORIES.find(c => c.id === story.category)?.color + '20' || '#8B5CF620' }
        ]}>
          <Text style={[
            styles.storyCategoryText,
            { color: CATEGORIES.find(c => c.id === story.category)?.color || '#8B5CF6' }
          ]}>
            {story.category.charAt(0).toUpperCase() + story.category.slice(1)}
          </Text>
        </View>

        <Text style={styles.storyTitle} numberOfLines={2}>{story.title}</Text>
        <Text style={styles.storySummary} numberOfLines={2}>{story.summary}</Text>

        <View style={styles.storyFooter}>
          <View style={styles.storyAuthor}>
            <Image 
              source={{ uri: story.author.avatar }} 
              style={styles.storyAuthorAvatar}
            />
            <View>
              <Text style={styles.storyAuthorName}>{story.author.name}</Text>
              <Text style={styles.storyAuthorNation}>{story.author.nation}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onSave} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons 
              name={story.isSaved ? 'bookmark' : 'bookmark-outline'} 
              size={20} 
              color={story.isSaved ? '#8B5CF6' : '#6B7280'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Story Detail Modal
const StoryDetailModal: React.FC<{
  story: Story | null;
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  onLike: () => void;
  onShare: () => void;
}> = ({ story, visible, onClose, onSave, onLike, onShare }) => {
  if (!story) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.modalHeaderActions}>
            <TouchableOpacity onPress={onLike} style={styles.modalAction}>
              <Ionicons 
                name={story.isLiked ? 'heart' : 'heart-outline'} 
                size={24} 
                color={story.isLiked ? '#EF4444' : '#6B7280'} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onSave} style={styles.modalAction}>
              <Ionicons 
                name={story.isSaved ? 'bookmark' : 'bookmark-outline'} 
                size={24} 
                color={story.isSaved ? '#8B5CF6' : '#6B7280'} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onShare} style={styles.modalAction}>
              <Ionicons name="share-outline" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Cover Image */}
          <Image source={{ uri: story.coverImage }} style={styles.modalCoverImage} />

          {/* Category */}
          <View style={[
            styles.modalCategory,
            { backgroundColor: CATEGORIES.find(c => c.id === story.category)?.color || '#8B5CF6' }
          ]}>
            <Text style={styles.modalCategoryText}>
              {story.category.charAt(0).toUpperCase() + story.category.slice(1)}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.modalTitle}>{story.title}</Text>

          {/* Author Info */}
          <View style={styles.modalAuthorContainer}>
            <Image 
              source={{ uri: story.author.avatar }} 
              style={styles.modalAuthorAvatar}
            />
            <View style={styles.modalAuthorInfo}>
              <Text style={styles.modalAuthorName}>{story.author.name}</Text>
              <Text style={styles.modalAuthorDetails}>
                {story.author.role} • {story.author.location}
              </Text>
              <Text style={styles.modalAuthorNation}>{story.author.nation} Nation</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.modalStats}>
            <View style={styles.modalStat}>
              <Ionicons name="heart" size={18} color="#EF4444" />
              <Text style={styles.modalStatText}>{story.likes} likes</Text>
            </View>
            <View style={styles.modalStat}>
              <Ionicons name="share-social" size={18} color="#3B82F6" />
              <Text style={styles.modalStatText}>{story.shares} shares</Text>
            </View>
            <View style={styles.modalStat}>
              <Ionicons name="time-outline" size={18} color="#6B7280" />
              <Text style={styles.modalStatText}>{story.readTime} min read</Text>
            </View>
          </View>

          {/* Content */}
          <Text style={styles.modalContentText}>{story.content}</Text>

          {/* Tags */}
          <View style={styles.modalTags}>
            {story.tags.map((tag, index) => (
              <View key={index} style={styles.modalTag}>
                <Text style={styles.modalTagText}>#{tag}</Text>
              </View>
            ))}
          </View>

          {/* Spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// Main Screen Component
export default function StoriesScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stories, setStories] = useState<Story[]>(MOCK_STORIES);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Filter stories by category
  const filteredStories = selectedCategory === 'all'
    ? stories
    : stories.filter(s => s.category === selectedCategory);

  const featuredStory = filteredStories[0];
  const otherStories = filteredStories.slice(1);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  }, []);

  const handleStoryPress = useCallback((story: Story) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStory(story);
    setDetailModalVisible(true);
  }, []);

  const handleSave = useCallback((storyId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStories(prev => prev.map(s => 
      s.id === storyId ? { ...s, isSaved: !s.isSaved } : s
    ));
  }, []);

  const handleLike = useCallback((storyId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStories(prev => prev.map(s => 
      s.id === storyId ? { 
        ...s, 
        isLiked: !s.isLiked,
        likes: s.isLiked ? s.likes - 1 : s.likes + 1
      } : s
    ));
    // Update selected story if it's the one being liked
    if (selectedStory?.id === storyId) {
      setSelectedStory(prev => prev ? {
        ...prev,
        isLiked: !prev.isLiked,
        likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1
      } : null);
    }
  }, [selectedStory]);

  const handleShare = useCallback(async (story: Story) => {
    try {
      await Share.share({
        message: `Check out this inspiring story: "${story.title}" by ${story.author.name} on Ngurra Pathways`,
        title: story.title,
      });
      // Update share count
      setStories(prev => prev.map(s =>
        s.id === story.id ? { ...s, shares: s.shares + 1 } : s
      ));
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    Haptics.selectionAsync();
    setSelectedCategory(categoryId);
  }, []);

  // Render category tabs
  const renderCategories = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesContainer}
      contentContainerStyle={styles.categoriesContent}
    >
      {CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryTab,
            selectedCategory === category.id && { backgroundColor: category.color }
          ]}
          onPress={() => handleCategoryChange(category.id)}
        >
          <Text style={[
            styles.categoryTabText,
            selectedCategory === category.id && styles.categoryTabTextActive
          ]}>
            {category.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Render header
  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Title Section */}
      <View style={styles.titleSection}>
        <MaterialCommunityIcons 
          name="fire" 
          size={28} 
          color="#F59E0B" 
        />
        <Text style={styles.headerTitle}>Success Stories</Text>
      </View>
      <Text style={styles.headerSubtitle}>
        Inspiring journeys from our Indigenous community
      </Text>

      {/* Categories */}
      {renderCategories()}

      {/* Featured Story */}
      {featuredStory && (
        <FeaturedStoryCard
          story={featuredStory}
          onPress={() => handleStoryPress(featuredStory)}
          onSave={() => handleSave(featuredStory.id)}
          onShare={() => handleShare(featuredStory)}
        />
      )}

      {/* Section Title */}
      {otherStories.length > 0 && (
        <Text style={styles.sectionTitle}>More Stories</Text>
      )}
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="book-open-variant" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No stories yet</Text>
      <Text style={styles.emptyText}>
        Check back soon for inspiring stories from our community
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={otherStories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StoryCard
            story={item}
            onPress={() => handleStoryPress(item)}
            onSave={() => handleSave(item.id)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={filteredStories.length === 0 ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Story Detail Modal */}
      <StoryDetailModal
        story={selectedStory}
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        onSave={() => selectedStory && handleSave(selectedStory.id)}
        onLike={() => selectedStory && handleLike(selectedStory.id)}
        onShare={() => selectedStory && handleShare(selectedStory)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    paddingBottom: 24,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },

  // Categories
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesContent: {
    paddingRight: 16,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryTabTextActive: {
    color: 'white',
  },

  // Featured Card
  featuredCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  featuredImage: {
    width: '100%',
    height: FEATURED_HEIGHT,
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: FEATURED_HEIGHT * 0.7,
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  videoIndicator: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -24,
    marginTop: -24,
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  featuredSummary: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
    lineHeight: 20,
  },
  featuredAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredAuthorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'white',
  },
  featuredAuthorInfo: {
    marginLeft: 10,
  },
  featuredAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  featuredAuthorNation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  featuredActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredStatText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 4,
  },
  featuredActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Title
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },

  // Story Card
  storyCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  storyImage: {
    width: 100,
    height: 120,
  },
  storyContent: {
    flex: 1,
    padding: 12,
  },
  storyCategory: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  storyCategoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  storyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  storySummary: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 8,
  },
  storyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storyAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyAuthorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  storyAuthorName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },
  storyAuthorNation: {
    fontSize: 10,
    color: '#9CA3AF',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: 16,
  },
  modalAction: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
  modalCoverImage: {
    width: '100%',
    height: 240,
  },
  modalCategory: {
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modalCategoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginHorizontal: 20,
    marginTop: 16,
    lineHeight: 32,
  },
  modalAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalAuthorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  modalAuthorInfo: {
    marginLeft: 12,
  },
  modalAuthorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalAuthorDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  modalAuthorNation: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
    marginTop: 2,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginHorizontal: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 16,
  },
  modalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalStatText: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalContentText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
    marginHorizontal: 20,
    marginTop: 20,
  },
  modalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 20,
    marginTop: 24,
    gap: 8,
  },
  modalTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modalTagText: {
    fontSize: 14,
    color: '#6B7280',
  },
});

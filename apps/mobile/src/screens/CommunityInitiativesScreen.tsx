/**
 * Community Initiatives Screen
 * 
 * Displays community programs, volunteer opportunities, and initiatives
 * for Aboriginal and Torres Strait Islander communities.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

// Types
interface Initiative {
  id: string;
  title: string;
  description: string;
  type: InitiativeType;
  category: InitiativeCategory;
  status: 'ACTIVE' | 'COMPLETED' | 'UPCOMING';
  region: string;
  nation?: string;
  startDate: string;
  endDate?: string;
  organizer: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  currentParticipants: number;
  maxParticipants?: number;
  volunteerHoursLogged: number;
  fundingGoal?: number;
  fundingRaised?: number;
  imageUrl?: string;
  isElderLed: boolean;
  isYouthFocused: boolean;
  tags: string[];
  milestones?: Milestone[];
}

type InitiativeType = 
  | 'PROGRAM'
  | 'PROJECT'
  | 'EVENT'
  | 'CAMPAIGN'
  | 'WORKSHOP'
  | 'MENTORSHIP'
  | 'TRAINING'
  | 'CULTURAL_PRESERVATION'
  | 'LANGUAGE_REVITALIZATION'
  | 'LAND_CARE'
  | 'HEALTH_WELLBEING'
  | 'EDUCATION'
  | 'ECONOMIC_DEVELOPMENT';

type InitiativeCategory = 
  | 'EMPLOYMENT'
  | 'EDUCATION'
  | 'CULTURE'
  | 'HEALTH'
  | 'ENVIRONMENT'
  | 'YOUTH'
  | 'ELDERS'
  | 'WOMEN'
  | 'BUSINESS'
  | 'TECHNOLOGY'
  | 'ARTS'
  | 'SPORTS';

interface Milestone {
  id: string;
  title: string;
  targetDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

interface VolunteerOpportunity {
  id: string;
  initiativeId: string;
  initiativeTitle: string;
  title: string;
  description: string;
  skillsRequired: string[];
  timeCommitment: string;
  location: string;
  isRemote: boolean;
  spotsAvailable: number;
}

const COLORS = {
  primary: '#7C3AED',
  secondary: '#F59E0B',
  background: '#0F172A',
  card: '#1E293B',
  cardBorder: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  accent: '#10B981',
  warning: '#EF4444',
  elder: '#EC4899',
  youth: '#3B82F6',
};

const TYPE_ICONS: Record<string, string> = {
  PROGRAM: 'apps',
  PROJECT: 'construct',
  EVENT: 'calendar',
  CAMPAIGN: 'megaphone',
  WORKSHOP: 'school',
  MENTORSHIP: 'people',
  TRAINING: 'barbell',
  CULTURAL_PRESERVATION: 'globe',
  LANGUAGE_REVITALIZATION: 'chatbubbles',
  LAND_CARE: 'leaf',
  HEALTH_WELLBEING: 'heart',
  EDUCATION: 'book',
  ECONOMIC_DEVELOPMENT: 'business',
};

const CATEGORY_COLORS: Record<string, string> = {
  EMPLOYMENT: '#3B82F6',
  EDUCATION: '#8B5CF6',
  CULTURE: '#EC4899',
  HEALTH: '#EF4444',
  ENVIRONMENT: '#10B981',
  YOUTH: '#F59E0B',
  ELDERS: '#F97316',
  WOMEN: '#D946EF',
  BUSINESS: '#6366F1',
  TECHNOLOGY: '#06B6D4',
  ARTS: '#A855F7',
  SPORTS: '#22C55E',
};

type Tab = 'all' | 'volunteer' | 'elder' | 'youth' | 'my';

export default function CommunityInitiativesScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [volunteerOpportunities, setVolunteerOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InitiativeCategory | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data - in production, fetch from API
      const mockInitiatives: Initiative[] = [
        {
          id: '1',
          title: 'Language Revival Program',
          description: 'A community-led initiative to revitalize and teach traditional languages to young people.',
          type: 'LANGUAGE_REVITALIZATION',
          category: 'CULTURE',
          status: 'ACTIVE',
          region: 'Sydney',
          nation: 'Dharug',
          startDate: '2024-01-15',
          organizer: { id: '1', name: 'Dharug Dalang' },
          currentParticipants: 45,
          maxParticipants: 60,
          volunteerHoursLogged: 350,
          isElderLed: true,
          isYouthFocused: true,
          tags: ['language', 'culture', 'youth'],
          milestones: [
            { id: '1', title: 'Curriculum developed', targetDate: '2024-02-01', status: 'COMPLETED' },
            { id: '2', title: 'First cohort enrolled', targetDate: '2024-03-01', status: 'COMPLETED' },
            { id: '3', title: '100 students reached', targetDate: '2024-06-01', status: 'IN_PROGRESS' },
          ],
        },
        {
          id: '2',
          title: 'Indigenous Business Accelerator',
          description: 'Supporting Aboriginal entrepreneurs to start and grow their businesses.',
          type: 'ECONOMIC_DEVELOPMENT',
          category: 'BUSINESS',
          status: 'ACTIVE',
          region: 'Melbourne',
          startDate: '2024-02-01',
          organizer: { id: '2', name: 'Kinaway' },
          currentParticipants: 25,
          maxParticipants: 30,
          volunteerHoursLogged: 180,
          fundingGoal: 50000,
          fundingRaised: 35000,
          isElderLed: false,
          isYouthFocused: false,
          tags: ['business', 'entrepreneurship', 'mentorship'],
        },
        {
          id: '3',
          title: 'Elders Wellbeing Circle',
          description: 'Weekly gatherings for Elders focusing on health, connection, and cultural sharing.',
          type: 'HEALTH_WELLBEING',
          category: 'ELDERS',
          status: 'ACTIVE',
          region: 'Brisbane',
          nation: 'Turrbal',
          startDate: '2023-06-01',
          organizer: { id: '3', name: 'Murri Health' },
          currentParticipants: 30,
          volunteerHoursLogged: 520,
          isElderLed: true,
          isYouthFocused: false,
          tags: ['elders', 'health', 'community'],
        },
        {
          id: '4',
          title: 'Youth Leadership Camp',
          description: 'Annual camp developing leadership skills and cultural connection for young mob.',
          type: 'TRAINING',
          category: 'YOUTH',
          status: 'UPCOMING',
          region: 'Perth',
          nation: 'Noongar',
          startDate: '2024-12-15',
          endDate: '2024-12-22',
          organizer: { id: '4', name: 'Noongar Youth' },
          currentParticipants: 0,
          maxParticipants: 50,
          volunteerHoursLogged: 0,
          isElderLed: false,
          isYouthFocused: true,
          tags: ['youth', 'leadership', 'culture'],
        },
        {
          id: '5',
          title: 'Country Care Project',
          description: 'Traditional land management practices combined with modern conservation.',
          type: 'LAND_CARE',
          category: 'ENVIRONMENT',
          status: 'ACTIVE',
          region: 'Cairns',
          startDate: '2023-09-01',
          organizer: { id: '5', name: 'Rainforest Rangers' },
          currentParticipants: 18,
          volunteerHoursLogged: 890,
          isElderLed: true,
          isYouthFocused: false,
          tags: ['environment', 'country', 'conservation'],
        },
      ];

      const mockOpportunities: VolunteerOpportunity[] = [
        {
          id: '1',
          initiativeId: '1',
          initiativeTitle: 'Language Revival Program',
          title: 'Language Tutor Assistant',
          description: 'Help facilitate language learning sessions with community members.',
          skillsRequired: ['Teaching', 'Patience', 'Cultural awareness'],
          timeCommitment: '4 hours/week',
          location: 'Sydney',
          isRemote: false,
          spotsAvailable: 5,
        },
        {
          id: '2',
          initiativeId: '2',
          initiativeTitle: 'Indigenous Business Accelerator',
          title: 'Business Mentor',
          description: 'Provide mentorship to Indigenous entrepreneurs in your area of expertise.',
          skillsRequired: ['Business experience', 'Mentorship skills'],
          timeCommitment: '2 hours/week',
          location: 'Virtual',
          isRemote: true,
          spotsAvailable: 10,
        },
        {
          id: '3',
          initiativeId: '5',
          initiativeTitle: 'Country Care Project',
          title: 'Environmental Volunteer',
          description: 'Join weekend activities restoring and caring for Country.',
          skillsRequired: ['Physical fitness', 'Love for nature'],
          timeCommitment: '1 day/month',
          location: 'Cairns',
          isRemote: false,
          spotsAvailable: 20,
        },
      ];

      setInitiatives(mockInitiatives);
      setVolunteerOpportunities(mockOpportunities);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const getFilteredInitiatives = () => {
    let filtered = initiatives;

    // Apply tab filter
    switch (activeTab) {
      case 'elder':
        filtered = filtered.filter(i => i.isElderLed);
        break;
      case 'youth':
        filtered = filtered.filter(i => i.isYouthFocused);
        break;
      case 'my':
        // In production, filter by user's joined initiatives
        filtered = [];
        break;
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(i => i.category === selectedCategory);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(query) ||
        i.description.toLowerCase().includes(query) ||
        i.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const handleJoinInitiative = (initiativeId: string) => {
    // API call would go here
    console.log('Joining initiative:', initiativeId);
  };

  const handleVolunteer = (opportunityId: string) => {
    // API call would go here
    console.log('Volunteering for:', opportunityId);
  };

  const renderTabs = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      {[
        { key: 'all', label: 'All Initiatives', icon: 'grid' },
        { key: 'volunteer', label: 'Volunteer', icon: 'hand-left' },
        { key: 'elder', label: 'Elder-Led', icon: 'people' },
        { key: 'youth', label: 'Youth', icon: 'school' },
        { key: 'my', label: 'My Initiatives', icon: 'heart' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key as Tab)}
        >
          <Ionicons 
            name={tab.icon as any} 
            size={18} 
            color={activeTab === tab.key ? '#fff' : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderCategoryFilters = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.categoryFilters}
    >
      {Object.keys(CATEGORY_COLORS).map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryChip,
            selectedCategory === category && { backgroundColor: CATEGORY_COLORS[category] },
          ]}
          onPress={() => setSelectedCategory(
            selectedCategory === category ? null : category as InitiativeCategory
          )}
        >
          <Text style={[
            styles.categoryChipText,
            selectedCategory === category && { color: '#fff' },
          ]}>
            {category.replace('_', ' ')}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderImpactStats = () => (
    <View style={styles.impactSection}>
      <Text style={styles.sectionTitle}>Community Impact</Text>
      <View style={styles.impactCards}>
        <View style={styles.impactCard}>
          <Ionicons name="people" size={24} color={COLORS.primary} />
          <Text style={styles.impactNumber}>{initiatives.reduce((sum, i) => sum + i.currentParticipants, 0)}</Text>
          <Text style={styles.impactLabel}>Participants</Text>
        </View>
        <View style={styles.impactCard}>
          <Ionicons name="time" size={24} color={COLORS.accent} />
          <Text style={styles.impactNumber}>{initiatives.reduce((sum, i) => sum + i.volunteerHoursLogged, 0)}</Text>
          <Text style={styles.impactLabel}>Volunteer Hours</Text>
        </View>
        <View style={styles.impactCard}>
          <Ionicons name="flag" size={24} color={COLORS.secondary} />
          <Text style={styles.impactNumber}>{initiatives.filter(i => i.status === 'ACTIVE').length}</Text>
          <Text style={styles.impactLabel}>Active Programs</Text>
        </View>
      </View>
    </View>
  );

  const renderInitiativeCard = (initiative: Initiative) => (
    <TouchableOpacity
      key={initiative.id}
      style={styles.initiativeCard}
      onPress={() => {
        setSelectedInitiative(initiative);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.initiativeHeader}>
        <View style={[
          styles.typeIconContainer,
          { backgroundColor: CATEGORY_COLORS[initiative.category] + '20' },
        ]}>
          <Ionicons 
            name={TYPE_ICONS[initiative.type] as any || 'apps'} 
            size={20} 
            color={CATEGORY_COLORS[initiative.category]} 
          />
        </View>
        <View style={styles.initiativeBadges}>
          {initiative.isElderLed && (
            <View style={[styles.badge, { backgroundColor: COLORS.elder + '20' }]}>
              <Text style={[styles.badgeText, { color: COLORS.elder }]}>Elder-Led</Text>
            </View>
          )}
          {initiative.isYouthFocused && (
            <View style={[styles.badge, { backgroundColor: COLORS.youth + '20' }]}>
              <Text style={[styles.badgeText, { color: COLORS.youth }]}>Youth</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.initiativeTitle}>{initiative.title}</Text>
      <Text style={styles.initiativeDescription} numberOfLines={2}>
        {initiative.description}
      </Text>

      <View style={styles.initiativeMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="location" size={14} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>
            {initiative.nation ? `${initiative.nation} Country, ` : ''}{initiative.region}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="people" size={14} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>
            {initiative.currentParticipants}
            {initiative.maxParticipants && ` / ${initiative.maxParticipants}`}
          </Text>
        </View>
      </View>

      {initiative.fundingGoal && (
        <View style={styles.fundingProgress}>
          <View style={styles.fundingHeader}>
            <Text style={styles.fundingText}>
              ${(initiative.fundingRaised || 0).toLocaleString()} raised
            </Text>
            <Text style={styles.fundingGoalText}>
              of ${initiative.fundingGoal.toLocaleString()}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(((initiative.fundingRaised || 0) / initiative.fundingGoal) * 100, 100)}%` },
              ]} 
            />
          </View>
        </View>
      )}

      <View style={styles.initiativeFooter}>
        <View style={[
          styles.statusBadge,
          initiative.status === 'ACTIVE' && { backgroundColor: COLORS.accent + '20' },
          initiative.status === 'UPCOMING' && { backgroundColor: COLORS.secondary + '20' },
          initiative.status === 'COMPLETED' && { backgroundColor: COLORS.textSecondary + '20' },
        ]}>
          <Text style={[
            styles.statusText,
            initiative.status === 'ACTIVE' && { color: COLORS.accent },
            initiative.status === 'UPCOMING' && { color: COLORS.secondary },
            initiative.status === 'COMPLETED' && { color: COLORS.textSecondary },
          ]}>
            {initiative.status}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const renderVolunteerOpportunity = (opportunity: VolunteerOpportunity) => (
    <View key={opportunity.id} style={styles.volunteerCard}>
      <View style={styles.volunteerHeader}>
        <Text style={styles.volunteerTitle}>{opportunity.title}</Text>
        <View style={styles.spotsAvailable}>
          <Text style={styles.spotsText}>{opportunity.spotsAvailable} spots</Text>
        </View>
      </View>
      
      <Text style={styles.volunteerInitiative}>{opportunity.initiativeTitle}</Text>
      <Text style={styles.volunteerDescription}>{opportunity.description}</Text>
      
      <View style={styles.volunteerMeta}>
        <View style={styles.metaItem}>
          <Ionicons 
            name={opportunity.isRemote ? 'videocam' : 'location'} 
            size={14} 
            color={COLORS.textSecondary} 
          />
          <Text style={styles.metaText}>{opportunity.location}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time" size={14} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{opportunity.timeCommitment}</Text>
        </View>
      </View>
      
      <View style={styles.skillsContainer}>
        {opportunity.skillsRequired.map((skill, index) => (
          <View key={index} style={styles.skillChip}>
            <Text style={styles.skillText}>{skill}</Text>
          </View>
        ))}
      </View>
      
      <TouchableOpacity 
        style={styles.volunteerButton}
        onPress={() => handleVolunteer(opportunity.id)}
      >
        <Ionicons name="hand-left" size={18} color="#fff" />
        <Text style={styles.volunteerButtonText}>Volunteer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDetailModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowDetailModal(false)}>
            <Text style={styles.modalClose}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="share-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        
        {selectedInitiative && (
          <ScrollView style={styles.modalContent}>
            <View style={[
              styles.modalTypeBadge,
              { backgroundColor: CATEGORY_COLORS[selectedInitiative.category] + '20' },
            ]}>
              <Text style={[
                styles.modalTypeBadgeText,
                { color: CATEGORY_COLORS[selectedInitiative.category] },
              ]}>
                {selectedInitiative.type.replace('_', ' ')}
              </Text>
            </View>
            
            <Text style={styles.modalTitle}>{selectedInitiative.title}</Text>
            
            {selectedInitiative.nation && (
              <Text style={styles.modalNation}>
                <Ionicons name="earth" size={14} color={COLORS.secondary} /> {selectedInitiative.nation} Country
              </Text>
            )}
            
            <View style={styles.modalStats}>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatValue}>{selectedInitiative.currentParticipants}</Text>
                <Text style={styles.modalStatLabel}>Participants</Text>
              </View>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatValue}>{selectedInitiative.volunteerHoursLogged}</Text>
                <Text style={styles.modalStatLabel}>Hours</Text>
              </View>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatValue}>
                  {selectedInitiative.milestones?.filter(m => m.status === 'COMPLETED').length || 0}
                </Text>
                <Text style={styles.modalStatLabel}>Milestones</Text>
              </View>
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>About</Text>
              <Text style={styles.modalDescription}>{selectedInitiative.description}</Text>
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Organizer</Text>
              <Text style={styles.modalDescription}>{selectedInitiative.organizer.name}</Text>
            </View>
            
            {selectedInitiative.milestones && selectedInitiative.milestones.length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Milestones</Text>
                {selectedInitiative.milestones.map((milestone) => (
                  <View key={milestone.id} style={styles.milestoneItem}>
                    <Ionicons 
                      name={
                        milestone.status === 'COMPLETED' ? 'checkmark-circle' :
                        milestone.status === 'IN_PROGRESS' ? 'time' : 'ellipse-outline'
                      } 
                      size={20} 
                      color={
                        milestone.status === 'COMPLETED' ? COLORS.accent :
                        milestone.status === 'IN_PROGRESS' ? COLORS.secondary : COLORS.textSecondary
                      } 
                    />
                    <View style={styles.milestoneContent}>
                      <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                      <Text style={styles.milestoneDate}>
                        {format(new Date(milestone.targetDate), 'MMM d, yyyy')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {selectedInitiative.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.joinButton}
                onPress={() => handleJoinInitiative(selectedInitiative.id)}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.joinButtonText}>Join Initiative</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareButton}>
                <Ionicons name="heart-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading community initiatives...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search initiatives..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {renderTabs()}
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {activeTab !== 'volunteer' && renderImpactStats()}
        
        {activeTab !== 'volunteer' && activeTab !== 'my' && renderCategoryFilters()}
        
        {activeTab === 'volunteer' ? (
          <View style={styles.volunteerSection}>
            <Text style={styles.sectionTitle}>Volunteer Opportunities</Text>
            <Text style={styles.sectionSubtitle}>Contribute your skills and time to community initiatives</Text>
            {volunteerOpportunities.map(renderVolunteerOpportunity)}
          </View>
        ) : (
          <View style={styles.initiativesSection}>
            {getFilteredInitiatives().length > 0 ? (
              getFilteredInitiatives().map(renderInitiativeCard)
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="leaf" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyStateTitle}>No initiatives found</Text>
                <Text style={styles.emptyStateText}>
                  {activeTab === 'my' 
                    ? "You haven't joined any initiatives yet"
                    : 'Try adjusting your filters or search'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      
      {renderDetailModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: 12,
    color: COLORS.text,
    fontSize: 16,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    marginLeft: 8,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  categoryFilters: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  categoryChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  scrollView: {
    flex: 1,
  },
  impactSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  impactCards: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  impactCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  impactNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  impactLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  initiativesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  initiativeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  initiativeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initiativeBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  initiativeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  initiativeDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  initiativeMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  fundingProgress: {
    marginBottom: 12,
  },
  fundingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fundingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  fundingGoalText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  initiativeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  volunteerSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  volunteerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  volunteerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  volunteerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  spotsAvailable: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spotsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  volunteerInitiative: {
    fontSize: 13,
    color: COLORS.primary,
    marginBottom: 8,
  },
  volunteerDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  volunteerMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  skillChip: {
    backgroundColor: COLORS.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 12,
    color: COLORS.text,
  },
  volunteerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  volunteerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalClose: {
    color: COLORS.primary,
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  modalTypeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  modalNation: {
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: 20,
  },
  modalStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 20,
  },
  modalStat: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  milestoneDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  joinButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
});

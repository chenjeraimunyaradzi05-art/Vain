/**
 * Cultural Calendar Screen
 * Displays Indigenous cultural events and significant dates
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useSession } from '../hooks/useSession';
import { culturalEventsApi } from '../services/api';

interface CategoryConfig {
  icon: string;
  color: string;
  label: string;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  ceremony: { icon: 'moon-outline', color: '#A855F7', label: 'Ceremony' },
  celebration: { icon: 'star-outline', color: '#EAB308', label: 'Celebration' },
  naidoc: { icon: 'heart-outline', color: '#EF4444', label: 'NAIDOC' },
  reconciliation: { icon: 'people-outline', color: '#3B82F6', label: 'Reconciliation' },
  memorial: { icon: 'leaf-outline', color: '#64748B', label: 'Memorial' },
  education: { icon: 'book-outline', color: '#22C55E', label: 'Education' },
  community: { icon: 'people-outline', color: '#6366F1', label: 'Community' },
  other: { icon: 'calendar-outline', color: '#64748B', label: 'Other' },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface CulturalEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  category: string;
}

interface SignificantDate {
  id: string;
  name: string;
  description?: string;
  date: string;
  category: string;
  isNational?: boolean;
}

function EventCard({ event }: { event: CulturalEvent }) {
  const category = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.other;
  const startDate = new Date(event.startDate);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-AU', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const accessibilityLabel = `${event.title}. ${category.label} event. ${formatDate(startDate)}. ${event.location ? `At ${event.location}.` : ''} ${event.description || ''}`;

  return (
    <View 
      style={styles.eventCard}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.eventIcon, { backgroundColor: category.color + '20' }]} accessibilityElementsHidden>
        <Ionicons name={category.icon as any} size={24} color={category.color} />
      </View>
      
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        
        {event.description && (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description}
          </Text>
        )}
        
        <View style={styles.eventMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(startDate)}</Text>
          </View>
          
          {event.location && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{event.location}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.categoryBadge}>
          <Text style={[styles.categoryText, { color: category.color }]}>
            {category.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SignificantDateCard({ date }: { date: SignificantDate }) {
  const category = CATEGORY_CONFIG[date.category] || CATEGORY_CONFIG.other;
  const eventDate = new Date(date.date);

  return (
    <View style={[styles.significantDateCard, { borderLeftColor: category.color }]}>
      <View style={styles.dateNumber}>
        <Text style={styles.dateDay}>{eventDate.getDate()}</Text>
        <Text style={styles.dateMonth}>
          {MONTHS[eventDate.getMonth()].substring(0, 3)}
        </Text>
      </View>
      
      <View style={styles.dateContent}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateName}>{date.name}</Text>
          {date.isNational && (
            <View style={styles.nationalBadge}>
              <Text style={styles.nationalText}>National</Text>
            </View>
          )}
        </View>
        <Text style={styles.dateDescription} numberOfLines={2}>
          {date.description}
        </Text>
      </View>
    </View>
  );
}

export default function CulturalCalendarScreen() {
  const { token } = useSession();
  const [events, setEvents] = useState<CulturalEvent[]>([]);
  const [significantDates, setSignificantDates] = useState<SignificantDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      const [eventsRes, datesRes] = await Promise.all([
        culturalEventsApi.getEvents({ year: currentYear, upcoming: true }),
        culturalEventsApi.getSignificantDates({ year: currentYear }),
      ]);

      setEvents(eventsRes.events || []);
      setSignificantDates(datesRes.significantDates || []);
    } catch (err) {
      console.error('Failed to fetch cultural events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, currentYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredEvents = selectedCategory === 'all'
    ? events
    : events.filter(e => e.category === selectedCategory);

  const categories = ['all', ...Object.keys(CATEGORY_CONFIG)];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterChip,
              selectedCategory === cat && styles.filterChipSelected,
              selectedCategory === cat && cat !== 'all' && { backgroundColor: CATEGORY_CONFIG[cat].color }
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[
              styles.filterText,
              selectedCategory === cat && styles.filterTextSelected
            ]}>
              {cat === 'all' ? 'All Events' : CATEGORY_CONFIG[cat].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {filteredEvents.length > 0 ? (
          filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))
        ) : (
          <Text style={styles.emptyText}>No upcoming events found.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Significant Dates</Text>
        {significantDates.length > 0 ? (
          significantDates.map(date => (
            <SignificantDateCard key={date.id} date={date} />
          ))
        ) : (
          <Text style={styles.emptyText}>No significant dates found.</Text>
        )}
      </View>
      
      <View style={styles.spacer} />
    </ScrollView>
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
  filterScroll: {
    maxHeight: 60,
    marginBottom: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: 'transparent',
  },
  filterText: {
    fontSize: 14,
    color: colors.text,
  },
  filterTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    marginBottom: 8,
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
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  significantDateCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    overflow: 'hidden',
    ...shadows.sm,
  },
  dateNumber: {
    padding: spacing.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  dateMonth: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  dateContent: {
    flex: 1,
    padding: spacing.md,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  nationalBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  nationalText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.md,
  },
  spacer: {
    height: 40,
  },
});
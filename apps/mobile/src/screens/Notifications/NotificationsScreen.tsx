/**
 * Notifications Screen
 * 
 * Comprehensive notification hub with:
 * - All notification types (messages, jobs, connections, etc.)
 * - Filtering and grouping
 * - Mark as read/unread
 * - Quick actions
 * - Pull to refresh
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore, Notification } from '../../store/notificationStore';
import { formatDistanceToNow } from 'date-fns';

// Colors
const COLORS = {
  primary: '#1E3A5F',
  secondary: '#D4AF37',
  background: '#F5F5F5',
  white: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  unread: '#EBF5FB',
  message: '#3498DB',
  job: '#27AE60',
  connection: '#9B59B6',
  mentorship: '#E67E22',
  community: '#1ABC9C',
  system: '#95A5A6',
};

// Notification type config
const NOTIFICATION_CONFIG: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
}> = {
  message: { icon: 'chatbubble', color: COLORS.message, label: 'Messages' },
  job_match: { icon: 'briefcase', color: COLORS.job, label: 'Jobs' },
  job_application: { icon: 'document-text', color: COLORS.job, label: 'Applications' },
  connection_request: { icon: 'person-add', color: COLORS.connection, label: 'Connections' },
  connection_accepted: { icon: 'people', color: COLORS.connection, label: 'Connections' },
  mentorship_request: { icon: 'school', color: COLORS.mentorship, label: 'Mentorship' },
  mentorship_matched: { icon: 'ribbon', color: COLORS.mentorship, label: 'Mentorship' },
  session_reminder: { icon: 'calendar', color: COLORS.mentorship, label: 'Sessions' },
  post_like: { icon: 'heart', color: COLORS.community, label: 'Likes' },
  post_comment: { icon: 'chatbubble-ellipses', color: COLORS.community, label: 'Comments' },
  post_mention: { icon: 'at', color: COLORS.community, label: 'Mentions' },
  group_invite: { icon: 'people-circle', color: COLORS.community, label: 'Groups' },
  system: { icon: 'notifications', color: COLORS.system, label: 'System' },
};

type FilterType = 'all' | 'unread' | 'messages' | 'jobs' | 'connections' | 'mentorship' | 'community';

export const NotificationsScreen: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.read);
    
    const typeMap: Record<FilterType, string[]> = {
      all: [],
      unread: [],
      messages: ['message'],
      jobs: ['job_match', 'job_application'],
      connections: ['connection_request', 'connection_accepted'],
      mentorship: ['mentorship_request', 'mentorship_matched', 'session_reminder'],
      community: ['post_like', 'post_comment', 'post_mention', 'group_invite'],
    };
    
    const types = typeMap[filter];
    return notifications.filter(n => types.includes(n.type));
  }, [notifications, filter]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { title: string; data: Notification[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const todayNotifs: Notification[] = [];
    const yesterdayNotifs: Notification[] = [];
    const thisWeekNotifs: Notification[] = [];
    const olderNotifs: Notification[] = [];

    for (const notif of filteredNotifications) {
      const date = new Date(notif.createdAt);
      if (date >= today) {
        todayNotifs.push(notif);
      } else if (date >= yesterday) {
        yesterdayNotifs.push(notif);
      } else if (date >= thisWeek) {
        thisWeekNotifs.push(notif);
      } else {
        olderNotifs.push(notif);
      }
    }

    if (todayNotifs.length) groups.push({ title: 'Today', data: todayNotifs });
    if (yesterdayNotifs.length) groups.push({ title: 'Yesterday', data: yesterdayNotifs });
    if (thisWeekNotifs.length) groups.push({ title: 'This Week', data: thisWeekNotifs });
    if (olderNotifs.length) groups.push({ title: 'Earlier', data: olderNotifs });

    return groups;
  }, [filteredNotifications]);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  // Handle notification press
  const handleNotificationPress = useCallback((notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // Navigate based on type
    // navigation.navigate(getNavigationTarget(notification));
  }, [markAsRead]);

  // Handle delete
  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteNotification(id),
        },
      ]
    );
  }, [deleteNotification]);

  // Render filter chips
  const renderFilters = () => {
    const filters: { key: FilterType; label: string; count?: number }[] = [
      { key: 'all', label: 'All' },
      { key: 'unread', label: 'Unread', count: unreadCount },
      { key: 'messages', label: 'Messages' },
      { key: 'jobs', label: 'Jobs' },
      { key: 'connections', label: 'Connections' },
      { key: 'mentorship', label: 'Mentorship' },
      { key: 'community', label: 'Community' },
    ];

    return (
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filters}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.filtersContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              filter === item.key && styles.filterChipActive,
            ]}
            onPress={() => setFilter(item.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === item.key && styles.filterChipTextActive,
              ]}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 && ` (${item.count})`}
            </Text>
          </TouchableOpacity>
        )}
      />
    );
  };

  // Render notification item
  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const config = NOTIFICATION_CONFIG[item.type] || NOTIFICATION_CONFIG.system;
    const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.notificationItemUnread,
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleDelete(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notificationTime}>{timeAgo}</Text>
        </View>

        {item.data?.imageUrl && (
          <Image
            source={{ uri: item.data.imageUrl as string }}
            style={styles.notificationImage}
          />
        )}

        {!item.read && <View style={styles.unreadDot} />}

        {item.data?.actionable && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => {/* Handle primary action */}}
            >
              <Text style={styles.actionButtonTextPrimary}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {/* Handle secondary action */}}
            >
              <Text style={styles.actionButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render section header
  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={COLORS.textTertiary} />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'unread' 
          ? "You're all caught up!"
          : "You don't have any notifications yet"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Ionicons name="checkmark-done" size={20} color={COLORS.primary} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      {renderFilters()}

      {/* Notifications List */}
      <FlatList
        data={groupedNotifications}
        keyExtractor={(item, index) => `section-${index}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item: section }) => (
          <View>
            {renderSectionHeader(section.title)}
            {section.data.map(notification => (
              <View key={notification.id}>
                {renderNotificationItem({ item: notification })}
              </View>
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

// Notification Preferences Screen
export const NotificationPreferencesScreen: React.FC = () => {
  const { preferences, updatePreferences } = useNotificationStore();

  const categories = [
    { 
      key: 'messages', 
      title: 'Messages', 
      description: 'New messages and chat notifications',
      icon: 'chatbubble' as const,
    },
    { 
      key: 'connections', 
      title: 'Connections', 
      description: 'Connection requests and updates',
      icon: 'people' as const,
    },
    { 
      key: 'jobs', 
      title: 'Jobs', 
      description: 'Job matches and application updates',
      icon: 'briefcase' as const,
    },
    { 
      key: 'mentorship', 
      title: 'Mentorship', 
      description: 'Mentorship requests and session reminders',
      icon: 'school' as const,
    },
    { 
      key: 'community', 
      title: 'Community', 
      description: 'Likes, comments, and mentions',
      icon: 'globe' as const,
    },
    { 
      key: 'marketing', 
      title: 'Marketing', 
      description: 'News, tips, and promotional content',
      icon: 'megaphone' as const,
    },
  ];

  const handleToggle = (key: string, type: 'push' | 'email' | 'inApp') => {
    const current = (preferences as Record<string, Record<string, boolean>>)[key];
    updatePreferences({
      [key]: {
        ...current,
        [type]: !current?.[type],
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.prefsHeader}>
        <Text style={styles.prefsTitle}>Notification Preferences</Text>
        <Text style={styles.prefsSubtitle}>
          Choose how you want to be notified
        </Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.prefsListContainer}
        renderItem={({ item }) => {
          const prefs = (preferences as Record<string, Record<string, boolean>>)[item.key] || {};
          
          return (
            <View style={styles.prefItem}>
              <View style={styles.prefIconContainer}>
                <Ionicons name={item.icon} size={24} color={COLORS.primary} />
              </View>
              
              <View style={styles.prefContent}>
                <Text style={styles.prefTitle}>{item.title}</Text>
                <Text style={styles.prefDescription}>{item.description}</Text>
                
                <View style={styles.prefToggles}>
                  <TouchableOpacity
                    style={[
                      styles.prefToggle,
                      prefs.push && styles.prefToggleActive,
                    ]}
                    onPress={() => handleToggle(item.key, 'push')}
                  >
                    <Ionicons 
                      name="phone-portrait" 
                      size={16} 
                      color={prefs.push ? COLORS.white : COLORS.textSecondary} 
                    />
                    <Text 
                      style={[
                        styles.prefToggleText,
                        prefs.push && styles.prefToggleTextActive,
                      ]}
                    >
                      Push
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.prefToggle,
                      prefs.email && styles.prefToggleActive,
                    ]}
                    onPress={() => handleToggle(item.key, 'email')}
                  >
                    <Ionicons 
                      name="mail" 
                      size={16} 
                      color={prefs.email ? COLORS.white : COLORS.textSecondary} 
                    />
                    <Text 
                      style={[
                        styles.prefToggleText,
                        prefs.email && styles.prefToggleTextActive,
                      ]}
                    >
                      Email
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.prefToggle,
                      prefs.inApp && styles.prefToggleActive,
                    ]}
                    onPress={() => handleToggle(item.key, 'inApp')}
                  >
                    <Ionicons 
                      name="notifications" 
                      size={16} 
                      color={prefs.inApp ? COLORS.white : COLORS.textSecondary} 
                    />
                    <Text 
                      style={[
                        styles.prefToggleText,
                        prefs.inApp && styles.prefToggleTextActive,
                      ]}
                    >
                      In-App
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Quiet Hours */}
      <View style={styles.quietHoursCard}>
        <View style={styles.quietHoursHeader}>
          <Ionicons name="moon" size={24} color={COLORS.primary} />
          <View style={styles.quietHoursContent}>
            <Text style={styles.quietHoursTitle}>Quiet Hours</Text>
            <Text style={styles.quietHoursSubtitle}>
              Pause notifications during certain times
            </Text>
          </View>
          <TouchableOpacity style={styles.quietHoursToggle}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '10',
  },
  markAllText: {
    marginLeft: 4,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  notificationItemUnread: {
    backgroundColor: COLORS.unread,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  notificationImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginLeft: 12,
  },
  unreadDot: {
    position: 'absolute',
    top: 20,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  actionButtonTextPrimary: {
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  // Preferences styles
  prefsHeader: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  prefsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  prefsSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  prefsListContainer: {
    paddingBottom: 20,
  },
  prefItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  prefIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  prefContent: {
    flex: 1,
  },
  prefTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  prefDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  prefToggles: {
    flexDirection: 'row',
    marginTop: 12,
  },
  prefToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prefToggleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  prefToggleText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  prefToggleTextActive: {
    color: COLORS.white,
  },
  quietHoursCard: {
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quietHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quietHoursContent: {
    flex: 1,
    marginLeft: 16,
  },
  quietHoursTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  quietHoursSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quietHoursToggle: {
    padding: 4,
  },
});

export default NotificationsScreen;

/**
 * Notifications Screen
 * Displays all user notifications with filtering and actions
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius } from '../theme';
import { notificationsApi } from '../services/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

interface NotificationTypeConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
}

/**
 * Notification categories with icons and colors
 */
const NOTIFICATION_TYPES: Record<string, NotificationTypeConfig> = {
  job_alert: { icon: 'briefcase', color: colors.primary, label: 'Job Alert' },
  application_update: { icon: 'document-text', color: colors.accent, label: 'Application' },
  message: { icon: 'chatbubble', color: colors.info, label: 'Message' },
  mentor_session: { icon: 'people', color: colors.purple, label: 'Mentorship' },
  course_update: { icon: 'school', color: colors.warning, label: 'Course' },
  community: { icon: 'globe', color: colors.secondaryLight, label: 'Community' },
  system: { icon: 'information-circle', color: colors.textSecondary, label: 'System' },
};

/**
 * Filter tabs
 */
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'job_alert', label: 'Jobs' },
  { key: 'message', label: 'Messages' },
];

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
  onDelete: () => void;
}

/**
 * Individual notification item
 */
function NotificationItem({ notification, onPress, onDelete }: NotificationItemProps) {
  const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.system;
  const timeAgo = getTimeAgo(notification.createdAt);
  
  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.read && styles.unreadItem,
      ]}
      onPress={onPress}
      onLongPress={() => {
        Alert.alert(
          'Delete Notification',
          'Remove this notification?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ]
        );
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${typeConfig.label}: ${notification.title}. ${notification.body}. ${timeAgo}`}
      accessibilityHint={notification.read ? 'Tap to view details' : 'Unread notification. Tap to view details'}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: typeConfig.color + '20' }]}>
        <Ionicons name={typeConfig.icon} size={24} color={typeConfig.color} />
      </View>
      
      {/* Content */}
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.categoryLabel}>{typeConfig.label}</Text>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>
        
        <Text 
          style={[styles.title, !notification.read && styles.unreadTitle]}
          numberOfLines={1}
        >
          {notification.title}
        </Text>
        
        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
      </View>
      
      {/* Unread indicator */}
      {!notification.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

/**
 * Calculate time ago string
 */
function getTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface EmptyStateProps {
  filter: string;
}

/**
 * Empty state component
 */
function EmptyState({ filter }: EmptyStateProps) {
  const message = filter === 'unread' 
    ? "You're all caught up!"
    : 'No notifications yet';
  
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>{message}</Text>
      <Text style={styles.emptyText}>
        {filter === 'unread' 
          ? 'All notifications have been read'
          : 'New notifications will appear here'}
      </Text>
    </View>
  );
}

interface NotificationsScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

/**
 * Notifications Screen Component
 */
export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  
  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.getNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };
  
  // Handle notification press
  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await notificationsApi.markAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
      } catch (error) {
        console.error('Failed to mark notification read:', error);
      }
    }
    
    // Navigate based on type
    switch (notification.type) {
      case 'job_alert':
        if (notification.data?.jobId) {
          navigation.navigate('JobDetail', { id: notification.data.jobId });
        }
        break;
      case 'application_update':
        navigation.navigate('MyApplications');
        break;
      case 'message':
        navigation.navigate('Messages');
        break;
      case 'mentor_session':
        if (notification.data?.mentorId) {
          navigation.navigate('MentorDetail', { id: notification.data.mentorId });
        } else {
          navigation.navigate('Mentorship');
        }
        break;
      case 'course_update':
        if (notification.data?.courseId) {
          navigation.navigate('CourseDetail', { id: notification.data.courseId });
        }
        break;
      default:
        // No specific action
        break;
    }
  };
  
  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };
  
  // Handle mark all read
  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  };
  
  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });
  
  // Unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header Actions */}
      {unreadCount > 0 && (
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
          >
            <Ionicons name="checkmark-done-outline" size={20} color={colors.primary} />
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[
              styles.filterLabel,
              filter === f.key && styles.filterLabelActive
            ]}>
              {f.label}
            </Text>
            {f.key === 'unread' && unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Notification List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handleNotificationPress(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={<EmptyState filter={filter} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  markAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primary + '20',
  },
  filterLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  filterLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: 'bold',
  },
  listContent: {
    flexGrow: 1,
    paddingTop: spacing.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  unreadItem: {
    backgroundColor: colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textMuted,
  },
  title: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
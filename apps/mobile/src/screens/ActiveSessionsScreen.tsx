/**
 * Active Sessions Screen
 * View and manage logged-in devices
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../hooks/useSession';
import { securityApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

// Device icons mapping
const DEVICE_ICONS: Record<string, string> = {
  mobile: 'phone-portrait-outline',
  tablet: 'tablet-portrait-outline',
  desktop: 'desktop-outline',
  laptop: 'laptop-outline',
  unknown: 'globe-outline',
};

interface Session {
  id: string;
  deviceType: string;
  deviceName: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
  ipAddress: string;
}

export default function ActiveSessionsScreen() {
  const { token } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await securityApi.getSessions();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSessions();
  }, [fetchSessions]);

  async function handleTerminateSession(sessionId: string) {
    Alert.alert(
      'End Session',
      'Are you sure you want to sign out from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setTerminatingId(sessionId);
            try {
              await securityApi.terminateSession(sessionId);
              setSessions(prev => prev.filter(s => s.id !== sessionId));
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to end session');
            } finally {
              setTerminatingId(null);
            }
          },
        },
      ]
    );
  }

  async function handleTerminateAllSessions() {
    Alert.alert(
      'Sign Out Everywhere',
      'This will sign you out from all other devices. You will stay logged in on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await securityApi.terminateAllSessions();
              Alert.alert('Success', result.message);
              fetchSessions();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sign out from all devices');
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  const renderSessionItem = ({ item }: { item: Session }) => {
    const iconName = DEVICE_ICONS[item.deviceType] || DEVICE_ICONS.unknown;
    const isTerminating = terminatingId === item.id;

    return (
      <View style={styles.sessionCard}>
        <View style={styles.iconContainer}>
          <Ionicons name={iconName as any} size={24} color={item.isCurrent ? colors.primary : colors.textSecondary} />
        </View>
        
        <View style={styles.sessionInfo}>
          <View style={styles.sessionHeader}>
            <Text style={styles.deviceName}>{item.deviceName}</Text>
            {item.isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentText}>THIS DEVICE</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.sessionDetail}>{item.location} • {item.ipAddress}</Text>
          <Text style={styles.lastActive}>
            {item.isCurrent ? 'Active now' : `Last active: ${new Date(item.lastActive).toLocaleDateString()}`}
          </Text>
        </View>

        {!item.isCurrent && (
          <TouchableOpacity
            style={styles.terminateButton}
            onPress={() => handleTerminateSession(item.id)}
            disabled={isTerminating}
          >
            {isTerminating ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Sessions</Text>
        <Text style={styles.headerSubtitle}>
          Manage devices where you're currently logged in.
        </Text>
      </View>

      <FlatList
        data={sessions}
        renderItem={renderSessionItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListFooterComponent={
          sessions.length > 1 ? (
            <TouchableOpacity
              style={styles.terminateAllButton}
              onPress={handleTerminateAllSessions}
            >
              <Text style={styles.terminateAllText}>Sign Out of All Other Devices</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active sessions found.</Text>
          </View>
        }
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: spacing.sm,
  },
  currentBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
  },
  sessionDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  lastActive: {
    fontSize: 12,
    color: colors.textMuted,
  },
  terminateButton: {
    padding: spacing.sm,
  },
  terminateAllButton: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  terminateAllText: {
    color: colors.error,
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
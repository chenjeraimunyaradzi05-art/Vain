/**
 * Messages Screen
 * Direct messaging and conversations with real-time features
 * 
 * Features:
 * - Real-time message updates via WebSocket
 * - Online/offline presence indicators
 * - Typing indicators
 * - Unread counts that update in real-time
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messagesApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { useSession } from '../hooks/useSession';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSocket, usePresence, useRealtimeNotifications } from '../hooks/useSocket';
import socketService from '../services/socket';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
}

interface Conversation {
  id: string;
  name?: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
}

interface MessagesScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

// Pulse animation component for online indicator
function PulsingDot({ style }: { style: any }) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.3,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    const loop = Animated.loop(pulse);
    loop.start();

    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    />
  );
}

export default function MessagesScreen({ navigation }: MessagesScreenProps) {
  const { user } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  // Real-time connection
  const { isConnected, connect } = useSocket();
  
  // Get all participant IDs for presence tracking
  const participantIds = useMemo(() => {
    const ids = new Set<string>();
    conversations.forEach(conv => {
      conv.participants?.forEach(p => {
        if (p.id !== user?.id) {
          ids.add(p.id);
        }
      });
    });
    return Array.from(ids);
  }, [conversations, user?.id]);
  
  // Track presence for all participants
  const { isOnline, getLastSeen } = usePresence(participantIds);
  
  // Connect to socket when screen mounts
  useEffect(() => {
    if (!isConnected) {
      connect().catch(console.error);
    }
  }, []);
  
  // Listen for real-time message updates
  useEffect(() => {
    const handleNewMessage = (message: any) => {
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessage: message,
              unreadCount: conv.unreadCount + 1,
            };
          }
          return conv;
        });
        // Move updated conversation to top
        updated.sort((a, b) => {
          const aTime = new Date(a.lastMessage?.createdAt || 0).getTime();
          const bTime = new Date(b.lastMessage?.createdAt || 0).getTime();
          return bTime - aTime;
        });
        return updated;
      });
    };

    socketService.events.on('newMessage', handleNewMessage);
    return () => {
      socketService.events.off('newMessage', handleNewMessage);
    };
  }, []);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const result = await messagesApi.getConversations();
      setConversations(result.conversations || []);
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  function onRefresh() {
    setIsRefreshing(true);
    loadConversations();
  }

  const filteredConversations = search
    ? conversations.filter(c => 
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.participants?.some(p => p.name?.toLowerCase().includes(search.toLowerCase()))
      )
    : conversations;

  const renderConversation = useCallback(({ item }: { item: Conversation }) => {
    const otherParticipant = item.participants?.[0];
    const hasUnread = item.unreadCount > 0;
    const participantName = item.name || otherParticipant?.name || 'User';
    const isParticipantOnline = otherParticipant ? isOnline(otherParticipant.id) : false;
    const lastSeen = otherParticipant ? getLastSeen(otherParticipant.id) : null;
    
    const accessibilityLabel = `Conversation with ${participantName}. ${isParticipantOnline ? 'Online.' : lastSeen ? `Last seen ${formatTimeAgo(lastSeen.toISOString())}.` : ''} ${hasUnread ? `${item.unreadCount} unread messages.` : ''} ${item.lastMessage?.content ? `Last message: ${item.lastMessage.content}` : ''}`;

    return (
      <TouchableOpacity
        style={[styles.conversationCard, hasUnread && styles.conversationUnread]}
        onPress={() => navigation.navigate('Chat', { 
          conversationId: item.id,
          conversationName: item.name || otherParticipant?.name || 'Chat'
        })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to open conversation"
      >
        {/* Avatar */}
        <View style={styles.avatarContainer} accessibilityElementsHidden>
          {otherParticipant?.avatar ? (
            <Image 
              source={{ uri: otherParticipant.avatar }} 
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(otherParticipant?.name || item.name || 'U')[0].toUpperCase()}
              </Text>
            </View>
          )}
          {/* Online indicator - real-time presence */}
          {isParticipantOnline && (
            <PulsingDot style={styles.onlineIndicator} />
          )}
        </View>

        {/* Content */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text 
              style={[styles.conversationName, hasUnread && styles.textBold]} 
              numberOfLines={1}
            >
              {item.name || otherParticipant?.name || 'User'}
            </Text>
            <Text style={styles.conversationTime}>
              {item.lastMessage && formatTimeAgo(item.lastMessage.createdAt)}
            </Text>
          </View>
          
          <View style={styles.conversationFooter}>
            <Text 
              style={[styles.lastMessage, hasUnread && styles.textBold]} 
              numberOfLines={1}
            >
              {item.lastMessage?.content || 'Start a conversation'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation, isOnline, getLastSeen]);

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Connection status indicator */}
      {!isConnected && (
        <View style={styles.connectionStatus}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
          <Text style={styles.connectionStatusText}>Connecting...</Text>
        </View>
      )}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptyMessage}>
          Start a conversation with mentors, employers, or community members
        </Text>
        <TouchableOpacity 
          style={styles.newChatButton}
          onPress={() => navigation.navigate('NewMessage')}
        >
          <Ionicons name="add" size={20} color={colors.textInverse} />
          <Text style={styles.newChatButtonText}>New Message</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredConversations}
        keyExtractor={item => item.id}
        renderItem={renderConversation}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* New Message FAB */}
      {conversations.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('NewMessage')}
          activeOpacity={0.8}
        >
          <Ionicons name="create" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function formatTimeAgo(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  listContent: {
    flexGrow: 1,
  },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    backgroundColor: colors.warningLight || '#FEF3C7',
    borderRadius: borderRadius.sm,
  },
  connectionStatusText: {
    ...typography.caption,
    color: colors.warning,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    ...typography.body,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  conversationUnread: {
    backgroundColor: colors.surface,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h3,
    color: colors.textInverse,
  },
  onlineIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  conversationName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  conversationTime: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  textBold: {
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.sm,
  },
  unreadText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  newChatButtonText: {
    ...typography.button,
    color: colors.textInverse,
    marginLeft: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
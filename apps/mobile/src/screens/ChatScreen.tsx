/**
 * Chat Screen
 * Real-time messaging with typing indicators and delivery status
 * 
 * Features:
 * - Real-time message delivery via WebSocket
 * - Typing indicators
 * - Read receipts
 * - Message delivery status (sending, sent, delivered, read)
 * - Optimistic updates
 * - Image/file attachments
 * - Message reactions
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messagesApi } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { useSession } from '../hooks/useSession';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useMessages, useTypingIndicator, usePresence, useSocket } from '../hooks/useSocket';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.75;

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  reactions?: { emoji: string; count: number; userReacted: boolean }[];
  replyTo?: Message;
  attachments?: { url: string; type: string; name?: string }[];
}

interface ChatScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ Chat: { conversationId: string; conversationName: string } }, 'Chat'>;
}

// Message bubble component
const MessageBubble = React.memo(({ 
  message, 
  isOwn, 
  showAvatar, 
  onLongPress,
  onReactionPress,
}: { 
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  onLongPress: (message: Message) => void;
  onReactionPress: (message: Message, emoji: string) => void;
}) => {
  const statusIcon = useMemo(() => {
    switch (message.status) {
      case 'sending':
        return <ActivityIndicator size="small" color={colors.textMuted} style={styles.statusIcon} />;
      case 'sent':
        return <Ionicons name="checkmark" size={14} color={colors.textMuted} />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={14} color={colors.textMuted} />;
      case 'read':
        return <Ionicons name="checkmark-done" size={14} color={colors.primary} />;
      case 'failed':
        return <Ionicons name="alert-circle" size={14} color={colors.error} />;
      default:
        return null;
    }
  }, [message.status]);

  const accessibilityLabel = `${isOwn ? 'You' : message.senderName || 'User'} said: ${message.content}. ${formatTime(message.createdAt)}. ${message.status === 'read' ? 'Read' : message.status === 'delivered' ? 'Delivered' : message.status === 'sent' ? 'Sent' : 'Sending'}`;

  return (
    <TouchableOpacity
      style={[
        styles.messageBubbleContainer,
        isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
      ]}
      onLongPress={() => onLongPress(message)}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      {/* Avatar for other user's messages */}
      {!isOwn && showAvatar && (
        <View style={styles.messageAvatarContainer}>
          {message.senderAvatar ? (
            <Image source={{ uri: message.senderAvatar }} style={styles.messageAvatar} />
          ) : (
            <View style={[styles.messageAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(message.senderName || 'U')[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}
      {!isOwn && !showAvatar && <View style={styles.avatarSpacer} />}

      <View style={styles.bubbleWrapper}>
        {/* Reply preview */}
        {message.replyTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyBar} />
            <Text style={styles.replyText} numberOfLines={1}>
              {message.replyTo.content}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
            message.status === 'failed' && styles.failedBubble,
          ]}
        >
          {/* Image attachment */}
          {message.type === 'image' && message.attachments?.[0] && (
            <Image
              source={{ uri: message.attachments[0].url }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}

          {/* Text content */}
          {message.content && (
            <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
              {message.content}
            </Text>
          )}

          {/* Time and status */}
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwn ? styles.ownTime : styles.otherTime]}>
              {formatTime(message.createdAt)}
            </Text>
            {isOwn && statusIcon}
          </View>
        </View>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <View style={styles.reactionsContainer}>
            {message.reactions.map((reaction, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.reactionBadge,
                  reaction.userReacted && styles.reactionBadgeActive,
                ]}
                onPress={() => onReactionPress(message, reaction.emoji)}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                {reaction.count > 1 && (
                  <Text style={styles.reactionCount}>{reaction.count}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// Typing indicator component
const TypingIndicator = ({ users }: { users: { userId: string; userName: string }[] }) => {
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = animate(dotAnim1, 0);
    const anim2 = animate(dotAnim2, 150);
    const anim3 = animate(dotAnim3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  if (users.length === 0) return null;

  const typingText = users.length === 1
    ? `${users[0].userName} is typing`
    : users.length === 2
    ? `${users[0].userName} and ${users[1].userName} are typing`
    : `${users[0].userName} and ${users.length - 1} others are typing`;

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingDots}>
        <Animated.View style={[styles.dot, { transform: [{ translateY: dotAnim1 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: dotAnim2 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: dotAnim3 }] }]} />
      </View>
      <Text style={styles.typingText}>{typingText}</Text>
    </View>
  );
};

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { conversationId, conversationName } = route.params;
  const { user } = useSession();
  const flatListRef = useRef<FlatList>(null);

  const [inputText, setInputText] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Real-time hooks
  const { isConnected } = useSocket();
  const {
    messages,
    typingUsers,
    sendMessage: sendSocketMessage,
    markAsRead,
    setMessages,
  } = useMessages(conversationId);
  const { startTyping, stopTyping } = useTypingIndicator(conversationId);
  const { isOnline } = usePresence([/* other participant ID would go here */]);

  // Load message history
  useEffect(() => {
    loadMessageHistory();
  }, [conversationId]);

  async function loadMessageHistory() {
    try {
      setIsLoadingHistory(true);
      const result = await messagesApi.getMessages(conversationId);
      const historicalMessages = (result.messages || []).map((msg: any) => ({
        ...msg,
        status: 'read' as const,
      }));
      setMessages(historicalMessages);
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  // Mark messages as read when viewing
  useEffect(() => {
    if (messages.length > 0) {
      const unreadIds = messages
        .filter((m) => m.senderId !== user?.id && m.status !== 'read')
        .map((m) => m.id);
      
      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }
  }, [messages, user?.id]);

  // Set navigation header
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>{conversationName}</Text>
          {isConnected ? (
            <Text style={styles.headerSubtitle}>Online</Text>
          ) : (
            <Text style={[styles.headerSubtitle, styles.offlineText]}>Connecting...</Text>
          )}
        </View>
      ),
    });
  }, [navigation, conversationName, isConnected]);

  // Handle text input change
  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
    if (text.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [startTyping, stopTyping]);

  // Send message
  const handleSend = useCallback(() => {
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Send via socket
    sendSocketMessage(trimmedText, 'text');

    // Clear input
    setInputText('');
    setReplyingTo(null);
    stopTyping();

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, sendSocketMessage, stopTyping]);

  // Handle message long press
  const handleMessageLongPress = useCallback((message: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessage(message);
    // Show action sheet or modal for message options
  }, []);

  // Handle reaction
  const handleReaction = useCallback((message: Message, emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // API call to add/remove reaction would go here
    console.log('Reaction:', emoji, 'on message:', message.id);
  }, []);

  // Render message item
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.senderId === user?.id || item.senderId === 'me';
    const previousMessage = messages[index - 1];
    const showAvatar = !isOwn && (
      !previousMessage ||
      previousMessage.senderId !== item.senderId ||
      new Date(item.createdAt).getTime() - new Date(previousMessage.createdAt).getTime() > 300000 // 5 min gap
    );

    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        showAvatar={showAvatar}
        onLongPress={handleMessageLongPress}
        onReactionPress={handleReaction}
      />
    );
  }, [user?.id, messages, handleMessageLongPress, handleReaction]);

  // Render date separator
  const renderDateSeparator = (date: string) => (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{formatDate(date)}</Text>
      <View style={styles.dateLine} />
    </View>
  );

  if (isLoadingHistory) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Connection status banner */}
      {!isConnected && (
        <View style={styles.connectionBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
          <Text style={styles.connectionBannerText}>
            Reconnecting... Messages will be sent when connected
          </Text>
        </View>
      )}

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContent}
        inverted={false}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Send a message to start the conversation</Text>
          </View>
        }
      />

      {/* Typing indicator */}
      <TypingIndicator users={typingUsers} />

      {/* Reply preview */}
      {replyingTo && (
        <View style={styles.replyingContainer}>
          <View style={styles.replyingContent}>
            <Text style={styles.replyingLabel}>Replying to {replyingTo.senderName || 'message'}</Text>
            <Text style={styles.replyingText} numberOfLines={1}>
              {replyingTo.content}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.cancelReplyButton}
            onPress={() => setReplyingTo(null)}
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => {/* Open attachment picker */}}
          accessibilityLabel="Attach file"
          accessibilityRole="button"
        >
          <Ionicons name="attach" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={5000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={styles.emojiButton}
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            accessibilityLabel="Insert emoji"
            accessibilityRole="button"
          >
            <Ionicons name="happy-outline" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            inputText.trim().length === 0 && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={inputText.trim().length === 0}
          accessibilityLabel="Send message"
          accessibilityRole="button"
        >
          <Ionicons
            name="send"
            size={20}
            color={inputText.trim().length > 0 ? colors.textInverse : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString('en-AU', { weekday: 'long' });
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
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
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  headerTitle: {
    alignItems: 'center',
  },
  headerTitleText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.success,
  },
  offlineText: {
    color: colors.warning,
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: colors.warningLight || '#FEF3C7',
  },
  connectionBannerText: {
    ...typography.caption,
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatarContainer: {
    marginRight: spacing.xs,
    alignSelf: 'flex-end',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  avatarSpacer: {
    width: 28 + spacing.xs,
  },
  bubbleWrapper: {
    maxWidth: MAX_BUBBLE_WIDTH,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt || colors.surface,
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  replyBar: {
    width: 3,
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginRight: spacing.xs,
  },
  replyText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  messageBubble: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 60,
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.xs,
  },
  otherBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.xs,
  },
  failedBubble: {
    opacity: 0.7,
    borderColor: colors.error,
    borderWidth: 1,
  },
  messageImage: {
    width: MAX_BUBBLE_WIDTH - spacing.md * 2,
    height: 200,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  messageText: {
    ...typography.body,
  },
  ownText: {
    color: colors.textInverse,
  },
  otherText: {
    color: colors.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  messageTime: {
    ...typography.caption,
    fontSize: 11,
  },
  ownTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTime: {
    color: colors.textMuted,
  },
  statusIcon: {
    marginLeft: spacing.xs,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionBadgeActive: {
    backgroundColor: colors.primaryLight || colors.primary + '20',
    borderColor: colors.primary,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 2,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dateText: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typingDots: {
    flexDirection: 'row',
    marginRight: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    marginHorizontal: 2,
  },
  typingText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  replyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyingContent: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.sm,
  },
  replyingLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  replyingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  cancelReplyButton: {
    padding: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachButton: {
    padding: spacing.sm,
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xs,
    paddingHorizontal: spacing.sm,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  emojiButton: {
    padding: spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface,
  },
});

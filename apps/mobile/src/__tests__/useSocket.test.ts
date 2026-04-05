/**
 * Socket Hooks Tests
 *
 * Tests for React hooks that use the socket service
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';

// Mock the socket service
const mockSocketService = {
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  getConnectionState: jest.fn(() => 'disconnected'),
  isConnected: jest.fn(() => false),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
  reconnect: jest.fn().mockResolvedValue(undefined),
  joinConversation: jest.fn(),
  leaveConversation: jest.fn(),
  sendMessage: jest.fn(),
  startTyping: jest.fn(),
  stopTyping: jest.fn(),
  markRead: jest.fn(),
  getPresence: jest.fn(),
  getMultiplePresence: jest.fn(() => new Map()),
};

jest.mock('../services/socket', () => ({
  __esModule: true,
  socketService: mockSocketService,
  default: mockSocketService,
  ConnectionState: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    AUTHENTICATED: 'authenticated',
    ERROR: 'error',
  },
  MESSAGE_TYPES: {
    NEW_MESSAGE: 'new_message',
    USER_TYPING: 'user_typing',
    USER_ONLINE: 'user_online',
    USER_OFFLINE: 'user_offline',
  },
}));

const {
  useSocket,
  useMessages,
  useTypingIndicator,
  usePresence,
  useRealtimeNotifications,
  useFeedUpdates,
} = require('../hooks/useSocket');

describe('useSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return connection state', () => {
    const { result } = renderHook(() => useSocket());

    expect(result.current.connectionState).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
  });

  it('should provide connect function', async () => {
    const { result } = renderHook(() => useSocket());

    await act(async () => {
      await result.current.connect();
    });

    expect(mockSocketService.connect).toHaveBeenCalled();
  });

  it('should provide disconnect function', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.disconnect();
    });

    expect(mockSocketService.disconnect).toHaveBeenCalled();
  });

  it('should provide reconnect function', async () => {
    const { result } = renderHook(() => useSocket());

    await act(async () => {
      await result.current.reconnect();
    });

    expect(mockSocketService.reconnect).toHaveBeenCalled();
  });
});

describe('useMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should join conversation on mount', () => {
    const conversationId = 'conv-123';
    renderHook(() => useMessages(conversationId));

    expect(mockSocketService.joinConversation).toHaveBeenCalledWith(conversationId);
  });

  it('should leave conversation on unmount', () => {
    const conversationId = 'conv-123';
    const { unmount } = renderHook(() => useMessages(conversationId));

    unmount();

    expect(mockSocketService.leaveConversation).toHaveBeenCalled();
  });

  it('should return empty messages initially', () => {
    const { result } = renderHook(() => useMessages('conv-123'));

    expect(result.current.messages).toEqual([]);
    expect(result.current.typingUsers).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should provide sendMessage function', () => {
    const { result } = renderHook(() => useMessages('conv-123'));

    act(() => {
      result.current.sendMessage('Hello!');
    });

    // Should add optimistic message
    expect(result.current.messages.length).toBe(1);
  });

  it('should not join conversation when conversationId is null', () => {
    mockSocketService.joinConversation.mockClear();

    renderHook(() => useMessages(null));

    expect(mockSocketService.joinConversation).not.toHaveBeenCalled();
  });
});

describe('useTypingIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call startTyping on socket service', () => {
    const { result } = renderHook(() => useTypingIndicator('conv-123'));

    act(() => {
      result.current.startTyping();
    });

    expect(mockSocketService.startTyping).toHaveBeenCalledWith('conv-123');
  });

  it('should call stopTyping on socket service', () => {
    const { result } = renderHook(() => useTypingIndicator('conv-123'));

    act(() => {
      result.current.stopTyping();
    });

    expect(mockSocketService.stopTyping).toHaveBeenCalledWith('conv-123');
  });

  it('should auto-stop typing after timeout', () => {
    const { result } = renderHook(() => useTypingIndicator('conv-123'));

    act(() => {
      result.current.startTyping();
    });

    act(() => {
      jest.advanceTimersByTime(3500); // 3.5 seconds
    });

    expect(mockSocketService.stopTyping).toHaveBeenCalled();
  });

  it('should do nothing when conversationId is null', () => {
    mockSocketService.startTyping.mockClear();

    const { result } = renderHook(() => useTypingIndicator(null));

    act(() => {
      result.current.startTyping();
    });

    expect(mockSocketService.startTyping).not.toHaveBeenCalled();
  });
});

describe('usePresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocketService.getMultiplePresence.mockReturnValue(
      new Map([
        ['user-1', { online: true, lastSeen: new Date() }],
        ['user-2', { online: false, lastSeen: new Date() }],
      ])
    );
  });

  it('should return presence map for user IDs', () => {
    const { result } = renderHook(() => usePresence(['user-1', 'user-2']));

    expect(result.current.presence.size).toBe(2);
  });

  it('should provide isOnline helper function', () => {
    const { result } = renderHook(() => usePresence(['user-1', 'user-2']));

    expect(result.current.isOnline('user-1')).toBe(true);
    expect(result.current.isOnline('user-2')).toBe(false);
    expect(result.current.isOnline('unknown')).toBe(false);
  });

  it('should provide getLastSeen helper function', () => {
    const { result } = renderHook(() => usePresence(['user-1']));

    const lastSeen = result.current.getLastSeen('user-1');
    expect(lastSeen).toBeInstanceOf(Date);
  });
});

describe('useRealtimeNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty notifications initially', () => {
    const { result } = renderHook(() => useRealtimeNotifications());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should provide markAsRead function', () => {
    const { result } = renderHook(() => useRealtimeNotifications());

    // Add a notification first
    act(() => {
      result.current.setNotifications([{ id: 'notif-1', read: false }]);
      result.current.setUnreadCount(1);
    });

    expect(result.current.unreadCount).toBe(1);

    act(() => {
      result.current.markAsRead('notif-1');
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it('should provide clearAll function', () => {
    const { result } = renderHook(() => useRealtimeNotifications());

    act(() => {
      result.current.setNotifications([{ id: 'notif-1' }]);
      result.current.setUnreadCount(1);
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });
});

describe('useFeedUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useFeedUpdates());

    expect(result.current.newPostsAvailable).toBe(false);
    expect(result.current.newPostsCount).toBe(0);
  });

  it('should provide clearNewPosts function', () => {
    const { result } = renderHook(() => useFeedUpdates());

    act(() => {
      result.current.clearNewPosts();
    });

    expect(result.current.newPostsAvailable).toBe(false);
    expect(result.current.newPostsCount).toBe(0);
  });
});

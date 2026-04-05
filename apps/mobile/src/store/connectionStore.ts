/**
 * Connection Store - Zustand state management for connections/friends
 * 
 * Manages:
 * - Connection lists (friends, pending requests)
 * - Connection requests (incoming/outgoing)
 * - Blocking and reporting
 * - Real-time connection updates
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

// Types
export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  title?: string;
  company?: string;
  location?: string;
  bio?: string;
  isVerified?: boolean;
  isMentor?: boolean;
  mutualConnections?: number;
  skills?: string[];
}

export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'connected' | 'blocked';

export interface Connection {
  id: string;
  user: UserProfile;
  status: ConnectionStatus;
  connectedAt?: string;
  requestedAt?: string;
  mutualConnections?: number;
}

export interface ConnectionRequest {
  id: string;
  user: UserProfile;
  message?: string;
  createdAt: string;
}

interface ConnectionState {
  // Data
  connections: Connection[];
  incomingRequests: ConnectionRequest[];
  outgoingRequests: ConnectionRequest[];
  suggestions: UserProfile[];
  blockedUsers: UserProfile[];
  
  // Pagination
  connectionsCursor: string | null;
  connectionsHasMore: boolean;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isSendingRequest: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  fetchConnections: (refresh?: boolean) => Promise<void>;
  fetchIncomingRequests: () => Promise<void>;
  fetchOutgoingRequests: () => Promise<void>;
  fetchSuggestions: () => Promise<void>;
  fetchBlockedUsers: () => Promise<void>;
  
  // Connection management
  sendConnectionRequest: (userId: string, message?: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  removeConnection: (connectionId: string) => Promise<void>;
  
  // Blocking
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  
  // Search
  searchConnections: (query: string) => Connection[];
  getConnectionStatus: (userId: string) => ConnectionStatus;
  
  // Real-time updates
  handleConnectionRequest: (request: ConnectionRequest) => void;
  handleConnectionAccepted: (connection: Connection) => void;
  handleConnectionRemoved: (connectionId: string) => void;
  
  // Utility
  clearError: () => void;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      // Initial state
      connections: [],
      incomingRequests: [],
      outgoingRequests: [],
      suggestions: [],
      blockedUsers: [],
      connectionsCursor: null,
      connectionsHasMore: true,
      isLoading: false,
      isRefreshing: false,
      isSendingRequest: false,
      error: null,

      // Fetch connections
      fetchConnections: async (refresh = false) => {
        const { connectionsCursor, isLoading, isRefreshing } = get();
        
        if (isLoading || isRefreshing) return;
        
        set({ 
          isLoading: !refresh, 
          isRefreshing: refresh,
          error: null 
        });

        try {
          const response = await api.connections.getConnections(
            refresh ? undefined : connectionsCursor || undefined
          );
          
          set(state => ({
            connections: refresh 
              ? response.connections 
              : [...state.connections, ...response.connections],
            connectionsCursor: response.nextCursor,
            connectionsHasMore: response.hasMore,
            isLoading: false,
            isRefreshing: false
          }));
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch connections',
            isLoading: false,
            isRefreshing: false
          });
        }
      },

      // Fetch incoming requests
      fetchIncomingRequests: async () => {
        set({ isLoading: true, error: null });

        try {
          const requests = await api.connections.getIncomingRequests();
          set({ incomingRequests: requests, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch requests',
            isLoading: false
          });
        }
      },

      // Fetch outgoing requests
      fetchOutgoingRequests: async () => {
        set({ isLoading: true, error: null });

        try {
          const requests = await api.connections.getOutgoingRequests();
          set({ outgoingRequests: requests, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch requests',
            isLoading: false
          });
        }
      },

      // Fetch connection suggestions
      fetchSuggestions: async () => {
        set({ isLoading: true, error: null });

        try {
          const suggestions = await api.connections.getSuggestions();
          set({ suggestions, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch suggestions',
            isLoading: false
          });
        }
      },

      // Fetch blocked users
      fetchBlockedUsers: async () => {
        set({ isLoading: true, error: null });

        try {
          const blockedUsers = await api.connections.getBlockedUsers();
          set({ blockedUsers, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch blocked users',
            isLoading: false
          });
        }
      },

      // Send connection request
      sendConnectionRequest: async (userId: string, message?: string) => {
        set({ isSendingRequest: true, error: null });

        try {
          const request = await api.connections.sendRequest(userId, message);
          
          // Add to outgoing requests
          set(state => ({
            outgoingRequests: [request, ...state.outgoingRequests],
            // Remove from suggestions if present
            suggestions: state.suggestions.filter(s => s.id !== userId),
            isSendingRequest: false
          }));
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to send request',
            isSendingRequest: false
          });
        }
      },

      // Accept connection request
      acceptRequest: async (requestId: string) => {
        const { incomingRequests } = get();
        const request = incomingRequests.find(r => r.id === requestId);

        // Optimistic update
        set(state => ({
          incomingRequests: state.incomingRequests.filter(r => r.id !== requestId)
        }));

        try {
          const connection = await api.connections.acceptRequest(requestId);
          
          // Add to connections
          set(state => ({
            connections: [connection, ...state.connections]
          }));
        } catch (error: any) {
          // Revert on error
          if (request) {
            set(state => ({
              incomingRequests: [...state.incomingRequests, request],
              error: error.message || 'Failed to accept request'
            }));
          }
        }
      },

      // Decline connection request
      declineRequest: async (requestId: string) => {
        const { incomingRequests } = get();
        const request = incomingRequests.find(r => r.id === requestId);

        // Optimistic update
        set(state => ({
          incomingRequests: state.incomingRequests.filter(r => r.id !== requestId)
        }));

        try {
          await api.connections.declineRequest(requestId);
        } catch (error: any) {
          // Revert on error
          if (request) {
            set(state => ({
              incomingRequests: [...state.incomingRequests, request],
              error: error.message || 'Failed to decline request'
            }));
          }
        }
      },

      // Cancel outgoing request
      cancelRequest: async (requestId: string) => {
        const { outgoingRequests } = get();
        const request = outgoingRequests.find(r => r.id === requestId);

        // Optimistic update
        set(state => ({
          outgoingRequests: state.outgoingRequests.filter(r => r.id !== requestId)
        }));

        try {
          await api.connections.cancelRequest(requestId);
        } catch (error: any) {
          // Revert on error
          if (request) {
            set(state => ({
              outgoingRequests: [...state.outgoingRequests, request],
              error: error.message || 'Failed to cancel request'
            }));
          }
        }
      },

      // Remove connection
      removeConnection: async (connectionId: string) => {
        const { connections } = get();
        const connection = connections.find(c => c.id === connectionId);

        // Optimistic update
        set(state => ({
          connections: state.connections.filter(c => c.id !== connectionId)
        }));

        try {
          await api.connections.removeConnection(connectionId);
        } catch (error: any) {
          // Revert on error
          if (connection) {
            set(state => ({
              connections: [...state.connections, connection],
              error: error.message || 'Failed to remove connection'
            }));
          }
        }
      },

      // Block user
      blockUser: async (userId: string) => {
        set({ isLoading: true, error: null });

        try {
          await api.connections.blockUser(userId);
          
          set(state => ({
            // Remove from connections if present
            connections: state.connections.filter(c => c.user.id !== userId),
            // Remove from requests
            incomingRequests: state.incomingRequests.filter(r => r.user.id !== userId),
            outgoingRequests: state.outgoingRequests.filter(r => r.user.id !== userId),
            // Remove from suggestions
            suggestions: state.suggestions.filter(s => s.id !== userId),
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to block user',
            isLoading: false
          });
        }
      },

      // Unblock user
      unblockUser: async (userId: string) => {
        set({ isLoading: true, error: null });

        try {
          await api.connections.unblockUser(userId);
          
          set(state => ({
            blockedUsers: state.blockedUsers.filter(u => u.id !== userId),
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to unblock user',
            isLoading: false
          });
        }
      },

      // Search connections locally
      searchConnections: (query: string) => {
        const { connections } = get();
        const lowerQuery = query.toLowerCase();
        
        return connections.filter(c =>
          c.user.name.toLowerCase().includes(lowerQuery) ||
          c.user.title?.toLowerCase().includes(lowerQuery) ||
          c.user.company?.toLowerCase().includes(lowerQuery)
        );
      },

      // Get connection status for a user
      getConnectionStatus: (userId: string): ConnectionStatus => {
        const { connections, incomingRequests, outgoingRequests, blockedUsers } = get();
        
        if (blockedUsers.some(u => u.id === userId)) {
          return 'blocked';
        }
        
        if (connections.some(c => c.user.id === userId)) {
          return 'connected';
        }
        
        if (outgoingRequests.some(r => r.user.id === userId)) {
          return 'pending_sent';
        }
        
        if (incomingRequests.some(r => r.user.id === userId)) {
          return 'pending_received';
        }
        
        return 'none';
      },

      // Real-time: Handle new connection request
      handleConnectionRequest: (request: ConnectionRequest) => {
        set(state => {
          // Don't add if already exists
          if (state.incomingRequests.some(r => r.id === request.id)) {
            return state;
          }
          return {
            incomingRequests: [request, ...state.incomingRequests]
          };
        });
      },

      // Real-time: Handle connection accepted
      handleConnectionAccepted: (connection: Connection) => {
        set(state => ({
          // Add to connections
          connections: [connection, ...state.connections],
          // Remove from outgoing requests
          outgoingRequests: state.outgoingRequests.filter(
            r => r.user.id !== connection.user.id
          )
        }));
      },

      // Real-time: Handle connection removed
      handleConnectionRemoved: (connectionId: string) => {
        set(state => ({
          connections: state.connections.filter(c => c.id !== connectionId)
        }));
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Reset store
      reset: () => set({
        connections: [],
        incomingRequests: [],
        outgoingRequests: [],
        suggestions: [],
        blockedUsers: [],
        connectionsCursor: null,
        connectionsHasMore: true,
        isLoading: false,
        isRefreshing: false,
        isSendingRequest: false,
        error: null
      })
    }),
    {
      name: 'connection-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist connections (not loading states)
      partialize: (state) => ({
        connections: state.connections.slice(0, 100)
      })
    }
  )
);

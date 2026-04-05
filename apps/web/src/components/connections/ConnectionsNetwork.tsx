'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * ConnectionsNetwork - Professional networking component
 * 
 * Features:
 * - View connections
 * - Connection requests
 * - Find people to connect with
 * - Connection recommendations
 * - Mutual connections
 */

interface Connection {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    title?: string;
    company?: string;
    location?: string;
    isIndigenous: boolean;
    nation?: string;
    isVerified: boolean;
  };
  connectedAt: string;
  mutualConnections: number;
  sharedInterests: string[];
}

interface ConnectionRequest {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    title?: string;
    company?: string;
    location?: string;
    isIndigenous: boolean;
    nation?: string;
  };
  message?: string;
  sentAt: string;
  mutualConnections: number;
  type: 'received' | 'sent';
}

interface PersonSuggestion {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    title?: string;
    company?: string;
    location?: string;
    isIndigenous: boolean;
    nation?: string;
    isVerified: boolean;
  };
  reason: string;
  mutualConnections: number;
  sharedInterests: string[];
}

// API functions
const connectionsApi = {
  async getConnections(params?: {
    search?: string;
    filter?: string;
  }): Promise<{ connections: Connection[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.filter) searchParams.set('filter', params.filter);
    
    const res = await fetch(`/api/connections?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch connections');
    return res.json();
  },

  async getRequests(): Promise<{ received: ConnectionRequest[]; sent: ConnectionRequest[] }> {
    const res = await fetch('/api/connections/requests', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json();
  },

  async getSuggestions(): Promise<{ suggestions: PersonSuggestion[] }> {
    const res = await fetch('/api/connections/suggestions', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch suggestions');
    return res.json();
  },

  async sendRequest(userId: string, message?: string): Promise<void> {
    const res = await fetch('/api/connections/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, message }),
    });
    if (!res.ok) throw new Error('Failed to send request');
  },

  async acceptRequest(requestId: string): Promise<void> {
    const res = await fetch(`/api/connections/requests/${requestId}/accept`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to accept request');
  },

  async declineRequest(requestId: string): Promise<void> {
    const res = await fetch(`/api/connections/requests/${requestId}/decline`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to decline request');
  },

  async cancelRequest(requestId: string): Promise<void> {
    const res = await fetch(`/api/connections/requests/${requestId}/cancel`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to cancel request');
  },

  async removeConnection(connectionId: string): Promise<void> {
    const res = await fetch(`/api/connections/${connectionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to remove connection');
  },

  async searchPeople(query: string): Promise<{ results: PersonSuggestion[] }> {
    const res = await fetch(`/api/people/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to search');
    return res.json();
  },
};

// Format date
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Connection Card
function ConnectionCard({
  connection,
  onRemove,
  onMessage,
}: {
  connection: Connection;
  onRemove: () => void;
  onMessage: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {connection.user.avatar ? (
          <OptimizedImage
            src={toCloudinaryAutoUrl(connection.user.avatar)}
            alt={`${connection.user.name} avatar`}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
            {connection.user.name.charAt(0)}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{connection.user.name}</h3>
                {connection.user.isVerified && (
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {connection.user.isIndigenous && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                    🌏 {connection.user.nation || 'First Nations'}
                  </span>
                )}
              </div>
              {connection.user.title && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{connection.user.title}</p>
              )}
              {connection.user.company && (
                <p className="text-sm text-gray-500">{connection.user.company}</p>
              )}
            </div>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                  <button
                    onClick={() => { onMessage(); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Send Message
                  </button>
                  <button
                    onClick={() => { onRemove(); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Remove Connection
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
            {connection.user.location && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {connection.user.location}
              </span>
            )}
            {connection.mutualConnections > 0 && (
              <span>{connection.mutualConnections} mutual connections</span>
            )}
            <span>Connected {formatDate(connection.connectedAt)}</span>
          </div>

          {/* Shared interests */}
          {connection.sharedInterests.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {connection.sharedInterests.slice(0, 3).map((interest, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Button size="sm" onClick={onMessage}>Message</Button>
        <Button variant="outline" size="sm">View Profile</Button>
      </div>
    </div>
  );
}

// Request Card
function RequestCard({
  request,
  onAccept,
  onDecline,
  onCancel,
}: {
  request: ConnectionRequest;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {request.user.avatar ? (
          <OptimizedImage
            src={toCloudinaryAutoUrl(request.user.avatar)}
            alt={`${request.user.name} avatar`}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
            {request.user.name.charAt(0)}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{request.user.name}</h3>
            {request.user.isIndigenous && (
              <span className="text-xs">🌏</span>
            )}
          </div>
          {request.user.title && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{request.user.title}</p>
          )}
          {request.mutualConnections > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {request.mutualConnections} mutual connections
            </p>
          )}
          {request.message && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
              "{request.message}"
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        {request.type === 'received' ? (
          <>
            <Button size="sm" onClick={onAccept}>Accept</Button>
            <Button variant="outline" size="sm" onClick={onDecline}>Ignore</Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel Request</Button>
        )}
      </div>
    </div>
  );
}

// Suggestion Card
function SuggestionCard({
  suggestion,
  onConnect,
  onDismiss,
}: {
  suggestion: PersonSuggestion;
  onConnect: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {suggestion.user.avatar ? (
          <OptimizedImage
            src={toCloudinaryAutoUrl(suggestion.user.avatar)}
            alt={`${suggestion.user.name} avatar`}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-medium">
            {suggestion.user.name.charAt(0)}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{suggestion.user.name}</h3>
                {suggestion.user.isVerified && (
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {suggestion.user.isIndigenous && (
                  <span className="text-xs">🌏</span>
                )}
              </div>
              {suggestion.user.title && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{suggestion.user.title}</p>
              )}
            </div>
            <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{suggestion.reason}</p>

          {suggestion.mutualConnections > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {suggestion.mutualConnections} mutual connections
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Button size="sm" className="w-full" onClick={onConnect}>
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Connect
        </Button>
      </div>
    </div>
  );
}

// Connect Modal
function ConnectModal({
  user,
  onClose,
  onSend,
}: {
  user: { id: string; name: string };
  onClose: () => void;
  onSend: (message?: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [addNote, setAddNote] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Connect with {user.name}
        </h3>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={addNote}
              onChange={(e) => setAddNote(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Add a note to your invitation
            </span>
          </label>

          {addNote && (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi! I'd like to connect because..."
              rows={3}
              maxLength={300}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSend(addNote ? message : undefined)}>
            Send Invitation
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function ConnectionsNetwork() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'connections' | 'requests' | 'suggestions'>('connections');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [requests, setRequests] = useState<{ received: ConnectionRequest[]; sent: ConnectionRequest[] }>({ received: [], sent: [] });
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PersonSuggestion[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingUser, setConnectingUser] = useState<{ id: string; name: string } | null>(null);

  const loadConnections = useCallback(async () => {
    try {
      const { connections } = await connectionsApi.getConnections({ search: searchQuery });
      setConnections(connections);
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  }, [searchQuery]);

  const loadRequests = useCallback(async () => {
    try {
      const data = await connectionsApi.getRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      const { suggestions } = await connectionsApi.getSuggestions();
      setSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadConnections(), loadRequests(), loadSuggestions()]);
    setIsLoading(false);
  }, [loadConnections, loadRequests, loadSuggestions]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(async () => {
        try {
          const { results } = await connectionsApi.searchPeople(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error('Search failed:', error);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults(null);
    }
  }, [searchQuery]);

  const handleSendRequest = async (userId: string, message?: string) => {
    try {
      await connectionsApi.sendRequest(userId, message);
      setConnectingUser(null);
      await loadRequests();
    } catch (error) {
      console.error('Failed to send request:', error);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await connectionsApi.acceptRequest(requestId);
      await Promise.all([loadConnections(), loadRequests()]);
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await connectionsApi.declineRequest(requestId);
      await loadRequests();
    } catch (error) {
      console.error('Failed to decline request:', error);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await connectionsApi.cancelRequest(requestId);
      await loadRequests();
    } catch (error) {
      console.error('Failed to cancel request:', error);
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (confirm('Are you sure you want to remove this connection?')) {
      try {
        await connectionsApi.removeConnection(connectionId);
        await loadConnections();
      } catch (error) {
        console.error('Failed to remove connection:', error);
      }
    }
  };

  const handleDismissSuggestion = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const requestsCount = requests.received.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Network</h1>
        <p className="text-gray-500 mt-1">
          {connections.length} connections
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search connections or find new people..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />

        {/* Search Results Dropdown */}
        {searchResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto z-10">
            {searchResults.length > 0 ? (
              searchResults.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    {person.user.avatar ? (
                      <OptimizedImage
                        src={toCloudinaryAutoUrl(person.user.avatar)}
                        alt={`${person.user.name} avatar`}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center font-medium">
                        {person.user.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{person.user.name}</p>
                      <p className="text-sm text-gray-500">{person.user.title}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setConnectingUser({ id: person.user.id, name: person.user.name })}
                  >
                    Connect
                  </Button>
                </div>
              ))
            ) : (
              <p className="p-4 text-center text-gray-500">No results found</p>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('connections')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'connections'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Connections ({connections.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'requests'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Requests
          {requestsCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {requestsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'suggestions'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Suggestions
        </button>
      </div>

      {/* Content */}
      {activeTab === 'connections' && (
        <div className="grid gap-4 md:grid-cols-2">
          {connections.length > 0 ? (
            connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onRemove={() => handleRemoveConnection(connection.id)}
                onMessage={() => {}}
              />
            ))
          ) : (
            <div className="col-span-2 text-center py-16">
              <div className="text-6xl mb-4">🤝</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No connections yet</h3>
              <p className="text-gray-500 mt-2">
                Start building your network by connecting with people
              </p>
              <Button className="mt-4" onClick={() => setActiveTab('suggestions')}>
                Find People
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Received */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              Received ({requests.received.length})
            </h3>
            {requests.received.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {requests.received.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onAccept={() => handleAcceptRequest(request.id)}
                    onDecline={() => handleDeclineRequest(request.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No pending requests</p>
            )}
          </div>

          {/* Sent */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              Sent ({requests.sent.length})
            </h3>
            {requests.sent.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {requests.sent.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onCancel={() => handleCancelRequest(request.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No pending sent requests</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div>
          <p className="text-gray-500 mb-4">People you may know</p>
          <div className="grid gap-4 md:grid-cols-3">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onConnect={() => setConnectingUser({ id: suggestion.user.id, name: suggestion.user.name })}
                onDismiss={() => handleDismissSuggestion(suggestion.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Connect Modal */}
      {connectingUser && (
        <ConnectModal
          user={connectingUser}
          onClose={() => setConnectingUser(null)}
          onSend={(message) => handleSendRequest(connectingUser.id, message)}
        />
      )}
    </div>
  );
}

export default ConnectionsNetwork;

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { Space_Grotesk } from 'next/font/google';
import PostComposer from '@/components/social/PostComposer';
import {
  Users,
  UserPlus,
  UserCheck,
  Clock,
  Search,
  MessageCircle,
  MoreHorizontal,
  ChevronRight,
  Sparkles,
  Mail,
  Check,
  X,
  Heart,
  Building2,
  MapPin,
  Award,
  TrendingUp,
  Globe,
  Briefcase,
} from 'lucide-react';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

// Theme colors
const colors = {
  pink: '#E91E8C',
  purple: '#8B5CF6',
  emerald: '#10B981',
  amber: '#F59E0B',
  sky: '#0EA5E9',
};

const TABS = ['connections', 'followers', 'following', 'requests', 'suggestions'] as const;
type Tab = (typeof TABS)[number];

interface Person {
  id: string | number;
  name: string;
  role?: string;
  company?: string;
  avatar?: string;
  avatarUrl?: string;
  trustLevel?: string;
  mutualConnections?: number;
  isFollowingBack?: boolean;
  type?: 'received' | 'sent';
  time?: string;
  location?: string;
  isOnline?: boolean;
}

interface Connection {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  headline?: string;
  company?: string;
  avatar?: string;
  avatarUrl?: string;
  trustLevel?: string;
  mutualConnections?: number;
  isFollowingBack?: boolean;
  location?: string;
  isOnline?: boolean;
  time?: string;
}

export default function ConnectionsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('connections');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Data states
  const [connections, setConnections] = useState<Person[]>([]);
  const [followers, setFollowers] = useState<Person[]>([]);
  const [following, setFollowing] = useState<Person[]>([]);
  const [requests, setRequests] = useState<Person[]>([]);
  const [suggestions, setSuggestions] = useState<Person[]>([]);
  const [stats, setStats] = useState({
    connections: 0,
    followers: 0,
    following: 0,
    requests: 0,
  });

  const fetchData = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      // Show empty state for non-authenticated users
      setConnections([]);
      setFollowers([]);
      setFollowing([]);
      setRequests([]);
      setSuggestions([]);
      setStats({
        connections: 0,
        followers: 0,
        following: 0,
        requests: 0,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const opts = { timeout: 5000, skipRetry: true };
      const [connRes, followersRes, followingRes, requestsRes, suggestionsRes] = await Promise.all([
        api('/connections', opts).catch(() => ({ ok: false })),
        api('/connections/followers', opts).catch(() => ({ ok: false })),
        api('/connections/following', opts).catch(() => ({ ok: false })),
        api('/connections/requests', opts).catch(() => ({ ok: false })),
        api('/connections/suggestions', opts).catch(() => ({ ok: false })),
      ]);

      // Process connections
      if (connRes.ok && 'data' in connRes) {
        const mapped = (connRes.data?.connections || []).map((c: Connection) => ({
          id: c.id,
          name: c.name || c.email || 'Unknown',
          role: c.role || c.headline || '',
          company: c.company || '',
          avatarUrl: c.avatar || c.avatarUrl,
          trustLevel: c.trustLevel || 'basic',
          mutualConnections: c.mutualConnections || 0,
          location: c.location,
          isOnline: c.isOnline,
        }));
        setConnections(mapped);
        setStats((prev) => ({ ...prev, connections: mapped.length }));
      } else {
        setConnections([]);
        setStats((prev) => ({ ...prev, connections: 0 }));
      }

      // Process followers
      if (followersRes.ok && 'data' in followersRes) {
        const mapped = (followersRes.data?.followers || []).map((f: Connection) => ({
          id: f.id,
          name: f.name || f.email || 'Unknown',
          role: f.role || f.headline || '',
          company: f.company || '',
          avatarUrl: f.avatar || f.avatarUrl,
          trustLevel: f.trustLevel || 'basic',
          isFollowingBack: !!f.isFollowingBack,
          location: f.location,
        }));
        setFollowers(mapped);
        setStats((prev) => ({ ...prev, followers: mapped.length }));
      } else {
        setFollowers([]);
        setStats((prev) => ({ ...prev, followers: 0 }));
      }

      // Process following
      if (followingRes.ok && 'data' in followingRes) {
        const mapped = (followingRes.data?.following || []).map((f: Connection) => ({
          id: f.id,
          name: f.name || f.email || 'Unknown',
          role: f.role || f.headline || '',
          company: f.company || '',
          avatarUrl: f.avatar || f.avatarUrl,
          trustLevel: f.trustLevel || 'basic',
          location: f.location,
        }));
        setFollowing(mapped);
        setStats((prev) => ({ ...prev, following: mapped.length }));
      } else {
        setFollowing([]);
        setStats((prev) => ({ ...prev, following: 0 }));
      }

      // Process requests
      if (requestsRes.ok && 'data' in requestsRes) {
        const received = (requestsRes.data?.received || []).map((p: Connection) => ({
          id: p.id,
          name: p.name || p.email || 'Unknown',
          role: p.role || p.headline || '',
          company: p.company || '',
          avatarUrl: p.avatar || p.avatarUrl,
          trustLevel: p.trustLevel || 'basic',
          type: 'received' as const,
          time: p.time || 'Recently',
          mutualConnections: p.mutualConnections || 0,
        }));
        const sent = (requestsRes.data?.sent || []).map((p: Connection) => ({
          id: p.id,
          name: p.name || p.email || 'Unknown',
          role: p.role || p.headline || '',
          company: p.company || '',
          avatarUrl: p.avatar || p.avatarUrl,
          trustLevel: p.trustLevel || 'basic',
          type: 'sent' as const,
          time: p.time || 'Recently',
          mutualConnections: p.mutualConnections || 0,
        }));
        const merged = [...received, ...sent];
        setRequests(merged);
        setStats((prev) => ({ ...prev, requests: received.length }));
      } else {
        setRequests([]);
        setStats((prev) => ({ ...prev, requests: 0 }));
      }

      // Process suggestions
      if (suggestionsRes.ok && 'data' in suggestionsRes) {
        const mapped = (suggestionsRes.data?.suggestions || suggestionsRes.data || []).map((s: Connection) => ({
          id: s.id,
          name: s.name || s.email || 'Unknown',
          role: s.role || s.headline || '',
          company: s.company || '',
          avatarUrl: s.avatar || s.avatarUrl,
          mutualConnections: s.mutualConnections || 0,
          location: s.location,
        }));
        setSuggestions(mapped);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
      setConnections([]);
      setFollowers([]);
      setFollowing([]);
      setRequests([]);
      setSuggestions([]);
      setStats({
        connections: 0,
        followers: 0,
        following: 0,
        requests: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Action handlers
  const handleConnect = async (personId: string | number) => {
    if (!isAuthenticated) return;
    setActionLoading(String(personId));
    try {
      await api('/connections/request', {
        method: 'POST',
        body: { targetUserId: personId },
      });
      setSuggestions((prev) => prev.filter((p) => p.id !== personId));
    } catch (err) {
      console.error('Failed to send connection request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (personId: string | number) => {
    if (!isAuthenticated) return;
    setActionLoading(String(personId));
    try {
      await api(`/connections/requests/${personId}/accept`, { method: 'POST' });
      const accepted = requests.find((r) => r.id === personId);
      if (accepted) {
        setConnections((prev) => [{ ...accepted, type: undefined, time: undefined }, ...prev]);
        setRequests((prev) => prev.filter((r) => r.id !== personId));
        setStats((prev) => ({
          ...prev,
          connections: prev.connections + 1,
          requests: Math.max(0, prev.requests - 1),
        }));
      }
    } catch (err) {
      console.error('Failed to accept request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (personId: string | number) => {
    if (!isAuthenticated) return;
    setActionLoading(String(personId));
    try {
      await api(`/connections/requests/${personId}/decline`, { method: 'POST' });
      setRequests((prev) => prev.filter((r) => r.id !== personId));
      setStats((prev) => ({ ...prev, requests: Math.max(0, prev.requests - 1) }));
    } catch (err) {
      console.error('Failed to decline request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFollowBack = async (personId: string | number) => {
    if (!isAuthenticated) return;
    setActionLoading(String(personId));
    try {
      await api('/connections/follow', {
        method: 'POST',
        body: { targetUserId: personId },
      });
      setFollowers((prev) =>
        prev.map((f) => (f.id === personId ? { ...f, isFollowingBack: true } : f))
      );
      setStats((prev) => ({ ...prev, following: prev.following + 1 }));
    } catch (err) {
      console.error('Failed to follow back:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfollow = async (personId: string | number) => {
    if (!isAuthenticated) return;
    setActionLoading(String(personId));
    try {
      await api(`/connections/unfollow/${personId}`, { method: 'DELETE' });
      setFollowing((prev) => prev.filter((f) => f.id !== personId));
      setStats((prev) => ({ ...prev, following: Math.max(0, prev.following - 1) }));
    } catch (err) {
      console.error('Failed to unfollow:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveConnection = async (personId: string | number) => {
    if (!isAuthenticated) return;
    setActionLoading(String(personId));
    try {
      await api(`/connections/${personId}`, { method: 'DELETE' });
      setConnections((prev) => prev.filter((c) => c.id !== personId));
      setStats((prev) => ({ ...prev, connections: Math.max(0, prev.connections - 1) }));
    } catch (err) {
      console.error('Failed to remove connection:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getTrustBadge = (level?: string) => {
    const badges: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
      verified: { icon: <Check className="w-3 h-3" />, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', label: 'Verified' },
      trusted: { icon: <Award className="w-3 h-3" />, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', label: 'Trusted' },
      established: { icon: <TrendingUp className="w-3 h-3" />, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)', label: 'Established' },
      basic: { icon: <Users className="w-3 h-3" />, color: '#64748B', bg: 'rgba(100, 116, 139, 0.15)', label: 'Member' },
      new: { icon: <Sparkles className="w-3 h-3" />, color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.15)', label: 'New' },
    };
    return badges[level || 'basic'] || badges.basic;
  };

  const getDataForTab = () => {
    switch (activeTab) {
      case 'connections':
        return connections;
      case 'followers':
        return followers;
      case 'following':
        return following;
      case 'requests':
        return requests;
      default:
        return [];
    }
  };

  const filteredData = getDataForTab().filter(
    (person) =>
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'connections' as const, label: 'Connections', count: stats.connections, icon: Users },
    { id: 'followers' as const, label: 'Followers', count: stats.followers, icon: Heart },
    { id: 'following' as const, label: 'Following', count: stats.following, icon: UserCheck },
    { id: 'requests' as const, label: 'Requests', count: stats.requests, icon: Clock },
  ];

  return (
    <div
      className={`${spaceGrotesk.className} min-h-screen`}
      style={{
        background: 'linear-gradient(135deg, #1A0F2E 0%, #2D1B69 50%, #3D1A2A 100%)',
      }}
    >
      {/* Decorative patterns */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, #FFD700 1.5px, transparent 1.5px),
            radial-gradient(circle at 80% 70%, #50C878 1.5px, transparent 1.5px),
            radial-gradient(circle at 50% 50%, #E85B8A 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-24">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href="/social-feed"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">My Network</h1>
                <p className="text-gray-400 text-sm mt-1">Manage your professional connections</p>
              </div>
            </div>
            <Link
              href="/connections/find"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-medium text-sm transition-all hover:scale-[1.02] hover:shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)`,
                boxShadow: '0 4px 20px rgba(233, 30, 140, 0.3)',
              }}
            >
              <UserPlus className="w-4 h-4" />
              Find People
            </Link>
          </div>

          {/* Stats Cards - Instagram-style */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative p-4 rounded-2xl transition-all duration-300 ${
                    isActive ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                  }`}
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${colors.pink}20 0%, ${colors.purple}20 100%)`
                      : 'rgba(255, 255, 255, 0.05)',
                    border: isActive ? `1px solid ${colors.pink}50` : '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: isActive
                          ? `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)`
                          : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-bold text-white">{tab.count}</p>
                      <p className={`text-xs ${isActive ? 'text-pink-300' : 'text-gray-400'}`}>{tab.label}</p>
                    </div>
                  </div>
                  {isActive && (
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${colors.pink}, ${colors.purple})` }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Create Post Section */}
          <div className="mb-8">
            <PostComposer
              placeholder="Share something with your network..."
              compact={true}
              onPostCreated={() => {
                // Optionally refresh feed or show toast
              }}
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              />
            </div>

            {/* Pending Requests Banner */}
            {activeTab === 'connections' && stats.requests > 0 && (
              <button
                onClick={() => setActiveTab('requests')}
                className="w-full p-4 rounded-2xl flex items-center justify-between transition-all hover:scale-[1.01]"
                style={{
                  background: `linear-gradient(135deg, ${colors.amber}20 0%, ${colors.pink}20 100%)`,
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${colors.amber}, ${colors.pink})` }}
                  >
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">
                      {stats.requests} pending request{stats.requests > 1 ? 's' : ''}
                    </p>
                    <p className="text-gray-400 text-sm">Tap to review</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            )}

            {/* People List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div
                  className="w-12 h-12 rounded-full animate-spin border-3"
                  style={{
                    borderColor: 'rgba(139, 92, 246, 0.2)',
                    borderTopColor: colors.purple,
                  }}
                />
                <p className="text-gray-400 mt-4">Loading your network...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div
                className="rounded-2xl p-12 text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'rgba(139, 92, 246, 0.2)' }}
                >
                  <Users className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {searchQuery ? 'No results found' : `No ${activeTab} yet`}
                </h3>
                <p className="text-gray-400 mb-6">
                  {searchQuery
                    ? 'Try a different search term'
                    : `Start building your network by connecting with others`}
                </p>
                <Link
                  href="/connections/find"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium"
                  style={{
                    background: `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)`,
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  Find People
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredData.map((person) => {
                  const badge = getTrustBadge(person.trustLevel);
                  const isLoading = actionLoading === String(person.id);

                  return (
                    <div
                      key={person.id}
                      className="group rounded-2xl p-4 transition-all hover:scale-[1.01]"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <Link href={`/profile/${person.id}`} className="relative shrink-0">
                          <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-white/10">
                            {person.avatarUrl ? (
                              <Image
                                src={person.avatarUrl}
                                alt={person.name}
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center text-2xl"
                                style={{
                                  background: `linear-gradient(135deg, ${colors.pink}30 0%, ${colors.purple}30 100%)`,
                                }}
                              >
                                {person.avatar || person.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          {person.isOnline && (
                            <div
                              className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#1A0F2E]"
                              style={{ background: colors.emerald }}
                            />
                          )}
                        </Link>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/profile/${person.id}`}
                              className="font-semibold text-white hover:text-pink-300 transition-colors truncate"
                            >
                              {person.name}
                            </Link>
                            {person.trustLevel && person.trustLevel !== 'basic' && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ background: badge.bg, color: badge.color }}
                              >
                                {badge.icon}
                                {badge.label}
                              </span>
                            )}
                          </div>
                          {person.role && (
                            <p className="text-gray-300 text-sm truncate flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5 text-gray-500" />
                              {person.role}
                            </p>
                          )}
                          {person.company && (
                            <p className="text-gray-400 text-sm truncate flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-gray-500" />
                              {person.company}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                            {person.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {person.location}
                              </span>
                            )}
                            {person.mutualConnections !== undefined && person.mutualConnections > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {person.mutualConnections} mutual
                              </span>
                            )}
                            {person.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {person.time}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {activeTab === 'connections' && (
                            <>
                              <Link
                                href={`/messages?user=${person.id}`}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                                style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                              >
                                <MessageCircle className="w-5 h-5" />
                              </Link>
                              <button
                                onClick={() => handleRemoveConnection(person.id)}
                                disabled={isLoading}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                              >
                                <MoreHorizontal className="w-5 h-5" />
                              </button>
                            </>
                          )}

                          {activeTab === 'followers' && (
                            <button
                              onClick={() => handleFollowBack(person.id)}
                              disabled={isLoading || person.isFollowingBack}
                              className="px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50"
                              style={
                                person.isFollowingBack
                                  ? { background: 'rgba(255, 255, 255, 0.1)', color: '#94A3B8' }
                                  : {
                                      background: `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)`,
                                      color: 'white',
                                    }
                              }
                            >
                              {isLoading ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                </span>
                              ) : person.isFollowingBack ? (
                                'Following'
                              ) : (
                                'Follow Back'
                              )}
                            </button>
                          )}

                          {activeTab === 'following' && (
                            <button
                              onClick={() => handleUnfollow(person.id)}
                              disabled={isLoading}
                              className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                              style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#94A3B8' }}
                            >
                              {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                'Following'
                              )}
                            </button>
                          )}

                          {activeTab === 'requests' && person.type === 'received' && (
                            <>
                              <button
                                onClick={() => handleAccept(person.id)}
                                disabled={isLoading}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-50"
                                style={{
                                  background: `linear-gradient(135deg, ${colors.emerald} 0%, #059669 100%)`,
                                }}
                              >
                                {isLoading ? (
                                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <Check className="w-5 h-5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDecline(person.id)}
                                disabled={isLoading}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                                style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          )}

                          {activeTab === 'requests' && person.type === 'sent' && (
                            <button
                              onClick={() => handleDecline(person.id)}
                              disabled={isLoading}
                              className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                              style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#94A3B8' }}
                            >
                              {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                'Cancel'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column - Suggestions */}
          <div className="space-y-6">
            {/* People You May Know */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">People You May Know</h3>
                <Link href="/connections/find" className="text-pink-400 text-sm hover:text-pink-300 transition-colors">
                  See All
                </Link>
              </div>
              <div className="space-y-4">
                {suggestions.slice(0, 5).map((person) => {
                  const isLoading = actionLoading === String(person.id);
                  return (
                    <div key={person.id} className="flex items-center gap-3">
                      <Link href={`/profile/${person.id}`} className="shrink-0">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/10">
                          {person.avatarUrl ? (
                            <Image
                              src={person.avatarUrl}
                              alt={person.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-lg"
                              style={{
                                background: `linear-gradient(135deg, ${colors.pink}30 0%, ${colors.purple}30 100%)`,
                              }}
                            >
                              {person.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/profile/${person.id}`}
                          className="font-medium text-white hover:text-pink-300 transition-colors text-sm truncate block"
                        >
                          {person.name}
                        </Link>
                        <p className="text-gray-400 text-xs truncate">{person.role}</p>
                        {person.mutualConnections !== undefined && person.mutualConnections > 0 && (
                          <p className="text-gray-500 text-xs">{person.mutualConnections} mutual</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleConnect(person.id)}
                        disabled={isLoading}
                        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-50"
                        style={{
                          background: `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)`,
                        }}
                      >
                        {isLoading ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Invite Friends */}
            <div
              className="rounded-2xl p-5 text-center"
              style={{
                background: `linear-gradient(135deg, ${colors.purple}15 0%, ${colors.pink}15 100%)`,
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
            >
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{ background: `linear-gradient(135deg, ${colors.pink}30 0%, ${colors.purple}30 100%)` }}
              >
                <Mail className="w-8 h-8 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Grow Your Network</h3>
              <p className="text-gray-400 text-sm mb-4">Invite friends and colleagues to join the community</p>
              <button
                className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)`,
                  boxShadow: '0 4px 15px rgba(233, 30, 140, 0.3)',
                }}
              >
                Invite Contacts
              </button>
            </div>

            {/* Network Insights */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Network Insights
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span className="text-gray-300 text-sm">Profile views</span>
                  </div>
                  <span className="text-white font-semibold">47</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-amber-400" />
                    <span className="text-gray-300 text-sm">Search appearances</span>
                  </div>
                  <span className="text-white font-semibold">23</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-pink-400" />
                    <span className="text-gray-300 text-sm">Network strength</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">Strong</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

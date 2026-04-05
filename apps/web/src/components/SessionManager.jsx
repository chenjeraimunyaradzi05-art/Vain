'use client';

/**
 * Session Manager Component
 * Displays and manages active user sessions with security controls
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';
import useAuth from '@/hooks/useAuth';
import {
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  MapPin,
  Clock,
  Shield,
  AlertTriangle,
  LogOut,
  Loader2,
  Check,
  RefreshCw,
  LaptopIcon
} from 'lucide-react';

// Device type icons
const DEVICE_ICONS = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
  laptop: LaptopIcon,
  unknown: Globe,
};

// Parse user agent for device info
function parseUserAgent(ua) {
  if (!ua) return { device: 'unknown', browser: 'Unknown', os: 'Unknown' };
  
  let device = 'desktop';
  let browser = 'Unknown';
  let os = 'Unknown';
  
  // Detect device type
  if (/mobile/i.test(ua)) device = 'mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'tablet';
  else if (/laptop/i.test(ua)) device = 'laptop';
  
  // Detect browser
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edge/i.test(ua)) browser = 'Edge';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';
  
  // Detect OS
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  
  return { device, browser, os };
}

function SessionCard({ session, isCurrentSession, onRevoke, revoking }) {
  const { device, browser, os } = parseUserAgent(session.userAgent);
  const DeviceIcon = DEVICE_ICONS[device] || DEVICE_ICONS.unknown;
  
  const createdAt = new Date(session.createdAt);
  const lastUsed = session.lastUsedAt ? new Date(session.lastUsedAt) : createdAt;
  
  const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className={`bg-slate-800/50 border rounded-xl p-4 ${
      isCurrentSession 
        ? 'border-purple-600/50 bg-purple-900/10' 
        : 'border-slate-700/50'
    }`}>
      <div className="flex items-start gap-4">
        {/* Device icon */}
        <div className={`p-3 rounded-lg flex-shrink-0 ${
          isCurrentSession ? 'bg-purple-900/30' : 'bg-slate-700/50'
        }`}>
          <DeviceIcon className={`w-6 h-6 ${
            isCurrentSession ? 'text-purple-400' : 'text-slate-400'
          }`} />
        </div>
        
        {/* Session info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white">
              {browser} on {os}
            </h4>
            {isCurrentSession && (
              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                Current
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-400">
            {session.ipAddress && (
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {session.ipAddress}
              </span>
            )}
            
            {session.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {session.location}
              </span>
            )}
            
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Active {formatRelativeTime(lastUsed)}
            </span>
          </div>
          
          <p className="text-xs text-slate-500 mt-2">
            Session started {createdAt.toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        
        {/* Revoke button */}
        {!isCurrentSession && (
          <button
            onClick={() => onRevoke(session.id)}
            disabled={revoking}
            className="flex-shrink-0 p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
            title="End session"
          >
            {revoking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SessionManager() {
  const { isAuthenticated, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { ok, data } = await api('/sessions');

      if (ok) {
        setSessions(data.sessions || []);
        setCurrentSessionId(data.currentSessionId);
      } else {
        throw new Error('Failed to fetch sessions');
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Unable to load sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionId) => {
    if (!isAuthenticated) return;

    setRevoking(sessionId);
    try {
      const { ok } = await api(`/sessions/${sessionId}`, { method: 'DELETE' });

      if (ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      }
    } catch (err) {
      console.error('Failed to revoke session:', err);
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAllOther = async () => {
    if (!isAuthenticated || !confirm('Are you sure you want to sign out of all other devices?')) return;

    setRevokingAll(true);
    try {
      const { ok } = await api('/sessions/logout-all-other', { method: 'POST' });

      if (ok) {
        // Keep only current session
        setSessions(prev => prev.filter(s => s.id === currentSessionId));
      }
    } catch (err) {
      console.error('Failed to revoke all sessions:', err);
    } finally {
      setRevokingAll(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!isAuthenticated || !confirm('Are you sure you want to sign out of ALL devices including this one?')) return;

    try {
      await api('/sessions/logout-all', { method: 'POST' });
      
      // Log out current user
      logout?.();
    } catch (err) {
      console.error('Failed to logout all:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  const otherSessions = sessions.filter(s => s.id !== currentSessionId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />
            Active Sessions
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Manage devices that are signed in to your account
          </p>
        </div>
        
        <button
          onClick={fetchSessions}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          title="Refresh sessions"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Security notice */}
      <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-700/30 text-amber-300 px-4 py-3 rounded-xl">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Security notice</p>
          <p className="text-amber-300/80 mt-1">
            If you see a session you don't recognize, revoke it immediately and change your password.
          </p>
        </div>
      </div>

      {/* Sessions list */}
      <div className="space-y-4">
        {/* Current session */}
        {sessions.find(s => s.id === currentSessionId) && (
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">This device</h3>
            <SessionCard
              session={sessions.find(s => s.id === currentSessionId)}
              isCurrentSession={true}
            />
          </div>
        )}

        {/* Other sessions */}
        {otherSessions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">
              Other devices ({otherSessions.length})
            </h3>
            <div className="space-y-3">
              {otherSessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isCurrentSession={false}
                  onRevoke={handleRevokeSession}
                  revoking={revoking === session.id}
                />
              ))}
            </div>
          </div>
        )}

        {sessions.length === 0 && !error && (
          <div className="text-center py-8 bg-slate-800/30 rounded-xl">
            <Shield className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No active sessions found</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {(otherSessions.length > 0 || sessions.length > 1) && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700/50">
          {otherSessions.length > 0 && (
            <button
              onClick={handleRevokeAllOther}
              disabled={revokingAll}
              className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {revokingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              Sign out other devices
            </button>
          )}
          
          <button
            onClick={handleLogoutAll}
            className="flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg transition-colors border border-red-700/50"
          >
            <LogOut className="w-4 h-4" />
            Sign out everywhere
          </button>
        </div>
      )}
    </div>
  );
}

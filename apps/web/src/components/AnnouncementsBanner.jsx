'use client';

/**
 * Announcements Banner Component
 * Displays platform announcements to users with dismissal support
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';
import useAuth from '@/hooks/useAuth';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Megaphone,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const TYPE_STYLES = {
  info: {
    bg: 'bg-blue-900/40 border-blue-700/50',
    icon: Info,
    iconColor: 'text-blue-400',
  },
  success: {
    bg: 'bg-green-900/40 border-green-700/50',
    icon: CheckCircle,
    iconColor: 'text-green-400',
  },
  warning: {
    bg: 'bg-amber-900/40 border-amber-700/50',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
  },
  banner: {
    bg: 'bg-gradient-to-r from-purple-900/40 to-gold-900/40 border-purple-700/50',
    icon: Megaphone,
    iconColor: 'text-purple-400',
  },
  modal: {
    bg: 'bg-slate-800/90 border-slate-600/50',
    icon: Bell,
    iconColor: 'text-slate-300',
  },
};

function AnnouncementItem({ announcement, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const style = TYPE_STYLES[announcement.type] || TYPE_STYLES.info;
  const Icon = style.icon;

  const isLongContent = announcement.content?.length > 150;
  const displayContent = expanded || !isLongContent 
    ? announcement.content 
    : announcement.content.substring(0, 150) + '...';

  return (
    <div 
      className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} animate-in slide-in-from-top duration-300`}
      role="alert"
      aria-labelledby={`announcement-${announcement.id}`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
      
      <div className="flex-1 min-w-0">
        <h3 
          id={`announcement-${announcement.id}`}
          className="font-semibold text-sm text-white"
        >
          {announcement.title}
        </h3>
        
        {announcement.content && (
          <p className="text-sm text-slate-300 mt-1">
            {displayContent}
          </p>
        )}

        {isLongContent && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-1"
          >
            {expanded ? (
              <>Show less <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Read more <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        )}

        {announcement.actionUrl && announcement.actionText && (
          <a
            href={announcement.actionUrl}
            className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 mt-2 font-medium"
          >
            {announcement.actionText}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <button
        onClick={() => onDismiss(announcement.id)}
        className="p-1 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-700/50"
        aria-label="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function AnnouncementsBanner() {
  const { isAuthenticated } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const { ok, data } = await api('/announcements');

      if (ok) {
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const dismissAnnouncement = async (id) => {
    // Optimistically remove from UI
    setAnnouncements(prev => prev.filter(a => a.id !== id));

    try {
      await api(`/announcements/${id}/dismiss`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to dismiss announcement:', err);
      // Refetch on error to restore state
      fetchAnnouncements();
    }
  };

  if (loading || announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {announcements.map((announcement) => (
        <AnnouncementItem
          key={announcement.id}
          announcement={announcement}
          onDismiss={dismissAnnouncement}
        />
      ))}
    </div>
  );
}

// Modal-style announcement for high-priority messages
export function AnnouncementModal({ announcement, onDismiss }) {
  if (!announcement) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="modal-announcement-title"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-purple-400" />
            <h2 
              id="modal-announcement-title"
              className="text-lg font-bold text-white"
            >
              {announcement.title}
            </h2>
          </div>
          <button
            onClick={() => onDismiss(announcement.id)}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-300 mb-6">
          {announcement.content}
        </p>

        {announcement.actionUrl && announcement.actionText ? (
          <div className="flex gap-3">
            <a
              href={announcement.actionUrl}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-center font-medium transition-colors"
            >
              {announcement.actionText}
            </a>
            <button
              onClick={() => onDismiss(announcement.id)}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Later
            </button>
          </div>
        ) : (
          <button
            onClick={() => onDismiss(announcement.id)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            Got it
          </button>
        )}
      </div>
    </div>
  );
}

export default AnnouncementsBanner;

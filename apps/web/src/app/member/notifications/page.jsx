'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import useAuth from '../../../hooks/useAuth';
import { 
  Bell, 
  Check, 
  CheckCheck,
  Briefcase, 
  MessageSquare, 
  Calendar,
  Award,
  Users,
  Trash2,
  Settings,
  Filter
} from 'lucide-react';

const API_URL = API_BASE;

const NOTIFICATION_TYPES = {
  JOB_APPLICATION_UPDATE: { icon: Briefcase, color: 'blue', label: 'Application' },
  MESSAGE_RECEIVED: { icon: MessageSquare, color: 'green', label: 'Message' },
  SESSION_REMINDER: { icon: Calendar, color: 'purple', label: 'Session' },
  BADGE_EARNED: { icon: Award, color: 'amber', label: 'Badge' },
  MENTORSHIP_UPDATE: { icon: Users, color: 'cyan', label: 'Mentorship' },
  SYSTEM: { icon: Bell, color: 'slate', label: 'System' },
};

export default function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (token) {
      loadNotifications();
    }
  }, [token]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      // Demo data
      setNotifications([
        {
          id: '1',
          type: 'JOB_APPLICATION_UPDATE',
          title: 'Application Status Update',
          message: 'Your application for Community Engagement Officer has moved to the interview stage.',
          read: false,
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          link: '/member/applications',
        },
        {
          id: '2',
          type: 'MESSAGE_RECEIVED',
          title: 'New Message',
          message: 'First Nations Health sent you a message regarding your application.',
          read: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          link: '/member/messages',
        },
        {
          id: '3',
          type: 'SESSION_REMINDER',
          title: 'Upcoming Mentorship Session',
          message: 'Reminder: You have a session with Sarah Johnson tomorrow at 2:00 PM.',
          read: true,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          link: '/mentorship/sessions',
        },
        {
          id: '4',
          type: 'BADGE_EARNED',
          title: 'Badge Earned!',
          message: 'Congratulations! You earned the "Profile Complete" badge.',
          read: true,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          link: '/member/badges',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId) {
    setActionLoading(notificationId);
    try {
      await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    } finally {
      setActionLoading(null);
    }
  }

  async function markAllAsRead() {
    setActionLoading('all');
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteNotification(notificationId) {
    setActionLoading(notificationId);
    try {
      await fetch(`${API_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    } finally {
      setActionLoading(null);
    }
  }

  function formatTimeAgo(dateStr) {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <Bell className="w-16 h-16 mx-auto text-slate-500 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <p className="text-slate-400 mb-6">Sign in to view your notifications.</p>
        <Link
          href="/signin?returnTo=/member/notifications"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><Link href="/" className="hover:text-blue-400 transition-colors">Home</Link></li>
          <li><span className="text-slate-600">/</span></li>
          <li><Link href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</Link></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Notifications</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Bell className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-slate-400 text-sm">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={actionLoading === 'all'}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          <Link
            href="/settings/notifications"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Notification settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
            filter === 'unread' 
              ? 'bg-blue-600 text-white' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-blue-500" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 border border-slate-700 rounded-xl">
          <Bell className="w-12 h-12 mx-auto text-slate-500 mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h2>
          <p className="text-slate-400">
            {filter === 'unread' 
              ? "You're all caught up!" 
              : "When you receive updates, they'll appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => {
            const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.SYSTEM;
            const IconComponent = typeConfig.icon;
            
            return (
              <div 
                key={notification.id}
                className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
                  notification.read 
                    ? 'bg-slate-800/30 border border-slate-800' 
                    : 'bg-slate-800/50 border border-blue-800/50'
                }`}
              >
                <div className={`p-2 rounded-lg bg-${typeConfig.color}-600/20`}>
                  <IconComponent className={`w-5 h-5 text-${typeConfig.color}-400`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-medium ${notification.read ? 'text-slate-300' : 'text-white'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-slate-400 mt-1">{notification.message}</p>
                    </div>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-500">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      {notification.link && (
                        <Link
                          href={notification.link}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          View details
                        </Link>
                      )}
                      {!notification.read && (
                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          disabled={actionLoading === notification.id}
                          className="p-1 text-slate-500 hover:text-green-400 transition-colors disabled:opacity-50"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteNotification(notification.id)}
                        disabled={actionLoading === notification.id}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

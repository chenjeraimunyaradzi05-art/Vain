'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Bell, X, Check, Trash2, Settings } from 'lucide-react';
import { Avatar } from './ui/Avatar';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'application' | 'message' | 'job' | 'mentorship';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  href?: string;
  avatar?: string;
  avatarName?: string;
}

interface NotificationDropdownProps {
  notifications?: Notification[];
  unreadCount?: number;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  onClear?: () => void;
  variant?: 'default' | 'cosmic';
}

// Mock notifications for display (deterministic timestamps for SSR/CSR parity)
const mockNotificationBase = '2026-01-19T00:00:00.000Z';

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getNotificationIcon(type: Notification['type']) {
  const iconClasses = 'w-4 h-4';
  
  switch (type) {
    case 'success':
      return <Check className={`${iconClasses} text-green-500`} />;
    case 'warning':
      return <Bell className={`${iconClasses} text-yellow-500`} />;
    case 'application':
      return (
        <svg className={`${iconClasses} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
        </svg>
      );
    case 'message':
      return (
        <svg className={`${iconClasses} text-purple-500`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
        </svg>
      );
    case 'job':
      return (
        <svg className={`${iconClasses} text-emerald-500`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
          <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
        </svg>
      );
    case 'mentorship':
      return (
        <svg className={`${iconClasses} text-[#FFD700]`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      );
    default:
      return <Bell className={`${iconClasses} text-gray-500`} />;
  }
}

export function NotificationDropdown({
  notifications,
  unreadCount: externalUnreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClear,
  variant = 'default',
}: NotificationDropdownProps) {
  const defaultNotifications = useMemo<Notification[]>(() => {
    const base = new Date(mockNotificationBase).getTime();
    return [
      {
        id: '1',
        type: 'application',
        title: 'Application Update',
        message: 'Your application for "Indigenous Community Liaison" has been viewed',
        timestamp: new Date(base - 1000 * 60 * 5),
        read: false,
        href: '/member/applications',
        avatarName: 'Rio Tinto',
      },
      {
        id: '2',
        type: 'message',
        title: 'New Message',
        message: 'You have a new message from your mentor Sarah Thompson',
        timestamp: new Date(base - 1000 * 60 * 30),
        read: false,
        href: '/member/messages',
        avatarName: 'Sarah Thompson',
      },
      {
        id: '3',
        type: 'job',
        title: 'New Job Match',
        message: '3 new jobs match your profile - check them out!',
        timestamp: new Date(base - 1000 * 60 * 60 * 2),
        read: true,
        href: '/jobs',
      },
      {
        id: '4',
        type: 'mentorship',
        title: 'Session Reminder',
        message: 'Your mentorship session starts in 1 hour',
        timestamp: new Date(base - 1000 * 60 * 60 * 3),
        read: true,
        href: '/member/mentorship',
        avatarName: 'John Mabo',
      },
    ];
  }, []);

  const initialNotifications = notifications ?? defaultNotifications;
  const [isOpen, setIsOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState(initialNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = externalUnreadCount ?? localNotifications.filter(n => !n.read).length;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setLocalNotifications(initialNotifications);
  }, [initialNotifications]);

  const handleMarkAsRead = useCallback((id: string) => {
    if (onMarkAsRead) {
      onMarkAsRead(id);
    } else {
      setLocalNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    }
  }, [onMarkAsRead]);

  const handleMarkAllAsRead = useCallback(() => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    } else {
      setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  }, [onMarkAllAsRead]);

  const handleDelete = useCallback((id: string) => {
    if (onDelete) {
      onDelete(id);
    } else {
      setLocalNotifications(prev => prev.filter(n => n.id !== id));
    }
  }, [onDelete]);

  const variantClasses = {
    default: {
      button: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700',
      dropdown: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      header: 'border-b border-gray-200 dark:border-gray-700',
      item: 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
      unread: 'bg-blue-50 dark:bg-blue-900/20',
    },
    cosmic: {
      button: 'text-gray-400 hover:text-[#FFD700] hover:bg-white/5',
      dropdown: 'bg-[#1A0F2E] border border-[#FFD700]/20',
      header: 'border-b border-[#FFD700]/10',
      item: 'hover:bg-white/5',
      unread: 'bg-[#FFD700]/5',
    },
  };

  const styles = variantClasses[variant];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${styles.button}`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`
            absolute right-0 mt-2 w-80 sm:w-96 rounded-xl shadow-xl
            z-50 overflow-hidden
            animate-in fade-in-0 slide-in-from-top-2 duration-200
            ${styles.dropdown}
          `}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 ${styles.header}`}>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
                >
                  Mark all as read
                </button>
              )}
              <Link
                href="/member/notifications/settings"
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {localNotifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              localNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    relative group px-4 py-3 transition-colors
                    ${styles.item}
                    ${!notification.read ? styles.unread : ''}
                  `}
                >
                  <Link
                    href={notification.href || '#'}
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="flex gap-3"
                  >
                    {/* Avatar or Icon */}
                    <div className="flex-shrink-0">
                      {notification.avatar || notification.avatarName ? (
                        <Avatar
                          src={notification.avatar}
                          name={notification.avatarName || 'N'}
                          size="sm"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatTimeAgo(notification.timestamp)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.read && (
                      <div className="flex-shrink-0">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      </div>
                    )}
                  </Link>

                  {/* Delete button (shows on hover) */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(notification.id);
                    }}
                    className="absolute right-2 top-2 p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {localNotifications.length > 0 && (
            <div className={`px-4 py-3 text-center ${styles.header}`}>
              <Link
                href="/member/notifications"
                className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;

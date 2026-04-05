'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Calendar, MessageCircle, FileText, Clock, CheckCircle, XCircle, Star, ChevronRight, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { useNotifications } from '@/components/notifications/NotificationProvider';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  SUBMITTED: { label: 'Submitted', color: 'bg-slate-700 text-slate-300', icon: Clock },
  REVIEWED: { label: 'Reviewed', color: 'bg-blue-900/50 text-blue-300', icon: CheckCircle },
  SHORTLISTED: { label: 'Shortlisted', color: 'bg-purple-900/50 text-purple-300', icon: Star },
  INTERVIEW_SCHEDULED: { label: 'Interview', color: 'bg-yellow-900/50 text-yellow-300', icon: Calendar },
  REJECTED: { label: 'Rejected', color: 'bg-red-900/50 text-red-300', icon: XCircle },
  HIRED: { label: 'Hired! 🎉', color: 'bg-green-900/50 text-green-300', icon: CheckCircle },
};

interface Application {
  id: string;
  status: string;
  createdAt: string;
  coverLetter?: string;
  job: {
    id: string;
    title: string;
    location?: string;
    company?: {
      name: string;
      logoUrl?: string;
    };
  };
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender: {
    name: string;
  };
}

export default function MemberApplications() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { showNotification } = useNotifications();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        load();
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, authLoading]);

  async function load() {
    setLoading(true);
    try {
      const { ok, data } = await api<{ applications: Application[] }>('/member/applications');
      if (ok && data) {
        setApps(data.applications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(appId: string) {
    setMessagesLoading(true);
    try {
      const { ok, data } = await api<{ messages: Message[] }>(`/member/applications/${appId}/messages`);
      if (ok && data) {
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function postMessage(appId: string) {
    if (!newMessage.trim()) {
      showNotification({ message: 'Enter a message', variant: 'error' });
      return;
    }
    try {
      const { ok, error } = await api(`/member/applications/${appId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: newMessage }),
      });
      
      if (!ok) throw new Error(error || 'Failed to send message');
      
      setNewMessage('');
      loadMessages(appId);
    } catch (e: any) {
      showNotification({ message: e.message, variant: 'error' });
    }
  }

  const statusCounts = apps.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><Link href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</Link></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Applications</li>
        </ol>
      </nav>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-400" />
            Your Applications
          </h1>
          <p className="text-sm text-slate-400 mt-1">{apps.length} application{apps.length !== 1 ? 's' : ''} submitted</p>
        </div>
        <Link href="/jobs" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900">
          Find more jobs <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Status summary */}
      {!loading && apps.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(statusCounts).map(([status, count]) => {
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.SUBMITTED;
            return (
              <span key={status} className={`px-3 py-1 rounded-full text-sm ${config.color}`}>
                {config.label}: {count}
              </span>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 space-y-4 ${selectedApp ? 'hidden lg:block' : ''}`}>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-slate-800 rounded-lg h-32" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {apps.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-lg">
                  <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">You haven't applied to any jobs yet.</p>
                  <Link href="/jobs" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500">
                    Browse jobs <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : apps.map(a => {
                const statusConfig = STATUS_CONFIG[a.status] || STATUS_CONFIG.SUBMITTED;
                const StatusIcon = statusConfig.icon;
                const isSelected = selectedApp?.id === a.id;
                
                return (
                  <div 
                    key={a.id} 
                    className={`border rounded-lg p-5 transition cursor-pointer ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-900/10' 
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                    onClick={() => {
                      setSelectedApp(a);
                      loadMessages(a.id);
                    }}
                  >
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-semibold text-lg text-white">
                          {a.job?.title || 'Position'}
                        </div>
                        <div className="text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Applied {new Date(a.createdAt).toLocaleDateString()}
                          </span>
                          {a.job?.location && (
                            <span>{a.job.location}</span>
                          )}
                        </div>
                        
                        {a.coverLetter && (
                          <p className="text-sm text-slate-300 mt-3 line-clamp-2">{a.coverLetter}</p>
                        )}
                      </div>
                      
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Details / Messages Panel */}
        {selectedApp && (
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[600px] sticky top-24">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-semibold">Messages</h3>
              <button 
                onClick={() => setSelectedApp(null)}
                className="lg:hidden text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="text-center text-slate-500 py-4">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet.</p>
                  <p className="text-xs mt-1">Start a conversation with the hiring team.</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                        isMe ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'
                      }`}>
                        <p>{msg.body}</p>
                        <div className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-slate-500'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={e => e.key === 'Enter' && postMessage(selectedApp.id)}
                />
                <button
                  onClick={() => postMessage(selectedApp.id)}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

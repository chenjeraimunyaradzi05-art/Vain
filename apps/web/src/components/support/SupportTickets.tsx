'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * SupportTickets - Customer support and help system
 * 
 * Features:
 * - Create support tickets
 * - Track ticket status
 * - View conversation history
 * - Access FAQ and help articles
 */

interface Ticket {
  id: string;
  ticketNumber: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: 'open' | 'in-progress' | 'waiting-on-user' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  assignedTo?: {
    name: string;
    avatar?: string;
  };
  messages: TicketMessage[];
  attachments: string[];
}

interface TicketMessage {
  id: string;
  content: string;
  sender: 'user' | 'support';
  senderName: string;
  senderAvatar?: string;
  createdAt: string;
  attachments?: string[];
}

type TicketCategory =
  | 'account'
  | 'technical'
  | 'billing'
  | 'job-search'
  | 'applications'
  | 'employer'
  | 'privacy'
  | 'other';

interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  content: string;
  viewCount: number;
  helpfulCount: number;
  updatedAt: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

// API functions
const supportApi = {
  async getTickets(): Promise<{ tickets: Ticket[] }> {
    const res = await fetch('/api/support/tickets', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch tickets');
    return res.json();
  },

  async getTicket(id: string): Promise<Ticket> {
    const res = await fetch(`/api/support/tickets/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch ticket');
    return res.json();
  },

  async createTicket(data: Partial<Ticket>): Promise<Ticket> {
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create ticket');
    return res.json();
  },

  async replyToTicket(id: string, message: string, attachments?: string[]): Promise<TicketMessage> {
    const res = await fetch(`/api/support/tickets/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, attachments }),
    });
    if (!res.ok) throw new Error('Failed to send reply');
    return res.json();
  },

  async closeTicket(id: string): Promise<void> {
    const res = await fetch(`/api/support/tickets/${id}/close`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to close ticket');
  },

  async reopenTicket(id: string): Promise<void> {
    const res = await fetch(`/api/support/tickets/${id}/reopen`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to reopen ticket');
  },

  async getHelpArticles(): Promise<{ articles: HelpArticle[] }> {
    const res = await fetch('/api/support/articles', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch articles');
    return res.json();
  },

  async searchHelp(query: string): Promise<{ articles: HelpArticle[]; faqs: FAQ[] }> {
    const res = await fetch(`/api/support/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to search');
    return res.json();
  },

  async getFAQs(): Promise<{ faqs: FAQ[] }> {
    const res = await fetch('/api/support/faqs', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch FAQs');
    return res.json();
  },

  async markArticleHelpful(id: string): Promise<void> {
    await fetch(`/api/support/articles/${id}/helpful`, {
      method: 'POST',
      credentials: 'include',
    });
  },
};

// Category configurations
const categoryConfig: { value: TicketCategory; label: string; icon: string; description: string }[] = [
  { value: 'account', label: 'Account', icon: '👤', description: 'Login, profile, settings' },
  { value: 'technical', label: 'Technical', icon: '🔧', description: 'Bugs, errors, issues' },
  { value: 'billing', label: 'Billing', icon: '💳', description: 'Payments, subscriptions' },
  { value: 'job-search', label: 'Job Search', icon: '🔍', description: 'Finding jobs, alerts' },
  { value: 'applications', label: 'Applications', icon: '📝', description: 'Applying, tracking' },
  { value: 'employer', label: 'Employer', icon: '🏢', description: 'Posting jobs, hiring' },
  { value: 'privacy', label: 'Privacy', icon: '🔒', description: 'Data, security' },
  { value: 'other', label: 'Other', icon: '❓', description: 'General questions' },
];

const statusConfig = {
  open: { label: 'Open', color: 'bg-green-100 text-green-700' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  'waiting-on-user': { label: 'Awaiting Reply', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resolved', color: 'bg-purple-100 text-purple-700' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-700' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-gray-500' },
  normal: { label: 'Normal', color: 'text-blue-500' },
  high: { label: 'High', color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-500' },
};

// Ticket List Item
function TicketCard({
  ticket,
  onClick,
}: {
  ticket: Ticket;
  onClick: () => void;
}) {
  const category = categoryConfig.find(c => c.value === ticket.category);
  const status = statusConfig[ticket.status];
  const priority = priorityConfig[ticket.priority];
  const hasUnread = ticket.messages.some(
    m => m.sender === 'support' && new Date(m.createdAt) > new Date(ticket.updatedAt)
  );

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{category?.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 dark:text-white">{ticket.subject}</h3>
              {hasUnread && (
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
            <p className="text-xs text-gray-500">#{ticket.ticketNumber}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
            {status.label}
          </span>
          <span className={`text-xs font-medium ${priority.color}`}>{priority.label}</span>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
        {ticket.description}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Created {new Date(ticket.createdAt).toLocaleDateString('en-AU')}</span>
        <span>{ticket.messages.length} messages</span>
      </div>
    </button>
  );
}

// Ticket Detail View
function TicketDetail({
  ticket,
  onBack,
  onReply,
  onClose,
  onReopen,
}: {
  ticket: Ticket;
  onBack: () => void;
  onReply: (message: string) => Promise<void>;
  onClose: () => void;
  onReopen: () => void;
}) {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const category = categoryConfig.find(c => c.value === ticket.category);
  const status = statusConfig[ticket.status];

  const handleSend = async () => {
    if (!replyText.trim()) return;
    setIsSending(true);
    try {
      await onReply(replyText);
      setReplyText('');
    } finally {
      setIsSending(false);
    }
  };

  const isOpen = !['resolved', 'closed'].includes(ticket.status);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">{category?.icon}</span>
              <h2 className="font-semibold text-gray-900 dark:text-white">{ticket.subject}</h2>
            </div>
            <p className="text-xs text-gray-500">#{ticket.ticketNumber}</p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* Assigned Agent */}
        {ticket.assignedTo && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
              {ticket.assignedTo.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{ticket.assignedTo.name}</p>
              <p className="text-xs text-gray-500">Support Agent</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Initial Description */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {ticket.description}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {new Date(ticket.createdAt).toLocaleString('en-AU')}
          </p>
        </div>

        {/* Message Thread */}
        {ticket.messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium ${
                message.sender === 'user'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-green-100 text-green-600'
              }`}
            >
              {message.senderName.charAt(0)}
            </div>
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className={`text-sm ${message.sender === 'user' ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                {message.content}
              </p>
              <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                {message.senderName} • {new Date(message.createdAt).toLocaleString('en-AU')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Input */}
      {isOpen ? (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend} disabled={!replyText.trim() || isSending}>
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close Ticket
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-500 mb-2">This ticket is {ticket.status}</p>
          <button
            onClick={onReopen}
            className="text-sm text-blue-600 hover:underline"
          >
            Reopen Ticket
          </button>
        </div>
      )}
    </div>
  );
}

// Create Ticket Modal
function CreateTicketModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: Partial<Ticket>) => void;
}) {
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Ticket['priority']>('normal');

  const handleCreate = () => {
    if (!category || !subject || !description) return;
    onCreate({ category, subject, description, priority });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Support Ticket</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {categoryConfig.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    category === cat.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{cat.label}</p>
                  <p className="text-xs text-gray-500">{cat.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Please describe your issue in detail. Include any relevant information like error messages, steps to reproduce, etc."
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {Object.entries(priorityConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setPriority(key as Ticket['priority'])}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    priority === key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className={`font-medium ${config.color}`}>{config.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleCreate} className="flex-1" disabled={!category || !subject || !description}>
            Create Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}

// FAQ Section
function FAQSection({ faqs }: { faqs: FAQ[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groupedFaqs = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedFaqs).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{category}</h3>
          <div className="space-y-2">
            {items.map((faq) => (
              <div
                key={faq.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === faq.id ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedId === faq.id && (
                  <div className="px-4 pb-4">
                    <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Help Article Card
function ArticleCard({
  article,
  onClick,
}: {
  article: HelpArticle;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 transition-colors"
    >
      <h3 className="font-medium text-gray-900 dark:text-white mb-1">{article.title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{article.summary}</p>
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
        <span>{article.category}</span>
        <span>•</span>
        <span>{article.viewCount} views</span>
      </div>
    </button>
  );
}

// Main Component
export function SupportTickets() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tickets' | 'help' | 'faq'>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ articles: HelpArticle[]; faqs: FAQ[] } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ticketRes, articleRes, faqRes] = await Promise.all([
        supportApi.getTickets(),
        supportApi.getHelpArticles(),
        supportApi.getFAQs(),
      ]);
      setTickets(ticketRes.tickets);
      setArticles(articleRes.articles);
      setFaqs(faqRes.faqs);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const results = await supportApi.searchHelp(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [searchQuery]);

  useEffect(() => {
    const debounce = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounce);
  }, [handleSearch]);

  const handleCreate = async (data: Partial<Ticket>) => {
    try {
      const created = await supportApi.createTicket(data);
      setTickets([created, ...tickets]);
      setShowCreateModal(false);
      setSelectedTicket(created);
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const handleReply = async (message: string) => {
    if (!selectedTicket) return;
    try {
      const newMessage = await supportApi.replyToTicket(selectedTicket.id, message);
      setSelectedTicket({
        ...selectedTicket,
        messages: [...selectedTicket.messages, newMessage],
        status: 'in-progress',
      });
    } catch (error) {
      console.error('Failed to send reply:', error);
    }
  };

  const handleClose = async () => {
    if (!selectedTicket) return;
    try {
      await supportApi.closeTicket(selectedTicket.id);
      setSelectedTicket({ ...selectedTicket, status: 'closed' });
      setTickets(tickets.map(t => 
        t.id === selectedTicket.id ? { ...t, status: 'closed' } : t
      ));
    } catch (error) {
      console.error('Failed to close ticket:', error);
    }
  };

  const handleReopen = async () => {
    if (!selectedTicket) return;
    try {
      await supportApi.reopenTicket(selectedTicket.id);
      setSelectedTicket({ ...selectedTicket, status: 'open' });
      setTickets(tickets.map(t => 
        t.id === selectedTicket.id ? { ...t, status: 'open' } : t
      ));
    } catch (error) {
      console.error('Failed to reopen ticket:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Ticket Detail View
  if (selectedTicket) {
    return (
      <div className="max-w-4xl mx-auto h-[calc(100vh-100px)]">
        <TicketDetail
          ticket={selectedTicket}
          onBack={() => setSelectedTicket(null)}
          onReply={handleReply}
          onClose={handleClose}
          onReopen={handleReopen}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Center</h1>
          <p className="text-gray-500 mt-1">Get help with Ngurra Pathways</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Ticket
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for help..."
          className="w-full px-4 py-3 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
        />
        <svg
          className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Search Results */}
      {searchResults && (
        <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Search Results for "{searchQuery}"
          </h2>
          {searchResults.articles.length > 0 || searchResults.faqs.length > 0 ? (
            <div className="space-y-4">
              {searchResults.articles.slice(0, 3).map((article) => (
                <ArticleCard key={article.id} article={article} onClick={() => {}} />
              ))}
              {searchResults.faqs.slice(0, 3).map((faq) => (
                <div key={faq.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-white">{faq.question}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{faq.answer}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No results found. Try creating a support ticket.</p>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-6 bg-blue-500 rounded-xl text-white text-left hover:bg-blue-600 transition-colors"
        >
          <span className="text-3xl mb-2 block">🎫</span>
          <h3 className="font-semibold">Create Ticket</h3>
          <p className="text-sm text-blue-100">Get personalized help</p>
        </button>
        <button
          onClick={() => setActiveTab('help')}
          className="p-6 bg-green-500 rounded-xl text-white text-left hover:bg-green-600 transition-colors"
        >
          <span className="text-3xl mb-2 block">📚</span>
          <h3 className="font-semibold">Help Articles</h3>
          <p className="text-sm text-green-100">Browse guides & tutorials</p>
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className="p-6 bg-purple-500 rounded-xl text-white text-left hover:bg-purple-600 transition-colors"
        >
          <span className="text-3xl mb-2 block">❓</span>
          <h3 className="font-semibold">FAQ</h3>
          <p className="text-sm text-purple-100">Common questions</p>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        {([
          { key: 'tickets', label: 'My Tickets' },
          { key: 'help', label: 'Help Articles' },
          { key: 'faq', label: 'FAQ' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'tickets' && (
        tickets.length > 0 ? (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => setSelectedTicket(ticket)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No tickets yet</h3>
            <p className="text-gray-500 mt-2 mb-6">Create a ticket to get help from our support team</p>
            <Button onClick={() => setShowCreateModal(true)}>Create Ticket</Button>
          </div>
        )
      )}

      {activeTab === 'help' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} onClick={() => {}} />
          ))}
        </div>
      )}

      {activeTab === 'faq' && <FAQSection faqs={faqs} />}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

export default SupportTickets;

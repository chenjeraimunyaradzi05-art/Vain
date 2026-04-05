'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import api from '@/lib/apiClient';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * CommunityInitiatives - Browse and participate in community initiatives
 * 
 * Features:
 * - View community initiatives and projects
 * - Join/volunteer for initiatives
 * - Track participation and impact
 * - Submit new initiative proposals
 * - Share updates and progress
 */

interface Initiative {
  id: string;
  title: string;
  description: string;
  category: 'education' | 'employment' | 'health' | 'culture' | 'environment' | 'youth' | 'elders';
  status: 'planning' | 'active' | 'completed' | 'paused';
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    region: string;
    isRemote: boolean;
  };
  organizer: {
    id: string;
    name: string;
    avatar?: string;
    organization?: string;
  };
  imageUrl?: string;
  goals: string[];
  impactMetrics: {
    label: string;
    value: number;
    target?: number;
  }[];
  volunteerCount: number;
  targetVolunteers?: number;
  isVolunteering: boolean;
  updates: {
    id: string;
    content: string;
    createdAt: string;
    author: { name: string; avatar?: string };
  }[];
  tags: string[];
}

interface UserImpact {
  initiativesJoined: number;
  hoursContributed: number;
  peopleImpacted: number;
  badges: { id: string; name: string; icon: string }[];
}

// API functions
const initiativesApi = {
  async getInitiatives(params?: { 
    category?: string; 
    status?: string;
    region?: string;
  }): Promise<{ initiatives: Initiative[] }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.region) searchParams.set('region', params.region);
    
    const response = await api(`/community/initiatives?${searchParams.toString()}`);
    return response.ok ? (response.data || { initiatives: [] }) : { initiatives: [] };
  },

  async getMyInitiatives(): Promise<{ initiatives: Initiative[] }> {
    const response = await api('/community/initiatives/my');
    return response.ok ? (response.data || { initiatives: [] }) : { initiatives: [] };
  },

  async getImpact(): Promise<UserImpact> {
    const response = await api('/community/impact');
    if (!response.ok || !response.data) throw new Error('Failed to load impact');
    return response.data;
  },

  async joinInitiative(id: string): Promise<void> {
    await api(`/community/initiatives/${id}/join`, { method: 'POST' });
  },

  async leaveInitiative(id: string): Promise<void> {
    await api(`/community/initiatives/${id}/leave`, { method: 'POST' });
  },

  async submitProposal(data: {
    title: string;
    description: string;
    category: string;
    goals: string[];
    location: { name: string; region: string; isRemote: boolean };
  }): Promise<Initiative> {
    const response = await api('/community/initiatives/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok || !response.data) throw new Error('Failed to submit proposal');
    return response.data;
  },
};

// Category config
const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  education: { label: 'Education', icon: '📚', color: 'blue' },
  employment: { label: 'Employment', icon: '💼', color: 'green' },
  health: { label: 'Health & Wellbeing', icon: '💚', color: 'emerald' },
  culture: { label: 'Culture & Heritage', icon: '🎨', color: 'purple' },
  environment: { label: 'Environment', icon: '🌿', color: 'teal' },
  youth: { label: 'Youth Programs', icon: '🌟', color: 'amber' },
  elders: { label: 'Elders Support', icon: '🙏', color: 'rose' },
};

// Status config
const statusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planning', color: 'yellow' },
  active: { label: 'Active', color: 'green' },
  completed: { label: 'Completed', color: 'blue' },
  paused: { label: 'Paused', color: 'gray' },
};

const regions = [
  'All Regions',
  'New South Wales',
  'Victoria',
  'Queensland',
  'Western Australia',
  'South Australia',
  'Tasmania',
  'Northern Territory',
  'Australian Capital Territory',
];

// Initiative Card
function InitiativeCard({
  initiative,
  onJoin,
  onViewDetails,
}: {
  initiative: Initiative;
  onJoin: () => void;
  onViewDetails: () => void;
}) {
  const category = categoryConfig[initiative.category] || categoryConfig.culture;
  const status = statusConfig[initiative.status];
  const progress = initiative.targetVolunteers 
    ? Math.round((initiative.volunteerCount / initiative.targetVolunteers) * 100)
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      {initiative.imageUrl && (
        <div className="relative h-40">
          <OptimizedImage
            src={toCloudinaryAutoUrl(initiative.imageUrl)}
            alt={`${initiative.title} image`}
            width={1200}
            height={160}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 flex gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${category.color}-100 text-${category.color}-700`}>
              {category.icon} {category.label}
            </span>
          </div>
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${status.color}-100 text-${status.color}-700`}>
              {status.label}
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Category badge if no image */}
        {!initiative.imageUrl && (
          <div className="flex items-center justify-between mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${category.color}-100 dark:bg-${category.color}-900/30 text-${category.color}-700 dark:text-${category.color}-400`}>
              {category.icon} {category.label}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${status.color}-100 dark:bg-${status.color}-900/30 text-${status.color}-700 dark:text-${status.color}-400`}>
              {status.label}
            </span>
          </div>
        )}

        {/* Title & Description */}
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">{initiative.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{initiative.description}</p>

        {/* Location */}
        <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
          {initiative.location.isRemote ? (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              Remote / {initiative.location.region}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {initiative.location.name}
            </span>
          )}
        </div>

        {/* Volunteer Progress */}
        {initiative.targetVolunteers && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500">Volunteers</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {initiative.volunteerCount} / {initiative.targetVolunteers}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(progress || 0, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Impact Metrics */}
        {initiative.impactMetrics.length > 0 && (
          <div className="flex gap-4 mt-4">
            {initiative.impactMetrics.slice(0, 2).map((metric, i) => (
              <div key={i} className="text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{metric.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{metric.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {initiative.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {initiative.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" className="flex-1" onClick={onViewDetails}>
            Learn More
          </Button>
          {initiative.status === 'active' && (
            initiative.isVolunteering ? (
              <Button variant="outline" size="sm" className="flex-1 text-green-600" onClick={onJoin}>
                ✓ Joined
              </Button>
            ) : (
              <Button size="sm" className="flex-1" onClick={onJoin}>
                Join
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Initiative Detail Modal
function InitiativeDetailModal({
  initiative,
  onClose,
  onJoin,
}: {
  initiative: Initiative;
  onClose: () => void;
  onJoin: () => void;
}) {
  const category = categoryConfig[initiative.category] || categoryConfig.culture;
  const status = statusConfig[initiative.status];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header Image */}
        {initiative.imageUrl && (
          <div className="relative h-56">
            <OptimizedImage
              src={toCloudinaryAutoUrl(initiative.imageUrl)}
              alt={`${initiative.title} image`}
              width={1200}
              height={224}
              className="w-full h-full object-cover"
            />
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {!initiative.imageUrl && (
            <div className="flex justify-end mb-4">
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full bg-${category.color}-100 dark:bg-${category.color}-900/30 text-${category.color}-700 dark:text-${category.color}-400`}>
              {category.icon} {category.label}
            </span>
            <span className={`px-3 py-1 text-sm font-medium rounded-full bg-${status.color}-100 dark:bg-${status.color}-900/30 text-${status.color}-700 dark:text-${status.color}-400`}>
              {status.label}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{initiative.title}</h2>

          {/* Organizer */}
          <div className="flex items-center gap-3 mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            {initiative.organizer.avatar ? (
              <OptimizedImage
                src={toCloudinaryAutoUrl(initiative.organizer.avatar)}
                alt={`${initiative.organizer.name} avatar`}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
                {initiative.organizer.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{initiative.organizer.name}</p>
              {initiative.organizer.organization && (
                <p className="text-sm text-gray-500">{initiative.organizer.organization}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About This Initiative</h3>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{initiative.description}</p>
          </div>

          {/* Goals */}
          {initiative.goals.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Goals</h3>
              <ul className="space-y-2">
                {initiative.goals.map((goal, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Impact Metrics */}
          {initiative.impactMetrics.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Impact</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {initiative.impactMetrics.map((metric, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{metric.label}</p>
                    {metric.target && (
                      <div className="mt-2">
                        <div className="h-1 bg-gray-200 dark:bg-gray-600 rounded-full">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Goal: {metric.target.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Updates */}
          {initiative.updates.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Updates</h3>
              <div className="space-y-4">
                {initiative.updates.slice(0, 3).map((update) => (
                  <div key={update.id} className="border-l-2 border-blue-500 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      {update.author.avatar ? (
                        <OptimizedImage
                          src={toCloudinaryAutoUrl(update.author.avatar)}
                          alt={`${update.author.name} avatar`}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs">
                          {update.author.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{update.author.name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(update.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{update.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {initiative.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {initiative.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          {initiative.status === 'active' && (
            <Button 
              className="flex-1" 
              onClick={onJoin}
              variant={initiative.isVolunteering ? 'outline' : 'primary'}
            >
              {initiative.isVolunteering ? 'Leave Initiative' : 'Join This Initiative'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Impact Summary
function ImpactSummary({ impact }: { impact: UserImpact }) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
      <h3 className="font-semibold mb-4">Your Community Impact</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold">{impact.initiativesJoined}</p>
          <p className="text-sm opacity-80">Initiatives</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{impact.hoursContributed}</p>
          <p className="text-sm opacity-80">Hours</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{impact.peopleImpacted}</p>
          <p className="text-sm opacity-80">People Helped</p>
        </div>
      </div>
      {impact.badges.length > 0 && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-white/20">
          {impact.badges.map((badge) => (
            <span key={badge.id} className="text-2xl" title={badge.name}>{badge.icon}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// Main Component
export function CommunityInitiatives() {
  const { user } = useAuth();
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [myInitiatives, setMyInitiatives] = useState<Initiative[]>([]);
  const [impact, setImpact] = useState<UserImpact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [selectedRegion, setSelectedRegion] = useState<string>('All Regions');
  const [activeTab, setActiveTab] = useState<'discover' | 'my'>('discover');
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [initiativesData, myData, impactData] = await Promise.all([
        initiativesApi.getInitiatives({
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          region: selectedRegion !== 'All Regions' ? selectedRegion : undefined,
        }),
        initiativesApi.getMyInitiatives(),
        initiativesApi.getImpact(),
      ]);
      setInitiatives(initiativesData.initiatives);
      setMyInitiatives(myData.initiatives);
      setImpact(impactData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedStatus, selectedRegion]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleJoin = async (initiative: Initiative) => {
    try {
      if (initiative.isVolunteering) {
        await initiativesApi.leaveInitiative(initiative.id);
      } else {
        await initiativesApi.joinInitiative(initiative.id);
      }
      // Update local state
      const updateInitiative = (i: Initiative) => 
        i.id === initiative.id 
          ? { 
              ...i, 
              isVolunteering: !i.isVolunteering,
              volunteerCount: i.isVolunteering ? i.volunteerCount - 1 : i.volunteerCount + 1,
            }
          : i;
      setInitiatives(prev => prev.map(updateInitiative));
      setMyInitiatives(prev => prev.map(updateInitiative));
      if (selectedInitiative?.id === initiative.id) {
        setSelectedInitiative(prev => prev ? updateInitiative(prev) : null);
      }
      // Reload impact
      const impactData = await initiativesApi.getImpact();
      setImpact(impactData);
    } catch (error) {
      console.error('Failed to update participation:', error);
    }
  };

  const displayedInitiatives = activeTab === 'discover' ? initiatives : myInitiatives;

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Community Initiatives</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Join initiatives making a difference in our communities
        </p>
      </div>

      {/* Impact Summary */}
      {impact && <ImpactSummary impact={impact} />}

      {/* Tabs */}
      <div className="flex gap-4 mt-8 mb-6">
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            activeTab === 'discover'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          Discover
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            activeTab === 'my'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          My Initiatives ({myInitiatives.length})
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'discover' && (
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1 transition-colors ${
                  selectedCategory === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {config.icon} {config.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="planning">Planning</option>
            <option value="completed">Completed</option>
          </select>

          {/* Region Filter */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {regions.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
      )}

      {/* Initiatives Grid */}
      {displayedInitiatives.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedInitiatives.map((initiative) => (
            <InitiativeCard
              key={initiative.id}
              initiative={initiative}
              onJoin={() => handleJoin(initiative)}
              onViewDetails={() => setSelectedInitiative(initiative)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🤝</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {activeTab === 'discover' ? 'No initiatives found' : 'You haven\'t joined any initiatives yet'}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {activeTab === 'discover' 
              ? 'Try adjusting your filters'
              : 'Explore initiatives and start making an impact'
            }
          </p>
          {activeTab === 'my' && (
            <Button className="mt-4" onClick={() => setActiveTab('discover')}>
              Discover Initiatives
            </Button>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedInitiative && (
        <InitiativeDetailModal
          initiative={selectedInitiative}
          onClose={() => setSelectedInitiative(null)}
          onJoin={() => handleJoin(selectedInitiative)}
        />
      )}
    </div>
  );
}

export default CommunityInitiatives;

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * WorkplaceAccommodations - Workplace accessibility support
 * 
 * Features:
 * - Request workplace accommodations
 * - Track accommodation status
 * - Access accessibility resources
 * - Connect with disability support services
 */

interface Accommodation {
  id: string;
  type: AccommodationType;
  title: string;
  description: string;
  status: 'draft' | 'submitted' | 'under-review' | 'approved' | 'denied' | 'implemented';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedAt: string;
  updatedAt: string;
  reviewedBy?: string;
  approvedAt?: string;
  implementedAt?: string;
  notes?: string;
  attachments: string[];
  employer?: {
    name: string;
    contactPerson: string;
    email: string;
  };
}

type AccommodationType =
  | 'physical'
  | 'technology'
  | 'schedule'
  | 'communication'
  | 'environmental'
  | 'transportation'
  | 'health'
  | 'other';

interface AccommodationResource {
  id: string;
  title: string;
  description: string;
  category: 'guide' | 'template' | 'video' | 'contact' | 'tool';
  url?: string;
  downloadUrl?: string;
  isExternal: boolean;
}

interface SupportService {
  id: string;
  name: string;
  description: string;
  type: 'government' | 'nonprofit' | 'employer-program' | 'community';
  services: string[];
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  location?: string;
  isNational: boolean;
  isIndigenousFocused: boolean;
}

// API functions
const accommodationsApi = {
  async getAccommodations(): Promise<{ accommodations: Accommodation[] }> {
    const res = await fetch('/api/accommodations', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch accommodations');
    return res.json();
  },

  async createAccommodation(data: Partial<Accommodation>): Promise<Accommodation> {
    const res = await fetch('/api/accommodations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create accommodation');
    return res.json();
  },

  async updateAccommodation(id: string, data: Partial<Accommodation>): Promise<Accommodation> {
    const res = await fetch(`/api/accommodations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update accommodation');
    return res.json();
  },

  async deleteAccommodation(id: string): Promise<void> {
    const res = await fetch(`/api/accommodations/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete accommodation');
  },

  async submitAccommodation(id: string): Promise<void> {
    const res = await fetch(`/api/accommodations/${id}/submit`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to submit accommodation');
  },

  async getResources(): Promise<{ resources: AccommodationResource[] }> {
    const res = await fetch('/api/accommodations/resources', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch resources');
    return res.json();
  },

  async getSupportServices(): Promise<{ services: SupportService[] }> {
    const res = await fetch('/api/accommodations/support-services', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch services');
    return res.json();
  },
};

// Accommodation type configuration
const accommodationTypes: { value: AccommodationType; label: string; icon: string; examples: string[] }[] = [
  {
    value: 'physical',
    label: 'Physical/Mobility',
    icon: '♿',
    examples: ['Standing desk', 'Accessible parking', 'Ergonomic chair', 'Wheelchair ramp'],
  },
  {
    value: 'technology',
    label: 'Technology/Equipment',
    icon: '💻',
    examples: ['Screen reader', 'Voice recognition', 'Large monitor', 'Specialized keyboard'],
  },
  {
    value: 'schedule',
    label: 'Schedule/Flexibility',
    icon: '📅',
    examples: ['Flexible hours', 'Remote work', 'Modified schedule', 'Extended breaks'],
  },
  {
    value: 'communication',
    label: 'Communication',
    icon: '💬',
    examples: ['Sign language interpreter', 'Written instructions', 'Captioning services'],
  },
  {
    value: 'environmental',
    label: 'Environmental',
    icon: '🏢',
    examples: ['Quiet workspace', 'Reduced lighting', 'Scent-free area', 'Temperature control'],
  },
  {
    value: 'transportation',
    label: 'Transportation',
    icon: '🚗',
    examples: ['Accessible parking', 'Travel assistance', 'Modified travel requirements'],
  },
  {
    value: 'health',
    label: 'Health/Medical',
    icon: '🏥',
    examples: ['Medication breaks', 'Medical appointments', 'Rest area', 'First aid access'],
  },
  {
    value: 'other',
    label: 'Other',
    icon: '📋',
    examples: ['Custom accommodations not listed above'],
  },
];

// Status configuration
const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: '📝' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: '📤' },
  'under-review': { label: 'Under Review', color: 'bg-yellow-100 text-yellow-700', icon: '🔍' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: '✅' },
  denied: { label: 'Denied', color: 'bg-red-100 text-red-700', icon: '❌' },
  implemented: { label: 'Implemented', color: 'bg-purple-100 text-purple-700', icon: '🎉' },
};

// Priority configuration
const priorityConfig = {
  low: { label: 'Low', color: 'text-gray-500' },
  medium: { label: 'Medium', color: 'text-blue-500' },
  high: { label: 'High', color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-500' },
};

// Accommodation Card Component
function AccommodationCard({
  accommodation,
  onEdit,
  onSubmit,
  onDelete,
}: {
  accommodation: Accommodation;
  onEdit: () => void;
  onSubmit: () => void;
  onDelete: () => void;
}) {
  const typeInfo = accommodationTypes.find(t => t.value === accommodation.type);
  const status = statusConfig[accommodation.status];
  const priority = priorityConfig[accommodation.priority];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeInfo?.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{accommodation.title}</h3>
            <p className="text-sm text-gray-500">{typeInfo?.label}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
            {status.icon} {status.label}
          </span>
          <span className={`text-xs font-medium ${priority.color}`}>
            {priority.label} Priority
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {accommodation.description}
      </p>

      {/* Timeline */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <span>Requested: {new Date(accommodation.requestedAt).toLocaleDateString('en-AU')}</span>
        {accommodation.approvedAt && (
          <span>Approved: {new Date(accommodation.approvedAt).toLocaleDateString('en-AU')}</span>
        )}
      </div>

      {/* Employer Info */}
      {accommodation.employer && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{accommodation.employer.name}</p>
          <p className="text-xs text-gray-500">{accommodation.employer.contactPerson}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {accommodation.status === 'draft' && (
          <>
            <Button onClick={onEdit} variant="outline" className="flex-1">Edit</Button>
            <Button onClick={onSubmit} className="flex-1">Submit</Button>
          </>
        )}
        {accommodation.status === 'submitted' && (
          <span className="text-sm text-gray-500 flex-1">Awaiting review...</span>
        )}
        {['approved', 'implemented'].includes(accommodation.status) && (
          <span className="text-sm text-green-600 flex-1">✓ Request approved</span>
        )}
        {accommodation.status === 'draft' && (
          <button
            onClick={onDelete}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Request Accommodation Modal
function AccommodationModal({
  accommodation,
  onClose,
  onSave,
}: {
  accommodation: Accommodation | null;
  onClose: () => void;
  onSave: (data: Partial<Accommodation>) => void;
}) {
  const [type, setType] = useState<AccommodationType>(accommodation?.type || 'physical');
  const [title, setTitle] = useState(accommodation?.title || '');
  const [description, setDescription] = useState(accommodation?.description || '');
  const [priority, setPriority] = useState<Accommodation['priority']>(accommodation?.priority || 'medium');
  const [employerName, setEmployerName] = useState(accommodation?.employer?.name || '');
  const [contactPerson, setContactPerson] = useState(accommodation?.employer?.contactPerson || '');
  const [contactEmail, setContactEmail] = useState(accommodation?.employer?.email || '');

  const selectedType = accommodationTypes.find(t => t.value === type);

  const handleSave = () => {
    if (!title || !description) return;
    onSave({
      type,
      title,
      description,
      priority,
      employer: employerName ? {
        name: employerName,
        contactPerson,
        email: contactEmail,
      } : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {accommodation ? 'Edit Request' : 'Request Accommodation'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Accommodation Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Accommodation Type *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {accommodationTypes.map((accType) => (
                <button
                  key={accType.value}
                  onClick={() => setType(accType.value)}
                  className={`p-3 rounded-lg border-2 transition-colors text-left ${
                    type === accType.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{accType.icon}</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{accType.label}</p>
                </button>
              ))}
            </div>
            {selectedType && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Examples:</strong> {selectedType.examples.join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Request Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of accommodation needed"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Detailed Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the accommodation you need and how it will help you perform your job effectively..."
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority Level
            </label>
            <div className="flex gap-2">
              {Object.entries(priorityConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setPriority(key as Accommodation['priority'])}
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

          {/* Employer Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Employer Information (Optional)
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                placeholder="Company/Organization name"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="HR/Manager name"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Contact email"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Tips for Your Request</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Be specific about what you need</li>
              <li>• Explain how it helps you perform your job</li>
              <li>• You don't need to disclose medical details</li>
              <li>• Focus on the solution, not the disability</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1" disabled={!title || !description}>
            {accommodation ? 'Save Changes' : 'Save as Draft'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Resource Card
function ResourceCard({ resource }: { resource: AccommodationResource }) {
  const categoryConfig = {
    guide: { icon: '📖', color: 'bg-blue-100 text-blue-700' },
    template: { icon: '📄', color: 'bg-green-100 text-green-700' },
    video: { icon: '🎬', color: 'bg-red-100 text-red-700' },
    contact: { icon: '📞', color: 'bg-purple-100 text-purple-700' },
    tool: { icon: '🛠️', color: 'bg-orange-100 text-orange-700' },
  };

  const config = categoryConfig[resource.category];

  return (
    <a
      href={resource.url || resource.downloadUrl}
      target={resource.isExternal ? '_blank' : undefined}
      rel={resource.isExternal ? 'noopener noreferrer' : undefined}
      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className={`p-2 rounded-lg ${config.color}`}>{config.icon}</span>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{resource.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{resource.description}</p>
        </div>
      </div>
    </a>
  );
}

// Support Service Card
function ServiceCard({ service }: { service: SupportService }) {
  const typeConfig = {
    government: { label: 'Government', color: 'bg-blue-100 text-blue-700' },
    nonprofit: { label: 'Non-Profit', color: 'bg-green-100 text-green-700' },
    'employer-program': { label: 'Employer Program', color: 'bg-purple-100 text-purple-700' },
    community: { label: 'Community', color: 'bg-orange-100 text-orange-700' },
  };

  const config = typeConfig[service.type];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{service.name}</h3>
        <div className="flex gap-2">
          {service.isIndigenousFocused && (
            <span className="text-lg" title="Indigenous-Focused">🪶</span>
          )}
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{service.description}</p>

      {/* Services List */}
      <div className="flex flex-wrap gap-1 mb-4">
        {service.services.slice(0, 3).map((s, i) => (
          <span
            key={i}
            className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
          >
            {s}
          </span>
        ))}
      </div>

      {/* Contact */}
      <div className="space-y-2 text-sm">
        {service.contact.phone && (
          <a href={`tel:${service.contact.phone}`} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600">
            <span>📞</span> {service.contact.phone}
          </a>
        )}
        {service.contact.email && (
          <a href={`mailto:${service.contact.email}`} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600">
            <span>📧</span> {service.contact.email}
          </a>
        )}
        {service.contact.website && (
          <a href={service.contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600">
            <span>🌐</span> Visit Website
          </a>
        )}
      </div>
    </div>
  );
}

// Main Component
export function WorkplaceAccommodations() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'resources' | 'support'>('requests');
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [resources, setResources] = useState<AccommodationResource[]>([]);
  const [services, setServices] = useState<SupportService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccommodation, setEditingAccommodation] = useState<Accommodation | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accRes, resRes, svcRes] = await Promise.all([
        accommodationsApi.getAccommodations(),
        accommodationsApi.getResources(),
        accommodationsApi.getSupportServices(),
      ]);
      setAccommodations(accRes.accommodations);
      setResources(resRes.resources);
      setServices(svcRes.services);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (data: Partial<Accommodation>) => {
    try {
      if (editingAccommodation) {
        const updated = await accommodationsApi.updateAccommodation(editingAccommodation.id, data);
        setAccommodations(accommodations.map(a => a.id === updated.id ? updated : a));
        setEditingAccommodation(null);
      } else {
        const created = await accommodationsApi.createAccommodation(data);
        setAccommodations([created, ...accommodations]);
        setShowModal(false);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await accommodationsApi.submitAccommodation(id);
      setAccommodations(accommodations.map(a => 
        a.id === id ? { ...a, status: 'submitted' as const } : a
      ));
    } catch (error) {
      console.error('Failed to submit:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    try {
      await accommodationsApi.deleteAccommodation(id);
      setAccommodations(accommodations.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workplace Accommodations</h1>
          <p className="text-gray-500 mt-1">Request and manage workplace accessibility support</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Request
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl p-6 text-white mb-8">
        <h2 className="text-xl font-semibold mb-2">Your Rights</h2>
        <p className="text-green-100 mb-4">
          Under Australian law, employers are required to make reasonable adjustments to help employees 
          with disabilities perform their jobs. You have the right to request accommodations.
        </p>
        <div className="flex gap-4">
          <Button className="bg-white text-green-600 hover:bg-green-50">
            Learn About Your Rights
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{accommodations.length}</div>
          <div className="text-sm text-gray-500">Total Requests</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {accommodations.filter(a => ['submitted', 'under-review'].includes(a.status)).length}
          </div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {accommodations.filter(a => a.status === 'approved').length}
          </div>
          <div className="text-sm text-gray-500">Approved</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {accommodations.filter(a => a.status === 'implemented').length}
          </div>
          <div className="text-sm text-gray-500">Implemented</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        {([
          { key: 'requests', label: 'My Requests' },
          { key: 'resources', label: 'Resources' },
          { key: 'support', label: 'Support Services' },
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
      {activeTab === 'requests' && (
        accommodations.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {accommodations.map((accommodation) => (
              <AccommodationCard
                key={accommodation.id}
                accommodation={accommodation}
                onEdit={() => setEditingAccommodation(accommodation)}
                onSubmit={() => handleSubmit(accommodation.id)}
                onDelete={() => handleDelete(accommodation.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <div className="text-6xl mb-4">♿</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No requests yet</h3>
            <p className="text-gray-500 mt-2 mb-6">Create a request to get workplace accommodations</p>
            <Button onClick={() => setShowModal(true)}>New Request</Button>
          </div>
        )
      )}

      {activeTab === 'resources' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}

      {activeTab === 'support' && (
        <div className="grid md:grid-cols-2 gap-6">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}

      {/* Modal */}
      {(showModal || editingAccommodation) && (
        <AccommodationModal
          accommodation={editingAccommodation}
          onClose={() => {
            setShowModal(false);
            setEditingAccommodation(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default WorkplaceAccommodations;

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * ReferencesManager - Manage professional references
 * 
 * Features:
 * - Add and manage references
 * - Request references from connections
 * - Track reference requests
 * - Share reference lists with employers
 */

interface Reference {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone?: string;
  linkedin?: string;
  relationship: 'manager' | 'colleague' | 'client' | 'mentor' | 'professor' | 'other';
  yearsKnown: number;
  status: 'active' | 'pending' | 'declined' | 'inactive';
  lastContacted?: string;
  notes?: string;
  avatar?: string;
  canContactDirectly: boolean;
  preferredContactMethod: 'email' | 'phone' | 'linkedin';
}

interface ReferenceRequest {
  id: string;
  referenceId: string;
  reference: Reference;
  requestedBy: {
    company: string;
    role: string;
    recruiter: string;
    email: string;
  };
  status: 'pending' | 'completed' | 'expired';
  requestedAt: string;
  completedAt?: string;
  expiresAt: string;
}

interface ReferenceList {
  id: string;
  name: string;
  references: string[];
  createdAt: string;
  isDefault: boolean;
  shareLink?: string;
  shareExpiry?: string;
}

// API functions
const referencesApi = {
  async getReferences(): Promise<{ references: Reference[] }> {
    const res = await fetch('/api/references', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch references');
    return res.json();
  },

  async addReference(data: Partial<Reference>): Promise<Reference> {
    const res = await fetch('/api/references', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add reference');
    return res.json();
  },

  async updateReference(id: string, data: Partial<Reference>): Promise<Reference> {
    const res = await fetch(`/api/references/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update reference');
    return res.json();
  },

  async deleteReference(id: string): Promise<void> {
    const res = await fetch(`/api/references/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete reference');
  },

  async requestReference(id: string, message: string): Promise<void> {
    const res = await fetch(`/api/references/${id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error('Failed to send request');
  },

  async getRequests(): Promise<{ requests: ReferenceRequest[] }> {
    const res = await fetch('/api/references/requests', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json();
  },

  async getLists(): Promise<{ lists: ReferenceList[] }> {
    const res = await fetch('/api/references/lists', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch lists');
    return res.json();
  },

  async createList(data: { name: string; references: string[] }): Promise<ReferenceList> {
    const res = await fetch('/api/references/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create list');
    return res.json();
  },

  async shareList(listId: string, expiryDays: number): Promise<{ link: string }> {
    const res = await fetch(`/api/references/lists/${listId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ expiryDays }),
    });
    if (!res.ok) throw new Error('Failed to share list');
    return res.json();
  },

  async importFromLinkedIn(): Promise<{ imported: number }> {
    const res = await fetch('/api/references/import/linkedin', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to import');
    return res.json();
  },
};

// Relationship labels
const relationships = [
  { value: 'manager', label: 'Manager/Supervisor', icon: '👔' },
  { value: 'colleague', label: 'Colleague/Peer', icon: '🤝' },
  { value: 'client', label: 'Client', icon: '💼' },
  { value: 'mentor', label: 'Mentor', icon: '🎓' },
  { value: 'professor', label: 'Professor/Teacher', icon: '📚' },
  { value: 'other', label: 'Other', icon: '👤' },
];

// Status badges
function StatusBadge({ status }: { status: Reference['status'] }) {
  const config = {
    active: { label: 'Active', color: 'bg-green-100 text-green-700' },
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    declined: { label: 'Declined', color: 'bg-red-100 text-red-700' },
    inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-700' },
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config[status].color}`}>
      {config[status].label}
    </span>
  );
}

// Reference Card Component
function ReferenceCard({
  reference,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onContact,
}: {
  reference: Reference;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onContact: () => void;
}) {
  const relationshipInfo = relationships.find(r => r.value === reference.relationship);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border ${
        isSelected 
          ? 'border-blue-500 ring-2 ring-blue-200' 
          : 'border-gray-200 dark:border-gray-700'
      } p-6`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {reference.avatar ? (
          <OptimizedImage src={toCloudinaryAutoUrl(reference.avatar)} alt={reference.name} width={56} height={56} className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
            {reference.name.charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{reference.name}</h3>
              <p className="text-sm text-gray-500">
                {reference.title} at {reference.company}
              </p>
            </div>
            <StatusBadge status={reference.status} />
          </div>

          {/* Relationship & Years */}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>{relationshipInfo?.icon} {relationshipInfo?.label}</span>
            <span>• {reference.yearsKnown} years</span>
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-gray-600 dark:text-gray-400">{reference.email}</span>
            {reference.phone && (
              <span className="text-gray-600 dark:text-gray-400">{reference.phone}</span>
            )}
          </div>

          {/* Notes */}
          {reference.notes && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{reference.notes}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" onClick={(e) => { e.stopPropagation(); onContact(); }} className="text-sm">
              Contact
            </Button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add/Edit Reference Modal
function ReferenceModal({
  reference,
  onClose,
  onSave,
}: {
  reference: Reference | null;
  onClose: () => void;
  onSave: (data: Partial<Reference>) => void;
}) {
  const [name, setName] = useState(reference?.name || '');
  const [title, setTitle] = useState(reference?.title || '');
  const [company, setCompany] = useState(reference?.company || '');
  const [email, setEmail] = useState(reference?.email || '');
  const [phone, setPhone] = useState(reference?.phone || '');
  const [linkedin, setLinkedin] = useState(reference?.linkedin || '');
  const [relationship, setRelationship] = useState(reference?.relationship || 'colleague');
  const [yearsKnown, setYearsKnown] = useState(reference?.yearsKnown?.toString() || '1');
  const [notes, setNotes] = useState(reference?.notes || '');
  const [canContactDirectly, setCanContactDirectly] = useState(reference?.canContactDirectly ?? true);
  const [preferredContactMethod, setPreferredContactMethod] = useState(reference?.preferredContactMethod || 'email');

  const handleSave = () => {
    if (!name || !email) return;

    onSave({
      name,
      title,
      company,
      email,
      phone: phone || undefined,
      linkedin: linkedin || undefined,
      relationship: relationship as Reference['relationship'],
      yearsKnown: parseInt(yearsKnown) || 1,
      notes: notes || undefined,
      canContactDirectly,
      preferredContactMethod: preferredContactMethod as Reference['preferredContactMethod'],
      status: reference?.status || 'active',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {reference ? 'Edit Reference' : 'Add Reference'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Title & Company */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                LinkedIn
              </label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="linkedin.com/in/..."
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Relationship & Years */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Relationship
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as Reference['relationship'])}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {relationships.map((rel) => (
                  <option key={rel.value} value={rel.value}>
                    {rel.icon} {rel.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Years Known
              </label>
              <input
                type="number"
                min="1"
                value={yearsKnown}
                onChange={(e) => setYearsKnown(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Contact Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contact Preferences
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canContactDirectly}
                  onChange={(e) => setCanContactDirectly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Employers can contact directly
                </span>
              </label>
            </div>
            <div className="mt-2">
              <select
                value={preferredContactMethod}
                onChange={(e) => setPreferredContactMethod(e.target.value as Reference['preferredContactMethod'])}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="email">Prefers Email</option>
                <option value="phone">Prefers Phone</option>
                <option value="linkedin">Prefers LinkedIn</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Context about your relationship, projects worked on together, etc."
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1" disabled={!name || !email}>
            {reference ? 'Save Changes' : 'Add Reference'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Request Modal
function RequestReferenceModal({
  reference,
  onClose,
  onSend,
}: {
  reference: Reference;
  onClose: () => void;
  onSend: (message: string) => void;
}) {
  const [message, setMessage] = useState(
    `Hi ${reference.name.split(' ')[0]},\n\nI hope this message finds you well. I'm currently applying for new opportunities and was wondering if you would be willing to serve as a professional reference for me.\n\nYou can speak to our work together at ${reference.company} and the projects we collaborated on.\n\nPlease let me know if you're comfortable with this or if you have any questions.\n\nThank you for considering this request.\n\nBest regards`
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Request Reference
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {reference.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">{reference.name}</h3>
              <p className="text-sm text-gray-500">{reference.email}</p>
            </div>
          </div>

          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => onSend(message)} className="flex-1">
            Send Request
          </Button>
        </div>
      </div>
    </div>
  );
}

// Share List Modal
function ShareListModal({
  list,
  references,
  onClose,
  onShare,
}: {
  list: ReferenceList;
  references: Reference[];
  onClose: () => void;
  onShare: (days: number) => void;
}) {
  const [expiryDays, setExpiryDays] = useState(7);
  const [copied, setCopied] = useState(false);

  const selectedRefs = references.filter(r => list.references.includes(r.id));

  const copyLink = () => {
    if (list.shareLink) {
      navigator.clipboard.writeText(list.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Share Reference List
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{list.name}</h3>
            <div className="space-y-2">
              {selectedRefs.map((ref) => (
                <div key={ref.id} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    {ref.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-gray-900 dark:text-white">{ref.name}</span>
                    <span className="text-gray-500"> • {ref.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {list.shareLink ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={list.shareLink}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
                <Button onClick={copyLink}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              {list.shareExpiry && (
                <p className="text-sm text-gray-500 mt-2">
                  Expires: {new Date(list.shareExpiry).toLocaleDateString('en-AU')}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Link Expiry
              </label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
              </select>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          {!list.shareLink && (
            <Button onClick={() => onShare(expiryDays)} className="flex-1">
              Generate Share Link
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component
export function ReferencesManager() {
  const { user } = useAuth();
  const [references, setReferences] = useState<Reference[]>([]);
  const [lists, setLists] = useState<ReferenceList[]>([]);
  const [requests, setRequests] = useState<ReferenceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'references' | 'lists' | 'requests'>('references');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReference, setEditingReference] = useState<Reference | null>(null);
  const [requestingReference, setRequestingReference] = useState<Reference | null>(null);
  const [sharingList, setSharingList] = useState<ReferenceList | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [refsRes, listsRes, reqsRes] = await Promise.all([
        referencesApi.getReferences(),
        referencesApi.getLists(),
        referencesApi.getRequests(),
      ]);
      setReferences(refsRes.references);
      setLists(listsRes.lists);
      setRequests(reqsRes.requests);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveReference = async (data: Partial<Reference>) => {
    try {
      if (editingReference) {
        const updated = await referencesApi.updateReference(editingReference.id, data);
        setReferences(references.map(r => r.id === updated.id ? updated : r));
        setEditingReference(null);
      } else {
        const created = await referencesApi.addReference(data);
        setReferences([created, ...references]);
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Failed to save reference:', error);
    }
  };

  const handleDeleteReference = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reference?')) return;
    try {
      await referencesApi.deleteReference(id);
      setReferences(references.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete reference:', error);
    }
  };

  const handleSendRequest = async (message: string) => {
    if (!requestingReference) return;
    try {
      await referencesApi.requestReference(requestingReference.id, message);
      setReferences(references.map(r => 
        r.id === requestingReference.id ? { ...r, status: 'pending' } : r
      ));
      setRequestingReference(null);
    } catch (error) {
      console.error('Failed to send request:', error);
    }
  };

  const handleShareList = async (days: number) => {
    if (!sharingList) return;
    try {
      const { link } = await referencesApi.shareList(sharingList.id, days);
      setLists(lists.map(l => 
        l.id === sharingList.id 
          ? { ...l, shareLink: link, shareExpiry: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() } 
          : l
      ));
      setSharingList({ ...sharingList, shareLink: link });
    } catch (error) {
      console.error('Failed to share list:', error);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">References</h1>
          <p className="text-gray-500 mt-1">Manage your professional references</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Reference
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{references.length}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{references.filter(r => r.status === 'active').length}</div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{references.filter(r => r.status === 'pending').length}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{lists.length}</div>
          <div className="text-sm text-gray-500">Lists</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(['references', 'lists', 'requests'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'references' && (
        references.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {references.map((reference) => (
              <ReferenceCard
                key={reference.id}
                reference={reference}
                onEdit={() => setEditingReference(reference)}
                onDelete={() => handleDeleteReference(reference.id)}
                onContact={() => setRequestingReference(reference)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No references yet</h3>
            <p className="text-gray-500 mt-2 mb-6">Add professional references to share with employers</p>
            <Button onClick={() => setShowAddModal(true)}>Add Reference</Button>
          </div>
        )
      )}

      {activeTab === 'lists' && (
        <div className="space-y-4">
          {lists.length > 0 ? (
            lists.map((list) => (
              <div
                key={list.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{list.name}</h3>
                      {list.isDefault && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">Default</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{list.references.length} references</p>
                  </div>
                  <Button variant="outline" onClick={() => setSharingList(list)}>
                    Share
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No lists yet</h3>
              <p className="text-gray-500 mt-2">Create lists to organize and share your references</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length > 0 ? (
            requests.map((request) => (
              <div
                key={request.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {request.requestedBy.company}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {request.requestedBy.role} • {request.requestedBy.recruiter}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Reference: {request.reference.name}
                    </p>
                  </div>
                  <StatusBadge status={request.status as Reference['status']} />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">📩</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No requests yet</h3>
              <p className="text-gray-500 mt-2">Reference requests from employers will appear here</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {(showAddModal || editingReference) && (
        <ReferenceModal
          reference={editingReference}
          onClose={() => {
            setShowAddModal(false);
            setEditingReference(null);
          }}
          onSave={handleSaveReference}
        />
      )}

      {requestingReference && (
        <RequestReferenceModal
          reference={requestingReference}
          onClose={() => setRequestingReference(null)}
          onSend={handleSendRequest}
        />
      )}

      {sharingList && (
        <ShareListModal
          list={sharingList}
          references={references}
          onClose={() => setSharingList(null)}
          onShare={handleShareList}
        />
      )}
    </div>
  );
}

export default ReferencesManager;

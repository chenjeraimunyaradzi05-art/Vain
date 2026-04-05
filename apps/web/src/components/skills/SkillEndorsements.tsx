'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * SkillEndorsements - Skill endorsement and verification system
 * 
 * Features:
 * - View and manage skill endorsements
 * - Request endorsements
 * - Endorse connections' skills
 * - Skill verification badges
 */

interface Skill {
  id: string;
  name: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  endorsementCount: number;
  isVerified: boolean;
  verificationSource?: string;
  endorsements: SkillEndorsement[];
  addedAt: string;
}

interface SkillEndorsement {
  id: string;
  endorser: {
    id: string;
    name: string;
    avatar?: string;
    title: string;
    company?: string;
  };
  message?: string;
  createdAt: string;
  relationship: string;
}

interface EndorsementRequest {
  id: string;
  skill: {
    id: string;
    name: string;
  };
  requester: {
    id: string;
    name: string;
    avatar?: string;
    title: string;
  };
  message?: string;
  createdAt: string;
  status: 'pending' | 'completed' | 'declined';
}

interface PendingEndorsement {
  id: string;
  person: {
    id: string;
    name: string;
    avatar?: string;
    title: string;
  };
  skill: {
    id: string;
    name: string;
  };
  requestedAt: string;
  message?: string;
}

interface Connection {
  id: string;
  name: string;
  avatar?: string;
  title: string;
  skills: { id: string; name: string; endorsed: boolean }[];
}

// API functions
const endorsementsApi = {
  async getMySkills(): Promise<{ skills: Skill[] }> {
    const res = await fetch('/api/endorsements/skills', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch skills');
    return res.json();
  },

  async addSkill(data: {
    name: string;
    category: string;
    level: Skill['level'];
  }): Promise<Skill> {
    const res = await fetch('/api/endorsements/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add skill');
    return res.json();
  },

  async updateSkill(skillId: string, level: Skill['level']): Promise<Skill> {
    const res = await fetch(`/api/endorsements/skills/${skillId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ level }),
    });
    if (!res.ok) throw new Error('Failed to update skill');
    return res.json();
  },

  async removeSkill(skillId: string): Promise<void> {
    const res = await fetch(`/api/endorsements/skills/${skillId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to remove skill');
  },

  async requestEndorsement(data: {
    skillIds: string[];
    connectionIds: string[];
    message?: string;
  }): Promise<void> {
    const res = await fetch('/api/endorsements/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to send request');
  },

  async getPendingRequests(): Promise<{ requests: PendingEndorsement[] }> {
    const res = await fetch('/api/endorsements/pending', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch pending');
    return res.json();
  },

  async endorseSkill(personId: string, skillId: string, data?: {
    message?: string;
    relationship?: string;
  }): Promise<void> {
    const res = await fetch(`/api/endorsements/${personId}/skills/${skillId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data || {}),
    });
    if (!res.ok) throw new Error('Failed to endorse');
  },

  async declineEndorsementRequest(requestId: string): Promise<void> {
    const res = await fetch(`/api/endorsements/requests/${requestId}/decline`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to decline');
  },

  async getConnections(): Promise<{ connections: Connection[] }> {
    const res = await fetch('/api/endorsements/connections', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch connections');
    return res.json();
  },

  async getMyRequests(): Promise<{ requests: EndorsementRequest[] }> {
    const res = await fetch('/api/endorsements/my-requests', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json();
  },

  async requestVerification(skillId: string): Promise<void> {
    const res = await fetch(`/api/endorsements/skills/${skillId}/verify`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to request verification');
  },
};

// Skill categories
const skillCategories = [
  { value: 'technical', label: 'Technical Skills' },
  { value: 'soft', label: 'Soft Skills' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'industry', label: 'Industry Knowledge' },
  { value: 'tools', label: 'Tools & Software' },
  { value: 'languages', label: 'Languages' },
  { value: 'cultural', label: 'Cultural Competencies' },
];

// Skill levels
const skillLevels = [
  { value: 'beginner', label: 'Beginner', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'advanced', label: 'Advanced', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'expert', label: 'Expert', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
];

// Skill Card
function SkillCard({
  skill,
  onViewEndorsements,
  onRequestEndorsement,
  onEdit,
  onRemove,
}: {
  skill: Skill;
  onViewEndorsements: () => void;
  onRequestEndorsement: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const levelConfig = skillLevels.find(l => l.value === skill.level);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-white">{skill.name}</h3>
            {skill.isVerified && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs font-medium rounded-full flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">{skill.category}</span>
            <span className="text-gray-300">•</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${levelConfig?.color}`}>
              {levelConfig?.label}
            </span>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1">
                <button
                  onClick={() => { setShowMenu(false); onEdit(); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Edit Skill Level
                </button>
                {!skill.isVerified && (
                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Request Verification
                  </button>
                )}
                <button
                  onClick={() => { setShowMenu(false); onRemove(); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Remove Skill
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Endorsements */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {skill.endorsements.slice(0, 3).map((e, i) => (
              e.endorser.avatar ? (
                <OptimizedImage
                  key={e.id}
                  src={toCloudinaryAutoUrl(e.endorser.avatar)}
                  alt={`${e.endorser.name} avatar`}
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800"
                  style={{ marginLeft: i > 0 ? '-8px' : 0 }}
                />
              ) : (
                <div
                  key={e.id}
                  className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px] text-gray-500"
                  style={{ marginLeft: i > 0 ? '-8px' : 0 }}
                >
                  {e.endorser.name.charAt(0)}
                </div>
              )
            ))}
            <button
              onClick={onViewEndorsements}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600"
            >
              {skill.endorsementCount} endorsement{skill.endorsementCount !== 1 ? 's' : ''}
            </button>
          </div>
          <button
            onClick={onRequestEndorsement}
            className="text-sm text-blue-600 hover:underline"
          >
            Request
          </button>
        </div>
      </div>
    </div>
  );
}

// Pending Endorsement Card
function PendingEndorsementCard({
  request,
  onEndorse,
  onDecline,
}: {
  request: PendingEndorsement;
  onEndorse: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start gap-4">
        {request.person.avatar ? (
          <OptimizedImage
            src={toCloudinaryAutoUrl(request.person.avatar)}
            alt={`${request.person.name} avatar`}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500">
            {request.person.name.split(' ').map(n => n[0]).join('')}
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white">{request.person.name}</h3>
          <p className="text-sm text-gray-500">{request.person.title}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Requested endorsement for <span className="font-medium text-blue-600">{request.skill.name}</span>
          </p>
          {request.message && (
            <p className="text-sm text-gray-500 mt-2 italic">"{request.message}"</p>
          )}
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <Button size="sm" onClick={onEndorse} className="flex-1">Endorse</Button>
        <Button variant="outline" size="sm" onClick={onDecline} className="flex-1">Decline</Button>
      </div>
    </div>
  );
}

// Connection Card (for endorsing)
function ConnectionEndorseCard({
  connection,
  onEndorseSkill,
}: {
  connection: Connection;
  onEndorseSkill: (skillId: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3 mb-4">
        {connection.avatar ? (
          <OptimizedImage
            src={toCloudinaryAutoUrl(connection.avatar)}
            alt={`${connection.name} avatar`}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500">
            {connection.name.split(' ').map(n => n[0]).join('')}
          </div>
        )}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{connection.name}</h3>
          <p className="text-sm text-gray-500">{connection.title}</p>
        </div>
      </div>

      <div className="space-y-2">
        {connection.skills.slice(0, 5).map((skill) => (
          <div
            key={skill.id}
            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">{skill.name}</span>
            {skill.endorsed ? (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Endorsed
              </span>
            ) : (
              <button
                onClick={() => onEndorseSkill(skill.id)}
                className="text-xs text-blue-600 hover:underline"
              >
                Endorse
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Add Skill Modal
function AddSkillModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: { name: string; category: string; level: Skill['level'] }) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(skillCategories[0].value);
  const [level, setLevel] = useState<Skill['level']>('intermediate');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd({ name: name.trim(), category, level });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Skill</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Skill Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Project Management"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {skillCategories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Proficiency Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {skillLevels.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value as Skill['level'])}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    level === l.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className={`text-sm font-medium ${level === l.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {l.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">Add Skill</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Request Endorsement Modal
function RequestEndorsementModal({
  skills,
  connections,
  onClose,
  onRequest,
}: {
  skills: Skill[];
  connections: Connection[];
  onClose: () => void;
  onRequest: (skillIds: string[], connectionIds: string[], message?: string) => void;
}) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const toggleSkill = (id: string) => {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleConnection = (id: string) => {
    setSelectedConnections(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSkills.length > 0 && selectedConnections.length > 0) {
      onRequest(selectedSkills, selectedConnections, message || undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Request Endorsements</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Select Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select skills to endorse ({selectedSkills.length} selected)
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {skills.map((skill) => (
                <label
                  key={skill.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSkills.includes(skill.id)}
                    onChange={() => toggleSkill(skill.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{skill.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Select Connections */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Who to ask ({selectedConnections.length} selected)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {connections.map((connection) => (
                <label
                  key={connection.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedConnections.includes(connection.id)}
                    onChange={() => toggleConnection(connection.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  {connection.avatar ? (
                    <OptimizedImage
                      src={toCloudinaryAutoUrl(connection.avatar)}
                      alt={`${connection.name} avatar`}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 text-xs">
                      {connection.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-700 dark:text-gray-300">{connection.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{connection.title}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Personal message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note to your request..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => onRequest(selectedSkills, selectedConnections, message || undefined)}
            disabled={selectedSkills.length === 0 || selectedConnections.length === 0}
            className="flex-1"
          >
            Send Request{selectedConnections.length > 0 && `s (${selectedConnections.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function SkillEndorsements() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-skills' | 'pending' | 'give'>('my-skills');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingEndorsement[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [skillsRes, pendingRes, connectionsRes] = await Promise.all([
        endorsementsApi.getMySkills(),
        endorsementsApi.getPendingRequests(),
        endorsementsApi.getConnections(),
      ]);
      setSkills(skillsRes.skills);
      setPendingRequests(pendingRes.requests);
      setConnections(connectionsRes.connections);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddSkill = async (data: { name: string; category: string; level: Skill['level'] }) => {
    try {
      await endorsementsApi.addSkill(data);
      setShowAddSkill(false);
      loadData();
    } catch (error) {
      console.error('Failed to add skill:', error);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!confirm('Are you sure you want to remove this skill?')) return;
    
    try {
      await endorsementsApi.removeSkill(skillId);
      loadData();
    } catch (error) {
      console.error('Failed to remove skill:', error);
    }
  };

  const handleRequestEndorsements = async (skillIds: string[], connectionIds: string[], message?: string) => {
    try {
      await endorsementsApi.requestEndorsement({ skillIds, connectionIds, message });
      setShowRequestModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to request endorsements:', error);
    }
  };

  const handleEndorse = async (personId: string, skillId: string) => {
    try {
      await endorsementsApi.endorseSkill(personId, skillId);
      loadData();
    } catch (error) {
      console.error('Failed to endorse:', error);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await endorsementsApi.declineEndorsementRequest(requestId);
      loadData();
    } catch (error) {
      console.error('Failed to decline:', error);
    }
  };

  const totalEndorsements = skills.reduce((sum, s) => sum + s.endorsementCount, 0);
  const verifiedSkills = skills.filter(s => s.isVerified).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Skill Endorsements</h1>
        <p className="text-gray-500 mt-1">Build credibility with skill endorsements from your network</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-2xl font-bold text-blue-600">{skills.length}</div>
          <div className="text-sm text-gray-500">Skills</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-2xl font-bold text-green-600">{totalEndorsements}</div>
          <div className="text-sm text-gray-500">Total Endorsements</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-2xl font-bold text-purple-600">{verifiedSkills}</div>
          <div className="text-sm text-gray-500">Verified Skills</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {[
          { value: 'my-skills' as const, label: 'My Skills' },
          { value: 'pending' as const, label: 'Pending Requests', count: pendingRequests.length },
          { value: 'give' as const, label: 'Give Endorsements' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === tab.value
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'my-skills' && (
        <div>
          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <Button onClick={() => setShowAddSkill(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Skill
            </Button>
            <Button variant="outline" onClick={() => setShowRequestModal(true)}>
              Request Endorsements
            </Button>
          </div>

          {/* Skills Grid */}
          {skills.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {skills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onViewEndorsements={() => {}}
                  onRequestEndorsement={() => setShowRequestModal(true)}
                  onEdit={() => {}}
                  onRemove={() => handleRemoveSkill(skill.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No skills added yet</h3>
              <p className="text-gray-500 mt-2 mb-4">Add your skills to start collecting endorsements</p>
              <Button onClick={() => setShowAddSkill(true)}>Add Your First Skill</Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pending' && (
        <div>
          {pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <PendingEndorsementCard
                  key={request.id}
                  request={request}
                  onEndorse={() => handleEndorse(request.person.id, request.skill.id)}
                  onDecline={() => handleDeclineRequest(request.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">All caught up!</h3>
              <p className="text-gray-500 mt-2">No pending endorsement requests</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'give' && (
        <div>
          {connections.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {connections.map((connection) => (
                <ConnectionEndorseCard
                  key={connection.id}
                  connection={connection}
                  onEndorseSkill={(skillId) => handleEndorse(connection.id, skillId)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">🤝</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No connections yet</h3>
              <p className="text-gray-500 mt-2">Connect with others to endorse their skills</p>
            </div>
          )}
        </div>
      )}

      {/* Add Skill Modal */}
      {showAddSkill && (
        <AddSkillModal onClose={() => setShowAddSkill(false)} onAdd={handleAddSkill} />
      )}

      {/* Request Endorsement Modal */}
      {showRequestModal && (
        <RequestEndorsementModal
          skills={skills}
          connections={connections}
          onClose={() => setShowRequestModal(false)}
          onRequest={handleRequestEndorsements}
        />
      )}
    </div>
  );
}

export default SkillEndorsements;

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * ApplicantTracker - Applicant tracking system (ATS) for employers
 * 
 * Features:
 * - Pipeline management
 * - Kanban board view
 * - Bulk actions
 * - Applicant scoring
 */

interface Applicant {
  id: string;
  candidateId: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    headline?: string;
    location?: string;
    isIndigenous: boolean;
  };
  jobId: string;
  job: {
    id: string;
    title: string;
    department: string;
  };
  stage: 'applied' | 'screening' | 'phone-interview' | 'interview' | 'assessment' | 'offer' | 'hired' | 'rejected';
  source: 'direct' | 'referral' | 'linkedin' | 'indeed' | 'seek' | 'agency' | 'other';
  appliedAt: string;
  lastActivityAt: string;
  rating: number;
  scores: {
    skills: number;
    experience: number;
    cultural: number;
    overall: number;
  };
  tags: string[];
  notes: {
    id: string;
    content: string;
    author: string;
    createdAt: string;
  }[];
  activities: {
    type: string;
    description: string;
    date: string;
    user?: string;
  }[];
  resume?: {
    name: string;
    url: string;
  };
  isBookmarked: boolean;
}

interface PipelineStage {
  id: Applicant['stage'];
  name: string;
  color: string;
  count: number;
}

// API functions
const applicantsApi = {
  async getApplicants(params: any): Promise<{ applicants: Applicant[]; total: number }> {
    const query = new URLSearchParams(params);
    const res = await api<{ applicants: Applicant[]; total: number }>(`/employer/applicants?${query.toString()}`);
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch applicants');
    return res.data;
  },

  async getApplicant(id: string): Promise<Applicant> {
    const res = await api<Applicant>(`/employer/applicants/${id}`);
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch applicant');
    return res.data;
  },

  async moveToStage(applicantId: string, stage: Applicant['stage']): Promise<void> {
    const res = await api(`/employer/applicants/${applicantId}/stage`, {
      method: 'PUT',
      body: { stage },
    });
    if (!res.ok) throw new Error(res.error || 'Failed to move applicant');
  },

  async bulkMove(applicantIds: string[], stage: Applicant['stage']): Promise<void> {
    const res = await api('/employer/applicants/bulk/stage', {
      method: 'PUT',
      body: { applicantIds, stage },
    });
    if (!res.ok) throw new Error(res.error || 'Failed to move applicants');
  },

  async addNote(applicantId: string, content: string): Promise<void> {
    const res = await api(`/employer/applicants/${applicantId}/notes`, {
      method: 'POST',
      body: { content },
    });
    if (!res.ok) throw new Error(res.error || 'Failed to add note');
  },

  async updateRating(applicantId: string, rating: number): Promise<void> {
    const res = await api(`/employer/applicants/${applicantId}/rating`, {
      method: 'PUT',
      body: { rating },
    });
    if (!res.ok) throw new Error(res.error || 'Failed to update rating');
  },

  async toggleBookmark(applicantId: string): Promise<void> {
    const res = await api(`/employer/applicants/${applicantId}/bookmark`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(res.error || 'Failed to toggle bookmark');
  },

  async reject(applicantId: string, reason: string): Promise<void> {
    const res = await api(`/employer/applicants/${applicantId}/reject`, {
      method: 'POST',
      body: { reason },
    });
    if (!res.ok) throw new Error(res.error || 'Failed to reject');
  },

  async getJobs(): Promise<any[]> {
    const res = await api<any[]>('/employer/jobs');
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch jobs');
    return res.data;
  },
};

const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'applied', name: 'Applied', color: 'bg-gray-500', count: 0 },
  { id: 'screening', name: 'Screening', color: 'bg-blue-500', count: 0 },
  { id: 'phone-interview', name: 'Phone Screen', color: 'bg-indigo-500', count: 0 },
  { id: 'interview', name: 'Interview', color: 'bg-purple-500', count: 0 },
  { id: 'assessment', name: 'Assessment', color: 'bg-orange-500', count: 0 },
  { id: 'offer', name: 'Offer', color: 'bg-yellow-500', count: 0 },
  { id: 'hired', name: 'Hired', color: 'bg-green-500', count: 0 },
];

const SOURCE_ICONS: Record<string, string> = {
  direct: '🌐',
  referral: '👥',
  linkedin: '💼',
  indeed: '🔍',
  seek: '🎯',
  agency: '🏢',
  other: '📋',
};

// Applicant Card
function ApplicantCard({
  applicant,
  isSelected,
  onSelect,
  onClick,
  onMove,
  isDragging,
}: {
  applicant: Applicant;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onMove: (stage: Applicant['stage']) => void;
  isDragging?: boolean;
}) {
  const appliedDate = new Date(applicant.appliedAt);
  const daysSinceApplied = Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border p-3 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-gray-200 dark:border-gray-700 hover:shadow-md'
      } ${isDragging ? 'opacity-50' : ''}`}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('applicantId', applicant.id);
      }}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => { e.stopPropagation(); onSelect(); }}
          className="mt-1 rounded"
        />
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
          {applicant.candidate.avatar ? (
            <OptimizedImage src={toCloudinaryAutoUrl(applicant.candidate.avatar)} alt={applicant.candidate.name} width={40} height={40} className="w-full h-full object-cover" />
          ) : (
            <span>{applicant.candidate.name[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">
              {applicant.candidate.name}
            </h4>
            {applicant.candidate.isIndigenous && <span>🌏</span>}
            {applicant.isBookmarked && <span className="text-yellow-500">⭐</span>}
          </div>
          <p className="text-xs text-gray-500 truncate">{applicant.candidate.headline}</p>
          
          {/* Rating */}
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="text-xs">
                {star <= applicant.rating ? '⭐' : '☆'}
              </span>
            ))}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <span title={applicant.source}>{SOURCE_ICONS[applicant.source]}</span>
            <span>{daysSinceApplied}d ago</span>
            {applicant.notes.length > 0 && (
              <span>📝 {applicant.notes.length}</span>
            )}
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Match</span>
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                applicant.scores.overall >= 80 ? 'bg-green-500' :
                applicant.scores.overall >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${applicant.scores.overall}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {applicant.scores.overall}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Kanban Column
function PipelineColumn({
  stage,
  applicants,
  selectedIds,
  onSelect,
  onApplicantClick,
  onDrop,
}: {
  stage: PipelineStage;
  applicants: Applicant[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onApplicantClick: (applicant: Applicant) => void;
  onDrop: (applicantId: string, stage: Applicant['stage']) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`flex-shrink-0 w-72 bg-gray-50 dark:bg-gray-900 rounded-xl p-3 ${
        isDragOver ? 'ring-2 ring-blue-500' : ''
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const applicantId = e.dataTransfer.getData('applicantId');
        if (applicantId) onDrop(applicantId, stage.id);
      }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${stage.color}`} />
          <h3 className="font-medium text-gray-900 dark:text-white">{stage.name}</h3>
        </div>
        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-sm">
          {applicants.length}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2 min-h-[200px]">
        {applicants.map((applicant) => (
          <ApplicantCard
            key={applicant.id}
            applicant={applicant}
            isSelected={selectedIds.has(applicant.id)}
            onSelect={() => onSelect(applicant.id)}
            onClick={() => onApplicantClick(applicant)}
            onMove={(stage) => onDrop(applicant.id, stage)}
          />
        ))}
        {applicants.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Drop applicants here
          </div>
        )}
      </div>
    </div>
  );
}

// Applicant Detail Panel
function ApplicantDetailPanel({
  applicant,
  onClose,
  onMove,
  onAddNote,
  onUpdateRating,
  onReject,
}: {
  applicant: Applicant | null;
  onClose: () => void;
  onMove: (stage: Applicant['stage']) => void;
  onAddNote: (content: string) => void;
  onUpdateRating: (rating: number) => void;
  onReject: (reason: string) => void;
}) {
  const [noteContent, setNoteContent] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!applicant) return null;

  const currentStageIndex = PIPELINE_STAGES.findIndex(s => s.id === applicant.stage);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-xl z-40 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(applicant.resume?.url)}>
              📄 Resume
            </Button>
            <Button size="sm" onClick={() => onMove(PIPELINE_STAGES[currentStageIndex + 1]?.id || 'hired')}>
              Move Next →
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            {applicant.candidate.avatar ? (
              <OptimizedImage src={toCloudinaryAutoUrl(applicant.candidate.avatar)} alt={applicant.candidate.name} width={56} height={56} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">{applicant.candidate.name[0]}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 dark:text-white">{applicant.candidate.name}</h2>
              {applicant.candidate.isIndigenous && <span>🌏</span>}
            </div>
            <p className="text-sm text-gray-500">{applicant.candidate.headline}</p>
            <p className="text-sm text-gray-500">{applicant.candidate.location}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Stage Selector */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Stage
          </label>
          <select
            value={applicant.stage}
            onChange={(e) => onMove(e.target.value as Applicant['stage'])}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
          >
            {PIPELINE_STAGES.map((stage) => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
            ))}
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Rating */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onUpdateRating(star)}
                className="text-2xl hover:scale-110 transition-transform"
              >
                {star <= applicant.rating ? '⭐' : '☆'}
              </button>
            ))}
          </div>
        </div>

        {/* Scores */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Match Scores
          </label>
          <div className="space-y-2">
            {Object.entries(applicant.scores).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 capitalize w-24">{key}</span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-10">{value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        {applicant.tags.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {applicant.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Contact
          </label>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span>📧</span>
              <a href={`mailto:${applicant.candidate.email}`} className="text-blue-600 hover:underline">
                {applicant.candidate.email}
              </a>
            </div>
            {applicant.candidate.phone && (
              <div className="flex items-center gap-2">
                <span>📞</span>
                <a href={`tel:${applicant.candidate.phone}`} className="text-blue-600 hover:underline">
                  {applicant.candidate.phone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Notes
          </label>
          <div className="space-y-3 mb-3">
            {applicant.notes.map((note) => (
              <div key={note.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {note.author} • {new Date(note.createdAt).toLocaleDateString('en-AU')}
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 text-sm"
            />
            <Button
              size="sm"
              onClick={() => { onAddNote(noteContent); setNoteContent(''); }}
              disabled={!noteContent.trim()}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Activity Timeline */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Activity
          </label>
          <div className="space-y-3">
            {applicant.activities.slice(0, 5).map((activity, idx) => (
              <div key={idx} className="flex gap-3 text-sm">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-gray-700 dark:text-gray-300">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.date).toLocaleDateString('en-AU')}
                    {activity.user && ` • ${activity.user}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" className="flex-1" onClick={() => {}}>
            📧 Email
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => {}}>
            📅 Schedule
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setShowRejectModal(true)}
          >
            Reject
          </Button>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Reject Applicant</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => { onReject(rejectReason); setShowRejectModal(false); }}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export function ApplicantTracker() {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    jobId: '',
    stage: '',
    source: '',
    query: '',
  });

  const loadApplicants = useCallback(async () => {
    setIsLoading(true);
    try {
      const { applicants: data } = await applicantsApi.getApplicants(filters);
      setApplicants(data);
    } catch (error) {
      console.error('Failed to load applicants:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadJobs = useCallback(async () => {
    try {
      const data = await applicantsApi.getJobs();
      setJobs(data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  }, []);

  useEffect(() => {
    loadApplicants();
  }, [loadApplicants]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleMove = async (applicantId: string, stage: Applicant['stage']) => {
    try {
      await applicantsApi.moveToStage(applicantId, stage);
      loadApplicants();
    } catch (error) {
      console.error('Failed to move applicant:', error);
    }
  };

  const handleBulkMove = async (stage: Applicant['stage']) => {
    try {
      await applicantsApi.bulkMove(Array.from(selectedIds), stage);
      setSelectedIds(new Set());
      loadApplicants();
    } catch (error) {
      console.error('Failed to bulk move:', error);
    }
  };

  const handleAddNote = async (content: string) => {
    if (!selectedApplicant) return;
    try {
      await applicantsApi.addNote(selectedApplicant.id, content);
      loadApplicants();
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleUpdateRating = async (rating: number) => {
    if (!selectedApplicant) return;
    try {
      await applicantsApi.updateRating(selectedApplicant.id, rating);
      setSelectedApplicant({ ...selectedApplicant, rating });
      loadApplicants();
    } catch (error) {
      console.error('Failed to update rating:', error);
    }
  };

  const handleReject = async (reason: string) => {
    if (!selectedApplicant) return;
    try {
      await applicantsApi.reject(selectedApplicant.id, reason);
      setSelectedApplicant(null);
      loadApplicants();
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Group applicants by stage
  const applicantsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = applicants.filter(a => a.stage === stage.id);
    return acc;
  }, {} as Record<string, Applicant[]>);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applicant Tracker</h1>
            <p className="text-gray-500">{applicants.length} applicants</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.jobId}
            onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}
            className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
          >
            <option value="">All Jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>

          <select
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
          >
            <option value="">All Sources</option>
            {Object.entries(SOURCE_ICONS).map(([source, icon]) => (
              <option key={source} value={source}>{icon} {source}</option>
            ))}
          </select>

          <input
            type="text"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="Search applicants..."
            className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
          />

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
              <select
                onChange={(e) => { handleBulkMove(e.target.value as Applicant['stage']); e.target.value = ''; }}
                className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                defaultValue=""
              >
                <option value="" disabled>Move to...</option>
                {PIPELINE_STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="flex gap-4 h-full">
            {PIPELINE_STAGES.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                applicants={applicantsByStage[stage.id] || []}
                selectedIds={selectedIds}
                onSelect={toggleSelect}
                onApplicantClick={setSelectedApplicant}
                onDrop={handleMove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedApplicant && (
        <ApplicantDetailPanel
          applicant={selectedApplicant}
          onClose={() => setSelectedApplicant(null)}
          onMove={(stage) => handleMove(selectedApplicant.id, stage)}
          onAddNote={handleAddNote}
          onUpdateRating={handleUpdateRating}
          onReject={handleReject}
        />
      )}
    </div>
  );
}

export default ApplicantTracker;

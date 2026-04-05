'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * OfferManagement - Job offer creation and management for employers
 * 
 * Features:
 * - Offer creation with templates
 * - Compensation packages
 * - Offer tracking and status
 * - Candidate communication
 */

interface Offer {
  id: string;
  candidateId: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    phone?: string;
  };
  jobId: string;
  job: {
    id: string;
    title: string;
    department: string;
  };
  status: 'draft' | 'pending-approval' | 'approved' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'withdrawn';
  compensation: {
    baseSalary: number;
    currency: string;
    frequency: 'annual' | 'monthly' | 'hourly';
    bonus?: {
      type: 'sign-on' | 'performance' | 'annual';
      amount: number;
      conditions?: string;
    }[];
    equity?: {
      type: 'options' | 'shares' | 'rsu';
      amount: number;
      vestingSchedule: string;
    };
    benefits: string[];
    additionalPerks?: string[];
  };
  startDate: string;
  expiryDate: string;
  reportingTo?: string;
  location: string;
  workType: 'onsite' | 'remote' | 'hybrid';
  customTerms?: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
  timeline: {
    action: string;
    date: string;
    user?: string;
    note?: string;
  }[];
  negotiationNotes?: string;
  createdAt: string;
  sentAt?: string;
  viewedAt?: string;
  respondedAt?: string;
}

interface OfferTemplate {
  id: string;
  name: string;
  description: string;
  compensation: Partial<Offer['compensation']>;
  terms?: string;
}

type OfferQueryParams = Record<string, string>;

interface SelectOption {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  title?: string;
  department?: string;
}

interface OfferPayload {
  candidateId: string;
  jobId: string;
  startDate: string;
  expiryDate: string;
  location: string;
  workType: Offer['workType'];
  benefits?: string[];
  baseSalary?: number;
  currency?: string;
  signOnBonus?: number;
  templateId?: string;
  compensation?: Offer['compensation'];
}

// API functions
const offersApi = {
  async getOffers(params: OfferQueryParams): Promise<{ offers: Offer[]; total: number }> {
    const query = new URLSearchParams(params);
    const res = await api<{ offers: Offer[]; total: number }>(`/employer/offers?${query.toString()}`);
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch offers');
    return res.data;
  },

  async getOffer(id: string): Promise<Offer> {
    const res = await api<Offer>(`/employer/offers/${id}`);
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch offer');
    return res.data;
  },

  async createOffer(data: OfferPayload): Promise<Offer> {
    const res = await api<Offer>('/employer/offers', {
      method: 'POST',
      body: data,
    });
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to create offer');
    return res.data;
  },

  async updateOffer(id: string, data: Partial<OfferPayload>): Promise<Offer> {
    const res = await api<Offer>(`/employer/offers/${id}`, {
      method: 'PUT',
      body: data,
    });
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to update offer');
    return res.data;
  },

  async sendOffer(id: string): Promise<void> {
    const res = await api(`/employer/offers/${id}/send`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(res.error || 'Failed to send offer');
  },

  async withdrawOffer(id: string, reason: string): Promise<void> {
    const res = await api(`/employer/offers/${id}/withdraw`, {
      method: 'POST',
      body: { reason },
    });
    if (!res.ok) throw new Error(res.error || 'Failed to withdraw offer');
  },

  async getTemplates(): Promise<OfferTemplate[]> {
    const res = await api<OfferTemplate[]>('/employer/offers/templates');
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch templates');
    return res.data;
  },

  async getCandidates(): Promise<any[]> {
    const res = await api<any[]>('/employer/candidates?stage=offer');
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch candidates');
    return res.data;
  },

  async getJobs(): Promise<any[]> {
    const res = await api<any[]>('/employer/jobs');
    if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch jobs');
    return res.data;
  },
};

const STATUS_CONFIG: Record<Offer['status'], { label: string; color: string; icon: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: '📝' },
  'pending-approval': { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700', icon: '✅' },
  sent: { label: 'Sent', color: 'bg-purple-100 text-purple-700', icon: '📤' },
  viewed: { label: 'Viewed', color: 'bg-indigo-100 text-indigo-700', icon: '👁️' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700', icon: '🎉' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: '❌' },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-500', icon: '⏰' },
  withdrawn: { label: 'Withdrawn', color: 'bg-orange-100 text-orange-700', icon: '↩️' },
};

// Offer Card
function OfferCard({
  offer,
  onClick,
}: {
  offer: Offer;
  onClick: () => void;
}) {
  const statusConfig = STATUS_CONFIG[offer.status];
  const daysUntilExpiry = Math.ceil((new Date(offer.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            {offer.candidate.avatar ? (
              <OptimizedImage src={toCloudinaryAutoUrl(offer.candidate.avatar)} alt={offer.candidate.name} width={48} height={48} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">{offer.candidate.name[0]}</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{offer.candidate.name}</h3>
            <p className="text-sm text-gray-500">{offer.job.title}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
          {statusConfig.icon} {statusConfig.label}
        </span>
      </div>

      {/* Compensation Summary */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Base Salary</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {offer.compensation.currency} {offer.compensation.baseSalary.toLocaleString()}
              <span className="text-sm font-normal text-gray-500">/{offer.compensation.frequency}</span>
            </p>
          </div>
          {offer.compensation.bonus && offer.compensation.bonus.length > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Sign-on Bonus</p>
              <p className="text-lg font-semibold text-green-600">
                +{offer.compensation.currency} {offer.compensation.bonus[0].amount.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
          📅 Start: {new Date(offer.startDate).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
        </span>
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
          📍 {offer.location}
        </span>
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded capitalize">
          🏢 {offer.workType}
        </span>
      </div>

      {/* Expiry Warning */}
      {offer.status === 'sent' || offer.status === 'viewed' ? (
        daysUntilExpiry <= 3 && daysUntilExpiry > 0 ? (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <span>⚠️</span>
            <span>Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}</span>
          </div>
        ) : daysUntilExpiry <= 0 ? (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <span>⏰</span>
            <span>Expired</span>
          </div>
        ) : null
      ) : null}
    </div>
  );
}

// Offer Detail Modal
function OfferDetailModal({
  offer,
  isOpen,
  onClose,
  onSend,
  onWithdraw,
}: {
  offer: Offer | null;
  isOpen: boolean;
  onClose: () => void;
  onSend: () => void;
  onWithdraw: (reason: string) => void;
}) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');

  if (!isOpen || !offer) return null;

  const statusConfig = STATUS_CONFIG[offer.status];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {offer.candidate.avatar ? (
                  <OptimizedImage src={toCloudinaryAutoUrl(offer.candidate.avatar)} alt={offer.candidate.name} width={56} height={56} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">{offer.candidate.name[0]}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{offer.candidate.name}</h2>
                <p className="text-gray-500">{offer.job.title} • {offer.job.department}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status */}
          <div className="flex items-center justify-between mb-6">
            <span className={`px-4 py-2 rounded-full font-medium ${statusConfig.color}`}>
              {statusConfig.icon} {statusConfig.label}
            </span>
            <div className="text-sm text-gray-500">
              Created {new Date(offer.createdAt).toLocaleDateString('en-AU')}
            </div>
          </div>

          {/* Compensation Details */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Compensation Package</h3>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Base Salary</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {offer.compensation.currency} {offer.compensation.baseSalary.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">per {offer.compensation.frequency}</p>
                </div>
                
                {offer.compensation.bonus && offer.compensation.bonus.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Bonuses</p>
                    {offer.compensation.bonus.map((bonus, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-green-600 font-semibold">
                          +{offer.compensation.currency} {bonus.amount.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500 capitalize">{bonus.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {offer.compensation.equity && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 mb-1">Equity</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {offer.compensation.equity.amount.toLocaleString()} {offer.compensation.equity.type}
                  </p>
                  <p className="text-sm text-gray-500">{offer.compensation.equity.vestingSchedule}</p>
                </div>
              )}

              {offer.compensation.benefits.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 mb-2">Benefits</p>
                  <div className="flex flex-wrap gap-2">
                    {offer.compensation.benefits.map((benefit, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm">
                        ✓ {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Employment Details */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Start Date</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {new Date(offer.startDate).toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Offer Expires</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {new Date(offer.expiryDate).toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Location</p>
              <p className="font-semibold text-gray-900 dark:text-white">{offer.location}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Work Type</p>
              <p className="font-semibold text-gray-900 dark:text-white capitalize">{offer.workType}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Timeline</h3>
            <div className="space-y-3">
              {offer.timeline.map((event, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{event.action}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.date).toLocaleString('en-AU')}
                      {event.user && ` • ${event.user}`}
                    </p>
                    {event.note && <p className="text-sm text-gray-500 mt-1">{event.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {offer.status === 'draft' && (
              <>
                <Button variant="outline">Edit Offer</Button>
                <Button onClick={onSend}>Send to Candidate</Button>
              </>
            )}
            {offer.status === 'approved' && (
              <Button onClick={onSend}>📤 Send to Candidate</Button>
            )}
            {(offer.status === 'sent' || offer.status === 'viewed') && (
              <>
                <Button variant="outline" onClick={() => setShowWithdrawModal(true)}>
                  Withdraw Offer
                </Button>
                <Button variant="outline">Send Reminder</Button>
              </>
            )}
            {offer.status === 'accepted' && (
              <Button>🎉 Prepare Onboarding</Button>
            )}
          </div>
        </div>

        {/* Withdraw Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Withdraw Offer</h3>
              <p className="text-gray-500 mb-4">
                Are you sure you want to withdraw this offer? The candidate will be notified.
              </p>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="Reason for withdrawal (optional)"
                rows={3}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 mb-4"
              />
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowWithdrawModal(false)}>Cancel</Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => { onWithdraw(withdrawReason); setShowWithdrawModal(false); }}
                >
                  Withdraw
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Create Offer Modal
function CreateOfferModal({
  isOpen,
  onClose,
  onCreate,
  candidates,
  jobs,
  templates,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: OfferPayload) => void;
  candidates: SelectOption[];
  jobs: SelectOption[];
  templates: OfferTemplate[];
}) {
  const [step, setStep] = useState(1);
  const [candidateId, setCandidateId] = useState('');
  const [jobId, setJobId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [baseSalary, setBaseSalary] = useState('');
  const [currency, setCurrency] = useState('AUD');
  const [signOnBonus, setSignOnBonus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [location, setLocation] = useState('');
  const [workType, setWorkType] = useState<'onsite' | 'remote' | 'hybrid'>('hybrid');
  const [benefits, setBenefits] = useState<string[]>([]);

  const BENEFIT_OPTIONS = [
    'Health Insurance', 'Dental Insurance', 'Vision Insurance',
    'Life Insurance', '401k Match', 'Flexible Hours',
    'Remote Work', 'Professional Development', 'Gym Membership',
    'Paid Parental Leave', 'Unlimited PTO', 'Stock Options',
  ];

  if (!isOpen) return null;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template?.compensation) {
      if (template.compensation.baseSalary) setBaseSalary(template.compensation.baseSalary.toString());
      if (template.compensation.benefits) setBenefits(template.compensation.benefits);
    }
  };

  const handleSubmit = () => {
    onCreate({
      candidateId,
      jobId,
      compensation: {
        baseSalary: parseFloat(baseSalary),
        currency,
        frequency: 'annual',
        bonus: signOnBonus ? [{ type: 'sign-on', amount: parseFloat(signOnBonus) }] : [],
        benefits,
      },
      startDate,
      expiryDate,
      location,
      workType,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Offer</h2>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-blue-500' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Step 1: Select Candidate & Position</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Candidate *
                </label>
                <select
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                >
                  <option value="">Select candidate</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Position *
                </label>
                <select
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                >
                  <option value="">Select position</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>

              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Use Template (Optional)
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                  >
                    <option value="">Start from scratch</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Step 2: Compensation</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Base Salary *
                  </label>
                  <div className="flex">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-3 py-2 border rounded-l-lg dark:bg-gray-900 dark:border-gray-600"
                    >
                      <option value="AUD">AUD</option>
                      <option value="USD">USD</option>
                      <option value="NZD">NZD</option>
                    </select>
                    <input
                      type="number"
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(e.target.value)}
                      placeholder="100000"
                      className="flex-1 px-4 py-2 border-t border-r border-b rounded-r-lg dark:bg-gray-900 dark:border-gray-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sign-on Bonus
                  </label>
                  <input
                    type="number"
                    value={signOnBonus}
                    onChange={(e) => setSignOnBonus(e.target.value)}
                    placeholder="10000"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Benefits
                </label>
                <div className="flex flex-wrap gap-2">
                  {BENEFIT_OPTIONS.map((benefit) => (
                    <button
                      key={benefit}
                      onClick={() => {
                        setBenefits(
                          benefits.includes(benefit)
                            ? benefits.filter(b => b !== benefit)
                            : [...benefits, benefit]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        benefits.includes(benefit)
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {benefits.includes(benefit) ? '✓' : '+'} {benefit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Step 3: Details</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Offer Expires *
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Work Location *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Sydney, NSW"
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Work Type *
                </label>
                <div className="flex gap-3">
                  {(['onsite', 'hybrid', 'remote'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setWorkType(type)}
                      className={`flex-1 px-4 py-3 rounded-lg capitalize ${
                        workType === type
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <Button variant="outline" onClick={step === 1 ? onClose : () => setStep(step - 1)}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && (!candidateId || !jobId)}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!startDate || !expiryDate || !location}>
              Create Offer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component
export function OfferManagement() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);
  const [filters, setFilters] = useState({
    status: '',
  });

  const loadOffers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { offers: data } = await offersApi.getOffers(filters);
      setOffers(data);
    } catch (error) {
      console.error('Failed to load offers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadFormData = useCallback(async () => {
    try {
      const [candidatesData, jobsData, templatesData] = await Promise.all([
        offersApi.getCandidates(),
        offersApi.getJobs(),
        offersApi.getTemplates(),
      ]);
      setCandidates(candidatesData);
      setJobs(jobsData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load form data:', error);
    }
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  const handleCreate = async (data: any) => {
    try {
      await offersApi.createOffer(data);
      setShowCreateModal(false);
      loadOffers();
    } catch (error) {
      console.error('Failed to create offer:', error);
    }
  };

  const handleSend = async () => {
    if (!selectedOffer) return;
    try {
      await offersApi.sendOffer(selectedOffer.id);
      loadOffers();
      setSelectedOffer(null);
    } catch (error) {
      console.error('Failed to send offer:', error);
    }
  };

  const handleWithdraw = async (reason: string) => {
    if (!selectedOffer) return;
    try {
      await offersApi.withdrawOffer(selectedOffer.id, reason);
      loadOffers();
      setSelectedOffer(null);
    } catch (error) {
      console.error('Failed to withdraw offer:', error);
    }
  };

  // Stats
  const stats = {
    pending: offers.filter(o => o.status === 'sent' || o.status === 'viewed').length,
    accepted: offers.filter(o => o.status === 'accepted').length,
    declined: offers.filter(o => o.status === 'declined').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Offer Management</h1>
          <p className="text-gray-500 mt-1">Create, send, and track job offers</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          📝 Create Offer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5">
          <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-sm text-blue-600">Pending Response</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5">
          <div className="text-3xl font-bold text-green-600">{stats.accepted}</div>
          <div className="text-sm text-green-600">Accepted</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5">
          <div className="text-3xl font-bold text-red-600">{stats.declined}</div>
          <div className="text-sm text-red-600">Declined</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.icon} {config.label}</option>
          ))}
        </select>
      </div>

      {/* Offers Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No offers yet
          </h3>
          <p className="text-gray-500 mb-4">Create your first offer to a candidate</p>
          <Button onClick={() => setShowCreateModal(true)}>Create Offer</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onClick={() => setSelectedOffer(offer)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <OfferDetailModal
        offer={selectedOffer}
        isOpen={!!selectedOffer}
        onClose={() => setSelectedOffer(null)}
        onSend={handleSend}
        onWithdraw={handleWithdraw}
      />

      {/* Create Modal */}
      <CreateOfferModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        candidates={candidates}
        jobs={jobs}
        templates={templates}
      />
    </div>
  );
}

export default OfferManagement;

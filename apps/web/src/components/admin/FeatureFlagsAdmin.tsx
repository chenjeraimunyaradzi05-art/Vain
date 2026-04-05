'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button';

/**
 * FeatureFlagsAdmin - Admin interface for managing feature flags
 * 
 * Features:
 * - View all feature flags
 * - Toggle flags on/off
 * - Create new flags
 * - Set user/role targeting rules
 * - View flag usage analytics
 * - Rollout percentage control
 */

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'boolean' | 'string' | 'number' | 'json';
  value: any;
  defaultValue: any;
  rolloutPercentage: number;
  targetingRules: TargetingRule[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  environment: 'development' | 'staging' | 'production';
  usageCount24h?: number;
}

interface TargetingRule {
  id: string;
  attribute: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: string | string[] | number;
  enabled: boolean;
}

interface FlagAuditLog {
  id: string;
  flagId: string;
  action: 'created' | 'updated' | 'enabled' | 'disabled' | 'deleted';
  changes: Record<string, { from: any; to: any }>;
  performedBy: string;
  timestamp: string;
}

// API functions
const featureFlagsAdminApi = {
  async getFlags(params?: { environment?: string; search?: string }): Promise<{ flags: FeatureFlag[] }> {
    const searchParams = new URLSearchParams();
    if (params?.environment) searchParams.set('environment', params.environment);
    if (params?.search) searchParams.set('search', params.search);
    const res = await fetch(`/api/admin/feature-flags?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch flags');
    return res.json();
  },

  async getFlag(id: string): Promise<FeatureFlag> {
    const res = await fetch(`/api/admin/feature-flags/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch flag');
    return res.json();
  },

  async createFlag(data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const res = await fetch('/api/admin/feature-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create flag');
    return res.json();
  },

  async updateFlag(id: string, data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const res = await fetch(`/api/admin/feature-flags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update flag');
    return res.json();
  },

  async toggleFlag(id: string, enabled: boolean): Promise<void> {
    const res = await fetch(`/api/admin/feature-flags/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error('Failed to toggle flag');
  },

  async deleteFlag(id: string): Promise<void> {
    const res = await fetch(`/api/admin/feature-flags/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete flag');
  },

  async getAuditLogs(flagId: string): Promise<{ logs: FlagAuditLog[] }> {
    const res = await fetch(`/api/admin/feature-flags/${flagId}/audit`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async addTargetingRule(flagId: string, rule: Omit<TargetingRule, 'id'>): Promise<TargetingRule> {
    const res = await fetch(`/api/admin/feature-flags/${flagId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(rule),
    });
    if (!res.ok) throw new Error('Failed to add rule');
    return res.json();
  },

  async deleteTargetingRule(flagId: string, ruleId: string): Promise<void> {
    const res = await fetch(`/api/admin/feature-flags/${flagId}/rules/${ruleId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete rule');
  },
};

// Environment colors
const envColors: Record<string, { bg: string; text: string }> = {
  development: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  staging: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  production: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

// Flag Card Component
function FlagCard({
  flag,
  onToggle,
  onEdit,
  onDelete,
}: {
  flag: FeatureFlag;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${envColors[flag.environment].bg} ${envColors[flag.environment].text}`}>
              {flag.environment}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{flag.key}</span>
          </div>
          
          {/* Name & Description */}
          <h3 className="mt-2 font-semibold text-gray-900 dark:text-white">{flag.name}</h3>
          {flag.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {flag.description}
            </p>
          )}
          
          {/* Tags */}
          {flag.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {flag.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {/* Stats */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>Type: <span className="font-medium">{flag.type}</span></span>
            {flag.rolloutPercentage < 100 && (
              <span>Rollout: <span className="font-medium">{flag.rolloutPercentage}%</span></span>
            )}
            {flag.targetingRules.length > 0 && (
              <span>{flag.targetingRules.length} targeting rules</span>
            )}
            {flag.usageCount24h !== undefined && (
              <span>{flag.usageCount24h.toLocaleString()} checks/24h</span>
            )}
          </div>
        </div>
        
        {/* Toggle & Actions */}
        <div className="flex items-center gap-2 ml-4">
          {/* Toggle Switch */}
          <button
            onClick={onToggle}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              flag.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                flag.enabled ? 'translate-x-6' : ''
              }`}
            />
          </button>
          
          {/* Actions */}
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Flag Editor Modal
function FlagEditorModal({
  flag,
  onSave,
  onClose,
}: {
  flag: FeatureFlag | null;
  onSave: (data: Partial<FeatureFlag>) => Promise<void>;
  onClose: () => void;
}) {
  const isNew = !flag?.id;
  const [formData, setFormData] = useState<Partial<FeatureFlag>>({
    key: flag?.key || '',
    name: flag?.name || '',
    description: flag?.description || '',
    type: flag?.type || 'boolean',
    defaultValue: flag?.defaultValue ?? true,
    rolloutPercentage: flag?.rolloutPercentage ?? 100,
    tags: flag?.tags || [],
    environment: flag?.environment || 'development',
    targetingRules: flag?.targetingRules || [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newRule, setNewRule] = useState<Omit<TargetingRule, 'id' | 'enabled'>>({
    attribute: 'role',
    operator: 'equals',
    value: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save flag:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || [],
    }));
  };

  const addRule = () => {
    if (newRule.attribute && newRule.value) {
      setFormData(prev => ({
        ...prev,
        targetingRules: [
          ...(prev.targetingRules || []),
          { ...newRule, id: Date.now().toString(), enabled: true } as TargetingRule,
        ],
      }));
      setNewRule({ attribute: 'role', operator: 'equals', value: '' });
    }
  };

  const removeRule = (ruleId: string) => {
    setFormData(prev => ({
      ...prev,
      targetingRules: prev.targetingRules?.filter(r => r.id !== ruleId) || [],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isNew ? 'Create Feature Flag' : 'Edit Feature Flag'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Key & Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Flag Key *
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_') }))}
                  placeholder="my_feature_flag"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  required
                  disabled={!isNew}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Feature Flag"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What does this flag control?"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>

            {/* Type & Environment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="boolean">Boolean</option>
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Environment
                </label>
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>
            </div>

            {/* Default Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Value
              </label>
              {formData.type === 'boolean' ? (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={formData.defaultValue === true}
                      onChange={() => setFormData(prev => ({ ...prev, defaultValue: true }))}
                      className="text-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">True</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={formData.defaultValue === false}
                      onChange={() => setFormData(prev => ({ ...prev, defaultValue: false }))}
                      className="text-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">False</span>
                  </label>
                </div>
              ) : formData.type === 'number' ? (
                <input
                  type="number"
                  value={formData.defaultValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : formData.type === 'json' ? (
                <textarea
                  value={typeof formData.defaultValue === 'string' ? formData.defaultValue : JSON.stringify(formData.defaultValue, null, 2)}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none"
                  placeholder='{"key": "value"}'
                />
              ) : (
                <input
                  type="text"
                  value={formData.defaultValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              )}
            </div>

            {/* Rollout Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rollout Percentage: {formData.rolloutPercentage}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.rolloutPercentage}
                onChange={(e) => setFormData(prev => ({ ...prev, rolloutPercentage: parseInt(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag..."
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <Button type="button" size="sm" onClick={addTag}>Add</Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 
                        text-gray-700 dark:text-gray-300 rounded text-sm"
                    >
                      {tag}
                      <button 
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Targeting Rules */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Targeting Rules
              </label>
              
              {/* Existing rules */}
              {formData.targetingRules && formData.targetingRules.length > 0 && (
                <div className="space-y-2 mb-3">
                  {formData.targetingRules.map((rule) => (
                    <div 
                      key={rule.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-750 rounded-lg"
                    >
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{rule.attribute}</span>
                        {' '}{rule.operator.replace(/_/g, ' ')}{' '}
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {Array.isArray(rule.value) ? rule.value.join(', ') : rule.value}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRule(rule.id)}
                        className="ml-auto text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add new rule */}
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={newRule.attribute}
                  onChange={(e) => setNewRule(prev => ({ ...prev, attribute: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="role">Role</option>
                  <option value="email">Email</option>
                  <option value="userId">User ID</option>
                  <option value="plan">Plan</option>
                  <option value="country">Country</option>
                  <option value="isAdmin">Is Admin</option>
                </select>
                <select
                  value={newRule.operator}
                  onChange={(e) => setNewRule(prev => ({ ...prev, operator: e.target.value as any }))}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="equals">equals</option>
                  <option value="not_equals">not equals</option>
                  <option value="contains">contains</option>
                  <option value="in">in list</option>
                  <option value="not_in">not in list</option>
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={typeof newRule.value === 'string' ? newRule.value : ''}
                    onChange={(e) => setNewRule(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <Button type="button" size="sm" onClick={addRule}>+</Button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : isNew ? 'Create Flag' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Audit Log Modal
function AuditLogModal({
  flagId,
  onClose,
}: {
  flagId: string;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<FlagAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await featureFlagsAdminApi.getAuditLogs(flagId);
        setLogs(data.logs);
      } catch (error) {
        console.error('Failed to load logs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLogs();
  }, [flagId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Log</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border-l-2 border-gray-200 dark:border-gray-600 pl-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      log.action === 'enabled' ? 'text-green-600' :
                      log.action === 'disabled' ? 'text-red-600' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    by {log.performedBy}
                  </p>
                  {Object.keys(log.changes).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {Object.entries(log.changes).map(([key, change]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {String(change.from)} → {String(change.to)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No audit logs found</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component
export function FeatureFlagsAdmin() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [auditFlagId, setAuditFlagId] = useState<string | null>(null);

  // Load flags
  const loadFlags = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await featureFlagsAdminApi.getFlags({
        environment: selectedEnvironment !== 'all' ? selectedEnvironment : undefined,
        search: searchQuery || undefined,
      });
      setFlags(data.flags);
    } catch (error) {
      console.error('Failed to load flags:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEnvironment, searchQuery]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  // Toggle flag
  const handleToggle = async (flag: FeatureFlag) => {
    try {
      await featureFlagsAdminApi.toggleFlag(flag.id, !flag.enabled);
      setFlags(prev => prev.map(f => 
        f.id === flag.id ? { ...f, enabled: !f.enabled } : f
      ));
    } catch (error) {
      console.error('Failed to toggle flag:', error);
    }
  };

  // Save flag
  const handleSaveFlag = async (data: Partial<FeatureFlag>) => {
    if (editingFlag) {
      await featureFlagsAdminApi.updateFlag(editingFlag.id, data);
    } else {
      await featureFlagsAdminApi.createFlag(data);
    }
    loadFlags();
  };

  // Delete flag
  const handleDeleteFlag = async (flag: FeatureFlag) => {
    if (window.confirm(`Are you sure you want to delete "${flag.name}"?`)) {
      try {
        await featureFlagsAdminApi.deleteFlag(flag.id);
        setFlags(prev => prev.filter(f => f.id !== flag.id));
      } catch (error) {
        console.error('Failed to delete flag:', error);
      }
    }
  };

  // Filter flags
  const filteredFlags = flags.filter(flag => {
    const matchesSearch = !searchQuery || 
      flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Stats
  const stats = {
    total: flags.length,
    enabled: flags.filter(f => f.enabled).length,
    disabled: flags.filter(f => !f.enabled).length,
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feature Flags</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Manage feature toggles and rollout configurations
          </p>
        </div>
        <Button onClick={() => { setEditingFlag(null); setShowEditor(true); }}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Flag
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Flags</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-green-600">{stats.enabled}</p>
          <p className="text-sm text-gray-500">Enabled</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-gray-400">{stats.disabled}</p>
          <p className="text-sm text-gray-500">Disabled</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search flags..."
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Environment filter */}
        <div className="flex gap-2">
          {['all', 'development', 'staging', 'production'].map((env) => (
            <button
              key={env}
              onClick={() => setSelectedEnvironment(env)}
              className={`px-3 py-2 text-sm rounded-lg capitalize transition-colors ${
                selectedEnvironment === env
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {env}
            </button>
          ))}
        </div>
      </div>

      {/* Flags List */}
      {filteredFlags.length > 0 ? (
        <div className="space-y-4">
          {filteredFlags.map((flag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              onToggle={() => handleToggle(flag)}
              onEdit={() => { setEditingFlag(flag); setShowEditor(true); }}
              onDelete={() => handleDeleteFlag(flag)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🚩</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No feature flags found
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Try a different search term' : 'Create your first feature flag to get started'}
          </p>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <FlagEditorModal
          flag={editingFlag}
          onSave={handleSaveFlag}
          onClose={() => { setShowEditor(false); setEditingFlag(null); }}
        />
      )}

      {/* Audit Log Modal */}
      {auditFlagId && (
        <AuditLogModal
          flagId={auditFlagId}
          onClose={() => setAuditFlagId(null)}
        />
      )}
    </div>
  );
}

export default FeatureFlagsAdmin;

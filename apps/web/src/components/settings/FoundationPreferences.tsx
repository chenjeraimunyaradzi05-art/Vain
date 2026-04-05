/**
 * Foundation Preferences Settings Component
 * 
 * Allows users to update their business/finance interests and pre-apply preferences
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building, Scale, Building2, PiggyBank, Home, TrendingUp, Coins, BarChart3,
  Bell, Briefcase, MapPin, DollarSign, Loader2, Check, AlertCircle
} from 'lucide-react';
import { getErrorMessage } from '@/lib/formatters';

interface FoundationPreferences {
  // Business & Entrepreneurship
  businessFoundation: boolean;
  legalStartups: boolean;
  businessFormation: boolean;
  basicAccountingBudget: boolean;
  // Financial Wellness
  mortgagesHomeOwnership: boolean;
  investingStocks: boolean;
  preciousMetals: boolean;
  financialWellbeing: boolean;
  // Job Alerts & Pre-Apply
  enableJobAlerts: boolean;
  enablePreApply: boolean;
  preApplyLocations: string[];
  preApplyEmployment: string[];
  preApplySalaryMin: number | null;
  preApplySalaryMax: number | null;
  preApplyIndustries: string[];
}

const defaultPreferences: FoundationPreferences = {
  businessFoundation: false,
  legalStartups: false,
  businessFormation: false,
  basicAccountingBudget: false,
  mortgagesHomeOwnership: false,
  investingStocks: false,
  preciousMetals: false,
  financialWellbeing: false,
  enableJobAlerts: true,
  enablePreApply: false,
  preApplyLocations: [],
  preApplyEmployment: [],
  preApplySalaryMin: null,
  preApplySalaryMax: null,
  preApplyIndustries: [],
};

const businessInterests = [
  { key: 'businessFoundation', label: 'Starting a Business', icon: Building, desc: 'Basics of launching your venture' },
  { key: 'legalStartups', label: 'Legal Essentials', icon: Scale, desc: 'Business law & compliance' },
  { key: 'businessFormation', label: 'Business Formation', icon: Building2, desc: 'ABN, company structures' },
  { key: 'basicAccountingBudget', label: 'Accounting & Budgeting', icon: PiggyBank, desc: 'Financial management basics' },
];

const financeInterests = [
  { key: 'mortgagesHomeOwnership', label: 'Home Ownership', icon: Home, desc: 'Mortgages & buying property' },
  { key: 'investingStocks', label: 'Stock Investing', icon: TrendingUp, desc: 'Share market basics' },
  { key: 'preciousMetals', label: 'Precious Metals', icon: Coins, desc: 'Gold, silver & alternatives' },
  { key: 'financialWellbeing', label: 'Financial Wellbeing', icon: BarChart3, desc: 'Budgeting & wealth building' },
];

const employmentTypes = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'CASUAL', label: 'Casual' },
  { value: 'APPRENTICESHIP', label: 'Apprenticeship' },
];

const locations = [
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 
  'Darwin', 'Hobart', 'Canberra', 'Remote', 'Regional NSW',
  'Regional VIC', 'Regional QLD', 'Regional WA'
];

const industries = [
  'Mining & Resources', 'Healthcare', 'Construction', 'Government',
  'Education', 'Retail', 'Hospitality', 'Community Services',
  'Technology', 'Agriculture', 'Transport & Logistics'
];

interface Props {
  apiBase?: string;
  token?: string;
}

export default function FoundationPreferences({ apiBase = '', token }: Props) {
  const [preferences, setPreferences] = useState<FoundationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/members/foundation-preferences`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setPreferences({ ...defaultPreferences, ...data });
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const res = await fetch(`${apiBase}/api/members/foundation-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(preferences),
      });

      if (!res.ok) {
        throw new Error('Failed to save preferences');
      }

      setSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save preferences'));
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (key: keyof FoundationPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const toggleArrayItem = (key: 'preApplyLocations' | 'preApplyEmployment' | 'preApplyIndustries', value: string) => {
    setPreferences(prev => {
      const arr = prev[key];
      const newArr = arr.includes(value) 
        ? arr.filter(v => v !== value) 
        : [...arr, value];
      return { ...prev, [key]: newArr };
    });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-green-300">Preferences saved successfully!</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* Business & Entrepreneurship Section */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-400" />
            Business & Entrepreneurship
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Select topics you're interested in learning about
          </p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {businessInterests.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleInterest(item.key as keyof FoundationPreferences)}
              className={`p-4 rounded-xl text-left transition-all border-2 ${
                preferences[item.key as keyof FoundationPreferences]
                  ? 'border-emerald-500 bg-emerald-900/20'
                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${
                  preferences[item.key as keyof FoundationPreferences] ? 'text-emerald-400' : 'text-slate-400'
                }`} />
                <div>
                  <p className={`font-medium ${
                    preferences[item.key as keyof FoundationPreferences] ? 'text-emerald-300' : 'text-white'
                  }`}>{item.label}</p>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Financial Wellness Section */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            Financial Wellness & Investing
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Learn about personal finance and investment
          </p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {financeInterests.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleInterest(item.key as keyof FoundationPreferences)}
              className={`p-4 rounded-xl text-left transition-all border-2 ${
                preferences[item.key as keyof FoundationPreferences]
                  ? 'border-amber-500 bg-amber-900/20'
                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${
                  preferences[item.key as keyof FoundationPreferences] ? 'text-amber-400' : 'text-slate-400'
                }`} />
                <div>
                  <p className={`font-medium ${
                    preferences[item.key as keyof FoundationPreferences] ? 'text-amber-300' : 'text-white'
                  }`}>{item.label}</p>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Job Alerts & Pre-Apply Section */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-pink-400" />
            Job Alerts & Pre-Apply
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Get notified when matching jobs are posted
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Enable Job Alerts */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Enable Job Alerts</p>
              <p className="text-sm text-slate-500">Get notified when new jobs match your profile</p>
            </div>
            <button
              onClick={() => toggleInterest('enableJobAlerts')}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                preferences.enableJobAlerts ? 'bg-green-600' : 'bg-slate-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                preferences.enableJobAlerts ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Enable Pre-Apply */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Enable Pre-Apply Queue</p>
              <p className="text-sm text-slate-500">Get priority notifications for matching jobs</p>
            </div>
            <button
              onClick={() => toggleInterest('enablePreApply')}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                preferences.enablePreApply ? 'bg-green-600' : 'bg-slate-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                preferences.enablePreApply ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Pre-Apply Settings (shown when enabled) */}
          {preferences.enablePreApply && (
            <div className="space-y-6 pt-4 border-t border-slate-700">
              {/* Preferred Locations */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Preferred Locations
                </label>
                <div className="flex flex-wrap gap-2">
                  {locations.map(loc => (
                    <button
                      key={loc}
                      onClick={() => toggleArrayItem('preApplyLocations', loc)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        preferences.preApplyLocations.includes(loc)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Employment Types */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Employment Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {employmentTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => toggleArrayItem('preApplyEmployment', type.value)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        preferences.preApplyEmployment.includes(type.value)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Salary Range */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Salary Range (Annual)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="number"
                      placeholder="Min salary"
                      value={preferences.preApplySalaryMin || ''}
                      onChange={(e) => {
                        setPreferences(prev => ({ 
                          ...prev, 
                          preApplySalaryMin: e.target.value ? parseInt(e.target.value) : null 
                        }));
                        setHasChanges(true);
                      }}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Max salary"
                      value={preferences.preApplySalaryMax || ''}
                      onChange={(e) => {
                        setPreferences(prev => ({ 
                          ...prev, 
                          preApplySalaryMax: e.target.value ? parseInt(e.target.value) : null 
                        }));
                        setHasChanges(true);
                      }}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Industries */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Preferred Industries
                </label>
                <div className="flex flex-wrap gap-2">
                  {industries.map(ind => (
                    <button
                      key={ind}
                      onClick={() => toggleArrayItem('preApplyIndustries', ind)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        preferences.preApplyIndustries.includes(ind)
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-4 bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between">
          <p className="text-slate-300">You have unsaved changes</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                loadPreferences();
                setHasChanges(false);
              }}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Discard
            </button>
            <button
              onClick={savePreferences}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

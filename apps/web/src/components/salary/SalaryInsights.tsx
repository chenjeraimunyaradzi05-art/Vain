'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * SalaryInsights - Salary data and negotiation resources
 * 
 * Features:
 * - Browse salary data by role, industry, location
 * - Compare salaries
 * - Negotiation tips and resources
 * - Salary calculator
 */

interface SalaryData {
  id: string;
  role: string;
  industry: string;
  location: {
    city: string;
    state: string;
  };
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  salary: {
    min: number;
    median: number;
    max: number;
    currency: string;
  };
  totalCompensation: {
    base: number;
    bonus?: number;
    equity?: number;
    benefits?: number;
  };
  sampleSize: number;
  lastUpdated: string;
  benefits: string[];
  skills: string[];
}

interface SalaryComparison {
  role: string;
  locations: {
    location: string;
    salary: number;
  }[];
}

interface NegotiationResource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'template' | 'guide';
  duration?: string;
  url: string;
  thumbnail?: string;
}

// API functions
const salaryApi = {
  async searchSalaries(params: {
    role?: string;
    industry?: string;
    location?: string;
    experienceLevel?: string;
  }): Promise<{ salaries: SalaryData[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.role) searchParams.set('role', params.role);
    if (params.industry) searchParams.set('industry', params.industry);
    if (params.location) searchParams.set('location', params.location);
    if (params.experienceLevel) searchParams.set('experienceLevel', params.experienceLevel);

    const res = await fetch(`/api/salary/search?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to search salaries');
    return res.json();
  },

  async getSalaryDetails(roleId: string): Promise<SalaryData> {
    const res = await fetch(`/api/salary/${roleId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch details');
    return res.json();
  },

  async compareSalaries(roles: string[], location?: string): Promise<{ comparisons: SalaryComparison[] }> {
    const res = await fetch('/api/salary/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ roles, location }),
    });
    if (!res.ok) throw new Error('Failed to compare');
    return res.json();
  },

  async getNegotiationResources(): Promise<{ resources: NegotiationResource[] }> {
    const res = await fetch('/api/salary/resources', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch resources');
    return res.json();
  },

  async submitSalary(data: {
    role: string;
    industry: string;
    location: string;
    experienceLevel: string;
    salary: number;
    bonus?: number;
    equity?: number;
  }): Promise<void> {
    const res = await fetch('/api/salary/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to submit salary');
  },

  async getPopularRoles(): Promise<{ roles: string[] }> {
    const res = await fetch('/api/salary/popular-roles', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch roles');
    return res.json();
  },
};

// Industries
const industries = [
  'Technology',
  'Finance & Banking',
  'Healthcare',
  'Education',
  'Government',
  'Mining & Resources',
  'Construction',
  'Retail',
  'Professional Services',
  'Manufacturing',
  'Media & Entertainment',
  'Non-Profit',
];

// Experience levels
const experienceLevels = [
  { value: 'entry', label: 'Entry Level', years: '0-2 years' },
  { value: 'mid', label: 'Mid Level', years: '3-5 years' },
  { value: 'senior', label: 'Senior Level', years: '6-10 years' },
  { value: 'executive', label: 'Executive', years: '10+ years' },
];

// Australian cities
const australianCities = [
  'Sydney, NSW',
  'Melbourne, VIC',
  'Brisbane, QLD',
  'Perth, WA',
  'Adelaide, SA',
  'Canberra, ACT',
  'Hobart, TAS',
  'Darwin, NT',
  'Gold Coast, QLD',
  'Newcastle, NSW',
];

// Format currency
function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Salary Card
function SalaryCard({
  salary,
  onViewDetails,
}: {
  salary: SalaryData;
  onViewDetails: () => void;
}) {
  const levelConfig = experienceLevels.find(l => l.value === salary.experienceLevel);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{salary.role}</h3>
          <p className="text-sm text-gray-500">{salary.industry}</p>
        </div>
        <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium rounded-full">
          {levelConfig?.label}
        </span>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {salary.location.city}, {salary.location.state}
      </div>

      {/* Salary Range */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
        <div className="text-center mb-3">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(salary.salary.median)}
          </div>
          <div className="text-xs text-gray-500">Median Base Salary</div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-700 dark:text-gray-300">
              {formatCurrency(salary.salary.min)}
            </div>
            <div className="text-xs text-gray-500">Min</div>
          </div>
          <div className="flex-1 mx-4">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full relative">
              <div
                className="absolute h-full bg-green-500 rounded-full"
                style={{
                  left: '0%',
                  width: `${((salary.salary.median - salary.salary.min) / (salary.salary.max - salary.salary.min)) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700 dark:text-gray-300">
              {formatCurrency(salary.salary.max)}
            </div>
            <div className="text-xs text-gray-500">Max</div>
          </div>
        </div>
      </div>

      {/* Sample Size */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>Based on {salary.sampleSize} salaries</span>
        <span>Updated {new Date(salary.lastUpdated).toLocaleDateString('en-AU')}</span>
      </div>

      {/* Skills Preview */}
      {salary.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {salary.skills.slice(0, 3).map((skill, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
            >
              {skill}
            </span>
          ))}
          {salary.skills.length > 3 && (
            <span className="text-xs text-gray-500">+{salary.skills.length - 3}</span>
          )}
        </div>
      )}

      <Button variant="outline" onClick={onViewDetails} className="w-full">
        View Details
      </Button>
    </div>
  );
}

// Salary Detail Modal
function SalaryDetailModal({
  salary,
  onClose,
}: {
  salary: SalaryData;
  onClose: () => void;
}) {
  const levelConfig = experienceLevels.find(l => l.value === salary.experienceLevel);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{salary.role}</h2>
              <p className="text-gray-500">{salary.industry} • {salary.location.city}, {salary.location.state}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Experience Level */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-sm font-medium rounded-full">
              {levelConfig?.label}
            </span>
            <span className="text-gray-500">{levelConfig?.years}</span>
          </div>

          {/* Salary Breakdown */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Salary Breakdown</h3>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-green-600">
                  {formatCurrency(salary.salary.median)}
                </div>
                <div className="text-sm text-gray-500">Median Annual Salary</div>
              </div>

              {/* Range Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">{formatCurrency(salary.salary.min)}</span>
                  <span className="text-gray-600 dark:text-gray-400">{formatCurrency(salary.salary.max)}</span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full relative">
                  <div
                    className="absolute h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                    style={{ width: '100%' }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-green-500 rounded-full"
                    style={{
                      left: `${((salary.salary.median - salary.salary.min) / (salary.salary.max - salary.salary.min)) * 100}%`,
                      transform: 'translateX(-50%) translateY(-50%)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>10th percentile</span>
                  <span>90th percentile</span>
                </div>
              </div>

              {/* Total Compensation */}
              {(salary.totalCompensation.bonus || salary.totalCompensation.equity) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(salary.totalCompensation.base)}
                    </div>
                    <div className="text-xs text-gray-500">Base</div>
                  </div>
                  {salary.totalCompensation.bonus && (
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(salary.totalCompensation.bonus)}
                      </div>
                      <div className="text-xs text-gray-500">Bonus</div>
                    </div>
                  )}
                  {salary.totalCompensation.equity && (
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(salary.totalCompensation.equity)}
                      </div>
                      <div className="text-xs text-gray-500">Equity</div>
                    </div>
                  )}
                  {salary.totalCompensation.benefits && (
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(salary.totalCompensation.benefits)}
                      </div>
                      <div className="text-xs text-gray-500">Benefits</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Common Benefits */}
          {salary.benefits.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Common Benefits</h3>
              <div className="grid grid-cols-2 gap-2">
                {salary.benefits.map((benefit, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required Skills */}
          {salary.skills.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Key Skills</h3>
              <div className="flex flex-wrap gap-2">
                {salary.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Data Info */}
          <div className="flex items-center justify-between text-sm text-gray-500 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span>Based on {salary.sampleSize} salary submissions</span>
            <span>Last updated: {new Date(salary.lastUpdated).toLocaleDateString('en-AU')}</span>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
          <Button className="flex-1">Compare Salaries</Button>
        </div>
      </div>
    </div>
  );
}

// Negotiation Resource Card
function ResourceCard({ resource }: { resource: NegotiationResource }) {
  const typeIcons = {
    article: '📄',
    video: '🎬',
    template: '📋',
    guide: '📖',
  };

  const typeColors = {
    article: 'bg-blue-100 text-blue-700',
    video: 'bg-red-100 text-red-700',
    template: 'bg-green-100 text-green-700',
    guide: 'bg-purple-100 text-purple-700',
  };

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-blue-300 transition-colors"
    >
      {resource.thumbnail && (
        <div className="h-32 bg-gray-100 dark:bg-gray-700">
          <OptimizedImage src={toCloudinaryAutoUrl(resource.thumbnail)} alt={resource.title} width={400} height={128} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${typeColors[resource.type]}`}>
            {typeIcons[resource.type]} {resource.type}
          </span>
          {resource.duration && (
            <span className="text-xs text-gray-500">{resource.duration}</span>
          )}
        </div>
        <h3 className="font-medium text-gray-900 dark:text-white mb-1">{resource.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{resource.description}</p>
      </div>
    </a>
  );
}

// Salary Calculator
function SalaryCalculator() {
  const [baseSalary, setBaseSalary] = useState<number>(80000);
  const [superannuation, setSuperannuation] = useState<number>(11.5);
  const [bonus, setBonus] = useState<number>(0);

  const totalPackage = baseSalary + (baseSalary * superannuation / 100) + bonus;
  const monthlyTakeHome = baseSalary / 12;
  const fortnightlyTakeHome = baseSalary / 26;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Salary Calculator</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Base Salary (Annual)
          </label>
          <input
            type="number"
            value={baseSalary}
            onChange={(e) => setBaseSalary(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Superannuation (%)
          </label>
          <input
            type="number"
            value={superannuation}
            onChange={(e) => setSuperannuation(Number(e.target.value))}
            step="0.5"
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Annual Bonus
          </label>
          <input
            type="number"
            value={bonus}
            onChange={(e) => setBonus(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">Total Package</span>
          <span className="text-lg font-bold text-green-600">{formatCurrency(totalPackage)}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">Monthly (pre-tax)</span>
          <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(monthlyTakeHome)}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">Fortnightly (pre-tax)</span>
          <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(fortnightlyTakeHome)}</span>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function SalaryInsights() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'explore' | 'resources' | 'calculator'>('explore');
  const [salaries, setSalaries] = useState<SalaryData[]>([]);
  const [resources, setResources] = useState<NegotiationResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSalary, setSelectedSalary] = useState<SalaryData | null>(null);

  // Filters
  const [roleSearch, setRoleSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [salariesRes, resourcesRes] = await Promise.all([
        salaryApi.searchSalaries({
          role: roleSearch,
          industry: industryFilter,
          location: locationFilter,
          experienceLevel: levelFilter,
        }),
        salaryApi.getNegotiationResources(),
      ]);
      setSalaries(salariesRes.salaries);
      setResources(resourcesRes.resources);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [roleSearch, industryFilter, locationFilter, levelFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Salary Insights</h1>
        <p className="text-gray-500 mt-1">Explore salaries and negotiate with confidence</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {(['explore', 'resources', 'calculator'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium rounded-lg capitalize transition-colors ${
              activeTab === tab
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'resources' ? 'Negotiation Tips' : tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'explore' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Search job titles..."
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Industries</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Locations</option>
              {australianCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Levels</option>
              {experienceLevels.map((level) => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>

          {/* Results */}
          {salaries.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {salaries.map((salary) => (
                <SalaryCard
                  key={salary.id}
                  salary={salary}
                  onViewDetails={() => setSelectedSalary(salary)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No salary data found</h3>
              <p className="text-gray-500 mt-2">Try adjusting your search criteria</p>
            </div>
          )}

          {/* Contribute CTA */}
          <div className="mt-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
            <h3 className="text-xl font-semibold mb-2">Help others by sharing your salary</h3>
            <p className="text-blue-100 mb-4">
              Anonymous salary contributions help the community negotiate better compensation.
            </p>
            <Button className="bg-white text-blue-600 hover:bg-blue-50">
              Submit Your Salary
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'resources' && (
        <div>
          {/* Tips Overview */}
          <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl p-6 text-white mb-8">
            <h2 className="text-xl font-semibold mb-2">Negotiation Tips</h2>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-2xl mb-2">🔍</div>
                <h3 className="font-medium mb-1">Do Your Research</h3>
                <p className="text-sm text-green-100">Know the market rate for your role and experience</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-2xl mb-2">💪</div>
                <h3 className="font-medium mb-1">Know Your Value</h3>
                <p className="text-sm text-green-100">Document your achievements and unique skills</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-2xl mb-2">🎯</div>
                <h3 className="font-medium mb-1">Be Specific</h3>
                <p className="text-sm text-green-100">Have a clear number or range in mind</p>
              </div>
            </div>
          </div>

          {/* Resources Grid */}
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Helpful Resources</h3>
          {resources.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Resources coming soon</h3>
              <p className="text-gray-500 mt-2">We're working on adding negotiation resources</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'calculator' && (
        <div className="max-w-xl mx-auto">
          <SalaryCalculator />

          {/* Additional Info */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Did you know?</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Australian employers are required to pay a minimum of 11.5% superannuation on top of your base salary.
              This is increasing to 12% by July 2025.
            </p>
          </div>
        </div>
      )}

      {/* Salary Detail Modal */}
      {selectedSalary && (
        <SalaryDetailModal
          salary={selectedSalary}
          onClose={() => setSelectedSalary(null)}
        />
      )}
    </div>
  );
}

export default SalaryInsights;

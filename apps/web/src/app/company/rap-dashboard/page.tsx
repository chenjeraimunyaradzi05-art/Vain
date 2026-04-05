'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Award, 
  TrendingUp, 
  Users, 
  Clock, 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Target, 
  Briefcase, 
  GraduationCap, 
  Heart 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

// Types
interface RapData {
  level: 'REFLECT' | 'INNOVATE' | 'STRETCH' | 'ELEVATE';
  status: 'ACTIVE' | 'DRAFT' | 'EXPIRED';
  startDate: string;
  endDate: string;
  progress: number;
  commitments: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
}

interface EmploymentStats {
  totalEmployees: number;
  indigenousEmployees: number;
  targetPercentage: number;
  currentPercentage: number;
  retentionRate: number;
  hiringRate: number;
}

interface ProcurementStats {
  totalSpend: number;
  indigenousSpend: number;
  targetSpend: number;
  supplierCount: number;
}

interface CulturalLearningStats {
  totalStaff: number;
  completedTraining: number;
  completionRate: number;
}

interface RapDashboardData {
  rap: RapData;
  employment: EmploymentStats;
  procurement: ProcurementStats;
  culturalLearning: CulturalLearningStats;
  partnerships: number;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

export default function RapDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<RapDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!isAuthenticated) return;
      
      setLoading(true);
      try {
        // In a real app, these would be actual API calls
        // const { ok, data } = await api<RapDashboardData>('/company/rap/dashboard');
        
        // Mock data for now
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setData({
          rap: {
            level: 'INNOVATE',
            status: 'ACTIVE',
            startDate: '2024-01-01',
            endDate: '2026-01-01',
            progress: 45,
            commitments: {
              total: 20,
              completed: 9,
              inProgress: 8,
              notStarted: 3,
            },
          },
          employment: {
            totalEmployees: 1200,
            indigenousEmployees: 36,
            targetPercentage: 4.0,
            currentPercentage: 3.0,
            retentionRate: 92,
            hiringRate: 15,
          },
          procurement: {
            totalSpend: 5000000,
            indigenousSpend: 150000,
            targetSpend: 200000,
            supplierCount: 12,
          },
          culturalLearning: {
            totalStaff: 1200,
            completedTraining: 850,
            completionRate: 70.8,
          },
          partnerships: 5,
        });
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Failed to load RAP dashboard'));
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-amber-500" />
        <span className="text-slate-400">Loading RAP dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="text-red-200 bg-red-950/40 border border-red-900/60 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const commitmentData = [
    { name: 'Completed', value: data.rap.commitments.completed },
    { name: 'In Progress', value: data.rap.commitments.inProgress },
    { name: 'Not Started', value: data.rap.commitments.notStarted },
  ];

  const employmentData = [
    { name: 'Current', value: data.employment.currentPercentage },
    { name: 'Target', value: data.employment.targetPercentage },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">RAP Dashboard</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              data.rap.status === 'ACTIVE' ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-slate-800 text-slate-400'
            }`}>
              {data.rap.status}
            </span>
          </div>
          <p className="text-slate-400">
            Track and report on your Reconciliation Action Plan commitments
          </p>
        </div>
        
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700">
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
            Update Progress
          </button>
        </div>
      </div>

      {/* RAP Level Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-amber-950/40 to-slate-900/40 border border-amber-900/30 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Award className="w-32 h-32 text-amber-500" />
          </div>
          <h3 className="text-amber-400 font-medium mb-1">Current Level</h3>
          <div className="text-3xl font-bold text-white mb-2">{data.rap.level}</div>
          <div className="text-sm text-slate-400">
            {data.rap.startDate} - {data.rap.endDate}
          </div>
          <div className="mt-4 w-full bg-slate-800 rounded-full h-2">
            <div 
              className="bg-amber-500 h-2 rounded-full transition-all duration-1000" 
              style={{ width: `${data.rap.progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>Progress</span>
            <span>{data.rap.progress}%</span>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-slate-400 font-medium mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            Commitments
          </h3>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={commitmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {commitmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" /> Done
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" /> In Progress
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-slate-400 font-medium mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Indigenous Employment
          </h3>
          <div className="text-3xl font-bold text-white mb-1">
            {data.employment.currentPercentage}%
          </div>
          <div className="text-sm text-slate-500 mb-4">
            Target: {data.employment.targetPercentage}%
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Employees</span>
              <span className="text-white">{data.employment.indigenousEmployees}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Retention</span>
              <span className="text-emerald-400">{data.employment.retentionRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-slate-400 font-medium mb-2 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-purple-400" />
            Cultural Learning
          </h3>
          <div className="text-3xl font-bold text-white mb-1">
            {data.culturalLearning.completionRate}%
          </div>
          <div className="text-sm text-slate-500 mb-4">
            Staff Completed
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Staff</span>
              <span className="text-white">{data.culturalLearning.totalStaff}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Completed</span>
              <span className="text-white">{data.culturalLearning.completedTraining}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Procurement */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-400" />
              Indigenous Procurement
            </h3>
            <span className="text-sm text-slate-400">YTD</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Total Spend</div>
              <div className="text-xl font-bold text-white">
                ${(data.procurement.indigenousSpend / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Target: ${(data.procurement.targetSpend / 1000).toFixed(1)}k
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Suppliers</div>
              <div className="text-xl font-bold text-white">
                {data.procurement.supplierCount}
              </div>
              <div className="text-xs text-green-400 mt-1">
                +2 this quarter
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-4 mb-2">
            <div 
              className="bg-blue-500 h-4 rounded-full transition-all duration-1000" 
              style={{ width: `${(data.procurement.indigenousSpend / data.procurement.targetSpend) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Progress to Target</span>
            <span>{Math.round((data.procurement.indigenousSpend / data.procurement.targetSpend) * 100)}%</span>
          </div>
        </div>

        {/* Community Partnerships */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400" />
              Community Partnerships
            </h3>
            <button className="text-sm text-blue-400 hover:text-blue-300">View All</button>
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-slate-800/30 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">
                  🤝
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">Partnership {i}</div>
                  <div className="text-xs text-slate-400">Community Engagement • Active</div>
                </div>
                <div className="text-xs text-slate-500">
                  Since 2023
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-4 py-2 border border-dashed border-slate-700 text-slate-400 rounded-lg hover:bg-slate-800/50 hover:text-white transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Partnership
          </button>
        </div>
      </div>
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

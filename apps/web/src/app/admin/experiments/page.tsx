'use client';

/**
 * A/B Testing Experiments Dashboard
 * 
 * Manage experiments, view results, and control feature rollouts.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  ChevronLeft,
  Plus,
  Play,
  Pause,
  BarChart3,
  Users,
  Target,
  TrendingUp,
  RefreshCw,
  Settings,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/apiClient';
import { useUIStore } from '@/stores/uiStore';
import { useExperimentStore } from '@/stores/experimentStore';

interface Experiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  variants: { name: string; weight: number }[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  targetPercentage: number;
  startDate?: string;
  endDate?: string;
  metrics: {
    totalParticipants: number;
    conversions: Record<string, number>;
    conversionRate: Record<string, number>;
  };
  createdAt: string;
}

export default function ExperimentsPage() {
  const router = useRouter();
  const { showToast } = useUIStore();
  const { loadExperiments, createExperiment, updateExperiment } = useExperimentStore();
  
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed'>('all');

  // New experiment form
  const [newExperiment, setNewExperiment] = useState({
    name: '',
    description: '',
    hypothesis: '',
    variants: [
      { name: 'control', weight: 50 },
      { name: 'variant_a', weight: 50 },
    ],
    targetPercentage: 100,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);

      const { ok, data } = await api<{ experiments: Experiment[] }>(`/admin/experiments?${params.toString()}`);
      if (ok && data) {
        setExperiments(data.experiments || []);
      }
    } catch (err) {
      console.error('Failed to load experiments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    try {
      const { ok, data } = await api<{ experiment: Experiment }>('/admin/experiments', {
        method: 'POST',
        body: newExperiment,
      });

      if (ok && data) {
        showToast({
          type: 'success',
          title: 'Created',
          message: 'Experiment created successfully',
        });
        setShowCreateModal(false);
        setNewExperiment({
          name: '',
          description: '',
          hypothesis: '',
          variants: [
            { name: 'control', weight: 50 },
            { name: 'variant_a', weight: 50 },
          ],
          targetPercentage: 100,
        });
        loadData();
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create experiment',
      });
    }
  };

  const handleStatusChange = async (experimentId: string, newStatus: string) => {
    try {
      const { ok } = await api(`/admin/experiments/${experimentId}`, {
        method: 'PATCH',
        body: { status: newStatus },
      });

      if (ok) {
        showToast({
          type: 'success',
          title: 'Updated',
          message: `Experiment ${newStatus}`,
        });
        loadData();
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update experiment',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { bg: 'bg-slate-700', text: 'text-slate-300', icon: Clock },
      running: { bg: 'bg-green-900/50', text: 'text-green-400', icon: Play },
      paused: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', icon: Pause },
      completed: { bg: 'bg-blue-900/50', text: 'text-blue-400', icon: CheckCircle },
    }[status] || { bg: 'bg-slate-700', text: 'text-slate-300', icon: Clock };

    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const calculateWinner = (experiment: Experiment) => {
    if (!experiment.metrics?.conversionRate) return null;
    
    const rates = Object.entries(experiment.metrics.conversionRate);
    if (rates.length < 2) return null;

    const sorted = rates.sort((a, b) => b[1] - a[1]);
    const [winner, winnerRate] = sorted[0];
    const [control, controlRate] = sorted.find(([name]) => name === 'control') || sorted[1];

    const improvement = controlRate > 0 ? ((winnerRate - controlRate) / controlRate) * 100 : 0;

    return {
      variant: winner,
      improvement: improvement.toFixed(1),
      isSignificant: improvement > 5, // Simplified significance check
    };
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-6 h-6 text-purple-400" />
                A/B Experiments
              </h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Experiment
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Experiments</p>
                <p className="text-2xl font-bold text-white">
                  {experiments.filter((e) => e.status === 'running').length}
                </p>
              </div>
              <Play className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Participants</p>
                <p className="text-2xl font-bold text-white">
                  {experiments.reduce((sum, e) => sum + (e.metrics?.totalParticipants || 0), 0).toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Completed</p>
                <p className="text-2xl font-bold text-white">
                  {experiments.filter((e) => e.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          {(['all', 'running', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button
            onClick={loadData}
            className="ml-auto p-2 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Experiments List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-2" />
              <p className="text-slate-400">Loading experiments...</p>
            </div>
          ) : experiments.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
              <Zap className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 mb-4">No experiments yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Create First Experiment
              </button>
            </div>
          ) : (
            experiments.map((experiment) => {
              const winner = calculateWinner(experiment);
              
              return (
                <div
                  key={experiment.id}
                  className="bg-slate-800 rounded-xl border border-slate-700 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-white">{experiment.name}</h3>
                        {getStatusBadge(experiment.status)}
                      </div>
                      <p className="text-sm text-slate-400">{experiment.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {experiment.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(experiment.id, 'running')}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-1"
                        >
                          <Play className="w-4 h-4" />
                          Start
                        </button>
                      )}
                      {experiment.status === 'running' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(experiment.id, 'paused')}
                            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm flex items-center gap-1"
                          >
                            <Pause className="w-4 h-4" />
                            Pause
                          </button>
                          <button
                            onClick={() => handleStatusChange(experiment.id, 'completed')}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Complete
                          </button>
                        </>
                      )}
                      {experiment.status === 'paused' && (
                        <button
                          onClick={() => handleStatusChange(experiment.id, 'running')}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-1"
                        >
                          <Play className="w-4 h-4" />
                          Resume
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedExperiment(experiment)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Participants</p>
                      <p className="text-lg font-semibold text-white">
                        {(experiment.metrics?.totalParticipants || 0).toLocaleString()}
                      </p>
                    </div>
                    {experiment.variants.map((variant) => (
                      <div key={variant.name} className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">{variant.name}</p>
                        <p className="text-lg font-semibold text-white">
                          {((experiment.metrics?.conversionRate?.[variant.name] || 0) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500">
                          {experiment.metrics?.conversions?.[variant.name] || 0} conversions
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Winner Banner */}
                  {winner && experiment.status === 'completed' && (
                    <div className={`p-3 rounded-lg flex items-center gap-3 ${
                      winner.isSignificant ? 'bg-green-900/30 border border-green-700' : 'bg-slate-700/50'
                    }`}>
                      <TrendingUp className={`w-5 h-5 ${winner.isSignificant ? 'text-green-400' : 'text-slate-400'}`} />
                      <span className={winner.isSignificant ? 'text-green-200' : 'text-slate-300'}>
                        <strong>{winner.variant}</strong> outperformed by{' '}
                        <strong>{winner.improvement}%</strong>
                        {!winner.isSignificant && ' (not statistically significant)'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Create Experiment</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newExperiment.name}
                  onChange={(e) => setNewExperiment({ ...newExperiment, name: e.target.value })}
                  placeholder="e.g., new_signup_flow"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={newExperiment.description}
                  onChange={(e) => setNewExperiment({ ...newExperiment, description: e.target.value })}
                  placeholder="What are you testing?"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Hypothesis</label>
                <textarea
                  value={newExperiment.hypothesis}
                  onChange={(e) => setNewExperiment({ ...newExperiment, hypothesis: e.target.value })}
                  placeholder="We believe that..."
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Traffic Allocation: {newExperiment.targetPercentage}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={newExperiment.targetPercentage}
                  onChange={(e) => setNewExperiment({ ...newExperiment, targetPercentage: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Variants</label>
                {newExperiment.variants.map((variant, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => {
                        const newVariants = [...newExperiment.variants];
                        newVariants[index].name = e.target.value;
                        setNewExperiment({ ...newExperiment, variants: newVariants });
                      }}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    />
                    <input
                      type="number"
                      value={variant.weight}
                      onChange={(e) => {
                        const newVariants = [...newExperiment.variants];
                        newVariants[index].weight = Number(e.target.value);
                        setNewExperiment({ ...newExperiment, variants: newVariants });
                      }}
                      className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    />
                    <span className="text-slate-400 text-sm">%</span>
                  </div>
                ))}
                <button
                  onClick={() => setNewExperiment({
                    ...newExperiment,
                    variants: [...newExperiment.variants, { name: `variant_${String.fromCharCode(97 + newExperiment.variants.length)}`, weight: 0 }],
                  })}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  + Add Variant
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Create Experiment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

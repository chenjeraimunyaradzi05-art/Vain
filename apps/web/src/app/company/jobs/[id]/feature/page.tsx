'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, Zap, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';

const FEATURE_PACKAGES = [
  {
    id: '7day',
    name: '7 Day Boost',
    days: 7,
    price: 49,
    description: 'Quick visibility boost for urgent hiring',
    icon: Zap,
    popular: false,
    color: 'blue',
  },
  {
    id: '14day',
    name: '14 Day Feature',
    days: 14,
    price: 79,
    description: 'Extended reach for competitive roles',
    icon: TrendingUp,
    popular: true,
    color: 'purple',
  },
  {
    id: '30day',
    name: '30 Day Premium',
    days: 30,
    price: 129,
    description: 'Maximum exposure for hard-to-fill positions',
    icon: Star,
    popular: false,
    color: 'amber',
  },
];

interface Job {
  id: string;
  title: string;
  isFeatured: boolean;
  featuredUntil?: string;
}

export default function FeatureJobPage() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('14day');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ job: Job }>(`/company/jobs/${id}`);
      if (res.ok && res.data) {
        setJob(res.data.job);
      } else {
        setError('Job not found');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load job'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated && id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, id]);

  async function handlePurchase() {
    if (!selectedPackage) return;
    
    const pkg = FEATURE_PACKAGES.find((p) => p.id === selectedPackage);
    if (!pkg) return;

    setPurchasing(true);
    setError(null);

    try {
      // Assuming this endpoint exists and handles the purchase logic
      const res = await api('/featured/jobs', {
        method: 'POST',
        body: {
          jobId: id,
          packageId: pkg.id,
        },
      });

      if (res.ok) {
        router.push(`/company/jobs/${id}?featured=true`);
      } else {
        setError(res.error || 'Purchase failed');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Purchase failed'));
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-blue-500" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-red-400">Job not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Link href={`/company/jobs/${id}`} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Job Dashboard
      </Link>

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-4">Promote "{job.title}"</h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Get up to 3x more applicants by featuring your job. Featured jobs appear at the top of search results and are highlighted to candidates.
        </p>
      </div>

      {job.isFeatured && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-8 flex items-center gap-3 text-emerald-400">
          <CheckCircle className="w-5 h-5" />
          <div>
            <span className="font-semibold">This job is currently featured!</span>
            {job.featuredUntil && (
              <span className="ml-1 text-emerald-400/80">
                (Until {new Date(job.featuredUntil).toLocaleDateString()})
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {FEATURE_PACKAGES.map((pkg) => {
          const Icon = pkg.icon;
          const isSelected = selectedPackage === pkg.id;
          
          return (
            <div 
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`relative cursor-pointer rounded-xl border-2 transition-all p-6 ${
                isSelected 
                  ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-500/10' 
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}
              
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1">{pkg.name}</h3>
              <div className="text-2xl font-bold text-white mb-2">${pkg.price}</div>
              <p className="text-sm text-slate-400 mb-4">{pkg.description}</p>
              
              <div className={`w-full py-2 rounded-lg text-center text-sm font-medium transition-colors ${
                isSelected 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {isSelected ? 'Selected' : 'Select Plan'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center">
        <button
          onClick={handlePurchase}
          disabled={purchasing || !selectedPackage}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold px-12 py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
        >
          {purchasing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Promote Job Now
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </>
          )}
        </button>
      </div>
      
      <p className="text-center text-slate-500 text-sm mt-6">
        Secure payment via Stripe. You can cancel anytime.
      </p>
    </div>
  );
}

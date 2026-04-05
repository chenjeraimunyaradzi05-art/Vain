"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

/* Feminine theme accents */
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

export default function RentalSeekersPage() {
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState({
    preferredStates: '',
    maxBudget: '',
    bedroomsMin: '',
    limit: '20',
  });
  const [seekers, setSeekers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.preferredStates) params.set('preferredStates', filters.preferredStates);
    if (filters.maxBudget) params.set('maxBudget', filters.maxBudget);
    if (filters.bedroomsMin) params.set('bedroomsMin', filters.bedroomsMin);
    if (filters.limit) params.set('limit', filters.limit);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadSeekers() {
      setLoading(true);
      setError(null);
      try {
        const { ok, data } = await api(`/rentals/seekers?${queryParams}`);
        if (!ok) throw new Error(data?.error || 'Failed to load seekers');
        setSeekers(data?.seekers || []);
      } catch (err) {
        setError(err?.message || 'Failed to load seekers');
      } finally {
        setLoading(false);
      }
    }

    loadSeekers();
  }, [isAuthenticated, queryParams]);

  return (
    <div className="min-h-screen">
      {/* === HERO SECTION === */}
      <section className="relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-pink-50/40 to-purple-50/40 dark:from-slate-900 dark:to-slate-800">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />

        <div className="relative max-w-6xl mx-auto">
          <div className="mb-4">
            <Link href="/rentals" className="inline-flex items-center gap-2 text-sm font-medium text-pink-600 hover:text-pink-700 transition">
              ← Back to rentals
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-600 mb-2">Property Owners</p>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">Seeker Matches</h1>
              <p className="text-lg text-slate-600 mt-2">Find renter profiles that match your listings.</p>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">{seekers.length}</div>
                <div className="text-xs font-medium uppercase tracking-[0.15em] text-pink-600">Profiles</div>
              </div>
              <Link
                href="/rentals/profile"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold shadow-lg transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)', boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)' }}
              >
                Update seeker profile
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 border border-red-300 bg-red-50 text-red-800 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Filter panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-8 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">Refine results</p>
            <h2 className="text-xl font-bold text-slate-900">Filter Seekers</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Preferred States</label>
              <input
                value={filters.preferredStates}
                onChange={(e) => setFilters((prev) => ({ ...prev, preferredStates: e.target.value }))}
                placeholder="NSW, QLD"
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Max Budget</label>
              <input
                value={filters.maxBudget}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxBudget: e.target.value }))}
                placeholder="Weekly rent"
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Min Bedrooms</label>
              <input
                value={filters.bedroomsMin}
                onChange={(e) => setFilters((prev) => ({ ...prev, bedroomsMin: e.target.value }))}
                placeholder="Any"
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Limit</label>
              <input
                value={filters.limit}
                onChange={(e) => setFilters((prev) => ({ ...prev, limit: e.target.value }))}
                placeholder="20"
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
              />
            </div>
          </div>
        </div>

        {/* Content area */}
        {!isAuthenticated ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
            <p className="text-slate-500">Sign in to view seeker profiles.</p>
          </div>
        ) : loading ? (
          <div className="text-slate-500 py-8 text-center">Loading seekers...</div>
        ) : seekers.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
            <p className="text-slate-500">No seekers match these filters.</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
          {seekers.map((seeker) => (
            <div key={seeker.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-1">Seeker</p>
                  <div className="text-xl font-bold text-slate-900">
                    {seeker.user?.name || 'Anonymous seeker'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Updated {new Date(seeker.updatedAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background: 'rgba(233, 30, 140, 0.1)', color: accentPink }}>
                  ${seeker.budgetMin ?? 0} - ${seeker.budgetMax ?? '∞'}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.1em] text-purple-600 mb-1">States</div>
                  <div className="text-slate-700">{(seeker.preferredStates || []).join(', ') || 'Any'}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.1em] text-purple-600 mb-1">Suburbs</div>
                  <div className="text-slate-700">{(seeker.preferredSuburbs || []).join(', ') || 'Any'}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.1em] text-purple-600 mb-1">Property Types</div>
                  <div className="text-slate-700">{(seeker.propertyTypes || []).join(', ') || 'Any'}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.1em] text-purple-600 mb-1">Min Beds / Baths</div>
                  <div className="text-slate-700">{seeker.bedroomsMin ?? 'Any'} / {seeker.bathroomsMin ?? 'Any'}</div>
                </div>
              </div>

              {seeker.notes && (
                <div className="mt-4 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <p className="text-sm text-slate-600 italic">"{seeker.notes}"</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button className="text-sm font-semibold text-pink-600 hover:text-pink-700 transition">
                  View full profile →
                </button>
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold text-sm transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)' }}
                >
                  Contact seeker
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA Section */}
      <section className="mt-12 rounded-3xl p-8 text-center" style={{
        background: 'linear-gradient(135deg, rgba(233, 30, 140, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
        border: '1px solid rgba(233, 30, 140, 0.2)',
      }}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600 mb-2">Have a property?</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">List Your Property Today</h2>
        <p className="text-slate-600 mb-6">Reach qualified seekers looking for their next home.</p>
        <Link
          href="/rentals"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-white font-semibold shadow-lg transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)', boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)' }}
        >
          Create a listing
        </Link>
      </section>
    </div>
  </div>
);
}

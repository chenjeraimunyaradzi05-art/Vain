"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

/* Feminine theme accents */
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

export default function RentalsOwnerDashboard() {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState('ALL');
  const [listings, setListings] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  const [error, setError] = useState(null);

  const activeCount = listings.filter((listing) => listing.status === 'ACTIVE').length;
  const draftCount = listings.filter((listing) => listing.status === 'DRAFT').length;
  const inquiryNewCount = inquiries.filter((inquiry) => inquiry.status === 'NEW').length;

  const statusParam = useMemo(() => (status === 'ALL' ? '' : `status=${status}`), [status]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadListings() {
      setLoadingListings(true);
      setError(null);
      try {
        const { ok, data } = await api(`/rentals/owner${statusParam ? `?${statusParam}` : ''}`);
        if (!ok) throw new Error(data?.error || 'Failed to load listings');
        setListings(data?.listings || []);
      } catch (err) {
        setError(err?.message || 'Failed to load listings');
      } finally {
        setLoadingListings(false);
      }
    }

    async function loadInquiries() {
      setLoadingInquiries(true);
      setError(null);
      try {
        const { ok, data } = await api('/rentals/inquiries/owner');
        if (!ok) throw new Error(data?.error || 'Failed to load inquiries');
        setInquiries(data?.inquiries || []);
      } catch (err) {
        setError(err?.message || 'Failed to load inquiries');
      } finally {
        setLoadingInquiries(false);
      }
    }

    loadListings();
    loadInquiries();
  }, [isAuthenticated, statusParam]);

  async function handlePublish(listingId) {
    setError(null);
    try {
      const { ok, data } = await api(`/rentals/${listingId}/publish`, { method: 'PATCH' });
      if (!ok) throw new Error(data?.error || 'Failed to publish listing');
      setListings((prev) => prev.map((listing) => (listing.id === listingId ? data.listing : listing)));
    } catch (err) {
      setError(err?.message || 'Failed to publish listing');
    }
  }

  async function handleUpdateInquiry(inquiryId, nextStatus) {
    setError(null);
    try {
      const { ok, data } = await api(`/rentals/inquiries/${inquiryId}`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      if (!ok) throw new Error(data?.error || 'Failed to update inquiry');
      setInquiries((prev) => prev.map((inq) => (inq.id === inquiryId ? data.inquiry : inq)));
    } catch (err) {
      setError(err?.message || 'Failed to update inquiry');
    }
  }

  return (
    <div className="min-h-screen">
      {/* === HERO SECTION === */}
      <section className="relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-pink-50/40 to-purple-50/40 dark:from-slate-900 dark:to-slate-800">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />

        <div className="relative max-w-6xl mx-auto">
          <div className="mb-4">
            <Link href="/rentals" className="inline-flex items-center gap-2 text-sm font-medium text-pink-600 hover:text-pink-700 transition">
              ← Back to listings
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-600 mb-2">Property management</p>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">Owner Dashboard</h1>
              <p className="text-lg text-slate-600 mt-2">Manage your listings and respond to inquiries.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/rentals"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold shadow-lg transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)', boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)' }}
              >
                Create listing
              </Link>
              <Link
                href="/rentals/seekers"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border-2 transition-all hover:bg-pink-50"
                style={{ borderColor: accentPink, color: accentPink }}
              >
                Browse seekers
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

        {!isAuthenticated ? (
          <div className="text-sm text-slate-500 py-8 text-center">Sign in to view owner tools.</div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all hover:shadow-xl" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Active listings</p>
                <div className="text-4xl font-bold text-slate-900 mt-2">{activeCount}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all hover:shadow-xl" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">Draft listings</p>
                <div className="text-4xl font-bold text-slate-900 mt-2">{draftCount}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all hover:shadow-xl" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">New inquiries</p>
                <div className="text-4xl font-bold text-slate-900 mt-2">{inquiryNewCount}</div>
              </div>
            </div>

            {/* Listings panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-8 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600 mb-1">Your properties</p>
                  <h2 className="text-xl font-bold text-slate-900">Your Listings</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Filter</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                  >
                    <option value="ALL">All</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                  </select>
                </div>
              </div>

              {loadingListings ? (
                <div className="text-slate-500 py-8 text-center">Loading listings...</div>
              ) : listings.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <p className="text-slate-500">No listings found.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {listings.map((listing) => (
                    <div key={listing.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-slate-900">{listing.title}</div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                          background: listing.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : listing.status === 'DRAFT' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(249, 115, 22, 0.12)',
                          color: listing.status === 'ACTIVE' ? '#059669' : listing.status === 'DRAFT' ? '#475569' : '#EA580C',
                        }}>
                          {listing.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500">
                        {[listing.suburb, listing.state, listing.postcode].filter(Boolean).join(', ') || 'Location not set'}
                      </div>
                      <div className="text-sm text-slate-700 mt-2 font-medium">
                        Rent: {listing.weeklyRent ? `$${listing.weeklyRent} / week` : 'N/A'}
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        {listing.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePublish(listing.id)}
                            className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition"
                          >
                            Publish listing →
                          </button>
                        )}
                        <Link href={`/rentals/${listing.id}`} className="text-sm text-pink-600 hover:text-pink-700 font-medium">
                          View listing
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inquiries panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 mb-1">Manage responses</p>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Latest Inquiries</h2>
              {loadingInquiries ? (
                <div className="text-slate-500 py-8 text-center">Loading inquiries...</div>
              ) : inquiries.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <p className="text-slate-500">No inquiries yet.</p>
                  <p className="text-sm text-slate-400 mt-1">When seekers reach out, their messages will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {inquiries.map((inquiry) => (
                    <div key={inquiry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all hover:shadow-md">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-slate-500">{inquiry.rentalListing?.title || 'Listing'}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                          background: inquiry.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.12)' : inquiry.status === 'DECLINED' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(148, 163, 184, 0.2)',
                          color: inquiry.status === 'APPROVED' ? '#059669' : inquiry.status === 'DECLINED' ? '#DC2626' : '#475569',
                        }}>
                          {inquiry.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mb-3">{inquiry.message || 'No message provided.'}</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleUpdateInquiry(inquiry.id, 'APPROVED')}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateInquiry(inquiry.id, 'DECLINED')}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 transition"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

/* Feminine theme accents */
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

export default function RentalDetailPage() {
  const params = useParams();
  const listingId = params?.id;
  const { isAuthenticated } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    async function loadListing() {
      setLoading(true);
      setError(null);
      try {
        const { ok, data } = await api(`/rentals/${listingId}`);
        if (!ok) throw new Error(data?.error || 'Failed to load listing');
        setListing(data?.listing || null);
      } catch (err) {
        setError(err?.message || 'Failed to load listing');
      } finally {
        setLoading(false);
      }
    }
    loadListing();
  }, [listingId]);

  async function handleInquiry() {
    if (!isAuthenticated || !listingId) return;
    setSending(true);
    setError(null);
    try {
      const { ok, data } = await api('/rentals/inquiries', {
        method: 'POST',
        body: { rentalListingId: listingId, message: message || undefined },
      });
      if (!ok) throw new Error(data?.error || 'Failed to send inquiry');
      setMessage('');
    } catch (err) {
      setError(err?.message || 'Failed to send inquiry');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* === HERO SECTION (housing-detail pattern) === */}
      <section className="relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-pink-50/40 to-purple-50/40 dark:from-slate-900 dark:to-slate-800">
        {/* Decorative halos */}
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />

        <div className="relative max-w-6xl mx-auto">
          <div className="mb-6">
            <Link href="/rentals" className="inline-flex items-center gap-2 text-sm font-medium text-pink-600 hover:text-pink-700 transition">
              ← Back to listings
            </Link>
          </div>

          {error && (
            <div className="mb-6 border border-red-300 bg-red-50 text-red-800 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading listing...</div>
          ) : !listing ? (
            <div className="text-center py-12 text-slate-500">Listing not found.</div>
          ) : (
            <div className="grid lg:grid-cols-[1.4fr_0.8fr] gap-8 items-start">
              {/* Left content */}
              <div className="space-y-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-600">
                  {listing.status === 'ACTIVE' ? 'Rent' : listing.status} listing
                </p>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                  {listing.title}
                </h1>
                <p className="text-lg text-slate-600">
                  {[listing.suburb, listing.state, listing.postcode].filter(Boolean).join(', ') || 'Location not set'}
                </p>

                {/* Price guide */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-slate-500">Price guide</span>
                  <strong className="text-3xl font-bold text-slate-900">
                    {listing.weeklyRent ? `$${listing.weeklyRent} / week` : 'Price on application'}
                  </strong>
                  <small className="text-sm text-slate-500">Repayments approx ${listing.weeklyRent ? Math.round(listing.weeklyRent * 4.3) : '—'}/mo</small>
                </div>

                {/* Stats row (hub-section__signals) */}
                <div className="flex flex-wrap gap-6 py-4">
                  <div className="text-center">
                    <span className="block text-3xl font-bold text-slate-900">{listing.bedrooms ?? '—'}</span>
                    <span className="text-sm text-slate-500">Bedrooms</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-3xl font-bold text-slate-900">{listing.bathrooms ?? '—'}</span>
                    <span className="text-sm text-slate-500">Bathrooms</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-3xl font-bold text-slate-900">{listing.parking ?? '—'}</span>
                    <span className="text-sm text-slate-500">Car</span>
                  </div>
                </div>

                {/* CTA Row */}
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/rentals/mortgage"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold shadow-lg transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)', boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)' }}
                  >
                    Mortgage tools
                  </Link>
                  <Link
                    href="/rentals"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border-2 transition-all hover:bg-pink-50"
                    style={{ borderColor: accentPink, color: accentPink }}
                  >
                    Back to listings
                  </Link>
                </div>
              </div>

              {/* Right media card (housing-detail__media) */}
              <figure className="relative rounded-3xl overflow-hidden shadow-xl" style={{ boxShadow: '0 35px 75px rgba(15, 23, 42, 0.15)' }}>
                <div className="h-64 bg-gradient-to-br from-pink-100 to-purple-100" />
                <figcaption className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900/80 to-transparent text-white">
                  {[listing.suburb, listing.state].filter(Boolean).join(', ')}
                </figcaption>
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)' }}>
                  {listing.status === 'ACTIVE' ? 'Rent' : listing.status}
                </span>
                <span className="absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-slate-700 border border-slate-200">
                  Community listing
                </span>
              </figure>
            </div>
          )}
        </div>
      </section>

      {listing && (
        <>
          {/* === DETAIL PANELS (housing-detail-panels pattern) === */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Key features */}
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600 mb-3">Key features</p>
                <ul className="space-y-2 text-slate-700">
                  <li>{listing.bedrooms ?? '—'} bedrooms</li>
                  <li>{listing.bathrooms ?? '—'} bathrooms</li>
                  <li>{listing.parking ?? '—'} car spaces</li>
                  <li>Bond: {listing.bond ? `$${listing.bond}` : 'TBA'}</li>
                </ul>
              </article>

              {/* Open homes / Availability */}
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 mb-3">Availability</p>
                <ul className="space-y-2 text-slate-700">
                  <li>Available from: {listing.availableFrom ? new Date(listing.availableFrom).toLocaleDateString() : 'TBA'}</li>
                  <li>No upcoming inspections listed. Contact to arrange a viewing.</li>
                </ul>
              </article>

              {/* Support shortcuts */}
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 mb-3">Support shortcuts</p>
                <ul className="space-y-2">
                  <li><Link href="/rentals/mortgage" className="text-pink-600 hover:text-pink-700 font-medium">Mortgage calculator</Link></li>
                  <li><Link href="/grants" className="text-pink-600 hover:text-pink-700 font-medium">Housing grants</Link></li>
                  <li><Link href="/financial/budgets" className="text-pink-600 hover:text-pink-700 font-medium">Budget planner</Link></li>
                </ul>
              </article>
            </div>
          </section>

          {/* === DESCRIPTION SECTION === */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600 mb-2">About the property</p>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Why this listing matters now</h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                <p className="text-slate-700 whitespace-pre-line">
                  {listing.description || 'No description provided for this property.'}
                </p>
              </div>
            </div>
          </section>

          {/* === AGENT / OWNER SECTION === */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid lg:grid-cols-[1fr_1.5fr] gap-8 items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 mb-2">Agent team</p>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Guardians and allies on this listing</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <article className="flex gap-4 items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">{listing.owner?.name || 'Property Owner'}</p>
                    <p className="text-sm text-slate-500">{listing.owner?.email || 'Contact via inquiry'}</p>
                    <Link href="#inquiry" className="text-sm text-pink-600 hover:text-pink-700 font-medium">Send message</Link>
                  </div>
                </article>
              </div>
            </div>
          </section>

          {/* === INQUIRY SECTION === */}
          <section id="inquiry" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600 mb-2">Get in touch</p>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Send Inquiry</h2>
              <p className="text-slate-600 mb-4">
                {listing.owner?.name ? `Contact ${listing.owner.name}` : 'Connect with the owner to arrange a viewing or ask questions.'}
              </p>
              {!isAuthenticated ? (
                <p className="text-slate-500 py-4">Sign in to contact the property owner.</p>
              ) : listing.status !== 'ACTIVE' ? (
                <p className="text-slate-500 py-4">This listing is not accepting inquiries right now.</p>
              ) : (
                <div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Introduce yourself and share your preferred inspection times..."
                    className="w-full rounded-lg border-2 border-slate-200 px-4 py-3 text-sm min-h-[120px] focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"
                  />
                  <button
                    onClick={handleInquiry}
                    disabled={sending}
                    className="mt-4 px-6 py-3 rounded-lg text-white font-semibold shadow-lg transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)', boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)' }}
                  >
                    {sending ? 'Sending...' : 'Send inquiry'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* === AFFORDABILITY CTA SECTION === */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">Need help assessing affordability?</p>
              <h2 className="text-3xl font-bold text-slate-900">Athena affordability coach keeps deposits, grants and repayments synced</h2>
              <p className="text-lg text-slate-600 max-w-3xl">
                Use mortgage copilots, grant directories and budget planners to build a transparent path to this address or the next one that fits.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/rentals/mortgage"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold shadow-lg transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)', boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)' }}
                >
                  Launch mortgage tools
                </Link>
                <Link
                  href="/grants"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border-2 transition-all hover:bg-pink-50"
                  style={{ borderColor: accentPink, color: accentPink }}
                >
                  View housing grants
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Handshake, Users, Sparkles, Megaphone } from 'lucide-react';
import { API_BASE } from '@/lib/apiBase';

function PartnerLogo({ name, logoUrl, size = 'sm' }) {
  const sizeClasses = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';

  if (logoUrl) {
    return (
      <div className={`flex items-center justify-center ${sizeClasses} rounded-lg bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700`}
        title={name}
      >
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="max-h-6 max-w-6 object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return (
    <div className={`flex items-center justify-center ${sizeClasses} rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200`}>
      {initials}
    </div>
  );
}

export default function PartnershipModule() {
  // Force update
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadPartners() {
      try {
        const res = await fetch(`${API_BASE}/featured/partners`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load partners');
        const data = await res.json();
        if (active) setPartners(data.partners || []);
      } catch (error) {
        if (active) setPartners([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadPartners();
    return () => {
      active = false;
    };
  }, []);

  const { featuredPartners, communityPartners } = useMemo(() => {
    const featured = partners.filter((partner) => ['platinum', 'gold'].includes(String(partner.tier).toLowerCase()));
    const community = partners.filter((partner) => !['platinum', 'gold'].includes(String(partner.tier).toLowerCase()));
    return {
      featuredPartners: featured.slice(0, 3),
      communityPartners: community.slice(0, 6),
    };
  }, [partners]);

  return (
    <section 
      className="py-12 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/70 dark:border-slate-800"
      suppressHydrationWarning
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Handshake className="w-5 h-5" />
              Partnerships & Advertising
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Built for community-led pathways. Showcase partner programs and local opportunities.
            </p>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/partners/apply" 
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 55%, #6366f1 100%)' }}
              suppressHydrationWarning
            >
              Partner with us
            </Link>
            <Link 
              href="/jobs" 
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 55%, #6366f1 100%)' }}
              suppressHydrationWarning
            >
              View opportunities
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="text-xs font-semibold flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
              Community Partners
            </div>
            {loading ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Loading partners…</div>
            ) : communityPartners.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No partners listed yet.</div>
            ) : (
              <div className="space-y-3">
                {communityPartners.map((partner) => (
                  <Link
                    key={partner.id}
                    href={partner.website || `/partners/${partner.slug}`}
                    className="flex items-center justify-between rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 p-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <PartnerLogo name={partner.name} logoUrl={partner.logoUrl} />
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{partner.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{partner.tier || 'standard'} partner</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                      {partner.featuredJobs || 0} opportunities
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="text-xs font-semibold flex items-center gap-2 mb-4 text-purple-600 dark:text-purple-300">
              <Sparkles className="w-4 h-4" />
              Sponsored Pathways
            </div>
            {loading ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Loading sponsors…</div>
            ) : featuredPartners.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No sponsored pathways available yet.</div>
            ) : (
              <div className="space-y-4">
                {featuredPartners.map((partner) => (
                  <div key={partner.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3 mb-2">
                      <PartnerLogo name={partner.name} logoUrl={partner.logoUrl} size="md" />
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200 uppercase">Featured</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{partner.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {partner.description || 'Priority pathways and programs curated with community input.'}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-300">
                        {partner.featuredJobs || 0} live opportunities
                      </span>
                      <Link
                        href={`/partners/${partner.slug}`}
                        className="text-[10px] text-purple-700 dark:text-purple-200 font-medium"
                      >
                        View pathway →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="text-xs font-semibold flex items-center gap-2 mb-4 text-sky-600 dark:text-sky-300">
              <Megaphone className="w-4 h-4" />
              Partner Advertising
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4 bg-slate-50 dark:bg-slate-800/40 text-center">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Reach community-first audiences</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Promote verified programs, jobs, scholarships, and events with full cultural review.
              </p>
              <Link
                href="/advertise"
                className="inline-flex mt-4 px-3 py-1.5 text-xs font-semibold rounded-md text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 55%, #6366f1 100%)' }}
                suppressHydrationWarning
              >
                Advertise with us →
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-center text-slate-500 dark:text-slate-400">
          ✦ All partners are verified and aligned with community values. ✦
        </p>
      </div>
    </section>
  );
}

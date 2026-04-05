'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { ChevronRight, Sparkles } from 'lucide-react';

type PartnershipAd = {
  id: string;
  sponsor: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
};

const partnershipAds: PartnershipAd[] = [
  {
    id: 'google-certificates',
    sponsor: 'Google',
    title: 'Google Career Certificates',
    description:
      'Launch a career in data analytics, UX design, cybersecurity, and more with industry-recognized certificates.',
    cta: 'Explore certificates',
    href: 'https://grow.google/certificates/',
    imageUrl: '/partners/google.svg',
    imageAlt: 'Google logo',
  },
  {
    id: 'westpac',
    sponsor: 'Westpac',
    title: 'Westpac Indigenous Scholarships',
    description: 'Support for study, leadership, and pathways into financial services careers.',
    cta: 'View scholarships',
    href: 'https://www.westpac.com.au/about-westpac/sustainability/working-in-the-community/indigenous-engagement/',
    imageUrl: '/partners/westpac.svg',
    imageAlt: 'Westpac logo',
  },
  {
    id: 'medibank',
    sponsor: 'Medibank',
    title: 'Medibank Wellbeing Partnerships',
    description: 'Health cover options and wellbeing programs tailored for community support.',
    cta: 'Learn more',
    href: 'https://www.medibank.com.au/',
    imageUrl: '/partners/medibank.svg',
    imageAlt: 'Medibank logo',
  },
  {
    id: 'youi',
    sponsor: 'Youi',
    title: 'Youi Insurance Partnerships',
    description: 'Flexible insurance options for home, car, and business—built around your needs.',
    cta: 'Get a quote',
    href: 'https://www.youi.com.au/',
    imageUrl: '/partners/youi.svg',
    imageAlt: 'Youi Insurance logo',
  },
];

export default function FeaturedJobs() {
  const ads = useMemo(() => partnershipAds, []);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % ads.length);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [ads.length]);

  const activeAd = ads[activeIndex];

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/80 shadow-sm p-5 sm:p-6 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Partnerships & Advertising
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-6">
          <div className="flex items-center justify-center min-h-[120px]">
            <OptimizedImage
              src={activeAd.imageUrl}
              alt={activeAd.imageAlt}
              width={200}
              height={56}
              className="h-10 sm:h-12 md:h-14 w-auto object-contain"
            />
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{activeAd.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{activeAd.description}</p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Sponsored by {activeAd.sponsor}
            </span>
            <Link
              href={activeAd.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              {activeAd.cta}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {ads.map((ad, index) => (
            <button
              key={ad.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2 w-2 rounded-full transition-all ${
                index === activeIndex
                  ? 'bg-purple-600 dark:bg-purple-400 w-5'
                  : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

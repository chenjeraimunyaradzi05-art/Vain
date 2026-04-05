import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Briefcase, Heart, Landmark, Sparkles, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Career Pathways',
  description:
    'Explore career, mentorship, leadership, and business pathways designed to support everyone on their journey to success.',
  alternates: {
    canonical: '/women-pathways',
  },
};

const pathwayCards = [
  {
    title: 'Job Discovery',
    description:
      'Discover roles with flexible work, career return pathways, and inclusive teams for everyone.',
    href: '/jobs',
    icon: Briefcase,
    cta: 'Browse jobs',
  },
  {
    title: 'Mentorship & Leadership Circles',
    description:
      'Connect with mentors and peer circles to build confidence, leadership capability, and strong networks.',
    href: '/mentorship',
    icon: Heart,
    cta: 'Find a mentor',
  },
  {
    title: 'Business Tools',
    description:
      'Access founder tools, planning support, and visibility pathways for entrepreneurs and business owners.',
    href: '/business-suite',
    icon: Landmark,
    cta: 'Open business tools',
  },
  {
    title: 'Community Events',
    description:
      'Join workshops, networking sessions, and community events focused on professional growth and development.',
    href: '/events',
    icon: Users,
    cta: 'View events',
  },
];

export default function WomenPathwaysPage() {
  return (
    <div className="ngurra-page py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <Sparkles className="w-4 h-4" />
            Career Pathways
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
            Pathways for Everyone
          </h1>
          <p className="mt-4 max-w-3xl text-slate-600 dark:text-slate-300 leading-relaxed">
            This hub brings together career opportunities, mentorship, business support, and community
            connections to help everyone thrive across every stage of work and leadership.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {pathwayCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
            >
              <div className="mb-4 inline-flex rounded-xl bg-purple-50 dark:bg-purple-900/30 p-3">
                <card.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{card.description}</p>
              <Link
                href={card.href}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-200"
              >
                {card.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

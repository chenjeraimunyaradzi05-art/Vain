'use client';

/**
 * Career Progress Page
 * Track career milestones, achievements, and goals
 */

import { Suspense } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Loader2,
  Target,
  TrendingUp,
  Star,
  Video,
  Briefcase,
  DollarSign,
  Route,
  ArrowRight,
  Compass,
} from 'lucide-react';
import CareerMilestones from '@/components/CareerMilestones';

export default function CareerPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4" suppressHydrationWarning>
      <div className="max-w-6xl mx-auto">
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <li>
              <Link href="/" className="hover:text-purple-600 transition-colors">
                Home
              </Link>
            </li>
            <li>
              <span className="text-slate-400">/</span>
            </li>
            <li>
              <Link href="/member/dashboard" className="hover:text-purple-600 transition-colors">
                Dashboard
              </Link>
            </li>
            <li>
              <span className="text-slate-400">/</span>
            </li>
            <li className="text-slate-900 dark:text-slate-100">Career</li>
          </ol>
        </nav>

        <header className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                <Compass className="w-3.5 h-3.5" />
                Career Hub
              </div>
              <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">
                Grow your career with clear steps
              </h1>
              <p className="mt-3 text-slate-600 dark:text-slate-300">
                Track milestones, build skills, and connect with mentors. Everything you need to
                move from opportunity to stability.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
                >
                  Explore jobs
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/member/dashboard"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Update profile
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full lg:w-auto">
              {[
                { label: 'Milestones', value: '12+' },
                { label: 'Career tools', value: '6' },
                { label: 'Mentor matches', value: '1:1' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-center"
                >
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
              Track progress
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Keep your milestones visible and celebrate every step forward.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <Target className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
              Set clear goals
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Break big ambitions into practical, achievable steps.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <Star className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
              Celebrate wins
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Turn achievements into confidence and momentum.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Career milestones
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Track your journey and keep it moving.
              </p>
            </div>
            <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-300" />
          </div>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            }
          >
            <CareerMilestones />
          </Suspense>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Career tools
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Build a profile that gets noticed.
              </p>
            </div>
            <Link
              href="/career/portfolio"
              className="text-sm font-semibold text-purple-600 hover:text-purple-500"
            >
              View all tools
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                href: '/career/video-resume',
                title: 'Video resume',
                description: 'Record a short introduction for employers.',
                icon: Video,
              },
              {
                href: '/career/skills',
                title: 'Skills verification',
                description: 'Collect badges and endorsements.',
                icon: Star,
              },
              {
                href: '/career/portfolio',
                title: 'Career portfolio',
                description: 'Showcase projects, certificates, and wins.',
                icon: Briefcase,
              },
              {
                href: '/career/salary',
                title: 'Salary benchmark',
                description: 'Compare pay ranges and negotiate confidently.',
                icon: DollarSign,
              },
              {
                href: '/career/progression',
                title: 'Career progression',
                description: 'Plan the next step and track outcomes.',
                icon: Route,
              },
              {
                href: '/mentors',
                title: 'Find a mentor',
                description: 'Get guidance from people who have walked the path.',
                icon: Trophy,
              },
            ].map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold">
                      <tool.icon className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                      {tool.title}
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {tool.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Your pathway checklist
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {[
              {
                title: 'Build your profile',
                text: 'Keep your skills, experience, and goals up to date so employers can match you quickly.',
              },
              {
                title: 'Showcase your strengths',
                text: 'Add a portfolio or video resume to stand out in search results.',
              },
              {
                title: 'Connect with support',
                text: 'Ask mentors for advice and request feedback on applications.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</div>
                <p className="mt-2 text-slate-600 dark:text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

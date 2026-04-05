'use client';

import Link from 'next/link';
import { HeartHandshake, Lightbulb, Target, Users, TrendingUp, Scale } from 'lucide-react';
import OptimizedImage from '@/components/ui/OptimizedImage';

export default function FoundersPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-slate-400">
            <li>
              <Link href="/" className="hover:text-blue-400 transition-colors">
                Home
              </Link>
            </li>
            <li>
              <span className="text-slate-600">/</span>
            </li>
            <li className="text-white">Founders</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-600/20 to-amber-600/10 rounded-xl">
              <HeartHandshake className="w-8 h-8 text-purple-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Founders & Vision</h1>
              <p className="text-slate-400">
                Why Vantage exists, who built it, and the impact it aims to create
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <Lightbulb className="w-6 h-6 text-amber-300 mb-2" />
              <h2 className="font-semibold text-white mb-1">Inspiration</h2>
              <p className="text-sm text-slate-400">
                The idea for the platform was inspired by Takutai Garland and his fiancée, Miss
                Fiona Leanee Baker.
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <Users className="w-6 h-6 text-emerald-300 mb-2" />
              <h2 className="font-semibold text-white mb-1">Community</h2>
              <p className="text-sm text-slate-400">
                Built to be culturally grounded, practical, and useful for jobseekers, families,
                employers, educators, and community partners.
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <Target className="w-6 h-6 text-purple-300 mb-2" />
              <h2 className="font-semibold text-white mb-1">Purpose</h2>
              <p className="text-sm text-slate-400">
                Strengthen pathways into training and employment, support retention, and help people
                grow from first opportunity into long-term careers.
              </p>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">What the platform is about</h2>
          <div className="space-y-3 text-slate-300">
            <p>
              Vantage is a pathway platform designed to connect people to real opportunities 
              and support them through the full journey: discovery · preparation · placement · progression.
            </p>
            <p>
              It brings together job listings, training pathways, community support, and tools that
              help people build confidence, document skills, and make progress in ways that feel
              respectful and achievable.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Core capabilities</h3>
              <ul className="text-sm text-slate-300 space-y-1 list-disc pl-5">
                <li>Jobs, apprenticeships, and employer pathways</li>
                <li>Learning and course discovery</li>
                <li>Mentorship and community connection</li>
                <li>Career progress tracking and practical tools</li>
                <li>Supportive, culturally-aware UX and language</li>
              </ul>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Why it matters</h3>
              <ul className="text-sm text-slate-300 space-y-1 list-disc pl-5">
                <li>Reduces friction between talent and opportunity</li>
                <li>Improves readiness (CV, skills, guidance) and confidence</li>
                <li>Strengthens retention by supporting the &quot;after hire&quot; phase</li>
                <li>Creates a single place for pathways, support, and momentum</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Founders */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Founders</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-slate-900/60 to-slate-900/20 border border-slate-800 rounded-xl p-5 flex flex-col">
              <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg border border-slate-800">
                <OptimizedImage
                  src="/founders/Taku.jpeg"
                  alt="Portrait of Takutai Garland"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  priority
                />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-white">Takutai Garland</h3>
                <p className="text-sm text-slate-400">Platform inspiration</p>
                <p className="mt-3 text-sm text-slate-300">
                  Inspired the platform concept and direction alongside his fiancée.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900/60 to-slate-900/20 border border-slate-800 rounded-xl p-5 flex flex-col">
              <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg border border-slate-800">
                <OptimizedImage
                  src="/founders/Fiona.jpeg"
                  alt="Portrait of Miss Fiona Leanee Baker"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  priority
                />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-white">Miss Fiona Leanee Baker</h3>
                <p className="text-sm text-slate-400">Platform inspiration</p>
                <p className="mt-3 text-sm text-slate-300">
                  Co-inspired the platform vision and the community-first approach.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-950/30 to-slate-900/20 border border-purple-800/40 rounded-xl p-5 flex flex-col">
              <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg border border-purple-900/60">
                <OptimizedImage
                  src="/founders/Taku and Fiona.jpeg"
                  alt="Takutai Garland and Miss Fiona Leanee Baker together"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-white">Together in vision</h3>
                <p className="text-sm text-slate-400">Founding partners</p>
                <p className="mt-3 text-sm text-slate-300">
                  Their partnership anchors the platform&apos;s cultural grounding and people-first
                  ethos.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-gradient-to-br from-purple-950/30 to-slate-900/20 border border-purple-800/30 rounded-xl p-5">
            <h3 className="font-semibold text-white">MoneyMan ©</h3>
            <p className="text-sm text-slate-400">Architecture & coding</p>
            <p className="mt-3 text-sm text-slate-300">
              Designed the platform architecture and delivered the implementation across web, API,
              and mobile.
            </p>
          </div>
        </div>

        {/* Impact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-6 h-6 text-emerald-300" />
              <h2 className="text-lg font-semibold text-white">Economic & social benefits</h2>
            </div>
            <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5">
              <li>
                Better matching between employers and jobseekers can reduce time-to-hire and vacancy
                costs.
              </li>
              <li>
                Stronger training-to-employment pathways can lift workforce participation over time.
              </li>
              <li>
                Mentorship and progression tools can support retention, reducing churn and repeat
                recruitment.
              </li>
              <li>
                Community-aligned engagement can strengthen trust and participation, especially for
                people who have been underserved by traditional systems.
              </li>
            </ul>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Scale className="w-6 h-6 text-amber-300" />
              <h2 className="text-lg font-semibold text-white">
                Closing the gap & justice outcomes
              </h2>
            </div>
            <div className="text-sm text-slate-300 space-y-3">
              <p>
                The platform is built to support practical pathways that align with &quot;closing
                the gap&quot; priorities: education completion, employment participation, and safe,
                culturally respectful access to support.
              </p>
              <p>
                While no product can guarantee outcomes on its own, stable work, training, and
                mentorship are commonly associated with improved wellbeing and reduced risk factors
                that can contribute to contact with the justice system.
              </p>
              <p>
                By helping people move into training and employment (and stay supported once they
                get there), Vantage aims to contribute to long-term community strength 
                through prevention and opportunity.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-slate-900/60 to-purple-950/20 border border-slate-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-2">Get involved</h2>
          <p className="text-sm text-slate-300 mb-4">
            If you&apos;re an employer, mentor, educator, or community partner, you can help turn
            pathways into outcomes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/jobs"
              className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors text-sm"
            >
              Browse jobs
            </Link>
            <Link
              href="/mentors"
              className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm"
            >
              Find mentors
            </Link>
            <Link
              href="/contact"
              className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm"
            >
              Contact us
            </Link>
          </div>
        </div>

        {/* Acknowledgement of Country */}
        <div className="bg-gradient-to-br from-amber-950/30 via-orange-950/20 to-red-950/30 border border-amber-800/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-600/20 rounded-lg">
              <svg
                className="w-6 h-6 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Acknowledgement of Country</h2>
              <div className="text-sm text-slate-300 space-y-3">
                <p>
                  We acknowledge the Traditional Custodians of the lands on which we live, work, and
                  gather. We pay our deepest respects to Elders past and present, and acknowledge
                  the ongoing connection of Aboriginal and Torres Strait Islander peoples to
                  Country, culture, and community.
                </p>
                <p>
                  We recognise that sovereignty was never ceded. We are committed to walking
                  alongside First Nations peoples in the journey towards justice, equity, and
                  reconciliation.
                </p>
                <p className="text-amber-400/80 italic">
                  Always was, always will be Aboriginal land.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

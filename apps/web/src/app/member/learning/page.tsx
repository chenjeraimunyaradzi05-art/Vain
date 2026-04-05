/**
 * Learning Hub Page
 * 
 * Personalized educational content based on user's foundation preferences
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, GraduationCap, BookOpen, TrendingUp, Briefcase, DollarSign, Home, Scale } from 'lucide-react';
import PersonalizedResources from '../../../components/resources/PersonalizedResources';

// Topic Cards for browsing by interest
const topics = [
  { 
    id: 'business', 
    label: 'Starting a Business', 
    icon: Briefcase, 
    color: 'from-emerald-600 to-teal-700',
    description: 'Learn how to launch and grow your venture'
  },
  { 
    id: 'legal', 
    label: 'Legal Essentials', 
    icon: Scale, 
    color: 'from-blue-600 to-indigo-700',
    description: 'Business law, ABN, and compliance basics'
  },
  { 
    id: 'finance', 
    label: 'Financial Wellness', 
    icon: DollarSign, 
    color: 'from-amber-600 to-orange-700',
    description: 'Budgeting, saving, and money management'
  },
  { 
    id: 'investing', 
    label: 'Investing', 
    icon: TrendingUp, 
    color: 'from-purple-600 to-pink-700',
    description: 'Stocks, ETFs, and building wealth'
  },
  { 
    id: 'property', 
    label: 'Home Ownership', 
    icon: Home, 
    color: 'from-cyan-600 to-blue-700',
    description: 'Mortgages and buying your first home'
  },
  { 
    id: 'career', 
    label: 'Career Development', 
    icon: GraduationCap, 
    color: 'from-rose-600 to-red-700',
    description: 'Skills, networking, and advancement'
  },
];

export default function LearningHubPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link 
            href="/member" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Learning Hub</h1>
              <p className="text-slate-400 mt-1">
                Educational resources tailored to your interests and goals
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* Topic Cards */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">Browse by Topic</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {topics.map(topic => (
              <Link
                key={topic.id}
                href={`/resources?category=${topic.id}`}
                className="group relative bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-slate-600 transition-all overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${topic.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${topic.color} flex items-center justify-center mb-3`}>
                  <topic.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-medium text-white text-sm mb-1">{topic.label}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{topic.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Personalized Resources */}
        <section>
          <PersonalizedResources limit={9} />
        </section>

        {/* Featured Learning Paths */}
        <section className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-amber-400" />
            Featured Learning Paths
          </h2>
          <p className="text-slate-400 mb-6">
            Structured courses to help you achieve your goals
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Business Basics Path */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-900/50 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Business Basics</h3>
                  <p className="text-xs text-slate-500">8 modules · 4 hours</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Everything you need to know to start your first business in Australia.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">🪃 Indigenous-focused</span>
                <Link href="/courses" className="text-sm text-green-400 hover:text-green-300">
                  Start →
                </Link>
              </div>
            </div>

            {/* Financial Freedom Path */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-900/50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Financial Freedom</h3>
                  <p className="text-xs text-slate-500">12 modules · 6 hours</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Master budgeting, saving, and building long-term wealth.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Beginner friendly</span>
                <Link href="/courses" className="text-sm text-green-400 hover:text-green-300">
                  Start →
                </Link>
              </div>
            </div>

            {/* First Home Buyer Path */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-900/50 flex items-center justify-center">
                  <Home className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">First Home Buyer</h3>
                  <p className="text-xs text-slate-500">6 modules · 3 hours</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Navigate the home buying process with confidence.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Includes FHOG guide</span>
                <Link href="/courses" className="text-sm text-green-400 hover:text-green-300">
                  Start →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

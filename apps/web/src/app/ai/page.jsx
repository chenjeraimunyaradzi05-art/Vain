"use client";
import Link from 'next/link';
import { Bot, MessageSquare, Leaf, Radar } from 'lucide-react';

// Avoid static prerender issues since this page leans on client-only behavior.
export const dynamic = 'force-dynamic';

export default function AiIndex() {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-600/20 rounded-lg">
            <Bot className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold">AI Hub</h1>
        </div>
        <p className="mb-8 text-slate-300">Access AI-powered tools to help guide your career journey, wellbeing, and uncover opportunities.</p>
        
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/ai-concierge" className="group block p-6 border border-slate-800 rounded-lg bg-slate-900/40 hover:bg-slate-900 hover:border-indigo-700 transition-all">
            <div className="p-3 bg-indigo-600/20 rounded-lg w-fit mb-3 group-hover:bg-indigo-600/30 transition-colors">
              <MessageSquare className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-lg mb-1">AI Concierge</h3>
            <p className="text-sm text-slate-400">Get personalised career suggestions and guidance based on your profile and goals.</p>
          </Link>

          <Link href="/ai-wellness" className="group block p-6 border border-slate-800 rounded-lg bg-slate-900/40 hover:bg-slate-900 hover:border-green-700 transition-all">
            <div className="p-3 bg-green-600/20 rounded-lg w-fit mb-3 group-hover:bg-green-600/30 transition-colors">
              <Leaf className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Wellness Coach</h3>
            <p className="text-sm text-slate-400">Holistic wellbeing support with culturally-aware guidance for mind, body and spirit.</p>
          </Link>

          <Link href="/opportunity-radar" className="group block p-6 border border-slate-800 rounded-lg bg-slate-900/40 hover:bg-slate-900 hover:border-blue-700 transition-all">
            <div className="p-3 bg-blue-600/20 rounded-lg w-fit mb-3 group-hover:bg-blue-600/30 transition-colors">
              <Radar className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Opportunity Radar</h3>
            <p className="text-sm text-slate-400">Discover job opportunities, grants, scholarships, and programs matched to your interests.</p>
          </Link>
        </div>
      </div>
    );
}

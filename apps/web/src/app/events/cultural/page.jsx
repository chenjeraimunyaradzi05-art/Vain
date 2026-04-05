'use client';

/**
 * Cultural Events Page
 * Indigenous cultural calendar, significant dates, and community events
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { Calendar, Loader2, Leaf, Heart, MapPin, Sun } from 'lucide-react';
import CulturalCalendar from '@/components/CulturalCalendar';

export default function CulturalEventsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-slate-400">
            <li><Link href="/" className="hover:text-blue-400 transition-colors">Home</Link></li>
            <li><span className="text-slate-600">/</span></li>
            <li><Link href="/events" className="hover:text-blue-400 transition-colors">Events</Link></li>
            <li><span className="text-slate-600">/</span></li>
            <li className="text-white">Cultural Calendar</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-orange-950/40 via-slate-900 to-amber-950/30 border border-orange-800/30 rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="p-4 bg-orange-600/20 rounded-2xl">
              <Leaf className="w-12 h-12 text-orange-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Cultural Calendar
              </h1>
              <p className="text-lg text-slate-300 mb-4">
                Celebrating Indigenous culture, community events, and significant dates throughout the year
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-orange-400">
                  <Sun className="w-4 h-4" />
                  <span>NAIDOC Week</span>
                </div>
                <div className="flex items-center gap-2 text-purple-400">
                  <Heart className="w-4 h-4" />
                  <span>Reconciliation</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <MapPin className="w-4 h-4" />
                  <span>Community Events</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Significant Dates Highlight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-red-950/30 to-slate-900/40 border border-red-800/30 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-900/50 rounded-lg flex flex-col items-center justify-center text-red-400">
                <span className="text-xs font-medium">JAN</span>
                <span className="text-lg font-bold leading-none">26</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Survival Day</h3>
                <p className="text-xs text-slate-400">Day of mourning & reflection</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-950/30 to-slate-900/40 border border-purple-800/30 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-purple-900/50 rounded-lg flex flex-col items-center justify-center text-purple-400">
                <span className="text-xs font-medium">MAY</span>
                <span className="text-lg font-bold leading-none">26</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Sorry Day</h3>
                <p className="text-xs text-slate-400">Stolen Generations remembrance</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-950/30 to-slate-900/40 border border-amber-800/30 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-amber-900/50 rounded-lg flex flex-col items-center justify-center text-amber-400">
                <span className="text-xs font-medium">JUL</span>
                <span className="text-lg font-bold leading-none">7-14</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">NAIDOC Week</h3>
                <p className="text-xs text-slate-400">Celebrating Indigenous culture</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cultural Calendar Component */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        }>
          <CulturalCalendar />
        </Suspense>

        {/* Community Involvement Section */}
        <div className="mt-12 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />
            Get Involved
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Submit an Event</h4>
              <p className="text-sm text-slate-400 mb-3">
                Are you organizing a cultural event? Share it with the community.
              </p>
              <Link href="/events/create" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
                Submit Event →
              </Link>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Volunteer</h4>
              <p className="text-sm text-slate-400 mb-3">
                Support community events and cultural celebrations.
              </p>
              <Link href="/community" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
                Join Community →
              </Link>
            </div>
          </div>
        </div>

        {/* Acknowledgement */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 max-w-2xl mx-auto">
            We acknowledge the Traditional Owners of the lands on which we gather and pay our respects 
            to Elders past, present, and emerging. We celebrate the continuing culture and 
            contributions of Aboriginal and Torres Strait Islander peoples.
          </p>
        </div>
      </div>
    </div>
  );
}

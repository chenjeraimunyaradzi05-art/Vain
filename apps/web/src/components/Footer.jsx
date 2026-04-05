"use client";

import Link from 'next/link';
import Image from '@/components/ui/OptimizedImage';
import { Space_Grotesk } from 'next/font/google';
import { Briefcase, Bot, Building2, GraduationCap, Users, Mail, Shield, Info, HelpCircle, FileText, Heart, Leaf, BookOpen, Accessibility } from 'lucide-react';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
});

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="relative py-8 bg-white dark:bg-[#1a0f2e] border-t border-slate-200 dark:border-purple-900/40 transition-colors duration-200"
      suppressHydrationWarning
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/brand/vantage-logo.png"
                alt="Vantage"
                width={100}
                height={80}
                className="h-14 w-auto brightness-110"
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-purple-200/50">
              Vantage helps you see your next step — and take it. Jobs, learning, mentors, community, business tools, and real-world opportunities in one guided platform.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-xs font-semibold mb-3 text-slate-900 dark:text-[#FFD700]">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/jobs" className="flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-sm hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Briefcase className="w-3 h-3" /> Jobs
                </Link>
              </li>
              <li>
                <Link href="/courses" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <GraduationCap className="w-3 h-3" /> Courses
                </Link>
              </li>
              <li>
                <Link href="/mentorship" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Heart className="w-3 h-3" /> Mentorship
                </Link>
              </li>
              <li>
                <Link href="/community" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Users className="w-3 h-3" /> Community
                </Link>
              </li>
              <li>
                <Link href="/resources" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <BookOpen className="w-3 h-3" /> Resources
                </Link>
              </li>
              <li>
                <Link href="/events/cultural" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Leaf className="w-3 h-3" /> Cultural Events
                </Link>
              </li>
            </ul>
          </div>

          {/* For Users */}
          <div>
            <h4 className="text-xs font-semibold mb-3 text-slate-900 dark:text-[#FFD700]">For Users</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/ai" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Bot className="w-3 h-3" /> AI Hub
                </Link>
              </li>
              <li>
                <Link href="/apprenticeships" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <GraduationCap className="w-3 h-3" /> Apprenticeships
                </Link>
              </li>
              <li>
                <Link href="/company/setup" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Building2 className="w-3 h-3" /> For Employers
                </Link>
              </li>
              <li>
                <Link href="/women-pathways" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Heart className="w-3 h-3" /> Women Pathways
                </Link>
              </li>
              <li>
                <Link href="/help" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <HelpCircle className="w-3 h-3" /> Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Mail className="w-3 h-3" /> Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & About */}
          <div>
            <h4 className="text-xs font-semibold mb-3 text-slate-900 dark:text-[#FFD700]">About</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/about" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Info className="w-3 h-3" /> About Us
                </Link>
              </li>
              <li>
                <Link href="/founders" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Heart className="w-3 h-3" /> Founders
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Shield className="w-3 h-3" /> Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <FileText className="w-3 h-3" /> Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/guidelines" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Shield className="w-3 h-3" /> Community Guidelines
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-amber-400 transition-colors text-slate-600 dark:text-purple-200/70">
                  <Accessibility className="w-3 h-3" /> Accessibility
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Acknowledgment & Copyright */}
        <div 
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] border-t border-slate-200 dark:border-purple-500/15"
        >
          <p className="text-center sm:text-left text-slate-500 dark:text-purple-200/60">
            <span className="text-purple-600 dark:text-[#FFD700]">✦</span> Clear pathways. Practical tools. Real momentum. <span className="text-emerald-600 dark:text-[#50C878]">✦</span>
          </p>
          <p className="whitespace-nowrap text-slate-500 dark:text-purple-200/50">
            © {currentYear} Vantage · Built by <span className="text-purple-700 dark:text-[#FFD700]">Munyaradzi Chenjerai</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

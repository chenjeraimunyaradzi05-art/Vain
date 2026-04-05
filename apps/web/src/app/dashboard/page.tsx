'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(`/signin?returnTo=${encodeURIComponent('/dashboard')}`);
      return;
    }

    const userType = String(user?.userType || 'member').toLowerCase();

    const byRole: Record<string, string> = {
      member: '/member/dashboard',
      mentor: '/mentor/dashboard',
      company: '/company/dashboard',
      admin: '/admin/dashboard',
      tafe: '/tafe/dashboard',
      institution: '/tafe/dashboard',
      government: '/government/dashboard',
    };

    router.replace(byRole[userType] || '/member/dashboard');
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-slate-600 dark:text-slate-300 text-sm">Redirecting…</div>
    </div>
  );
}

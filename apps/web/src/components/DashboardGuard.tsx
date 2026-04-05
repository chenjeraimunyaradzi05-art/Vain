'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle } from 'lucide-react';

interface DashboardGuardProps {
  children: React.ReactNode;
}

export default function DashboardGuard({ children }: DashboardGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasPurpose, setHasPurpose] = useState(false);

  const checkUserPurpose = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/signup');
        return;
      }

      const response = await fetch('/api/v1/me/purpose', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.hasPurpose) {
          // User hasn't completed purpose wizard, redirect to onboarding
          router.push('/onboarding/purpose');
        } else {
          setHasPurpose(true);
        }
      } else {
        // Error checking purpose, allow access but log error
        console.error('Error checking user purpose:', response.status);
        setHasPurpose(true);
      }
    } catch (error) {
      console.error('Error checking user purpose:', error);
      // Allow access on error to prevent blocking users
      setHasPurpose(true);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkUserPurpose();
  }, [checkUserPurpose]);

  if (isLoading) {
    return (
      <div className="vantage-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="vantage-text">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!hasPurpose) {
    return (
      <div className="vantage-page flex items-center justify-center">
        <div className="vantage-card p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="vantage-h2 mb-4">Complete Your Setup</h2>
          <p className="vantage-text mb-6">
            Please complete the quick onboarding wizard to personalize your Vantage experience.
          </p>
          <button
            onClick={() => router.push('/onboarding/purpose')}
            className="vantage-btn-primary px-6 py-3"
          >
            Complete Setup
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

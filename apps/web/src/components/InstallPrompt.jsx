'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

/**
 * PWA Install Prompt Component
 * Shows a banner prompting users to install the app on mobile/desktop
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
      return;
    }

    // Check if iOS (doesn't support beforeinstallprompt)
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show for 7 days after dismissal
      }
    }

    // Listen for install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show after a delay
    if (isIOSDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
    setShowPrompt(false);
  }

  // Don't render if already installed or shouldn't show
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 safe-area-inset-bottom">
      <div className="max-w-lg mx-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-900/50 rounded-lg flex-shrink-0">
              <Smartphone className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1">Install Ngurra Pathways</h3>
              <p className="text-sm text-slate-400">
                {isIOS 
                  ? 'Tap the share button and select "Add to Home Screen" for the best experience.'
                  : 'Install our app for quick access and offline features.'
                }
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isIOS && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2 text-sm border border-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Install
              </button>
            </div>
          )}

          {isIOS && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
              <span>Tap</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>then "Add to Home Screen"</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

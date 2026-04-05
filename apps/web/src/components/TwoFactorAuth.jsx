'use client';

/**
 * Two-Factor Authentication Component
 * Allows users to enable, verify, and disable 2FA
 */

import { useState, useEffect } from 'react';
import api from '@/lib/apiClient';
import useAuth from '@/hooks/useAuth';
import {
  Shield,
  Smartphone,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  QrCode,
  Download,
  CheckCircle2
} from 'lucide-react';

export default function TwoFactorAuth() {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Setup state
  const [setupData, setSetupData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  // Fetch 2FA status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const { ok, data } = await api('/security/2fa/status');
        
        if (ok) {
          setStatus(data);
        }
      } catch (err) {
        console.error('Failed to fetch 2FA status:', err);
      } finally {
        setLoading(false);
      }
    }
    
    if (isAuthenticated) {
      fetchStatus();
    }
  }, [isAuthenticated]);

  // Start 2FA setup
  const handleEnable = async () => {
    setError(null);
    setActionLoading(true);
    
    try {
      const { ok, data, error: apiError } = await api('/security/2fa/enable', {
        method: 'POST',
      });
      
      if (!ok) {
        throw new Error(apiError || 'Failed to enable 2FA');
      }
      
      setSetupData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Verify 2FA setup
  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setActionLoading(true);
    
    try {
      const { ok, data, error: apiError } = await api('/security/2fa/verify', {
        method: 'POST',
        body: { token: verificationCode },
      });
      
      if (!ok) {
        throw new Error(apiError || 'Verification failed');
      }
      
      setSuccess('Two-factor authentication enabled successfully!');
      setStatus({ enabled: true, backupCodesRemaining: 10 });
      setShowBackupCodes(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable = async (e) => {
    e.preventDefault();
    setError(null);
    setActionLoading(true);
    
    try {
      const { ok, data, error: apiError } = await api('/security/2fa/disable', {
        method: 'POST',
        body: { token: disableCode },
      });
      
      if (!ok) {
        throw new Error(apiError || 'Failed to disable 2FA');
      }
      
      setSuccess('Two-factor authentication disabled');
      setStatus({ enabled: false });
      setSetupData(null);
      setShowDisable(false);
      setDisableCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Copy secret to clipboard
  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Download backup codes
  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;
    
    const content = [
      'Ngurra Pathways - Two-Factor Authentication Backup Codes',
      '='.repeat(50),
      '',
      'Store these codes in a safe place. Each code can only be used once.',
      '',
      ...setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`),
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ngurra-pathways-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status display */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-2 text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-900/30 border border-green-800 rounded-lg flex items-center gap-2 text-green-300 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* 2FA Enabled State */}
      {status?.enabled && !showDisable && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-900/30 rounded-lg">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="font-medium text-green-300">2FA is Enabled</div>
                <div className="text-xs text-green-400/70">
                  {status.backupCodesRemaining} backup codes remaining
                </div>
              </div>
            </div>
            <Check className="w-5 h-5 text-green-400" />
          </div>
          
          <button
            onClick={() => setShowDisable(true)}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Disable Two-Factor Authentication
          </button>
        </div>
      )}

      {/* Disable 2FA Form */}
      {status?.enabled && showDisable && (
        <form onSubmit={handleDisable} className="space-y-4">
          <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="font-medium text-red-300">Disable 2FA</span>
            </div>
            <p className="text-sm text-red-300/70 mb-4">
              This will reduce the security of your account. Enter your current 2FA code to confirm.
            </p>
            
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit code"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-center text-xl tracking-widest font-mono"
              autoComplete="one-time-code"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowDisable(false);
                setDisableCode('');
              }}
              className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disableCode.length !== 6 || actionLoading}
              className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Disable 2FA'
              )}
            </button>
          </div>
        </form>
      )}

      {/* 2FA Not Enabled - Setup */}
      {!status?.enabled && !setupData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-700 rounded-lg">
                <Smartphone className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <div className="font-medium">Two-Factor Authentication</div>
                <div className="text-xs text-slate-400">
                  Add an extra layer of security
                </div>
              </div>
            </div>
            <span className="text-xs px-2 py-1 bg-slate-700 text-slate-400 rounded">
              Not Enabled
            </span>
          </div>
          
          <p className="text-sm text-slate-400">
            Two-factor authentication adds an extra layer of security by requiring a code 
            from your phone in addition to your password.
          </p>
          
          <button
            onClick={handleEnable}
            disabled={actionLoading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Enable Two-Factor Authentication
              </>
            )}
          </button>
        </div>
      )}

      {/* Setup Flow */}
      {setupData && !status?.enabled && (
        <div className="space-y-4">
          {/* Step 1: Scan QR Code */}
          {!showBackupCodes && (
            <>
              <div className="text-center">
                <h3 className="font-medium mb-2">Step 1: Scan QR Code</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Scan this code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                
                {/* QR Code placeholder */}
                <div className="bg-white p-4 rounded-lg inline-block mb-4">
                  <div className="w-48 h-48 bg-slate-200 flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-slate-800" />
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Use authenticator app to scan
                  </p>
                </div>
                
                {/* Manual entry */}
                <div className="text-left bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-2">Or enter this code manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-slate-900 px-3 py-2 rounded font-mono text-sm break-all">
                      {setupData.secret}
                    </code>
                    <button
                      onClick={copySecret}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedCode ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: Verify */}
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Step 2: Verify Setup</h3>
                  <p className="text-sm text-slate-400 mb-3">
                    Enter the 6-digit code from your authenticator app
                  </p>
                  
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                    autoComplete="one-time-code"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={verificationCode.length !== 6 || actionLoading}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Verify and Enable
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Backup Codes Display */}
          {showBackupCodes && setupData.backupCodes && (
            <div className="space-y-4">
              <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-5 h-5 text-amber-400" />
                  <span className="font-medium text-amber-300">Save Your Backup Codes</span>
                </div>
                <p className="text-sm text-amber-300/70 mb-4">
                  Store these codes in a safe place. You can use them to sign in if you lose 
                  access to your authenticator app. Each code can only be used once.
                </p>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {setupData.backupCodes.map((code, i) => (
                    <code 
                      key={i}
                      className="bg-slate-900 px-3 py-2 rounded font-mono text-sm text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                
                <button
                  onClick={downloadBackupCodes}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Backup Codes
                </button>
              </div>
              
              <button
                onClick={() => {
                  setSetupData(null);
                  setShowBackupCodes(false);
                  setVerificationCode('');
                  setSuccess(null);
                }}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

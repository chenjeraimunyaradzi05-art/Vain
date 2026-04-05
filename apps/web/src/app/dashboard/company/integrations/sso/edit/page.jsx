'use client';

import api from '@/lib/apiClient';
/**
 * Edit SSO Configuration Page
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
export default function EditSSOPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [provider, setProvider] = useState('SAML');
  const [config, setConfig] = useState({
    issuer: '',
    ssoUrl: '',
    certificate: '',
    // OIDC fields
    clientId: '',
    clientSecret: '',
    // Common
    defaultRole: 'member',
    autoProvision: true
  });

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const res = await api('/sso/config');
      if (res.ok && res.data?.config) {
        const nextConfig = res.data.config;
        setProvider(nextConfig.provider || 'SAML');
        setConfig({
          issuer: nextConfig.issuer || '',
          ssoUrl: nextConfig.ssoUrl || '',
          certificate: '',
          clientId: nextConfig.clientId || '',
          clientSecret: '', // Never returned from API
          defaultRole: nextConfig.metadata?.defaultRole || 'member',
          autoProvision: nextConfig.metadata?.autoProvision ?? true,
        });
      }
    } catch (err) {
      setError('Failed to load SSO configuration');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        provider,
        issuer: config.issuer,
        ...(provider === 'SAML'
          ? {
              ssoUrl: config.ssoUrl,
              certificate: config.certificate,
            }
          : {
              clientId: config.clientId,
              clientSecret: config.clientSecret,
            }),
        metadata: {
          defaultRole: config.defaultRole,
          autoProvision: config.autoProvision,
        },
      };

      const res = await api('/sso/config', {
        method: 'POST',
        body: payload,
      });

      if (!res.ok) throw new Error(res.data?.error || res.error || 'Failed to save SSO config');

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    if (!confirm('Are you sure you want to disable SSO? Users will need to log in with email/password.')) {
      return;
    }

    setSaving(true);
    try {
      const res = await api('/sso/config', { method: 'DELETE' });
      if (!res.ok) throw new Error(res.data?.error || res.error || 'Failed to disable SSO');
      
      window.location.href = '/dashboard/company/integrations';
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">
              SSO Updated
            </h1>
            <p className="text-gray-600 mb-6">
              Your Single Sign-On configuration has been updated.
            </p>
            <Link
              href="/dashboard/company/integrations"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Integrations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const callbackUrl = `${window.location.origin}/api/sso/callback/${provider === 'SAML' ? 'saml' : 'oidc'}`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit SSO Configuration</h1>
          <Link
            href="/dashboard/company/integrations"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              SSO Provider
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setProvider('SAML')}
                className={`flex-1 p-4 border-2 rounded-lg text-center transition-colors ${
                  provider === 'SAML'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🔐</div>
                <div className="font-semibold">SAML 2.0</div>
                <div className="text-xs text-gray-500">Enterprise standard</div>
              </button>
              <button
                type="button"
                onClick={() => setProvider('OIDC')}
                className={`flex-1 p-4 border-2 rounded-lg text-center transition-colors ${
                  provider === 'OIDC'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🌐</div>
                <div className="font-semibold">OpenID Connect</div>
                <div className="text-xs text-gray-500">OAuth 2.0 based</div>
              </button>
            </div>
          </div>

          {/* Callback URL */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Callback URL</h4>
            <p className="text-sm text-blue-700 mb-2">
              Configure this URL in your identity provider:
            </p>
            <code className="block bg-white px-3 py-2 rounded text-sm break-all">
              {callbackUrl}
            </code>
          </div>

          {/* SAML Fields */}
          {provider === 'SAML' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issuer
                </label>
                <input
                  type="text"
                  value={config.issuer}
                  onChange={(e) => setConfig({ ...config, issuer: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="https://idp.example.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SSO URL (Login URL)
                </label>
                <input
                  type="url"
                  value={config.ssoUrl}
                  onChange={(e) => setConfig({ ...config, ssoUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="https://idp.example.com/sso/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  X.509 Certificate
                </label>
                <textarea
                  value={config.certificate}
                  onChange={(e) => setConfig({ ...config, certificate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                  rows={4}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste the public certificate from your IdP (secrets are not returned by the API)
                </p>
              </div>
            </>
          )}

          {/* OIDC Fields */}
          {provider === 'OIDC' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issuer
                </label>
                <input
                  type="url"
                  value={config.issuer}
                  onChange={(e) => setConfig({ ...config, issuer: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="https://accounts.google.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={config.clientSecret}
                  onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter a secret (not returned by the API)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Secrets are not returned by the API; re-enter if rotating.
                </p>
              </div>
            </>
          )}

          {/* Common Options */}
          <div className="border-t pt-6">
            <h4 className="font-medium text-gray-900 mb-4">Provisioning Options</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Role for New Users
              </label>
              <select
                value={config.defaultRole}
                onChange={(e) => setConfig({ ...config, defaultRole: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="member">Member</option>
                <option value="recruiter">Recruiter</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.autoProvision}
                  onChange={(e) => setConfig({ ...config, autoProvision: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 mr-2"
                />
                <span className="text-sm text-gray-700">
                  Automatically create user accounts on first login
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleDisable}
              disabled={saving}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
            >
              Disable SSO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

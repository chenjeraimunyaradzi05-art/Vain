'use client';

import api from '@/lib/apiClient';
/**
 * SSO Setup Page
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
export default function SsoSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [provider, setProvider] = useState('SAML');
  const [formData, setFormData] = useState({
    issuer: '',
    ssoUrl: '',
    certificate: '',
    clientId: '',
    clientSecret: ''
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        provider,
        issuer: formData.issuer,
        ...(provider === 'SAML' ? {
          ssoUrl: formData.ssoUrl,
          certificate: formData.certificate
        } : {
          clientId: formData.clientId,
          clientSecret: formData.clientSecret
        })
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
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">
              SSO Configuration Saved
            </h1>
            <p className="text-gray-600 mb-6">
              Your SSO configuration has been saved. Test the connection before activating it for your users.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/dashboard/company/integrations"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Integrations
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Configure Single Sign-On</h1>
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

        <div className="bg-white rounded-lg shadow p-6">
          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              SSO Provider Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setProvider('SAML')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  provider === 'SAML'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">SAML 2.0</div>
                <div className="text-sm text-gray-500">
                  For Okta, Azure AD, OneLogin, etc.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setProvider('OIDC')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  provider === 'OIDC'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">OpenID Connect</div>
                <div className="text-sm text-gray-500">
                  For Google, Auth0, Keycloak, etc.
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Common Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issuer / Entity ID
              </label>
              <input
                type="text"
                value={formData.issuer}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                placeholder={provider === 'SAML' 
                  ? 'https://your-idp.com/saml/metadata'
                  : 'https://accounts.google.com'
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* SAML-specific fields */}
            {provider === 'SAML' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SSO URL
                  </label>
                  <input
                    type="url"
                    value={formData.ssoUrl}
                    onChange={(e) => setFormData({ ...formData, ssoUrl: e.target.value })}
                    placeholder="https://your-idp.com/saml/sso"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    X.509 Certificate
                  </label>
                  <textarea
                    value={formData.certificate}
                    onChange={(e) => setFormData({ ...formData, certificate: e.target.value })}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                    rows={6}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    required
                  />
                </div>
              </>
            )}

            {/* OIDC-specific fields */}
            {provider === 'OIDC' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    placeholder="your-client-id"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={formData.clientSecret}
                    onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </>
            )}

            {/* Callback URL Info */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Callback URL</h4>
              <p className="text-sm text-gray-600 mb-2">
                Configure this URL in your identity provider:
              </p>
              <code className="block bg-gray-800 text-green-400 p-2 rounded text-sm break-all">
                {provider === 'SAML'
                  ? 'https://api.ngurrapathways.com.au/api/sso/callback/saml'
                  : 'https://api.ngurrapathways.com.au/api/sso/callback/oidc'
                }
              </code>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
              <Link
                href="/dashboard/company/integrations"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

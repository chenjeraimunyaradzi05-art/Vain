'use client';

import api from '@/lib/apiClient';
/**
 * Enterprise Integration Dashboard
 * 
 * Manage API keys, webhooks, SSO, and bulk imports
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState('api-keys');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeySecret, setNewKeySecret] = useState(null);
  
  // Webhooks state
  const [webhooks, setWebhooks] = useState([]);
  const [webhookEvents, setWebhookEvents] = useState({});
  
  // SSO state
  const [ssoConfig, setSsoConfig] = useState(null);
  
  // Imports state
  const [imports, setImports] = useState([]);

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  async function loadData(tab) {
    setLoading(true);
    setError(null);
    
    try {
      switch (tab) {
        case 'api-keys': {
          const res = await api('/api-keys');
          if (!res.ok) throw new Error(res.data?.error || res.error || 'Failed to load API keys');
          setApiKeys(res.data?.keys || []);
          break;
        }
        case 'webhooks': {
          const [webhooksRes, eventsRes] = await Promise.all([
            api('/webhook-endpoints'),
            api('/webhook-endpoints/events')
          ]);
          if (!webhooksRes.ok) throw new Error(webhooksRes.data?.error || webhooksRes.error || 'Failed to load webhooks');
          setWebhooks(webhooksRes.data?.webhooks || []);
          setWebhookEvents(eventsRes.data?.events || {});
          break;
        }
        case 'sso': {
          const res = await api('/sso/config');
          if (!res.ok) throw new Error(res.data?.error || res.error || 'Failed to load SSO config');
          setSsoConfig(res.data?.config);
          break;
        }
        case 'imports': {
          const res = await api('/bulk-import');
          if (!res.ok) throw new Error(res.data?.error || res.error || 'Failed to load imports');
          setImports(res.data?.imports || []);
          break;
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createApiKey(e) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    
    try {
      const res = await api('/api-keys', {
        method: 'POST',
        body: { name: newKeyName },
      });

      if (!res.ok) throw new Error(res.data?.error || res.error || 'Failed to create API key');

      setNewKeySecret(res.data?.secretKey);
      setNewKeyName('');
      loadData('api-keys');
    } catch (err) {
      setError(err.message);
    }
  }

  async function revokeApiKey(id) {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    
    try {
      const res = await api(`/api-keys/${id}`, { method: 'DELETE' });

      if (!res.ok) throw new Error(res.data?.error || res.error || 'Failed to revoke API key');
      
      loadData('api-keys');
    } catch (err) {
      setError(err.message);
    }
  }

  async function testWebhook(id) {
    try {
      const res = await api(`/webhook-endpoints/${id}/test`, { method: 'POST' });

      if (!res.ok) throw new Error(res.data?.error || res.error || 'Failed to test webhook');
      
      alert('Test webhook sent!');
    } catch (err) {
      setError(err.message);
    }
  }

  const tabs = [
    { id: 'api-keys', label: 'API Keys', icon: '🔑' },
    { id: 'webhooks', label: 'Webhooks', icon: '🔔' },
    { id: 'sso', label: 'SSO / SAML', icon: '🔐' },
    { id: 'imports', label: 'Bulk Import', icon: '📤' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
            <p className="text-gray-600 mt-1">
              Manage API access, webhooks, and enterprise features
            </p>
          </div>
          <Link 
            href="/dashboard/company"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* API Keys Tab */}
                {activeTab === 'api-keys' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold mb-2">API Keys</h2>
                      <p className="text-gray-600 text-sm">
                        Create API keys for programmatic access to the Ngurra Pathways API.
                      </p>
                    </div>

                    {/* New key secret display */}
                    {newKeySecret && (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                        <h3 className="font-semibold text-yellow-800 mb-2">
                          ⚠️ Save your API key
                        </h3>
                        <p className="text-sm text-yellow-700 mb-3">
                          This key will only be shown once. Copy it now and store it securely.
                        </p>
                        <code className="block bg-yellow-100 p-3 rounded text-sm font-mono break-all">
                          {newKeySecret}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(newKeySecret);
                            alert('Copied to clipboard!');
                          }}
                          className="mt-3 text-sm text-yellow-700 underline"
                        >
                          Copy to clipboard
                        </button>
                        <button
                          onClick={() => setNewKeySecret(null)}
                          className="mt-3 ml-4 text-sm text-gray-500"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {/* Create new key */}
                    <form onSubmit={createApiKey} className="flex gap-3 mb-6">
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="API key name (e.g., Production Server)"
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Create Key
                      </button>
                    </form>

                    {/* Keys list */}
                    <div className="space-y-3">
                      {apiKeys.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                          No API keys yet. Create one above.
                        </p>
                      ) : (
                        apiKeys.map(key => (
                          <div 
                            key={key.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <h4 className="font-medium">{key.name}</h4>
                              <p className="text-sm text-gray-500">
                                <code>{key.keyPrefix}...</code>
                                {' • '}
                                Created {new Date(key.createdAt).toLocaleDateString()}
                                {key.lastUsedAt && (
                                  <>
                                    {' • '}
                                    Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs rounded ${
                                key.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {key.isActive ? 'Active' : 'Revoked'}
                              </span>
                              {key.isActive && (
                                <button
                                  onClick={() => revokeApiKey(key.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Webhooks Tab */}
                {activeTab === 'webhooks' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold mb-2">Webhooks</h2>
                      <p className="text-gray-600 text-sm">
                        Receive real-time notifications when events happen in your account.
                      </p>
                    </div>

                    <Link
                      href="/dashboard/company/integrations/webhook/new"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-6"
                    >
                      + Add Webhook
                    </Link>

                    <div className="space-y-3">
                      {webhooks.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                          No webhooks configured.
                        </p>
                      ) : (
                        webhooks.map(webhook => (
                          <div 
                            key={webhook.id}
                            className="p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium">{webhook.name}</h4>
                                <p className="text-sm text-gray-500 mt-1">
                                  {webhook.url}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {webhook.events.slice(0, 3).map(event => (
                                    <span 
                                      key={event}
                                      className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                                    >
                                      {event}
                                    </span>
                                  ))}
                                  {webhook.events.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                      +{webhook.events.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  webhook.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {webhook.isActive ? 'Active' : 'Disabled'}
                                </span>
                                <button
                                  onClick={() => testWebhook(webhook.id)}
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  Test
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                      <h4 className="font-medium mb-2">Available Events</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        {Object.entries(webhookEvents).map(([event, desc]) => (
                          <div key={event} title={desc} className="text-gray-600">
                            <code className="text-xs">{event}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SSO Tab */}
                {activeTab === 'sso' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold mb-2">Single Sign-On</h2>
                      <p className="text-gray-600 text-sm">
                        Configure SAML or OIDC for enterprise authentication.
                      </p>
                    </div>

                    {ssoConfig ? (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium">
                            {ssoConfig.provider} Configuration
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded ${
                            ssoConfig.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {ssoConfig.isActive ? 'Active' : 'Not Active'}
                          </span>
                        </div>
                        <dl className="space-y-2 text-sm">
                          <div className="flex">
                            <dt className="w-24 text-gray-500">Provider:</dt>
                            <dd>{ssoConfig.provider}</dd>
                          </div>
                          <div className="flex">
                            <dt className="w-24 text-gray-500">Issuer:</dt>
                            <dd>{ssoConfig.issuer}</dd>
                          </div>
                          {ssoConfig.ssoUrl && (
                            <div className="flex">
                              <dt className="w-24 text-gray-500">SSO URL:</dt>
                              <dd className="break-all">{ssoConfig.ssoUrl}</dd>
                            </div>
                          )}
                        </dl>
                        <div className="mt-4 flex gap-2">
                          <Link
                            href="/dashboard/company/integrations/sso/edit"
                            className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">
                          SSO is not configured for your organization.
                        </p>
                        <Link
                          href="/dashboard/company/integrations/sso/setup"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Configure SSO
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Bulk Import Tab */}
                {activeTab === 'imports' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold mb-2">Bulk Import</h2>
                      <p className="text-gray-600 text-sm">
                        Import jobs, candidates, or courses from CSV files.
                      </p>
                    </div>

                    <div className="flex gap-3 mb-6">
                      <a
                        href="/api/bulk-import/templates/jobs"
                        className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        📄 Jobs Template
                      </a>
                      <a
                        href="/api/bulk-import/templates/candidates"
                        className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        📄 Candidates Template
                      </a>
                      <a
                        href="/api/bulk-import/templates/courses"
                        className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        📄 Courses Template
                      </a>
                    </div>

                    <Link
                      href="/dashboard/company/integrations/import/new"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-6"
                    >
                      + New Import
                    </Link>

                    <h3 className="font-medium mb-3">Recent Imports</h3>
                    <div className="space-y-3">
                      {imports.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                          No imports yet.
                        </p>
                      ) : (
                        imports.map(imp => (
                          <div 
                            key={imp.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <h4 className="font-medium">{imp.type} Import</h4>
                              <p className="text-sm text-gray-500">
                                {imp.fileName}
                                {' • '}
                                {imp.processedRows}/{imp.totalRows} rows
                                {imp.failedRows > 0 && (
                                  <span className="text-red-600">
                                    {' • '}{imp.failedRows} failed
                                  </span>
                                )}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${
                              imp.status === 'COMPLETED' 
                                ? 'bg-green-100 text-green-800'
                                : imp.status === 'FAILED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {imp.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

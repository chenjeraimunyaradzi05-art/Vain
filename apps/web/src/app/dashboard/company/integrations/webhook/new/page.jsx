'use client';

import api from '@/lib/apiClient';
/**
 * Create New Webhook Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
export default function NewWebhookPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState({});
  const [secret, setSecret] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    selectedEvents: []
  });

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const res = await api('/webhook-endpoints/events');
      if (res.ok) setEvents(res.data?.events || {});
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }

  function toggleEvent(event) {
    setFormData(prev => ({
      ...prev,
      selectedEvents: prev.selectedEvents.includes(event)
        ? prev.selectedEvents.filter(e => e !== event)
        : [...prev.selectedEvents, event]
    }));
  }

  function selectAllEvents() {
    setFormData(prev => ({
      ...prev,
      selectedEvents: Object.keys(events)
    }));
  }

  function clearAllEvents() {
    setFormData(prev => ({
      ...prev,
      selectedEvents: []
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api('/webhook-endpoints', {
        method: 'POST',
        body: {
          name: formData.name,
          url: formData.url,
          events: formData.selectedEvents,
        },
      });

      if (!res.ok) throw new Error(res.data?.error || res.error || 'Failed to create webhook');

      setSecret(res.data?.secret);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Show secret after creation
  if (secret) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-green-600 mb-4">
              ✓ Webhook Created Successfully
            </h1>
            
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-yellow-800 mb-2">
                ⚠️ Save Your Webhook Secret
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                This secret will only be shown once. Use it to verify webhook signatures.
              </p>
              <code className="block bg-yellow-100 p-3 rounded text-sm font-mono break-all">
                {secret}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(secret);
                  alert('Copied to clipboard!');
                }}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Copy to Clipboard
              </button>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h4 className="font-medium mb-2">Verifying Webhook Signatures</h4>
              <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expected = hmac.digest('hex');
  return signature === expected;
}

// In your webhook handler:
const isValid = verifySignature(
  req.body,
  req.headers['x-webhook-signature'],
  '${secret}'
);`}
              </pre>
            </div>

            <Link
              href="/dashboard/company/integrations"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ← Back to Integrations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Webhook</h1>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Production Webhook"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://your-server.com/webhooks/ngurra"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              pattern="https://.*"
              title="URL must start with https://"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be a secure HTTPS endpoint
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Events to Subscribe
              </label>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={selectAllEvents}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAllEvents}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
              {Object.entries(events).map(([event, description]) => (
                <label
                  key={event}
                  className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={formData.selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="mt-0.5"
                  />
                  <div>
                    <code className="text-sm font-mono text-blue-600">{event}</code>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </label>
              ))}
            </div>
            {formData.selectedEvents.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                Select at least one event
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || formData.selectedEvents.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Webhook'}
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
  );
}

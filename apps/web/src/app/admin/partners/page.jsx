"use client";

import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import useAuth from '../../../hooks/useAuth';
import { Building2, Plus, Edit, Trash2, ExternalLink, Star, Check, X } from 'lucide-react';

const API_URL = API_BASE;

const PARTNER_TIERS = [
  { value: 'standard', label: 'Standard', color: 'bg-slate-600' },
  { value: 'silver', label: 'Silver', color: 'bg-gray-400' },
  { value: 'gold', label: 'Gold', color: 'bg-yellow-500' },
  { value: 'platinum', label: 'Platinum', color: 'bg-blue-300' },
];

export default function PartnerManagementPage() {
  const { token, user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: '',
    website: '',
    tier: 'standard',
    featuredJobs: 0,
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPartners();
  }, [token]);

  async function loadPartners() {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/featured/partners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPartners(data.partners || []);
      }
    } catch (err) {
      console.error('Failed to load partners:', err);
      setError('Failed to load partners');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const method = editingPartner ? 'PUT' : 'POST';
      const url = editingPartner 
        ? `${API_URL}/featured/partners/${editingPartner.slug}`
        : `${API_URL}/featured/partners`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save partner');
      }

      await loadPartners();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name || '',
      description: partner.description || '',
      logoUrl: partner.logoUrl || '',
      website: partner.website || '',
      tier: partner.tier || 'standard',
      featuredJobs: partner.featuredJobs || 0,
    });
    setShowForm(true);
  };

  const handleDelete = async (partner) => {
    if (!confirm(`Are you sure you want to delete "${partner.name}"?`)) return;

    try {
      const res = await fetch(`${API_URL}/featured/partners/${partner.slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await loadPartners();
      }
    } catch (err) {
      console.error('Failed to delete partner:', err);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingPartner(null);
    setFormData({
      name: '',
      description: '',
      logoUrl: '',
      website: '',
      tier: 'standard',
      featuredJobs: 0,
    });
    setError(null);
  };

  const getTierBadge = (tier) => {
    const tierConfig = PARTNER_TIERS.find((t) => t.value === tier) || PARTNER_TIERS[0];
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierConfig.color} text-white`}>
        {tierConfig.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-48"></div>
          <div className="h-64 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
          <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Partner Management</h1>
          <p className="text-slate-400 mb-6">Please sign in to manage featured partners.</p>
          <a
            href="/"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 inline-flex items-center gap-2"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-400" />
            Partner Management
          </h1>
          <p className="text-slate-400 mt-1">Manage featured partner organizations</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-500"
        >
          <Plus className="w-4 h-4" />
          Add Partner
        </button>
      </div>

      {/* Partner Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">
                {editingPartner ? 'Edit Partner' : 'Add New Partner'}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Partner Tier
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    {PARTNER_TIERS.map((tier) => (
                      <option key={tier.value} value={tier.value}>
                        {tier.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Featured Jobs Slots
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.featuredJobs}
                    onChange={(e) => setFormData({ ...formData, featuredJobs: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? 'Saving...' : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingPartner ? 'Update Partner' : 'Add Partner'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partners List */}
      {partners.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Partners Yet</h3>
          <p className="text-slate-400 mb-6">Add your first partner organization to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg inline-flex items-center gap-2 hover:bg-blue-500"
          >
            <Plus className="w-4 h-4" />
            Add First Partner
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 font-medium text-slate-400">Partner</th>
                <th className="text-left py-3 px-4 font-medium text-slate-400">Tier</th>
                <th className="text-center py-3 px-4 font-medium text-slate-400">Featured Jobs</th>
                <th className="text-center py-3 px-4 font-medium text-slate-400">Status</th>
                <th className="text-right py-3 px-4 font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      {partner.logoUrl ? (
                        <img
                          src={partner.logoUrl}
                          alt={partner.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{partner.name}</p>
                        {partner.website && (
                          <a
                            href={partner.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 flex items-center gap-1 hover:underline"
                          >
                            Website <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {getTierBadge(partner.tier)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-slate-300">{partner.featuredJobs || 0}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      partner.isActive 
                        ? 'bg-green-900/40 text-green-300' 
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {partner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(partner)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(partner)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

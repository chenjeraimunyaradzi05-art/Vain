"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

export default function SeekerProfilePage() {
  const { isAuthenticated } = useAuth();
  const [seekerProfile, setSeekerProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    budgetMin: '',
    budgetMax: '',
    preferredSuburbs: '',
    preferredStates: '',
    propertyTypes: '',
    bedroomsMin: '',
    bathroomsMin: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadProfile() {
      setLoading(true);
      try {
        const { ok, data } = await api('/rentals/seekers/profile');
        if (!ok) throw new Error(data?.error || 'Failed to load profile');
        setSeekerProfile(data?.profile || null);
        if (data?.profile) {
          setProfileForm({
            budgetMin: data.profile.budgetMin ?? '',
            budgetMax: data.profile.budgetMax ?? '',
            preferredSuburbs: (data.profile.preferredSuburbs || []).join(', '),
            preferredStates: (data.profile.preferredStates || []).join(', '),
            propertyTypes: (data.profile.propertyTypes || []).join(', '),
            bedroomsMin: data.profile.bedroomsMin ?? '',
            bathroomsMin: data.profile.bathroomsMin ?? '',
            notes: data.profile.notes ?? '',
          });
        }
      } catch (err) {
        setError(err?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [isAuthenticated]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!isAuthenticated) return;
    setSavingProfile(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        budgetMin: profileForm.budgetMin ? Number(profileForm.budgetMin) : undefined,
        budgetMax: profileForm.budgetMax ? Number(profileForm.budgetMax) : undefined,
        preferredSuburbs: profileForm.preferredSuburbs
          ? profileForm.preferredSuburbs.split(',').map((item) => item.trim()).filter(Boolean)
          : undefined,
        preferredStates: profileForm.preferredStates
          ? profileForm.preferredStates.split(',').map((item) => item.trim()).filter(Boolean)
          : undefined,
        propertyTypes: profileForm.propertyTypes
          ? profileForm.propertyTypes.split(',').map((item) => item.trim()).filter(Boolean)
          : undefined,
        bedroomsMin: profileForm.bedroomsMin ? Number(profileForm.bedroomsMin) : undefined,
        bathroomsMin: profileForm.bathroomsMin ? Number(profileForm.bathroomsMin) : undefined,
        notes: profileForm.notes || undefined,
      };

      const { ok, data } = await api('/rentals/seekers/profile', { method: 'POST', body: payload });
      if (!ok) throw new Error(data?.error || 'Failed to save profile');
      setSeekerProfile(data?.profile || null);
      setSuccess('Profile saved successfully.');
    } catch (err) {
      setError(err?.message || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/rentals" className="text-sm text-slate-400 hover:text-white">
          ← Back to rentals
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-8 mb-8 shadow-lg shadow-black/10">
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.18), transparent 45%), radial-gradient(circle at 85% 15%, rgba(99, 102, 241, 0.18), transparent 40%)',
        }} />
        <div className="relative">
          <h1 className="text-3xl font-bold text-white">My Renter Profile</h1>
          <p className="text-slate-300">Manage your preferences and let owners find you.</p>
          {seekerProfile?.updatedAt && (
            <p className="text-xs text-slate-400 mt-2">
              Last updated {new Date(seekerProfile.updatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 border border-red-900/60 bg-red-950/40 text-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 border border-emerald-900/60 bg-emerald-950/40 text-emerald-200 rounded-lg px-4 py-3">
          {success}
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-lg shadow-black/10 hover:border-slate-700 transition">
        {!isAuthenticated ? (
          <div className="text-sm text-slate-400">Sign in to manage your renter profile.</div>
        ) : loading ? (
          <div className="text-slate-400">Loading profile...</div>
        ) : (
          <form className="grid gap-4" onSubmit={handleSaveProfile}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs uppercase text-slate-500 mb-1">Min Budget</label>
                <input
                  value={profileForm.budgetMin}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, budgetMin: e.target.value }))}
                  placeholder="Min rent per week"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-500 mb-1">Max Budget</label>
                <input
                  value={profileForm.budgetMax}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, budgetMax: e.target.value }))}
                  placeholder="Max rent per week"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 mb-1">Preferred Suburbs</label>
              <input
                value={profileForm.preferredSuburbs}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, preferredSuburbs: e.target.value }))}
                placeholder="e.g. Redfern, Surry Hills (comma separated)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs uppercase text-slate-500 mb-1">Preferred States</label>
                <input
                  value={profileForm.preferredStates}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, preferredStates: e.target.value }))}
                  placeholder="e.g. NSW, QLD (comma separated)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-500 mb-1">Property Types</label>
                <input
                  value={profileForm.propertyTypes}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, propertyTypes: e.target.value }))}
                  placeholder="e.g. Apartment, House (comma separated)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs uppercase text-slate-500 mb-1">Min Bedrooms</label>
                <input
                  value={profileForm.bedroomsMin}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, bedroomsMin: e.target.value }))}
                  placeholder="Any"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-500 mb-1">Min Bathrooms</label>
                <input
                  value={profileForm.bathroomsMin}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, bathroomsMin: e.target.value }))}
                  placeholder="Any"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 mb-1">Notes for Owners</label>
              <textarea
                value={profileForm.notes}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Tell owners about yourself, your employment status, or rental history..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 min-h-[120px]"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                disabled={savingProfile}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-6 py-2 text-sm font-medium transition-colors"
              >
                {savingProfile ? 'Saving...' : seekerProfile ? 'Update Profile' : 'Create Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

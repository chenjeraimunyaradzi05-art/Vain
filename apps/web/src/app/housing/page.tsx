'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';
import { useAuth } from '@/hooks/useAuth';
import {
  Home,
  Search,
  Plus,
  MapPin,
  Users,
  Heart,
  Calendar,
  Shield,
  CreditCard,
  MessageSquare,
} from 'lucide-react';

const DEFAULT_FILTERS = {
  suburb: '',
  state: '',
  minRent: '',
  maxRent: '',
  bedrooms: '',
  housingType: 'APARTMENT',
  petsAllowed: false,
  childrenAllowed: true,
  firstNationsPreferred: true,
};

export default function HousingPage() {
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [listings, setListings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    suburb: '',
    state: '',
    postcode: '',
    rentPerWeek: '',
    bedrooms: '',
    bathrooms: '',
    availableFrom: '',
    housingType: 'APARTMENT',
  });
  const [creating, setCreating] = useState(false);
  const [saved, setSaved] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [seekerProfile, setSeekerProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({
    minBudget: '',
    maxBudget: '',
    preferredSuburbs: '',
    preferredStates: '',
    occupants: '1',
    hasChildren: false,
    hasPets: false,
    urgency: 'flexible',
  });

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.suburb) params.set('suburb', filters.suburb);
    if (filters.state) params.set('state', filters.state);
    if (filters.minRent) params.set('minRent', filters.minRent);
    if (filters.maxRent) params.set('maxRent', filters.maxRent);
    if (filters.bedrooms) params.set('bedrooms', filters.bedrooms);
    if (filters.housingType) params.set('housingType', filters.housingType);
    if (filters.petsAllowed) params.set('petsAllowed', 'true');
    if (filters.childrenAllowed) params.set('childrenAllowed', 'true');
    if (filters.firstNationsPreferred) params.set('firstNationsPreferred', 'true');
    return params.toString();
  }, [filters]);

  useEffect(() => {
    async function loadListings() {
      setLoading(true);
      setError(null);
      try {
        const { ok, data } = await api(`/housing/listings?${queryParams}`);
        if (!ok) throw new Error(data?.error || 'Failed to load listings');
        setListings(data?.listings || []);
        setTotal(data?.total || 0);
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Failed to load listings'));
      } finally {
        setLoading(false);
      }
    }
    loadListings();
  }, [queryParams]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function loadProfile() {
      const res = await api('/housing/profile');
      if (res.ok) {
        setSeekerProfile(res.data?.profile || null);
        if (res.data?.profile) {
          setProfileForm({
            minBudget: res.data.profile.minBudget || '',
            maxBudget: res.data.profile.maxBudget || '',
            preferredSuburbs: (res.data.profile.preferredSuburbs || []).join(', '),
            preferredStates: (res.data.profile.preferredStates || []).join(', '),
            occupants: String(res.data.profile.occupants || 1),
            hasChildren: !!res.data.profile.hasChildren,
            hasPets: !!res.data.profile.hasPets,
            urgency: res.data.profile.urgency || 'flexible',
          });
        }
      }
    }
    async function loadSaved() {
      const res = await api('/housing/saved');
      if (res.ok) setSaved(res.data?.saves || []);
    }
    async function loadInquiries() {
      const res = await api('/housing/inquiries/mine');
      if (res.ok) setInquiries(res.data?.inquiries || []);
    }
    loadProfile();
    loadSaved();
    loadInquiries();
  }, [isAuthenticated]);

  async function handleCreateListing(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) return;
    setCreating(true);
    try {
      const payload = {
        title: createForm.title,
        description: createForm.description,
        housingType: createForm.housingType,
        suburb: createForm.suburb,
        state: createForm.state,
        postcode: createForm.postcode,
        rentPerWeek: Number(createForm.rentPerWeek || 0),
        bedrooms: Number(createForm.bedrooms || 0),
        bathrooms: Number(createForm.bathrooms || 0),
        availableFrom: createForm.availableFrom || new Date().toISOString(),
        firstNationsPreferred: true,
      };

      const { ok, data } = await api('/housing/listings', { method: 'POST', body: payload });
      if (!ok) throw new Error(data?.error || 'Failed to create listing');
      setCreateForm({
        title: '',
        description: '',
        suburb: '',
        state: '',
        postcode: '',
        rentPerWeek: '',
        bedrooms: '',
        bathrooms: '',
        availableFrom: '',
        housingType: 'APARTMENT',
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create listing'));
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveListing(listingId: string) {
    const res = await api(`/housing/saved/${listingId}`, { method: 'POST' });
    if (res.ok) {
      const savedRes = await api('/housing/saved');
      if (savedRes.ok) setSaved(savedRes.data?.saves || []);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await api('/housing/profile', {
      method: 'POST',
      body: {
        minBudget: profileForm.minBudget ? Number(profileForm.minBudget) : undefined,
        maxBudget: profileForm.maxBudget ? Number(profileForm.maxBudget) : undefined,
        preferredSuburbs: profileForm.preferredSuburbs
          ? profileForm.preferredSuburbs.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        preferredStates: profileForm.preferredStates
          ? profileForm.preferredStates.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        occupants: Number(profileForm.occupants || 1),
        hasChildren: profileForm.hasChildren,
        hasPets: profileForm.hasPets,
        urgency: profileForm.urgency,
        isSearchable: true,
      },
    });
    if (res.ok) setSeekerProfile(res.data?.profile || null);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-white px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Home className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold">Housing Portal</h1>
            <p className="text-sm text-slate-400">Safe housing listings, partnerships and seeker profiles for everyone.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-emerald-400" /> Search Listings
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Suburb"
                  value={filters.suburb}
                  onChange={(e) => setFilters({ ...filters, suburb: e.target.value })}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="State"
                  value={filters.state}
                  onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Min rent"
                  value={filters.minRent}
                  onChange={(e) => setFilters({ ...filters, minRent: e.target.value })}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Max rent"
                  value={filters.maxRent}
                  onChange={(e) => setFilters({ ...filters, maxRent: e.target.value })}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Bedrooms"
                  value={filters.bedrooms}
                  onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
                />
                <select
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  value={filters.housingType}
                  onChange={(e) => setFilters({ ...filters, housingType: e.target.value })}
                >
                  <option value="APARTMENT">Apartment</option>
                  <option value="HOUSE">House</option>
                  <option value="TOWNHOUSE">Townhouse</option>
                  <option value="STUDIO">Studio</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Listings ({total})</h3>
              {loading ? (
                <p className="text-sm text-slate-400">Loading listings...</p>
              ) : (
                <div className="space-y-3">
                  {listings.map((listing) => (
                    <div key={listing.id} className="rounded-lg bg-slate-800/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{listing.title}</p>
                          <p className="text-xs text-slate-400">{listing.suburb}, {listing.state}</p>
                        </div>
                        <span className="text-sm text-emerald-300">${Number(listing.rentPerWeek || 0).toFixed(0)} / wk</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {listing.housingType}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {listing.bedrooms} bd</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleSaveListing(listing.id)}
                          className="px-3 py-2 rounded-lg bg-slate-700 text-xs flex items-center gap-2"
                        >
                          <Heart className="w-3 h-3" /> Save
                        </button>
                      </div>
                    </div>
                  ))}
                  {listings.length === 0 && <p className="text-sm text-slate-500">No listings found.</p>}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" /> Create Listing
              </h3>
              <form className="space-y-2" onSubmit={handleCreateListing}>
                <input
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                />
                <textarea
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Suburb"
                    value={createForm.suburb}
                    onChange={(e) => setCreateForm({ ...createForm, suburb: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="State"
                    value={createForm.state}
                    onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Postcode"
                    value={createForm.postcode}
                    onChange={(e) => setCreateForm({ ...createForm, postcode: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Rent / week"
                    value={createForm.rentPerWeek}
                    onChange={(e) => setCreateForm({ ...createForm, rentPerWeek: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Bedrooms"
                    value={createForm.bedrooms}
                    onChange={(e) => setCreateForm({ ...createForm, bedrooms: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Bathrooms"
                    value={createForm.bathrooms}
                    onChange={(e) => setCreateForm({ ...createForm, bathrooms: e.target.value })}
                  />
                  <input
                    type="date"
                    className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    value={createForm.availableFrom}
                    onChange={(e) => setCreateForm({ ...createForm, availableFrom: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-3 py-2 rounded-lg bg-emerald-600 text-sm"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Listing'}
                </button>
              </form>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" /> Seeker Profile
              </h3>
              <form className="space-y-2" onSubmit={handleProfileSave}>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Min budget"
                    value={profileForm.minBudget}
                    onChange={(e) => setProfileForm({ ...profileForm, minBudget: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Max budget"
                    value={profileForm.maxBudget}
                    onChange={(e) => setProfileForm({ ...profileForm, maxBudget: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Preferred suburbs"
                    value={profileForm.preferredSuburbs}
                    onChange={(e) => setProfileForm({ ...profileForm, preferredSuburbs: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Preferred states"
                    value={profileForm.preferredStates}
                    onChange={(e) => setProfileForm({ ...profileForm, preferredStates: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Occupants"
                    value={profileForm.occupants}
                    onChange={(e) => setProfileForm({ ...profileForm, occupants: e.target.value })}
                  />
                  <select
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    value={profileForm.urgency}
                    onChange={(e) => setProfileForm({ ...profileForm, urgency: e.target.value })}
                  >
                    <option value="urgent">Urgent</option>
                    <option value="soon">Soon</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profileForm.hasChildren}
                      onChange={(e) => setProfileForm({ ...profileForm, hasChildren: e.target.checked })}
                    />
                    Has children
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profileForm.hasPets}
                      onChange={(e) => setProfileForm({ ...profileForm, hasPets: e.target.checked })}
                    />
                    Has pets
                  </label>
                </div>
                <button type="submit" className="w-full px-3 py-2 rounded-lg bg-blue-600 text-sm">
                  Save Profile
                </button>
                {seekerProfile && (
                  <div className="text-xs text-slate-400">
                    Profile updated: {new Date(seekerProfile.updatedAt).toLocaleDateString()}
                  </div>
                )}
              </form>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" /> Saved Listings
              </h3>
              <div className="space-y-2">
                {saved.map((save) => (
                  <div key={save.id} className="rounded-lg bg-slate-800/60 p-3">
                    <p className="text-sm text-slate-100">{save.listing?.title || 'Saved listing'}</p>
                    <p className="text-xs text-slate-400">{save.listing?.suburb}</p>
                  </div>
                ))}
                {saved.length === 0 && <p className="text-sm text-slate-500">No saved listings.</p>}
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" /> My Inquiries
              </h3>
              <div className="space-y-2">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} className="rounded-lg bg-slate-800/60 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-100">{inquiry.listing?.title || 'Housing inquiry'}</p>
                      <span className="text-xs uppercase tracking-wide text-slate-400">{inquiry.status}</span>
                    </div>
                    <p className="text-xs text-slate-400">{inquiry.listing?.suburb}, {inquiry.listing?.state}</p>
                    {inquiry.responseMessage && (
                      <p className="mt-2 text-xs text-emerald-200">Response: {inquiry.responseMessage}</p>
                    )}
                  </div>
                ))}
                {inquiries.length === 0 && <p className="text-sm text-slate-500">No inquiries yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

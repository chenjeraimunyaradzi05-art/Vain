'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Camera,
  Save,
  ArrowLeft,
  Briefcase,
  Calendar,
  Globe,
  CheckCircle,
  Video,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import VideoResume from '@/components/VideoResume';

// Feminine theme constants
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

function getAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const AUSTRALIAN_STATES = [
  { value: '', label: 'Select state' },
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'NT', label: 'Northern Territory' },
  { value: 'ACT', label: 'Australian Capital Territory' },
];

export default function ProfilePage() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia',
    bio: '',
    website: '',
    linkedIn: '',
    mob: '',
    preferredContactMethod: 'email',
  });

  useEffect(() => {
    async function loadProfile() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/member/profile`, {
          headers: getAuthHeaders(token),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile((prev) => ({
              ...prev,
              ...data.profile,
              email: user?.email || data.profile.email || '',
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [token, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/member/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(token),
        },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to save profile');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ngurra-page flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-200 border-t-pink-600" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="ngurra-page flex items-center justify-center px-4">
        <div className="text-center ngurra-card p-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Please Sign In</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Sign in to edit your profile details.</p>
          <Link
            href="/signin?returnTo=/profile"
            className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-white font-medium"
            style={{ background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)` }}
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ngurra-page py-12 px-4">
      {/* Decorative Halos */}
      <div className="ngurra-halos">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Back link */}
        <Link
          href="/member/dashboard"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-pink-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div 
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-2"
              style={{ borderColor: accentPink }}
            >
              <User className="w-10 h-10 text-pink-400" />
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 p-1.5 rounded-full transition-colors text-white"
              style={{ background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)` }}
              aria-label="Change profile photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Edit Profile</h1>
            <p className="text-slate-500">Update your personal information</p>
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-emerald-700">Profile saved successfully!</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <section className="bg-white border border-slate-200 rounded-xl p-6" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
            <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-pink-600" />
              Basic Information
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 transition-all"
                  placeholder="Your first name"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 transition-all"
                  placeholder="Your last name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profile.email}
                    onChange={handleChange}
                    className="w-full bg-slate-100 border-2 border-slate-200 rounded-lg pl-10 pr-4 py-3 text-slate-500 cursor-not-allowed"
                    placeholder="you@example.com"
                    disabled
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">Contact support to change email</p>
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg pl-10 pr-4 py-3 text-slate-800 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 transition-all"
                    placeholder="04XX XXX XXX"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="bio" className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                rows={4}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 transition-all resize-y"
                placeholder="Tell us a bit about yourself..."
              />
            </div>
          </section>

          {/* Location */}
          <section className="bg-white border border-slate-200 rounded-xl p-6" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
            <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              Location
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="city" className="block text-xs font-semibold uppercase tracking-[0.15em] text-purple-600 mb-2">
                  City / Suburb
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={profile.city}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all"
                  placeholder="e.g., Sydney"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-xs font-semibold uppercase tracking-[0.15em] text-purple-600 mb-2">
                  State / Territory
                </label>
                <select
                  id="state"
                  name="state"
                  value={profile.state}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all"
                >
                  {AUSTRALIAN_STATES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="postcode" className="block text-xs font-semibold uppercase tracking-[0.15em] text-purple-600 mb-2">
                  Postcode
                </label>
                <input
                  type="text"
                  id="postcode"
                  name="postcode"
                  value={profile.postcode}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all"
                  placeholder="e.g., 2000"
                  maxLength={4}
                />
              </div>

              <div>
                <label htmlFor="mob" className="block text-xs font-semibold uppercase tracking-[0.15em] text-purple-600 mb-2">
                  Country / Mob (Optional)
                </label>
                <input
                  type="text"
                  id="mob"
                  name="mob"
                  value={profile.mob}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all"
                  placeholder="Your Nation or Mob"
                />
              </div>
            </div>
          </section>

          {/* Online Presence */}
          <section className="bg-white border border-slate-200 rounded-xl p-6" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
            <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-pink-600" />
              Online Presence
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="website" className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">
                  Website / Portfolio
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={profile.website}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 transition-all"
                  placeholder="https://yoursite.com"
                />
              </div>

              <div>
                <label htmlFor="linkedIn" className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  id="linkedIn"
                  name="linkedIn"
                  value={profile.linkedIn}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 transition-all"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            </div>
          </section>

          {/* Video Resume Section */}
          <section className="bg-white border border-slate-200 rounded-xl p-6" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Video className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Video Introduction</h2>
                <p className="text-sm text-slate-500">Stand out to employers with a personal video</p>
              </div>
            </div>
            <VideoResume />
          </section>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <Link
              href="/settings"
              className="text-slate-500 hover:text-pink-600 transition-colors"
            >
              Manage Account Settings →
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 text-white font-medium rounded-lg px-6 py-3 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ 
                background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
              }}
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Crown, User, Mail, Phone, MapPin, Briefcase, Globe, 
  Camera, Save, ArrowLeft, Shield, Eye, EyeOff,
  Sparkles, Gem, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';

export default function EditProfilePage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
    bio: '',
    website: '',
    linkedIn: '',
    profileVisibility: 'public',
    showEmail: true,
    showPhone: false
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load user profile data from API
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api('/member/profile');

        if (response.ok) {
          const data = response.data;
          const profile = data?.profile || data;
          setFormData({
            firstName: profile.firstName || profile.name?.split(' ')[0] || '',
            lastName: profile.lastName || profile.name?.split(' ').slice(1).join(' ') || '',
            email: profile.email || '',
            phone: profile.phone || '',
            location: profile.location || profile.city || '',
            headline: profile.headline || profile.title || '',
            bio: profile.bio || profile.about || '',
            website: profile.website || '',
            linkedIn: profile.linkedIn || profile.linkedinUrl || '',
            profileVisibility: profile.visibility || 'public',
            showEmail: profile.showEmail ?? true,
            showPhone: profile.showPhone ?? false
          });
        } else if (response.status === 401) {
          setInitialLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        // Fall back to mock data if API fails
        setFormData({
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+61 400 123 456',
          location: 'Sydney, NSW',
          headline: 'Community Development Coordinator',
          bio: 'Passionate about connecting First Nations communities with career opportunities.',
          website: 'https://sarahjohnson.com.au',
          linkedIn: 'linkedin.com/in/sarahjohnson',
          profileVisibility: 'public',
          showEmail: true,
          showPhone: false
        });
      } finally {
        setInitialLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api('/member/profile', {
        method: 'PATCH',
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          location: formData.location,
          headline: formData.headline,
          bio: formData.bio,
          website: formData.website,
          linkedinUrl: formData.linkedIn,
          visibility: formData.profileVisibility,
          showEmail: formData.showEmail,
          showPhone: formData.showPhone
        }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        if (response.status === 401) {
          throw new Error('Please log in to update your profile.');
        }
        throw new Error(response.data?.error || response.error || 'Failed to update profile');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#FFD700' }} />
          <p style={{ color: 'rgba(248, 246, 255, 0.7)' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/profile"
          className="inline-flex items-center gap-2 mb-8 transition-all duration-300"
          style={{ color: 'rgba(248, 246, 255, 0.7)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Profile</span>
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div 
            className="p-3 rounded-xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(80, 200, 120, 0.15))',
              border: '1px solid rgba(255, 215, 0, 0.3)'
            }}
          >
            <Crown className="w-8 h-8" style={{ color: '#FFD700' }} />
          </div>
          <div>
            <h1 
              className="text-3xl font-bold"
              style={{ 
                background: 'linear-gradient(135deg, #FFD700, #B76E79)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Edit Your Profile
            </h1>
            <p style={{ color: 'rgba(248, 246, 255, 0.6)' }}>Update your personal information and preferences</p>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div 
            className="flex items-center gap-3 p-4 rounded-xl mb-8"
            style={{ 
              background: message.type === 'success' 
                ? 'rgba(80, 200, 120, 0.15)' 
                : 'rgba(196, 30, 58, 0.15)',
              border: `1px solid ${message.type === 'success' ? 'rgba(80, 200, 120, 0.3)' : 'rgba(196, 30, 58, 0.3)'}`
            }}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" style={{ color: '#50C878' }} />
            ) : (
              <AlertCircle className="w-5 h-5" style={{ color: '#C41E3A' }} />
            )}
            <span style={{ color: 'rgba(248, 246, 255, 0.9)' }}>{message.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Photo Section */}
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
              border: '1px solid rgba(255, 215, 0, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>Profile Photo</h2>
            <div className="flex items-center gap-6">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center relative overflow-hidden"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(183, 110, 121, 0.3))',
                  border: '3px solid rgba(255, 215, 0, 0.4)'
                }}
              >
                <User className="w-12 h-12" style={{ color: 'rgba(248, 246, 255, 0.6)' }} />
              </div>
              <div className="flex-1">
                <button 
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(80, 200, 120, 0.15))',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    color: '#FFD700'
                  }}
                >
                  <Camera className="w-4 h-4" />
                  Change Photo
                </button>
                <p className="mt-2 text-sm" style={{ color: 'rgba(248, 246, 255, 0.5)' }}>
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
              border: '1px solid rgba(255, 215, 0, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFD700' }}>Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.4)' }} />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-300"
                    style={{ 
                      background: 'rgba(26, 15, 46, 0.5)',
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      color: 'rgba(248, 246, 255, 0.9)'
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.4)' }} />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-300"
                    style={{ 
                      background: 'rgba(26, 15, 46, 0.5)',
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      color: 'rgba(248, 246, 255, 0.9)'
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.4)' }} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-300"
                    style={{ 
                      background: 'rgba(26, 15, 46, 0.5)',
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      color: 'rgba(248, 246, 255, 0.9)'
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.4)' }} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-300"
                    style={{ 
                      background: 'rgba(26, 15, 46, 0.5)',
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      color: 'rgba(248, 246, 255, 0.9)'
                    }}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.4)' }} />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-300"
                    style={{ 
                      background: 'rgba(26, 15, 46, 0.5)',
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      color: 'rgba(248, 246, 255, 0.9)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Professional Info */}
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
              border: '1px solid rgba(255, 215, 0, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFD700' }}>Professional Information</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Headline
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.4)' }} />
                  <input
                    type="text"
                    name="headline"
                    value={formData.headline}
                    onChange={handleChange}
                    placeholder="e.g. Senior Software Developer"
                    className="w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-300"
                    style={{ 
                      background: 'rgba(26, 15, 46, 0.5)',
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      color: 'rgba(248, 246, 255, 0.9)'
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Tell us about yourself..."
                  className="w-full p-4 rounded-xl transition-all duration-300 resize-none"
                  style={{ 
                    background: 'rgba(26, 15, 46, 0.5)',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    color: 'rgba(248, 246, 255, 0.9)'
                  }}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.4)' }} />
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-300"
                      style={{ 
                        background: 'rgba(26, 15, 46, 0.5)',
                        border: '1px solid rgba(255, 215, 0, 0.2)',
                        color: 'rgba(248, 246, 255, 0.9)'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                    LinkedIn
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.4)' }} />
                    <input
                      type="text"
                      name="linkedIn"
                      value={formData.linkedIn}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-300"
                      style={{ 
                        background: 'rgba(26, 15, 46, 0.5)',
                        border: '1px solid rgba(255, 215, 0, 0.2)',
                        color: 'rgba(248, 246, 255, 0.9)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
              border: '1px solid rgba(255, 215, 0, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5" style={{ color: '#50C878' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#FFD700' }}>Privacy Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Profile Visibility
                </label>
                <select
                  name="profileVisibility"
                  value={formData.profileVisibility}
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl transition-all duration-300"
                  style={{ 
                    background: 'rgba(26, 15, 46, 0.5)',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    color: 'rgba(248, 246, 255, 0.9)'
                  }}
                >
                  <option value="public">Public - Everyone can see your profile</option>
                  <option value="connections">Connections Only - Only your connections</option>
                  <option value="private">Private - Only you can see your profile</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.5)' }} />
                  <span style={{ color: 'rgba(248, 246, 255, 0.8)' }}>Show email on profile</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="showEmail"
                    checked={formData.showEmail}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div 
                    className="w-11 h-6 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={{ 
                      background: formData.showEmail ? 'linear-gradient(135deg, #50C878, #FFD700)' : 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 215, 0, 0.3)'
                    }}
                  >
                    <div 
                      className="absolute top-[2px] left-[2px] w-5 h-5 rounded-full transition-all"
                      style={{ 
                        background: '#fff',
                        transform: formData.showEmail ? 'translateX(20px)' : 'translateX(0)'
                      }}
                    />
                  </div>
                </label>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.5)' }} />
                  <span style={{ color: 'rgba(248, 246, 255, 0.8)' }}>Show phone number on profile</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="showPhone"
                    checked={formData.showPhone}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div 
                    className="w-11 h-6 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={{ 
                      background: formData.showPhone ? 'linear-gradient(135deg, #50C878, #FFD700)' : 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 215, 0, 0.3)'
                    }}
                  >
                    <div 
                      className="absolute top-[2px] left-[2px] w-5 h-5 rounded-full transition-all"
                      style={{ 
                        background: '#fff',
                        transform: formData.showPhone ? 'translateX(20px)' : 'translateX(0)'
                      }}
                    />
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link
              href="/profile"
              className="px-6 py-3 rounded-full font-medium transition-all duration-300"
              style={{ 
                border: '2px solid rgba(255, 215, 0, 0.3)',
                color: 'rgba(248, 246, 255, 0.8)'
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all duration-300"
              style={{ 
                background: 'linear-gradient(135deg, #C41E3A, #E85B8A)',
                color: 'white',
                border: '2px solid #FFD700',
                boxShadow: '0 4px 20px rgba(196, 30, 58, 0.35), 0 0 15px rgba(255, 215, 0, 0.15)',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>

        {/* Decorative gem */}
        <div className="flex justify-center mt-12">
          <Gem className="w-8 h-8" style={{ color: 'rgba(255, 215, 0, 0.3)' }} />
        </div>
      </div>
    </div>
  );
}

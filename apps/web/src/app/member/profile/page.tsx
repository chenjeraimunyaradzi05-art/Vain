'use client';

import React, { useEffect, useState } from 'react';
import { User, MapPin, Briefcase, GraduationCap, Award, Edit2, Save, X, Plus, Trash2, Music, Film, Trophy, Camera, Video, Phone, Calendar } from 'lucide-react';
import api from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

interface Experience {
  id?: string;
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

interface Education {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string;
}

interface CulturalIdentity {
  nation?: string;
  isAboriginal?: boolean;
  isTorresStraitIslander?: boolean;
  isElder?: boolean;
  visibility: 'PUBLIC' | 'COMMUNITY' | 'PRIVATE';
}

interface LifestyleData {
  musicArtists: string[];
  musicGenres: string[];
  movies: string[];
  tvShows: string[];
  sportingTeams: string[];
  sportsPlayed: string[];
}

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  bio?: string;
  location?: string;
  phone?: string;
  dateOfBirth?: string;
  pronouns?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  culturalIdentity?: CulturalIdentity;
  skills: { id: string; name: string }[];
  experience: Experience[];
  education: Education[];
  lifestyle?: LifestyleData;
}

export default function MemberProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Profile>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { ok, data } = await api<Profile>('/member/profile');
      if (ok && data) {
        setProfile(data);
        setFormData(data);
      }
    } catch (error) {
      console.error('Failed to load profile', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const { ok, data } = await api<Profile>('/member/profile', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      if (ok && data) {
        setProfile(data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to save profile', error);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-slate-400">Manage your professional identity</p>
        </div>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isEditing 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isEditing ? <><Save className="w-4 h-4" /> Save Changes</> : <><Edit2 className="w-4 h-4" /> Edit Profile</>}
        </button>
      </div>

      <div className="grid gap-6">
        {/* Basic Info */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Basic Information
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ) : (
                <div className="text-white">{profile?.firstName}</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ) : (
                <div className="text-white">{profile?.lastName}</div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-1">Headline</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.headline || ''}
                  onChange={e => setFormData({...formData, headline: e.target.value})}
                  placeholder="e.g. Software Engineer at Tech Co"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ) : (
                <div className="text-white">{profile?.headline || <span className="text-slate-500 italic">No headline added</span>}</div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-1">About</label>
              {isEditing ? (
                <textarea
                  value={formData.bio || ''}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                  rows={4}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ) : (
                <div className="text-slate-300 whitespace-pre-wrap">{profile?.bio || <span className="text-slate-500 italic">No bio added</span>}</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Location</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g. Sydney, NSW"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {profile?.location || <span className="text-slate-500 italic">Not specified</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cultural Identity */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <span className="text-amber-400 text-2xl">🪃</span>
            Cultural Identity
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-1">Nation / Mob</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.culturalIdentity?.nation || ''}
                  onChange={e => setFormData({
                    ...formData, 
                    culturalIdentity: { ...formData.culturalIdentity, nation: e.target.value } as CulturalIdentity
                  })}
                  placeholder="e.g. Wiradjuri, Yolngu"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              ) : (
                <div className="text-white font-medium">{profile?.culturalIdentity?.nation || <span className="text-slate-500 italic">Not specified</span>}</div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEditing ? formData.culturalIdentity?.isAboriginal : profile?.culturalIdentity?.isAboriginal}
                  disabled={!isEditing}
                  onChange={e => setFormData({
                    ...formData,
                    culturalIdentity: { ...formData.culturalIdentity, isAboriginal: e.target.checked } as CulturalIdentity
                  })}
                  className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500 bg-slate-700"
                />
                <span className="text-slate-300">Aboriginal</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEditing ? formData.culturalIdentity?.isTorresStraitIslander : profile?.culturalIdentity?.isTorresStraitIslander}
                  disabled={!isEditing}
                  onChange={e => setFormData({
                    ...formData,
                    culturalIdentity: { ...formData.culturalIdentity, isTorresStraitIslander: e.target.checked } as CulturalIdentity
                  })}
                  className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500 bg-slate-700"
                />
                <span className="text-slate-300">Torres Strait Islander</span>
              </label>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEditing ? formData.culturalIdentity?.isElder : profile?.culturalIdentity?.isElder}
                  disabled={!isEditing}
                  onChange={e => setFormData({
                    ...formData,
                    culturalIdentity: { ...formData.culturalIdentity, isElder: e.target.checked } as CulturalIdentity
                  })}
                  className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500 bg-slate-700"
                />
                <span className="text-slate-300">Community Elder</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-1">Visibility</label>
              {isEditing ? (
                <select
                  value={formData.culturalIdentity?.visibility || 'COMMUNITY'}
                  onChange={e => setFormData({
                    ...formData,
                    culturalIdentity: { ...formData.culturalIdentity, visibility: e.target.value as any } as CulturalIdentity
                  })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="PUBLIC">Public (Visible to everyone)</option>
                  <option value="COMMUNITY">Community (Visible to members)</option>
                  <option value="PRIVATE">Private (Only me)</option>
                </select>
              ) : (
                <div className="text-slate-300">
                  {profile?.culturalIdentity?.visibility === 'PUBLIC' && 'Public'}
                  {profile?.culturalIdentity?.visibility === 'COMMUNITY' && 'Community Only'}
                  {profile?.culturalIdentity?.visibility === 'PRIVATE' && 'Private'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-400" />
            Personal Details
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-pink-500 outline-none"
                />
              ) : (
                <div className="text-white">{profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : <span className="text-slate-500 italic">Not set</span>}</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Pronouns</label>
              {isEditing ? (
                <select
                  value={formData.pronouns || ''}
                  onChange={e => setFormData({...formData, pronouns: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-pink-500 outline-none"
                >
                  <option value="">Prefer not to say</option>
                  <option value="she/her">she/her</option>
                  <option value="he/him">he/him</option>
                  <option value="they/them">they/them</option>
                  <option value="she/they">she/they</option>
                  <option value="he/they">he/they</option>
                </select>
              ) : (
                <div className="text-white">{profile?.pronouns || <span className="text-slate-500 italic">Not set</span>}</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Phone Number</label>
              {isEditing ? (
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="+61 4XX XXX XXX"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-white focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white">
                  <Phone className="w-4 h-4 text-slate-500" />
                  {profile?.phone || <span className="text-slate-500 italic">Not set</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Experience Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-400" />
              Experience
            </h2>
            {isEditing && (
              <button
                onClick={() => setFormData({
                  ...formData,
                  experience: [...(formData.experience || []), { title: '', company: '', startDate: '', description: '' }]
                })}
                className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>
          {(isEditing ? formData.experience : profile?.experience)?.length ? (
            <div className="space-y-4">
              {(isEditing ? formData.experience : profile?.experience)?.map((exp, i) => (
                <div key={exp.id || i} className="relative p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  {isEditing && (
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        experience: formData.experience?.filter((_, idx) => idx !== i)
                      })}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isEditing ? (
                    <div className="grid gap-3 pr-8">
                      <input
                        value={exp.title}
                        onChange={e => {
                          const updated = [...(formData.experience || [])];
                          updated[i] = { ...updated[i], title: e.target.value };
                          setFormData({ ...formData, experience: updated });
                        }}
                        placeholder="Job Title"
                        className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                      <input
                        value={exp.company}
                        onChange={e => {
                          const updated = [...(formData.experience || [])];
                          updated[i] = { ...updated[i], company: e.target.value };
                          setFormData({ ...formData, experience: updated });
                        }}
                        placeholder="Company"
                        className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="month"
                          value={exp.startDate}
                          onChange={e => {
                            const updated = [...(formData.experience || [])];
                            updated[i] = { ...updated[i], startDate: e.target.value };
                            setFormData({ ...formData, experience: updated });
                          }}
                          className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                        />
                        <input
                          type="month"
                          value={exp.endDate || ''}
                          disabled={exp.current}
                          onChange={e => {
                            const updated = [...(formData.experience || [])];
                            updated[i] = { ...updated[i], endDate: e.target.value };
                            setFormData({ ...formData, experience: updated });
                          }}
                          placeholder="End Date"
                          className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none disabled:opacity-50"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-400">
                        <input
                          type="checkbox"
                          checked={exp.current || false}
                          onChange={e => {
                            const updated = [...(formData.experience || [])];
                            updated[i] = { ...updated[i], current: e.target.checked, endDate: e.target.checked ? undefined : updated[i].endDate };
                            setFormData({ ...formData, experience: updated });
                          }}
                          className="rounded border-slate-600 text-purple-500 focus:ring-purple-500 bg-slate-700"
                        />
                        Currently working here
                      </label>
                      <textarea
                        value={exp.description || ''}
                        onChange={e => {
                          const updated = [...(formData.experience || [])];
                          updated[i] = { ...updated[i], description: e.target.value };
                          setFormData({ ...formData, experience: updated });
                        }}
                        rows={2}
                        placeholder="Description (optional)"
                        className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-medium text-white">{exp.title}</h4>
                      <p className="text-slate-400 text-sm">{exp.company}</p>
                      <p className="text-slate-500 text-xs mt-1">
                        {exp.startDate} — {exp.current ? 'Present' : exp.endDate}
                      </p>
                      {exp.description && <p className="text-slate-400 text-sm mt-2">{exp.description}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
              {isEditing ? 'Click "Add" to add your work experience' : 'No experience added yet'}
            </div>
          )}
        </div>

        {/* Education Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-400" />
              Education
            </h2>
            {isEditing && (
              <button
                onClick={() => setFormData({
                  ...formData,
                  education: [...(formData.education || []), { institution: '', degree: '', fieldOfStudy: '', startDate: '' }]
                })}
                className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>
          {(isEditing ? formData.education : profile?.education)?.length ? (
            <div className="space-y-4">
              {(isEditing ? formData.education : profile?.education)?.map((edu, i) => (
                <div key={edu.id || i} className="relative p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  {isEditing && (
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        education: formData.education?.filter((_, idx) => idx !== i)
                      })}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isEditing ? (
                    <div className="grid gap-3 pr-8">
                      <input
                        value={edu.institution}
                        onChange={e => {
                          const updated = [...(formData.education || [])];
                          updated[i] = { ...updated[i], institution: e.target.value };
                          setFormData({ ...formData, education: updated });
                        }}
                        placeholder="Institution"
                        className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                      <input
                        value={edu.degree}
                        onChange={e => {
                          const updated = [...(formData.education || [])];
                          updated[i] = { ...updated[i], degree: e.target.value };
                          setFormData({ ...formData, education: updated });
                        }}
                        placeholder="Degree (e.g. Bachelor of IT)"
                        className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                      <input
                        value={edu.fieldOfStudy}
                        onChange={e => {
                          const updated = [...(formData.education || [])];
                          updated[i] = { ...updated[i], fieldOfStudy: e.target.value };
                          setFormData({ ...formData, education: updated });
                        }}
                        placeholder="Field of Study"
                        className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="month"
                          value={edu.startDate}
                          onChange={e => {
                            const updated = [...(formData.education || [])];
                            updated[i] = { ...updated[i], startDate: e.target.value };
                            setFormData({ ...formData, education: updated });
                          }}
                          className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                        <input
                          type="month"
                          value={edu.endDate || ''}
                          onChange={e => {
                            const updated = [...(formData.education || [])];
                            updated[i] = { ...updated[i], endDate: e.target.value };
                            setFormData({ ...formData, education: updated });
                          }}
                          placeholder="End Date"
                          className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-medium text-white">{edu.degree}</h4>
                      <p className="text-slate-400 text-sm">{edu.institution}</p>
                      <p className="text-slate-500 text-xs mt-1">{edu.fieldOfStudy} · {edu.startDate} — {edu.endDate || 'Present'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
              {isEditing ? 'Click "Add" to add your education' : 'No education added yet'}
            </div>
          )}
        </div>

        {/* Lifestyle Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Music className="w-5 h-5 text-pink-400" />
            Lifestyle & Interests
          </h2>
          <div className="space-y-6">
            {/* Music */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
                <Music className="w-4 h-4" /> Favourite Music Artists
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={(formData.lifestyle?.musicArtists || []).join(', ')}
                  onChange={e => setFormData({
                    ...formData,
                    lifestyle: { ...formData.lifestyle as LifestyleData, musicArtists: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                  })}
                  placeholder="e.g. Baker Boy, Jessica Mauboy, Thelma Plum (comma separated)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile?.lifestyle?.musicArtists?.length ? profile.lifestyle.musicArtists.map(a => (
                    <span key={a} className="px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full text-sm text-pink-400">{a}</span>
                  )) : <span className="text-slate-500 italic text-sm">No artists added</span>}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
                <Music className="w-4 h-4" /> Favourite Genres
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={(formData.lifestyle?.musicGenres || []).join(', ')}
                  onChange={e => setFormData({
                    ...formData,
                    lifestyle: { ...formData.lifestyle as LifestyleData, musicGenres: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                  })}
                  placeholder="e.g. Hip Hop, R&B, Country, Traditional (comma separated)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile?.lifestyle?.musicGenres?.length ? profile.lifestyle.musicGenres.map(g => (
                    <span key={g} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-sm text-purple-400">{g}</span>
                  )) : <span className="text-slate-500 italic text-sm">No genres added</span>}
                </div>
              )}
            </div>

            {/* Movies & TV */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
                <Film className="w-4 h-4" /> Favourite Movies
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={(formData.lifestyle?.movies || []).join(', ')}
                  onChange={e => setFormData({
                    ...formData,
                    lifestyle: { ...formData.lifestyle as LifestyleData, movies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                  })}
                  placeholder="e.g. The Sapphires, Top End Wedding, Sweet Country (comma separated)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile?.lifestyle?.movies?.length ? profile.lifestyle.movies.map(m => (
                    <span key={m} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-blue-400">{m}</span>
                  )) : <span className="text-slate-500 italic text-sm">No movies added</span>}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
                <Film className="w-4 h-4" /> Favourite TV Shows
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={(formData.lifestyle?.tvShows || []).join(', ')}
                  onChange={e => setFormData({
                    ...formData,
                    lifestyle: { ...formData.lifestyle as LifestyleData, tvShows: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                  })}
                  placeholder="e.g. Total Control, Mystery Road, Cleverman (comma separated)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile?.lifestyle?.tvShows?.length ? profile.lifestyle.tvShows.map(s => (
                    <span key={s} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-sm text-indigo-400">{s}</span>
                  )) : <span className="text-slate-500 italic text-sm">No shows added</span>}
                </div>
              )}
            </div>

            {/* Sports */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
                <Trophy className="w-4 h-4" /> Favourite Sporting Teams
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={(formData.lifestyle?.sportingTeams || []).join(', ')}
                  onChange={e => setFormData({
                    ...formData,
                    lifestyle: { ...formData.lifestyle as LifestyleData, sportingTeams: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                  })}
                  placeholder="e.g. Sydney Swans, Indigenous All Stars, Matildas (comma separated)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile?.lifestyle?.sportingTeams?.length ? profile.lifestyle.sportingTeams.map(t => (
                    <span key={t} className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-sm text-amber-400">{t}</span>
                  )) : <span className="text-slate-500 italic text-sm">No teams added</span>}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
                <Trophy className="w-4 h-4" /> Sports You Play
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={(formData.lifestyle?.sportsPlayed || []).join(', ')}
                  onChange={e => setFormData({
                    ...formData,
                    lifestyle: { ...formData.lifestyle as LifestyleData, sportsPlayed: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                  })}
                  placeholder="e.g. Touch Football, Basketball, Surfing (comma separated)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile?.lifestyle?.sportsPlayed?.length ? profile.lifestyle.sportsPlayed.map(s => (
                    <span key={s} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-sm text-emerald-400">{s}</span>
                  )) : <span className="text-slate-500 italic text-sm">No sports added</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Photos & Videos */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            Photos & Videos
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4" /> Photo Gallery
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="aspect-square bg-slate-800/50 border border-dashed border-slate-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-cyan-500/40 transition-colors group">
                    <Plus className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </div>
                ))}
              </div>
              <p className="text-slate-600 text-xs mt-2">Click to upload photos (JPG, PNG up to 5MB)</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <Video className="w-4 h-4" /> Video Gallery
              </h3>
              <div className="space-y-2">
                {[1,2].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/50 border border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-cyan-500/40 transition-colors group">
                    <div className="w-16 h-12 rounded bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <p className="text-slate-600 text-sm group-hover:text-slate-400 transition-colors">Upload a video</p>
                  </div>
                ))}
              </div>
              <p className="text-slate-600 text-xs mt-2">MP4, MOV up to 50MB. Share your intro, portfolio, or day-in-the-life.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

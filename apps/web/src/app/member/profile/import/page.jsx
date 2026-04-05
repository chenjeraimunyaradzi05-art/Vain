"use client";

import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Linkedin, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  ChevronRight,
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  X,
  Check
} from 'lucide-react';
import useAuth from '../../../../hooks/useAuth';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';

export default function ProfileImportPage() {
  const { token, user } = useAuth();
  const [sources, setSources] = useState([]);
  const [linkedInStatus, setLinkedInStatus] = useState(null);
  const [linkedInPreview, setLinkedInPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Resume upload state
  const [resumeText, setResumeText] = useState('');
  const [parsedResume, setParsedResume] = useState(null);
  const [parsing, setParsing] = useState(false);
  
  // Import options
  const [importOptions, setImportOptions] = useState({
    name: true,
    avatar: true
  });

  const apiBase = API_BASE;

  useEffect(() => {
    if (!token) return;
    fetchImportSources();
  }, [token]);

  async function fetchImportSources() {
    try {
      const res = await fetch(`${apiBase}/profile-import/sources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
        
        // Check LinkedIn status
        const linkedIn = data.sources?.find(s => s.id === 'linkedin');
        if (linkedIn?.connected) {
          setLinkedInStatus({ connected: true, expired: linkedIn.expired });
        }
      }
    } catch (err) {
      console.error('Failed to fetch import sources:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLinkedInPreview() {
    if (!linkedInStatus?.connected || linkedInStatus?.expired) return;
    
    try {
      const res = await fetch(`${apiBase}/profile-import/linkedin/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLinkedInPreview(data);
      }
    } catch (err) {
      console.error('Failed to fetch LinkedIn preview:', err);
      setError('Failed to fetch LinkedIn data. Please try again.');
    }
  }

  async function handleLinkedInImport() {
    setImporting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`${apiBase}/profile-import/linkedin/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(importOptions)
      });
      
      if (res.ok) {
        const data = await res.json();
        setSuccessMessage(data.message);
        setLinkedInPreview(null);
      } else {
        const errorData = await res.json();
        setError(`Import failed: ${errorData.error}`);
      }
    } catch (err) {
      console.error('LinkedIn import error:', err);
      setError('Failed to import from LinkedIn. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  async function handleLinkedInDisconnect() {
    if (!confirm('Disconnect your LinkedIn account?')) return;
    
    try {
      const res = await fetch(`${apiBase}/profile-import/linkedin/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setLinkedInStatus(null);
        setLinkedInPreview(null);
        fetchImportSources();
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }

  async function handleResumeparse() {
    if (!resumeText.trim()) return;
    
    setParsing(true);
    try {
      const res = await fetch(`${apiBase}/profile-import/resume/parse`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: resumeText })
      });
      
      if (res.ok) {
        const data = await res.json();
        setParsedResume(data.parsed);
      } else {
        setError('Failed to parse resume. Please try again.');
      }
    } catch (err) {
      console.error('Parse error:', err);
      setError('Failed to analyze resume. Please try again.');
    } finally {
      setParsing(false);
    }
  }

  async function handleResumeImport() {
    if (!parsedResume) return;
    
    setImporting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`${apiBase}/profile-import/resume/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parsedResume)
      });
      
      if (res.ok) {
        const data = await res.json();
        setSuccessMessage(data.message);
        setParsedResume(null);
        setResumeText('');
      } else {
        const errorData = await res.json();
        setError(`Import failed: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Resume import error:', err);
      setError('Failed to import resume data. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
          <p className="text-amber-300 mb-6">Sign in to import your profile data and resume details.</p>
          <Link
            href="/signin?returnTo=/member/profile/import"
            className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-b border-slate-700">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="h-4 bg-slate-700 rounded w-48 mb-4 animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-700 animate-pulse" />
              <div>
                <div className="h-6 bg-slate-700 rounded w-56 mb-2 animate-pulse" />
                <div className="h-4 bg-slate-800 rounded w-72 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          <div className="bg-slate-800/80 rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-40 mb-4" />
            <div className="h-4 bg-slate-700 rounded w-full mb-2" />
            <div className="h-4 bg-slate-700 rounded w-2/3" />
          </div>
          <div className="bg-slate-800/80 rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-40 mb-4" />
            <div className="h-32 bg-slate-700 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <Link href="/member/dashboard" className="hover:text-white">Dashboard</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/profile" className="hover:text-white">Profile</Link>
            <ChevronRight className="w-4 h-4" />
            <span>Import</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Import Profile Data</h1>
              <p className="text-slate-300">Import your experience from LinkedIn or upload your resume</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-emerald-900/50 border border-emerald-700/50 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-200">{successMessage}</p>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-emerald-400 hover:text-emerald-300"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {error && (
          <div className="bg-red-900/50 border border-red-700/50 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LinkedIn Import Section */}
        <section className="bg-slate-800/80 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#0077B5] flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">LinkedIn Import</h2>
              <p className="text-sm text-slate-400">Import your name and profile photo from LinkedIn</p>
            </div>
          </div>

          {linkedInStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span>LinkedIn connected</span>
                {linkedInStatus.expired && (
                  <span className="text-amber-400 text-sm">(Token expired - please reconnect)</span>
                )}
              </div>

              {!linkedInPreview && !linkedInStatus.expired && (
                <button
                  onClick={fetchLinkedInPreview}
                  className="bg-[#0077B5] hover:bg-[#006097] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Preview Import
                </button>
              )}

              {linkedInPreview && (
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                  <h3 className="font-medium">Preview LinkedIn Data</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Current Profile */}
                    <div className="bg-slate-800 rounded-lg p-4">
                      <h4 className="text-sm text-slate-400 mb-3">Current Profile</h4>
                      <div className="flex items-center gap-3">
                        {linkedInPreview.current?.avatar ? (
                          <img src={toCloudinaryAutoUrl(linkedInPreview.current.avatar)} alt="" className="w-12 h-12 rounded-full" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{linkedInPreview.current?.name || 'Not set'}</p>
                        </div>
                      </div>
                    </div>

                    {/* LinkedIn Data */}
                    <div className="bg-slate-800 rounded-lg p-4 border border-[#0077B5]">
                      <h4 className="text-sm text-slate-400 mb-3">From LinkedIn</h4>
                      <div className="flex items-center gap-3">
                        {linkedInPreview.linkedIn?.avatar ? (
                          <img src={toCloudinaryAutoUrl(linkedInPreview.linkedIn.avatar)} alt="" className="w-12 h-12 rounded-full" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{linkedInPreview.linkedIn?.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Import Options */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importOptions.name}
                        onChange={(e) => setImportOptions(prev => ({ ...prev, name: e.target.checked }))}
                        className="rounded bg-slate-700 border-slate-600"
                      />
                      <span>Import name</span>
                      {linkedInPreview.canImport?.name && (
                        <span className="text-xs text-emerald-400">(different from current)</span>
                      )}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importOptions.avatar}
                        onChange={(e) => setImportOptions(prev => ({ ...prev, avatar: e.target.checked }))}
                        className="rounded bg-slate-700 border-slate-600"
                      />
                      <span>Import profile photo</span>
                      {linkedInPreview.canImport?.avatar && (
                        <span className="text-xs text-emerald-400">(different from current)</span>
                      )}
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleLinkedInImport}
                      disabled={importing}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Import Selected
                    </button>
                    <button
                      onClick={() => setLinkedInPreview(null)}
                      className="bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleLinkedInDisconnect}
                className="text-red-400 hover:text-red-300 text-sm underline"
              >
                Disconnect LinkedIn
              </button>
            </div>
          ) : (
            <a
              href={`${apiBase}/social-auth/linkedin?returnTo=/member/profile/import`}
              className="inline-flex items-center gap-2 bg-[#0077B5] hover:bg-[#006097] text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Linkedin className="w-5 h-5" />
              Connect LinkedIn
            </a>
          )}
        </section>

        {/* Resume Upload Section */}
        <section className="bg-slate-800/80 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Resume / CV Import</h2>
              <p className="text-sm text-slate-400">Paste your resume text to extract skills and experience</p>
            </div>
          </div>

          <div className="space-y-4">
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume content here... We'll extract your skills, experience, and education automatically."
              rows={8}
              aria-label="Resume text content"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50"
            />
            <p className="text-xs text-slate-500 mt-1">Tip: Copy text from your PDF or Word document and paste here</p>

            <button
              onClick={handleResumeparse}
              disabled={!resumeText.trim() || parsing}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {parsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyze Resume
            </button>

            {/* Parsed Results */}
            {parsedResume && (
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Extracted Information</h3>
                  <button onClick={() => setParsedResume(null)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* No data found */}
                {parsedResume.skills?.length === 0 && parsedResume.experience?.length === 0 && parsedResume.education?.length === 0 && (
                  <div className="text-center py-6 bg-slate-800 rounded-lg">
                    <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400">No skills or experience could be extracted.</p>
                    <p className="text-sm text-slate-500 mt-1">Try pasting more detailed resume content including job titles, skills, and qualifications.</p>
                  </div>
                )}

                {/* Skills */}
                {parsedResume.skills?.length > 0 && (
                  <div>
                    <h4 className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Skills Found ({parsedResume.skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedResume.skills.map((skill, i) => (
                        <span key={i} className="bg-amber-900/50 text-amber-300 px-2 py-1 rounded text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {parsedResume.experience?.length > 0 && (
                  <div>
                    <h4 className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Experience ({parsedResume.experience.length})
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {parsedResume.experience.slice(0, 5).map((exp, i) => (
                        <li key={i} className="text-slate-300">• {exp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Education */}
                {parsedResume.education?.length > 0 && (
                  <div>
                    <h4 className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Education ({parsedResume.education.length})
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {parsedResume.education.map((edu, i) => (
                        <li key={i} className="text-slate-300">• {edu}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={handleResumeImport}
                  disabled={importing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Import to Profile
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Info Section */}
        <section className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">Your data is protected</p>
              <p className="text-blue-300">
                We only import the data you choose. Your LinkedIn credentials are never stored, 
                and you can disconnect at any time. Imported data follows our 
                <Link href="/privacy" className="text-blue-400 hover:underline ml-1">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

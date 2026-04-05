'use client';

import React, { useEffect, useState } from 'react';
import { User, Briefcase, Star, Calendar, CheckCircle, MessageSquare, Leaf, Radar, Settings, FileText, FolderOpen, Image as ImageIcon, Video, Users, GraduationCap, File, Award, BookOpen, Heart, Gift, Smile, AlertTriangle, Download, Bell, Search, Trophy, Compass } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import DashboardGuard from '@/components/DashboardGuard';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';
// @ts-ignore
import AnnouncementsBanner from '@/components/AnnouncementsBanner';
// @ts-ignore
import SavedSearches from '@/components/SavedSearches';
// @ts-ignore
import CareerMilestones from '@/components/CareerMilestones';

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  bio?: string;
  location?: string;
  profileCompletionPercent?: number;
  // Add other fields as needed
}

interface Analytics {
  totalApplications: number;
  applicationsByStatus: Record<string, number>;
}

interface UploadedFile {
  id: string;
  originalName: string;
  fileType?: string;
  size: number;
  url: string;
}

interface Badge {
  id: string;
  name: string;
  imageUrl?: string;
}

interface Enrolment {
  id: string;
  progress: number;
  status: string;
  course?: { title: string };
}

interface MentorshipSession {
  id: string;
  scheduledAt: string;
  status: string;
  mentor?: { name: string };
  meetingUrl?: string;
}

interface WellnessAlert {
  id: string;
  message: string;
}

interface ReferralStats {
  totalReferrals?: number;
  pendingReferrals?: number;
  successfulReferrals?: number;
  count?: number;
}

function MemberDashboardContent() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [mentorshipSessions, setMentorshipSessions] = useState<MentorshipSession[]>([]);
  const [wellnessAlerts, setWellnessAlerts] = useState<WellnessAlert[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);

  useEffect(() => {
    async function load() {
      if (!isAuthenticated) return setLoading(false);
      
      setLoading(true);
      try {
        const [
          profileRes, 
          analyticsRes, 
          filesRes, 
          badgesRes, 
          enrolmentsRes, 
          sessionsRes, 
          wellnessRes, 
          referralRes
        ] = await Promise.all([
          api<Profile>('/member/profile'),
          api<Analytics>('/analytics/member'),
          api<{ files: UploadedFile[] }>('/uploads/me'),
          api<{ badges: Badge[] }>('/badges/user/me'),
          api<{ enrolments: Enrolment[] }>('/courses/my/enrolments'),
          api<{ sessions: MentorshipSession[] }>('/mentorship/sessions'),
          api<{ alerts: WellnessAlert[] }>('/wellness/alerts'),
          api<ReferralStats>('/referrals')
        ]);
        
        if (profileRes.ok && profileRes.data) setProfile(profileRes.data);
        if (analyticsRes.ok && analyticsRes.data) setAnalytics(analyticsRes.data);
        if (filesRes.ok && filesRes.data) setFiles(filesRes.data.files || []);
        if (badgesRes.ok && badgesRes.data) setBadges(badgesRes.data.badges || []);
        if (enrolmentsRes.ok && enrolmentsRes.data) setEnrolments(enrolmentsRes.data.enrolments || []);
        if (sessionsRes.ok && sessionsRes.data) setMentorshipSessions(sessionsRes.data.sessions || []);
        if (wellnessRes.ok && wellnessRes.data) setWellnessAlerts(wellnessRes.data.alerts || []);
        if (referralRes.ok && referralRes.data) setReferralStats(referralRes.data);
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Failed to load dashboard data'));
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-300 dark:border-slate-700 border-t-blue-500" />
        <span className="text-slate-500 dark:text-slate-400">Loading your dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 rounded">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 text-slate-900 dark:text-slate-100 bg-slate-50/60 dark:bg-transparent rounded-2xl">
      {/* Announcements Banner - Top Priority */}
      <AnnouncementsBanner />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <li><a href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</a></li>
          <li><span className="text-slate-400 dark:text-slate-600">/</span></li>
          <li className="text-slate-900 dark:text-white">Member Dashboard</li>
        </ol>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-600/20 rounded-lg">
          <User className="w-6 h-6 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold">Member Dashboard</h1>
      </div>

      <div className="space-y-6">
        {/* Application Stats */}
        {analytics && (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 p-4 rounded-lg text-center shadow-sm dark:shadow-none">
              <Briefcase className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <div className="text-2xl font-bold text-blue-400">{analytics.totalApplications || 0}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Applications</div>
            </div>
            <div className="bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 p-4 rounded-lg text-center shadow-sm dark:shadow-none">
              <Star className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-2xl font-bold text-purple-400">{analytics.applicationsByStatus?.SHORTLISTED || 0}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Shortlisted</div>
            </div>
            <div className="bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 p-4 rounded-lg text-center shadow-sm dark:shadow-none">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
              <div className="text-2xl font-bold text-yellow-400">{analytics.applicationsByStatus?.INTERVIEW_SCHEDULED || 0}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Interviews</div>
            </div>
            <div className="bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 p-4 rounded-lg text-center shadow-sm dark:shadow-none">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <div className="text-2xl font-bold text-green-400">{analytics.applicationsByStatus?.HIRED || 0}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Hired</div>
            </div>
          </div>
        )}

        {/* Quick Discovery Actions */}
        <div className="grid gap-4 md:grid-cols-4">
          <a href="/member/saved-jobs" className="group bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-900/40 border border-indigo-200 dark:border-indigo-800/30 p-4 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600/50 shadow-sm hover:shadow-md transition-all">
            <Search className="w-6 h-6 text-indigo-400 mb-2" />
            <div className="font-medium text-sm">Saved Searches</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Get job alerts</div>
          </a>
          <a href="/career" className="group bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900/40 border border-emerald-200 dark:border-emerald-800/30 p-4 rounded-xl hover:border-emerald-400 dark:hover:border-emerald-600/50 shadow-sm hover:shadow-md transition-all">
            <Trophy className="w-6 h-6 text-emerald-400 mb-2" />
            <div className="font-medium text-sm">Career Progress</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Track milestones</div>
          </a>
          <a href="/apprenticeships" className="group bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900/40 border border-amber-200 dark:border-amber-800/30 p-4 rounded-xl hover:border-amber-400 dark:hover:border-amber-600/50 shadow-sm hover:shadow-md transition-all">
            <GraduationCap className="w-6 h-6 text-amber-400 mb-2" />
            <div className="font-medium text-sm">Apprenticeships</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Paid training</div>
          </a>
          <a href="/mentorship" className="group bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-900/40 border border-rose-200 dark:border-rose-800/30 p-4 rounded-xl hover:border-rose-400 dark:hover:border-rose-600/50 shadow-sm hover:shadow-md transition-all">
            <Compass className="w-6 h-6 text-rose-400 mb-2" />
            <div className="font-medium text-sm">Find Mentor</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Get guidance</div>
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content Column */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Profile Completion */}
            <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  Profile Completion
                </h2>
                <span className="text-sm font-medium text-blue-400">{profile?.profileCompletionPercent || 0}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 mb-4">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${profile?.profileCompletionPercent || 0}%` }}></div>
              </div>
              <div className="flex gap-3">
                <a href="/member/profile" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Update Profile
                </a>
                <a href="/member/resume" className="text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Resume Builder
                </a>
              </div>
            </div>

            {/* Career Milestones */}
            <CareerMilestones />

            {/* Recent Files */}
            <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-none">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-yellow-400" />
                Recent Files
              </h2>
              {files.length > 0 ? (
                <div className="space-y-3">
                  {files.slice(0, 3).map((file: UploadedFile) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-slate-100/70 dark:bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {file.fileType?.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-purple-400" /> : 
                         file.fileType?.startsWith('video/') ? <Video className="w-5 h-5 text-red-400" /> :
                         <File className="w-5 h-5 text-slate-400" />}
                        <div>
                          <div className="font-medium text-sm">{file.originalName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                  <a href="/member/photos" className="block text-center text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mt-2">View all files</a>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
                  No files uploaded yet.
                  <div className="mt-2">
                    <a href="/member/photos" className="text-blue-400 hover:underline">Upload documents</a>
                  </div>
                </div>
              )}
            </div>

            {/* Enrolled Courses */}
            <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-none">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                My Learning
              </h2>
              {enrolments.length > 0 ? (
                <div className="space-y-3">
                  {enrolments.slice(0, 3).map((enrolment: Enrolment) => (
                    <div key={enrolment.id} className="p-3 bg-slate-100/70 dark:bg-slate-800/50 rounded-lg">
                      <div className="font-medium text-sm">{enrolment.course?.title}</div>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{enrolment.progress}% Complete</span>
                        <span>{enrolment.status}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${enrolment.progress}%` }}></div>
                      </div>
                    </div>
                  ))}
                  <a href="/member/courses" className="block text-center text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mt-2">View all courses</a>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
                  Not enrolled in any courses.
                  <div className="mt-2">
                    <a href="/courses" className="text-blue-400 hover:underline">Browse courses</a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            
            {/* Wellness Check */}
            <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/40 dark:to-slate-900/40 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-6 shadow-sm dark:shadow-none">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-400" />
                Wellness Check
              </h2>
              {wellnessAlerts.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {wellnessAlerts.map((alert: WellnessAlert) => (
                    <div key={alert.id} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/20 p-2 rounded">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{alert.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Your wellness metrics are looking good! Keep it up.</p>
              )}
              <a href="/member/wellness" className="block w-full text-center bg-emerald-600/10 hover:bg-emerald-600/20 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 py-2 rounded-lg text-sm transition-colors">
                Open Wellness Hub
              </a>
            </div>

            {/* Mentorship Sessions */}
            <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-none">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Upcoming Sessions
              </h2>
              {mentorshipSessions.length > 0 ? (
                <div className="space-y-3">
                  {mentorshipSessions.slice(0, 2).map((session: MentorshipSession) => (
                    <div key={session.id} className="p-3 bg-slate-100/70 dark:bg-slate-800/50 rounded-lg border-l-2 border-purple-500">
                      <div className="font-medium text-sm">{session.mentor?.name || 'Mentor Session'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {new Date(session.scheduledAt).toLocaleDateString()} at {new Date(session.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded hover:bg-purple-600/30">
                        Join Meeting
                      </a>
                    </div>
                  ))}
                  <a href="/member/mentorship" className="block text-center text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mt-2">View schedule</a>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
                  No upcoming sessions.
                  <div className="mt-2">
                    <a href="/mentorship" className="text-blue-400 hover:underline">Find a mentor</a>
                  </div>
                </div>
              )}
            </div>

            {/* Badges & Achievements */}
            <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-none">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Badges
              </h2>
              {badges.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {badges.map((badge: Badge) => (
                    <div key={badge.id} className="relative aspect-square bg-slate-100/70 dark:bg-slate-800 rounded-lg flex items-center justify-center p-2" title={badge.name}>
                      {badge.imageUrl ? (
                        <OptimizedImage
                          src={toCloudinaryAutoUrl(badge.imageUrl)}
                          alt={badge.name}
                          fill
                          sizes="(min-width: 768px) 72px, 25vw"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Award className="w-6 h-6 text-amber-500" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
                  Start completing courses to earn badges!
                </div>
              )}
            </div>

            {/* Referrals */}
            <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/40 dark:to-slate-900/40 border border-blue-200 dark:border-blue-800/30 rounded-xl p-6 shadow-sm dark:shadow-none">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Gift className="w-5 h-5 text-blue-400" />
                Refer & Earn
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Invite friends and earn rewards when they join.
              </p>
              <div className="flex justify-between items-center mb-4 text-sm">
                <span className="text-slate-500 dark:text-slate-400">Referrals:</span>
                <span className="font-bold text-slate-900 dark:text-white">{referralStats?.count || 0}</span>
              </div>
              <a href="/member/referrals" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm transition-colors">
                Invite Friends
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function MemberDashboard() {
  return (
    <DashboardGuard>
      <MemberDashboardContent />
    </DashboardGuard>
  );
}

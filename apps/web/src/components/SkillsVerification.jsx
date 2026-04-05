'use client';

/**
 * Skills Verification Component
 * 
 * Features:
 * - Skill assessment tests
 * - Badge display and management
 * - Peer endorsement requests
 * - Credential verification
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';
import useAuth from '@/hooks/useAuth';
import {
  Award,
  CheckCircle,
  Clock,
  Star,
  Users,
  FileCheck,
  ExternalLink,
  Send,
  ChevronRight,
  AlertCircle,
  Loader2,
  Trophy,
  Target,
  Briefcase,
  GraduationCap,
  Shield,
  UserCheck,
  Plus,
  X
} from 'lucide-react';

// Theme colors
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

// Badge level configurations
const BADGE_LEVELS = {
  bronze: { icon: '🥉', color: 'from-orange-400 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  silver: { icon: '🥈', color: 'from-slate-300 to-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
  gold: { icon: '🥇', color: 'from-yellow-400 to-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  platinum: { icon: '💎', color: 'from-purple-400 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' }
};

// Verification type icons
const VERIFICATION_ICONS = {
  self_reported: Target,
  peer_endorsed: Users,
  assessment_passed: FileCheck,
  credential_verified: Award,
  employer_verified: Briefcase
};

function BadgeCard({ badge }) {
  const level = BADGE_LEVELS[badge.level?.toLowerCase()] || BADGE_LEVELS.bronze;
  
  return (
    <div className={`${level.bg} ${level.border} border rounded-xl p-4 hover:scale-105 transition-transform`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{level.icon}</span>
        {badge.verified && (
          <div className="flex items-center gap-1 bg-green-900/50 text-green-400 px-2 py-0.5 rounded text-xs">
            <CheckCircle className="w-3 h-3" />
            Verified
          </div>
        )}
      </div>
      
      <h4 className="font-semibold text-white mb-1">{badge.skillName}</h4>
      <p className="text-sm text-slate-400 mb-2">{badge.level} Level</p>
      
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Clock className="w-3 h-3" />
        Earned {new Date(badge.issuedAt).toLocaleDateString('en-AU')}
      </div>
    </div>
  );
}

function AssessmentCard({ assessment, onStart }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-purple-500/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
          {assessment.category}
        </span>
      </div>
      
      <h4 className="font-semibold text-white mb-2">{assessment.name}</h4>
      
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {assessment.duration} mins
        </div>
        <div className="flex items-center gap-1">
          <FileCheck className="w-4 h-4" />
          {assessment.questionCount} questions
        </div>
        <div className="flex items-center gap-1">
          <Target className="w-4 h-4" />
          Pass: {assessment.passingScore}%
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="w-4 h-4" />
          {assessment.levels?.join(', ')}
        </div>
      </div>
      
      <button
        onClick={() => onStart(assessment)}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        Start Assessment
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function EndorsementRequestModal({ isOpen, onClose, onSubmit, skills }) {
  const [selectedSkill, setSelectedSkill] = useState('');
  const [endorserEmail, setEndorserEmail] = useState('');
  const [relationship, setRelationship] = useState('colleague');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ skillId: selectedSkill, endorserEmail, relationship });
      onClose();
    } catch (error) {
      console.error('Failed to request endorsement:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Request Endorsement</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Skill to Endorse
            </label>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              required
            >
              <option value="">Select a skill...</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>{skill.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Endorser's Email
            </label>
            <input
              type="email"
              value={endorserEmail}
              onChange={(e) => setEndorserEmail(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              placeholder="colleague@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Your Relationship
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            >
              <option value="colleague">Colleague</option>
              <option value="manager">Manager/Supervisor</option>
              <option value="client">Client</option>
              <option value="mentor">Mentor</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function CredentialVerificationModal({ isOpen, onClose, onVerify }) {
  const [credentialUrl, setCredentialUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const verified = await onVerify(credentialUrl);
      setResult(verified);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Verify Credential</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Paste the URL of your Open Badge or digital credential to verify and add it to your profile.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Credential URL
            </label>
            <input
              type="url"
              value={credentialUrl}
              onChange={(e) => setCredentialUrl(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              placeholder="https://badgr.io/backpack/badges/..."
              required
            />
          </div>

          {result && (
            <div className={`p-3 rounded-lg ${result.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              <div className="flex items-center gap-2">
                {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                {result.success ? 'Credential verified and added!' : result.error}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Verify Credential
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SkillsVerification() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('badges');
  const [badges, setBadges] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [endorsementModalOpen, setEndorsementModalOpen] = useState(false);
  const [credentialModalOpen, setCredentialModalOpen] = useState(false);
  const [userSkills, setUserSkills] = useState([]);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const [badgesRes, assessmentsRes, verificationsRes] = await Promise.all([
        api('/skills/badges'),
        api('/skills/assessments'),
        api('/skills/verifications')
      ]);

      if (badgesRes.ok) {
        setBadges(badgesRes.data.badges || []);
      }
      if (assessmentsRes.ok) {
        setAssessments(assessmentsRes.data.assessments || []);
      }
      if (verificationsRes.ok) {
        setVerifications(verificationsRes.data.verifications || []);
        setUserSkills(verificationsRes.data.skills || []);
      }
    } catch (error) {
      console.error('Failed to fetch skills data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartAssessment = async (assessment) => {
    try {
      const { ok, data } = await api(`/skills/assessments/${assessment.id}/start`, {
        method: 'POST'
      });
      
      if (ok) {
        // Navigate to assessment page
        window.location.href = `/assessments/${data.assessmentId}`;
      }
    } catch (error) {
      console.error('Failed to start assessment:', error);
    }
  };

  const handleRequestEndorsement = async ({ skillId, endorserEmail, relationship }) => {
    const { ok } = await api('/skills/endorsement/request', {
      method: 'POST',
      body: { skillId, endorserEmail, relationship }
    });
    
    if (!ok) throw new Error('Failed to request endorsement');
    await fetchData();
  };

  const handleVerifyCredential = async (credentialUrl) => {
    const { ok, data } = await api('/skills/verify-credential', {
      method: 'POST',
      body: { credentialUrl }
    });
    
    if (!ok) throw new Error('Failed to verify credential');
    await fetchData();
    return data;
  };

  const tabs = [
    { id: 'badges', label: 'My Badges', icon: Award, count: badges.length },
    { id: 'assessments', label: 'Assessments', icon: GraduationCap, count: assessments.length },
    { id: 'verifications', label: 'Verifications', icon: Shield, count: verifications.length }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Skills Verification</h2>
          <p className="text-slate-400">Verify your skills and earn badges</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setEndorsementModalOpen(true)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Users className="w-4 h-4" />
            Request Endorsement
          </button>
          <button
            onClick={() => setCredentialModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Credential
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'badges' && (
        <div>
          {badges.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No badges yet</h3>
              <p className="text-slate-400 mb-4">Complete assessments or get endorsements to earn badges</p>
              <button
                onClick={() => setActiveTab('assessments')}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Take an Assessment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'assessments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              onStart={handleStartAssessment}
            />
          ))}
        </div>
      )}

      {activeTab === 'verifications' && (
        <div className="space-y-3">
          {verifications.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No verifications yet</h3>
              <p className="text-slate-400">Your skill verifications will appear here</p>
            </div>
          ) : (
            verifications.map((verification) => {
              const Icon = VERIFICATION_ICONS[verification.type] || CheckCircle;
              return (
                <div
                  key={verification.id}
                  className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-900/50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{verification.skillName}</h4>
                    <p className="text-sm text-slate-400 capitalize">
                      {verification.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    verification.status === 'verified'
                      ? 'bg-green-900/50 text-green-400'
                      : verification.status === 'pending'
                      ? 'bg-yellow-900/50 text-yellow-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {verification.status}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modals */}
      <EndorsementRequestModal
        isOpen={endorsementModalOpen}
        onClose={() => setEndorsementModalOpen(false)}
        onSubmit={handleRequestEndorsement}
        skills={userSkills}
      />
      <CredentialVerificationModal
        isOpen={credentialModalOpen}
        onClose={() => setCredentialModalOpen(false)}
        onVerify={handleVerifyCredential}
      />
    </div>
  );
}

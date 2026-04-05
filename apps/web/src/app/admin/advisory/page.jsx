"use client";

import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Vote, 
  Plus, 
  Trash2, 
  Edit2,
  ChevronRight,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  Calendar
} from 'lucide-react';
import useAuth from '../../../hooks/useAuth';
import { useNotifications } from '../../../components/notifications/NotificationProvider';

const PROPOSAL_STATUSES = ['OPEN', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'PENDING'];
const MEMBER_ROLES = ['CHAIR', 'VICE_CHAIR', 'MEMBER', 'ELDER'];

export default function AdminAdvisoryPage() {
  const { token, user } = useAuth();
  const { showNotification } = useNotifications();
  const [members, setMembers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  
  // Modal states
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddProposal, setShowAddProposal] = useState(false);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  
  // Form states
  const [newMember, setNewMember] = useState({ userId: '', role: 'MEMBER', region: '', bio: '' });
  const [newProposal, setNewProposal] = useState({ title: '', summary: '', fullText: '', category: 'GENERAL', votingEnds: '' });
  const [newMeeting, setNewMeeting] = useState({ title: '', date: '', summary: '', attendees: 0, decisions: 0 });

  const apiBase = API_BASE;

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token]);

  async function fetchData() {
    try {
      const [membersRes, proposalsRes, meetingsRes] = await Promise.all([
        fetch(`${apiBase}/advisory/members`),
        fetch(`${apiBase}/advisory/proposals`),
        fetch(`${apiBase}/advisory/meetings`)
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }
      if (proposalsRes.ok) {
        const data = await proposalsRes.json();
        setProposals(data.proposals || []);
      }
      if (meetingsRes.ok) {
        const data = await meetingsRes.json();
        setMeetings(data.meetings || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/advisory/members`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newMember)
      });
      
      if (res.ok) {
        setShowAddMember(false);
        setNewMember({ userId: '', role: 'MEMBER', region: '', bio: '' });
        fetchData();
      } else {
        const error = await res.json();
        showNotification({ message: `Error: ${error.error}`, variant: 'error' });
      }
    } catch (err) {
      console.error('Add member error:', err);
    }
  }

  async function handleRemoveMember(id) {
    if (!confirm('Remove this council member?')) return;
    
    try {
      const res = await fetch(`${apiBase}/advisory/members/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Remove member error:', err);
    }
  }

  async function handleAddProposal(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/advisory/proposals`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProposal)
      });
      
      if (res.ok) {
        setShowAddProposal(false);
        setNewProposal({ title: '', summary: '', fullText: '', category: 'GENERAL', votingEnds: '' });
        fetchData();
      } else {
        const error = await res.json();
        showNotification({ message: `Error: ${error.error}`, variant: 'error' });
      }
    } catch (err) {
      console.error('Add proposal error:', err);
    }
  }

  async function handleUpdateProposalStatus(id, status) {
    try {
      const res = await fetch(`${apiBase}/advisory/proposals/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Update proposal error:', err);
    }
  }

  async function handleAddMeeting(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/advisory/meetings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newMeeting)
      });
      
      if (res.ok) {
        setShowAddMeeting(false);
        setNewMeeting({ title: '', date: '', summary: '', attendees: 0, decisions: 0 });
        showNotification({ message: 'Meeting minutes added!', variant: 'success' });
      } else {
        const error = await res.json();
        showNotification({ message: `Error: ${error.error}`, variant: 'error' });
      }
    } catch (err) {
      console.error('Add meeting error:', err);
    }
  }

  if (!token || user?.userType !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <Link href="/admin" className="text-amber-400 hover:underline">
            Go to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <Link href="/admin" className="hover:text-white">Admin</Link>
            <ChevronRight className="w-4 h-4" />
            <span>Advisory Council Management</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Advisory Council Management</h1>
                <p className="text-slate-300">Manage council members, proposals, and meetings</p>
              </div>
            </div>
            <Link 
              href="/community/advisory" 
              className="text-slate-400 hover:text-white text-sm underline hidden sm:inline"
            >
              View Public Page →
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 min-w-max" role="tablist" aria-label="Advisory management sections">
            {[
              { id: 'members', label: 'Members', icon: Users },
              { id: 'proposals', label: 'Proposals', icon: Vote },
              { id: 'meetings', label: 'Meetings', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-amber-500 text-white' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin" />
          </div>
        ) : (
          <>
            {/* Members Tab */}
            {activeTab === 'members' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Council Members ({members.length})</h2>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Member
                  </button>
                </div>

                <div className="bg-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Name</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Role</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Region</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Joined</th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {members.map((member, i) => (
                        <tr key={member.id || i} className="hover:bg-slate-700/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm">
                                {member.name?.[0] || 'M'}
                              </div>
                              <span className="font-medium">{member.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">{member.role}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">{member.region || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-400">
                            {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Proposals Tab */}
            {activeTab === 'proposals' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Proposals ({proposals.length})</h2>
                  <button
                    onClick={() => setShowAddProposal(true)}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Proposal
                  </button>
                </div>

                <div className="space-y-4">
                  {proposals.map((proposal, i) => (
                    <div key={proposal.id || i} className="bg-slate-800 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              proposal.status === 'OPEN' ? 'bg-blue-600' :
                              proposal.status === 'APPROVED' ? 'bg-emerald-600' :
                              proposal.status === 'REJECTED' ? 'bg-red-600' :
                              proposal.status === 'IMPLEMENTED' ? 'bg-purple-600' :
                              'bg-amber-600'
                            }`}>
                              {proposal.status}
                            </span>
                            <span className="text-xs text-slate-400">{proposal.category}</span>
                          </div>
                          <h3 className="font-semibold">{proposal.title}</h3>
                          <p className="text-sm text-slate-400 mt-1">{proposal.summary}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span>Created: {new Date(proposal.createdAt).toLocaleDateString()}</span>
                            <span>Votes: {proposal.voteCount || 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={proposal.status}
                            onChange={(e) => handleUpdateProposalStatus(proposal.id, e.target.value)}
                            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                          >
                            {PROPOSAL_STATUSES.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meetings Tab */}
            {activeTab === 'meetings' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Meeting Minutes ({meetings.length})</h2>
                  <button
                    onClick={() => setShowAddMeeting(true)}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Meeting
                  </button>
                </div>

                {meetings.length > 0 ? (
                  <div className="space-y-4">
                    {meetings.map((meeting, i) => (
                      <div key={meeting.id || i} className="bg-slate-800 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-900/50 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{meeting.title}</h4>
                            <p className="text-sm text-slate-400 mt-1">{meeting.summary}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                              <span>{new Date(meeting.date).toLocaleDateString()}</span>
                              {meeting.attendees > 0 && <span>{meeting.attendees} attendees</span>}
                              {meeting.decisions > 0 && <span>{meeting.decisions} decisions</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-800/50 rounded-xl p-8 text-center">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No meeting minutes recorded yet</p>
                    <p className="text-sm text-slate-500 mt-1">Click "Add Meeting" to record meeting minutes</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Add Council Member</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label htmlFor="userId" className="block text-sm text-slate-400 mb-1">User ID</label>
                <input
                  id="userId"
                  type="text"
                  value={newMember.userId}
                  onChange={(e) => setNewMember(prev => ({ ...prev, userId: e.target.value }))}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="User ID to add as member"
                />
              </div>
              <div>
                <label htmlFor="memberRole" className="block text-sm text-slate-400 mb-1">Role</label>
                <select
                  id="memberRole"
                  value={newMember.role}
                  onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {MEMBER_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="memberRegion" className="block text-sm text-slate-400 mb-1">Region</label>
                <input
                  id="memberRegion"
                  type="text"
                  value={newMember.region}
                  onChange={(e) => setNewMember(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., Northern Territory"
                />
              </div>
              <div>
                <label htmlFor="memberBio" className="block text-sm text-slate-400 mb-1">Bio</label>
                <textarea
                  id="memberBio"
                  value={newMember.bio}
                  onChange={(e) => setNewMember(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  placeholder="Brief description of role/expertise"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Proposal Modal */}
      {showAddProposal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Create Proposal</h2>
            <form onSubmit={handleAddProposal} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={newProposal.title}
                  onChange={(e) => setNewProposal(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  placeholder="Proposal title"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Category</label>
                <select
                  value={newProposal.category}
                  onChange={(e) => setNewProposal(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                >
                  <option value="GENERAL">General</option>
                  <option value="POLICY">Policy</option>
                  <option value="PROGRAM">Program</option>
                  <option value="CULTURAL">Cultural</option>
                  <option value="TECHNICAL">Technical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Summary *</label>
                <textarea
                  value={newProposal.summary}
                  onChange={(e) => setNewProposal(prev => ({ ...prev, summary: e.target.value }))}
                  required
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  placeholder="Brief summary of the proposal"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Full Text</label>
                <textarea
                  value={newProposal.fullText}
                  onChange={(e) => setNewProposal(prev => ({ ...prev, fullText: e.target.value }))}
                  rows={6}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  placeholder="Detailed proposal content"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Voting Ends</label>
                <input
                  type="date"
                  value={newProposal.votingEnds}
                  onChange={(e) => setNewProposal(prev => ({ ...prev, votingEnds: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddProposal(false)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg"
                >
                  Create Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Meeting Modal */}
      {showAddMeeting && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Add Meeting Minutes</h2>
            <form onSubmit={handleAddMeeting} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Meeting Title *</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  placeholder="e.g., Q4 2025 Council Meeting"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Date *</label>
                <input
                  type="date"
                  value={newMeeting.date}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, date: e.target.value }))}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Summary *</label>
                <textarea
                  value={newMeeting.summary}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, summary: e.target.value }))}
                  required
                  rows={4}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  placeholder="Key discussion points and outcomes"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Attendees</label>
                  <input
                    type="number"
                    value={newMeeting.attendees}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, attendees: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Decisions Made</label>
                  <input
                    type="number"
                    value={newMeeting.decisions}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, decisions: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddMeeting(false)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg"
                >
                  Add Minutes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

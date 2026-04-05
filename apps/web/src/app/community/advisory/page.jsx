"use client";

import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Vote, 
  FileText, 
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  MapPin,
  Shield,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';

const PROPOSAL_STATUS = {
  OPEN: { label: 'Open for Voting', color: 'bg-blue-500', icon: Vote },
  APPROVED: { label: 'Approved', color: 'bg-emerald-500', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
  IMPLEMENTED: { label: 'Implemented', color: 'bg-purple-500', icon: Sparkles },
  PENDING: { label: 'Pending Review', color: 'bg-amber-500', icon: Clock }
};

const MEMBER_ROLES = {
  CHAIR: { label: 'Chairperson', color: 'text-amber-400' },
  VICE_CHAIR: { label: 'Vice Chair', color: 'text-amber-300' },
  MEMBER: { label: 'Council Member', color: 'text-slate-300' },
  ELDER: { label: 'Elder Advisor', color: 'text-purple-400' }
};

function MemberCard({ member }) {
  const role = MEMBER_ROLES[member.role] || MEMBER_ROLES.MEMBER;
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-5 hover:bg-slate-700/80 transition-colors">
      <div className="flex items-start gap-4">
        {member.avatar ? (
          <img src={toCloudinaryAutoUrl(member.avatar)} alt="" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-xl font-bold text-white">
            {member.name?.[0] || 'M'}
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{member.name}</h3>
          <p className={`text-sm font-medium ${role.color}`}>{role.label}</p>
          {member.region && (
            <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {member.region}
            </p>
          )}
          {member.bio && (
            <p className="text-sm text-slate-300 mt-2 line-clamp-2">{member.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProposalCard({ proposal, onClick }) {
  const status = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.PENDING;
  const StatusIcon = status.icon;
  
  return (
    <button 
      onClick={() => onClick?.(proposal)}
      className="block w-full text-left bg-slate-800/80 rounded-xl p-5 hover:bg-slate-700/80 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${status.color}`}>
              {status.label}
            </span>
            {proposal.category && (
              <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
                {proposal.category}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">{proposal.title}</h3>
          <p className="text-sm text-slate-300 line-clamp-2">{proposal.summary}</p>
          
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(proposal.createdAt).toLocaleDateString()}
            </span>
            {proposal.votingEnds && proposal.status === 'OPEN' && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Voting ends {new Date(proposal.votingEnds).toLocaleDateString()}
              </span>
            )}
            {proposal.voteCount > 0 && (
              <span className="flex items-center gap-1">
                <Vote className="w-3 h-3" />
                {proposal.voteCount} votes
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
      </div>
    </button>
  );
}

function MeetingCard({ meeting }) {
  return (
    <div className="bg-slate-800/80 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-900/50 flex items-center justify-center">
          <FileText className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-white">{meeting.title}</h4>
          <p className="text-sm text-slate-400 mt-1">{meeting.summary}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span>{new Date(meeting.date).toLocaleDateString()}</span>
            {meeting.attendees > 0 && <span>{meeting.attendees} attendees</span>}
            {meeting.decisions > 0 && <span>{meeting.decisions} decisions</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdvisoryCouncilPage() {
  const [members, setMembers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const [selectedProposal, setSelectedProposal] = useState(null);

  const apiBase = API_BASE;

  useEffect(() => {
    fetchCouncilData();
  }, []);

  async function fetchCouncilData() {
    try {
      const [membersRes, proposalsRes, decisionsRes, meetingsRes] = await Promise.all([
        fetch(`${apiBase}/advisory/members`),
        fetch(`${apiBase}/advisory/proposals`),
        fetch(`${apiBase}/advisory/decisions`),
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
      if (decisionsRes.ok) {
        const data = await decisionsRes.json();
        setDecisions(data.decisions || []);
      }
      if (meetingsRes.ok) {
        const data = await meetingsRes.json();
        setMeetings(data.meetings || []);
      }
    } catch (err) {
      console.error('Failed to fetch council data:', err);
    } finally {
      setLoading(false);
    }
  }

  const openProposals = proposals.filter(p => p.status === 'OPEN');

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-900/40 via-orange-900/30 to-red-900/40 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/community" className="hover:text-white">Community</Link>
            <ChevronRight className="w-4 h-4" />
            <span>Advisory Council</span>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Community Advisory Council</h1>
              <p className="text-lg text-slate-300 max-w-2xl">
                Our First Nations Community Advisory Council ensures that Ngurra Pathways 
                remains culturally grounded, community-led, and accountable to the people we serve.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{members.length}</div>
              <div className="text-sm text-slate-400">Council Members</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{openProposals.length}</div>
              <div className="text-sm text-slate-400">Open Proposals</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{decisions.length}</div>
              <div className="text-sm text-slate-400">Decisions Made</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{meetings.length}</div>
              <div className="text-sm text-slate-400">Meetings Held</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 min-w-max" role="tablist" aria-label="Advisory council sections">
            {[
              { id: 'members', label: 'Council Members', shortLabel: 'Members', icon: Users },
              { id: 'proposals', label: 'Proposals', shortLabel: 'Proposals', icon: Vote },
              { id: 'decisions', label: 'Decisions', shortLabel: 'Decisions', icon: CheckCircle2 },
              { id: 'meetings', label: 'Meeting Minutes', shortLabel: 'Meetings', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                className={`flex items-center gap-2 px-3 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === tab.id 
                    ? 'border-amber-500 text-white' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-slate-400">Loading council information...</p>
          </div>
        ) : (
          <>
            {/* Members Tab */}
            {activeTab === 'members' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Current Council Members</h2>
                  <p className="text-slate-400">
                    Our council comprises Elders, community leaders, and sector experts who guide 
                    platform development and ensure cultural integrity.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {members.map((member, i) => (
                    <MemberCard key={member.id || i} member={member} />
                  ))}
                </div>
                {members.length === 0 && (
                  <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                    <Users className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400">Council member information coming soon</p>
                  </div>
                )}
              </div>
            )}

            {/* Proposals Tab */}
            {activeTab === 'proposals' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Active Proposals</h2>
                  <p className="text-slate-400">
                    Proposals are reviewed and voted on by council members. 
                    Community input is welcomed through our forums.
                  </p>
                </div>
                <div className="space-y-4">
                  {proposals.map((proposal, i) => (
                    <ProposalCard key={proposal.id || i} proposal={proposal} onClick={setSelectedProposal} />
                  ))}
                </div>
                {proposals.length === 0 && (
                  <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                    <Vote className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400">No proposals at this time</p>
                  </div>
                )}
              </div>
            )}

            {/* Decisions Tab */}
            {activeTab === 'decisions' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Council Decisions</h2>
                  <p className="text-slate-400">
                    Transparency in action — see the decisions our council has made 
                    and how they shape our platform.
                  </p>
                </div>
                <div className="space-y-4">
                  {decisions.map((decision, i) => (
                    <div key={decision.id || i} className="bg-slate-800/80 rounded-xl p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          decision.status === 'APPROVED' ? 'bg-emerald-900/50' : 'bg-red-900/50'
                        }`}>
                          {decision.status === 'APPROVED' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{decision.title}</h4>
                          <p className="text-sm text-slate-300 mt-1">{decision.summary}</p>
                          {decision.outcome && (
                            <p className="text-sm text-emerald-300 mt-2 bg-emerald-900/30 px-3 py-2 rounded">
                              <strong>Outcome:</strong> {decision.outcome}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 mt-2">
                            Decided: {new Date(decision.decidedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {decisions.length === 0 && (
                  <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                    <CheckCircle2 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400">No decisions recorded yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Meetings Tab */}
            {activeTab === 'meetings' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Meeting Minutes</h2>
                  <p className="text-slate-400">
                    Our council meets regularly to discuss platform direction, 
                    community concerns, and cultural considerations.
                  </p>
                </div>
                <div className="space-y-4">
                  {meetings.map((meeting, i) => (
                    <MeetingCard key={meeting.id || i} meeting={meeting} />
                  ))}
                </div>
                {meetings.length === 0 && (
                  <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                    <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400">Meeting minutes will be published here</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Call to Action */}
      <div className="border-t border-slate-700 bg-slate-800/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Have feedback for the council?</h3>
              <p className="text-slate-300">
                Share your ideas and concerns through our community forums.
              </p>
            </div>
            <Link
              href="/community/forums"
              className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              Visit Forums
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Proposal Detail Modal */}
      {selectedProposal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProposal(null)}
        >
          <div 
            className="bg-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${
                    PROPOSAL_STATUS[selectedProposal.status]?.color || 'bg-slate-600'
                  }`}>
                    {PROPOSAL_STATUS[selectedProposal.status]?.label || selectedProposal.status}
                  </span>
                  {selectedProposal.category && (
                    <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
                      {selectedProposal.category}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold">{selectedProposal.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedProposal(null)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close modal"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Summary</h3>
                <p className="text-slate-200">{selectedProposal.summary}</p>
              </div>

              {selectedProposal.fullText && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Full Proposal</h3>
                  <p className="text-slate-300 whitespace-pre-wrap">{selectedProposal.fullText}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-slate-400 pt-4 border-t border-slate-700">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Created: {new Date(selectedProposal.createdAt).toLocaleDateString()}
                </span>
                {selectedProposal.votingEnds && selectedProposal.status === 'OPEN' && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Voting ends: {new Date(selectedProposal.votingEnds).toLocaleDateString()}
                  </span>
                )}
                {selectedProposal.voteCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Vote className="w-4 h-4" />
                    {selectedProposal.voteCount} votes
                  </span>
                )}
              </div>

              {selectedProposal.outcome && (
                <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-emerald-400 mb-1">Outcome</h3>
                  <p className="text-emerald-200">{selectedProposal.outcome}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

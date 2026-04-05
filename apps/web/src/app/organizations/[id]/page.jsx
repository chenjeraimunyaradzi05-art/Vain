'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

/**
 * Organization Detail Page
 * View organization profile, jobs, reviews, and updates
 */
export default function OrganizationDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState('about');
  const [isFollowing, setIsFollowing] = useState(false);

  // Mock organization data
  const org = {
    id: params.id,
    name: 'First Nations Development Corp',
    type: 'employer',
    description: 'We are a 100% First Nations-owned corporation committed to creating meaningful employment opportunities and building pathways for Aboriginal and Torres Strait Islander peoples. Our focus spans technology, infrastructure, and community services.',
    logo: null,
    coverImage: null,
    verified: true,
    followerCount: 3420,
    employeeCount: '201-500',
    headquarters: 'Sydney, NSW',
    founded: '2015',
    website: 'www.fndc.com.au',
    industry: 'Technology & Community Services',
    values: ['Cultural safety', 'Community first', 'Innovation', 'Sustainable employment'],
    benefits: [
      'Flexible working arrangements',
      'Cultural leave provisions',
      'Professional development budget',
      'Mentorship programs',
      'Community volunteering days'
    ],
    certifications: ['Indigenous Business Certified', 'B Corp Certified', 'Employer of Choice']
  };

  const tabs = [
    { id: 'about', label: 'About', icon: 'ℹ️' },
    { id: 'jobs', label: 'Jobs', icon: '💼' },
    { id: 'updates', label: 'Updates', icon: '📰' },
    { id: 'reviews', label: 'Reviews', icon: '⭐' },
    { id: 'people', label: 'People', icon: '👥' }
  ];

  const typeColors = {
    employer: { bg: 'bg-light-blue/20', text: 'text-light-blue', label: 'Employer' },
    community_org: { bg: 'bg-emerald/20', text: 'text-emerald', label: 'Community Org' },
    training_provider: { bg: 'bg-purple-royal/20', text: 'text-purple-royal', label: 'Training' },
    government: { bg: 'bg-gold/20', text: 'text-gold', label: 'Government' },
    support_service: { bg: 'bg-pink-blush/20', text: 'text-pink-blush', label: 'Support' },
    mentorship_network: { bg: 'bg-rose-gold/20', text: 'text-rose-gold', label: 'Mentorship' }
  };

  const mockJobs = [
    { id: 1, title: 'Senior Software Engineer', location: 'Sydney, NSW', type: 'Full-time', posted: '2 days ago', applicants: 23 },
    { id: 2, title: 'Community Engagement Officer', location: 'Brisbane, QLD', type: 'Full-time', posted: '1 week ago', applicants: 45 },
    { id: 3, title: 'Project Manager', location: 'Remote', type: 'Contract', posted: '3 days ago', applicants: 18 },
    { id: 4, title: 'Junior Developer Trainee', location: 'Melbourne, VIC', type: 'Traineeship', posted: '5 days ago', applicants: 67 }
  ];

  const mockUpdates = [
    { id: 1, content: "We're excited to announce our new partnership with major tech companies to create 50 new traineeships for First Nations youth!", likes: 234, comments: 45, time: '2 hours ago' },
    { id: 2, content: "Join us at the upcoming Indigenous Business Conference in Darwin next month. Our CEO will be speaking about sustainable employment pathways.", likes: 156, comments: 23, time: '3 days ago' },
    { id: 3, content: "Celebrating NAIDOC Week! This year's theme reminds us why our work matters. Looking forward to hosting community events.", likes: 389, comments: 67, time: '1 week ago' }
  ];

  const mockReviews = [
    { id: 1, author: 'Former Employee', rating: 5, title: 'Incredible workplace culture', content: 'Best place I\'ve ever worked. The cultural safety is genuine, not just a checkbox. Highly recommend.', helpful: 34, date: '2 months ago' },
    { id: 2, author: 'Current Employee', rating: 5, title: 'Great development opportunities', content: 'They really invest in their people. I\'ve had access to training and mentorship that has transformed my career.', helpful: 28, date: '1 month ago' },
    { id: 3, author: 'Former Intern', rating: 4, title: 'Amazing traineeship experience', content: 'Learned so much during my time here. Great mentors and real projects to work on.', helpful: 19, date: '3 months ago' }
  ];

  const mockPeople = [
    { id: 1, name: 'Sarah Williams', role: 'CEO & Founder', avatar: '👩🏽', verified: true },
    { id: 2, name: 'James Chen', role: 'Head of Technology', avatar: '👨🏻', verified: true },
    { id: 3, name: 'Kylie Thompson', role: 'Community Manager', avatar: '👩🏿', verified: false }
  ];

  return (
    <div className="min-h-screen pt-20 pb-20">
      {/* Celestial Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#151530] to-[#1a1a2e]" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Cover Image */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-light-blue via-purple-royal/50 to-emerald relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-8xl opacity-30">🏢</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Back Button */}
        <Link 
          href="/organizations" 
          className="absolute top-4 left-4 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
        >
          ←
        </Link>
      </div>

      {/* Organization Header */}
      <div className="container mx-auto px-4 max-w-5xl -mt-16 relative z-10">
        <div className="royal-card p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Logo */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-light-blue to-emerald flex items-center justify-center text-4xl -mt-16 border-4 border-[#1a1a2e] shadow-lg">
              🏢
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-white">{org.name}</h1>
                    {org.verified && (
                      <span className="text-emerald text-xl" title="Verified Organization">✓</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                    <span className={`px-2 py-0.5 rounded ${typeColors[org.type].bg} ${typeColors[org.type].text}`}>
                      {typeColors[org.type].label}
                    </span>
                    <span>📍 {org.headquarters}</span>
                    <span>👥 {org.employeeCount} employees</span>
                    <span>🔗 {org.website}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsFollowing(!isFollowing)}
                    className={`px-6 py-2 rounded-full font-medium transition-all ${
                      isFollowing
                        ? 'bg-white/10 border border-white/20 text-white'
                        : 'btn-cta-royal'
                    }`}
                  >
                    {isFollowing ? '✓ Following' : 'Follow'}
                  </button>
                  <button className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors">
                    ✉️
                  </button>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <p className="text-xl font-bold text-gold">{org.followerCount.toLocaleString()}</p>
                  <p className="text-sm text-white/60">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-emerald">{mockJobs.length}</p>
                  <p className="text-sm text-white/60">Open Jobs</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-light-blue">4.8</p>
                  <p className="text-sm text-white/60">Rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-gold to-rose-gold text-black'
                  : 'bg-black/30 border border-white/10 text-white/70 hover:text-white hover:border-white/30'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {activeTab === 'about' && (
              <>
                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-4">About Us</h3>
                  <p className="text-white/70 whitespace-pre-line">{org.description}</p>
                </div>
                
                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-4">Our Values</h3>
                  <div className="flex flex-wrap gap-2">
                    {org.values.map(value => (
                      <span key={value} className="px-3 py-1 rounded-full text-sm bg-purple-royal/20 text-purple-royal">
                        ✨ {value}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-4">Benefits & Perks</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {org.benefits.map(benefit => (
                      <div key={benefit} className="flex items-center gap-2 text-white/70">
                        <span className="text-emerald">✓</span>
                        {benefit}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-4">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {org.certifications.map(cert => (
                      <span key={cert} className="px-3 py-1 rounded-full text-sm bg-gold/20 text-gold">
                        🏆 {cert}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'jobs' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-white">Open Positions ({mockJobs.length})</h3>
                  <Link href="/jobs" className="text-gold hover:underline text-sm">
                    View all jobs →
                  </Link>
                </div>
                
                {mockJobs.map(job => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="royal-card p-4 hover:border-gold/30 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white mb-1">{job.title}</h4>
                          <div className="flex flex-wrap gap-3 text-sm text-white/60">
                            <span>📍 {job.location}</span>
                            <span>⏰ {job.type}</span>
                            <span>👥 {job.applicants} applicants</span>
                          </div>
                        </div>
                        <span className="text-white/40 text-sm">{job.posted}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {activeTab === 'updates' && (
              <div className="space-y-4">
                {mockUpdates.map(update => (
                  <div key={update.id} className="royal-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-light-blue to-emerald flex items-center justify-center text-2xl">
                        🏢
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-white">{org.name}</span>
                          <span className="text-emerald">✓</span>
                          <span className="text-white/40 text-sm">{update.time}</span>
                        </div>
                        <p className="text-white/80">{update.content}</p>
                        
                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/10">
                          <button className="flex items-center gap-2 text-white/60 hover:text-gold transition-colors">
                            <span>❤️</span> {update.likes}
                          </button>
                          <button className="flex items-center gap-2 text-white/60 hover:text-light-blue transition-colors">
                            <span>💬</span> {update.comments}
                          </button>
                          <button className="flex items-center gap-2 text-white/60 hover:text-emerald transition-colors">
                            <span>↗️</span> Share
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {/* Rating Summary */}
                <div className="royal-card p-6">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-gold">4.8</p>
                      <div className="text-gold mt-1">★★★★★</div>
                      <p className="text-sm text-white/60 mt-1">{mockReviews.length} reviews</p>
                    </div>
                    <div className="flex-1">
                      {[5, 4, 3, 2, 1].map(stars => (
                        <div key={stars} className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-white/60 w-4">{stars}</span>
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gold rounded-full"
                              style={{ width: stars === 5 ? '80%' : stars === 4 ? '15%' : '5%' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Individual Reviews */}
                {mockReviews.map(review => (
                  <div key={review.id} className="royal-card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-white">{review.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-gold">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span>
                          <span className="text-white/60 text-sm">• {review.author}</span>
                        </div>
                      </div>
                      <span className="text-white/40 text-sm">{review.date}</span>
                    </div>
                    <p className="text-white/70">{review.content}</p>
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <button className="text-sm text-white/60 hover:text-white transition-colors">
                        👍 Helpful ({review.helpful})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'people' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Key People</h3>
                {mockPeople.map(person => (
                  <div key={person.id} className="royal-card p-4 flex items-center gap-4">
                    <div className="text-4xl">{person.avatar}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{person.name}</span>
                        {person.verified && (
                          <span className="text-emerald">✓</span>
                        )}
                      </div>
                      <p className="text-white/60 text-sm">{person.role}</p>
                    </div>
                    <button className="px-4 py-2 rounded-full text-sm bg-white/10 text-white hover:bg-white/20 transition-colors">
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Info */}
            <div className="royal-card p-4">
              <h3 className="font-semibold text-white mb-4">Quick Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Industry</span>
                  <span className="text-white">{org.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Company Size</span>
                  <span className="text-white">{org.employeeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Headquarters</span>
                  <span className="text-white">{org.headquarters}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Founded</span>
                  <span className="text-white">{org.founded}</span>
                </div>
              </div>
            </div>

            {/* Similar Organizations */}
            <div className="royal-card p-4">
              <h3 className="font-semibold text-white mb-4">Similar Organizations</h3>
              <div className="space-y-3">
                {['Indigenous Business Network', 'Community Tech Hub', 'First Nations Foundation'].map(name => (
                  <Link key={name} href="/organizations" className="flex items-center gap-3 hover:bg-white/5 -mx-2 px-2 py-1 rounded transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-royal/30 to-pink-blush/30 flex items-center justify-center">
                      🏢
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{name}</p>
                      <p className="text-white/40 text-xs">1K+ followers</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Share */}
            <div className="royal-card p-4">
              <h3 className="font-semibold text-white mb-4">Share Profile</h3>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white">
                  📋 Copy Link
                </button>
                <button className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white">
                  ↗️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

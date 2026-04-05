'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProfileStories from '@/components/profile/ProfileStories';

/**
 * User Profile Page
 * View user profiles with social networking features
 */
export default function UserProfilePage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState('posts');
  const [connectionStatus, setConnectionStatus] = useState('none'); // none, pending, connected

  // Community member profile — representative data at real institutions
  const user = {
    id: params.id,
    name: 'Community Member',
    headline: 'CareerTrackers Alumni | Software Engineer at Canva | Mentor',
    avatar: '👩🏽',
    coverImage: null,
    location: 'Sydney, NSW',
    trustLevel: 'verified',
    connectionCount: 214,
    followerCount: 387,
    postCount: 24,
    bio: 'Started through a CareerTrackers internship, completed a Bachelor of IT at UTS, and now building products at Canva. Passionate about mentoring the next generation of First Nations technologists.',
    currentRole: 'Software Engineer at Canva',
    education: 'Bachelor of Information Technology, University of Technology Sydney',
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'Community Building', 'Mentoring'],
    interests: ['Technology', 'Indigenous Business', 'Education', 'Career Development'],
    badges: ['Tech Pioneer', 'Community Helper', 'Mentor'],
    isVerified: true,
    safetyMode: 'enhanced',
    dmPolicy: 'connections',
    dateOfBirth: '1996-03-15',
    age: 29,
    phone: '+61 412 345 678',
    showPhone: true,
    pronouns: 'she/her',
    languages: ['English', 'Wiradjuri (learning)'],
    nation: 'Wiradjuri',
  };

  const trustBadges = {
    verified: { icon: '✓', color: 'text-emerald', bg: 'bg-emerald/20', label: 'Verified Member' },
    trusted: { icon: '⭐', color: 'text-gold', bg: 'bg-gold/20', label: 'Trusted Member' },
    established: { icon: '💎', color: 'text-purple-royal', bg: 'bg-purple-royal/20', label: 'Established Member' },
    basic: { icon: '👤', color: 'text-white/60', bg: 'bg-white/10', label: 'Member' },
    new: { icon: '🌱', color: 'text-light-blue', bg: 'bg-light-blue/20', label: 'New Member' }
  };

  const tabs = [
    { id: 'posts', label: 'Posts', icon: '📝', count: user.postCount },
    { id: 'about', label: 'About', icon: 'ℹ️' },
    { id: 'experience', label: 'Experience', icon: '💼' },
    { id: 'lifestyle', label: 'Lifestyle', icon: '🎵' },
    { id: 'media', label: 'Media', icon: '🖼️' },
    { id: 'connections', label: 'Connections', icon: '👥', count: user.connectionCount },
  ];

  const mockPosts = [
    {
      id: 1,
      content: "Just finished mentoring a group of CareerTrackers interns on their first React project. Seeing the next generation of First Nations developers build with confidence is incredible 🌟 #CareerTrackers #FirstNationsInTech",
      likes: 156,
      comments: 34,
      time: '5 hours ago',
      hasImage: true
    },
    {
      id: 2,
      content: "Huge shout-out to the team at Canva for supporting Indigenous STEM pathways. Our RAP commitments are turning into real action — proud to be part of this work 💪",
      likes: 234,
      comments: 45,
      time: '2 days ago'
    },
    {
      id: 3,
      content: "Applications are open for the 2026 BHP Indigenous Apprenticeship Program in the Pilbara. If you know someone keen on a trades career, share this post!",
      likes: 189,
      comments: 67,
      time: '1 week ago'
    }
  ];

  const mockConnections = [
    { id: 1, name: 'Community Member', role: 'Program Manager at CareerTrackers', avatar: '👨🏿', trustLevel: 'trusted' },
    { id: 2, name: 'Community Member', role: 'Nurse at Royal Darwin Hospital', avatar: '👩🏽', trustLevel: 'verified' },
    { id: 3, name: 'Community Member', role: 'Engineer at Rio Tinto', avatar: '👨🏽', trustLevel: 'established' },
    { id: 4, name: 'Community Member', role: 'HR Advisor at Telstra', avatar: '👩🏻', trustLevel: 'trusted' }
  ];

  const mockGroups = [
    { id: 1, name: 'First Nations in Tech', members: 1247, icon: '💻' },
    { id: 2, name: 'Tech Professionals Network', members: 3456, icon: '�' },
    { id: 3, name: 'FIFO Workers Community', members: 892, icon: '⛏️' }
  ];

  const mockExperience = [
    { id: 1, role: 'Software Engineer', company: 'Canva', icon: '🎨', location: 'Sydney, NSW', start: 'Jan 2023', end: 'Present', current: true, description: 'Building design tools and accessibility features. Leading the First Nations internship mentoring program.', skills: ['React', 'TypeScript', 'Node.js'] },
    { id: 2, role: 'Junior Developer', company: 'Atlassian', icon: '🔷', location: 'Sydney, NSW', start: 'Feb 2021', end: 'Dec 2022', current: false, description: 'Worked on Jira Cloud frontend, improving sprint planning features and accessibility.', skills: ['React', 'JavaScript', 'GraphQL'] },
    { id: 3, role: 'CareerTrackers Intern', company: 'Commonwealth Bank', icon: '🏦', location: 'Sydney, NSW', start: 'Nov 2019', end: 'Feb 2020', current: false, description: 'Summer internship through CareerTrackers. Worked on internal tools and automation.', skills: ['Python', 'SQL', 'Agile'] },
  ];

  const mockEducation = [
    { id: 1, degree: 'Bachelor of Information Technology', institution: 'University of Technology Sydney', icon: '🎓', start: '2018', end: '2022', description: "Dean's List 2021. UTS Indigenous Scholarship recipient.", activities: ['Indigenous Student Network', 'Coding Club', 'Women in Tech Society'] },
    { id: 2, degree: 'Certificate IV in IT', institution: 'TAFE NSW', icon: '📚', start: '2017', end: '2018', description: 'Foundation IT skills including networking, programming, and web development.' },
  ];

  const mockMusic = {
    artists: [
      { name: 'Baker Boy', genre: 'Hip Hop', icon: '🎤' },
      { name: 'Jessica Mauboy', genre: 'Pop / R&B', icon: '🎵' },
      { name: 'Thelma Plum', genre: 'Indie Pop', icon: '🎸' },
      { name: 'Electric Fields', genre: 'Electropop', icon: '⚡' },
      { name: 'King Stingray', genre: 'Surf Rock', icon: '🏄' },
      { name: 'Budjerah', genre: 'R&B / Soul', icon: '🎶' },
    ],
    genres: ['Hip Hop', 'R&B', 'Indie Pop', 'Country', 'Traditional'],
    nowPlaying: { title: 'Meditjin', artist: 'Baker Boy', youtubeId: 'dkJdDMJwQ8E' },
  };

  const mockMovies = {
    movies: [
      { title: 'The Sapphires', year: 2012, genre: 'Drama / Musical', rating: 5 },
      { title: 'Top End Wedding', year: 2019, genre: 'Rom-Com', rating: 4 },
      { title: 'Sweet Country', year: 2017, genre: 'Drama / Western', rating: 5 },
      { title: 'Rabbit-Proof Fence', year: 2002, genre: 'Drama', rating: 5 },
    ],
    shows: [
      { title: 'Total Control', genre: 'Political Drama', rating: 5 },
      { title: 'Mystery Road', genre: 'Crime / Thriller', rating: 4 },
      { title: 'Cleverman', genre: 'Sci-Fi / Drama', rating: 4 },
    ],
  };

  const mockSports = {
    teams: [
      { name: 'Sydney Swans', sport: 'AFL', icon: '🦢', favourite: true },
      { name: 'Indigenous All Stars', sport: 'NRL', icon: '🏉', favourite: true },
      { name: 'Matildas', sport: 'Football', icon: '⚽', favourite: false },
    ],
    interests: ['AFL', 'Rugby League', 'Football', 'Basketball', 'Surfing'],
    plays: ['Touch Football', 'Basketball'],
  };

  const mockPhotos = [
    { id: 1, caption: 'CareerTrackers graduation ceremony', likes: 45 },
    { id: 2, caption: 'Team day at Canva', likes: 89 },
    { id: 3, caption: 'NAIDOC Week celebrations', likes: 156 },
    { id: 4, caption: 'Mentoring session', likes: 67 },
    { id: 5, caption: 'Sydney Harbour sunset', likes: 234 },
    { id: 6, caption: 'Hackathon winners!', likes: 178 },
    { id: 7, caption: 'Country visit', likes: 312 },
    { id: 8, caption: 'Tech conference panel', likes: 145 },
    { id: 9, caption: 'Community BBQ', likes: 98 },
  ];

  const mockVideos = [
    { id: 1, title: 'My CareerTrackers Journey', duration: '3:24', views: 1240 },
    { id: 2, title: 'Day in the Life at Canva', duration: '5:12', views: 890 },
    { id: 3, title: 'NAIDOC Week Speech', duration: '8:45', views: 2340 },
    { id: 4, title: 'Coding Workshop for Kids', duration: '12:03', views: 560 },
  ];

  const mockStories = [
    {
      id: 's1', userId: 'self', userName: user.name, userAvatar: user.avatar,
      slides: [
        { id: 'sl1', type: 'photo', content: '', caption: 'Beautiful morning in Sydney!', youtubeTrackId: 'dkJdDMJwQ8E', youtubeTrackTitle: 'Meditjin', youtubeTrackArtist: 'Baker Boy', duration: 6 },
        { id: 'sl2', type: 'text', content: 'Grateful for another day on Gadigal Country 🌅', backgroundColor: '#6366f1', textColor: '#fff', duration: 5 },
      ],
      createdAt: '2h ago', viewCount: 156, hasViewed: false,
    },
    {
      id: 's2', userId: 'u2', userName: 'David Y.', userAvatar: '👨🏾',
      slides: [
        { id: 'sl3', type: 'photo', content: '', caption: 'NAIDOC Week vibes!', youtubeTrackId: 'JGwWNGJdvx8', youtubeTrackTitle: 'Shape of You', youtubeTrackArtist: 'Ed Sheeran', duration: 5 },
      ],
      createdAt: '4h ago', viewCount: 89, hasViewed: false,
    },
    {
      id: 's3', userId: 'u3', userName: 'Sarah M.', userAvatar: '👩🏽',
      slides: [
        { id: 'sl4', type: 'text', content: 'Just got promoted! 🎉🎉', backgroundColor: '#ec4899', textColor: '#fff', duration: 4 },
        { id: 'sl5', type: 'photo', content: '', caption: 'New office view', duration: 5 },
      ],
      createdAt: '6h ago', viewCount: 245, hasViewed: true,
    },
    {
      id: 's4', userId: 'u4', userName: 'Emma C.', userAvatar: '👩🏻',
      slides: [
        { id: 'sl6', type: 'photo', content: '', caption: 'Sunset at Uluru', youtubeTrackId: '2Vv-BfVoq4g', youtubeTrackTitle: 'Perfect', youtubeTrackArtist: 'Ed Sheeran', duration: 7 },
      ],
      createdAt: '8h ago', viewCount: 312, hasViewed: true,
    },
  ];

  const handleConnect = () => {
    if (connectionStatus === 'none') {
      setConnectionStatus('pending');
    } else if (connectionStatus === 'pending') {
      setConnectionStatus('none');
    }
  };

  return (
    <div className="ngurra-page pt-20 pb-20">
      {/* Decorative halos */}
      <div className="ngurra-halos">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />
      </div>

      {/* Cover Image */}
      <div className="h-48 md:h-56 bg-gradient-to-r from-purple-royal via-pink-blush/30 to-gold relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 3px 3px, rgba(255,255,255,0.3) 2px, transparent 0)',
          backgroundSize: '30px 30px'
        }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Back Button */}
        <Link 
          href="/social-feed" 
          className="absolute top-4 left-4 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
        >
          ←
        </Link>
        
        {/* More Options */}
        <button className="absolute top-4 right-4 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors">
          ⋮
        </button>
      </div>

      {/* Profile Header */}
      <div className="container mx-auto px-4 max-w-4xl -mt-20 relative z-10">
        <div className="royal-card p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-royal to-pink-blush flex items-center justify-center text-6xl border-4 border-[#1a1a2e] shadow-lg">
                {user.avatar}
              </div>
              {/* Trust Badge */}
              <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-sm font-medium ${trustBadges[user.trustLevel].bg} ${trustBadges[user.trustLevel].color} flex items-center gap-1`}>
                {trustBadges[user.trustLevel].icon} {trustBadges[user.trustLevel].label}
              </div>
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">{user.name}</h1>
                  <p className="text-white/70">{user.headline}</p>
                  <p className="text-white/50 text-sm mt-1">📍 {user.location}</p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleConnect}
                    className={`px-6 py-2 rounded-full font-medium transition-all ${
                      connectionStatus === 'connected'
                        ? 'bg-emerald/20 text-emerald border border-emerald/30'
                        : connectionStatus === 'pending'
                        ? 'bg-gold/20 text-gold border border-gold/30'
                        : 'btn-cta-royal'
                    }`}
                  >
                    {connectionStatus === 'connected' ? '✓ Connected' : 
                     connectionStatus === 'pending' ? '⏳ Pending' : 'Connect'}
                  </button>
                  <button className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors">
                    💬 Message
                  </button>
                  <button className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors">
                    ⋮
                  </button>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
                <button className="text-center hover:opacity-80 transition-opacity">
                  <p className="text-xl font-bold text-gold">{user.connectionCount}</p>
                  <p className="text-sm text-white/60">Connections</p>
                </button>
                <button className="text-center hover:opacity-80 transition-opacity">
                  <p className="text-xl font-bold text-purple-royal">{user.followerCount}</p>
                  <p className="text-sm text-white/60">Followers</p>
                </button>
                <button className="text-center hover:opacity-80 transition-opacity">
                  <p className="text-xl font-bold text-emerald">{user.postCount}</p>
                  <p className="text-sm text-white/60">Posts</p>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stories */}
        <div className="royal-card p-4 mb-6">
          <ProfileStories stories={mockStories} currentUserId={String(params.id)} />
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
              {tab.count && <span className="opacity-70">({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {activeTab === 'posts' && (
              <>
                {mockPosts.map(post => (
                  <div key={post.id} className="royal-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{user.avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{user.name}</span>
                          <span className="text-emerald">✓</span>
                          <span className="text-white/40 text-sm">{post.time}</span>
                        </div>
                        <p className="text-white/80 mt-2">{post.content}</p>
                        
                        {post.hasImage && (
                          <div className="mt-3 aspect-video rounded-xl bg-white/5 flex items-center justify-center">
                            <span className="text-4xl opacity-30">🖼️</span>
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/10">
                          <button className="flex items-center gap-2 text-white/60 hover:text-gold transition-colors">
                            <span>❤️</span> {post.likes}
                          </button>
                          <button className="flex items-center gap-2 text-white/60 hover:text-light-blue transition-colors">
                            <span>💬</span> {post.comments}
                          </button>
                          <button className="flex items-center gap-2 text-white/60 hover:text-emerald transition-colors">
                            <span>↗️</span> Share
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'about' && (
              <>
                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-4">Bio</h3>
                  <p className="text-white/70 leading-relaxed">{user.bio}</p>
                </div>

                {/* Personal Details */}
                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-4">Personal Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Age</p>
                      <p className="text-white font-medium">{user.age} years old</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Pronouns</p>
                      <p className="text-white font-medium">{user.pronouns}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Location</p>
                      <p className="text-white font-medium">📍 {user.location}</p>
                    </div>
                    {user.showPhone && (
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Phone</p>
                        <p className="text-white font-medium">📞 {user.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Nation / Mob</p>
                      <p className="text-white font-medium">🪃 {user.nation}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Languages</p>
                      <p className="text-white font-medium">{user.languages.join(', ')}</p>
                    </div>
                  </div>
                </div>

                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-4">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map(skill => (
                      <span key={skill} className="px-3 py-1.5 rounded-full text-sm bg-white/5 border border-white/10 text-white hover:border-gold/30 transition-colors cursor-default">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-4">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map(interest => (
                      <span key={interest} className="px-3 py-1.5 rounded-full text-sm bg-gold/10 border border-gold/20 text-gold">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Experience Tab */}
            {activeTab === 'experience' && (
              <>
                {/* Work Experience */}
                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
                    <span className="text-xl">💼</span> Work Experience
                  </h3>
                  <div className="space-y-6">
                    {mockExperience.map((exp, i) => (
                      <div key={exp.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                            {exp.icon}
                          </div>
                          {i < mockExperience.length - 1 && (
                            <div className="w-px flex-1 bg-white/10 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold text-white">{exp.role}</h4>
                              <p className="text-white/70">{exp.company}</p>
                            </div>
                            {exp.current && (
                              <span className="px-2 py-0.5 bg-emerald/20 text-emerald text-xs rounded-full font-medium flex-shrink-0">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-white/40 text-sm mt-1">{exp.start} — {exp.end} · {exp.location}</p>
                          <p className="text-white/60 text-sm mt-2">{exp.description}</p>
                          {exp.skills && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {exp.skills.map(s => (
                                <span key={s} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-white/70">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education */}
                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
                    <span className="text-xl">🎓</span> Education
                  </h3>
                  <div className="space-y-6">
                    {mockEducation.map((edu, i) => (
                      <div key={edu.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-xl bg-purple-royal/10 border border-purple-royal/20 flex items-center justify-center text-2xl flex-shrink-0">
                            {edu.icon}
                          </div>
                          {i < mockEducation.length - 1 && (
                            <div className="w-px flex-1 bg-white/10 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <h4 className="font-semibold text-white">{edu.degree}</h4>
                          <p className="text-white/70">{edu.institution}</p>
                          <p className="text-white/40 text-sm mt-1">{edu.start} — {edu.end}</p>
                          {edu.description && <p className="text-white/60 text-sm mt-2">{edu.description}</p>}
                          {edu.activities && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {edu.activities.map(a => (
                                <span key={a} className="px-2 py-0.5 bg-purple-royal/10 border border-purple-royal/20 rounded text-xs text-purple-royal">{a}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Lifestyle Tab */}
            {activeTab === 'lifestyle' && (
              <>
                {/* Music */}
                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                    <span className="text-xl">🎵</span> Music
                  </h3>

                  {/* Now Playing */}
                  {mockMusic.nowPlaying && (
                    <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-pink-blush/10 to-purple-royal/10 border border-pink-blush/20">
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Currently Listening</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center animate-[spin_3s_linear_infinite]">
                          <span className="text-white text-lg">🎵</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{mockMusic.nowPlaying.title}</p>
                          <p className="text-white/60 text-sm">{mockMusic.nowPlaying.artist}</p>
                        </div>
                        <a
                          href={`https://youtube.com/watch?v=${mockMusic.nowPlaying.youtubeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-full hover:bg-red-700 transition font-medium"
                        >
                          ▶ Play
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Favourite Artists */}
                  <p className="text-white/50 text-sm mb-3 font-medium">Favourite Artists</p>
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {mockMusic.artists.map(a => (
                      <div key={a.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition">
                        <span className="text-2xl">{a.icon}</span>
                        <div>
                          <p className="text-white text-sm font-medium">{a.name}</p>
                          <p className="text-white/40 text-xs">{a.genre}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Genres */}
                  <p className="text-white/50 text-sm mb-2 font-medium">Favourite Genres</p>
                  <div className="flex flex-wrap gap-2">
                    {mockMusic.genres.map(g => (
                      <span key={g} className="px-3 py-1 rounded-full text-sm bg-pink-blush/10 border border-pink-blush/20 text-pink-blush">{g}</span>
                    ))}
                  </div>
                </div>

                {/* Movies & TV */}
                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                    <span className="text-xl">🎬</span> Movies & TV
                  </h3>

                  <p className="text-white/50 text-sm mb-3 font-medium">Favourite Movies</p>
                  <div className="space-y-2 mb-5">
                    {mockMovies.movies.map(m => (
                      <div key={m.title} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div>
                          <p className="text-white text-sm font-medium">{m.title} <span className="text-white/40">({m.year})</span></p>
                          <p className="text-white/40 text-xs">{m.genre}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className={`text-xs ${s <= m.rating ? 'text-gold' : 'text-white/10'}`}>★</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-white/50 text-sm mb-3 font-medium">Favourite Shows</p>
                  <div className="space-y-2">
                    {mockMovies.shows.map(s => (
                      <div key={s.title} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div>
                          <p className="text-white text-sm font-medium">{s.title}</p>
                          <p className="text-white/40 text-xs">{s.genre}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <span key={i} className={`text-xs ${i <= s.rating ? 'text-gold' : 'text-white/10'}`}>★</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sports */}
                <div className="royal-card p-6">
                  <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                    <span className="text-xl">🏆</span> Sports
                  </h3>

                  <p className="text-white/50 text-sm mb-3 font-medium">Favourite Teams</p>
                  <div className="space-y-2 mb-5">
                    {mockSports.teams.map(t => (
                      <div key={t.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-2xl">{t.icon}</span>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{t.name}</p>
                          <p className="text-white/40 text-xs">{t.sport}</p>
                        </div>
                        {t.favourite && (
                          <span className="text-gold text-sm">❤️</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-white/50 text-sm mb-2 font-medium">Sports Interests</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {mockSports.interests.map(s => (
                      <span key={s} className="px-3 py-1 rounded-full text-sm bg-emerald/10 border border-emerald/20 text-emerald">{s}</span>
                    ))}
                  </div>

                  <p className="text-white/50 text-sm mb-2 font-medium">Plays</p>
                  <div className="flex flex-wrap gap-2">
                    {mockSports.plays.map(s => (
                      <span key={s} className="px-3 py-1 rounded-full text-sm bg-light-blue/10 border border-light-blue/20 text-light-blue">{s}</span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'connections' && (
              <div className="space-y-4">
                {mockConnections.map(connection => (
                  <div key={connection.id} className="royal-card p-4 flex items-center gap-4">
                    <div className="text-3xl">{connection.avatar}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{connection.name}</span>
                        {connection.trustLevel !== 'basic' && connection.trustLevel !== 'new' && (
                          <span className={`text-sm ${trustBadges[connection.trustLevel].color}`}>
                            {trustBadges[connection.trustLevel].icon}
                          </span>
                        )}
                      </div>
                      <p className="text-white/60 text-sm">{connection.role}</p>
                    </div>
                    <button className="px-4 py-2 rounded-full text-sm bg-white/10 text-white hover:bg-white/20 transition-colors">
                      Connect
                    </button>
                  </div>
                ))}

                {/* Groups section within Connections tab */}
                <div className="pt-4">
                  <h3 className="font-semibold text-white mb-4">Groups</h3>
                  {mockGroups.map(group => (
                    <Link key={group.id} href={`/groups/${group.id}`}>
                      <div className="royal-card p-4 flex items-center gap-4 hover:border-gold/30 transition-colors cursor-pointer mb-3">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-royal/30 to-pink-blush/30 flex items-center justify-center text-2xl">
                          {group.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{group.name}</h3>
                          <p className="text-white/60 text-sm">{group.members.toLocaleString()} members</p>
                        </div>
                        <span className="text-white/40">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'media' && (
              <>
                {/* Photos */}
                <div className="royal-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <span className="text-xl">📸</span> Photos
                      <span className="text-white/30 text-sm font-normal">({mockPhotos.length})</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {mockPhotos.map(photo => (
                      <div key={photo.id} className="group aspect-square rounded-lg bg-gradient-to-br from-white/5 to-white/[0.02] flex flex-col items-center justify-center cursor-pointer hover:from-white/10 hover:to-white/5 transition-all relative overflow-hidden border border-white/5">
                        <span className="text-white/15 text-3xl group-hover:scale-110 transition-transform">📷</span>
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-[10px] truncate">{photo.caption}</p>
                          <p className="text-white/60 text-[10px]">❤️ {photo.likes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Videos */}
                <div className="royal-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <span className="text-xl">🎥</span> Videos
                      <span className="text-white/30 text-sm font-normal">({mockVideos.length})</span>
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {mockVideos.map(video => (
                      <div key={video.id} className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition cursor-pointer group">
                        <div className="w-32 h-20 rounded-lg bg-gradient-to-br from-purple-royal/20 to-pink-blush/20 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                          <span className="text-3xl opacity-30">🎬</span>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                              <div className="w-0 h-0 border-l-[10px] border-l-black border-y-[6px] border-y-transparent ml-1" />
                            </div>
                          </div>
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white font-medium">{video.duration}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium text-sm truncate">{video.title}</h4>
                          <p className="text-white/40 text-xs mt-1">{video.views.toLocaleString()} views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Badges */}
            <div className="royal-card p-4">
              <h3 className="font-semibold text-white mb-4">Badges</h3>
              <div className="flex flex-wrap gap-2">
                {user.badges.map(badge => (
                  <span key={badge} className="px-3 py-1 rounded-full text-sm bg-gold/10 text-gold">
                    🏆 {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Mutual Connections */}
            <div className="royal-card p-4">
              <h3 className="font-semibold text-white mb-4">Mutual Connections</h3>
              <div className="flex -space-x-2 mb-2">
                {['👨🏿', '👩🏽', '👨🏻', '👩🏻'].map((avatar, i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-royal/30 to-pink-blush/30 flex items-center justify-center text-lg border-2 border-[#1a1a2e]">
                    {avatar}
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm text-white border-2 border-[#1a1a2e]">
                  +12
                </div>
              </div>
              <p className="text-sm text-white/60">16 mutual connections</p>
            </div>

            {/* Safety Note - Only show if safety mode is enhanced/maximum */}
            {(user.safetyMode === 'enhanced' || user.safetyMode === 'maximum') && (
              <div className="p-4 rounded-xl bg-pink-blush/10 border border-pink-blush/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-pink-blush">🛡️</span>
                  <span className="font-medium text-pink-blush text-sm">Safety Protected</span>
                </div>
                <p className="text-sm text-white/60">
                  This member has enhanced safety features enabled. Please be respectful in all interactions.
                </p>
              </div>
            )}

            {/* Report/Block */}
            <div className="royal-card p-4">
              <p className="text-sm text-white/40 mb-3">Having issues?</p>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                  🚫 Block
                </button>
                <button className="flex-1 px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                  🚨 Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

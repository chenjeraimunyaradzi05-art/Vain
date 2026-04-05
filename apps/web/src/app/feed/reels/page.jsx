'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Volume2, 
  VolumeX, 
  Play, 
  ChevronUp, 
  ChevronDown,
  ArrowLeft,
  Plus,
  Music,
  CheckCheck,
  Camera
} from 'lucide-react';

/**
 * Reels Page - TikTok-style vertical video feed
 * Aboriginal precious stones theme with First Nations content creators
 */
export default function ReelsPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState({});
  const [isSaved, setIsSaved] = useState({});
  const containerRef = useRef(null);

  // Theme colors
  const theme = {
    gold: '#FFD700',
    emerald: '#50C878',
    pink: '#E85B8A',
    lightBlue: '#87CEEB',
    roseGold: '#B76E79',
    purple: '#6B4C9A',
    deepPurple: '#1A0F2E',
    darkPurple: '#2D1B69'
  };

  // First Nations creator content
  const reels = [
    {
      id: '1',
      authorName: 'Mia Thornton',
      authorHandle: '@mia_thornton_art',
      authorInitials: 'MT',
      avatarGradient: 'from-emerald-500 to-emerald-700',
      isVerified: true,
      description: 'Creating contemporary art inspired by my Wiradjuri heritage 🎨✨ This piece represents the seven sisters Dreaming story.',
      hashtags: ['FirstNationsArt', 'WiradjuriProud', 'IndigenousArtist', 'DreamtimeStories'],
      audioName: 'Original Sound - Mia Thornton',
      likes: 45200,
      comments: 1234,
      saves: 8900,
      shares: 3400,
      bgGradient: 'from-emerald-900 via-purple-900 to-pink-900'
    },
    {
      id: '2',
      authorName: 'Jarrah Williams',
      authorHandle: '@jarrah_codes',
      authorInitials: 'JW',
      avatarGradient: 'from-blue-500 to-purple-600',
      isVerified: true,
      description: 'Day in the life: Aboriginal software developer at Atlassian 💻 From Kimberley to Sydney tech scene!',
      hashtags: ['FirstNationsInTech', 'TechCareer', 'CodingJourney', 'DeadlyDeveloper'],
      audioName: 'Tech Life - Lofi Beats',
      likes: 89500,
      comments: 4567,
      saves: 12300,
      shares: 7800,
      bgGradient: 'from-blue-900 via-indigo-900 to-purple-900'
    },
    {
      id: '3',
      authorName: 'Deadly Science',
      authorHandle: '@deadly_science',
      authorInitials: 'DS',
      avatarGradient: 'from-yellow-500 to-orange-600',
      isVerified: true,
      description: '🔬 Indigenous astronomy has been guiding navigation for 65,000+ years! Meet the Emu in the Sky constellation.',
      hashtags: ['IndigenousScience', 'FirstNationsAstronomy', 'DeadlyScience', 'STEM'],
      audioName: 'Original Sound - Deadly Science',
      likes: 156000,
      comments: 8901,
      saves: 34500,
      shares: 45600,
      bgGradient: 'from-yellow-900 via-orange-900 to-red-900'
    },
    {
      id: '4',
      authorName: 'Sarah Chen-Williams',
      authorHandle: '@sarahcw_mining',
      authorInitials: 'SC',
      avatarGradient: 'from-rose-500 to-pink-600',
      isVerified: false,
      description: 'First week as a graduate geologist at Rio Tinto! Thanks to the Indigenous traineeship program for making this possible 🪨⛏️',
      hashtags: ['MiningCareers', 'IndigenousEmployment', 'GraduateLife', 'CareerGoals'],
      audioName: 'Trending Sound - Career Goals',
      likes: 23400,
      comments: 567,
      saves: 4500,
      shares: 1200,
      bgGradient: 'from-rose-900 via-pink-900 to-purple-900'
    },
    {
      id: '5',
      authorName: 'Uncle Tommy George',
      authorHandle: '@uncle_tommy_culture',
      authorInitials: 'TG',
      avatarGradient: 'from-amber-500 to-yellow-600',
      isVerified: true,
      description: 'Teaching the young ones how to read Country. This knowledge has been passed down for thousands of generations. 🌿🦘',
      hashtags: ['CulturalKnowledge', 'ReadingCountry', 'ElderWisdom', 'ConnectionToCountry'],
      audioName: 'Didgeridoo Healing - Traditional',
      likes: 234000,
      comments: 12300,
      saves: 67800,
      shares: 89000,
      bgGradient: 'from-amber-900 via-yellow-900 to-orange-900'
    }
  ];

  const currentReel = reels[currentIndex];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowDown' && currentIndex < reels.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'm') {
        setIsMuted(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reels.length]);

  const handleScroll = (direction) => {
    if (direction === 'up' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (direction === 'down' && currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const formatCount = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleLike = (id) => {
    setIsLiked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = (id) => {
    setIsSaved(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div 
      className="fixed inset-0 z-50"
      style={{ background: `linear-gradient(135deg, ${theme.deepPurple} 0%, ${theme.darkPurple} 50%, #3D1A2A 100%)` }}
    >
      {/* Aboriginal dot pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, ${theme.gold} 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <Link 
            href="/social-feed" 
            className="flex items-center gap-2 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium hidden sm:inline">Back</span>
          </Link>
          
          <div className="flex gap-4">
            <button
              className="px-4 py-1 rounded-full text-sm font-medium text-white"
              style={{ borderBottom: `2px solid ${theme.gold}` }}
            >
              For You
            </button>
            <button className="text-white/60 px-4 py-1 text-sm font-medium hover:text-white/80 transition-colors">
              Following
            </button>
          </div>
          
          <Link 
            href="/social-feed/new" 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            style={{ color: theme.gold }}
          >
            <Camera size={22} />
          </Link>
        </div>
      </div>

      {/* Main Reel View */}
      <div 
        ref={containerRef}
        className="h-full w-full flex items-center justify-center"
        onWheel={(e) => handleScroll(e.deltaY > 0 ? 'down' : 'up')}
      >
        {/* Video/Content Area */}
        <div className="relative h-full w-full max-w-md mx-auto">
          {/* Background placeholder for video */}
          <div className={`absolute inset-0 bg-gradient-to-br ${currentReel.bgGradient} flex items-center justify-center`}>
            <div className="text-center p-8">
              {/* Creator initials as placeholder */}
              <div 
                className="w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 shadow-2xl"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.gold} 0%, ${theme.roseGold} 100%)`,
                  boxShadow: `0 0 40px ${theme.gold}40`
                }}
              >
                <span className="text-4xl font-bold text-black/80">{currentReel.authorInitials}</span>
              </div>
              <p className="text-white/80 text-lg font-medium">Video Preview</p>
              <p className="text-white/50 text-sm mt-2">1080 × 1920 • 15-60s</p>
            </div>
          </div>

          {/* Play Button Overlay */}
          <button className="absolute inset-0 flex items-center justify-center group">
            <div 
              className="w-20 h-20 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform"
              style={{ boxShadow: `0 0 30px ${theme.gold}30` }}
            >
              <Play size={36} className="text-white ml-1" fill="white" />
            </div>
          </button>

          {/* Right Sidebar Actions */}
          <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
            {/* Author Avatar */}
            <div className="relative mb-2">
              <div 
                className="w-14 h-14 rounded-full p-0.5"
                style={{ background: `linear-gradient(135deg, ${theme.gold} 0%, ${theme.roseGold} 100%)` }}
              >
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${currentReel.avatarGradient} flex items-center justify-center text-white font-bold`}>
                  {currentReel.authorInitials}
                </div>
              </div>
              <button 
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: theme.pink }}
              >
                <Plus size={14} className="text-white" strokeWidth={3} />
              </button>
            </div>

            {/* Like */}
            <button 
              onClick={() => handleLike(currentReel.id)}
              className="flex flex-col items-center gap-1"
            >
              <div 
                className="w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center hover:scale-110 transition-all"
                style={{ 
                  background: isLiked[currentReel.id] ? `${theme.pink}40` : 'rgba(255,255,255,0.1)',
                  border: isLiked[currentReel.id] ? `1px solid ${theme.pink}` : '1px solid transparent'
                }}
              >
                <Heart 
                  size={24} 
                  className={isLiked[currentReel.id] ? 'text-pink-400' : 'text-white'}
                  fill={isLiked[currentReel.id] ? theme.pink : 'none'}
                />
              </div>
              <span className="text-white text-xs font-medium">
                {formatCount(currentReel.likes + (isLiked[currentReel.id] ? 1 : 0))}
              </span>
            </button>

            {/* Comment */}
            <button className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all">
                <MessageCircle size={24} className="text-white" />
              </div>
              <span className="text-white text-xs font-medium">{formatCount(currentReel.comments)}</span>
            </button>

            {/* Save */}
            <button 
              onClick={() => handleSave(currentReel.id)}
              className="flex flex-col items-center gap-1"
            >
              <div 
                className="w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center hover:scale-110 transition-all"
                style={{ 
                  background: isSaved[currentReel.id] ? `${theme.gold}40` : 'rgba(255,255,255,0.1)',
                  border: isSaved[currentReel.id] ? `1px solid ${theme.gold}` : '1px solid transparent'
                }}
              >
                <Bookmark 
                  size={24} 
                  style={{ color: isSaved[currentReel.id] ? theme.gold : 'white' }}
                  fill={isSaved[currentReel.id] ? theme.gold : 'none'}
                />
              </div>
              <span className="text-white text-xs font-medium">
                {formatCount(currentReel.saves + (isSaved[currentReel.id] ? 1 : 0))}
              </span>
            </button>

            {/* Share */}
            <button className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all">
                <Share2 size={24} className="text-white" />
              </div>
              <span className="text-white text-xs font-medium">{formatCount(currentReel.shares)}</span>
            </button>

            {/* Sound Toggle */}
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all mt-2"
            >
              {isMuted ? (
                <VolumeX size={20} className="text-white" />
              ) : (
                <Volume2 size={20} className="text-white" />
              )}
            </button>
          </div>

          {/* Bottom Content Info */}
          <div className="absolute bottom-0 left-0 right-16 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            {/* Author Info */}
            <div className="flex items-center gap-2 mb-3">
              <span className="font-bold text-white">{currentReel.authorHandle}</span>
              {currentReel.isVerified && (
                <div 
                  className="flex items-center justify-center w-4 h-4 rounded-full"
                  style={{ background: theme.gold }}
                >
                  <CheckCheck size={10} className="text-black" />
                </div>
              )}
              <button 
                className="ml-2 px-3 py-1 rounded-full text-xs font-medium border transition-colors hover:bg-white/10"
                style={{ borderColor: theme.gold, color: theme.gold }}
              >
                Follow
              </button>
            </div>

            {/* Description */}
            <p className="text-white text-sm mb-3 line-clamp-2">
              {currentReel.description}
            </p>

            {/* Hashtags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {currentReel.hashtags.map(tag => (
                <span 
                  key={tag} 
                  className="text-sm cursor-pointer hover:underline"
                  style={{ color: theme.lightBlue }}
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Audio */}
            <div className="flex items-center gap-2">
              <Music size={14} style={{ color: theme.gold }} />
              <span className="text-white/70 text-sm">{currentReel.audioName}</span>
            </div>
          </div>

          {/* Navigation Indicators */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            {reels.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className="w-1.5 transition-all rounded-full"
                style={{ 
                  height: i === currentIndex ? '28px' : '20px',
                  background: i === currentIndex ? theme.gold : 'rgba(255,255,255,0.3)'
                }}
              />
            ))}
          </div>

          {/* Swipe Hints */}
          {currentIndex === 0 && (
            <div className="absolute bottom-44 left-1/2 -translate-x-1/2 animate-bounce">
              <div className="flex flex-col items-center text-white/60 text-sm">
                <ChevronDown size={24} style={{ color: theme.gold }} />
                <span>Swipe for more</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Arrows for Desktop */}
      <div className="hidden md:block">
        {currentIndex > 0 && (
          <button
            onClick={() => handleScroll('up')}
            className="absolute top-1/2 left-8 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-110"
            style={{ boxShadow: `0 0 20px ${theme.purple}40` }}
          >
            <ChevronUp size={28} />
          </button>
        )}
        {currentIndex < reels.length - 1 && (
          <button
            onClick={() => handleScroll('down')}
            className="absolute top-1/2 right-24 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-110"
            style={{ boxShadow: `0 0 20px ${theme.purple}40` }}
          >
            <ChevronDown size={28} />
          </button>
        )}
      </div>

      {/* Progress Counter */}
      <div 
        className="absolute top-20 left-4 px-3 py-1 rounded-full text-sm font-medium"
        style={{ 
          background: 'rgba(0,0,0,0.5)', 
          color: theme.gold,
          backdropFilter: 'blur(8px)'
        }}
      >
        {currentIndex + 1} / {reels.length}
      </div>

      {/* Keyboard Hints */}
      <div className="absolute bottom-4 left-4 hidden md:flex gap-4 text-white/40 text-xs">
        <span>↑↓ Navigate</span>
        <span>M Mute</span>
      </div>
    </div>
  );
}

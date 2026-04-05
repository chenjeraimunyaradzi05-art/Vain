'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Image, Video, Smile, MapPin, Tag, Briefcase, Globe, Users, MessageCircle, Check, Sparkles, FileText, Clock, BarChart3, Calendar, X, ChevronDown, Send, Plus } from 'lucide-react';
import useAuth from '../../../hooks/useAuth';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';

export default function CreatePostPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [postType, setPostType] = useState('post');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]);
  const [visibility, setVisibility] = useState('everyone');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [feeling, setFeeling] = useState('');
  const [location, setLocation] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const postTypes = [
    { id: 'post', label: 'Post', Icon: FileText, description: 'Share thoughts, updates, or articles' },
    { id: 'story', label: 'Story', Icon: Clock, description: '24-hour disappearing content' },
    { id: 'reel', label: 'Reel', Icon: Video, description: 'Short-form video (15-60s)' },
    { id: 'poll', label: 'Poll', Icon: BarChart3, description: 'Ask your community' },
    { id: 'event', label: 'Event', Icon: Calendar, description: 'Share an upcoming event' }
  ];

  const visibilityOptions = [
    { id: 'everyone', label: 'Everyone', Icon: Globe, description: 'Visible to all users' },
    { id: 'connections', label: 'Connections Only', Icon: Users, description: 'Only your connections' },
    { id: 'groups', label: 'Select Groups', Icon: MessageCircle, description: 'Choose specific groups' }
  ];

  const feelings = [
    { emoji: '😊', label: 'Happy' },
    { emoji: '🎉', label: 'Celebrating' },
    { emoji: '💪', label: 'Motivated' },
    { emoji: '🙏', label: 'Grateful' },
    { emoji: '🤔', label: 'Thoughtful' },
    { emoji: '❤️', label: 'Loved' },
    { emoji: '🔥', label: 'Inspired' },
    { emoji: '✨', label: 'Blessed' }
  ];

  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newMedia = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image'
    }));
    setMedia(prev => [...prev, ...newMedia].slice(0, 10));
  };

  const removeMedia = (id) => {
    setMedia(prev => {
      const item = prev.find(m => m.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(m => m.id !== id);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && media.length === 0 && postType !== 'poll') return;
    if (postType === 'poll' && pollOptions.filter(o => o.trim()).length < 2) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const apiBase = API_BASE;
      
      // Upload media files first if any
      let mediaUrls = [];
      if (media.length > 0 && token) {
        for (const m of media) {
          try {
            // Get presigned upload URL
            const uploadRes = await fetch(`${apiBase}/uploads/url`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ fileName: m.file.name, fileType: m.file.type })
            });
            if (uploadRes.ok) {
              const { uploadUrl, fileUrl } = await uploadRes.json();
              // Upload to presigned URL
              await fetch(uploadUrl, { method: 'PUT', body: m.file, headers: { 'Content-Type': m.file.type } });
              mediaUrls.push(fileUrl);
            }
          } catch (uploadErr) {
            console.error('Media upload error:', uploadErr);
          }
        }
      }
      
      // Create the post
      const visibilityMap = { everyone: 'public', connections: 'connections', groups: 'private' };
      const res = await fetch(`${apiBase}/feed/posts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: postType === 'post' ? 'text' : postType,
          content: content.trim(),
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          pollOptions: postType === 'poll' ? pollOptions.filter(o => o.trim()) : undefined,
          visibility: visibilityMap[visibility] || 'public'
        })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create post');
      }
      
      // Success - redirect to canonical social feed
      router.push('/social-feed');
    } catch (err) {
      console.error('Failed to create post:', err);
      setError(err.message || 'Failed to create post. Please try again.');
      setIsSubmitting(false);
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const updatePollOption = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const characterLimit = postType === 'post' ? 2000 : postType === 'story' ? 500 : 150;
  const charactersRemaining = characterLimit - content.length;
  const canSubmit = (content.trim() || media.length > 0 || (postType === 'poll' && pollOptions.filter(o => o.trim()).length >= 2));

  const currentVisibility = visibilityOptions.find(v => v.id === visibility);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  return (
    <div className="min-h-screen pb-20">
      {/* Aboriginal dot pattern overlay */}
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, #FFD700 1.5px, transparent 1.5px),
            radial-gradient(circle at 80% 70%, #50C878 1.5px, transparent 1.5px),
            radial-gradient(circle at 50% 50%, #E85B8A 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative max-w-2xl mx-auto px-4">
        {/* Header */}
        <div 
          className="sticky top-0 z-20 py-4 mb-6"
          style={{ background: 'linear-gradient(to bottom, rgba(26, 15, 46, 0.98), rgba(26, 15, 46, 0.9))' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link 
                href="/social-feed" 
                className="p-2 rounded-full transition-all hover:scale-105"
                style={{ background: 'rgba(255, 215, 0, 0.1)', color: '#FFD700' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold" style={{ color: '#FFD700' }}>
                Create {postType.charAt(0).toUpperCase() + postType.slice(1)}
              </h1>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              className="flex items-center gap-2 px-5 py-2 rounded-full font-medium transition-all duration-300"
              style={{
                background: canSubmit && !isSubmitting 
                  ? 'linear-gradient(135deg, #50C878, #3DA867)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: canSubmit && !isSubmitting ? '#1A0F2E' : 'rgba(248, 246, 255, 0.4)',
                cursor: canSubmit && !isSubmitting ? 'pointer' : 'not-allowed',
                boxShadow: canSubmit && !isSubmitting ? '0 4px 15px rgba(80, 200, 120, 0.3)' : 'none'
              }}
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Post
                </>
              )}
            </button>
          </div>
        </div>

        {/* Post Type Selection */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {postTypes.map(type => {
            const Icon = type.Icon;
            return (
              <button
                key={type.id}
                onClick={() => setPostType(type.id)}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
                style={{
                  background: postType === type.id 
                    ? 'linear-gradient(135deg, #FFD700, #B76E79)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: postType === type.id 
                    ? 'none' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  color: postType === type.id ? '#1A0F2E' : 'rgba(248, 246, 255, 0.7)'
                }}
              >
                <Icon className="w-4 h-4" />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Author & Content Card */}
          <div 
            className="rounded-2xl p-5"
            style={{ 
              background: 'linear-gradient(135deg, rgba(15, 8, 25, 0.95), rgba(26, 15, 46, 0.95))',
              border: '1px solid rgba(255, 215, 0, 0.25)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 215, 0, 0.1)'
            }}
          >
            {/* Author Preview */}
            <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(183, 110, 121, 0.3))',
                  border: '2px solid rgba(255, 215, 0, 0.4)',
                  color: '#FFD700'
                }}
              >
                YN
              </div>
              <div className="flex-1">
                <p className="font-medium" style={{ color: '#F8F6FF' }}>Your Name</p>
                <button 
                  type="button"
                  onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                  className="flex items-center gap-1 text-sm transition-colors"
                  style={{ color: '#87CEEB' }}
                >
                  {currentVisibility && <currentVisibility.Icon className="w-3 h-3" />}
                  <span>{currentVisibility?.label}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              {feeling && (
                <span className="px-3 py-1 rounded-full text-sm" style={{ background: 'rgba(255, 215, 0, 0.15)', color: '#FFD700' }}>
                  {feelings.find(f => f.label === feeling)?.emoji} {feeling}
                </span>
              )}
            </div>

            {/* Visibility Dropdown */}
            {showVisibilityMenu && (
              <div 
                className="mb-4 p-3 rounded-xl"
                style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                {visibilityOptions.map(option => {
                  const Icon = option.Icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setVisibility(option.id);
                        setShowVisibilityMenu(false);
                      }}
                      className="w-full p-3 rounded-lg flex items-center gap-3 transition-all text-left"
                      style={{
                        background: visibility === option.id ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                        border: visibility === option.id ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid transparent'
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: visibility === option.id ? '#FFD700' : 'rgba(248, 246, 255, 0.6)' }} />
                      <div>
                        <p className="font-medium" style={{ color: '#F8F6FF' }}>{option.label}</p>
                        <p className="text-xs" style={{ color: 'rgba(248, 246, 255, 0.5)' }}>{option.description}</p>
                      </div>
                      {visibility === option.id && (
                        <Check className="w-5 h-5 ml-auto" style={{ color: '#50C878' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, characterLimit))}
              placeholder={
                postType === 'post' 
                  ? "What's on your mind? Share your story, advice, or questions with the community..."
                  : postType === 'story'
                  ? "Add text to your story..."
                  : postType === 'reel'
                  ? "Add a caption for your reel..."
                  : postType === 'poll'
                  ? "Ask your community a question..."
                  : "Share event details..."
              }
              className="w-full min-h-[150px] bg-transparent resize-none focus:outline-none text-lg placeholder-white/40"
              style={{ color: '#F8F6FF' }}
            />

            {/* Poll Options */}
            {postType === 'poll' && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium" style={{ color: 'rgba(248, 246, 255, 0.7)' }}>Poll Options</p>
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-4 py-2 rounded-lg bg-transparent focus:outline-none placeholder-white/30"
                      style={{ 
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        color: '#F8F6FF'
                      }}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePollOption(index)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: '#C41E3A' }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={addPollOption}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                    style={{ color: '#87CEEB', border: '1px dashed rgba(135, 206, 235, 0.3)' }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Option
                  </button>
                )}
              </div>
            )}

            {/* Character Count */}
            <div className="flex justify-between items-center mt-4 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              {location && (
                <span className="flex items-center gap-1 text-sm" style={{ color: '#E85B8A' }}>
                  <MapPin className="w-4 h-4" />
                  {location}
                </span>
              )}
              <span 
                className="text-sm ml-auto"
                style={{ color: charactersRemaining < 50 ? '#C41E3A' : 'rgba(248, 246, 255, 0.4)' }}
              >
                {charactersRemaining} characters left
              </span>
            </div>
          </div>

          {/* Media Preview */}
          {media.length > 0 && (
            <div 
              className="rounded-2xl p-4"
              style={{ 
                background: 'linear-gradient(135deg, rgba(15, 8, 25, 0.9), rgba(20, 40, 30, 0.85))',
                border: '1px solid rgba(80, 200, 120, 0.3)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
              }}
            >
              <div className="flex gap-3 overflow-x-auto pb-2">
                {media.map(item => (
                  <div 
                    key={item.id} 
                    className="relative flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden"
                    style={{ border: '2px solid rgba(255, 215, 0, 0.3)' }}
                  >
                    {item.type === 'video' ? (
                      <video src={item.preview} className="w-full h-full object-cover" />
                    ) : (
                      <img src={toCloudinaryAutoUrl(item.preview)} alt="Upload preview" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(item.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(196, 30, 58, 0.9)', color: 'white' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {item.type === 'video' && (
                      <span 
                        className="absolute bottom-1 left-1 text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(0, 0, 0, 0.7)', color: 'white' }}
                      >
                        <Video className="w-3 h-3 inline mr-1" />
                        Video
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div 
            className="rounded-2xl p-4"
            style={{ 
              background: 'linear-gradient(135deg, rgba(15, 8, 25, 0.9), rgba(20, 25, 40, 0.85))',
              border: '1px solid rgba(135, 206, 235, 0.25)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
            }}
          >
            <p className="text-sm mb-3" style={{ color: 'rgba(248, 246, 255, 0.6)' }}>Add to your post</p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaUpload}
                className="hidden"
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all hover:scale-105"
                style={{ 
                  background: 'rgba(80, 200, 120, 0.15)',
                  border: '1px solid rgba(80, 200, 120, 0.3)',
                  color: '#50C878'
                }}
              >
                <Image className="w-4 h-4" />
                Photo/Video
              </button>
              
              <button
                type="button"
                onClick={() => setFeeling(feeling ? '' : 'Happy')}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all hover:scale-105"
                style={{ 
                  background: feeling ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  color: '#FFD700'
                }}
              >
                <Smile className="w-4 h-4" />
                Feeling
              </button>
              
              <button
                type="button"
                onClick={() => setLocation(location ? '' : 'Sydney, NSW')}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all hover:scale-105"
                style={{ 
                  background: location ? 'rgba(228, 91, 138, 0.2)' : 'rgba(228, 91, 138, 0.1)',
                  border: '1px solid rgba(228, 91, 138, 0.3)',
                  color: '#E85B8A'
                }}
              >
                <MapPin className="w-4 h-4" />
                Location
              </button>
              
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all hover:scale-105"
                style={{ 
                  background: 'rgba(135, 206, 235, 0.1)',
                  border: '1px solid rgba(135, 206, 235, 0.3)',
                  color: '#87CEEB'
                }}
              >
                <Tag className="w-4 h-4" />
                Tag People
              </button>
              
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all hover:scale-105"
                style={{ 
                  background: 'rgba(183, 110, 121, 0.1)',
                  border: '1px solid rgba(183, 110, 121, 0.3)',
                  color: '#B76E79'
                }}
              >
                <Briefcase className="w-4 h-4" />
                Link Job
              </button>
            </div>
          </div>

          {/* Feelings Picker (when active) */}
          {feeling !== '' && (
            <div 
              className="rounded-2xl p-4"
              style={{ 
                background: 'linear-gradient(135deg, rgba(15, 8, 25, 0.9), rgba(30, 25, 15, 0.85))',
                border: '1px solid rgba(255, 215, 0, 0.25)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
              }}
            >
              <p className="text-sm mb-3" style={{ color: 'rgba(248, 246, 255, 0.6)' }}>How are you feeling?</p>
              <div className="flex flex-wrap gap-2">
                {feelings.map(f => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => setFeeling(f.label)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all"
                    style={{ 
                      background: feeling === f.label ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                      border: feeling === f.label ? '1px solid rgba(255, 215, 0, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#F8F6FF'
                    }}
                  >
                    <span>{f.emoji}</span>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div 
            className="rounded-2xl p-4"
            style={{ 
              background: 'linear-gradient(135deg, rgba(15, 8, 25, 0.9), rgba(15, 25, 20, 0.85))',
              border: '1px solid rgba(80, 200, 120, 0.25)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
            }}
          >
            <h3 className="font-medium mb-2 flex items-center gap-2" style={{ color: '#50C878' }}>
              <Sparkles className="w-4 h-4" />
              Tips for great posts
            </h3>
            <ul className="text-sm space-y-1" style={{ color: 'rgba(248, 246, 255, 0.7)' }}>
              <li>• Share authentic experiences and advice from your journey</li>
              <li>• Use relevant hashtags like #FirstNationsJobs #IndigenousCareers</li>
              <li>• Engage respectfully with comments and feedback</li>
              <li>• Tag organizations for job-related content</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}

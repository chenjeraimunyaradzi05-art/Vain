'use client';

import api from '@/lib/apiClient';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from '@/components/ui/OptimizedImage';
import { isCloudinaryPublicId } from '@/lib/cloudinary';
import { Space_Grotesk } from 'next/font/google';
import { 
  ArrowLeft, Image as ImageIcon, Video, MapPin, Hash, 
  AtSign, Smile, X, Sparkles, Globe, Users, Lock
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'], 
  weight: ['400', '500', '700'],
  variable: '--font-space-grotesk'
});

export default function NewPostPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'connections' | 'private'>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect unauthenticated users
  if (!isLoading && !isAuthenticated) {
    router.push('/signin?returnTo=/social-feed/new');
    return null;
  }

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        // Video uploads require backend storage; keep UI simple for now.
        console.warn('Video uploads are not supported in this environment');
        return;
      }
      setMediaFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setMediaPreview(null);
    setMediaFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) return;
    
    setIsSubmitting(true);
    try {
      const res = await api('/social-feed/posts', {
        method: 'POST',
        body: {
          type: 'text',
          content,
          visibility,
          ...(mediaPreview ? { mediaUrls: [mediaPreview] } : {}),
        },
      });

      if (res.ok) {
        router.push('/social-feed');
      } else {
        setError(res.error || 'Failed to create post. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonEmojis = ['🎉', '💎', '🔥', '❤️', '👏', '🙌', '✨', '🌟', '💪', '🤝', '📚', '💼', '🎓', '🏆', '🌏'];

  const visibilityOptions = [
    { id: 'public', icon: Globe, label: 'Public', description: 'Anyone can see this' },
    { id: 'connections', icon: Users, label: 'Connections', description: 'Only your connections' },
    { id: 'private', icon: Lock, label: 'Private', description: 'Only you can see this' },
  ];

  return (
    <div className={`${spaceGrotesk.className} ngurra-page`}>
      {/* Dot pattern overlay */}
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm animate-in">
          {error}
          <button onClick={() => setError(null)} className="ml-3 font-bold">×</button>
        </div>
      )}

      <div 
        className="fixed inset-0 opacity-[0.04] dark:opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, #FFD700 1.5px, transparent 1.5px),
            radial-gradient(circle at 80% 70%, #50C878 1.5px, transparent 1.5px),
            radial-gradient(circle at 50% 50%, #E85B8A 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      />

      <div className="relative max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/social-feed"
              className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              Create Post
            </h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && !mediaFile)}
            className="px-6 py-2 rounded-lg font-medium bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Post Form */}
        <div className="rounded-xl bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden">
          {/* Author Info */}
          <div className="p-4 flex items-center gap-3 border-b border-gray-200 dark:border-white/10">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {user?.profile?.firstName?.[0] || user?.email?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 dark:text-white">
                {user?.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : 'Community Member'}
              </div>
              {/* Visibility Selector */}
              <div className="relative mt-1">
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as 'public' | 'connections' | 'private')}
                  className="appearance-none bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-sm rounded-lg px-3 py-1 pr-8 border border-gray-200 dark:border-white/10 focus:outline-none focus:border-amber-500/50"
                >
                  {visibilityOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                <Globe className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Content Input */}
          <div className="p-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your story, celebrate a win, or ask the community for advice..."
              className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none text-lg leading-relaxed"
              rows={6}
              autoFocus
              maxLength={2000}
            />
            <div className="flex justify-end mt-1">
              <span className={`text-xs ${content.length > 1800 ? (content.length > 1950 ? 'text-red-500' : 'text-amber-500') : 'text-gray-400 dark:text-gray-500'}`}>
                {content.length}/2000
              </span>
            </div>

            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative mt-4 rounded-xl overflow-hidden">
                <Image
                  src={mediaPreview}
                  alt="Media preview"
                  width={600}
                  height={400}
                  cloudinary={isCloudinaryPublicId(mediaPreview || '')}
                  className="w-full h-auto object-cover rounded-xl"
                />
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Emoji Picker */}
          {showEmojiPicker && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                {commonEmojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setContent(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="text-2xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions Bar */}
          <div className="p-4 border-t border-gray-200 dark:border-white/10 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              title="Add photo"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg text-sky-600 dark:text-sky-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              title="Add video"
            >
              <Video className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              title="Add emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            <button
              className="p-2 rounded-lg text-pink-600 dark:text-pink-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              title="Add location"
            >
              <MapPin className="w-5 h-5" />
            </button>
            <button
              onClick={() => setContent(prev => prev + '#')}
              className="p-2 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              title="Add hashtag"
            >
              <Hash className="w-5 h-5" />
            </button>
            <button
              onClick={() => setContent(prev => prev + '@')}
              className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              title="Mention someone"
            >
              <AtSign className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tips Card */}
        <div className="mt-6 rounded-xl p-4 bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none">
          <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Tips for a Great Post
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400">✦</span>
              Share your career journey, wins, and lessons learned
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400">✦</span>
              Ask questions—our community loves to help!
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400">✦</span>
              Use hashtags like #FirstNationsInTech to join conversations
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400">✦</span>
              Photos and videos get 3x more engagement
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

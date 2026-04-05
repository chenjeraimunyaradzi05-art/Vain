'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from '@/components/ui/OptimizedImage';
import api from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import {
  Image as ImageIcon,
  Video,
  FileText,
  X,
  Loader2,
  Globe,
  Users,
  Lock,
  Sparkles,
} from 'lucide-react';

interface PostComposerProps {
  onPostCreated?: () => void;
  placeholder?: string;
  compact?: boolean;
}

type MediaType = 'image' | 'video' | null;
type Visibility = 'public' | 'connections' | 'private';

export default function PostComposer({
  onPostCreated,
  placeholder = "Share your story with the community...",
  compact = false,
}: PostComposerProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [content, setContent] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        return;
      }
      setError(null);
      setMediaType('image');
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setIsExpanded(true);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setError('Video must be less than 100MB');
        return;
      }
      setError(null);
      setMediaType('video');
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setIsExpanded(true);
    }
  };

  const removeMedia = () => {
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaPreview) return;
    if (!isAuthenticated) {
      router.push('/signin?returnTo=/connections');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api('/social-feed/posts', {
        method: 'POST',
        body: {
          type: mediaType === 'video' ? 'video' : mediaType === 'image' ? 'image' : 'text',
          content,
          visibility,
          ...(mediaPreview ? { mediaUrls: [mediaPreview] } : {}),
        },
      });

      if (res.ok) {
        setContent('');
        setMediaPreview(null);
        setMediaType(null);
        setIsExpanded(false);
        onPostCreated?.();
      } else {
        setError('Failed to create post. Please try again.');
      }
    } catch (err) {
      console.error('Failed to create post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibilityOptions = [
    { id: 'public' as Visibility, icon: Globe, label: 'Public' },
    { id: 'connections' as Visibility, icon: Users, label: 'Connections' },
    { id: 'private' as Visibility, icon: Lock, label: 'Only me' },
  ];

  const colors = {
    pink: '#E91E8C',
    purple: '#8B5CF6',
    emerald: '#10B981',
    amber: '#F59E0B',
    sky: '#0EA5E9',
  };

  if (!isAuthenticated) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <p className="text-gray-400 text-center py-4">
          <a href="/signin?returnTo=/connections" className="text-pink-400 hover:text-pink-300">
            Sign in
          </a>{' '}
          to share posts with your network
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
          style={{
            background: `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)`,
          }}
        >
          {user?.profile?.firstName?.[0] || user?.email?.[0] || 'U'}
        </div>
        <div className="flex-1">
          {isExpanded || !compact ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              placeholder={placeholder}
              className="w-full bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none min-h-[80px]"
              rows={3}
            />
          ) : (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full p-3 rounded-xl text-left text-gray-400 hover:bg-white/5 transition-colors"
              style={{ background: 'rgba(255, 255, 255, 0.05)' }}
            >
              {placeholder}
            </button>
          )}
        </div>
      </div>

      {/* Media Preview */}
      {mediaPreview && (
        <div className="px-4 pb-4">
          <div className="relative rounded-xl overflow-hidden">
            {mediaType === 'video' ? (
              <video
                src={mediaPreview}
                controls
                className="w-full max-h-[300px] object-contain bg-black/50 rounded-xl"
              />
            ) : (
              <div className="relative aspect-video">
                <Image
                  src={mediaPreview}
                  alt="Preview"
                  fill
                  className="object-cover rounded-xl"
                />
              </div>
            )}
            <button
              onClick={removeMedia}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-4 pb-2">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      {(isExpanded || !compact) && (
        <div className="p-4 border-t border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Photo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-emerald-400 hover:bg-emerald-400/10 transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Photo</span>
            </button>

            {/* Video */}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />
            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-sky-400 hover:bg-sky-400/10 transition-colors"
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Video</span>
            </button>

            {/* Text indicator */}
            <div className="flex items-center gap-1.5 px-3 py-2 text-sm text-amber-400">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Text</span>
            </div>

            {/* Visibility */}
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="bg-white/5 text-gray-300 text-sm rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:border-pink-500/50"
            >
              {visibilityOptions.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-[#1A0F2E]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && !mediaPreview)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white font-medium text-sm transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            style={{
              background: `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)`,
              boxShadow: '0 4px 15px rgba(233, 30, 140, 0.3)',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Post
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X, ChevronLeft, ChevronRight, Volume2, VolumeX,
  Plus, Music2, Eye, Clock, Image as ImageIcon
} from 'lucide-react';
import OptimizedImage from '@/components/ui/OptimizedImage';

export interface StorySlide {
  id: string;
  type: 'photo' | 'text';
  content: string;
  caption?: string;
  backgroundColor?: string;
  textColor?: string;
  youtubeTrackId?: string;
  youtubeTrackTitle?: string;
  youtubeTrackArtist?: string;
  duration: number;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  slides: StorySlide[];
  createdAt: string;
  viewCount: number;
  hasViewed: boolean;
}

interface ProfileStoriesProps {
  stories: Story[];
  currentUserId?: string;
}

function StoryRing({ story, onClick }: { story: Story; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
      <div className={`w-[68px] h-[68px] rounded-full p-[3px] transition-transform group-hover:scale-105 ${
        story.hasViewed
          ? 'bg-white/20'
          : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'
      }`}>
        <div className="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center text-2xl border-2 border-[#1a1a2e]">
          {story.userAvatar}
        </div>
      </div>
      <span className="text-[11px] text-white/70 truncate max-w-[68px] font-medium">
        {story.userName.split(' ')[0]}
      </span>
    </button>
  );
}

function AddStoryButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
      <div className="w-[68px] h-[68px] rounded-full p-[3px] bg-gradient-to-tr from-amber-400/60 to-emerald-400/60 transition-transform group-hover:scale-105">
        <div className="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center border-2 border-[#1a1a2e]">
          <Plus className="w-7 h-7 text-amber-400" />
        </div>
      </div>
      <span className="text-[11px] text-white/70 font-medium">Your Story</span>
    </button>
  );
}

function StoryViewer({
  stories,
  initialIndex,
  onClose,
}: {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [storyIdx, setStoryIdx] = useState(initialIndex);
  const [slideIdx, setSlideIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const story = stories[storyIdx];
  const slide = story?.slides[slideIdx];

  const goNext = () => {
    setProgress(0);
    if (slideIdx < story.slides.length - 1) {
      setSlideIdx((s) => s + 1);
    } else if (storyIdx < stories.length - 1) {
      setStoryIdx((s) => s + 1);
      setSlideIdx(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    setProgress(0);
    if (slideIdx > 0) {
      setSlideIdx((s) => s - 1);
    } else if (storyIdx > 0) {
      const prevIdx = storyIdx - 1;
      setStoryIdx(prevIdx);
      setSlideIdx(stories[prevIdx].slides.length - 1);
    }
  };

  useEffect(() => {
    if (paused || !slide) return;
    const dur = slide.duration * 1000;
    const tick = 50;
    let elapsed = 0;

    timerRef.current = setInterval(() => {
      elapsed += tick;
      setProgress((elapsed / dur) * 100);
      if (elapsed >= dur) goNext();
    }, tick);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyIdx, slideIdx, paused]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyIdx, slideIdx]);

  if (!story || !slide) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
      >
        <X className="w-6 h-6" />
      </button>

      {(storyIdx > 0 || slideIdx > 0) && (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {(storyIdx < stories.length - 1 || slideIdx < story.slides.length - 1) && (
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div
        className="relative w-full max-w-[420px] h-[90vh] max-h-[780px] rounded-2xl overflow-hidden mx-4 select-none"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x < rect.width / 3) goPrev();
          else goNext();
        }}
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {slide.type === 'photo' ? (
          slide.content ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.content})` }}
            >
              <div className="absolute inset-0 bg-black/20" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900 flex items-center justify-center">
              <ImageIcon className="w-20 h-20 text-white/10" />
            </div>
          )
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center p-10"
            style={{ backgroundColor: slide.backgroundColor || '#6366f1' }}
          >
            <p
              className="text-2xl md:text-3xl font-bold text-center leading-relaxed"
              style={{ color: slide.textColor || '#fff' }}
            >
              {slide.content}
            </p>
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 flex gap-1 p-3 z-10">
          {story.slides.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-75"
                style={{
                  width: i < slideIdx ? '100%' : i === slideIdx ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-8 left-0 right-0 px-4 flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg">
            {story.userAvatar}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{story.userName}</p>
            <p className="text-white/60 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {story.createdAt}
            </p>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-xs">
            <Eye className="w-4 h-4" />
            {story.viewCount}
          </div>
        </div>

        {slide.caption && (
          <div className="absolute bottom-20 left-0 right-0 px-6 z-10">
            <p className="text-white text-center text-sm bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2">
              {slide.caption}
            </p>
          </div>
        )}

        {slide.youtubeTrackId && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md rounded-full px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center flex-shrink-0 animate-[spin_3s_linear_infinite]">
                <Music2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {slide.youtubeTrackTitle}
                </p>
                <p className="text-white/60 text-xs truncate">
                  {slide.youtubeTrackArtist}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMuted(!muted);
                }}
                className="text-white/80 hover:text-white p-1"
              >
                {muted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>
            <iframe
              className="absolute -bottom-[300px] left-0 w-1 h-1 opacity-0 pointer-events-none"
              src={`https://www.youtube.com/embed/${slide.youtubeTrackId}?autoplay=1&loop=1&playlist=${slide.youtubeTrackId}&controls=0&mute=${muted ? 1 : 0}`}
              allow="autoplay"
              title="Background music"
            />
          </div>
        )}

        {paused && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <div className="w-0 h-0 border-l-[20px] border-l-white border-y-[12px] border-y-transparent ml-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StoryCreator({ onClose }: { onClose: () => void }) {
  const [slideType, setSlideType] = useState<'photo' | 'text'>('photo');
  const [text, setText] = useState('');
  const [caption, setCaption] = useState('');
  const [bgColor, setBgColor] = useState('#6366f1');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeInfo, setYoutubeInfo] = useState<{
    id: string;
    title: string;
    artist: string;
  } | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bgColors = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981',
    '#ef4444', '#8b5cf6', '#06b6d4', '#1a1a2e',
  ];

  const extractYoutubeId = (url: string) => {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  };

  const handleYoutubeAdd = () => {
    const id = extractYoutubeId(youtubeUrl);
    if (id) {
      setYoutubeInfo({
        id,
        title: youtubeUrl.includes('watch') ? 'YouTube Track' : 'YouTube Track',
        artist: 'via YouTube',
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-[#1a1a2e] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Create Story</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex gap-2">
            <button
              onClick={() => setSlideType('photo')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition ${
                slideType === 'photo'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              <ImageIcon className="w-4 h-4" /> Photo
            </button>
            <button
              onClick={() => setSlideType('text')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition ${
                slideType === 'text'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              <span className="text-base font-bold">Aa</span> Text
            </button>
          </div>

          {slideType === 'photo' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[9/16] max-h-[300px] rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-amber-400/40 transition overflow-hidden"
              >
                {photoPreview ? (
                  <OptimizedImage
                    src={photoPreview}
                    alt="Story photo preview"
                    width={270}
                    height={480}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6">
                    <ImageIcon className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">
                      Tap to upload a photo
                    </p>
                    <p className="text-white/25 text-xs mt-1">
                      JPG, PNG or GIF
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="What's on your mind..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 resize-none focus:border-amber-400/40 focus:outline-none"
              />
              <div className="mt-3">
                <p className="text-xs text-white/50 mb-2">Background</p>
                <div className="flex gap-2 flex-wrap">
                  {bgColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setBgColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        bgColor === c
                          ? 'border-white scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-white/50 mb-2">
              Caption (optional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:border-amber-400/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs text-white/50 mb-2">
              <Music2 className="w-3.5 h-3.5" /> Background Music (YouTube)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste YouTube URL..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:border-red-500/40 focus:outline-none"
              />
              <button
                onClick={handleYoutubeAdd}
                className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-medium"
              >
                Add
              </button>
            </div>
            {youtubeInfo && (
              <div className="mt-2 flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                  <Music2 className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {youtubeInfo.title}
                  </p>
                  <p className="text-white/60 text-xs">{youtubeInfo.artist}</p>
                </div>
                <button
                  onClick={() => setYoutubeInfo(null)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 transition font-medium text-sm"
          >
            Cancel
          </button>
          <button className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-pink-500 text-black font-semibold hover:opacity-90 transition text-sm">
            Share Story
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileStories({
  stories,
  currentUserId,
}: ProfileStoriesProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);

  const openStory = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
        <AddStoryButton onClick={() => setCreatorOpen(true)} />
        {stories.map((story, i) => (
          <StoryRing key={story.id} story={story} onClick={() => openStory(i)} />
        ))}
      </div>

      {viewerOpen && (
        <StoryViewer
          stories={stories}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {creatorOpen && (
        <StoryCreator onClose={() => setCreatorOpen(false)} />
      )}
    </>
  );
}

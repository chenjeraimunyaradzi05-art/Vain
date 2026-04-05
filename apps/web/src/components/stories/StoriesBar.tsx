'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Story {
    id: string;
    type: 'image' | 'video' | 'text';
    mediaUrl?: string;
    text?: string;
    backgroundColor?: string;
    duration: number;
    createdAt: string;
    expiresAt: string;
    isViewed: boolean;
    viewCount: number;
    reactionCount: number;
}

interface StoryGroup {
    userId: string;
    userName: string;
    userAvatar?: string;
    stories: Story[];
    hasUnviewed: boolean;
    latestAt: string;
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👏', '🔥', '💯'];

export default function StoriesBar() {
    const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStory, setActiveStory] = useState<{group: StoryGroup, index: number} | null>(null);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const progressInterval = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchStories();
    }, []);

    async function fetchStories() {
        try {
            const res = await fetch('/api/social-stories/feed', {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setStoryGroups(data.storyGroups || []);
            }
        } catch (error) {
            console.error('Error fetching stories:', error);
        } finally {
            setLoading(false);
        }
    }

    function openStory(group: StoryGroup, startIndex = 0) {
        // Find first unviewed story, or start at beginning
        let index = startIndex;
        if (group.hasUnviewed) {
            const unviewedIndex = group.stories.findIndex(s => !s.isViewed);
            if (unviewedIndex !== -1) index = unviewedIndex;
        }
        setActiveStory({ group, index });
        setProgress(0);
        markAsViewed(group.stories[index].id);
        startProgressTimer(group.stories[index].duration);
    }

    function startProgressTimer(duration: number) {
        if (progressInterval.current) clearInterval(progressInterval.current);
        
        const step = 100 / (duration * 10); // Update every 100ms
        progressInterval.current = setInterval(() => {
            if (isPaused) return;
            setProgress(prev => {
                if (prev >= 100) {
                    goToNextStory();
                    return 0;
                }
                return prev + step;
            });
        }, 100);
    }

    function goToNextStory() {
        if (!activeStory) return;
        
        const nextIndex = activeStory.index + 1;
        if (nextIndex < activeStory.group.stories.length) {
            setActiveStory({ ...activeStory, index: nextIndex });
            setProgress(0);
            markAsViewed(activeStory.group.stories[nextIndex].id);
            startProgressTimer(activeStory.group.stories[nextIndex].duration);
        } else {
            // Move to next user's stories
            const currentGroupIndex = storyGroups.findIndex(g => g.userId === activeStory.group.userId);
            if (currentGroupIndex < storyGroups.length - 1) {
                openStory(storyGroups[currentGroupIndex + 1]);
            } else {
                closeStory();
            }
        }
    }

    function goToPrevStory() {
        if (!activeStory) return;
        
        const prevIndex = activeStory.index - 1;
        if (prevIndex >= 0) {
            setActiveStory({ ...activeStory, index: prevIndex });
            setProgress(0);
            startProgressTimer(activeStory.group.stories[prevIndex].duration);
        } else {
            // Move to previous user's stories
            const currentGroupIndex = storyGroups.findIndex(g => g.userId === activeStory.group.userId);
            if (currentGroupIndex > 0) {
                const prevGroup = storyGroups[currentGroupIndex - 1];
                openStory(prevGroup, prevGroup.stories.length - 1);
            }
        }
    }

    function closeStory() {
        if (progressInterval.current) clearInterval(progressInterval.current);
        setActiveStory(null);
        setProgress(0);
        setShowReactions(false);
        fetchStories(); // Refresh to update viewed status
    }

    async function markAsViewed(storyId: string) {
        try {
            await fetch(`/api/social-stories/${storyId}/view`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Error marking story as viewed:', error);
        }
    }

    async function sendReaction(emoji: string) {
        if (!activeStory) return;
        
        try {
            await fetch(`/api/social-stories/${activeStory.group.stories[activeStory.index].id}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reaction: emoji })
            });
            setShowReactions(false);
        } catch (error) {
            console.error('Error sending reaction:', error);
        }
    }

    function handleStoryClick(e: React.MouseEvent<HTMLDivElement>) {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        
        if (clickX < width / 3) {
            goToPrevStory();
        } else if (clickX > (width * 2) / 3) {
            goToNextStory();
        } else {
            setIsPaused(prev => !prev);
        }
    }

    function getTimeRemaining(expiresAt: string): string {
        const remaining = new Date(expiresAt).getTime() - Date.now();
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        if (hours > 0) return `${hours}h left`;
        const minutes = Math.floor(remaining / (1000 * 60));
        return `${minutes}m left`;
    }

    if (loading) {
        return (
            <div className="flex gap-4 p-4 overflow-x-auto">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                        <div className="w-16 h-16 rounded-full bg-gray-700" />
                        <div className="w-12 h-3 rounded bg-gray-700" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <>
            {/* Stories Bar */}
            <div className="flex gap-4 p-4 overflow-x-auto scrollbar-hide">
                {/* Create Story Button */}
                <button
                    onClick={() => router.push('/stories/create')}
                    className="flex flex-col items-center gap-2 flex-shrink-0"
                >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <span className="text-xs text-gray-400">Add Story</span>
                </button>

                {/* Story Circles */}
                {storyGroups.map(group => (
                    <button
                        key={group.userId}
                        onClick={() => openStory(group)}
                        className="flex flex-col items-center gap-2 flex-shrink-0"
                    >
                        <div className={`p-0.5 rounded-full ${
                            group.hasUnviewed 
                                ? 'bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600' 
                                : 'bg-gray-600'
                        }`}>
                            <div className="w-14 h-14 rounded-full border-2 border-gray-900 overflow-hidden">
                                {group.userAvatar ? (
                                    <Image
                                        src={group.userAvatar}
                                        alt={group.userName}
                                        width={56}
                                        height={56}
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-lg font-semibold">
                                        {group.userName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>
                        <span className="text-xs text-gray-400 max-w-[64px] truncate">
                            {group.userName}
                        </span>
                    </button>
                ))}
            </div>

            {/* Full Screen Story Viewer */}
            {activeStory && (
                <div className="fixed inset-0 z-50 bg-black">
                    {/* Progress Bars */}
                    <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
                        {activeStory.group.stories.map((story, i) => (
                            <div key={story.id} className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-100"
                                    style={{
                                        width: i < activeStory.index ? '100%' 
                                            : i === activeStory.index ? `${progress}%` 
                                            : '0%'
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Header */}
                    <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 pt-4 z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden">
                                {activeStory.group.userAvatar ? (
                                    <Image
                                        src={activeStory.group.userAvatar}
                                        alt={activeStory.group.userName}
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white font-semibold">
                                        {activeStory.group.userName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-white font-semibold text-sm">{activeStory.group.userName}</p>
                                <p className="text-gray-400 text-xs">
                                    {getTimeRemaining(activeStory.group.stories[activeStory.index].expiresAt)}
                                </p>
                            </div>
                        </div>
                        <button onClick={closeStory} className="text-white p-2">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Story Content */}
                    <div 
                        className="h-full flex items-center justify-center"
                        onClick={handleStoryClick}
                    >
                        {activeStory.group.stories[activeStory.index].type === 'image' && (
                            <Image
                                src={activeStory.group.stories[activeStory.index].mediaUrl || ''}
                                alt="Story"
                                fill
                                className="object-contain"
                            />
                        )}
                        {activeStory.group.stories[activeStory.index].type === 'video' && (
                            <video
                                src={activeStory.group.stories[activeStory.index].mediaUrl}
                                autoPlay
                                muted={false}
                                className="max-h-full max-w-full"
                            />
                        )}
                        {activeStory.group.stories[activeStory.index].type === 'text' && (
                            <div 
                                className="w-full h-full flex items-center justify-center p-8"
                                style={{ backgroundColor: activeStory.group.stories[activeStory.index].backgroundColor || '#1a1a2e' }}
                            >
                                <p className="text-white text-2xl text-center font-medium">
                                    {activeStory.group.stories[activeStory.index].text}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pause Indicator */}
                    {isPaused && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                            </div>
                        </div>
                    )}

                    {/* Reactions */}
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-10">
                        {showReactions ? (
                            <div className="bg-gray-800/90 rounded-full px-4 py-2 flex gap-4">
                                {REACTION_EMOJIS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => sendReaction(emoji)}
                                        className="text-2xl hover:scale-125 transition-transform"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowReactions(true)}
                                className="bg-gray-800/90 rounded-full px-6 py-2 text-white flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                React
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

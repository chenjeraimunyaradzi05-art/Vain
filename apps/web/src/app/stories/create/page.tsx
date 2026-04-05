'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const BACKGROUND_COLORS = [
    '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560',
    '#7b2cbf', '#2d6a4f', '#14213d', '#003566', '#6c584c'
];

const FONT_STYLES = [
    { id: 'normal', name: 'Normal', className: 'font-normal' },
    { id: 'bold', name: 'Bold', className: 'font-bold' },
    { id: 'serif', name: 'Serif', className: 'font-serif' },
    { id: 'mono', name: 'Mono', className: 'font-mono' }
];

export default function CreateStoryPage() {
    const [storyType, setStoryType] = useState<'text' | 'image' | 'video'>('text');
    const [text, setText] = useState('');
    const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0]);
    const [fontStyle, setFontStyle] = useState('normal');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [visibility, setVisibility] = useState<'public' | 'connections' | 'close_friends'>('connections');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
            setError('Please select an image or video file');
            return;
        }

        // Check file size (10MB for images, 50MB for videos)
        const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setError(`File is too large. Max size: ${isVideo ? '50MB' : '10MB'}`);
            return;
        }

        setStoryType(isImage ? 'image' : 'video');
        
        // Create preview
        const reader = new FileReader();
        reader.onload = () => {
            setMediaPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload file
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'story');

            const res = await fetch('/api/uploads', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setMediaUrl(data.url);
                setError('');
            } else {
                setError('Failed to upload file');
            }
        } catch (err) {
            setError('Failed to upload file');
        }
    }

    async function handleSubmit() {
        if (storyType === 'text' && !text.trim()) {
            setError('Please enter some text for your story');
            return;
        }

        if ((storyType === 'image' || storyType === 'video') && !mediaUrl) {
            setError('Please upload a media file');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/social-stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    type: storyType,
                    text: storyType === 'text' ? text : undefined,
                    mediaUrl: storyType !== 'text' ? mediaUrl : undefined,
                    backgroundColor: storyType === 'text' ? backgroundColor : undefined,
                    fontStyle: storyType === 'text' ? fontStyle : undefined,
                    visibility,
                    duration: 5
                })
            });

            if (res.ok) {
                router.push('/');
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to create story');
            }
        } catch (err) {
            setError('Failed to create story');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h1 className="text-lg font-semibold">Create Story</h1>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    {isSubmitting ? 'Posting...' : 'Share'}
                </button>
            </div>

            {/* Story Type Selector */}
            <div className="flex gap-4 p-4 border-b border-gray-800">
                <button
                    onClick={() => setStoryType('text')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        storyType === 'text' 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    Text
                </button>
                <button
                    onClick={() => {
                        setStoryType('image');
                        fileInputRef.current?.click();
                    }}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        storyType === 'image' 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    Photo
                </button>
                <button
                    onClick={() => {
                        setStoryType('video');
                        fileInputRef.current?.click();
                    }}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        storyType === 'video' 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    Video
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Preview Area */}
            <div className="aspect-[9/16] max-h-[60vh] mx-auto my-4 overflow-hidden rounded-xl">
                {storyType === 'text' ? (
                    <div 
                        className="w-full h-full flex items-center justify-center p-8"
                        style={{ backgroundColor }}
                    >
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type your story..."
                            className={`w-full bg-transparent text-white text-2xl text-center resize-none focus:outline-none placeholder-white/50 ${
                                FONT_STYLES.find(f => f.id === fontStyle)?.className
                            }`}
                            style={{ minHeight: '200px' }}
                            maxLength={500}
                        />
                    </div>
                ) : mediaPreview ? (
                    storyType === 'image' ? (
                        <Image
                            src={mediaPreview}
                            alt="Story preview"
                            fill
                            className="object-contain"
                        />
                    ) : (
                        <video
                            src={mediaPreview}
                            controls
                            className="w-full h-full object-contain"
                        />
                    )
                ) : (
                    <div 
                        className="w-full h-full flex flex-col items-center justify-center bg-gray-800 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <svg className="w-16 h-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-400">Tap to upload {storyType}</p>
                    </div>
                )}
            </div>

            {/* Text Story Options */}
            {storyType === 'text' && (
                <div className="p-4 space-y-4">
                    {/* Background Colors */}
                    <div>
                        <p className="text-sm text-gray-400 mb-2">Background</p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {BACKGROUND_COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setBackgroundColor(color)}
                                    className={`w-10 h-10 rounded-full flex-shrink-0 ${
                                        backgroundColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                                    }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Font Styles */}
                    <div>
                        <p className="text-sm text-gray-400 mb-2">Font Style</p>
                        <div className="flex gap-2">
                            {FONT_STYLES.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => setFontStyle(style.id)}
                                    className={`px-4 py-2 rounded-lg ${style.className} ${
                                        fontStyle === style.id 
                                            ? 'bg-indigo-600 text-white' 
                                            : 'bg-gray-800 text-gray-400'
                                    }`}
                                >
                                    {style.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Visibility Options */}
            <div className="p-4 border-t border-gray-800">
                <p className="text-sm text-gray-400 mb-2">Who can see this?</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => setVisibility('public')}
                        className={`flex-1 py-2 rounded-lg text-sm ${
                            visibility === 'public' 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-gray-800 text-gray-400'
                        }`}
                    >
                        Everyone
                    </button>
                    <button
                        onClick={() => setVisibility('connections')}
                        className={`flex-1 py-2 rounded-lg text-sm ${
                            visibility === 'connections' 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-gray-800 text-gray-400'
                        }`}
                    >
                        Connections
                    </button>
                    <button
                        onClick={() => setVisibility('close_friends')}
                        className={`flex-1 py-2 rounded-lg text-sm ${
                            visibility === 'close_friends' 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-gray-800 text-gray-400'
                        }`}
                    >
                        Close Friends
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="p-4 text-center">
                <p className="text-sm text-gray-500">
                    Stories disappear after 24 hours. Save to Highlights to keep them on your profile.
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4">
                    <p className="text-red-400 text-center">{error}</p>
                </div>
            )}
        </div>
    );
}

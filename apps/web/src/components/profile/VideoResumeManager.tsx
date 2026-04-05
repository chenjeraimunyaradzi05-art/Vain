'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * VideoResume - Video resume recording and management
 * 
 * Features:
 * - Record video resume with webcam
 * - Upload pre-recorded videos
 * - Video editing (trim)
 * - Privacy controls
 * - Share with employers
 * - Tips and prompts for recording
 */

interface VideoResume {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  status: 'draft' | 'processing' | 'ready' | 'failed';
  visibility: 'private' | 'employers' | 'public';
  views: number;
  createdAt: string;
  updatedAt: string;
}

interface RecordingTip {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// API functions
const videoResumeApi = {
  async getVideoResumes(): Promise<{ resumes: VideoResume[] }> {
    const res = await fetch('/api/video-resumes', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch video resumes');
    return res.json();
  },

  async getUploadUrl(): Promise<{ uploadUrl: string; videoId: string }> {
    const res = await fetch('/api/video-resumes/upload-url', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to get upload URL');
    return res.json();
  },

  async uploadVideo(uploadUrl: string, file: Blob): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': 'video/webm' },
    });
    if (!res.ok) throw new Error('Failed to upload video');
  },

  async completeUpload(videoId: string, metadata: { title: string; description?: string }): Promise<VideoResume> {
    const res = await fetch(`/api/video-resumes/${videoId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(metadata),
    });
    if (!res.ok) throw new Error('Failed to complete upload');
    return res.json();
  },

  async updateResume(id: string, data: Partial<VideoResume>): Promise<VideoResume> {
    const res = await fetch(`/api/video-resumes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update resume');
    return res.json();
  },

  async deleteResume(id: string): Promise<void> {
    const res = await fetch(`/api/video-resumes/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete resume');
  },
};

// Recording tips
const recordingTips: RecordingTip[] = [
  {
    id: '1',
    title: 'Good Lighting',
    description: 'Position yourself facing a window or light source for a clear, well-lit video',
    icon: '💡',
  },
  {
    id: '2',
    title: 'Quiet Environment',
    description: 'Choose a quiet space to ensure clear audio without background noise',
    icon: '🔇',
  },
  {
    id: '3',
    title: 'Eye Contact',
    description: 'Look at the camera, not the screen, to create connection with viewers',
    icon: '👁️',
  },
  {
    id: '4',
    title: 'Keep It Brief',
    description: 'Aim for 1-2 minutes to keep employers engaged',
    icon: '⏱️',
  },
  {
    id: '5',
    title: 'Be Yourself',
    description: 'Share your story authentically - your unique perspective is your strength',
    icon: '✨',
  },
];

// Suggested topics
const suggestedTopics = [
  'Introduce yourself and your background',
  'Share your career goals and aspirations',
  'Highlight your key skills and experience',
  'Describe what makes you unique',
  'Share a accomplishment you\'re proud of',
  'Explain what you\'re looking for in your next role',
];

// Format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Video Card Component
function VideoResumeCard({
  resume,
  onEdit,
  onDelete,
  onView,
}: {
  resume: VideoResume;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const visibilityConfig = {
    private: { label: 'Private', icon: '🔒', color: 'gray' },
    employers: { label: 'Employers Only', icon: '💼', color: 'blue' },
    public: { label: 'Public', icon: '🌐', color: 'green' },
  };

  const visibility = visibilityConfig[resume.visibility];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-900 cursor-pointer group" onClick={onView}>
        {resume.thumbnailUrl ? (
          <OptimizedImage src={toCloudinaryAutoUrl(resume.thumbnailUrl)} alt={resume.title || 'Video resume thumbnail'} width={400} height={225} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Duration */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
          {formatDuration(resume.duration)}
        </div>

        {/* Status Badge */}
        {resume.status !== 'ready' && (
          <div className={`absolute top-2 left-2 px-2 py-1 text-xs rounded ${
            resume.status === 'processing' ? 'bg-yellow-500 text-white' :
            resume.status === 'failed' ? 'bg-red-500 text-white' :
            'bg-gray-500 text-white'
          }`}>
            {resume.status === 'processing' ? 'Processing...' :
             resume.status === 'failed' ? 'Failed' : 'Draft'}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{resume.title}</h3>
        {resume.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{resume.description}</p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded bg-${visibility.color}-100 dark:bg-${visibility.color}-900/30 text-${visibility.color}-700 dark:text-${visibility.color}-400`}>
            {visibility.icon} {visibility.label}
          </span>
          <span>{resume.views} views</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            Edit
          </Button>
          <button
            onClick={onDelete}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Recording Component
function VideoRecorder({
  onComplete,
  onCancel,
}: {
  onComplete: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedTime, setRecordedTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 1280, height: 720 },
          audio: true,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setError('Unable to access camera. Please check permissions.');
      }
    }
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordedTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    setIsRecording(true);
    setRecordedTime(0);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const retake = () => {
    setRecordedBlob(null);
    setRecordedTime(0);
    if (videoRef.current && stream) {
      videoRef.current.src = '';
      videoRef.current.srcObject = stream;
    }
  };

  const handleComplete = () => {
    if (recordedBlob) {
      onComplete(recordedBlob);
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📹</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Camera Access Required</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button variant="outline" onClick={onCancel}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Video Preview */}
      <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden mb-4">
        <video
          ref={videoRef}
          autoPlay
          muted={!recordedBlob}
          playsInline
          controls={!!recordedBlob}
          className="w-full h-full object-cover"
        />

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            REC {formatDuration(recordedTime)}
          </div>
        )}

        {/* Time Limit Warning */}
        {isRecording && recordedTime >= 90 && (
          <div className="absolute top-4 right-4 px-3 py-1.5 bg-yellow-500 text-white text-sm rounded">
            Approaching 2 min limit
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {!recordedBlob ? (
          <>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <div className="w-6 h-6 bg-white rounded" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <div className="w-4 h-4 bg-white rounded-full" />
              </button>
            )}
          </>
        ) : (
          <>
            <Button variant="outline" onClick={retake}>
              Retake
            </Button>
            <Button onClick={handleComplete}>
              Use This Video
            </Button>
          </>
        )}
      </div>

      {/* Tips */}
      {!isRecording && !recordedBlob && (
        <div className="mt-8">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recording Tips</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recordingTips.slice(0, 3).map((tip) => (
              <div key={tip.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-2xl">{tip.icon}</span>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{tip.title}</p>
                <p className="text-xs text-gray-500">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Modal
function EditVideoModal({
  resume,
  onSave,
  onClose,
}: {
  resume: VideoResume;
  onSave: (data: Partial<VideoResume>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(resume.title);
  const [description, setDescription] = useState(resume.description || '');
  const [visibility, setVisibility] = useState(resume.visibility);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ title, description, visibility });
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Video Resume</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Visibility
            </label>
            <div className="space-y-2">
              {(['private', 'employers', 'public'] as const).map((v) => (
                <label key={v} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    name="visibility"
                    value={v}
                    checked={visibility === v}
                    onChange={() => setVisibility(v)}
                    className="text-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {v === 'private' ? '🔒 Private' : v === 'employers' ? '💼 Employers Only' : '🌐 Public'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {v === 'private' ? 'Only you can see this video' :
                       v === 'employers' ? 'Visible to employers when you apply' :
                       'Anyone can view this video'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function VideoResumeManager() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<VideoResume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingResume, setEditingResume] = useState<VideoResume | null>(null);
  const [showTips, setShowTips] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResumes = useCallback(async () => {
    try {
      const { resumes: data } = await videoResumeApi.getVideoResumes();
      setResumes(data);
    } catch (error) {
      console.error('Failed to load resumes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const handleRecordingComplete = async (blob: Blob) => {
    setIsUploading(true);
    try {
      const { uploadUrl, videoId } = await videoResumeApi.getUploadUrl();
      await videoResumeApi.uploadVideo(uploadUrl, blob);
      const resume = await videoResumeApi.completeUpload(videoId, {
        title: `Video Resume - ${new Date().toLocaleDateString()}`,
      });
      setResumes(prev => [resume, ...prev]);
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { uploadUrl, videoId } = await videoResumeApi.getUploadUrl();
      await videoResumeApi.uploadVideo(uploadUrl, file);
      const resume = await videoResumeApi.completeUpload(videoId, {
        title: file.name.replace(/\.[^/.]+$/, ''),
      });
      setResumes(prev => [resume, ...prev]);
    } catch (error) {
      console.error('Failed to upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = async (data: Partial<VideoResume>) => {
    if (!editingResume) return;
    try {
      const updated = await videoResumeApi.updateResume(editingResume.id, data);
      setResumes(prev => prev.map(r => r.id === updated.id ? updated : r));
      setEditingResume(null);
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video resume?')) return;
    try {
      await videoResumeApi.deleteResume(id);
      setResumes(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Record Video Resume</h1>
        {isUploading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-500">Uploading your video...</p>
          </div>
        ) : (
          <VideoRecorder
            onComplete={handleRecordingComplete}
            onCancel={() => setIsRecording(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Video Resume</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Stand out to employers with a personal video introduction
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTips(!showTips)}>
            💡 Tips
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Upload Video
          </Button>
          <Button onClick={() => setIsRecording(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Record New
          </Button>
        </div>
      </div>

      {/* Tips Section */}
      {showTips && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-4">
            Tips for a Great Video Resume
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {recordingTips.map((tip) => (
              <div key={tip.id} className="text-center">
                <span className="text-3xl">{tip.icon}</span>
                <h4 className="font-medium text-gray-900 dark:text-white mt-2">{tip.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tip.description}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-amber-200 dark:border-amber-700">
            <h4 className="font-medium text-amber-800 dark:text-amber-400 mb-2">Suggested Topics</h4>
            <div className="flex flex-wrap gap-2">
              {suggestedTopics.map((topic, i) => (
                <span key={i} className="px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {isUploading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-8 flex items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="text-blue-700 dark:text-blue-400">Uploading your video...</p>
        </div>
      )}

      {/* Videos Grid */}
      {resumes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <VideoResumeCard
              key={resume.id}
              resume={resume}
              onEdit={() => setEditingResume(resume)}
              onDelete={() => handleDelete(resume.id)}
              onView={() => window.open(resume.videoUrl, '_blank')}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Create Your Video Resume
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            A video resume helps employers get to know the real you. Share your story, 
            highlight your skills, and make a lasting impression.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Upload Video
            </Button>
            <Button onClick={() => setIsRecording(true)}>
              Record Now
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingResume && (
        <EditVideoModal
          resume={editingResume}
          onSave={handleEdit}
          onClose={() => setEditingResume(null)}
        />
      )}
    </div>
  );
}

export default VideoResumeManager;

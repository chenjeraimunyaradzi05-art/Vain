'use client';

/**
 * Video Resume Component
 * Record, upload, and manage video introductions
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import api from '@/lib/apiClient';
import useAuth from '@/hooks/useAuth';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Upload,
  Trash2,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Loader2,
  Camera,
  Info
} from 'lucide-react';

const MAX_DURATION = 120; // 2 minutes max
const TIPS = [
  'Keep it under 2 minutes',
  'Dress professionally',
  'Ensure good lighting on your face',
  'Find a quiet space with minimal background noise',
  'Look at the camera, not the screen',
  'Smile and speak clearly',
  'Introduce yourself and highlight key skills',
  'End with a call to action',
];

function RecordingTimer({ duration, maxDuration }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (duration / maxDuration) * 100;
  const isWarning = duration > maxDuration * 0.8;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <div className={`w-3 h-3 rounded-full animate-pulse ${isWarning ? 'bg-red-500' : 'bg-red-400'}`} />
        <span className={`font-mono text-lg ${isWarning ? 'text-red-400' : 'text-white'}`}>
          {formatTime(duration)}
        </span>
        <span className="text-slate-500">/ {formatTime(maxDuration)}</span>
      </div>
      
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${isWarning ? 'bg-red-500' : 'bg-purple-500'}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

function VideoPreview({ src, onDelete, onDownload, viewCount = 0, createdAt }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Video */}
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover"
          onEnded={() => setPlaying(false)}
        />
        
        {/* Play overlay */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
        >
          <div className="w-16 h-16 rounded-full bg-purple-600/90 flex items-center justify-center group-hover:scale-110 transition-transform">
            {playing ? (
              <Pause className="w-7 h-7 text-white" />
            ) : (
              <Play className="w-7 h-7 text-white ml-1" />
            )}
          </div>
        </button>
      </div>

      {/* Info & Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm text-slate-400">
            {createdAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(createdAt).toLocaleDateString('en-AU')}
              </span>
            )}
            {viewCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {viewCount} views
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 bg-green-900/30 text-green-400 px-2 py-1 rounded text-sm">
            <CheckCircle className="w-4 h-4" />
            Active
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-600/50 text-white py-2 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg transition-colors border border-red-700/50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordingInterface({ onComplete, onCancel }) {
  const [permission, setPermission] = useState(null);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Request camera permissions
  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermission('granted');
    } catch (err) {
      console.error('Permission denied:', err);
      setPermission('denied');
      setError('Camera/microphone access denied. Please enable permissions.');
    }
  };

  useEffect(() => {
    requestPermission();
    return () => {
      stopStream();
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9,opus',
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setRecording(true);
    setDuration(0);

    timerRef.current = setInterval(() => {
      setDuration(d => {
        if (d >= MAX_DURATION) {
          stopRecording();
          return d;
        }
        return d + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    setDuration(0);
    requestPermission();
  };

  const handleConfirm = () => {
    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      onComplete(blob);
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setCameraOn(!cameraOn);
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setMicOn(!micOn);
    }
  };

  if (permission === 'denied') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Camera Access Required</h3>
        <p className="text-slate-400 mb-4">{error}</p>
        <button
          onClick={requestPermission}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Preview Your Recording</h3>
        
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          <video
            src={previewUrl}
            controls
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRetake}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Retake
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            Use This Video
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video preview */}
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${!cameraOn ? 'opacity-0' : ''}`}
        />
        
        {!cameraOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <VideoOff className="w-16 h-16 text-slate-600" />
          </div>
        )}

        {/* Recording indicator */}
        {recording && (
          <div className="absolute top-4 left-4 right-4">
            <RecordingTimer duration={duration} maxDuration={MAX_DURATION} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={toggleCamera}
          className={`p-3 rounded-full transition-colors ${
            cameraOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-600 hover:bg-red-700'
          }`}
          title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {cameraOn ? (
            <Video className="w-6 h-6 text-white" />
          ) : (
            <VideoOff className="w-6 h-6 text-white" />
          )}
        </button>

        {recording ? (
          <button
            onClick={stopRecording}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
            title="Stop recording"
          >
            <Square className="w-8 h-8 text-white" />
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
            title="Start recording"
          >
            <div className="w-8 h-8 rounded-full bg-white" />
          </button>
        )}

        <button
          onClick={toggleMic}
          className={`p-3 rounded-full transition-colors ${
            micOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-600 hover:bg-red-700'
          }`}
          title={micOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micOn ? (
            <Mic className="w-6 h-6 text-white" />
          ) : (
            <MicOff className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="w-full text-slate-400 hover:text-white py-2 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

export default function VideoResume() {
  const { isAuthenticated } = useAuth();
  const [videoResume, setVideoResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const fileInputRef = useRef(null);

  const fetchVideoResume = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const { ok, data } = await api('/profile/video-resume');

      if (ok) {
        setVideoResume(data.videoResume);
      }
    } catch (err) {
      console.error('Failed to fetch video resume:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchVideoResume();
  }, [fetchVideoResume]);

  const handleUpload = async (file) => {
    if (!isAuthenticated || !file) return;

    setUploading(true);
    try {
      // Get upload URL
      const { ok: uploadOk, data: uploadData } = await api(`/upload-url?type=video&filename=${file.name}`);

      if (!uploadOk) throw new Error('Failed to get upload URL');

      const { uploadUrl, fileKey } = uploadData;

      // Upload file
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      // Save to profile
      const { ok: saveOk, data: saveData } = await api('/profile/video-resume', {
        method: 'POST',
        body: { fileKey },
      });

      if (saveOk) {
        setVideoResume(saveData.videoResume);
        setShowRecorder(false);
      }
    } catch (err) {
      console.error('Failed to upload video:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRecordingComplete = (blob) => {
    const file = new File([blob], 'video-resume.webm', { type: 'video/webm' });
    handleUpload(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDelete = async () => {
    if (!isAuthenticated || !confirm('Are you sure you want to delete your video resume?')) return;

    try {
      const { ok } = await api('/profile/video-resume', { method: 'DELETE' });

      if (ok) {
        setVideoResume(null);
      }
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Camera className="w-6 h-6 text-purple-400" />
            Video Resume
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Introduce yourself to potential employers
          </p>
        </div>
        
        <button
          onClick={() => setShowTips(!showTips)}
          className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
        >
          <Info className="w-5 h-5" />
          Tips
        </button>
      </div>

      {/* Tips */}
      {showTips && (
        <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-4">
          <h3 className="font-semibold text-purple-400 mb-3">Recording Tips</h3>
          <ul className="grid sm:grid-cols-2 gap-2">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Existing video or recorder */}
      {videoResume ? (
        <VideoPreview
          src={videoResume.url}
          createdAt={videoResume.createdAt}
          viewCount={videoResume.viewCount}
          onDelete={handleDelete}
          onDownload={() => window.open(videoResume.url, '_blank')}
        />
      ) : showRecorder ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <RecordingInterface
            onComplete={handleRecordingComplete}
            onCancel={() => setShowRecorder(false)}
          />
        </div>
      ) : (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 text-center">
          <Camera className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No Video Resume Yet
          </h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            A video introduction helps you stand out. Record a short video
            to introduce yourself to potential employers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setShowRecorder(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Video className="w-5 h-5" />
              Record Video
            </button>
            
            <span className="text-slate-500">or</span>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
              Upload Video
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

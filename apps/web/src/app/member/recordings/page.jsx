'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect, useCallback } from 'react';
import useAuth from '../../../hooks/useAuth';
import {
  Video,
  Play,
  FileText,
  Clock,
  Calendar,
  Download,
  Trash2,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';

export default function RecordingsPage() {
  const { token } = useAuth();
  const apiUrl = API_BASE;
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [activeTab, setActiveTab] = useState('video');

  const fetchRecordings = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/recordings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Failed to fetch recordings');
      
      const data = await res.json();
      setRecordings(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const handlePlay = async (recording) => {
    setSelectedRecording(recording);
    setActiveTab('video');
    
    try {
      const res = await fetch(
        `${apiUrl}/recordings/${recording.id}/play`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!res.ok) throw new Error('Failed to get playback URL');
      
      const data = await res.json();
      setPlaybackUrl(data.data.url);
    } catch (err) {
      setError('Unable to play recording: ' + err.message);
    }
  };

  const handleViewTranscript = async (recording) => {
    setSelectedRecording(recording);
    setActiveTab('transcript');
    
    try {
      const res = await fetch(
        `${apiUrl}/recordings/${recording.id}/transcript`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!res.ok) throw new Error('Failed to fetch transcript');
      
      const data = await res.json();
      setTranscript(data.data.content);
    } catch (err) {
      setError('Unable to load transcript: ' + err.message);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      READY: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ready' },
      PROCESSING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Processing' },
      RECORDING: { bg: 'bg-red-100', text: 'text-red-700', label: 'Recording' },
      PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
      FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
      EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Expired' },
    };
    
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Session Recordings</h1>
            <p className="text-gray-600 mt-1">
              View recordings and transcripts from your mentoring sessions
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              {recordings.length} recordings
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-sm underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recordings List */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">Your Recordings</h2>
            </div>
            
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              </div>
            ) : recordings.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Video className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recordings yet</p>
                <p className="text-sm mt-1">
                  Recordings from mentoring sessions will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {recordings.map((recording) => (
                  <button
                    key={recording.id}
                    onClick={() => handlePlay(recording)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedRecording?.id === recording.id ? 'bg-amber-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Video className="w-4 h-4 text-amber-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {recording.sessionTitle || 'Mentoring Session'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(recording.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(recording.createdAt)}
                          </span>
                        </div>
                        <div className="mt-2">
                          {getStatusBadge(recording.status)}
                          {recording.hasTranscript && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                              Transcript
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Player/Transcript Panel */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
            {selectedRecording ? (
              <>
                {/* Tabs */}
                <div className="flex border-b">
                  <button
                    onClick={() => setActiveTab('video')}
                    className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                      activeTab === 'video'
                        ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    Video
                  </button>
                  <button
                    onClick={() => handleViewTranscript(selectedRecording)}
                    className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                      activeTab === 'transcript'
                        ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Transcript
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  {activeTab === 'video' && (
                    <div>
                      {selectedRecording.status === 'READY' && playbackUrl ? (
                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                          <video
                            src={playbackUrl}
                            controls
                            className="w-full h-full"
                            poster="/images/video-placeholder.jpg"
                          >
                            Your browser does not support video playback.
                          </video>
                        </div>
                      ) : selectedRecording.status === 'PROCESSING' ? (
                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-10 h-10 mx-auto animate-spin text-amber-600 mb-3" />
                            <p className="text-gray-600 font-medium">Processing recording...</p>
                            <p className="text-sm text-gray-500 mt-1">
                              This may take a few minutes
                            </p>
                          </div>
                        </div>
                      ) : selectedRecording.status === 'FAILED' ? (
                        <div className="aspect-video bg-red-50 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
                            <p className="text-red-700 font-medium">Recording failed</p>
                            <p className="text-sm text-red-600 mt-1">
                              There was an issue processing this recording
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <Video className="w-10 h-10 mx-auto mb-3" />
                            <p>Recording not available</p>
                          </div>
                        </div>
                      )}

                      {/* Recording details */}
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-800 mb-2">
                          {selectedRecording.sessionTitle || 'Mentoring Session'}
                        </h3>
                        <dl className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <dt className="text-gray-500">Date</dt>
                            <dd className="font-medium text-gray-800">
                              {formatDate(selectedRecording.createdAt)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Duration</dt>
                            <dd className="font-medium text-gray-800">
                              {formatDuration(selectedRecording.duration)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Participants</dt>
                            <dd className="font-medium text-gray-800">
                              {selectedRecording.participants?.join(', ') || 'You'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Status</dt>
                            <dd>{getStatusBadge(selectedRecording.status)}</dd>
                          </div>
                        </dl>
                        
                        {selectedRecording.status === 'READY' && (
                          <div className="mt-4 flex gap-3">
                            <a
                              href={playbackUrl}
                              download
                              className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'transcript' && (
                    <div>
                      {transcript ? (
                        <div className="prose prose-sm max-w-none">
                          <div className="p-4 bg-gray-50 rounded-lg max-h-[500px] overflow-y-auto">
                            {transcript.split('\n').map((line, i) => (
                              <p key={i} className={line.startsWith('[') ? 'text-gray-500 text-xs' : ''}>
                                {line}
                              </p>
                            ))}
                          </div>
                          
                          <div className="mt-4 flex gap-3">
                            <button
                              onClick={() => navigator.clipboard.writeText(transcript)}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                            >
                              Copy transcript
                            </button>
                          </div>
                        </div>
                      ) : selectedRecording.hasTranscript ? (
                        <div className="p-8 flex justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No transcript available</p>
                          <p className="text-sm mt-1">
                            Transcripts are generated automatically for processed recordings
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <Video className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="font-medium text-gray-700 mb-2">Select a recording</h3>
                <p className="text-sm">
                  Choose a recording from the list to watch or view its transcript
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

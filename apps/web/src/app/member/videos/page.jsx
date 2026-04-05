"use client";
import { API_BASE } from '@/lib/apiBase';
import { useState } from 'react';
import { Video, Upload, ArrowLeft, CheckCircle, AlertCircle, Film } from 'lucide-react';
import useAuth from '../../../hooks/useAuth';

export default function VideosPage() {
    const { token } = useAuth();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);
    const [isError, setIsError] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    function handleDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type.startsWith('video/')) {
                setFile(droppedFile);
            } else {
                setMessage('Please upload a video file');
                setIsError(true);
            }
        }
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    async function submit() {
        setMessage(null);
        setIsError(false);
        if (!file) return (setMessage('Select a video first'), setIsError(true));
        setUploading(true);
        try {
            const api = API_BASE;
            const signRes = await fetch(`${api}/uploads/s3-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ filename: file.name, mimeType: file.type, category: 'VIDEO' }),
            });
            const signJson = await signRes.json();
            if (!signRes.ok) throw new Error(signJson?.error || JSON.stringify(signJson));
            const putRes = await fetch(signJson.url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
            if (!putRes.ok) throw new Error('Upload to storage failed');
            const saveRes = await fetch(`${api}/uploads/metadata`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ key: signJson.key, filename: file.name, url: signJson.publicUrl, mimeType: file.type, size: file.size, category: 'VIDEO' }),
            });
            const saveJson = await saveRes.json();
            if (!saveRes.ok) throw new Error(saveJson?.error || JSON.stringify(saveJson));
            setMessage('Video uploaded successfully!');
            setFile(null);
        } catch (err) {
            setMessage(err.message || 'Failed');
            setIsError(true);
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="max-w-xl mx-auto py-12 px-4">
            <a href="/member/dashboard" className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </a>

            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-600/20 rounded-lg">
                    <Video className="w-6 h-6 text-orange-400" />
                </div>
                <h1 className="text-2xl font-bold">Video Uploads</h1>
            </div>
            <p className="text-slate-400 mb-6">Upload a short intro or skills demo video to include with applications.</p>

            <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">
                {/* Drag & Drop Zone */}
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`p-8 border-2 border-dashed transition-colors ${
                        dragActive 
                            ? 'border-orange-500 bg-orange-500/10' 
                            : 'border-slate-700 hover:border-slate-600'
                    }`}
                >
                    <div className="text-center">
                        <Film className={`w-10 h-10 mx-auto mb-3 ${dragActive ? 'text-orange-400' : 'text-slate-500'}`} />
                        <p className="text-slate-300 mb-2">Drag and drop your video here</p>
                        <p className="text-sm text-slate-500 mb-4">or</p>
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-colors">
                            <Upload className="w-4 h-4" />
                            <span>Browse files</span>
                            <input 
                                type="file" 
                                accept="video/*" 
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)} 
                                className="hidden"
                            />
                        </label>
                        <p className="text-xs text-slate-500 mt-4">Accepted formats: MP4, MOV, WebM • Max 100MB • 2 min recommended</p>
                    </div>
                </div>

                {/* Selected File Preview */}
                {file && (
                    <div className="p-4 border-t border-slate-800 bg-slate-900/60">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-600/20 rounded">
                                    <Video className="w-5 h-5 text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-200">{file.name}</p>
                                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setFile(null)}
                                className="text-slate-400 hover:text-slate-200 text-sm"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}

                {/* Upload Button */}
                <div className="p-4 border-t border-slate-800 flex justify-end">
                    <button 
                        onClick={submit} 
                        disabled={!file || uploading}
                        className="inline-flex items-center gap-2 bg-orange-600 text-white px-5 py-2 rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Uploading...' : 'Upload Video'}
                    </button>
                </div>

                {/* Message */}
                {message && (
                    <div className={`p-4 border-t flex items-center gap-3 ${
                        isError 
                            ? 'bg-red-950/40 border-red-900/60 text-red-200' 
                            : 'bg-green-950/40 border-green-900/60 text-green-200'
                    }`}>
                        {isError ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                        <span className="text-sm">{message}</span>
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-slate-900/30 border border-slate-800 rounded-lg">
                <h3 className="text-sm font-medium text-slate-200 mb-2">Tips for a great video</h3>
                <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Keep it under 2 minutes</li>
                    <li>• Good lighting and clear audio</li>
                    <li>• Introduce yourself and your skills</li>
                    <li>• Show enthusiasm for the roles you're targeting</li>
                </ul>
            </div>
        </div>
    );
}

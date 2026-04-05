"use client";
import { API_BASE } from '@/lib/apiBase';
import { useState } from 'react';
import NextImage from 'next/image';
import { Image, Upload, ArrowLeft, CheckCircle, AlertCircle, ImagePlus } from 'lucide-react';
import useAuth from '../../../hooks/useAuth';
import { validateFile, formatFileSize, getAcceptString, getAllowedTypesDisplay, FILE_LIMITS } from '@/lib/fileValidation';

export default function PhotosPage() {
    const { token } = useAuth();
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);
    const [isError, setIsError] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);

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
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }

    function handleFileSelect(selectedFile) {
        setValidationErrors([]);
        setMessage(null);
        setIsError(false);
        
        if (!selectedFile) {
            setFile(null);
            setPreview(null);
            return;
        }
        
        // Validate the file
        const validation = validateFile(selectedFile, 'PHOTO');
        
        if (!validation.valid) {
            setValidationErrors(validation.errors);
            setIsError(true);
            setMessage(validation.errors[0]);
            return;
        }
        
        setFile(selectedFile);
        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(selectedFile);
    }

    function clearFile() {
        setFile(null);
        setPreview(null);
    }

    async function submit() {
        setMessage(null);
        setIsError(false);
        if (!file) return (setMessage('Select an image first'), setIsError(true));
        setUploading(true);
        try {
            const api = API_BASE;
            const signRes = await fetch(`${api}/uploads/s3-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ filename: file.name, mimeType: file.type, category: 'PHOTO' }),
            });
            const signJson = await signRes.json();
            if (!signRes.ok) throw new Error(signJson?.error || JSON.stringify(signJson));
            const putRes = await fetch(signJson.url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
            if (!putRes.ok) throw new Error('Upload to storage failed');
            const saveRes = await fetch(`${api}/uploads/metadata`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ key: signJson.key, filename: file.name, url: signJson.publicUrl, mimeType: file.type, size: file.size, category: 'PHOTO' }),
            });
            const saveJson = await saveRes.json();
            if (!saveRes.ok) throw new Error(saveJson?.error || JSON.stringify(saveJson));
            setMessage('Photo uploaded successfully!');
            clearFile();
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
                <div className="p-2 bg-purple-600/20 rounded-lg">
                    <Image className="w-6 h-6 text-purple-400" />
                </div>
                <h1 className="text-2xl font-bold">Photo Gallery</h1>
            </div>
            <p className="text-slate-400 mb-6">Upload photos for your profile — such as a professional headshot or certificates.</p>

            <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">
                {/* Drag & Drop Zone */}
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`p-8 border-2 border-dashed transition-colors ${
                        dragActive 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : 'border-slate-700 hover:border-slate-600'
                    }`}
                >
                    <div className="text-center">
                        <ImagePlus className={`w-10 h-10 mx-auto mb-3 ${dragActive ? 'text-purple-400' : 'text-slate-500'}`} />
                        <p className="text-slate-300 mb-2">Drag and drop your photo here</p>
                        <p className="text-sm text-slate-500 mb-4">or</p>
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-colors">
                            <Upload className="w-4 h-4" />
                            <span>Browse files</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} 
                                className="hidden"
                            />
                        </label>
                        <p className="text-xs text-slate-500 mt-4">Accepted formats: JPG, PNG, WebP • Max 5MB</p>
                    </div>
                </div>

                {/* Selected File Preview */}
                {file && (
                    <div className="p-4 border-t border-slate-800 bg-slate-900/60">
                        <div className="flex items-center gap-4">
                            {preview && (
                                <NextImage
                                    src={preview}
                                    alt="Preview"
                                    width={64}
                                    height={64}
                                    className="w-16 h-16 object-cover rounded-lg border border-slate-700"
                                    sizes="64px"
                                    unoptimized
                                />
                            )}
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-200">{file.name}</p>
                                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                            </div>
                            <button
                                onClick={clearFile}
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
                        className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Uploading...' : 'Upload Photo'}
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
        </div>
    );
}

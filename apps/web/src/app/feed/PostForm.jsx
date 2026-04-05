import { useState, useRef } from 'react';
import { API_BASE } from '@/lib/apiBase';
import useAuth from '@/hooks/useAuth';

export default function PostForm({ onPost }) {
  const { token } = useAuth();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const MAX_IMAGE_MB = 10;
  const MAX_VIDEO_MB = 50;
  const MAX_FILES = 5;

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files || []);
    const validated = [];

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const sizeMB = file.size / (1024 * 1024);

      if (isVideo && sizeMB > MAX_VIDEO_MB) {
        setError(`Video "${file.name}" exceeds ${MAX_VIDEO_MB}MB limit.`);
        continue;
      }
      if (!isVideo && sizeMB > MAX_IMAGE_MB) {
        setError(`Image "${file.name}" exceeds ${MAX_IMAGE_MB}MB limit.`);
        continue;
      }

      validated.push({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        type: isVideo ? 'video' : 'image',
      });
    }

    setMedia((prev) => [...prev, ...validated].slice(0, MAX_FILES));
  };

  const removeMedia = (id) => {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((m) => m.id !== id);
    });
  };

  const uploadFile = async (file) => {
    // Request presigned url
    try {
      const res = await fetch(`${API_BASE}/uploads/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      if (!res.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, fileUrl } = await res.json();

      // Upload to presigned URL
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      return fileUrl;
    } catch (err) {
      console.error('Upload error', err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!content.trim() && media.length === 0) return;

    setIsSubmitting(true);
    setProgress(0);

    try {
      const uploadedUrls = [];
      if (media.length > 0) {
        for (let i = 0; i < media.length; i++) {
          const url = await uploadFile(media[i].file);
          uploadedUrls.push(url);
          setProgress(Math.round(((i + 1) / media.length) * 100));
        }
      }

      const res = await fetch(`${API_BASE}/feed/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'text',
          content: content.trim(),
          mediaUrls: uploadedUrls.length ? uploadedUrls : undefined,
          visibility: 'public',
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to create post');
      }

      const data = await res.json();
      // Return created post
      onPost(data.post || data);
      setContent('');
      setMedia([]);
      setProgress(0);
    } catch (err) {
      console.error(err);
      setError('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="bg-white rounded-xl p-4 shadow mb-6" onSubmit={handleSubmit}>
      <textarea
        className="w-full p-2 rounded border border-slate-200 mb-2"
        rows={3}
        placeholder="Share a message, story, or video..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required={!media.length}
        aria-label="Post content"
      />

      {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
      {progress > 0 && <div className="text-sm text-slate-500 mb-2">Uploading: {progress}%</div>}

      <div className="flex gap-2 mb-2 flex-wrap">
        {media.map((m) => (
          <div key={m.id} className="relative">
            {m.type === 'video' ? (
              <video src={m.preview} className="w-24 h-24 object-cover rounded" controls />
            ) : (
              <img src={m.preview} className="w-24 h-24 object-cover rounded" alt="media preview" />
            )}
            <button
              type="button"
              className="absolute top-1 right-1 bg-white rounded-full p-1 text-xs"
              onClick={() => removeMedia(m.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleMediaChange}
        />
        <button
          type="button"
          className="px-3 py-1 rounded bg-slate-100"
          onClick={() => fileInputRef.current.click()}
          aria-label="Add media"
        >
          📎 Add Media
        </button>
        <button
          type="submit"
          className="ml-auto px-4 py-1 rounded bg-pink-500 text-white font-bold"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
}

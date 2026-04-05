import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';

export default function MediaUpload() {
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    let newPhotos: File[] = [...photos];
    let newVideos: File[] = [...videos];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/') && newPhotos.length < 40) {
        newPhotos.push(file);
      } else if (file.type.startsWith('video/') && newVideos.length < 2) {
        newVideos.push(file);
      }
    });
    setPhotos(newPhotos.slice(0, 40));
    setVideos(newVideos.slice(0, 2));
  };

  const handleRemove = (file: File, type: 'photo' | 'video') => {
    if (type === 'photo') setPhotos((prev) => prev.filter((f) => f !== file));
    else setVideos((prev) => prev.filter((f) => f !== file));
  };

  return (
    <div>
      <label className="block text-sm text-gray-300 mb-2">
        Photos & Videos (Up to 40 photos, 2 videos max 20 mins each)
      </label>
      <div
        className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-teal-500/50 transition-colors cursor-pointer"
        style={{ background: 'rgba(255, 255, 255, 0.02)' }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-10 h-10 mx-auto text-gray-500 mb-3" />
        <p className="text-gray-400 mb-1">Drag and drop files here, or click to browse</p>
        <p className="text-xs text-gray-500">PNG, JPG up to 10MB · MP4 up to 500MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,video/mp4"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {/* Preview selected files */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {photos.map((file, i) => (
          <div key={i} className="relative rounded-xl overflow-hidden border border-white/10">
            <Image
              src={URL.createObjectURL(file)}
              alt={file.name}
              width={200}
              height={96}
              className="object-cover w-full h-24"
            />
            <button
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
              onClick={() => handleRemove(file, 'photo')}
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {videos.map((file, i) => (
          <div key={i} className="relative rounded-xl overflow-hidden border border-white/10">
            <video src={URL.createObjectURL(file)} controls className="w-full h-24 object-cover" />
            <button
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
              onClick={() => handleRemove(file, 'video')}
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {(photos.length > 0 || videos.length > 0) && (
        <div className="mt-2 text-xs text-gray-400">
          {photos.length} photo(s), {videos.length} video(s) selected
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useCallback, useRef } from 'react';
import Image from '@/components/ui/OptimizedImage';
import { isCloudinaryPublicId } from '@/lib/cloudinary';
import { Upload, X, File, Image as ImageIcon, Film, Music, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Spinner } from './Spinner';
import { getErrorMessage } from '@/lib/formatters';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  onUpload?: (files: File[]) => Promise<void> | void;
  onFilesChange?: (files: File[]) => void;
  disabled?: boolean;
  variant?: 'default' | 'cosmic';
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  progress?: number;
}

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get icon based on file type
function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon className="w-6 h-6" />;
  if (type.startsWith('video/')) return <Film className="w-6 h-6" />;
  if (type.startsWith('audio/')) return <Music className="w-6 h-6" />;
  if (type.includes('pdf') || type.includes('document')) return <FileText className="w-6 h-6" />;
  return <File className="w-6 h-6" />;
}

export function FileUpload({
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  onUpload,
  onFilesChange,
  disabled = false,
  variant = 'default',
  label = 'Upload files',
  hint,
  error: externalError,
  className = '',
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCosmic = variant === 'cosmic';

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File "${file.name}" exceeds maximum size of ${formatFileSize(maxSize)}`;
    }

    // Check file type if accept is specified
    if (accept) {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileType = file.type;
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExt === type.toLowerCase();
        }
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.replace('/*', '/'));
        }
        return fileType === type;
      });

      if (!isAccepted) {
        return `File type "${file.type || fileExt}" is not accepted`;
      }
    }

    return null;
  }, [accept, maxSize]);

  const handleFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    
    // Check max files
    if (files.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate files
    const validatedFiles: UploadedFile[] = [];
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      // Create preview for images
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      validatedFiles.push({
        file,
        preview,
        status: 'pending',
      });
    }

    if (validatedFiles.length === 0) return;

    setError(null);
    const newFileList = multiple ? [...files, ...validatedFiles] : validatedFiles;
    setFiles(newFileList);
    onFilesChange?.(newFileList.map(f => f.file));

    // Auto-upload if handler provided
    if (onUpload) {
      setIsUploading(true);
      try {
        await onUpload(validatedFiles.map(f => f.file));
        setFiles(prev => prev.map(f => ({ ...f, status: 'success' as const })));
      } catch (err: unknown) {
        const msg = getErrorMessage(err, 'Upload failed');
        setFiles(prev => prev.map(f => ({ 
          ...f, 
          status: 'error' as const, 
          error: msg 
        })));
        setError(msg);
      } finally {
        setIsUploading(false);
      }
    }
  }, [files, maxFiles, multiple, onFilesChange, onUpload, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [disabled, handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      // Revoke object URL to avoid memory leaks
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      onFilesChange?.(newFiles.map(f => f.file));
      return newFiles;
    });
    setError(null);
  }, [onFilesChange]);

  const clearAll = useCallback(() => {
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setError(null);
    onFilesChange?.([]);
  }, [files, onFilesChange]);

  const displayError = externalError || error;

  return (
    <div className={className}>
      {/* Label */}
      {label && (
        <label className={`block text-sm font-medium mb-2 ${isCosmic ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'}`}>
          {label}
        </label>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isDragging 
            ? isCosmic 
              ? 'border-[#FFD700] bg-[#FFD700]/10' 
              : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : isCosmic 
              ? 'border-[#FFD700]/30 hover:border-[#FFD700]/60 bg-[#1A0F2E]/50' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800/50'
          }
          ${displayError ? 'border-red-500' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" variant={isCosmic ? 'gold' : 'primary'} />
            <p className={isCosmic ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}>
              Uploading...
            </p>
          </div>
        ) : (
          <>
            <div className={`
              w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center
              ${isCosmic ? 'bg-[#FFD700]/20' : 'bg-gray-100 dark:bg-gray-700'}
            `}>
              <Upload className={`w-8 h-8 ${isCosmic ? 'text-[#FFD700]' : 'text-gray-400 dark:text-gray-500'}`} />
            </div>
            
            <p className={`font-medium mb-1 ${isCosmic ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            
            <p className={`text-sm ${isCosmic ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {accept ? accept.replace(/,/g, ', ') : 'Any file type'}
              {' · '}
              Max {formatFileSize(maxSize)}
              {multiple && ` · Up to ${maxFiles} files`}
            </p>
          </>
        )}
      </div>

      {/* Hint */}
      {hint && !displayError && (
        <p className={`text-sm mt-2 ${isCosmic ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {hint}
        </p>
      )}

      {/* Error */}
      {displayError && (
        <p className="text-sm mt-2 text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {displayError}
        </p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${isCosmic ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'}`}>
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); clearAll(); }}
              className={`text-sm ${isCosmic ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
            >
              Clear all
            </button>
          </div>

          {files.map((uploadedFile, index) => (
            <div
              key={index}
              className={`
                flex items-center gap-3 p-3 rounded-lg
                ${isCosmic ? 'bg-white/5' : 'bg-gray-100 dark:bg-gray-800'}
              `}
            >
              {/* Preview or icon */}
              {uploadedFile.preview ? (
                <div className="w-12 h-12 rounded overflow-hidden relative">
                  <Image
                    src={uploadedFile.preview}
                    alt={uploadedFile.file.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className={`
                  w-12 h-12 rounded flex items-center justify-center
                  ${isCosmic ? 'bg-white/10 text-[#FFD700]' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}
                `}>
                  {getFileIcon(uploadedFile.file.type)}
                </div>
              )}

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isCosmic ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {uploadedFile.file.name}
                </p>
                <p className={`text-xs ${isCosmic ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {formatFileSize(uploadedFile.file.size)}
                </p>
              </div>

              {/* Status indicator */}
              {uploadedFile.status === 'uploading' && (
                <Spinner size="sm" variant={isCosmic ? 'gold' : 'primary'} />
              )}
              {uploadedFile.status === 'success' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {uploadedFile.status === 'error' && (
                <span title={uploadedFile.error}>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </span>
              )}

              {/* Remove button */}
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                className={`
                  p-1 rounded-full transition-colors
                  ${isCosmic 
                    ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                `}
                aria-label={`Remove ${uploadedFile.file.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Avatar/Profile Photo Upload (specialized variant)
interface AvatarUploadProps {
  currentImage?: string | null;
  onUpload: (file: File) => Promise<string | void>;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'cosmic';
  disabled?: boolean;
}

export function AvatarUpload({
  currentImage,
  onUpload,
  size = 'md',
  variant = 'default',
  disabled = false,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCosmic = variant === 'cosmic';
  
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const displayImage = preview || currentImage;

  return (
    <div className="relative inline-block">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
        className={`
          ${sizeClasses[size]}
          rounded-full overflow-hidden border-2 transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
          ${isCosmic 
            ? 'border-[#FFD700]/30 hover:border-[#FFD700]' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}
        `}
      >
        {isUploading ? (
          <div className={`
            w-full h-full flex items-center justify-center
            ${isCosmic ? 'bg-[#1A0F2E]' : 'bg-gray-100 dark:bg-gray-800'}
          `}>
            <Spinner size="md" variant={isCosmic ? 'gold' : 'primary'} />
          </div>
        ) : displayImage ? (
          <Image
            src={displayImage}
            alt="Avatar"
            fill
            cloudinary={isCloudinaryPublicId(displayImage || '')}
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className={`
            w-full h-full flex items-center justify-center
            ${isCosmic ? 'bg-[#1A0F2E] text-[#FFD700]' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}
          `}>
            <Upload className="w-6 h-6" />
          </div>
        )}
      </button>

      {/* Edit overlay */}
      {!isUploading && !disabled && (
        <div className={`
          absolute bottom-0 right-0 p-1.5 rounded-full
          ${isCosmic 
            ? 'bg-[#FFD700] text-gray-900' 
            : 'bg-blue-600 text-white'}
        `}>
          <Upload className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

export default FileUpload;

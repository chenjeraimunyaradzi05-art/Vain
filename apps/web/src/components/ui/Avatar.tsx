'use client';

import React, { useState } from 'react';
import Image from '@/components/ui/OptimizedImage';
import { isCloudinaryPublicId } from '@/lib/cloudinary';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'circle' | 'rounded' | 'square';
  theme?: 'default' | 'cosmic';
  status?: 'online' | 'offline' | 'away' | 'busy' | null;
  badge?: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-2xl',
};

const sizePx = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 96,
};

const variantClasses = {
  circle: 'rounded-full',
  rounded: 'rounded-lg',
  square: 'rounded-none',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

// Generate consistent color from name
function getColorFromName(name: string, theme: 'default' | 'cosmic' = 'default'): string {
  const defaultColors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-pink-500 to-rose-500',
    'from-teal-500 to-green-500',
    'from-amber-500 to-orange-500',
  ];
  
  // Cosmic theme uses celestial precious stone colors
  const cosmicColors = [
    'from-[#FFD700] to-[#FFC000]', // Gold
    'from-[#50C878] to-[#3AA05F]', // Emerald
    'from-[#E85B8A] to-[#C94473]', // Rose
    'from-[#4C1D95] to-[#6D28D9]', // Purple
    'from-[#FFD700] to-[#E85B8A]', // Gold to Rose
    'from-[#50C878] to-[#FFD700]', // Emerald to Gold
    'from-[#818CF8] to-[#A78BFA]', // Indigo
    'from-[#2D1B69] to-[#4C1D95]', // Deep cosmic
  ];
  
  const colors = theme === 'cosmic' ? cosmicColors : defaultColors;
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
function getInitials(name: string): string {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({
  src,
  alt = '',
  name = '',
  size = 'md',
  variant = 'circle',
  theme = 'default',
  status,
  badge,
  className = '',
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name || alt);
  const colorGradient = getColorFromName(name || alt || 'default', theme);
  const showImage = src && !imageError;
  
  // Cosmic theme adds glow effect
  const cosmicRingClass = theme === 'cosmic' 
    ? 'ring-2 ring-[#FFD700]/30 shadow-[0_0_10px_rgba(255,215,0,0.3)]' 
    : '';
  
  return (
    <div className={`relative inline-flex ${cosmicRingClass} ${variant === 'circle' ? 'rounded-full' : variantClasses[variant]} ${className}`}>
      {showImage ? (
        <Image
          src={src}
          alt={alt || name}
          width={sizePx[size]}
          height={sizePx[size]}
          cloudinary={isCloudinaryPublicId(src || '')}
          className={`${sizeClasses[size]} ${variantClasses[variant]} object-cover bg-gray-100 dark:bg-gray-800`}
          onError={() => setImageError(true)}
          unoptimized={src.startsWith('data:') || src.startsWith('blob:')}
        />
      ) : null}
      
      {/* Fallback with initials */}
      <div
        className={`
          ${sizeClasses[size]} 
          ${variantClasses[variant]} 
          ${showImage ? 'hidden' : ''} 
          bg-gradient-to-br ${colorGradient}
          flex items-center justify-center
          text-white font-semibold
          select-none
        `}
        aria-hidden={showImage ? 'true' : 'false'}
      >
        {initials}
      </div>
      
      {/* Status indicator */}
      {status && (
        <span
          className={`
            absolute bottom-0 right-0
            block rounded-full
            ring-2 ring-white dark:ring-gray-900
            ${statusColors[status]}
            ${size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'}
          `}
          aria-label={`Status: ${status}`}
        />
      )}
      
      {/* Badge */}
      {badge && (
        <span className="absolute -top-1 -right-1">
          {badge}
        </span>
      )}
    </div>
  );
}

// Avatar Group Component
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}

export function AvatarGroup({
  children,
  max = 4,
  size = 'md',
  className = '',
}: AvatarGroupProps) {
  const childArray = React.Children.toArray(children);
  const visibleChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;
  
  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className="ring-2 ring-white dark:ring-gray-900 rounded-full"
        >
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<AvatarProps>, { size })
            : child}
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div
          className={`
            ${sizeClasses[size]}
            rounded-full
            bg-gray-200 dark:bg-gray-700
            flex items-center justify-center
            text-gray-600 dark:text-gray-300
            font-medium
            ring-2 ring-white dark:ring-gray-900
          `}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

export default Avatar;

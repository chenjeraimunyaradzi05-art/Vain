'use client';

import React from 'react';
import { Check, X, Star, Zap, Crown, Shield, Award, Verified } from 'lucide-react';

type BadgeVariant = 
  | 'default' 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info'
  | 'gold'
  | 'emerald'
  | 'rose';

type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  dot?: boolean;
  pill?: boolean;
  outline?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, { solid: string; outline: string }> = {
  default: {
    solid: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    outline: 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
  },
  primary: {
    solid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    outline: 'border-blue-500 text-blue-600 dark:text-blue-400',
  },
  secondary: {
    solid: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    outline: 'border-purple-500 text-purple-600 dark:text-purple-400',
  },
  success: {
    solid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    outline: 'border-green-500 text-green-600 dark:text-green-400',
  },
  warning: {
    solid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    outline: 'border-yellow-500 text-yellow-600 dark:text-yellow-400',
  },
  danger: {
    solid: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    outline: 'border-red-500 text-red-600 dark:text-red-400',
  },
  info: {
    solid: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    outline: 'border-cyan-500 text-cyan-600 dark:text-cyan-400',
  },
  gold: {
    solid: 'bg-gradient-to-r from-amber-200 to-yellow-300 text-amber-900',
    outline: 'border-amber-400 text-amber-600 dark:text-amber-400',
  },
  emerald: {
    solid: 'bg-gradient-to-r from-emerald-200 to-teal-300 text-emerald-900',
    outline: 'border-emerald-400 text-emerald-600 dark:text-emerald-400',
  },
  rose: {
    solid: 'bg-gradient-to-r from-rose-200 to-pink-300 text-rose-900',
    outline: 'border-rose-400 text-rose-600 dark:text-rose-400',
  },
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  removable = false,
  onRemove,
  dot = false,
  pill = true,
  outline = false,
  className = '',
}: BadgeProps) {
  const variantClass = outline 
    ? `border ${variantClasses[variant].outline}` 
    : variantClasses[variant].solid;
    
  return (
    <span
      className={`
        inline-flex items-center gap-1
        font-medium
        ${sizeClasses[size]}
        ${pill ? 'rounded-full' : 'rounded-md'}
        ${variantClass}
        ${className}
      `}
    >
      {dot && (
        <span 
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'success' ? 'bg-green-500' :
            variant === 'warning' ? 'bg-yellow-500' :
            variant === 'danger' ? 'bg-red-500' :
            variant === 'info' ? 'bg-cyan-500' :
            'bg-current opacity-75'
          }`} 
        />
      )}
      
      {icon && <span className="flex-shrink-0">{icon}</span>}
      
      {children}
      
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 ml-0.5 hover:opacity-75 transition-opacity"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// Preset badges for common use cases

export function VerifiedBadge({ size = 'sm' }: { size?: BadgeSize }) {
  return (
    <Badge variant="primary" size={size} icon={<Verified className="w-3 h-3" />}>
      Verified
    </Badge>
  );
}

export function PremiumBadge({ size = 'sm' }: { size?: BadgeSize }) {
  return (
    <Badge variant="gold" size={size} icon={<Crown className="w-3 h-3" />}>
      Premium
    </Badge>
  );
}

export function NewBadge({ size = 'xs' }: { size?: BadgeSize }) {
  return (
    <Badge variant="success" size={size} icon={<Zap className="w-3 h-3" />}>
      New
    </Badge>
  );
}

export function FeaturedBadge({ size = 'sm' }: { size?: BadgeSize }) {
  return (
    <Badge variant="gold" size={size} icon={<Star className="w-3 h-3" />}>
      Featured
    </Badge>
  );
}

export function RAPBadge({ level = 'Reflect' }: { level?: 'Reflect' | 'Innovate' | 'Stretch' | 'Elevate' }) {
  const colors = {
    Reflect: 'emerald',
    Innovate: 'primary', 
    Stretch: 'secondary',
    Elevate: 'gold',
  } as const;
  
  return (
    <Badge variant={colors[level]} size="sm" icon={<Shield className="w-3 h-3" />}>
      RAP: {level}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: 'active' | 'pending' | 'inactive' | 'archived' }) {
  const config = {
    active: { variant: 'success' as const, label: 'Active' },
    pending: { variant: 'warning' as const, label: 'Pending' },
    inactive: { variant: 'default' as const, label: 'Inactive' },
    archived: { variant: 'default' as const, label: 'Archived' },
  };
  
  return (
    <Badge variant={config[status].variant} size="sm" dot>
      {config[status].label}
    </Badge>
  );
}

export function CountBadge({ count, max = 99 }: { count: number; max?: number }) {
  const displayCount = count > max ? `${max}+` : count;
  
  return (
    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
      {displayCount}
    </span>
  );
}

export default Badge;

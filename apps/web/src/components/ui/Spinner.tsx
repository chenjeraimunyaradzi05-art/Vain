'use client';

import React from 'react';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'gold' | 'emerald' | 'rose' | 'cosmic' | 'white';
  className?: string;
  label?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const borderClasses = {
  xs: 'border-[2px]',
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-[3px]',
  xl: 'border-4',
};

const colorClasses = {
  default: 'border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300',
  primary: 'border-blue-200 border-t-blue-600',
  gold: 'border-[#FFD700]/30 border-t-[#FFD700]',
  emerald: 'border-[#50C878]/30 border-t-[#50C878]',
  rose: 'border-[#E85B8A]/30 border-t-[#E85B8A]',
  cosmic: 'border-[#2D1B69]/50 border-t-[#FFD700]',
  white: 'border-white/30 border-t-white',
};

export function Spinner({
  size = 'md',
  variant = 'default',
  className = '',
  label,
}: SpinnerProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} role="status" aria-label={label || 'Loading'}>
      <div
        className={`
          ${sizeClasses[size]}
          ${borderClasses[size]}
          ${colorClasses[variant]}
          rounded-full
          animate-spin
        `}
      />
      {label && (
        <span className={`text-sm ${variant === 'cosmic' ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>
          {label}
        </span>
      )}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );
}

// Spinner with text below
interface LoadingSpinnerProps {
  text?: string;
  size?: SpinnerProps['size'];
  variant?: SpinnerProps['variant'];
  className?: string;
}

export function LoadingSpinner({
  text = 'Loading...',
  size = 'lg',
  variant = 'default',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Spinner size={size} variant={variant} />
      {text && (
        <p className={`text-sm ${variant === 'cosmic' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {text}
        </p>
      )}
    </div>
  );
}

// Full page loading spinner
interface PageSpinnerProps {
  text?: string;
  variant?: 'default' | 'cosmic';
}

export function PageSpinner({
  text = 'Loading...',
  variant = 'default',
}: PageSpinnerProps) {
  const isCosmic = variant === 'cosmic';
  
  return (
    <div
      className={`
        min-h-[400px] flex items-center justify-center
        ${isCosmic ? 'bg-gradient-to-br from-[#1A0F2E] to-[#2D1B69]' : ''}
      `}
    >
      <LoadingSpinner 
        text={text} 
        size="xl" 
        variant={isCosmic ? 'cosmic' : 'default'} 
      />
    </div>
  );
}

// Overlay spinner (for covering content while loading)
interface OverlaySpinnerProps {
  text?: string;
  variant?: 'default' | 'cosmic';
  visible?: boolean;
}

export function OverlaySpinner({
  text,
  variant = 'default',
  visible = true,
}: OverlaySpinnerProps) {
  if (!visible) return null;

  const isCosmic = variant === 'cosmic';
  
  return (
    <div
      className={`
        absolute inset-0 z-50 flex items-center justify-center
        ${isCosmic 
          ? 'bg-[#1A0F2E]/80 backdrop-blur-sm' 
          : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm'}
      `}
    >
      <LoadingSpinner 
        text={text} 
        size="lg" 
        variant={isCosmic ? 'cosmic' : 'default'} 
      />
    </div>
  );
}

// Button spinner (for inline loading states)
export function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <Spinner size="sm" variant="white" className={className} />
  );
}

// Dots loading animation
interface DotsSpinnerProps {
  variant?: 'default' | 'cosmic';
  className?: string;
}

export function DotsSpinner({ variant = 'default', className = '' }: DotsSpinnerProps) {
  const isCosmic = variant === 'cosmic';
  const dotClass = isCosmic ? 'bg-[#FFD700]' : 'bg-gray-400 dark:bg-gray-500';
  
  return (
    <div className={`inline-flex items-center gap-1 ${className}`} role="status" aria-label="Loading">
      <span className={`w-2 h-2 rounded-full ${dotClass} animate-bounce [animation-delay:-0.3s]`} />
      <span className={`w-2 h-2 rounded-full ${dotClass} animate-bounce [animation-delay:-0.15s]`} />
      <span className={`w-2 h-2 rounded-full ${dotClass} animate-bounce`} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Pulse loading animation
interface PulseSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gold' | 'emerald' | 'rose';
  className?: string;
}

export function PulseSpinner({ size = 'md', variant = 'default', className = '' }: PulseSpinnerProps) {
  const sizeMap = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-16 h-16' };
  const colorMap = {
    default: 'bg-blue-500',
    gold: 'bg-[#FFD700]',
    emerald: 'bg-[#50C878]',
    rose: 'bg-[#E85B8A]',
  };
  
  return (
    <div 
      className={`${sizeMap[size]} rounded-full ${colorMap[variant]} animate-pulse ${className}`} 
      role="status" 
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default Spinner;

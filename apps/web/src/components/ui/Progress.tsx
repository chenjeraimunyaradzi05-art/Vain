'use client';

import React, { useId } from 'react';

type ProgressVariant = 'default' | 'success' | 'warning' | 'danger' | 'gold' | 'emerald' | 'rose' | 'gradient';
type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';

interface ProgressProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  showLabel?: boolean;
  label?: string;
  labelPosition?: 'top' | 'right' | 'inside';
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  strokeWidth?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  label?: React.ReactNode;
  className?: string;
}

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  variant?: 'default' | 'gold' | 'emerald';
  className?: string;
}

const variantClasses: Record<ProgressVariant, string> = {
  default: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  gold: 'bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B]',
  emerald: 'bg-gradient-to-r from-[#2E8B57] via-[#50C878] to-[#2E8B57]',
  rose: 'bg-gradient-to-r from-[#C76D7E] via-[#E85B8A] to-[#C76D7E]',
  gradient: 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500',
};

const sizeClasses: Record<ProgressSize, string> = {
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

const trackClasses = 'bg-gray-200 dark:bg-gray-700';

export function Progress({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  labelPosition = 'top',
  animated = false,
  striped = false,
  className = '',
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const stripedStyle = striped ? {
    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
    backgroundSize: '1rem 1rem',
  } : {};

  const displayLabel = label || `${Math.round(percentage)}%`;

  return (
    <div className={`w-full ${className}`}>
      {showLabel && labelPosition === 'top' && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {displayLabel}
          </span>
          {!label && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <div 
          className={`flex-1 ${trackClasses} rounded-full overflow-hidden ${sizeClasses[size]}`}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div
            className={`
              h-full rounded-full transition-all duration-500 ease-out
              ${variantClasses[variant]}
              ${animated ? 'animate-pulse' : ''}
            `}
            style={{
              width: `${percentage}%`,
              ...stripedStyle,
              ...(striped && animated ? { animation: 'progress-stripes 1s linear infinite' } : {}),
            }}
          >
            {showLabel && labelPosition === 'inside' && size !== 'xs' && size !== 'sm' && (
              <span className="flex items-center justify-center h-full text-xs font-medium text-white">
                {displayLabel}
              </span>
            )}
          </div>
        </div>
        
        {showLabel && labelPosition === 'right' && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-right">
            {displayLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function CircularProgress({
  value,
  max = 100,
  size = 'md',
  strokeWidth = 8,
  variant = 'default',
  showLabel = true,
  label,
  className = '',
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizes = {
    sm: 40,
    md: 64,
    lg: 96,
    xl: 128,
  };
  
  const dimension = sizes[size];
  const radius = (dimension - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const gradientColors: Record<ProgressVariant, { start: string; end: string }> = {
    default: { start: '#3B82F6', end: '#1D4ED8' },
    success: { start: '#22C55E', end: '#16A34A' },
    warning: { start: '#EAB308', end: '#CA8A04' },
    danger: { start: '#EF4444', end: '#DC2626' },
    gold: { start: '#FFD700', end: '#B8860B' },
    emerald: { start: '#50C878', end: '#2E8B57' },
    rose: { start: '#E85B8A', end: '#C76D7E' },
    gradient: { start: '#A855F7', end: '#EC4899' },
  };

  const { start, end } = gradientColors[variant];
  const rawId = useId();
  const gradientId = `progress-gradient-${variant}-${rawId.replace(/:/g, '')}`;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={start} />
            <stop offset="100%" stopColor={end} />
          </linearGradient>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        
        {/* Progress circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          {label || (
            <span className={`font-bold text-gray-900 dark:text-white ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-lg'}`}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function StepProgress({
  currentStep,
  totalSteps,
  labels = [],
  variant = 'default',
  className = '',
}: StepProgressProps) {
  const colorClasses = {
    default: {
      active: 'bg-blue-500 border-blue-500 text-white',
      complete: 'bg-blue-500 border-blue-500 text-white',
      pending: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400',
      line: 'bg-blue-500',
      linePending: 'bg-gray-300 dark:bg-gray-600',
    },
    gold: {
      active: 'bg-[#FFD700] border-[#FFD700] text-black',
      complete: 'bg-[#FFD700] border-[#FFD700] text-black',
      pending: 'bg-white dark:bg-gray-800 border-[#FFD700]/30 text-[#FFD700]/50',
      line: 'bg-[#FFD700]',
      linePending: 'bg-[#FFD700]/20',
    },
    emerald: {
      active: 'bg-[#50C878] border-[#50C878] text-white',
      complete: 'bg-[#50C878] border-[#50C878] text-white',
      pending: 'bg-white dark:bg-gray-800 border-[#50C878]/30 text-[#50C878]/50',
      line: 'bg-[#50C878]',
      linePending: 'bg-[#50C878]/20',
    },
  };

  const colors = colorClasses[variant];

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isComplete = step < currentStep;
          const isActive = step === currentStep;
          const isPending = step > currentStep;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center
                    transition-all duration-300 font-medium text-sm
                    ${isComplete ? colors.complete : ''}
                    ${isActive ? colors.active : ''}
                    ${isPending ? colors.pending : ''}
                  `}
                >
                  {isComplete ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                {labels[i] && (
                  <span className={`
                    mt-2 text-xs font-medium
                    ${isComplete || isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400'}
                  `}>
                    {labels[i]}
                  </span>
                )}
              </div>
              
              {step < totalSteps && (
                <div className="flex-1 mx-2">
                  <div
                    className={`
                      h-0.5 rounded transition-all duration-300
                      ${step < currentStep ? colors.line : colors.linePending}
                    `}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// Add keyframes for striped animation
if (typeof document !== 'undefined') {
  const styleId = 'progress-stripes-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes progress-stripes {
        from { background-position: 1rem 0; }
        to { background-position: 0 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default Progress;

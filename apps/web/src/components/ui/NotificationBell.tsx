'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { Bell } from 'lucide-react';

/**
 * NotificationBell Component
 * 
 * An animated notification bell icon with badge counter.
 * Part of the Ngurra Pathways Celestial Precious Stone theme.
 * 
 * Features:
 * - Animated bell shake on new notifications
 * - Pulsing unread badge
 * - Cosmic theme support
 * - Accessibility compliant
 */

interface NotificationBellProps {
  /** Number of unread notifications */
  count?: number;
  /** Maximum count to display (shows "max+" above) */
  maxCount?: number;
  /** Whether to animate when count changes */
  animate?: boolean;
  /** Whether to show the dot instead of count */
  showDot?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Theme variant */
  variant?: 'default' | 'cosmic' | 'minimal';
  /** Click handler */
  onClick?: () => void;
  /** Whether the dropdown is currently open */
  isOpen?: boolean;
  /** Additional class names */
  className?: string;
  /** ARIA label override */
  ariaLabel?: string;
}

const sizeClasses = {
  sm: {
    button: 'p-1.5',
    icon: 'w-4 h-4',
    badge: 'w-4 h-4 text-[10px] -top-0.5 -right-0.5',
    dot: 'w-2 h-2 top-0 right-0',
  },
  md: {
    button: 'p-2',
    icon: 'w-5 h-5',
    badge: 'w-5 h-5 text-xs -top-1 -right-1',
    dot: 'w-2.5 h-2.5 -top-0.5 -right-0.5',
  },
  lg: {
    button: 'p-2.5',
    icon: 'w-6 h-6',
    badge: 'w-6 h-6 text-sm -top-1 -right-1',
    dot: 'w-3 h-3 -top-0.5 -right-0.5',
  },
};

const variantClasses = {
  default: {
    button: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700',
    badge: 'bg-red-500 text-white',
    dot: 'bg-red-500',
  },
  cosmic: {
    button: 'text-purple-300 hover:text-[#FFD700] hover:bg-white/5',
    badge: 'bg-gradient-to-r from-[#FFD700] to-[#E85B8A] text-[#0D0A1A]',
    dot: 'bg-[#FFD700]',
  },
  minimal: {
    button: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
    badge: 'bg-blue-500 text-white',
    dot: 'bg-blue-500',
  },
};

export const NotificationBell = memo(function NotificationBell({
  count = 0,
  maxCount = 99,
  animate = true,
  showDot = false,
  size = 'md',
  variant = 'default',
  onClick,
  isOpen = false,
  className = '',
  ariaLabel,
}: NotificationBellProps) {
  const [isShaking, setIsShaking] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevCountRef = useRef(count);

  // Animate when count increases
  useEffect(() => {
    if (animate && count > prevCountRef.current && count > 0) {
      setIsShaking(true);
      setIsPulsing(true);
      
      const shakeTimer = setTimeout(() => setIsShaking(false), 500);
      const pulseTimer = setTimeout(() => setIsPulsing(false), 2000);
      
      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(pulseTimer);
      };
    }
    prevCountRef.current = count;
  }, [count, animate]);

  const sizes = sizeClasses[size];
  const variants = variantClasses[variant];
  
  const displayCount = count > maxCount ? `${maxCount}+` : count;
  const hasNotifications = count > 0;

  const label = ariaLabel || (hasNotifications 
    ? `Notifications (${count} unread)` 
    : 'Notifications');

  return (
    <button
      onClick={onClick}
      className={`
        relative rounded-lg transition-all duration-200 focus:outline-none 
        focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        dark:focus:ring-offset-gray-900
        ${sizes.button}
        ${variants.button}
        ${isShaking ? 'animate-wiggle' : ''}
        ${className}
      `}
      aria-label={label}
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      {/* Bell Icon */}
      <Bell 
        className={`
          ${sizes.icon}
          transition-transform duration-200
          ${isOpen ? 'scale-110' : ''}
        `}
      />
      
      {/* Notification Badge */}
      {hasNotifications && (
        showDot ? (
          // Dot indicator
          <span 
            className={`
              absolute rounded-full
              ${sizes.dot}
              ${variants.dot}
              ${isPulsing ? 'animate-ping-slow' : ''}
            `}
          />
        ) : (
          // Count badge
          <span 
            className={`
              absolute rounded-full font-bold
              flex items-center justify-center
              ${sizes.badge}
              ${variants.badge}
              ${isPulsing ? 'animate-pulse-scale' : ''}
              shadow-sm
            `}
          >
            {displayCount}
          </span>
        )
      )}

      {/* Cosmic glow effect */}
      {variant === 'cosmic' && hasNotifications && (
        <span 
          className="absolute inset-0 rounded-lg bg-[#FFD700]/10 blur-md -z-10 
            animate-pulse-slow"
        />
      )}
    </button>
  );
});

// ============================================================================
// NOTIFICATION BADGE (standalone)
// ============================================================================

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  variant?: 'default' | 'cosmic' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

const badgeVariants = {
  default: 'bg-blue-500 text-white',
  cosmic: 'bg-gradient-to-r from-[#FFD700] to-[#E85B8A] text-[#0D0A1A]',
  danger: 'bg-red-500 text-white',
  success: 'bg-green-500 text-white',
};

const badgeSizes = {
  sm: 'h-4 min-w-4 px-1 text-[10px]',
  md: 'h-5 min-w-5 px-1.5 text-xs',
  lg: 'h-6 min-w-6 px-2 text-sm',
};

export function NotificationBadge({
  count,
  maxCount = 99,
  variant = 'default',
  size = 'md',
  className = '',
  animate = false,
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count;

  return (
    <span
      className={`
        inline-flex items-center justify-center font-bold rounded-full
        ${badgeSizes[size]}
        ${badgeVariants[variant]}
        ${animate ? 'animate-pulse-scale' : ''}
        ${className}
      `}
      aria-label={`${count} notifications`}
    >
      {displayCount}
    </span>
  );
}

// ============================================================================
// NOTIFICATION DOT (standalone)
// ============================================================================

interface NotificationDotProps {
  visible?: boolean;
  variant?: 'default' | 'cosmic' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
}

const dotVariants = {
  default: 'bg-blue-500',
  cosmic: 'bg-[#FFD700]',
  danger: 'bg-red-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
};

const dotSizes = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

export function NotificationDot({
  visible = true,
  variant = 'default',
  size = 'md',
  animate = true,
  className = '',
}: NotificationDotProps) {
  if (!visible) return null;

  return (
    <span
      className={`
        inline-block rounded-full
        ${dotSizes[size]}
        ${dotVariants[variant]}
        ${animate ? 'animate-pulse' : ''}
        ${className}
      `}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// CUSTOM CSS (add to global styles)
// ============================================================================

/**
 * Add these keyframes to your global CSS:
 * 
 * @keyframes wiggle {
 *   0%, 100% { transform: rotate(0deg); }
 *   15% { transform: rotate(-15deg); }
 *   30% { transform: rotate(10deg); }
 *   45% { transform: rotate(-10deg); }
 *   60% { transform: rotate(5deg); }
 *   75% { transform: rotate(-5deg); }
 * }
 * 
 * @keyframes pulse-scale {
 *   0%, 100% { transform: scale(1); }
 *   50% { transform: scale(1.1); }
 * }
 * 
 * @keyframes ping-slow {
 *   75%, 100% {
 *     transform: scale(2);
 *     opacity: 0;
 *   }
 * }
 * 
 * .animate-wiggle {
 *   animation: wiggle 0.5s ease-in-out;
 * }
 * 
 * .animate-pulse-scale {
 *   animation: pulse-scale 1s ease-in-out infinite;
 * }
 * 
 * .animate-ping-slow {
 *   animation: ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
 * }
 * 
 * .animate-pulse-slow {
 *   animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
 * }
 */

export default NotificationBell;

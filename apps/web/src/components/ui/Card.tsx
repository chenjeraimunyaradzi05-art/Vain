'use client';
/* eslint-disable no-undef */

import type { ElementType, ReactNode } from 'react';
import Link from 'next/link';

type CardVariant =
  | 'default'
  | 'elevated'
  | 'outlined'
  | 'glass'
  | 'cosmic'
  | 'gradient'
  | 'ngurra' // Vantage theme - main sidebar/content cards
  | 'ngurra-dark' // Vantage dark variant
  | 'aura'; // Gradient CTA style

type CardNode = ReactNode;

interface CardProps {
  children: CardNode;
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  clickable?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  as?: ElementType;
  suppressHydrationWarning?: boolean;
}

interface CardHeaderProps {
  children?: CardNode;
  title?: string;
  subtitle?: string;
  action?: CardNode;
  icon?: CardNode;
  className?: string;
}

interface CardContentProps {
  children: CardNode;
  className?: string;
}

interface CardFooterProps {
  children: CardNode;
  className?: string;
  divided?: boolean;
}

// Vantage platform theme - consistent card styling
const variantClasses: Record<CardVariant, string> = {
  default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  elevated: 'bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50',
  outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-600',
  glass: 'bg-white/10 backdrop-blur-md border border-white/20',
  cosmic:
    'bg-gradient-to-br from-[#1A0F2E]/90 to-[#2D1B69]/80 border border-[#FFD700]/20 backdrop-blur-sm',
  gradient: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20',
  // Vantage theme variants - consistent with homepage design system
  ngurra:
    'backdrop-blur-md bg-white/90 border border-slate-200/80 dark:bg-slate-900/80 dark:border-slate-700/50 shadow-sm',
  'ngurra-dark': 'backdrop-blur-md bg-slate-900/90 border border-slate-700/50 shadow-sm',
  aura: 'backdrop-blur-sm border border-white/20 shadow-lg',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  variant = 'default',
  padding = 'none',
  hover = false,
  clickable = false,
  href,
  onClick,
  className = '',
  as,
  suppressHydrationWarning = false,
}: CardProps) {
  // Build classes array to avoid whitespace inconsistencies between server/client
  const classes = [
    'rounded-xl',
    'overflow-hidden',
    'transition-colors',
    variantClasses[variant],
    paddingClasses[padding],
    hover || clickable ? 'transition-all duration-200 hover:-translate-y-1 hover:shadow-lg' : '',
    clickable || onClick || href ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const combinedClasses = classes.trim().replace(/\s+/g, ' ');

  // If href is provided, render as Link
  if (href) {
    return (
      <Link
        href={href}
        className={combinedClasses}
        suppressHydrationWarning={suppressHydrationWarning}
      >
        <>{children}</>
      </Link>
    );
  }

  // If custom element type is provided
  if (as) {
    const Component = as;
    return (
      <Component
        className={combinedClasses}
        onClick={onClick}
        suppressHydrationWarning={suppressHydrationWarning}
      >
        {children}
      </Component>
    );
  }

  // Default to div
  return (
    <div
      className={combinedClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      suppressHydrationWarning={suppressHydrationWarning}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  title,
  subtitle,
  action,
  icon,
  className = '',
}: CardHeaderProps) {
  // If children are provided, render them directly
  if (children && !title) {
    return <div className={`px-4 py-3 sm:px-6 sm:py-4 ${className}`}>{children}</div>;
  }

  return (
    <div
      className={`px-4 py-3 sm:px-6 sm:py-4 flex items-start justify-between gap-4 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50">{icon}</div>
        )}
        <div className="min-w-0">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`px-4 py-3 sm:px-6 sm:py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '', divided = true }: CardFooterProps) {
  return (
    <div
      className={`
        px-4 py-3 sm:px-6 sm:py-4
        ${divided ? 'border-t border-gray-200 dark:border-gray-700' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Feature Card - commonly used for showcasing features
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  variant?: 'default' | 'cosmic';
}

export function FeatureCard({
  icon,
  title,
  description,
  href,
  variant = 'default',
}: FeatureCardProps) {
  const content = (
    <>
      <div
        className={`
        p-3 rounded-xl mb-4 inline-flex
        ${
          variant === 'cosmic'
            ? 'bg-gradient-to-br from-[#FFD700]/20 to-[#50C878]/10 border border-[#FFD700]/30'
            : 'bg-blue-100 dark:bg-blue-900/30'
        }
      `}
      >
        {icon}
      </div>
      <h3
        className={`text-lg font-semibold mb-2 ${variant === 'cosmic' ? 'text-white' : 'text-gray-900 dark:text-white'}`}
      >
        {title}
      </h3>
      <p
        className={`text-sm ${variant === 'cosmic' ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}
      >
        {description}
      </p>
    </>
  );

  return (
    <Card variant={variant} padding="lg" hover={!!href} href={href}>
      {content}
    </Card>
  );
}

// Stats Card - for displaying metrics
interface StatsCardProps {
  label: string;
  value: string | number;
  change?: { value: number; type: 'increase' | 'decrease' };
  icon?: React.ReactNode;
  variant?: 'default' | 'cosmic';
}

export function StatsCard({ label, value, change, icon, variant = 'default' }: StatsCardProps) {
  return (
    <Card variant={variant} padding="md">
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-sm ${variant === 'cosmic' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {label}
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${variant === 'cosmic' ? 'text-white' : 'text-gray-900 dark:text-white'}`}
          >
            {value}
          </p>
          {change && (
            <p
              className={`text-sm mt-1 ${change.type === 'increase' ? 'text-green-500' : 'text-red-500'}`}
            >
              {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div
            className={`
            p-3 rounded-lg
            ${variant === 'cosmic' ? 'bg-white/5' : 'bg-gray-100 dark:bg-gray-700'}
          `}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export default Card;

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';

// Animated Counter Component
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  startOnView?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  startOnView = true,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const elementRef = useRef<HTMLSpanElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!startOnView || hasStarted) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHasStarted(true);
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observerRef.current.observe(elementRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const startTime = Date.now();
    const startValue = 0;
    let animationFrame: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentValue = startValue + (value - startValue) * eased;
      setCount(currentValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration, hasStarted]);

  const displayValue = decimals > 0 ? count.toFixed(decimals) : Math.floor(count);

  return (
    <span ref={elementRef} className={className}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}

// Stats Card with Change Indicator
interface StatCardProps {
  label: string;
  value: number | string;
  previousValue?: number;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'cosmic' | 'gold' | 'emerald' | 'rose';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  previousValue,
  prefix = '',
  suffix = '',
  icon,
  variant = 'default',
  size = 'md',
  animated = true,
  className = '',
}: StatCardProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const change = previousValue !== undefined ? numericValue - previousValue : null;
  const changePercent = previousValue && previousValue !== 0 
    ? ((change! / previousValue) * 100).toFixed(1) 
    : null;

  const sizeClasses = {
    sm: { container: 'p-4', value: 'text-2xl', label: 'text-xs' },
    md: { container: 'p-5', value: 'text-3xl', label: 'text-sm' },
    lg: { container: 'p-6', value: 'text-4xl', label: 'text-base' },
  };

  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    cosmic: 'bg-gradient-to-br from-[#1A0F2E] to-[#2D1B69] border-[#FFD700]/20',
    gold: 'bg-gradient-to-br from-[#FFD700]/10 to-[#FFD700]/5 border-[#FFD700]/30',
    emerald: 'bg-gradient-to-br from-[#50C878]/10 to-[#50C878]/5 border-[#50C878]/30',
    rose: 'bg-gradient-to-br from-[#E85B8A]/10 to-[#E85B8A]/5 border-[#E85B8A]/30',
  };

  const valueClasses = {
    default: 'text-gray-900 dark:text-white',
    cosmic: 'text-white',
    gold: 'text-[#FFD700]',
    emerald: 'text-[#50C878]',
    rose: 'text-[#E85B8A]',
  };

  const sizes = sizeClasses[size];

  return (
    <div
      className={`
        ${sizes.container}
        rounded-xl border
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {/* Header with icon */}
      <div className="flex items-center justify-between mb-2">
        <span className={`${sizes.label} text-gray-500 dark:text-gray-400 font-medium`}>
          {label}
        </span>
        {icon && (
          <span className={valueClasses[variant] + ' opacity-60'}>
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div className={`${sizes.value} font-bold ${valueClasses[variant]}`}>
        {animated && typeof value === 'number' ? (
          <AnimatedCounter value={numericValue} prefix={prefix} suffix={suffix} />
        ) : (
          `${prefix}${value}${suffix}`
        )}
      </div>

      {/* Change indicator */}
      {change !== null && (
        <div className="flex items-center gap-1 mt-2">
          {change > 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : change < 0 ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : (
            <Minus className="w-4 h-4 text-gray-400" />
          )}
          <span
            className={`text-sm font-medium ${
              change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            {change > 0 ? '+' : ''}{change} ({changePercent}%)
          </span>
          <span className="text-xs text-gray-400">vs previous</span>
        </div>
      )}
    </div>
  );
}

// Stats Grid Component
interface StatsGridProps {
  stats: Array<{
    label: string;
    value: number | string;
    previousValue?: number;
    prefix?: string;
    suffix?: string;
    icon?: React.ReactNode;
  }>;
  variant?: 'default' | 'cosmic';
  columns?: 2 | 3 | 4;
  animated?: boolean;
  className?: string;
}

export function StatsGrid({
  stats,
  variant = 'default',
  columns = 4,
  animated = true,
  className = '',
}: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          {...stat}
          variant={variant}
          animated={animated}
        />
      ))}
    </div>
  );
}

// Metric Row (inline stat display)
interface MetricRowProps {
  label: string;
  value: number | string;
  change?: number;
  icon?: React.ReactNode;
  variant?: 'default' | 'cosmic';
}

export function MetricRow({
  label,
  value,
  change,
  icon,
  variant = 'default',
}: MetricRowProps) {
  const isCosmic = variant === 'cosmic';

  return (
    <div
      className={`
        flex items-center justify-between py-3 px-4 rounded-lg
        ${isCosmic ? 'bg-white/5' : 'bg-gray-50 dark:bg-gray-800/50'}
      `}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <span className={isCosmic ? 'text-[#FFD700]' : 'text-gray-400'}>
            {icon}
          </span>
        )}
        <span className={`text-sm ${isCosmic ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>
          {label}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${isCosmic ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          {value}
        </span>
        {change !== undefined && (
          <span
            className={`
              flex items-center text-xs font-medium
              ${change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-400'}
            `}
          >
            {change > 0 ? <ArrowUp className="w-3 h-3" /> : change < 0 ? <ArrowDown className="w-3 h-3" /> : null}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Progress Stat (value with progress bar)
interface ProgressStatProps {
  label: string;
  value: number;
  max: number;
  prefix?: string;
  suffix?: string;
  variant?: 'default' | 'gold' | 'emerald' | 'rose' | 'gradient';
  showPercentage?: boolean;
  className?: string;
}

export function ProgressStat({
  label,
  value,
  max,
  prefix = '',
  suffix = '',
  variant = 'default',
  showPercentage = true,
  className = '',
}: ProgressStatProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  const barColors = {
    default: 'bg-blue-500',
    gold: 'bg-gradient-to-r from-[#FFD700] to-[#FFA500]',
    emerald: 'bg-gradient-to-r from-[#50C878] to-[#3CB371]',
    rose: 'bg-gradient-to-r from-[#E85B8A] to-[#FF69B4]',
    gradient: 'bg-gradient-to-r from-[#FFD700] via-[#50C878] to-[#E85B8A]',
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {prefix}{value}{suffix}
          {showPercentage && <span className="text-gray-400 ml-1">({percentage.toFixed(0)}%)</span>}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColors[variant]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default AnimatedCounter;

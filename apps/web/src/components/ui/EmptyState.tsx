'use client';

import React from 'react';
import Link from 'next/link';
import {
  Search,
  FileText,
  Users,
  Briefcase,
  MessageSquare,
  Calendar,
  Bell,
  BookOpen,
  FolderOpen,
  Inbox,
  Star,
  Heart,
  Target,
  Sparkles,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  variant?: 'default' | 'cosmic' | 'minimal' | 'illustrated';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: {
    container: 'py-8 px-4',
    icon: 'w-12 h-12',
    iconWrapper: 'w-16 h-16',
    title: 'text-base',
    description: 'text-sm',
    button: 'px-4 py-2 text-sm',
  },
  md: {
    container: 'py-12 px-6',
    icon: 'w-16 h-16',
    iconWrapper: 'w-24 h-24',
    title: 'text-lg',
    description: 'text-base',
    button: 'px-5 py-2.5 text-sm',
  },
  lg: {
    container: 'py-16 px-8',
    icon: 'w-20 h-20',
    iconWrapper: 'w-32 h-32',
    title: 'text-xl',
    description: 'text-base',
    button: 'px-6 py-3 text-base',
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const sizes = sizeClasses[size];

  const iconWrapperClass =
    variant === 'cosmic'
      ? 'bg-gradient-to-br from-[#2D1B69]/50 to-[#1A0F2E]/50 border border-[#FFD700]/20'
      : variant === 'minimal'
      ? 'bg-transparent'
      : 'bg-gray-100 dark:bg-gray-800';

  const iconColor =
    variant === 'cosmic'
      ? 'text-[#FFD700]'
      : 'text-gray-400 dark:text-gray-500';

  const ActionButton = ({ actionData, primary = false }: { actionData: typeof action; primary?: boolean }) => {
    if (!actionData) return null;
    
    const buttonClass = primary
      ? variant === 'cosmic'
        ? `${sizes.button} rounded-lg bg-gradient-to-r from-[#FFD700] to-[#50C878] text-gray-900 font-medium hover:opacity-90 transition-opacity`
        : `${sizes.button} rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors`
      : `${sizes.button} rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`;

    if (actionData.href) {
      return (
        <Link href={actionData.href} className={buttonClass}>
          {actionData.label}
        </Link>
      );
    }

    return (
      <button onClick={actionData.onClick} className={buttonClass}>
        {actionData.label}
      </button>
    );
  };

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${sizes.container}
        ${variant === 'cosmic' ? 'bg-gradient-to-br from-[#1A0F2E]/30 to-transparent rounded-2xl border border-[#FFD700]/10' : ''}
        ${className}
      `}
    >
      {/* Icon */}
      {(icon || variant !== 'minimal') && (
        <div
          className={`
            ${sizes.iconWrapper}
            rounded-full flex items-center justify-center mb-4
            ${iconWrapperClass}
          `}
        >
          {icon ? (
            <span className={iconColor}>{icon}</span>
          ) : (
            <Inbox className={`${sizes.icon} ${iconColor}`} />
          )}
        </div>
      )}

      {/* Title */}
      <h3
        className={`
          ${sizes.title}
          font-semibold
          ${variant === 'cosmic' ? 'text-white' : 'text-gray-900 dark:text-white'}
        `}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={`
            ${sizes.description}
            mt-2 max-w-sm
            ${variant === 'cosmic' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}
          `}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          <ActionButton actionData={action} primary />
          <ActionButton actionData={secondaryAction} primary={false} />
        </div>
      )}
    </div>
  );
}

// Preset Empty States for common scenarios
interface PresetEmptyStateProps {
  onAction?: () => void;
  actionLabel?: string;
  variant?: 'default' | 'cosmic';
  size?: 'sm' | 'md' | 'lg';
}

export function NoSearchResults({
  onAction,
  actionLabel = 'Clear filters',
  variant = 'default',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Search className="w-10 h-10" />}
      title="No results found"
      description="We couldn't find anything matching your search. Try adjusting your filters or search terms."
      action={onAction ? { label: actionLabel, onClick: onAction } : undefined}
      variant={variant}
      size={size}
    />
  );
}

export function NoJobs({
  onAction,
  actionLabel = 'Browse all jobs',
  variant = 'default',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Briefcase className="w-10 h-10" />}
      title="No jobs available"
      description="There are no jobs matching your criteria right now. Check back soon or explore other opportunities."
      action={onAction ? { label: actionLabel, onClick: onAction } : { label: actionLabel, href: '/jobs' }}
      variant={variant}
      size={size}
    />
  );
}

export function NoApplications({
  variant = 'default',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<FileText className="w-10 h-10" />}
      title="No applications yet"
      description="You haven't applied to any jobs yet. Start exploring opportunities that match your skills."
      action={{ label: 'Find jobs', href: '/jobs' }}
      variant={variant}
      size={size}
    />
  );
}

export function NoMessages({
  variant = 'default',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<MessageSquare className="w-10 h-10" />}
      title="No messages"
      description="Your inbox is empty. Start a conversation with mentors, employers, or community members."
      action={{ label: 'Find mentors', href: '/mentors' }}
      variant={variant}
      size={size}
    />
  );
}

export function NoNotifications({
  variant = 'default',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Bell className="w-10 h-10" />}
      title="No notifications"
      description="You're all caught up! We'll notify you when there's something new."
      variant={variant}
      size={size}
    />
  );
}

export function NoMentors({
  variant = 'default',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Users className="w-10 h-10" />}
      title="No mentors found"
      description="We couldn't find mentors matching your preferences. Try adjusting your search criteria."
      action={{ label: 'Browse all mentors', href: '/mentors' }}
      variant={variant}
      size={size}
    />
  );
}

export function NoCourses({
  variant = 'default',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<BookOpen className="w-10 h-10" />}
      title="No courses available"
      description="There are no courses matching your search. Explore our full catalog for more options."
      action={{ label: 'View all courses', href: '/courses' }}
      variant={variant}
      size={size}
    />
  );
}

export function NoEvents({
  variant = 'default',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Calendar className="w-10 h-10" />}
      title="No upcoming events"
      description="There are no events scheduled at the moment. Check back soon for new community events."
      variant={variant}
      size={size}
    />
  );
}

export function NoSavedItems({
  variant = 'default',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Heart className="w-10 h-10" />}
      title="No saved items"
      description="Save jobs, courses, or resources here for quick access later."
      action={{ label: 'Explore', href: '/jobs' }}
      variant={variant}
      size={size}
    />
  );
}

export function NoData({
  variant = 'default',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<FolderOpen className="w-10 h-10" />}
      title="No data available"
      description="There's nothing to display here yet. Start by adding some content."
      variant={variant}
      size={size}
    />
  );
}

export function NoFavorites({
  variant = 'default',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Star className="w-10 h-10" />}
      title="No favorites"
      description="Mark items as favorites to find them easily later."
      variant={variant}
      size={size}
    />
  );
}

export function NoGoals({
  onAction,
  actionLabel = 'Set a goal',
  variant = 'default',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Target className="w-10 h-10" />}
      title="No goals set"
      description="Set career goals to track your progress and stay motivated on your journey."
      action={onAction ? { label: actionLabel, onClick: onAction } : undefined}
      variant={variant}
      size={size}
    />
  );
}

export function ComingSoon({
  variant = 'cosmic',
  size = 'md',
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Sparkles className="w-10 h-10" />}
      title="Coming Soon"
      description="We're working on something exciting! This feature will be available soon."
      variant={variant}
      size={size}
    />
  );
}

export default EmptyState;

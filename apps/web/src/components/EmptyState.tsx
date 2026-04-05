'use client';

/**
 * Empty State Component
 * 
 * Friendly empty states for lists and search results.
 */

import { ReactNode } from 'react';
import { 
  Search, 
  Briefcase, 
  BookOpen, 
  Users, 
  Bell, 
  MessageSquare,
  FileText,
  Heart,
  Calendar,
  FolderOpen
} from 'lucide-react';

export type EmptyStateType = 
  | 'search' 
  | 'jobs' 
  | 'courses' 
  | 'mentors' 
  | 'notifications' 
  | 'messages' 
  | 'applications' 
  | 'saved' 
  | 'events'
  | 'default';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

const EMPTY_STATE_CONFIG: Record<EmptyStateType, {
  icon: typeof Search;
  title: string;
  description: string;
  color: string;
}> = {
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search terms or filters to find what you\'re looking for.',
    color: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
  },
  jobs: {
    icon: Briefcase,
    title: 'No jobs found',
    description: 'There are no jobs matching your criteria. Check back soon for new opportunities.',
    color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  },
  courses: {
    icon: BookOpen,
    title: 'No courses available',
    description: 'There are no courses matching your criteria. Try different filters.',
    color: 'text-green-500 bg-green-100 dark:bg-green-900/30',
  },
  mentors: {
    icon: Users,
    title: 'No mentors found',
    description: 'There are no mentors matching your criteria. Try adjusting your filters.',
    color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  },
  notifications: {
    icon: Bell,
    title: 'No notifications',
    description: 'You\'re all caught up! We\'ll notify you when something new happens.',
    color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  },
  messages: {
    icon: MessageSquare,
    title: 'No messages yet',
    description: 'Start a conversation with employers or mentors to see messages here.',
    color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30',
  },
  applications: {
    icon: FileText,
    title: 'No applications yet',
    description: 'You haven\'t applied to any jobs yet. Start exploring opportunities!',
    color: 'text-teal-500 bg-teal-100 dark:bg-teal-900/30',
  },
  saved: {
    icon: Heart,
    title: 'No saved items',
    description: 'Save jobs, courses, or mentors to easily find them later.',
    color: 'text-rose-500 bg-rose-100 dark:bg-rose-900/30',
  },
  events: {
    icon: Calendar,
    title: 'No upcoming events',
    description: 'There are no events scheduled. Check back for new community events.',
    color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
  },
  default: {
    icon: FolderOpen,
    title: 'Nothing here yet',
    description: 'This section is empty. Content will appear here once available.',
    color: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
  },
};

export function EmptyState({
  type = 'default',
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icon */}
      <div className={`w-16 h-16 rounded-full ${config.color} flex items-center justify-center mb-4`}>
        {icon || <Icon className="w-8 h-8" />}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {title || config.title}
      </h3>

      {/* Description */}
      <p className="text-slate-600 dark:text-slate-400 max-w-sm mb-6">
        {description || config.description}
      </p>

      {/* Action */}
      {action && <div>{action}</div>}
    </div>
  );
}

// Convenience components for specific empty states
export function EmptySearchResults(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="search" {...props} />;
}

export function EmptyJobsList(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="jobs" {...props} />;
}

export function EmptyCoursesList(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="courses" {...props} />;
}

export function EmptyMentorsList(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="mentors" {...props} />;
}

export function EmptyNotifications(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="notifications" {...props} />;
}

export function EmptyMessages(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="messages" {...props} />;
}

export function EmptyApplications(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="applications" {...props} />;
}

export function EmptySavedItems(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="saved" {...props} />;
}

export function EmptyEvents(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="events" {...props} />;
}

export default EmptyState;

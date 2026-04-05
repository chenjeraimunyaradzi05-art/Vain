/**
 * Store Index - Exports all Zustand stores
 * 
 * Provides centralized access to application state management
 */

export { useFeedStore } from './feedStore';
export type { Post, Author, Reaction, Comment, CreatePostInput } from './feedStore';

export { useConnectionStore } from './connectionStore';
export type { 
  Connection, 
  ConnectionRequest, 
  UserProfile, 
  ConnectionStatus 
} from './connectionStore';

export { useMessagingStore } from './messagingStore';
export type { 
  Message, 
  Conversation, 
  Participant, 
  TypingUser 
} from './messagingStore';

export { useNotificationStore } from './notificationStore';
export type { 
  Notification, 
  NotificationType, 
  NotificationActor, 
  NotificationPreferences 
} from './notificationStore';

export { useJobsStore } from './jobsStore';
export type {
  JobListing,
  SavedJob,
  JobApplication,
  JobSearchFilters,
  Company,
} from './jobsStore';

export { useMentorshipStore } from './mentorshipStore';
export type {
  MentorProfile,
  MentorSession,
  MentorCircle,
  AvailabilitySlot,
  MentorSearchFilters,
} from './mentorshipStore';

// Re-export for convenience
export * from './feedStore';
export * from './connectionStore';
export * from './messagingStore';
export * from './notificationStore';
export * from './jobsStore';
export * from './mentorshipStore';

/**
 * Services Module Index
 * 
 * Re-exports all service classes for convenient importing.
 */

export { JobService } from './jobService';

// Queue and Email services
export { default as queueService } from './queue';
export { default as emailService } from './email';

// Queue exports
export {
  QUEUE_NAMES,
  getQueue,
  queueEmail,
  queueNotification,
  queueResumeParsing,
  queueWebhook,
  scheduleJob,
  getJobStatus,
  getQueueStats,
} from './queue';

// Email exports
export {
  sendEmail,
  sendEmailAsync,
  sendTemplateEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendApplicationReceivedEmail,
  sendApplicationStatusEmail,
  sendSessionReminderEmail,
} from './email';

// Re-export types
export type {
  CreateJobInput,
  UpdateJobInput,
  JobFilters,
  PaginationOptions,
  PaginatedResult,
} from './jobService';

// New services
export { feedRankingService } from './feedRanking';
export { contentModerationService } from './contentModeration';
export { videoService } from './videoService';
export { analyticsService } from './analyticsService';
export { jobMatchingService } from './jobMatching';
export { mentorshipMatchingService } from './mentorshipMatching';
export { pushNotificationService } from './pushNotification';
export { emailService as emailServiceNew } from './emailService';
export { backgroundJobs, JobTypes, Queues } from './backgroundJobs';
export { fileUploadService, FILE_CONFIGS } from './fileUpload';
export { auditLogger } from './auditLogging';
export { searchService } from './searchService';
export { paymentService } from './paymentService';
export { webhookHandler } from './webhookHandler';

// New service types
export type {
  RankedPost,
} from './feedRanking';

export type {
  ModerationResult,
  ModerationAction,
} from './contentModeration';

export type {
  VideoMetadata,
  VideoQuality,
} from './videoService';

export type {
  AnalyticsEvent,
  EventType,
  UserMetrics,
  PlatformMetrics,
} from './analyticsService';

export type {
  JobMatchScore,
  ScoreBreakdown,
  UserProfile,
  JobListing,
} from './jobMatching';

export type {
  MentorMatch,
  MentorProfile,
} from './mentorshipMatching';

export type {
  PushNotification,
  NotificationCategory,
  PushToken,
  BatchResult,
} from './pushNotification';

export type {
  EmailOptions,
  EmailResult,
  EmailAttachment,
} from './emailService';

export type {
  Job,
  JobOptions,
  JobStatus,
  BackoffStrategy,
} from './backgroundJobs';

export type {
  UploadedFile,
  UploadOptions,
  FileMetadata,
  PresignedUrlResponse,
} from './fileUpload';

export type {
  AuditLog,
  AuditEventType,
  AuditCategory,
  AuditContext,
  AuditQuery,
} from './auditLogging';

export type {
  SearchQuery,
  SearchResult,
  SearchResponse,
  SearchEntityType,
  AutocompleteResult,
} from './searchService';

export type {
  SubscriptionTier,
  SubscriptionPlan,
} from './paymentService';

export type {
  WebhookEvent,
  WebhookSource,
  WebhookConfig,
  WebhookDelivery,
} from './webhookHandler';

// Cultural Calendar Service
export { culturalCalendarService, CulturalCalendarService } from './culturalCalendarService';
export type {
  CulturalEvent,
  CulturalEventType,
  CulturalEventCategory,
  EventLocation,
  EventOrganizer,
  CulturalContext,
  EventAttendee,
} from './culturalCalendarService';

// Indigenous Data Sovereignty Service
export { dataSovereigntyService, DataSovereigntyService } from './dataSovereigntyService';
export type {
  DataSovereigntyPreferences,
  ConsentRecord,
  ConsentType,
  DataExportRequest,
  DeletionRequest,
  CulturalDataClassification,
  DataAccessLog,
} from './dataSovereigntyService';

// Indigenous Language Service
export { indigenousLanguageService, IndigenousLanguageService } from './indigenousLanguageService';
export type {
  IndigenousLanguage,
  LanguageStatus,
  LanguageResource,
  ResourceType,
  PlatformPhrase,
  LanguageTranslation,
  LanguageMentor,
  LanguageLearner,
} from './indigenousLanguageService';

// Community Initiatives Service
export { communityInitiativesService, CommunityInitiativesService } from './communityInitiativesService';
export type {
  CommunityInitiative,
  InitiativeType,
  InitiativeCategory,
  InitiativeStatus,
  Milestone,
  Volunteer,
  ImpactMetric,
  VolunteerOpportunity,
  GrantOpportunity,
  InitiativeFilters,
} from './communityInitiativesService';

// Gamification Service
export { gamificationService, GamificationService, ACHIEVEMENTS, POINTS_CONFIG, LEVELS } from './gamificationService';
export type {
  Achievement,
  AchievementCategory,
  AchievementCondition,
  UserAchievement,
  PointsActivity,
  PointsAction,
  UserLevel,
  LeaderboardEntry,
  Challenge,
  UserChallenge,
} from './gamificationService';

// Referral Service
export { referralService, ReferralService, REWARD_CONFIG } from './referralService';
export type {
  ReferralCode,
  Referral,
  ReferralStatus,
  ReferralReward,
  RewardType,
  RewardStatus,
  ReferralCampaign,
  ReferralStats,
  ReferralLeaderboardEntry,
} from './referralService';

// Notification Service
export { notificationService, NOTIFICATION_CONFIG } from './notificationService';
export type {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationPayload,
  Notification,
  NotificationPreferences,
  NotificationGroup,
  NotificationStats,
} from './notificationService';

export {};
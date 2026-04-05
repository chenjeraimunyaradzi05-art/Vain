/**
 * Component Exports
 * 
 * Central export point for all reusable components.
 * Ngurra Pathways - Celestial Precious Stone Theme
 */

// Feedback Components
export { default as Toast, ToastContainer, ToastProvider, useToast, useToastContext } from './Toast';
export { default as Modal, ConfirmDialog } from './Modal';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar, SkeletonButton } from './Skeleton';

// Form Components
export { Input, Textarea, Select, Checkbox } from './Form';

// Button Components
export { Button, IconButton, ButtonGroup } from './Button';

// UI Components - from ui/ subfolder
export { 
  // Avatar
  Avatar, 
  AvatarGroup,
  // Badge
  Badge, 
  VerifiedBadge, 
  PremiumBadge, 
  NewBadge, 
  FeaturedBadge, 
  RAPBadge, 
  StatusBadge, 
  CountBadge,
  // Card
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter, 
  FeatureCard, 
  StatsCard,
  // Progress
  Progress, 
  CircularProgress, 
  StepProgress,
  // Alert
  Alert, 
  InlineAlert, 
  BannerAlert,
  // Tabs
  Tabs, 
  TabPanels, 
  TabPanel, 
  VerticalTabs,
  // Dropdown
  Dropdown, 
  DropdownItem, 
  DropdownDivider, 
  DropdownLabel, 
  ActionMenu, 
  SelectDropdown,
  // Input enhancements
  SearchInput, 
  FormGroup, 
  FormLabel, 
  PasswordInput,
  // Empty States
  EmptyState,
  NoJobs,
  NoApplications,
  NoMessages,
  NoNotifications,
  NoCourses,
  NoSearchResults,
  NoMentors,
  NoEvents,
  // Breadcrumbs
  Breadcrumbs,
  PageHeader,
  HomeBreadcrumb,
  DashboardBreadcrumb,
  BackButton,
  // Tooltip
  Tooltip,
  Popover,
  // Spinners
  Spinner,
  LoadingSpinner,
  PageSpinner,
  OverlaySpinner,
  ButtonSpinner,
  DotsSpinner,
  PulseSpinner,
  // Dialogs
  AlertDialog,
  DeleteConfirm,
  UnsavedChangesConfirm,
  // Animated Stats
  AnimatedCounter,
  StatCard,
  StatsGrid,
  MetricRow,
  ProgressStat,
  // DataTable
  DataTable,
  // FileUpload
  FileUpload,
  AvatarUpload,
  // Skip Links (Accessibility)
  SkipLinks,
  MainContent,
  NavigationLandmark,
  SearchLandmark,
  Section,
  // Notification Bell
  NotificationBell,
  NotificationBadge,
  NotificationDot,
  // Skeleton Variants
  ProfileCardSkeleton,
  CourseCardSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  StatsCardSkeleton,
  MessageSkeleton,
  ChatSkeleton,
  NotificationSkeleton,
  MentorCardSkeleton,
  EventCardSkeleton,
  FormSkeleton,
  SidebarSkeleton,
  ArticleSkeleton,
  SkeletonList,
} from './ui';

// Feature Components
export { default as FeaturedJobs } from './FeaturedJobs';
export { JobCard, JobList } from './JobCard';
export type { JobData } from './JobCard';
export { NotificationDropdown } from './NotificationDropdown';
export type { Notification } from './NotificationDropdown';
export { SearchBar, GlobalSearch } from './SearchBar';
export { 
  LoadingStates,
  PageLoading,
  DashboardLoading,
  JobGridLoading,
  JobListLoading,
  ProfileLoading,
  TableLoading,
  ChatLoading,
  FormLoading,
  ContentLoading,
} from './LoadingStates';

// Theme Provider
export { 
  ThemeProvider, 
  useTheme, 
  ThemeToggle, 
  ThemeSelector 
} from './ThemeProvider';
export type { ThemeMode, ResolvedTheme } from './ThemeProvider';

// Community Components
export { default as CommunityEvents } from './community/CommunityEvents';
export { default as CommunityForums } from './community/CommunityForums';
export { default as ResourceLibrary } from './community/ResourceLibrary';
export { default as SuccessStories } from './community/SuccessStories';

// Employer Components
export { default as ApplicantTracker } from './employer/ApplicantTracker';
export { default as InterviewScheduler } from './employer/InterviewScheduler';
export { default as OfferManagement } from './employer/OfferManagement';
export { default as JobPostingEditor } from './employer/JobPostingEditor';

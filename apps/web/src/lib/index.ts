/**
 * Web App Library - Central Exports
 * 
 * Re-exports all utility modules for convenient importing
 */

// API Client
export * from './api';
export { default as api } from './api';

// Analytics
export * from './analytics';
export { default as analytics } from './analytics';

// Configuration
export * from './config';
export { default as config } from './config';

// Formatters
export * from './formatters';
export { default as formatters } from './formatters';

// Validators
export * from './validators';
export { default as validators } from './validators';

// i18n
export * from './i18n';

// Re-export commonly used utilities for convenience
export {
  // API
  jobsApi,
  applicationsApi,
  mentorshipApi,
  coursesApi,
  userApi,
} from './api';

export {
  // Formatters
  formatDate,
  formatRelativeTime,
  formatCurrency,
  formatSalaryRange,
  formatNumber,
  formatPercentage,
  formatPhoneNumber,
  formatFileSize,
  formatDuration,
  truncate,
  pluralize,
  formatList,
  capitalize,
  toTitleCase,
  getInitials,
} from './formatters';

export {
  // Validators
  isValidEmail,
  checkPasswordStrength,
  isValidAustralianPhone,
  isValidUrl,
  isValidABN,
  isValidACN,
  isValidAustralianPostcode,
  isValidTFN,
  isValidDate,
  isValidAge,
  isValidCreditCard,
  isValidFileType,
  isValidFileSize,
  isRequired,
  isValidLength,
  validateField,
  validateForm,
} from './validators';

export {
  // Analytics
  track,
  identify,
  reset,
  trackPageView,
  initAnalytics,
} from './analytics';

// Storage utilities
export * from './storage';

// Error reporting
export * from './errorReporting';

// Test utilities (conditionally exported)
export * from './testUtils';

// Debug utilities
export * from './debug';

// Accessibility utilities
export * from './accessibility';

// Form helpers - use formHelpers as default export to avoid conflicts
export { default as formHelpers, rules, transforms } from './formHelpers';
export type { FieldConfig, FormConfig, FormErrors, FormTouched } from './formHelpers';

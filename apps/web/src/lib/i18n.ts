/**
 * Internationalization (i18n) Configuration
 * 
 * Provides translation support for multiple languages.
 */

export type Locale = 'en' | 'en-AU';

export interface TranslationKeys {
  // Common
  'common.loading': string;
  'common.error': string;
  'common.success': string;
  'common.cancel': string;
  'common.save': string;
  'common.delete': string;
  'common.edit': string;
  'common.view': string;
  'common.search': string;
  'common.filter': string;
  'common.clear': string;
  'common.submit': string;
  'common.back': string;
  'common.next': string;
  'common.previous': string;
  'common.close': string;
  'common.yes': string;
  'common.no': string;
  'common.all': string;
  'common.none': string;
  'common.required': string;
  'common.optional': string;

  // Navigation
  'nav.home': string;
  'nav.jobs': string;
  'nav.mentorship': string;
  'nav.courses': string;
  'nav.dashboard': string;
  'nav.profile': string;
  'nav.settings': string;
  'nav.logout': string;
  'nav.login': string;
  'nav.register': string;

  // Auth
  'auth.login': string;
  'auth.register': string;
  'auth.logout': string;
  'auth.email': string;
  'auth.password': string;
  'auth.confirmPassword': string;
  'auth.forgotPassword': string;
  'auth.resetPassword': string;
  'auth.rememberMe': string;
  'auth.noAccount': string;
  'auth.hasAccount': string;
  'auth.termsAccept': string;
  'auth.loginSuccess': string;
  'auth.logoutSuccess': string;
  'auth.invalidCredentials': string;
  'auth.emailRequired': string;
  'auth.passwordRequired': string;
  'auth.passwordTooShort': string;
  'auth.passwordRequirements': string;

  // Jobs
  'jobs.title': string;
  'jobs.search': string;
  'jobs.noResults': string;
  'jobs.filters': string;
  'jobs.location': string;
  'jobs.type': string;
  'jobs.salary': string;
  'jobs.applyNow': string;
  'jobs.applied': string;
  'jobs.saved': string;
  'jobs.share': string;
  'jobs.postedAt': string;
  'jobs.closingDate': string;
  'jobs.description': string;
  'jobs.requirements': string;
  'jobs.benefits': string;
  'jobs.aboutCompany': string;
  'jobs.fullTime': string;
  'jobs.partTime': string;
  'jobs.contract': string;
  'jobs.casual': string;
  'jobs.apprenticeship': string;
  'jobs.traineeship': string;
  'jobs.remote': string;
  'jobs.hybrid': string;
  'jobs.onsite': string;

  // Applications
  'applications.title': string;
  'applications.status': string;
  'applications.submitted': string;
  'applications.viewed': string;
  'applications.shortlisted': string;
  'applications.interview': string;
  'applications.offered': string;
  'applications.hired': string;
  'applications.rejected': string;
  'applications.withdrawn': string;
  'applications.coverLetter': string;
  'applications.resume': string;
  'applications.withdraw': string;

  // Mentorship
  'mentorship.title': string;
  'mentorship.findMentor': string;
  'mentorship.bookSession': string;
  'mentorship.mySessions': string;
  'mentorship.expertise': string;
  'mentorship.availability': string;
  'mentorship.rating': string;
  'mentorship.bio': string;
  'mentorship.sessionBooked': string;
  'mentorship.sessionCancelled': string;

  // Profile
  'profile.title': string;
  'profile.edit': string;
  'profile.name': string;
  'profile.email': string;
  'profile.phone': string;
  'profile.location': string;
  'profile.bio': string;
  'profile.skills': string;
  'profile.experience': string;
  'profile.education': string;
  'profile.updateSuccess': string;

  // Errors
  'error.generic': string;
  'error.notFound': string;
  'error.unauthorized': string;
  'error.forbidden': string;
  'error.serverError': string;
  'error.networkError': string;
  'error.validationError': string;
  'error.sessionExpired': string;
  'error.tryAgain': string;
}

// English (Default/US)
const en: TranslationKeys = {
  // Common
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.view': 'View',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.clear': 'Clear',
  'common.submit': 'Submit',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.previous': 'Previous',
  'common.close': 'Close',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.all': 'All',
  'common.none': 'None',
  'common.required': 'Required',
  'common.optional': 'Optional',

  // Navigation
  'nav.home': 'Home',
  'nav.jobs': 'Jobs',
  'nav.mentorship': 'Mentorship',
  'nav.courses': 'Courses',
  'nav.dashboard': 'Dashboard',
  'nav.profile': 'Profile',
  'nav.settings': 'Settings',
  'nav.logout': 'Log out',
  'nav.login': 'Log in',
  'nav.register': 'Sign up',

  // Auth
  'auth.login': 'Log in',
  'auth.register': 'Create account',
  'auth.logout': 'Log out',
  'auth.email': 'Email address',
  'auth.password': 'Password',
  'auth.confirmPassword': 'Confirm password',
  'auth.forgotPassword': 'Forgot password?',
  'auth.resetPassword': 'Reset password',
  'auth.rememberMe': 'Remember me',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',
  'auth.termsAccept': 'I accept the terms and conditions',
  'auth.loginSuccess': 'Welcome back!',
  'auth.logoutSuccess': 'You have been logged out',
  'auth.invalidCredentials': 'Invalid email or password',
  'auth.emailRequired': 'Email is required',
  'auth.passwordRequired': 'Password is required',
  'auth.passwordTooShort': 'Password must be at least 8 characters',
  'auth.passwordRequirements': 'Password must contain uppercase, lowercase, and a number',

  // Jobs
  'jobs.title': 'Jobs',
  'jobs.search': 'Search jobs...',
  'jobs.noResults': 'No jobs found',
  'jobs.filters': 'Filters',
  'jobs.location': 'Location',
  'jobs.type': 'Job type',
  'jobs.salary': 'Salary',
  'jobs.applyNow': 'Apply now',
  'jobs.applied': 'Applied',
  'jobs.saved': 'Saved',
  'jobs.share': 'Share',
  'jobs.postedAt': 'Posted',
  'jobs.closingDate': 'Closes',
  'jobs.description': 'Description',
  'jobs.requirements': 'Requirements',
  'jobs.benefits': 'Benefits',
  'jobs.aboutCompany': 'About the company',
  'jobs.fullTime': 'Full-time',
  'jobs.partTime': 'Part-time',
  'jobs.contract': 'Contract',
  'jobs.casual': 'Casual',
  'jobs.apprenticeship': 'Apprenticeship',
  'jobs.traineeship': 'Traineeship',
  'jobs.remote': 'Remote',
  'jobs.hybrid': 'Hybrid',
  'jobs.onsite': 'On-site',

  // Applications
  'applications.title': 'Applications',
  'applications.status': 'Status',
  'applications.submitted': 'Submitted',
  'applications.viewed': 'Viewed',
  'applications.shortlisted': 'Shortlisted',
  'applications.interview': 'Interview',
  'applications.offered': 'Offered',
  'applications.hired': 'Hired',
  'applications.rejected': 'Rejected',
  'applications.withdrawn': 'Withdrawn',
  'applications.coverLetter': 'Cover letter',
  'applications.resume': 'Resume',
  'applications.withdraw': 'Withdraw application',

  // Mentorship
  'mentorship.title': 'Mentorship',
  'mentorship.findMentor': 'Find a mentor',
  'mentorship.bookSession': 'Book session',
  'mentorship.mySessions': 'My sessions',
  'mentorship.expertise': 'Expertise',
  'mentorship.availability': 'Availability',
  'mentorship.rating': 'Rating',
  'mentorship.bio': 'About',
  'mentorship.sessionBooked': 'Session booked successfully',
  'mentorship.sessionCancelled': 'Session cancelled',

  // Profile
  'profile.title': 'Profile',
  'profile.edit': 'Edit profile',
  'profile.name': 'Full name',
  'profile.email': 'Email',
  'profile.phone': 'Phone number',
  'profile.location': 'Location',
  'profile.bio': 'About me',
  'profile.skills': 'Skills',
  'profile.experience': 'Experience',
  'profile.education': 'Education',
  'profile.updateSuccess': 'Profile updated successfully',

  // Errors
  'error.generic': 'Something went wrong',
  'error.notFound': 'Page not found',
  'error.unauthorized': 'Please log in to continue',
  'error.forbidden': 'Access denied',
  'error.serverError': 'Server error. Please try again later.',
  'error.networkError': 'Network error. Please check your connection.',
  'error.validationError': 'Please check your input',
  'error.sessionExpired': 'Your session has expired. Please log in again.',
  'error.tryAgain': 'Please try again',
};

// Australian English (same as default for now, but can add localizations)
const enAU: TranslationKeys = {
  ...en,
  // Australian-specific overrides can go here
  // e.g., 'jobs.apprenticeship': 'Apprenticeship' is already correct
};

// All translations
const translations: Record<Locale, TranslationKeys> = {
  en,
  'en-AU': enAU,
};

// Current locale
let currentLocale: Locale = 'en-AU';

/**
 * Set the current locale
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/**
 * Get the current locale
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Get a translated string
 */
export function t(key: keyof TranslationKeys, params?: Record<string, string | number>): string {
  let value = translations[currentLocale]?.[key] || translations.en[key] || key;
  
  // Replace parameters
  if (params) {
    Object.entries(params).forEach(([param, val]) => {
      value = value.replace(new RegExp(`{${param}}`, 'g'), String(val));
    });
  }
  
  return value;
}

/**
 * Get all available locales
 */
export function getAvailableLocales(): Locale[] {
  return Object.keys(translations) as Locale[];
}

const i18nUtils = { t, setLocale, getLocale, getAvailableLocales };

export default i18nUtils;

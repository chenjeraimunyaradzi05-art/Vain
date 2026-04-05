/**
 * Internationalization (i18n) Utilities
 * 
 * Provides localization support for the platform with:
 * - Australian English as default
 * - Support for Aboriginal language acknowledgments
 * - Date/time formatting for Australian timezone
 */

const DEFAULT_LOCALE = 'en-AU';
const DEFAULT_TIMEZONE = 'Australia/Sydney';

/**
 * Available locales
 */
const LOCALES = {
  'en-AU': {
    name: 'English (Australia)',
    native: 'English (Australia)',
    direction: 'ltr',
  },
};

/**
 * Common translations
 */
const translations = {
  'en-AU': {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Try again',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.more': 'More',
    'common.less': 'Less',
    
    // Auth
    'auth.login': 'Log in',
    'auth.logout': 'Log out',
    'auth.register': 'Sign up',
    'auth.forgotPassword': 'Forgot password?',
    'auth.resetPassword': 'Reset password',
    'auth.email': 'Email address',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm password',
    
    // Navigation
    'nav.home': 'Home',
    'nav.jobs': 'Jobs',
    'nav.courses': 'Training',
    'nav.mentorship': 'Mentorship',
    'nav.community': 'Community',
    'nav.messages': 'Messages',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    
    // Jobs
    'jobs.search': 'Search jobs',
    'jobs.apply': 'Apply now',
    'jobs.applied': 'Applied',
    'jobs.saved': 'Saved',
    'jobs.save': 'Save job',
    'jobs.share': 'Share job',
    'jobs.fullTime': 'Full-time',
    'jobs.partTime': 'Part-time',
    'jobs.casual': 'Casual',
    'jobs.contract': 'Contract',
    'jobs.remote': 'Remote',
    'jobs.onsite': 'On-site',
    'jobs.hybrid': 'Hybrid',
    
    // Profile
    'profile.skills': 'Skills',
    'profile.experience': 'Experience',
    'profile.education': 'Education',
    'profile.resume': 'Resume',
    'profile.portfolio': 'Portfolio',
    'profile.updatePhoto': 'Update photo',
    
    // Mentorship
    'mentor.findMentor': 'Find a mentor',
    'mentor.becomeMentor': 'Become a mentor',
    'mentor.bookSession': 'Book session',
    'mentor.cancelSession': 'Cancel session',
    'mentor.reschedule': 'Reschedule',
    
    // Status messages
    'status.success': 'Success!',
    'status.error': 'Error',
    'status.pending': 'Pending',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',
    'status.inReview': 'In review',
    
    // Accessibility
    'a11y.skipToContent': 'Skip to main content',
    'a11y.openMenu': 'Open menu',
    'a11y.closeMenu': 'Close menu',
    'a11y.loading': 'Content is loading',
    'a11y.newPage': 'Opens in a new tab',
    
    // Indigenous acknowledgment
    'acknowledgment.short': 'We acknowledge the Traditional Custodians of the land.',
    'acknowledgment.full': 'Ngurra Pathways acknowledges the Traditional Custodians of the lands on which we work and live. We pay our respects to Elders past, present and emerging.',
    
    // Time
    'time.justNow': 'Just now',
    'time.minutesAgo': '{count} {count, plural, one {minute} other {minutes}} ago',
    'time.hoursAgo': '{count} {count, plural, one {hour} other {hours}} ago',
    'time.daysAgo': '{count} {count, plural, one {day} other {days}} ago',
    'time.weeksAgo': '{count} {count, plural, one {week} other {weeks}} ago',
    
    // Errors
    'error.network': 'Unable to connect. Please check your internet connection.',
    'error.notFound': 'The page you\'re looking for doesn\'t exist.',
    'error.unauthorized': 'Please log in to continue.',
    'error.forbidden': 'You don\'t have permission to access this.',
    'error.serverError': 'Something went wrong on our end. Please try again later.',
  },
};

/**
 * Get translation
 */
function t(key, params = {}, locale = DEFAULT_LOCALE) {
  const localeTranslations = translations[locale] || translations[DEFAULT_LOCALE];
  let text = localeTranslations[key] || key;
  
  // Replace parameters
  for (const [param, value] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
    
    // Handle pluralization
    const pluralRegex = new RegExp(`\\{${param}, plural, one \\{([^}]+)\\} other \\{([^}]+)\\}\\}`, 'g');
    text = text.replace(pluralRegex, (_, one, other) => {
      return value === 1 ? one : other;
    });
  }
  
  return text;
}

/**
 * Format date for Australian locale
 */
function formatDate(date, options = {}) {
  const d = new Date(date);
  
  const defaultOptions = {
    timeZone: DEFAULT_TIMEZONE,
    ...options,
  };
  
  return d.toLocaleDateString(DEFAULT_LOCALE, defaultOptions);
}

/**
 * Format date and time
 */
function formatDateTime(date, options = {}) {
  const d = new Date(date);
  
  const defaultOptions = {
    timeZone: DEFAULT_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  };
  
  return d.toLocaleString(DEFAULT_LOCALE, defaultOptions as Intl.DateTimeFormatOptions);
}

/**
 * Format time
 */
function formatTime(date, options = {}) {
  const d = new Date(date);
  
  const defaultOptions = {
    timeZone: DEFAULT_TIMEZONE,
    timeStyle: 'short',
    ...options,
  };
  
  return d.toLocaleTimeString(DEFAULT_LOCALE, defaultOptions as Intl.DateTimeFormatOptions);
}

/**
 * Format relative time
 */
function formatRelativeTime(date, locale = DEFAULT_LOCALE) {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  
  if (seconds < 60) {
    return t('time.justNow', {}, locale);
  } else if (minutes < 60) {
    return t('time.minutesAgo', { count: minutes }, locale);
  } else if (hours < 24) {
    return t('time.hoursAgo', { count: hours }, locale);
  } else if (days < 7) {
    return t('time.daysAgo', { count: days }, locale);
  } else {
    return t('time.weeksAgo', { count: weeks }, locale);
  }
}

/**
 * Format currency (Australian Dollar)
 */
function formatCurrency(amount, currency = 'AUD') {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number
 */
function formatNumber(number, options = {}) {
  return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(number);
}

/**
 * Format phone number (Australian format)
 */
function formatPhoneNumber(phone) {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Australian mobile: 0412 345 678
  if (digits.length === 10 && digits.startsWith('04')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  
  // Australian landline: (02) 1234 5678
  if (digits.length === 10 && digits.startsWith('0')) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  
  // International format: +61 412 345 678
  if (digits.length === 11 && digits.startsWith('61')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  
  return phone;
}

/**
 * Get Australian states/territories
 */
function getStates() {
  return [
    { code: 'NSW', name: 'New South Wales' },
    { code: 'VIC', name: 'Victoria' },
    { code: 'QLD', name: 'Queensland' },
    { code: 'WA', name: 'Western Australia' },
    { code: 'SA', name: 'South Australia' },
    { code: 'TAS', name: 'Tasmania' },
    { code: 'ACT', name: 'Australian Capital Territory' },
    { code: 'NT', name: 'Northern Territory' },
  ];
}

/**
 * I18n context for React (to be used with React Context)
 */
function createI18nContext(initialLocale = DEFAULT_LOCALE) {
  return {
    locale: initialLocale,
    t: (key, params) => t(key, params, initialLocale),
    formatDate: (date, options) => formatDate(date, options),
    formatDateTime: (date, options) => formatDateTime(date, options),
    formatTime: (date, options) => formatTime(date, options),
    formatRelativeTime: (date) => formatRelativeTime(date, initialLocale),
    formatCurrency,
    formatNumber,
    formatPhoneNumber,
    getStates,
  };
}

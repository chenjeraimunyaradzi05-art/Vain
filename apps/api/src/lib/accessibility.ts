/**
 * Accessibility Enhancements
 * 
 * WCAG 2.2 AA Compliance Utilities
 * 
 * Features:
 * - Skip links generation
 * - Keyboard navigation helpers
 * - Focus management
 * - Screen reader announcements
 * - Color contrast validation
 * - Alt text suggestions
 * - ARIA utilities
 */

import { prisma } from './database';

type FocusTrapOptions = {
  initialFocus?: string;
  returnFocus?: boolean;
  escapeDeactivates?: boolean;
  clickOutsideDeactivates?: boolean;
  allowOutsideClick?: boolean;
  fallbackFocus?: string;
};

type FocusTrapConfig = {
  containerId: string;
  initialFocus: string;
  returnFocus: boolean;
  escapeDeactivates: boolean;
  clickOutsideDeactivates: boolean;
  allowOutsideClick: boolean;
  fallbackFocus: string;
  focusableSelectors: string;
};

type AriaPattern =
  | 'button'
  | 'link'
  | 'navigation'
  | 'search'
  | 'form'
  | 'input'
  | 'listbox'
  | 'option'
  | 'dialog'
  | 'alert'
  | 'status'
  | 'progressbar'
  | 'tab'
  | 'tabpanel'
  | 'tooltip'
  | 'menu'
  | 'menuitem';

type AriaOptions = {
  pressed?: boolean;
  expanded?: boolean;
  hasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  controls?: string;
  disabled?: boolean;
  role?: string;
  current?: string | boolean;
  describedBy?: string;
  label?: string;
  labelledBy?: string;
  invalid?: boolean;
  errorMessage?: string;
  required?: boolean;
  autocomplete?: string;
  activeDescendant?: string;
  multiselectable?: boolean;
  selected?: boolean;
  min?: number;
  max?: number;
  value?: number;
  valueText?: string;
  visible?: boolean;
  orientation?: 'vertical' | 'horizontal';
  focused?: boolean;
};

type ContrastCheckOptions = {
  textSize?: 'normal' | 'large' | 'uiComponent';
  level?: 'AA' | 'AAA';
};

// ============================================================================
// WCAG 2.2 COMPLIANCE CONFIGURATION
// ============================================================================

/**
 * WCAG 2.2 Success Criteria for AA compliance
 */
export const WCAG_CRITERIA = {
  // Perceivable
  '1.1.1': { level: 'A', name: 'Non-text Content', description: 'All non-text content has text alternatives' },
  '1.2.1': { level: 'A', name: 'Audio-only and Video-only', description: 'Alternatives for audio/video content' },
  '1.2.2': { level: 'A', name: 'Captions', description: 'Captions for audio content in synchronized media' },
  '1.2.3': { level: 'A', name: 'Audio Description', description: 'Audio description for video content' },
  '1.2.5': { level: 'AA', name: 'Audio Description (Prerecorded)', description: 'Audio description for all prerecorded video' },
  '1.3.1': { level: 'A', name: 'Info and Relationships', description: 'Information and relationships are programmatically determinable' },
  '1.3.2': { level: 'A', name: 'Meaningful Sequence', description: 'Reading order is logical and intuitive' },
  '1.3.3': { level: 'A', name: 'Sensory Characteristics', description: 'Instructions do not rely solely on sensory characteristics' },
  '1.3.4': { level: 'AA', name: 'Orientation', description: 'Content not restricted to single orientation' },
  '1.3.5': { level: 'AA', name: 'Identify Input Purpose', description: 'Form inputs have programmatic purpose' },
  '1.4.1': { level: 'A', name: 'Use of Color', description: 'Color is not sole means of conveying information' },
  '1.4.2': { level: 'A', name: 'Audio Control', description: 'Mechanism to pause/stop audio that auto-plays' },
  '1.4.3': { level: 'AA', name: 'Contrast (Minimum)', description: 'Text has 4.5:1 contrast ratio' },
  '1.4.4': { level: 'AA', name: 'Resize Text', description: 'Text can be resized to 200%' },
  '1.4.5': { level: 'AA', name: 'Images of Text', description: 'Text used instead of images of text' },
  '1.4.10': { level: 'AA', name: 'Reflow', description: 'Content can reflow without scrolling in two dimensions' },
  '1.4.11': { level: 'AA', name: 'Non-text Contrast', description: 'UI components have 3:1 contrast ratio' },
  '1.4.12': { level: 'AA', name: 'Text Spacing', description: 'No loss of content with modified text spacing' },
  '1.4.13': { level: 'AA', name: 'Content on Hover or Focus', description: 'Hover/focus content is dismissible, hoverable, persistent' },
  
  // Operable
  '2.1.1': { level: 'A', name: 'Keyboard', description: 'All functionality available from keyboard' },
  '2.1.2': { level: 'A', name: 'No Keyboard Trap', description: 'Keyboard focus can be moved away' },
  '2.1.4': { level: 'A', name: 'Character Key Shortcuts', description: 'Single character shortcuts can be turned off' },
  '2.2.1': { level: 'A', name: 'Timing Adjustable', description: 'Time limits can be adjusted' },
  '2.2.2': { level: 'A', name: 'Pause, Stop, Hide', description: 'Moving content can be paused' },
  '2.3.1': { level: 'A', name: 'Three Flashes', description: 'No content flashes more than 3 times per second' },
  '2.4.1': { level: 'A', name: 'Bypass Blocks', description: 'Skip navigation mechanism available' },
  '2.4.2': { level: 'A', name: 'Page Titled', description: 'Pages have descriptive titles' },
  '2.4.3': { level: 'A', name: 'Focus Order', description: 'Focus order preserves meaning' },
  '2.4.4': { level: 'A', name: 'Link Purpose (In Context)', description: 'Link purpose clear from context' },
  '2.4.5': { level: 'AA', name: 'Multiple Ways', description: 'More than one way to locate pages' },
  '2.4.6': { level: 'AA', name: 'Headings and Labels', description: 'Headings and labels are descriptive' },
  '2.4.7': { level: 'AA', name: 'Focus Visible', description: 'Keyboard focus is visible' },
  '2.4.11': { level: 'AA', name: 'Focus Not Obscured (Minimum)', description: 'Focused element not entirely hidden' },
  '2.5.1': { level: 'A', name: 'Pointer Gestures', description: 'Multi-point gestures have alternatives' },
  '2.5.2': { level: 'A', name: 'Pointer Cancellation', description: 'Actions can be aborted or undone' },
  '2.5.3': { level: 'A', name: 'Label in Name', description: 'Visual label in accessible name' },
  '2.5.4': { level: 'A', name: 'Motion Actuation', description: 'Motion actuation has alternatives' },
  '2.5.7': { level: 'AA', name: 'Dragging Movements', description: 'Dragging has single-pointer alternative' },
  '2.5.8': { level: 'AA', name: 'Target Size (Minimum)', description: 'Targets at least 24x24 CSS pixels' },
  
  // Understandable
  '3.1.1': { level: 'A', name: 'Language of Page', description: 'Page language programmatically determinable' },
  '3.1.2': { level: 'AA', name: 'Language of Parts', description: 'Language of parts programmatically determinable' },
  '3.2.1': { level: 'A', name: 'On Focus', description: 'Focus does not cause context change' },
  '3.2.2': { level: 'A', name: 'On Input', description: 'Input does not cause unexpected context change' },
  '3.2.3': { level: 'AA', name: 'Consistent Navigation', description: 'Navigation is consistent' },
  '3.2.4': { level: 'AA', name: 'Consistent Identification', description: 'Components identified consistently' },
  '3.2.6': { level: 'A', name: 'Consistent Help', description: 'Help mechanism in consistent location' },
  '3.3.1': { level: 'A', name: 'Error Identification', description: 'Errors are identified and described' },
  '3.3.2': { level: 'A', name: 'Labels or Instructions', description: 'Labels or instructions provided' },
  '3.3.3': { level: 'AA', name: 'Error Suggestion', description: 'Suggestions provided for errors' },
  '3.3.4': { level: 'AA', name: 'Error Prevention (Legal, Financial, Data)', description: 'Submissions are reversible/checked/confirmed' },
  '3.3.7': { level: 'A', name: 'Redundant Entry', description: 'Previously entered info is auto-populated' },
  '3.3.8': { level: 'AA', name: 'Accessible Authentication', description: 'Cognitive function test not required for auth' },
  
  // Robust
  '4.1.2': { level: 'A', name: 'Name, Role, Value', description: 'UI components have programmatic name and role' },
  '4.1.3': { level: 'AA', name: 'Status Messages', description: 'Status messages announced without focus' }
};

// ============================================================================
// SKIP LINKS
// ============================================================================

/**
 * Generate skip links configuration
 */
export function generateSkipLinks(pageType = 'default') {
  const baseLinks = [
    {
      id: 'main-content',
      label: 'Skip to main content',
      ariaLabel: 'Skip to main content',
      priority: 1
    },
    {
      id: 'navigation',
      label: 'Skip to navigation',
      ariaLabel: 'Skip to main navigation',
      priority: 2
    }
  ];

  const pageSpecificLinks = {
    jobSearch: [
      { id: 'search-form', label: 'Skip to search', ariaLabel: 'Skip to job search form', priority: 3 },
      { id: 'results', label: 'Skip to results', ariaLabel: 'Skip to search results', priority: 4 },
      { id: 'filters', label: 'Skip to filters', ariaLabel: 'Skip to search filters', priority: 5 }
    ],
    jobDetails: [
      { id: 'job-description', label: 'Skip to description', ariaLabel: 'Skip to job description', priority: 3 },
      { id: 'apply-form', label: 'Skip to application', ariaLabel: 'Skip to application form', priority: 4 }
    ],
    profile: [
      { id: 'profile-form', label: 'Skip to profile', ariaLabel: 'Skip to profile form', priority: 3 },
      { id: 'skills-section', label: 'Skip to skills', ariaLabel: 'Skip to skills section', priority: 4 }
    ],
    messages: [
      { id: 'conversation-list', label: 'Skip to conversations', ariaLabel: 'Skip to conversation list', priority: 3 },
      { id: 'message-input', label: 'Skip to compose', ariaLabel: 'Skip to message input', priority: 4 }
    ]
  };

  const additionalLinks = pageSpecificLinks[pageType] || [];
  
  return [...baseLinks, ...additionalLinks]
    .sort((a, b) => a.priority - b.priority)
    .map(link => ({
      ...link,
      href: `#${link.id}`,
      css: 'skip-link'
    }));
}

/**
 * Get skip link CSS (for injection)
 */
export function getSkipLinkCSS() {
  return `
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: #000;
      color: #fff;
      padding: 8px 16px;
      z-index: 9999;
      text-decoration: none;
      font-weight: 600;
      transition: top 0.3s ease;
    }
    
    .skip-link:focus {
      top: 0;
      outline: 2px solid #fff;
      outline-offset: 2px;
    }
    
    .skip-link:focus-visible {
      top: 0;
    }
  `;
}

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

/**
 * Keyboard navigation patterns
 */
export const KEYBOARD_PATTERNS = {
  // Menu navigation
  menu: {
    description: 'Menu navigation',
    keys: {
      ArrowDown: 'Move to next item',
      ArrowUp: 'Move to previous item',
      ArrowRight: 'Open submenu',
      ArrowLeft: 'Close submenu',
      Enter: 'Activate item',
      Space: 'Activate item',
      Escape: 'Close menu',
      Home: 'Move to first item',
      End: 'Move to last item'
    }
  },
  
  // Tab navigation
  tabs: {
    description: 'Tab navigation',
    keys: {
      ArrowLeft: 'Previous tab',
      ArrowRight: 'Next tab',
      Home: 'First tab',
      End: 'Last tab',
      Enter: 'Activate tab',
      Space: 'Activate tab'
    }
  },
  
  // Dialog/Modal
  dialog: {
    description: 'Dialog navigation',
    keys: {
      Tab: 'Move focus within dialog',
      'Shift+Tab': 'Move focus backward',
      Escape: 'Close dialog'
    }
  },
  
  // Listbox/Combobox
  listbox: {
    description: 'Listbox navigation',
    keys: {
      ArrowDown: 'Next option',
      ArrowUp: 'Previous option',
      Enter: 'Select option',
      Space: 'Select option',
      Home: 'First option',
      End: 'Last option',
      'Type character': 'Jump to matching option'
    }
  },
  
  // Grid/Table
  grid: {
    description: 'Grid navigation',
    keys: {
      ArrowDown: 'Move down one cell',
      ArrowUp: 'Move up one cell',
      ArrowRight: 'Move right one cell',
      ArrowLeft: 'Move left one cell',
      'Ctrl+Home': 'First cell',
      'Ctrl+End': 'Last cell'
    }
  },
  
  // Slider
  slider: {
    description: 'Slider navigation',
    keys: {
      ArrowRight: 'Increase by one step',
      ArrowUp: 'Increase by one step',
      ArrowLeft: 'Decrease by one step',
      ArrowDown: 'Decrease by one step',
      PageUp: 'Increase by large step',
      PageDown: 'Decrease by large step',
      Home: 'Minimum value',
      End: 'Maximum value'
    }
  }
};

/**
 * Get keyboard shortcut help for screen reader
 */
export function getKeyboardShortcutHelp() {
  return {
    global: [
      { keys: ['Alt', 'S'], action: 'Open search' },
      { keys: ['Alt', 'N'], action: 'View notifications' },
      { keys: ['Alt', 'P'], action: 'Go to profile' },
      { keys: ['Alt', 'H'], action: 'Go to home' },
      { keys: ['Alt', 'M'], action: 'Open messages' },
      { keys: ['?'], action: 'Show keyboard shortcuts' },
      { keys: ['Escape'], action: 'Close current dialog/menu' }
    ],
    jobSearch: [
      { keys: ['/', 'Ctrl', 'K'], action: 'Focus search input' },
      { keys: ['F'], action: 'Open filters panel' },
      { keys: ['J'], action: 'Next job result' },
      { keys: ['K'], action: 'Previous job result' },
      { keys: ['Enter'], action: 'View job details' },
      { keys: ['S'], action: 'Save/bookmark job' }
    ],
    messaging: [
      { keys: ['N'], action: 'New message' },
      { keys: ['R'], action: 'Reply to message' },
      { keys: ['A'], action: 'Archive conversation' },
      { keys: ['Ctrl', 'Enter'], action: 'Send message' }
    ]
  };
}

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

/**
 * Focus trap configuration for modals/dialogs
 */
export function createFocusTrapConfig(containerId: string, options: FocusTrapOptions = {}): FocusTrapConfig {
  return {
    containerId,
    initialFocus: options.initialFocus || 'first-focusable',
    returnFocus: options.returnFocus !== false,
    escapeDeactivates: options.escapeDeactivates !== false,
    clickOutsideDeactivates: options.clickOutsideDeactivates || false,
    allowOutsideClick: options.allowOutsideClick || false,
    fallbackFocus: options.fallbackFocus || containerId,
    
    // Selectors for focusable elements
    focusableSelectors: [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ')
  };
}

/**
 * Get focus indicator styles
 */
export function getFocusIndicatorStyles() {
  return {
    // Visible focus ring
    focusVisible: {
      outline: '2px solid #2563eb',
      outlineOffset: '2px',
      borderRadius: '2px'
    },
    
    // High contrast focus ring
    highContrast: {
      outline: '3px solid #000',
      outlineOffset: '2px',
      boxShadow: '0 0 0 5px #fff, 0 0 0 8px #000'
    },
    
    // Focus within container
    focusWithin: {
      outline: '2px solid #2563eb',
      outlineOffset: '4px'
    }
  };
}

/**
 * Get recommended focus order for page type
 */
export function getRecommendedFocusOrder(pageType) {
  const orders = {
    jobListing: [
      'skip-links',
      'logo',
      'navigation',
      'search-input',
      'filter-toggles',
      'job-cards',
      'pagination',
      'footer-links'
    ],
    form: [
      'skip-links',
      'form-title',
      'required-fields-notice',
      'form-fields',
      'submit-button',
      'cancel-link'
    ],
    modal: [
      'close-button',
      'modal-title',
      'modal-content',
      'modal-actions'
    ]
  };

  return orders[pageType] || orders.form;
}

// ============================================================================
// SCREEN READER ANNOUNCEMENTS
// ============================================================================

/**
 * ARIA live region types
 */
export const LIVE_REGION_TYPES = {
  polite: {
    ariaLive: 'polite',
    ariaAtomic: 'true',
    role: 'status',
    description: 'Announces when user is idle'
  },
  assertive: {
    ariaLive: 'assertive',
    ariaAtomic: 'true',
    role: 'alert',
    description: 'Announces immediately, interrupting current speech'
  },
  log: {
    ariaLive: 'polite',
    ariaAtomic: 'false',
    role: 'log',
    description: 'Announces additions without repeating entire content'
  }
};

/**
 * Generate announcement message templates
 */
export const ANNOUNCEMENT_TEMPLATES = {
  // Search results
  searchResults: (count) => 
    count === 0 
      ? 'No results found. Try adjusting your search criteria.'
      : `Found ${count} ${count === 1 ? 'result' : 'results'}`,
  
  // Form validation
  formError: (fieldName, error) => 
    `Error in ${fieldName}: ${error}`,
  
  formSuccess: (action) => 
    `${action} completed successfully`,
  
  // Loading states
  loadingStarted: (what) => 
    `Loading ${what}`,
  
  loadingComplete: (what) => 
    `${what} loaded`,
  
  // Navigation
  pageChanged: (title) => 
    `Navigated to ${title}`,
  
  // Job application
  applicationSubmitted: (jobTitle) => 
    `Application submitted for ${jobTitle}`,
  
  applicationSaved: () => 
    'Application progress saved',
  
  // Messaging
  newMessage: (sender) => 
    `New message from ${sender}`,
  
  messageSent: () => 
    'Message sent',
  
  // Profile updates
  profileUpdated: (section) => 
    `${section} updated successfully`,
  
  // Authentication
  loggedIn: (name) => 
    `Welcome back, ${name}`,
  
  loggedOut: () => 
    'You have been logged out',
  
  // Generic actions
  itemAdded: (item) => 
    `${item} added`,
  
  itemRemoved: (item) => 
    `${item} removed`,
  
  itemSaved: (item) => 
    `${item} saved`
};

/**
 * Get ARIA attributes for common patterns
 */
export function getAriaAttributes(pattern: AriaPattern, options: AriaOptions = {}): Record<string, string | number | boolean> {
  const patterns: Record<AriaPattern, Record<string, unknown>> = {
    button: {
      role: 'button',
      'aria-pressed': options.pressed,
      'aria-expanded': options.expanded,
      'aria-haspopup': options.hasPopup,
      'aria-controls': options.controls,
      'aria-disabled': options.disabled
    },
    
    link: {
      role: options.role || undefined, // Native links don't need role
      'aria-current': options.current,
      'aria-describedby': options.describedBy
    },
    
    navigation: {
      role: 'navigation',
      'aria-label': options.label || 'Main navigation'
    },
    
    search: {
      role: 'search',
      'aria-label': options.label || 'Site search'
    },
    
    form: {
      role: options.role,
      'aria-labelledby': options.labelledBy,
      'aria-describedby': options.describedBy,
      'aria-invalid': options.invalid,
      'aria-errormessage': options.errorMessage
    },
    
    input: {
      'aria-required': options.required,
      'aria-invalid': options.invalid,
      'aria-describedby': options.describedBy,
      'aria-errormessage': options.errorMessage,
      'aria-autocomplete': options.autocomplete
    },
    
    listbox: {
      role: 'listbox',
      'aria-label': options.label,
      'aria-activedescendant': options.activeDescendant,
      'aria-multiselectable': options.multiselectable
    },
    
    option: {
      role: 'option',
      'aria-selected': options.selected,
      'aria-disabled': options.disabled
    },
    
    dialog: {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': options.labelledBy,
      'aria-describedby': options.describedBy
    },
    
    alert: {
      role: 'alert',
      'aria-live': 'assertive',
      'aria-atomic': 'true'
    },
    
    status: {
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true'
    },
    
    progressbar: {
      role: 'progressbar',
      'aria-valuemin': options.min || 0,
      'aria-valuemax': options.max || 100,
      'aria-valuenow': options.value,
      'aria-valuetext': options.valueText,
      'aria-label': options.label
    },
    
    tab: {
      role: 'tab',
      'aria-selected': options.selected,
      'aria-controls': options.controls,
      tabindex: options.selected ? 0 : -1
    },
    
    tabpanel: {
      role: 'tabpanel',
      'aria-labelledby': options.labelledBy,
      tabindex: 0
    },
    
    tooltip: {
      role: 'tooltip',
      'aria-hidden': !options.visible
    },
    
    menu: {
      role: 'menu',
      'aria-label': options.label,
      'aria-orientation': options.orientation || 'vertical'
    },
    
    menuitem: {
      role: 'menuitem',
      'aria-disabled': options.disabled,
      tabindex: options.focused ? 0 : -1
    }
  };

  // Filter out undefined values
  const attrs = patterns[pattern] || {};
  return Object.fromEntries(
    Object.entries(attrs).filter(([, value]) => value !== undefined)
  ) as Record<string, string | number | boolean>;
}

// ============================================================================
// COLOR CONTRAST
// ============================================================================

/**
 * Calculate relative luminance of a color
 */
export function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(channel => {
    const sRGB = channel / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(foreground, background) {
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG requirements
 */
export function checkContrast(foreground: string, background: string, options: ContrastCheckOptions = {}) {
  const ratio = getContrastRatio(foreground, background);
  const textSize = options.textSize || 'normal';
  const level = options.level || 'AA';

  const requirements = {
    AA: {
      normal: 4.5,
      large: 3,
      uiComponent: 3
    },
    AAA: {
      normal: 7,
      large: 4.5,
      uiComponent: 4.5
    }
  };

  const required = requirements[level]?.[textSize] || 4.5;
  const passes = ratio >= required;

  return {
    ratio: Math.round(ratio * 100) / 100,
    required,
    passes,
    level,
    textSize,
    recommendation: passes 
      ? null 
      : suggestAccessibleColor(foreground, background, required)
  };
}

/**
 * Suggest accessible color alternatives
 */
function suggestAccessibleColor(foreground, background, targetRatio) {
  const bgLuminance = getLuminance(background);
  
  // Determine if we should go lighter or darker
  const needsLighter = bgLuminance < 0.5;
  
  // Calculate required luminance
  const targetLuminance = needsLighter
    ? (bgLuminance + 0.05) * targetRatio - 0.05
    : (bgLuminance + 0.05) / targetRatio - 0.05;

  // Clamp to valid range
  const clampedLuminance = Math.max(0, Math.min(1, targetLuminance));

  return {
    direction: needsLighter ? 'lighter' : 'darker',
    targetLuminance: clampedLuminance,
    suggestion: needsLighter 
      ? 'Try a lighter foreground color' 
      : 'Try a darker foreground color'
  };
}

/**
 * Ngurra Pathways color palette with contrast info
 */
export const ACCESSIBLE_COLORS = {
  primary: {
    default: '#8B4513',
    onWhite: { ratio: 4.68, passesAA: true },
    onBlack: { ratio: 4.5, passesAA: true }
  },
  secondary: {
    default: '#CD853F',
    onWhite: { ratio: 2.98, passesAA: false, useFor: 'largeText' },
    onBlack: { ratio: 7.05, passesAA: true }
  },
  accent: {
    default: '#D35400',
    onWhite: { ratio: 4.35, passesAA: false, useFor: 'largeText' },
    onBlack: { ratio: 4.83, passesAA: true }
  },
  text: {
    primary: '#1a1a1a',
    secondary: '#4a4a4a',
    muted: '#6a6a6a'
  },
  background: {
    default: '#ffffff',
    alt: '#f5f5f5',
    dark: '#2d2d2d'
  }
};

// ============================================================================
// ALT TEXT SUGGESTIONS
// ============================================================================

/**
 * Suggest alt text based on image context
 */
export function suggestAltText(imageContext) {
  const { type, fileName, pageContext, nearbyText } = imageContext;

  const suggestions = {
    profilePhoto: (name) => 
      `Profile photo of ${name || 'user'}`,
    
    companyLogo: (companyName) => 
      `${companyName || 'Company'} logo`,
    
    jobImage: (jobTitle, company) => 
      `${jobTitle || 'Job'} at ${company || 'company'}`,
    
    certificateBadge: (certName) => 
      `${certName || 'Certification'} badge`,
    
    decorative: () => '', // Empty alt for decorative images
    
    icon: (action) => 
      action || 'Icon', // Or use aria-label on parent button
    
    chart: (chartType, dataDescription) => 
      `${chartType || 'Chart'} showing ${dataDescription || 'data'}`,
    
    screenshot: (feature) => 
      `Screenshot of ${feature || 'application feature'}`,
    
    infographic: (topic) => 
      `Infographic about ${topic || 'topic'}. See text description below.`
  };

  const suggester = suggestions[type];
  if (!suggester) {
    // Generic suggestion based on filename
    const cleanName = fileName?.replace(/[-_]/g, ' ').replace(/\.\w+$/, '') || 'image';
    return `Image: ${cleanName}`;
  }

  return suggester(pageContext, nearbyText);
}

/**
 * Validate alt text quality
 */
export function validateAltText(altText: string | null | undefined, imageType: string) {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check for empty alt on non-decorative images
  if (!altText && imageType !== 'decorative') {
    issues.push('Missing alt text for non-decorative image');
  }

  // Check for placeholder text
  const placeholders = ['image', 'photo', 'picture', 'img', 'untitled'];
  if (placeholders.some(p => altText?.toLowerCase() === p)) {
    issues.push('Alt text appears to be placeholder text');
  }

  // Check for file extensions
  if (/\.(jpg|jpeg|png|gif|svg|webp)/i.test(altText || '')) {
    issues.push('Alt text should not contain file extension');
  }

  // Check for redundant phrases
  const redundant = ['image of', 'picture of', 'photo of', 'graphic of'];
  if (redundant.some(phrase => altText?.toLowerCase().startsWith(phrase))) {
    warnings.push('Consider removing "image of" - screen readers already announce it as an image');
  }

  // Check length
  if (altText && altText.length > 125) {
    warnings.push('Alt text is quite long. Consider using aria-describedby for detailed descriptions');
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
}

// ============================================================================
// ACCESSIBILITY AUDIT
// ============================================================================

/**
 * Run accessibility check on page content
 */
export async function runAccessibilityAudit(pageUrl, userId) {
  const auditId = `audit_${Date.now()}`;
  
  // Store audit record
  const audit = await prisma.accessibilityAudit.create({
    data: {
      id: auditId,
      pageUrl,
      userId,
      status: 'running',
      startedAt: new Date()
    }
  });

  // Return audit config for client-side execution
  return {
    auditId: audit.id,
    checks: [
      {
        id: 'color-contrast',
        name: 'Color Contrast',
        criteria: ['1.4.3', '1.4.11'],
        automated: true
      },
      {
        id: 'alt-text',
        name: 'Image Alt Text',
        criteria: ['1.1.1'],
        automated: true
      },
      {
        id: 'form-labels',
        name: 'Form Labels',
        criteria: ['1.3.1', '3.3.2'],
        automated: true
      },
      {
        id: 'heading-structure',
        name: 'Heading Structure',
        criteria: ['1.3.1', '2.4.6'],
        automated: true
      },
      {
        id: 'keyboard-nav',
        name: 'Keyboard Navigation',
        criteria: ['2.1.1', '2.1.2'],
        automated: false, // Requires manual testing
        instructions: 'Tab through all interactive elements'
      },
      {
        id: 'focus-visible',
        name: 'Focus Visibility',
        criteria: ['2.4.7'],
        automated: false,
        instructions: 'Check that focus indicator is visible on all elements'
      },
      {
        id: 'link-purpose',
        name: 'Link Purpose',
        criteria: ['2.4.4'],
        automated: true
      },
      {
        id: 'language',
        name: 'Page Language',
        criteria: ['3.1.1'],
        automated: true
      }
    ],
    wcagLevel: 'AA',
    wcagVersion: '2.2'
  };
}

/**
 * Submit audit results
 */
export async function submitAuditResults(auditId: string, results: any) {
  const issues: any[] = [];
  let score = 100;

  for (const check of results.checks) {
    if (!check.passed) {
      issues.push({
        checkId: check.id,
        criteria: check.criteria,
        severity: check.severity || 'moderate',
        element: check.element,
        message: check.message,
        suggestion: check.suggestion
      });

      // Deduct points based on severity
      const deduction = {
        critical: 20,
        serious: 10,
        moderate: 5,
        minor: 2
      };
      score -= deduction[check.severity] || 5;
    }
  }

  score = Math.max(0, score);

  await prisma.accessibilityAudit.update({
    where: { id: auditId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      score,
      issueCount: issues.length,
      issues: JSON.stringify(issues)
    }
  });

  return {
    auditId,
    score,
    issues,
    passedChecks: results.checks.filter(c => c.passed).length,
    totalChecks: results.checks.length,
    recommendation: score >= 90 
      ? 'Excellent accessibility!' 
      : score >= 70 
        ? 'Good, but some improvements needed' 
        : 'Significant accessibility issues found'
  };
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  // Configuration
  WCAG_CRITERIA,
  
  // Skip links
  generateSkipLinks,
  getSkipLinkCSS,
  
  // Keyboard
  KEYBOARD_PATTERNS,
  getKeyboardShortcutHelp,
  
  // Focus
  createFocusTrapConfig,
  getFocusIndicatorStyles,
  getRecommendedFocusOrder,
  
  // Screen reader
  LIVE_REGION_TYPES,
  ANNOUNCEMENT_TEMPLATES,
  getAriaAttributes,
  
  // Color contrast
  getLuminance,
  getContrastRatio,
  checkContrast,
  ACCESSIBLE_COLORS,
  
  // Alt text
  suggestAltText,
  validateAltText,
  
  // Audit
  runAccessibilityAudit,
  submitAuditResults
};

export {};

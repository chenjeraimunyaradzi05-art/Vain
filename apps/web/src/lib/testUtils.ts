/**
 * Testing Utilities for React Components
 * 
 * Provides helpers for testing React components with common providers
 */

import React, { ReactElement, ReactNode } from 'react';

// Type for mock functions when Jest types aren't available
type MockFn<T extends (...args: any[]) => any = (...args: any[]) => any> = T & {
  mockImplementation: (fn: T) => MockFn<T>;
  mockReturnValue: (value: ReturnType<T>) => MockFn<T>;
  mock: { calls: Parameters<T>[] };
};

// Declare jest global for environments without @types/jest
declare const jest: {
  fn: <T extends (...args: any[]) => any = (...args: any[]) => any>(implementation?: T) => MockFn<T>;
  spyOn: <T extends object, M extends keyof T>(object: T, method: M) => MockFn<any>;
};

// Mock types - in real usage, these would come from @testing-library/react
type RenderResult = {
  container: HTMLElement;
  debug: () => void;
  rerender: (ui: ReactElement) => void;
  unmount: () => void;
};

type RenderOptions = {
  wrapper?: React.ComponentType<{ children: ReactNode }>;
  container?: HTMLElement;
};

// Import these from your actual testing library in tests
// import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * Mock user for testing
 */
export const mockUser = {
  id: 'user_test123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'candidate' as const,
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Mock job for testing
 */
export const mockJob = {
  id: 'job_test123',
  title: 'Software Developer',
  description: 'A great job opportunity',
  company: 'Test Company',
  location: 'Sydney, NSW',
  type: 'full-time' as const,
  experienceLevel: 'mid' as const,
  salaryMin: 80000,
  salaryMax: 120000,
  skills: ['JavaScript', 'React', 'Node.js'],
  benefits: ['Health insurance', 'Flexible hours'],
  isActive: true,
  isRemote: true,
  isSovereigntyFocused: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Mock API responses
 */
export const mockApiResponses = {
  success: <T>(data: T) => ({
    ok: true,
    json: async () => data,
    status: 200,
  }),
  
  error: (message: string, status: number = 400) => ({
    ok: false,
    json: async () => ({ error: message }),
    status,
  }),
  
  unauthorized: () => ({
    ok: false,
    json: async () => ({ error: 'Unauthorized' }),
    status: 401,
  }),
  
  notFound: () => ({
    ok: false,
    json: async () => ({ error: 'Not found' }),
    status: 404,
  }),
};

/**
 * Wait for async operations
 */
export const waitForAsync = (ms: number = 0): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create mock fetch function
 */
export function createMockFetch(responses: Record<string, unknown>) {
  return jest.fn().mockImplementation((url: string) => {
    const path = new URL(url, 'http://localhost').pathname;
    
    if (responses[path]) {
      return Promise.resolve(mockApiResponses.success(responses[path]));
    }
    
    return Promise.resolve(mockApiResponses.notFound());
  });
}

/**
 * Mock localStorage
 */
export function createMockStorage() {
  const store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
}

/**
 * Mock router for Next.js
 */
export const createMockRouter = (overrides = {}) => ({
  basePath: '',
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  push: jest.fn(() => Promise.resolve(true)),
  replace: jest.fn(() => Promise.resolve(true)),
  reload: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(() => Promise.resolve()),
  beforePopState: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  isFallback: false,
  isLocaleDomain: false,
  isReady: true,
  isPreview: false,
  ...overrides,
});

/**
 * Mock intersection observer
 */
export function setupIntersectionObserverMock({
  observe = () => null,
  disconnect = () => null,
  unobserve = () => null,
} = {}) {
  class MockIntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [];
    
    constructor() {}
    
    observe = observe;
    disconnect = disconnect;
    unobserve = unobserve;
    takeRecords = () => [];
  }
  
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
}

/**
 * Mock resize observer
 */
export function setupResizeObserverMock({
  observe = () => null,
  disconnect = () => null,
  unobserve = () => null,
} = {}) {
  class MockResizeObserver {
    constructor() {}
    
    observe = observe;
    disconnect = disconnect;
    unobserve = unobserve;
  }
  
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: MockResizeObserver,
  });
}

/**
 * Mock matchMedia
 */
export function setupMatchMediaMock(matches: boolean = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

/**
 * Accessibility testing helpers
 */
export const a11yHelpers = {
  /**
   * Check if element has accessible name
   */
  hasAccessibleName: (element: HTMLElement): boolean => {
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    const title = element.getAttribute('title');
    const textContent = element.textContent?.trim();
    
    return !!(ariaLabel || ariaLabelledBy || title || textContent);
  },
  
  /**
   * Check if element is focusable
   */
  isFocusable: (element: HTMLElement): boolean => {
    const focusableSelectors = [
      'a[href]',
      'button',
      'input',
      'textarea',
      'select',
      '[tabindex]:not([tabindex="-1"])',
    ];
    
    return focusableSelectors.some(selector => element.matches(selector));
  },
  
  /**
   * Get all focusable elements in container
   */
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    return Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled'));
  },
};

/**
 * Form testing helpers
 */
export const formHelpers = {
  /**
   * Fill a form field
   */
  fillField: (input: HTMLInputElement, value: string) => {
    // Use fireEvent in real tests
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  },
  
  /**
   * Submit a form
   */
  submitForm: (form: HTMLFormElement) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  },
  
  /**
   * Check checkbox
   */
  checkCheckbox: (checkbox: HTMLInputElement, checked: boolean = true) => {
    checkbox.checked = checked;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  },
  
  /**
   * Select option
   */
  selectOption: (select: HTMLSelectElement, value: string) => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  },
};

/**
 * Event simulation helpers
 */
export const eventHelpers = {
  /**
   * Simulate keyboard event
   */
  keyPress: (element: HTMLElement, key: string, options = {}) => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, ...options }));
  },
  
  /**
   * Simulate click
   */
  click: (element: HTMLElement) => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  },
  
  /**
   * Simulate focus
   */
  focus: (element: HTMLElement) => {
    element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  },
  
  /**
   * Simulate blur
   */
  blur: (element: HTMLElement) => {
    element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  },
};

// Jest mock placeholder - the real jest global is used in test environments
const jestMock = {
  fn: (impl?: (...args: unknown[]) => unknown) => {
    const mock = impl || (() => undefined);
    return Object.assign(mock, {
      mockImplementation: (newImpl: (...args: unknown[]) => unknown) => {
        return newImpl;
      },
    });
  },
};

const testUtils = {
  mockUser,
  mockJob,
  mockApiResponses,
  waitForAsync,
  createMockFetch,
  createMockStorage,
  createMockRouter,
  setupIntersectionObserverMock,
  setupResizeObserverMock,
  setupMatchMediaMock,
  a11yHelpers,
  formHelpers,
  eventHelpers,
};

export default testUtils;

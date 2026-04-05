/**
 * Deep Linking Configuration for React Native
 * 
 * Handles URL scheme and universal links for the Ngurra Pathways app.
 */
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * URL Scheme Configuration
 * 
 * Supported URL formats:
 * - ngurra://jobs/123 - Open job details
 * - ngurra://applications/456 - Open application
 * - ngurra://mentors/789 - Open mentor profile
 * - ngurra://courses/abc - Open course details
 * - ngurra://messages/conv123 - Open conversation
 * - ngurra://community/thread/456 - Open forum thread
 * - https://ngurrapathways.com.au/jobs/123 - Universal link
 */

/**
 * Linking configuration for React Navigation
 */
export const linkingConfig = {
  prefixes: [
    'ngurra://',
    'https://ngurrapathways.com.au',
    'https://www.ngurrapathways.com.au',
    'https://app.ngurrapathways.com.au',
  ],
  
  config: {
    screens: {
      // Main tabs
      Home: 'home',
      Jobs: 'jobs',
      Messages: 'messages',
      Profile: 'profile',
      
      // Job screens
      JobDetails: {
        path: 'jobs/:jobId',
        parse: {
          jobId: (jobId) => jobId,
        },
      },
      JobSearch: 'jobs/search',
      
      // Application screens
      Applications: 'applications',
      ApplicationDetails: {
        path: 'applications/:applicationId',
        parse: {
          applicationId: (id) => id,
        },
      },
      
      // Mentorship screens
      Mentors: 'mentors',
      MentorProfile: {
        path: 'mentors/:mentorId',
        parse: {
          mentorId: (id) => id,
        },
      },
      MentorSession: {
        path: 'sessions/:sessionId',
        parse: {
          sessionId: (id) => id,
        },
      },
      
      // Course screens
      Courses: 'courses',
      CourseDetails: {
        path: 'courses/:courseId',
        parse: {
          courseId: (id) => id,
        },
      },
      
      // Community screens
      Community: 'community',
      ForumCategory: {
        path: 'community/category/:categoryId',
        parse: {
          categoryId: (id) => id,
        },
      },
      ForumThread: {
        path: 'community/thread/:threadId',
        parse: {
          threadId: (id) => id,
        },
      },
      
      // Messaging screens
      Chat: {
        path: 'messages/:conversationId',
        parse: {
          conversationId: (id) => id,
        },
      },
      
      // Notification screen
      Notifications: 'notifications',
      
      // Settings screens
      Settings: 'settings',
      NotificationSettings: 'settings/notifications',
      PrivacySettings: 'settings/privacy',
      
      // Auth screens (for password reset, verification, etc.)
      ResetPassword: {
        path: 'auth/reset-password',
        parse: {
          token: (token) => token,
        },
      },
      VerifyEmail: {
        path: 'auth/verify-email',
        parse: {
          token: (token) => token,
        },
      },
      
      // Fallback for unmatched routes
      NotFound: '*',
    },
  },
};

/**
 * Parse a deep link URL and return route info
 * @param {string} url - The deep link URL
 * @returns {Object|null} Route information
 */
export function parseDeepLink(url) {
  if (!url) return null;

  try {
    // Remove scheme prefix
    let path = url
      .replace('ngurra://', '')
      .replace('https://ngurrapathways.com.au/', '')
      .replace('https://www.ngurrapathways.com.au/', '')
      .replace('https://app.ngurrapathways.com.au/', '');

    // Parse query string
    const [pathPart, queryString] = path.split('?');
    const params = {};
    
    if (queryString) {
      queryString.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      });
    }

    // Parse path segments
    const segments = pathPart.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      return { screen: 'Home', params };
    }

    // Route mapping
    const routeMap = {
      'jobs': segments[1] ? { screen: 'JobDetails', params: { jobId: segments[1], ...params } } 
                          : { screen: 'Jobs', params },
      'applications': segments[1] ? { screen: 'ApplicationDetails', params: { applicationId: segments[1], ...params } }
                                  : { screen: 'Applications', params },
      'mentors': segments[1] ? { screen: 'MentorProfile', params: { mentorId: segments[1], ...params } }
                             : { screen: 'Mentors', params },
      'sessions': segments[1] ? { screen: 'MentorSession', params: { sessionId: segments[1], ...params } }
                              : { screen: 'Mentors', params },
      'courses': segments[1] ? { screen: 'CourseDetails', params: { courseId: segments[1], ...params } }
                             : { screen: 'Courses', params },
      'community': segments[1] === 'thread' && segments[2] 
                    ? { screen: 'ForumThread', params: { threadId: segments[2], ...params } }
                    : segments[1] === 'category' && segments[2]
                      ? { screen: 'ForumCategory', params: { categoryId: segments[2], ...params } }
                      : { screen: 'Community', params },
      'messages': segments[1] ? { screen: 'Chat', params: { conversationId: segments[1], ...params } }
                              : { screen: 'Messages', params },
      'notifications': { screen: 'Notifications', params },
      'settings': segments[1] === 'notifications' 
                    ? { screen: 'NotificationSettings', params }
                    : segments[1] === 'privacy'
                      ? { screen: 'PrivacySettings', params }
                      : { screen: 'Settings', params },
      'auth': segments[1] === 'reset-password'
                ? { screen: 'ResetPassword', params }
                : segments[1] === 'verify-email'
                  ? { screen: 'VerifyEmail', params }
                  : null,
      'profile': { screen: 'Profile', params },
      'home': { screen: 'Home', params },
    };

    return routeMap[segments[0]] || { screen: 'Home', params };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return null;
  }
}

/**
 * Handle initial URL when app opens from deep link
 * @param {Object} navigation - React Navigation object
 */
export async function handleInitialDeepLink(navigation) {
  const initialUrl = await Linking.getInitialURL();
  
  if (initialUrl) {
    const route = parseDeepLink(initialUrl);
    if (route) {
      navigation.navigate(route.screen, route.params);
    }
  }
}

/**
 * Set up deep link listener
 * @param {Object} navigation - React Navigation object
 * @returns {Function} Cleanup function
 */
export function setupDeepLinkListener(navigation) {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    const route = parseDeepLink(url);
    if (route) {
      navigation.navigate(route.screen, route.params);
    }
  });

  return () => subscription.remove();
}

/**
 * Check for initial notification that opened the app
 * @param {Object} navigation - React Navigation object
 */
export async function handleInitialNotification(navigation) {
  const response = await Notifications.getLastNotificationResponseAsync();
  
  if (response) {
    const data = response.notification.request.content.data;
    if (data?.url) {
      const route = parseDeepLink(data.url);
      if (route) {
        navigation.navigate(route.screen, route.params);
      }
    }
  }
}

/**
 * Create a deep link URL
 * @param {string} screen - Screen name
 * @param {Object} params - Screen parameters
 * @returns {string} Deep link URL
 */
export function createDeepLink(screen, params = {}) {
  const baseUrl = 'ngurra://';
  
  const pathMap = {
    'Home': 'home',
    'Jobs': 'jobs',
    'JobDetails': `jobs/${params.jobId}`,
    'Applications': 'applications',
    'ApplicationDetails': `applications/${params.applicationId}`,
    'Mentors': 'mentors',
    'MentorProfile': `mentors/${params.mentorId}`,
    'MentorSession': `sessions/${params.sessionId}`,
    'Courses': 'courses',
    'CourseDetails': `courses/${params.courseId}`,
    'Community': 'community',
    'ForumThread': `community/thread/${params.threadId}`,
    'Messages': 'messages',
    'Chat': `messages/${params.conversationId}`,
    'Notifications': 'notifications',
    'Settings': 'settings',
  };

  const path = pathMap[screen] || 'home';
  return `${baseUrl}${path}`;
}

/**
 * Create a universal link (web URL)
 * @param {string} screen - Screen name
 * @param {Object} params - Screen parameters
 * @returns {string} Universal link URL
 */
export function createUniversalLink(screen, params = {}) {
  const baseUrl = 'https://ngurrapathways.com.au/';
  
  const pathMap = {
    'Jobs': 'jobs',
    'JobDetails': `jobs/${params.jobId}`,
    'Mentors': 'mentors',
    'MentorProfile': `mentors/${params.mentorId}`,
    'Courses': 'courses',
    'CourseDetails': `courses/${params.courseId}`,
    'Community': 'community',
    'ForumThread': `community/thread/${params.threadId}`,
  };

  const path = pathMap[screen] || '';
  return `${baseUrl}${path}`;
}

export default {
  linkingConfig,
  parseDeepLink,
  handleInitialDeepLink,
  setupDeepLinkListener,
  handleInitialNotification,
  createDeepLink,
  createUniversalLink,
};

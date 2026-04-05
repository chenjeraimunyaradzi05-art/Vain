/**
 * Push Notification Service for React Native
 * 
 * Handles registration, permission requests, and notification handling
 * using Expo Notifications API.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const PUSH_TOKEN_KEY = '@ngurra_push_token';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Notification categories for the app
 */
export const NotificationCategory = {
  JOB_ALERT: 'job_alert',
  APPLICATION_UPDATE: 'application_update',
  MESSAGE: 'message',
  MENTOR_SESSION: 'mentor_session',
  COURSE_UPDATE: 'course_update',
  COMMUNITY: 'community',
  SYSTEM: 'system',
};

/**
 * Request push notification permissions
 * @returns {Promise<boolean>} Whether permission was granted
 */
export async function requestPushPermissions() {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return false;
  }

  return true;
}

/**
 * Get the Expo push token for this device
 * @returns {Promise<string|null>} The push token or null
 */
export async function getExpoPushToken() {
  if (!Device.isDevice) {
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return token.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Register push token with the backend
 * @param {string} authToken - User's auth token
 * @returns {Promise<boolean>} Success status
 */
export async function registerPushToken(authToken) {
  const hasPermission = await requestPushPermissions();
  if (!hasPermission) {
    return false;
  }

  const pushToken = await getExpoPushToken();
  if (!pushToken) {
    return false;
  }

  // Check if already registered
  const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (storedToken === pushToken) {
    return true; // Already registered
  }

  try {
    const response = await fetch(`${API_BASE}/notifications/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token: pushToken,
        platform: Platform.OS,
        deviceName: Device.deviceName,
      }),
    });

    if (response.ok) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);
      return true;
    }

    console.error('Failed to register push token:', await response.text());
    return false;
  } catch (error) {
    console.error('Error registering push token:', error);
    return false;
  }
}

/**
 * Unregister push token (on logout)
 * @param {string} authToken - User's auth token
 */
export async function unregisterPushToken(authToken) {
  const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!storedToken) {
    return;
  }

  try {
    await fetch(`${API_BASE}/notifications/unregister-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: storedToken }),
    });

    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch (error) {
    console.error('Error unregistering push token:', error);
  }
}

/**
 * Set up notification listeners
 * @param {Object} handlers - Callback handlers
 * @param {Function} handlers.onNotificationReceived - Called when notification arrives
 * @param {Function} handlers.onNotificationResponse - Called when user taps notification
 * @returns {Function} Cleanup function
 */
export function setupNotificationListeners({ onNotificationReceived, onNotificationResponse }) {
  // Listener for incoming notifications while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener for when user interacts with notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    if (onNotificationResponse) {
      onNotificationResponse(response);
    }
  });

  // Return cleanup function
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

/**
 * Handle notification navigation
 * @param {Object} response - Notification response
 * @param {Object} navigation - React Navigation object
 */
export function handleNotificationNavigation(response, navigation) {
  const data = response.notification.request.content.data;
  const category = data?.category;

  switch (category) {
    case NotificationCategory.JOB_ALERT:
      if (data.jobId) {
        navigation.navigate('JobDetails', { jobId: data.jobId });
      } else {
        navigation.navigate('Jobs');
      }
      break;

    case NotificationCategory.APPLICATION_UPDATE:
      if (data.applicationId) {
        navigation.navigate('ApplicationDetails', { id: data.applicationId });
      } else {
        navigation.navigate('Applications');
      }
      break;

    case NotificationCategory.MESSAGE:
      if (data.conversationId) {
        navigation.navigate('Chat', { conversationId: data.conversationId });
      } else {
        navigation.navigate('Messages');
      }
      break;

    case NotificationCategory.MENTOR_SESSION:
      if (data.sessionId) {
        navigation.navigate('MentorSession', { sessionId: data.sessionId });
      } else {
        navigation.navigate('Mentorship');
      }
      break;

    case NotificationCategory.COURSE_UPDATE:
      if (data.courseId) {
        navigation.navigate('CourseDetails', { courseId: data.courseId });
      } else {
        navigation.navigate('Courses');
      }
      break;

    case NotificationCategory.COMMUNITY:
      if (data.threadId) {
        navigation.navigate('ForumThread', { threadId: data.threadId });
      } else {
        navigation.navigate('Community');
      }
      break;

    default:
      // Default to notifications list
      navigation.navigate('Notifications');
  }
}

/**
 * Schedule a local notification
 * @param {Object} options - Notification options
 * @returns {Promise<string>} Notification identifier
 */
export async function scheduleLocalNotification({
  title,
  body,
  data = {},
  trigger = null, // null = immediate
}) {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger,
  });
}

/**
 * Cancel a scheduled notification
 * @param {string} identifier - Notification identifier
 */
export async function cancelNotification(identifier) {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * Clear all notifications from notification center
 */
export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Set app badge count
 * @param {number} count - Badge count
 */
export async function setBadgeCount(count) {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Get current badge count
 * @returns {Promise<number>}
 */
export async function getBadgeCount() {
  return await Notifications.getBadgeCountAsync();
}

export default {
  requestPushPermissions,
  getExpoPushToken,
  registerPushToken,
  unregisterPushToken,
  setupNotificationListeners,
  handleNotificationNavigation,
  scheduleLocalNotification,
  cancelNotification,
  clearAllNotifications,
  setBadgeCount,
  getBadgeCount,
  NotificationCategory,
};

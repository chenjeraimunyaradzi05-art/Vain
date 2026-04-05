/**
 * Notification Context
 * Handles push notifications and in-app notifications
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

interface NotificationContextType {
  expoPushToken: string;
  notification: Notifications.Notification | null;
  notifications: Notifications.Notification[];
  notificationsEnabled: boolean;
  scheduleLocalNotification: (title: string, body: string, data?: any, trigger?: Notifications.NotificationTriggerInput) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  clearNotifications: () => void;
  toggleNotifications: (enabled: boolean) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [notifications, setNotifications] = useState<Notifications.Notification[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotifications().then(token => setExpoPushToken(token || ''));

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
    });

    // Listen for notification responses (user taps)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const { notification } = response;
      handleNotificationResponse(notification);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  async function registerForPushNotifications() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });

      await Notifications.setNotificationChannelAsync('jobs', {
        name: 'Job Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Notifications about new job matches',
      });

      await Notifications.setNotificationChannelAsync('mentorship', {
        name: 'Mentorship',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Mentorship session reminders and messages',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // In a real app, you would get the project ID from app config
      // For now we'll handle the error gracefully if project ID is missing
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: 'your-project-id', // Replace with your Expo project ID
        })).data;
      } catch (e) {
        console.log('Error getting push token:', e);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  function handleNotificationResponse(notification: Notifications.Notification) {
    const data = notification.request.content.data;
    
    // Handle different notification types
    if (data?.type === 'job') {
      // Navigate to job detail
      console.log('Navigate to job:', data.jobId);
    } else if (data?.type === 'mentorship') {
      // Navigate to mentorship
      console.log('Navigate to mentorship:', data.sessionId);
    } else if (data?.type === 'application') {
      // Navigate to application status
      console.log('Navigate to application:', data.applicationId);
    }
  }

  async function scheduleLocalNotification(title: string, body: string, data = {}, trigger: Notifications.NotificationTriggerInput = null) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger,
    });
  }

  async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  function clearNotifications() {
    setNotifications([]);
  }

  async function toggleNotifications(enabled: boolean) {
    setNotificationsEnabled(enabled);
    if (enabled) {
      await registerForPushNotifications();
    } else {
      await cancelAllNotifications();
    }
  }

  const value = {
    expoPushToken,
    notification,
    notifications,
    notificationsEnabled,
    scheduleLocalNotification,
    cancelAllNotifications,
    clearNotifications,
    toggleNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

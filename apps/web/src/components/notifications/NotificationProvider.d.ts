/* eslint-disable no-unused-vars */
import type { ReactElement, ReactNode } from 'react';

interface NotificationOptions {
  id?: string;
  message: string;
  variant?: 'info' | 'success' | 'error' | 'warning';
  autoHideMs?: number;
  testId?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationsContext {
  showNotification: (_options: NotificationOptions) => string;
  hideNotification: (_id: string) => void;
}

export function useNotifications(): NotificationsContext;
export default function NotificationProvider(_props: { children: ReactNode }): ReactElement;

'use client';

import React from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger' | 'gold' | 'emerald' | 'rose' | 'cosmic';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: React.ReactNode;
  className?: string;
}

interface AlertIconProps {
  variant: AlertVariant;
}

const variantClasses: Record<AlertVariant, {
  container: string;
  icon: string;
  title: string;
  text: string;
}> = {
  info: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
    title: 'text-blue-800 dark:text-blue-200',
    text: 'text-blue-700 dark:text-blue-300',
  },
  success: {
    container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: 'text-green-500',
    title: 'text-green-800 dark:text-green-200',
    text: 'text-green-700 dark:text-green-300',
  },
  warning: {
    container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-500',
    title: 'text-yellow-800 dark:text-yellow-200',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
  danger: {
    container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: 'text-red-500',
    title: 'text-red-800 dark:text-red-200',
    text: 'text-red-700 dark:text-red-300',
  },
  gold: {
    container: 'bg-[#FFD700]/10 border-[#FFD700]/30',
    icon: 'text-[#FFD700]',
    title: 'text-[#FFD700]',
    text: 'text-[#B8860B] dark:text-[#FFD700]/80',
  },
  emerald: {
    container: 'bg-[#50C878]/10 border-[#50C878]/30',
    icon: 'text-[#50C878]',
    title: 'text-[#50C878]',
    text: 'text-[#2E8B57] dark:text-[#50C878]/80',
  },
  rose: {
    container: 'bg-[#E85B8A]/10 border-[#E85B8A]/30',
    icon: 'text-[#E85B8A]',
    title: 'text-[#E85B8A]',
    text: 'text-[#C76D7E] dark:text-[#E85B8A]/80',
  },
  cosmic: {
    container: 'bg-gradient-to-r from-[#1A0F2E]/50 to-[#2D1B69]/50 border-[#FFD700]/20',
    icon: 'text-[#FFD700]',
    title: 'text-white',
    text: 'text-gray-300',
  },
};

function DefaultIcon({ variant }: AlertIconProps) {
  switch (variant) {
    case 'info':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
    case 'success':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    case 'danger':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    case 'gold':
    case 'emerald':
    case 'rose':
    case 'cosmic':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
  }
}

export function Alert({
  variant = 'info',
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  action,
  className = '',
}: AlertProps) {
  const styles = variantClasses[variant];

  return (
    <div
      className={`
        rounded-lg border p-4
        ${styles.container}
        ${className}
      `}
      role="alert"
    >
      <div className="flex">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {icon || <DefaultIcon variant={variant} />}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${styles.title}`}>
              {title}
            </h3>
          )}
          <div className={`${title ? 'mt-2' : ''} text-sm ${styles.text}`}>
            {children}
          </div>
          {action && (
            <div className="mt-3">
              {action}
            </div>
          )}
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`
                  inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${styles.icon} hover:bg-black/5 dark:hover:bg-white/5
                `}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline Alert - more compact, for inline messages
interface InlineAlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function InlineAlert({
  variant = 'info',
  children,
  icon,
  className = '',
}: InlineAlertProps) {
  const styles = variantClasses[variant];

  return (
    <div
      className={`
        flex items-center gap-2 text-sm
        ${styles.text}
        ${className}
      `}
      role="alert"
    >
      <span className={`flex-shrink-0 ${styles.icon}`}>
        {icon || <DefaultIcon variant={variant} />}
      </span>
      <span>{children}</span>
    </div>
  );
}

// Banner Alert - full width, for page-level notifications
interface BannerAlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function BannerAlert({
  variant = 'info',
  children,
  dismissible = false,
  onDismiss,
  action,
  className = '',
}: BannerAlertProps) {
  const styles = variantClasses[variant];

  return (
    <div
      className={`
        border-b
        ${styles.container}
        ${className}
      `}
      role="alert"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className={`flex-shrink-0 ${styles.icon}`}>
              <DefaultIcon variant={variant} />
            </span>
            <p className={`text-sm font-medium ${styles.text}`}>
              {children}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {action}
            {dismissible && (
              <button
                type="button"
                onClick={onDismiss}
                className={`
                  rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${styles.icon} hover:bg-black/5 dark:hover:bg-white/5
                `}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Alert;

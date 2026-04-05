'use client';

/**
 * Toast Container Component
 * 
 * Renders toast notifications with animations and accessibility support.
 * Uses the useToast hook for state management.
 */

import { useToast, Toast, ToastType } from '@/hooks/useToast';
import { useReducedMotion } from '@/hooks/useAccessibility';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useEffect, useRef } from 'react';

const TOAST_ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
};

const TOAST_ICON_COLORS: Record<ToastType, string> = {
  success: 'text-green-500 dark:text-green-400',
  error: 'text-red-500 dark:text-red-400',
  warning: 'text-yellow-500 dark:text-yellow-400',
  info: 'text-blue-500 dark:text-blue-400',
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
  reducedMotion: boolean;
}

function ToastItem({ toast, onRemove, reducedMotion }: ToastItemProps) {
  const Icon = TOAST_ICONS[toast.type];
  const ref = useRef<HTMLDivElement>(null);

  // Focus the toast for screen readers on mount
  useEffect(() => {
    if (toast.type === 'error') {
      ref.current?.focus();
    }
  }, [toast.type]);

  return (
    <div
      ref={ref}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      tabIndex={-1}
      className={`
        relative flex items-start gap-3 p-4 rounded-lg border shadow-lg
        ${TOAST_COLORS[toast.type]}
        ${reducedMotion ? '' : 'animate-slide-in-right'}
        min-w-[320px] max-w-[420px]
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${TOAST_ICON_COLORS[toast.type]}`} />
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-sm opacity-90">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const reducedMotion = useReducedMotion();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
          reducedMotion={reducedMotion}
        />
      ))}
    </div>
  );
}

export default ToastContainer;

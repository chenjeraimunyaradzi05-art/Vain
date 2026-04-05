'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Info, CheckCircle, HelpCircle } from 'lucide-react';
import { Spinner } from './Spinner';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info' | 'cosmic';
  icon?: React.ReactNode;
  isLoading?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
}

const variantConfig = {
  default: {
    icon: <HelpCircle className="w-6 h-6" />,
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-600 dark:text-gray-400',
    confirmBg: 'bg-blue-600 hover:bg-blue-700',
    confirmText: 'text-white',
  },
  danger: {
    icon: <AlertTriangle className="w-6 h-6" />,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmBg: 'bg-red-600 hover:bg-red-700',
    confirmText: 'text-white',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6" />,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    confirmBg: 'bg-amber-600 hover:bg-amber-700',
    confirmText: 'text-white',
  },
  success: {
    icon: <CheckCircle className="w-6 h-6" />,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    confirmBg: 'bg-green-600 hover:bg-green-700',
    confirmText: 'text-white',
  },
  info: {
    icon: <Info className="w-6 h-6" />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmBg: 'bg-blue-600 hover:bg-blue-700',
    confirmText: 'text-white',
  },
  cosmic: {
    icon: <HelpCircle className="w-6 h-6" />,
    iconBg: 'bg-[#FFD700]/20',
    iconColor: 'text-[#FFD700]',
    confirmBg: 'bg-gradient-to-r from-[#FFD700] to-[#50C878] hover:opacity-90',
    confirmText: 'text-gray-900',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon,
  isLoading = false,
  closeOnOverlayClick = true,
  closeOnEsc = true,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const config = variantConfig[variant];
  const isCosmic = variant === 'cosmic';

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, closeOnEsc, isLoading, onClose]);

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (isOpen) {
      confirmButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleConfirm = useCallback(async () => {
    await onConfirm();
  }, [onConfirm]);

  const handleOverlayClick = useCallback(() => {
    if (closeOnOverlayClick && !isLoading) {
      onClose();
    }
  }, [closeOnOverlayClick, isLoading, onClose]);

  if (!isOpen) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 transition-opacity
          ${isCosmic ? 'bg-[#1A0F2E]/90' : 'bg-black/50'}
        `}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className={`
          relative w-full max-w-md p-6 rounded-2xl shadow-2xl
          transform transition-all
          ${isCosmic 
            ? 'bg-[#1A0F2E] border border-[#FFD700]/20 shadow-[#FFD700]/5' 
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}
        `}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className={`
            absolute top-4 right-4 p-1 rounded-lg transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isCosmic 
              ? 'text-gray-400 hover:text-white hover:bg-white/10' 
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
          `}
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div
          className={`
            w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center
            ${config.iconBg} ${config.iconColor}
          `}
        >
          {icon || config.icon}
        </div>

        {/* Title */}
        <h2
          id="confirm-dialog-title"
          className={`
            text-lg font-semibold text-center mb-2
            ${isCosmic ? 'text-white' : 'text-gray-900 dark:text-white'}
          `}
        >
          {title}
        </h2>

        {/* Message */}
        <div
          className={`
            text-center mb-6
            ${isCosmic ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}
          `}
        >
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`
              flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isCosmic 
                ? 'bg-white/10 text-white hover:bg-white/20' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}
            `}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`
              flex-1 px-4 py-2.5 rounded-lg font-medium transition-all
              flex items-center justify-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${config.confirmBg} ${config.confirmText}
            `}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" variant="white" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Render to portal
  if (typeof window !== 'undefined') {
    return createPortal(dialog, document.body);
  }
  
  return null;
}

// Alert Dialog (single button, just for acknowledgment)
interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | React.ReactNode;
  buttonText?: string;
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info' | 'cosmic';
  icon?: React.ReactNode;
}

export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  variant = 'default',
  icon,
}: AlertDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onClose}
      title={title}
      message={message}
      confirmText={buttonText}
      cancelText=""
      variant={variant}
      icon={icon}
      closeOnOverlayClick={true}
    />
  );
}

// Delete Confirmation (preset for delete operations)
interface DeleteConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName?: string;
  isLoading?: boolean;
}

export function DeleteConfirm({
  isOpen,
  onClose,
  onConfirm,
  itemName = 'this item',
  isLoading = false,
}: DeleteConfirmProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Confirmation"
      message={`Are you sure you want to delete ${itemName}? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
      isLoading={isLoading}
    />
  );
}

// Unsaved Changes Confirmation
interface UnsavedChangesConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSave?: () => void | Promise<void>;
}

export function UnsavedChangesConfirm({
  isOpen,
  onClose,
  onConfirm,
  onSave,
}: UnsavedChangesConfirmProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Unsaved Changes"
      message={
        <div className="space-y-2">
          <p>You have unsaved changes. Are you sure you want to leave?</p>
          {onSave && (
            <button
              onClick={onSave}
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Save changes first
            </button>
          )}
        </div>
      }
      confirmText="Leave without saving"
      cancelText="Stay on page"
      variant="warning"
    />
  );
}

export default ConfirmDialog;

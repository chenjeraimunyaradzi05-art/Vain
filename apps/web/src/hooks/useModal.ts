'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseModalOptions {
  /** Initial open state */
  defaultOpen?: boolean;
  /** Callback when modal opens */
  onOpen?: () => void;
  /** Callback when modal closes */
  onClose?: () => void;
  /** Whether to close on escape key */
  closeOnEscape?: boolean;
  /** Whether to close on click outside */
  closeOnClickOutside?: boolean;
}

interface UseModalReturn {
  /** Whether modal is open */
  isOpen: boolean;
  /** Open the modal */
  open: () => void;
  /** Close the modal */
  close: () => void;
  /** Toggle modal state */
  toggle: () => void;
  /** Props to spread on the modal trigger button */
  triggerProps: {
    onClick: () => void;
    'aria-expanded': boolean;
    'aria-haspopup': boolean;
  };
  /** Props to spread on the modal container */
  modalProps: {
    role: 'dialog';
    'aria-modal': boolean;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
}

export function useModal({
  defaultOpen = false,
  onOpen,
  onClose,
  closeOnEscape = true,
}: UseModalOptions = {}): UseModalReturn {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement;
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
    // Restore focus to the element that triggered the modal
    previouslyFocusedElement.current?.focus();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (closeOnEscape && e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }, [closeOnEscape, close]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  return {
    isOpen,
    open,
    close,
    toggle,
    triggerProps: {
      onClick: toggle,
      'aria-expanded': isOpen,
      'aria-haspopup': true as const,
    },
    modalProps: {
      role: 'dialog' as const,
      'aria-modal': true as const,
      onKeyDown: handleKeyDown,
    },
  };
}

// Confirmation dialog hook
interface UseConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger' | 'warning';
}

interface UseConfirmReturn {
  isOpen: boolean;
  confirm: () => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
  options: UseConfirmOptions;
}

export function useConfirm(defaultOptions: UseConfirmOptions = {}): UseConfirmReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState(defaultOptions);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((customOptions?: UseConfirmOptions): Promise<boolean> => {
    setOptions({ ...defaultOptions, ...customOptions });
    setIsOpen(true);
    
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, [defaultOptions]);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  return {
    isOpen,
    confirm,
    handleConfirm,
    handleCancel,
    options,
  };
}

// Alert dialog hook (single button, informational)
interface UseAlertOptions {
  title?: string;
  message?: string;
  buttonLabel?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

interface UseAlertReturn {
  isOpen: boolean;
  alert: (options?: UseAlertOptions) => Promise<void>;
  handleDismiss: () => void;
  options: UseAlertOptions;
}

export function useAlert(defaultOptions: UseAlertOptions = {}): UseAlertReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState(defaultOptions);
  const resolveRef = useRef<(() => void) | null>(null);

  const alert = useCallback((customOptions?: UseAlertOptions): Promise<void> => {
    setOptions({ ...defaultOptions, ...customOptions });
    setIsOpen(true);
    
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, [defaultOptions]);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.();
    resolveRef.current = null;
  }, []);

  return {
    isOpen,
    alert,
    handleDismiss,
    options,
  };
}

export default useModal;

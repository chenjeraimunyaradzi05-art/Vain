'use client';

import { useState, useCallback, useEffect } from 'react';

interface UseClipboardOptions {
  /** Timeout before resetting copied state (ms) */
  timeout?: number;
  /** Callback on successful copy */
  onSuccess?: (text: string) => void;
  /** Callback on copy error */
  onError?: (error: Error) => void;
}

interface UseClipboardReturn {
  /** Whether text was recently copied */
  copied: boolean;
  /** Copy text to clipboard */
  copy: (text: string) => Promise<boolean>;
  /** Read text from clipboard (requires user permission) */
  read: () => Promise<string | null>;
  /** Error if copy failed */
  error: Error | null;
  /** Whether clipboard API is supported */
  isSupported: boolean;
}

export function useClipboard({
  timeout = 2000,
  onSuccess,
  onError,
}: UseClipboardOptions = {}): UseClipboardReturn {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isSupported = typeof navigator !== 'undefined' && !!navigator.clipboard;

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (!isSupported) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setError(null);
        onSuccess?.(text);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Copy failed');
        setError(error);
        onError?.(error);
        return false;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);
      onSuccess?.(text);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Copy failed');
      setError(error);
      setCopied(false);
      onError?.(error);
      return false;
    }
  }, [isSupported, onSuccess, onError]);

  const read = useCallback(async (): Promise<string | null> => {
    if (!isSupported) {
      return null;
    }

    try {
      const text = await navigator.clipboard.readText();
      return text;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Read failed');
      setError(error);
      return null;
    }
  }, [isSupported]);

  // Reset copied state after timeout
  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => {
      setCopied(false);
    }, timeout);

    return () => clearTimeout(timer);
  }, [copied, timeout]);

  return {
    copied,
    copy,
    read,
    error,
    isSupported,
  };
}

// Convenience hook for copying specific content
export function useCopyToClipboard(text: string, options?: UseClipboardOptions) {
  const clipboard = useClipboard(options);
  
  const copyText = useCallback(() => {
    return clipboard.copy(text);
  }, [clipboard, text]);

  return {
    ...clipboard,
    copyText,
  };
}

export default useClipboard;

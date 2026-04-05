/**
 * Toast Component Tests
 * Unit tests for the Toast notification component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast, ToastProvider, useToast, toast } from '@/components/Toast';

// Wrapper component for testing hook
function ToastHookTester() {
  const { addToast, removeToast, clearAll } = useToast();
  
  return (
    <div>
      <button onClick={() => addToast({ type: 'success', message: 'Success message' })}>
        Show Success
      </button>
      <button onClick={() => addToast({ type: 'error', message: 'Error message' })}>
        Show Error
      </button>
      <button onClick={() => addToast({ type: 'warning', message: 'Warning message' })}>
        Show Warning
      </button>
      <button onClick={() => addToast({ type: 'info', message: 'Info message' })}>
        Show Info
      </button>
      <button onClick={() => clearAll()}>Clear All</button>
    </div>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Individual Toast', () => {
    it('renders with message', () => {
      render(
        <Toast
          id="1"
          type="info"
          message="Test notification"
          onClose={() => {}}
        />
      );
      
      expect(screen.getByText('Test notification')).toBeInTheDocument();
    });

    it('renders success type', () => {
      render(
        <Toast
          id="1"
          type="success"
          message="Success!"
          onClose={() => {}}
        />
      );
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-green');
      expect(screen.getByTestId('success-icon')).toBeInTheDocument();
    });

    it('renders error type', () => {
      render(
        <Toast
          id="1"
          type="error"
          message="Error!"
          onClose={() => {}}
        />
      );
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-red');
      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    });

    it('renders warning type', () => {
      render(
        <Toast
          id="1"
          type="warning"
          message="Warning!"
          onClose={() => {}}
        />
      );
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-yellow');
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
    });

    it('renders info type', () => {
      render(
        <Toast
          id="1"
          type="info"
          message="Info"
          onClose={() => {}}
        />
      );
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-blue');
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    it('renders with title', () => {
      render(
        <Toast
          id="1"
          type="info"
          title="Notification Title"
          message="Message content"
          onClose={() => {}}
        />
      );
      
      expect(screen.getByText('Notification Title')).toBeInTheDocument();
      expect(screen.getByText('Message content')).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', async () => {
      const onClose = vi.fn();
      render(
        <Toast
          id="1"
          type="info"
          message="Test"
          onClose={onClose}
        />
      );
      
      vi.useRealTimers();
      await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
      expect(onClose).toHaveBeenCalledWith('1');
    });

    it('auto-dismisses after duration', () => {
      const onClose = vi.fn();
      render(
        <Toast
          id="1"
          type="info"
          message="Test"
          duration={3000}
          onClose={onClose}
        />
      );
      
      expect(onClose).not.toHaveBeenCalled();
      
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      expect(onClose).toHaveBeenCalledWith('1');
    });

    it('does not auto-dismiss when duration is 0', () => {
      const onClose = vi.fn();
      render(
        <Toast
          id="1"
          type="info"
          message="Persistent"
          duration={0}
          onClose={onClose}
        />
      );
      
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('pauses auto-dismiss on hover', async () => {
      const onClose = vi.fn();
      render(
        <Toast
          id="1"
          type="info"
          message="Test"
          duration={3000}
          pauseOnHover
          onClose={onClose}
        />
      );
      
      const toast = screen.getByRole('alert');
      
      // Hover over toast
      vi.useRealTimers();
      await userEvent.hover(toast);
      vi.useFakeTimers();
      
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      // Should not have closed while hovered
      expect(onClose).not.toHaveBeenCalled();
    });

    it('renders action button when provided', async () => {
      const onAction = vi.fn();
      render(
        <Toast
          id="1"
          type="info"
          message="Test"
          action={{ label: 'Undo', onClick: onAction }}
          onClose={() => {}}
        />
      );
      
      vi.useRealTimers();
      const actionButton = screen.getByRole('button', { name: /undo/i });
      await userEvent.click(actionButton);
      
      expect(onAction).toHaveBeenCalled();
    });
  });

  describe('ToastProvider', () => {
    it('provides toast context', () => {
      render(
        <ToastProvider>
          <ToastHookTester />
        </ToastProvider>
      );
      
      expect(screen.getByRole('button', { name: /show success/i })).toBeInTheDocument();
    });

    it('shows toast when addToast is called', async () => {
      render(
        <ToastProvider>
          <ToastHookTester />
        </ToastProvider>
      );
      
      vi.useRealTimers();
      await userEvent.click(screen.getByRole('button', { name: /show success/i }));
      
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('shows multiple toasts', async () => {
      render(
        <ToastProvider>
          <ToastHookTester />
        </ToastProvider>
      );
      
      vi.useRealTimers();
      await userEvent.click(screen.getByRole('button', { name: /show success/i }));
      await userEvent.click(screen.getByRole('button', { name: /show error/i }));
      
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('clears all toasts', async () => {
      render(
        <ToastProvider>
          <ToastHookTester />
        </ToastProvider>
      );
      
      vi.useRealTimers();
      await userEvent.click(screen.getByRole('button', { name: /show success/i }));
      await userEvent.click(screen.getByRole('button', { name: /show error/i }));
      
      expect(screen.getByText('Success message')).toBeInTheDocument();
      
      await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
      
      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
        expect(screen.queryByText('Error message')).not.toBeInTheDocument();
      });
    });

    it('limits number of visible toasts', async () => {
      render(
        <ToastProvider maxToasts={2}>
          <ToastHookTester />
        </ToastProvider>
      );
      
      vi.useRealTimers();
      await userEvent.click(screen.getByRole('button', { name: /show success/i }));
      await userEvent.click(screen.getByRole('button', { name: /show error/i }));
      await userEvent.click(screen.getByRole('button', { name: /show warning/i }));
      
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeLessThanOrEqual(2);
    });
  });

  describe('toast() helper', () => {
    it('creates success toast', () => {
      render(<ToastProvider><div /></ToastProvider>);
      
      act(() => {
        toast.success('Success!');
      });
      
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('creates error toast', () => {
      render(<ToastProvider><div /></ToastProvider>);
      
      act(() => {
        toast.error('Error!');
      });
      
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });

    it('creates warning toast', () => {
      render(<ToastProvider><div /></ToastProvider>);
      
      act(() => {
        toast.warning('Warning!');
      });
      
      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });

    it('creates info toast', () => {
      render(<ToastProvider><div /></ToastProvider>);
      
      act(() => {
        toast.info('Info');
      });
      
      expect(screen.getByText('Info')).toBeInTheDocument();
    });

    it('creates promise toast', async () => {
      render(<ToastProvider><div /></ToastProvider>);
      
      const promise = new Promise(resolve => setTimeout(resolve, 100));
      
      act(() => {
        toast.promise(promise, {
          loading: 'Loading...',
          success: 'Done!',
          error: 'Failed!',
        });
      });
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      vi.useRealTimers();
      await act(async () => {
        await promise;
      });
      
      await waitFor(() => {
        expect(screen.getByText('Done!')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has alert role', () => {
      render(
        <Toast
          id="1"
          type="info"
          message="Test"
          onClose={() => {}}
        />
      );
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live for screen readers', () => {
      render(
        <Toast
          id="1"
          type="info"
          message="Test"
          onClose={() => {}}
        />
      );
      
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });

    it('uses assertive for errors', () => {
      render(
        <Toast
          id="1"
          type="error"
          message="Error"
          onClose={() => {}}
        />
      );
      
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });

    it('has dismiss button with accessible name', () => {
      render(
        <Toast
          id="1"
          type="info"
          message="Test"
          onClose={() => {}}
        />
      );
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toBeInTheDocument();
    });
  });

  describe('Position', () => {
    it('renders in top-right by default', () => {
      render(
        <ToastProvider position="top-right">
          <ToastHookTester />
        </ToastProvider>
      );
      
      const container = screen.getByTestId('toast-container');
      expect(container).toHaveClass('top-4', 'right-4');
    });

    it('renders in bottom-left when specified', () => {
      render(
        <ToastProvider position="bottom-left">
          <ToastHookTester />
        </ToastProvider>
      );
      
      const container = screen.getByTestId('toast-container');
      expect(container).toHaveClass('bottom-4', 'left-4');
    });
  });

  describe('Animation', () => {
    it('applies enter animation', () => {
      render(
        <Toast
          id="1"
          type="info"
          message="Test"
          onClose={() => {}}
        />
      );
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('animate-slide-in');
    });
  });
});

/**
 * Toast Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Toast, { ToastContainer } from '../../Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders message correctly', () => {
    render(<Toast id="toast-1" message="Test message" type="info" onDismiss={() => {}} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders success toast', () => {
    render(<Toast id="toast-1" message="Success!" type="success" onDismiss={() => {}} />);
    expect(screen.getByRole('alert')).toHaveClass('bg-green-50');
  });

  it('renders error toast', () => {
    render(<Toast id="toast-1" message="Error!" type="error" onDismiss={() => {}} />);
    expect(screen.getByRole('alert')).toHaveClass('bg-red-50');
  });

  it('renders warning toast', () => {
    render(<Toast id="toast-1" message="Warning!" type="warning" onDismiss={() => {}} />);
    expect(screen.getByRole('alert')).toHaveClass('bg-yellow-50');
  });

  it('renders info toast', () => {
    render(<Toast id="toast-1" message="Info" type="info" onDismiss={() => {}} />);
    expect(screen.getByRole('alert')).toHaveClass('bg-blue-50');
  });

  it('auto-dismisses after duration', () => {
    const handleDismiss = vi.fn();
    render(
      <Toast
        id="toast-1"
        message="Auto dismiss"
        type="info"
        duration={3000}
        onDismiss={handleDismiss}
      />
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(handleDismiss).toHaveBeenCalledWith('toast-1');
  });

  it('does not auto-dismiss when duration is 0', () => {
    const handleDismiss = vi.fn();
    render(
      <Toast id="toast-1" message="Persistent" type="info" duration={0} onDismiss={handleDismiss} />
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(handleDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const handleDismiss = vi.fn();
    render(<Toast id="toast-1" message="Dismiss me" type="info" duration={0} onDismiss={handleDismiss} />);

    screen.getByRole('button', { name: /dismiss notification/i }).click();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(handleDismiss).toHaveBeenCalledWith('toast-1');
  });
});

describe('ToastContainer', () => {
  it('renders multiple toasts', () => {
    render(
      <ToastContainer
        toasts={[
          { id: 'toast-1', message: 'Toast 1', type: 'info' },
          { id: 'toast-2', message: 'Toast 2', type: 'success' },
        ]}
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });

  it('positions toasts correctly', () => {
    render(
      <ToastContainer
        position="top-right"
        toasts={[{ id: 'toast-1', message: 'Toast', type: 'info' }]}
        onDismiss={() => {}}
      />
    );

    const containerEl = screen.getByLabelText('Notifications');
    expect(containerEl).toHaveClass('top-4');
    expect(containerEl).toHaveClass('right-4');
  });
});

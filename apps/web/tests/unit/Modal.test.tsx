/**
 * Modal Component Tests
 * Unit tests for the Modal component using React Testing Library
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/components/Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when open', () => {
      render(<Modal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders title', () => {
      render(<Modal {...defaultProps} />);
      
      const title = screen.getByText('Test Modal');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('H2');
    });

    it('renders children content', () => {
      render(
        <Modal {...defaultProps}>
          <form>
            <input type="text" placeholder="Name" />
            <button>Submit</button>
          </form>
        </Modal>
      );
      
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      render(
        <Modal {...defaultProps} description="Additional context for the modal">
          <p>Content</p>
        </Modal>
      );
      
      expect(screen.getByText('Additional context for the modal')).toBeInTheDocument();
    });
  });

  describe('Close Behavior', () => {
    it('calls onClose when close button clicked', async () => {
      render(<Modal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop clicked', async () => {
      render(<Modal {...defaultProps} />);
      
      const backdrop = screen.getByTestId('modal-backdrop');
      await userEvent.click(backdrop);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on backdrop click when closeOnBackdrop is false', async () => {
      render(<Modal {...defaultProps} closeOnBackdrop={false} />);
      
      const backdrop = screen.getByTestId('modal-backdrop');
      await userEvent.click(backdrop);
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key pressed', async () => {
      render(<Modal {...defaultProps} />);
      
      await userEvent.keyboard('{Escape}');
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on Escape when closeOnEscape is false', async () => {
      render(<Modal {...defaultProps} closeOnEscape={false} />);
      
      await userEvent.keyboard('{Escape}');
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when clicking inside modal', async () => {
      render(<Modal {...defaultProps} />);
      
      const content = screen.getByText('Modal content');
      await userEvent.click(content);
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Modal {...defaultProps} size="sm" />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-sm');
    });

    it('renders medium size (default)', () => {
      render(<Modal {...defaultProps} size="md" />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-md');
    });

    it('renders large size', () => {
      render(<Modal {...defaultProps} size="lg" />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-lg');
    });

    it('renders extra large size', () => {
      render(<Modal {...defaultProps} size="xl" />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-xl');
    });

    it('renders full width', () => {
      render(<Modal {...defaultProps} size="full" />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-full');
    });
  });

  describe('Footer', () => {
    it('renders footer when provided', () => {
      render(
        <Modal
          {...defaultProps}
          footer={
            <div>
              <button>Cancel</button>
              <button>Confirm</button>
            </div>
          }
        />
      );
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    it('renders action buttons when provided', () => {
      const onConfirm = vi.fn();
      render(
        <Modal
          {...defaultProps}
          confirmText="Confirm"
          cancelText="Cancel"
          onConfirm={onConfirm}
        />
      );
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button clicked', async () => {
      const onConfirm = vi.fn();
      render(
        <Modal
          {...defaultProps}
          confirmText="Confirm"
          onConfirm={onConfirm}
        />
      );
      
      await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has correct role', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(<Modal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      const titleId = screen.getByText('Test Modal').id;
      
      expect(dialog).toHaveAttribute('aria-labelledby', titleId);
    });

    it('has aria-describedby when description provided', () => {
      render(<Modal {...defaultProps} description="Description text" />);
      
      const dialog = screen.getByRole('dialog');
      const descId = screen.getByText('Description text').id;
      
      expect(dialog).toHaveAttribute('aria-describedby', descId);
    });

    it('traps focus within modal', async () => {
      render(
        <Modal {...defaultProps}>
          <input data-testid="input1" />
          <input data-testid="input2" />
          <button>Action</button>
        </Modal>
      );
      
      const firstInput = screen.getByTestId('input1');
      const lastButton = screen.getByRole('button', { name: /action/i });
      
      // Focus should cycle within modal
      lastButton.focus();
      await userEvent.tab();
      
      // Should wrap to first focusable element
      expect(firstInput).toHaveFocus();
    });

    it('moves focus to modal when opened', async () => {
      const { rerender } = render(<Modal {...defaultProps} isOpen={false} />);
      
      rerender(<Modal {...defaultProps} isOpen={true} />);
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog.contains(document.activeElement)).toBe(true);
      });
    });

    it('returns focus to trigger when closed', async () => {
      const trigger = document.createElement('button');
      trigger.id = 'trigger';
      document.body.appendChild(trigger);
      trigger.focus();
      
      const { rerender } = render(
        <Modal {...defaultProps} isOpen={true} returnFocusTo="#trigger" />
      );
      
      rerender(<Modal {...defaultProps} isOpen={false} returnFocusTo="#trigger" />);
      
      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
      
      document.body.removeChild(trigger);
    });

    it('announces to screen readers when opened', async () => {
      render(<Modal {...defaultProps} />);
      
      // Role dialog should be announced
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Body Scroll Lock', () => {
    it('prevents body scroll when open', () => {
      render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when closed', () => {
      const { rerender } = render(<Modal {...defaultProps} isOpen={true} />);
      
      rerender(<Modal {...defaultProps} isOpen={false} />);
      
      expect(document.body.style.overflow).not.toBe('hidden');
    });
  });

  describe('Animation', () => {
    it('applies enter animation classes', () => {
      render(<Modal {...defaultProps} />);
      
      const backdrop = screen.getByTestId('modal-backdrop');
      expect(backdrop).toHaveClass('animate-fade-in');
    });

    it('applies dialog animation classes', () => {
      render(<Modal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('animate-scale-in');
    });
  });

  describe('Variants', () => {
    it('renders alert variant', () => {
      render(<Modal {...defaultProps} variant="alert" />);
      
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
    });

    it('renders danger variant', () => {
      render(<Modal {...defaultProps} variant="danger" />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('border-red');
    });
  });

  describe('Loading State', () => {
    it('shows loading overlay when loading', () => {
      render(<Modal {...defaultProps} loading />);
      
      expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
    });

    it('disables close when loading', async () => {
      render(<Modal {...defaultProps} loading />);
      
      await userEvent.keyboard('{Escape}');
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Custom Classes', () => {
    it('accepts custom className for dialog', () => {
      render(<Modal {...defaultProps} className="custom-dialog" />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('custom-dialog');
    });

    it('accepts custom className for backdrop', () => {
      render(<Modal {...defaultProps} backdropClassName="custom-backdrop" />);
      
      const backdrop = screen.getByTestId('modal-backdrop');
      expect(backdrop).toHaveClass('custom-backdrop');
    });
  });
});

import type { Meta, StoryObj } from '@storybook/react';
import { Modal, ConfirmDialog } from './Modal';
import { Button } from './Button';
import { useState } from 'react';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
An accessible modal dialog component with focus trap and keyboard navigation.

## Usage

\`\`\`tsx
import { Modal } from '@/components/Modal';

function Example() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Modal Title">
        Modal content goes here
      </Modal>
    </>
  );
}
\`\`\`

## Accessibility

- Focus is trapped within the modal when open
- Escape key closes the modal
- Click outside closes the modal (optional)
- Focus is returned to trigger element on close
- Uses proper ARIA attributes
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether the modal is open',
    },
    title: {
      control: 'text',
      description: 'The title of the modal',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
      description: 'The size of the modal',
    },
    closeOnOverlayClick: {
      control: 'boolean',
      description: 'Whether clicking the overlay closes the modal',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Whether to show the close button',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive modal example
const ModalTemplate = (args: React.ComponentProps<typeof Modal>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <p>This is the modal content. Click the X button or press Escape to close.</p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setIsOpen(false)}>
            Confirm
          </Button>
        </div>
      </Modal>
    </>
  );
};

export const Default: Story = {
  render: ModalTemplate,
  args: {
    title: 'Modal Title',
  },
};

export const Small: Story = {
  render: ModalTemplate,
  args: {
    title: 'Small Modal',
    size: 'sm',
  },
};

export const Large: Story = {
  render: ModalTemplate,
  args: {
    title: 'Large Modal',
    size: 'lg',
  },
};

export const ExtraLarge: Story = {
  render: ModalTemplate,
  args: {
    title: 'Extra Large Modal',
    size: 'xl',
  },
};

export const FullScreen: Story = {
  render: ModalTemplate,
  args: {
    title: 'Full Screen Modal',
    size: 'full',
  },
};

export const NoCloseButton: Story = {
  render: ModalTemplate,
  args: {
    title: 'No Close Button',
    showCloseButton: false,
  },
};

export const NoOverlayClick: Story = {
  render: ModalTemplate,
  args: {
    title: 'Click Overlay Disabled',
    closeOnOverlayClick: false,
  },
};

// Confirm dialog example
const ConfirmDialogTemplate = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<string>('');

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <Button onClick={() => setIsOpen(true)}>Delete Item</Button>
        {result && <p>Result: {result}</p>}
      </div>
      <ConfirmDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() => {
          setResult('Confirmed!');
          setIsOpen(false);
        }}
        title="Confirm Delete"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
};

export const ConfirmDialogExample: Story = {
  render: ConfirmDialogTemplate,
  parameters: {
    docs: {
      description: {
        story: 'A pre-built confirm dialog for destructive actions.',
      },
    },
  },
};

// Long content modal
const LongContentTemplate = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Long Modal</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Terms of Service">
        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <p key={i} style={{ marginBottom: '1rem' }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
              tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
              quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          ))}
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Decline
          </Button>
          <Button variant="primary" onClick={() => setIsOpen(false)}>
            Accept
          </Button>
        </div>
      </Modal>
    </>
  );
};

export const LongContent: Story = {
  render: LongContentTemplate,
};

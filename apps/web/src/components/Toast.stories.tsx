import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast, ToastContainer } from './Toast';
import { Button } from './Button';

const meta: Meta = {
  title: 'Components/Toast',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Toast notifications for displaying brief messages to users.

## Usage

\`\`\`tsx
import { ToastProvider, useToast } from '@/components/Toast';

function App() {
  return (
    <ToastProvider>
      <MyComponent />
    </ToastProvider>
  );
}

function MyComponent() {
  const toast = useToast();
  
  return (
    <button onClick={() => toast.success('Action completed!')}>
      Show Toast
    </button>
  );
}
\`\`\`

## Features

- Multiple toast types: success, error, warning, info
- Auto-dismiss with configurable duration
- Manual dismiss with close button
- Stacking multiple toasts
- Accessible announcements
        `,
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story: React.ComponentType) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export default meta;

// Toast demo component
const ToastDemo = () => {
  const toast = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Button
          variant="primary"
          onClick={() => toast.success('Operation completed successfully!')}
        >
          Success Toast
        </Button>
        <Button
          variant="danger"
          onClick={() => toast.error('Something went wrong. Please try again.')}
        >
          Error Toast
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.warning('Please review your information.')}
        >
          Warning Toast
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.info('New updates are available.')}
        >
          Info Toast
        </Button>
      </div>
    </div>
  );
};

export const Default: StoryObj = {
  render: () => <ToastDemo />,
};

// Success toast
const SuccessDemo = () => {
  const toast = useToast();

  return (
    <Button
      variant="primary"
      onClick={() => toast.success('Your profile has been updated.')}
    >
      Show Success Toast
    </Button>
  );
};

export const Success: StoryObj = {
  render: () => <SuccessDemo />,
};

// Error toast
const ErrorDemo = () => {
  const toast = useToast();

  return (
    <Button
      variant="danger"
      onClick={() => toast.error('Failed to save changes. Please try again.')}
    >
      Show Error Toast
    </Button>
  );
};

export const Error: StoryObj = {
  render: () => <ErrorDemo />,
};

// Warning toast
const WarningDemo = () => {
  const toast = useToast();

  return (
    <Button
      variant="outline"
      onClick={() => toast.warning('Your session will expire in 5 minutes.')}
    >
      Show Warning Toast
    </Button>
  );
};

export const Warning: StoryObj = {
  render: () => <WarningDemo />,
};

// Info toast
const InfoDemo = () => {
  const toast = useToast();

  return (
    <Button
      variant="secondary"
      onClick={() => toast.info('You have 3 new notifications.')}
    >
      Show Info Toast
    </Button>
  );
};

export const Info: StoryObj = {
  render: () => <InfoDemo />,
};

// Custom duration
const CustomDurationDemo = () => {
  const toast = useToast();

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Button
        onClick={() => toast.success('Quick toast (2s)', 2000)}
      >
        2 Seconds
      </Button>
      <Button
        onClick={() => toast.success('Long toast (10s)', 10000)}
      >
        10 Seconds
      </Button>
      <Button
        onClick={() => toast.success('Persistent toast', 0)}
      >
        No Auto-Dismiss
      </Button>
    </div>
  );
};

export const CustomDuration: StoryObj = {
  render: () => <CustomDurationDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Toast duration can be customized. Set duration to 0 for persistent toasts.',
      },
    },
  },
};

// Stacked toasts
const StackedDemo = () => {
  const toast = useToast();

  const showMultiple = () => {
    toast.success('First notification');
    setTimeout(() => toast.info('Second notification'), 300);
    setTimeout(() => toast.warning('Third notification'), 600);
    setTimeout(() => toast.error('Fourth notification'), 900);
  };

  return (
    <Button onClick={showMultiple}>
      Show Multiple Toasts
    </Button>
  );
};

export const Stacked: StoryObj = {
  render: () => <StackedDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Multiple toasts stack on top of each other.',
      },
    },
  },
};

// Sequential toasts demo
const SequentialToastsDemo = () => {
  const toast = useToast();

  return (
    <Button
      onClick={() => {
        toast.info('Item deleted.');
        // Note: To add undo functionality, implement a custom solution
        // with a manual undo button in your application logic
      }}
    >
      Show Info Toast
    </Button>
  );
};

export const SequentialToasts: StoryObj = {
  render: () => <SequentialToastsDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Toasts can include action buttons for undo or other actions.',
      },
    },
  },
};

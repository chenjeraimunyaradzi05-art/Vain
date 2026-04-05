import type { Meta, StoryObj } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { Input, Textarea, Select, Checkbox } from './Form';

// Type helpers for story render functions
type TextareaArgs = ComponentProps<typeof Textarea>;
type SelectArgs = ComponentProps<typeof Select>;
type CheckboxArgs = ComponentProps<typeof Checkbox>;

const meta: Meta<typeof Input> = {
  title: 'Components/Form',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A collection of accessible form components including Input, Textarea, Select, and Checkbox.

## Usage

\`\`\`tsx
import { Input, Textarea, Select, Checkbox } from '@/components/Form';

function Example() {
  return (
    <form>
      <Input label="Email" type="email" required />
      <Textarea label="Message" rows={4} />
      <Select label="Country" options={[
        { value: 'au', label: 'Australia' },
        { value: 'nz', label: 'New Zealand' },
      ]} />
      <Checkbox label="I agree to terms" />
    </form>
  );
}
\`\`\`

## Accessibility

- All inputs have proper labels associated via htmlFor
- Error states are announced to screen readers
- Required fields are indicated visually and semantically
- Proper focus states for keyboard navigation
        `,
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story: React.ComponentType) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Input>;

// Input stories
export const DefaultInput: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
  },
};

export const RequiredInput: Story = {
  args: {
    label: 'Email',
    type: 'email',
    required: true,
    placeholder: 'you@example.com',
  },
};

export const InputWithError: Story = {
  args: {
    label: 'Email',
    type: 'email',
    error: 'Please enter a valid email address',
    defaultValue: 'invalid-email',
  },
};

export const InputWithHint: Story = {
  args: {
    label: 'Password',
    type: 'password',
    hint: 'Must be at least 8 characters',
  },
};

export const DisabledInput: Story = {
  args: {
    label: 'Email',
    type: 'email',
    disabled: true,
    defaultValue: 'disabled@example.com',
  },
};

// Textarea stories
export const DefaultTextarea: StoryObj<typeof Textarea> = {
  render: (args: TextareaArgs) => <Textarea {...args} />,
  args: {
    label: 'Message',
    placeholder: 'Enter your message...',
    rows: 4,
  },
};

export const TextareaWithError: StoryObj<typeof Textarea> = {
  render: (args: TextareaArgs) => <Textarea {...args} />,
  args: {
    label: 'Message',
    error: 'Message is required',
    rows: 4,
  },
};

// Select stories
export const DefaultSelect: StoryObj<typeof Select> = {
  render: (args: SelectArgs) => <Select {...args} />,
  args: {
    label: 'Country',
    options: [
      { value: '', label: 'Select a country', disabled: true },
      { value: 'au', label: 'Australia' },
      { value: 'nz', label: 'New Zealand' },
      { value: 'us', label: 'United States' },
      { value: 'uk', label: 'United Kingdom' },
    ],
  },
};

export const SelectWithGroups: StoryObj<typeof Select> = {
  render: (args: SelectArgs) => <Select {...args} />,
  args: {
    label: 'Location',
    optionGroups: [
      {
        label: 'Australia',
        options: [
          { value: 'sydney', label: 'Sydney' },
          { value: 'melbourne', label: 'Melbourne' },
          { value: 'brisbane', label: 'Brisbane' },
        ],
      },
      {
        label: 'New Zealand',
        options: [
          { value: 'auckland', label: 'Auckland' },
          { value: 'wellington', label: 'Wellington' },
        ],
      },
    ],
  },
};

export const SelectWithError: StoryObj<typeof Select> = {
  render: (args: SelectArgs) => <Select {...args} />,
  args: {
    label: 'Country',
    error: 'Please select a country',
    options: [
      { value: '', label: 'Select a country' },
      { value: 'au', label: 'Australia' },
      { value: 'nz', label: 'New Zealand' },
    ],
  },
};

// Checkbox stories
export const DefaultCheckbox: StoryObj<typeof Checkbox> = {
  render: (args: CheckboxArgs) => <Checkbox {...args} />,
  args: {
    label: 'I agree to the terms and conditions',
  },
};

export const CheckedCheckbox: StoryObj<typeof Checkbox> = {
  render: (args: CheckboxArgs) => <Checkbox {...args} />,
  args: {
    label: 'Subscribe to newsletter',
    defaultChecked: true,
  },
};

export const CheckboxWithDescription: StoryObj<typeof Checkbox> = {
  render: (args: CheckboxArgs) => <Checkbox {...args} />,
  args: {
    label: 'Enable notifications',
    description: 'Receive email notifications about your applications',
  },
};

export const CheckboxWithError: StoryObj<typeof Checkbox> = {
  render: (args: CheckboxArgs) => <Checkbox {...args} />,
  args: {
    label: 'I agree to the terms',
    error: 'You must agree to the terms to continue',
  },
};

export const DisabledCheckbox: StoryObj<typeof Checkbox> = {
  render: (args: CheckboxArgs) => <Checkbox {...args} />,
  args: {
    label: 'This option is disabled',
    disabled: true,
  },
};

// Form example
export const CompleteForm: Story = {
  render: () => (
    <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <Input label="Full Name" required placeholder="John Doe" />
      <Input label="Email" type="email" required placeholder="john@example.com" />
      <Select
        label="Role"
        required
        options={[
          { value: '', label: 'Select a role' },
          { value: 'candidate', label: 'Job Seeker' },
          { value: 'employer', label: 'Employer' },
          { value: 'mentor', label: 'Mentor' },
        ]}
      />
      <Textarea label="Bio" helperText="Tell us about yourself" rows={3} />
      <Checkbox label="I agree to the terms and conditions" required />
      <Checkbox label="Subscribe to newsletter" description="Receive updates about new opportunities" />
    </form>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A complete form example showing all form components together.',
      },
    },
  },
};

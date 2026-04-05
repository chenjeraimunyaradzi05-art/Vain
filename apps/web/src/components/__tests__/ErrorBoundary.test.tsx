import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

function ProblemChild() {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders fallback UI when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onWindowError = (event: Event) => {
      event.preventDefault();
    };

    window.addEventListener('error', onWindowError);

    render(
      <ErrorBoundary variant="minimal">
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

    window.removeEventListener('error', onWindowError);
    spy.mockRestore();
  });
});

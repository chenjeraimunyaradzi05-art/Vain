/**
 * FeaturedJobs Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FeaturedJobs from '../FeaturedJobs';

// Mock fetch
const mockJobs = [];

describe('FeaturedJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders partnerships header', () => {
    render(<FeaturedJobs />);

    expect(screen.getByText(/Partnerships & Advertising/i)).toBeInTheDocument();
  });

  it('renders active ad content', () => {
    render(<FeaturedJobs />);

    expect(screen.getByText('Google Career Certificates')).toBeInTheDocument();
    expect(screen.getByText(/Sponsored by Google/i)).toBeInTheDocument();
  });

  it('renders slide controls', () => {
    render(<FeaturedJobs />);

    expect(screen.getByRole('button', { name: 'Go to slide 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to slide 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to slide 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to slide 4' })).toBeInTheDocument();
  });

  it('changes active ad when selecting a slide', () => {
    render(<FeaturedJobs />);

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));
    expect(screen.getByText('Westpac Indigenous Scholarships')).toBeInTheDocument();
  });

  it('auto-rotates ads over time', () => {
    render(<FeaturedJobs />);

    expect(screen.getByText('Google Career Certificates')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText('Westpac Indigenous Scholarships')).toBeInTheDocument();
  });
});

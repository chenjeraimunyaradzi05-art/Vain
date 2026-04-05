/**
 * SearchBar Component Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from '../SearchBar';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('SearchBar', () => {
  it('renders search input', () => {
    render(<SearchBar onSearch={() => {}} showSuggestions={false} />);
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<SearchBar onSearch={() => {}} placeholder="Search jobs..." showSuggestions={false} />);
    expect(screen.getByPlaceholderText('Search jobs...')).toBeInTheDocument();
  });

  it('calls onSearch when form submitted', async () => {
    const handleSearch = vi.fn();
    render(<SearchBar onSearch={handleSearch} showSuggestions={false} />);

    const input = screen.getByLabelText('Search');
    await userEvent.type(input, 'developer');
    
    fireEvent.submit(input.closest('form') || input);
    
    expect(handleSearch).toHaveBeenCalledWith('developer');
  });

  it('calls onSearch when Enter is pressed', async () => {
    const handleSearch = vi.fn();
    render(<SearchBar onSearch={handleSearch} showSuggestions={false} />);

    const input = screen.getByLabelText('Search');
    await userEvent.type(input, 'designer{enter}');
    
    expect(handleSearch).toHaveBeenCalledWith('designer');
  });

  it('clears input when clear button clicked', async () => {
    const { container } = render(<SearchBar onSearch={() => {}} showSuggestions={false} />);

    const input = screen.getByLabelText('Search');
    await userEvent.type(input, 'test query');
    
    expect(input).toHaveValue('test query');

    const clearButton = container.querySelector('form button[type="button"]');
    expect(clearButton).toBeInTheDocument();
    await userEvent.click(clearButton as Element);
    expect(input).toHaveValue('');
  });

  it('shows search icon', () => {
    const { container } = render(<SearchBar onSearch={() => {}} showSuggestions={false} />);
    
    // Check for search icon (SVG or icon element)
    const icon = container.querySelector('svg') || 
                 container.querySelector('[data-testid="search-icon"]');
    expect(icon).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SearchBar onSearch={() => {}} className="custom-search" showSuggestions={false} />
    );
    
    expect(container.firstChild).toHaveClass('custom-search');
  });
});

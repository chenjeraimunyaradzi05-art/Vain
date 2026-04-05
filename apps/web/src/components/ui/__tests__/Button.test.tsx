/**
 * Button Component Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies primary variant by default', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole('button');
    expect(button.style.background).toContain('linear-gradient');
  });

  it('applies secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button.style.background).toMatch(/rgba\(139,\s*92,\s*246,\s*0\.1\)/);
    expect(button.style.border).toContain('1px solid');
  });

  it('applies outline variant', () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole('button');
    expect(button.style.background).toBe('transparent');
    expect(button.style.border).toContain('1px solid');
  });

  it('applies ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole('button');
    expect(button.style.background).toBe('transparent');
    expect(['', 'none'].includes(button.style.borderStyle)).toBe(true);
  });

  it('applies destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button.style.background).toMatch(/#ef4444|rgb\(239,\s*68,\s*68\)/i);
  });

  it('applies different sizes', () => {
    const { rerender, container } = render(<Button size="sm">Small</Button>);
    expect((container.firstChild as HTMLButtonElement).style.height).toBe('2rem');

    rerender(<Button size="lg">Large</Button>);
    expect((container.firstChild as HTMLButtonElement).style.height).toBe('3rem');
  });

  it('shows loading state', () => {
    const { container } = render(<Button isLoading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders as a link when asChild with anchor', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/test');
  });

  it('applies custom className', () => {
    const { container } = render(<Button className="custom-class">Custom</Button>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders with icon', () => {
    render(
      <Button>
        <span data-testid="icon">🔍</span>
        Search
      </Button>
    );
    
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('supports type attribute', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('renders full width when specified', () => {
    const { container } = render(<Button fullWidth>Full Width</Button>);
    expect((container.firstChild as HTMLButtonElement).style.width).toBe('100%');
  });
});

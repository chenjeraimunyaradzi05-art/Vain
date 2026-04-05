/**
 * HeaderNavigation Component Tests
 * Unit tests for the header navigation component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock AuthContext
const mockUser = { id: '1', email: 'test@example.com', userType: 'member' };
let mockIsAuthenticated = false;
const mockLogout = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockIsAuthenticated ? mockUser : null,
    isAuthenticated: mockIsAuthenticated,
    logout: mockLogout,
  }),
}));

// Import after mocks
import HeaderNavigation from '@/components/HeaderNavigation';

describe('HeaderNavigation', () => {
  beforeEach(() => {
    mockIsAuthenticated = false;
    mockLogout.mockClear();
  });

  describe('Logo', () => {
    it('renders the logo image', () => {
      render(<HeaderNavigation />);
      
      const logo = screen.getByRole('img', { name: /ngurra pathways/i });
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/brand/ngurra-logo.png');
    });

    it('logo links to homepage', () => {
      render(<HeaderNavigation />);
      
      const logoLink = screen.getByRole('link', { name: /ngurra pathways/i });
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });

  describe('Navigation Links', () => {
    it('renders public navigation when logged out', () => {
      render(<HeaderNavigation />);
      
      expect(screen.getByRole('link', { name: /jobs/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /courses/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /mentorship/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /community/i })).toBeInTheDocument();
    });

    it('renders member navigation when logged in as member', () => {
      mockIsAuthenticated = true;
      render(<HeaderNavigation />);
      
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    });
  });

  describe('Auth Buttons', () => {
    it('shows sign in and sign up when logged out', () => {
      render(<HeaderNavigation />);
      
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    });

    it('shows logout button when logged in', () => {
      mockIsAuthenticated = true;
      render(<HeaderNavigation />);
      
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
    });

    it('calls logout when logout button is clicked', async () => {
      mockIsAuthenticated = true;
      render(<HeaderNavigation />);
      
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await userEvent.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mobile Menu', () => {
    it('mobile menu button has proper ARIA attributes', () => {
      render(<HeaderNavigation />);
      
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      expect(menuButton).toHaveAttribute('aria-controls', 'mobile-menu');
    });

    it('toggles mobile menu on button click', async () => {
      render(<HeaderNavigation />);
      
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      
      // Menu should be closed initially
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      
      // Click to open
      await userEvent.click(menuButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      
      // Click to close
      await userEvent.click(menuButton);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper landmark roles', () => {
      render(<HeaderNavigation />);
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /main/i })).toBeInTheDocument();
    });

    it('logo has screen reader text', () => {
      render(<HeaderNavigation />);
      
      expect(screen.getByText('Ngurra Pathways')).toBeInTheDocument();
    });
  });
});

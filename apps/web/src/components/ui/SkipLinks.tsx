'use client';

import React from 'react';

/**
 * Skip Links Component
 * 
 * Accessibility component that provides keyboard-accessible skip links
 * for navigating to main content areas. Essential for screen reader users
 * and keyboard navigation.
 * 
 * Ngurra Pathways - Celestial Precious Stone Theme
 */

interface SkipLinkItem {
  id: string;
  label: string;
}

interface SkipLinksProps {
  /** Custom links to skip to specific sections */
  links?: SkipLinkItem[];
  /** Additional CSS classes */
  className?: string;
}

const defaultLinks: SkipLinkItem[] = [
  { id: 'main-content', label: 'Skip to main content' },
  { id: 'navigation', label: 'Skip to navigation' },
  { id: 'search', label: 'Skip to search' },
];

export function SkipLinks({ links = defaultLinks, className = '' }: SkipLinksProps) {
  return (
    <div
      role="navigation"
      aria-label="Skip navigation"
      className={`skip-links ${className}`}
    >
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 
            focus:z-[9999] focus:px-4 focus:py-2 focus:bg-gold focus:text-cosmic-darker 
            focus:font-semibold focus:rounded-br-lg focus:shadow-lg focus:outline-none
            focus:ring-2 focus:ring-gold focus:ring-offset-2
            dark:focus:bg-gold dark:focus:text-cosmic-darker
            cosmic:focus:bg-gold cosmic:focus:text-cosmic-darker
            transition-all duration-200"
          onClick={(e) => {
            e.preventDefault();
            const target = document.getElementById(link.id);
            if (target) {
              target.focus();
              target.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

/**
 * Main Content Wrapper
 * 
 * Use this component to wrap your main content area.
 * Provides proper focus management and landmark navigation.
 */
export function MainContent({ 
  children, 
  id = 'main-content',
  className = '',
}: { 
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <main
      id={id}
      tabIndex={-1}
      role="main"
      className={`outline-none ${className}`}
      aria-label="Main content"
    >
      {children}
    </main>
  );
}

/**
 * Navigation Landmark
 * 
 * Wraps navigation content with proper accessibility attributes.
 */
export function NavigationLandmark({
  children,
  id = 'navigation',
  label = 'Main navigation',
  className = '',
}: {
  children: React.ReactNode;
  id?: string;
  label?: string;
  className?: string;
}) {
  return (
    <nav
      id={id}
      tabIndex={-1}
      role="navigation"
      aria-label={label}
      className={`outline-none ${className}`}
    >
      {children}
    </nav>
  );
}

/**
 * Search Landmark
 * 
 * Wraps search content with proper accessibility attributes.
 */
export function SearchLandmark({
  children,
  id = 'search',
  className = '',
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <search
      id={id}
      tabIndex={-1}
      role="search"
      aria-label="Site search"
      className={`outline-none ${className}`}
    >
      {children}
    </search>
  );
}

/**
 * Content Section with ID
 * 
 * Creates a focusable section that skip links can target.
 */
export function Section({
  children,
  id,
  label,
  className = '',
  as: Component = 'section',
}: {
  children: React.ReactNode;
  id: string;
  label: string;
  className?: string;
  as?: React.ElementType;
}) {
  return (
    <Component
      id={id}
      tabIndex={-1}
      aria-label={label}
      className={`outline-none ${className}`}
    >
      {children}
    </Component>
  );
}

export default SkipLinks;

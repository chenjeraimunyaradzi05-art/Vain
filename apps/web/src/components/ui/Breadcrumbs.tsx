/* eslint-disable no-undef */
'use client';
import Link from 'next/link';
import React from 'react';

type BreadcrumbNode = React.ReactNode;

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: BreadcrumbNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: BreadcrumbNode;
  variant?: 'default' | 'cosmic';
  className?: string;
}

export function Breadcrumbs({
  items,
  separator,
  variant = 'default',
  className = '',
}: BreadcrumbsProps) {
  const variantClasses = {
    default: {
      container: 'text-sm',
      link: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
      current: 'text-gray-900 dark:text-white font-medium',
      separator: 'text-gray-400 dark:text-gray-500',
    },
    cosmic: {
      container: 'text-sm',
      link: 'text-gray-400 hover:text-[#FFD700] transition-colors',
      current: 'text-[#FFD700] font-medium',
      separator: 'text-gray-600',
    },
  };

  const styles = variantClasses[variant];

  const defaultSeparator = (
    <svg className={`w-4 h-4 ${styles.separator}`} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );

  return (
    <nav className={`${styles.container} ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.label} className="flex items-center">
              {index > 0 && (
                <span className="mx-2" aria-hidden="true">
                  {separator || defaultSeparator}
                </span>
              )}

              {isLast || !item.href ? (
                <span
                  className={`flex items-center gap-1.5 ${isLast ? styles.current : styles.link}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon}
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className={`flex items-center gap-1.5 ${styles.link}`}>
                  <>
                    {item.icon}
                    {item.label}
                  </>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Page Header with Breadcrumbs
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: BreadcrumbNode;
  variant?: 'default' | 'cosmic';
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  action,
  variant = 'default',
  className = '',
}: PageHeaderProps) {
  const variantClasses = {
    default: {
      title: 'text-2xl font-bold text-gray-900 dark:text-white',
      subtitle: 'text-gray-600 dark:text-gray-400',
    },
    cosmic: {
      title:
        'text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#50C878] to-[#FFD700]',
      subtitle: 'text-gray-400',
    },
  };

  const styles = variantClasses[variant];

  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} variant={variant} className="mb-4" />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={`mt-1 ${styles.subtitle}`}>{subtitle}</p>}
        </div>

        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}

// Common breadcrumb patterns
export function HomeBreadcrumb(): BreadcrumbItem {
  return {
    label: 'Home',
    href: '/',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
  };
}

export function DashboardBreadcrumb(): BreadcrumbItem {
  return {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
      </svg>
    ),
  };
}

// Back Button with optional breadcrumb style
interface BackButtonProps {
  href?: string;
  onClick?: () => void;
  label?: string;
  variant?: 'default' | 'cosmic';
  className?: string;
}

export function BackButton({
  href,
  onClick,
  label = 'Back',
  variant = 'default',
  className = '',
}: BackButtonProps) {
  const variantClasses = {
    default: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
    cosmic: 'text-gray-400 hover:text-[#FFD700]',
  };

  const content = (
    <>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      <span>{label}</span>
    </>
  );

  const classes = `
    inline-flex items-center gap-2 text-sm font-medium
    transition-colors duration-200
    ${variantClasses[variant]}
    ${className}
  `;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

export default Breadcrumbs;

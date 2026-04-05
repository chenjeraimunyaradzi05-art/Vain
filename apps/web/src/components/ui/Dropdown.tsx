'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  placement?: DropdownPlacement;
  offset?: number;
  closeOnClick?: boolean;
  className?: string;
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}

interface DropdownDividerProps {
  className?: string;
}

interface DropdownLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function Dropdown({
  trigger,
  children,
  placement = 'bottom-start',
  offset = 4,
  closeOnClick = true,
  className = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !menuRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let top = 0;
    let left = 0;

    // Calculate vertical position
    if (placement.startsWith('top')) {
      top = triggerRect.top - menuRect.height - offset;
    } else {
      top = triggerRect.bottom + offset;
    }

    // Calculate horizontal position
    if (placement.endsWith('start')) {
      left = triggerRect.left;
    } else if (placement.endsWith('end')) {
      left = triggerRect.right - menuRect.width;
    } else {
      left = triggerRect.left + (triggerRect.width - menuRect.width) / 2;
    }

    // Ensure menu stays within viewport
    if (top + menuRect.height > viewportHeight) {
      top = triggerRect.top - menuRect.height - offset;
    }
    if (top < 0) {
      top = triggerRect.bottom + offset;
    }
    if (left + menuRect.width > viewportWidth) {
      left = viewportWidth - menuRect.width - 8;
    }
    if (left < 0) {
      left = 8;
    }

    setPosition({ top, left });
  }, [placement, offset]);

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true);
    }

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleMenuClick = () => {
    if (closeOnClick) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-block"
      >
        {trigger}
      </div>

      {isOpen && typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className={`
              fixed z-50 min-w-[180px]
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-lg shadow-lg
              py-1
              animate-in fade-in-0 zoom-in-95 duration-200
              ${className}
            `}
            style={{
              top: position.top,
              left: position.left,
            }}
            onClick={handleMenuClick}
            role="menu"
          >
            {children}
          </div>,
          document.body
        )
      }
    </>
  );
}

export function DropdownItem({
  children,
  onClick,
  href,
  icon,
  disabled = false,
  danger = false,
  className = '',
}: DropdownItemProps) {
  const baseClasses = `
    w-full flex items-center gap-3 px-4 py-2 text-sm
    transition-colors duration-150
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${danger 
      ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20' 
      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
    }
    ${className}
  `;

  const content = (
    <>
      {icon && <span className="flex-shrink-0 w-4 h-4">{icon}</span>}
      <span className="flex-1 text-left">{children}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} className={baseClasses} role="menuitem">
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={baseClasses}
      role="menuitem"
      disabled={disabled}
    >
      {content}
    </button>
  );
}

export function DropdownDivider({ className = '' }: DropdownDividerProps) {
  return (
    <div className={`my-1 border-t border-gray-200 dark:border-gray-700 ${className}`} role="separator" />
  );
}

export function DropdownLabel({ children, className = '' }: DropdownLabelProps) {
  return (
    <div className={`px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className}`}>
      {children}
    </div>
  );
}

// Action Menu - commonly used pattern
interface ActionMenuItem {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

interface ActionMenuProps {
  items: (ActionMenuItem | 'divider')[];
  variant?: 'default' | 'cosmic';
  className?: string;
}

export function ActionMenu({ items, variant = 'default', className = '' }: ActionMenuProps) {
  const triggerClasses = {
    default: 'p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400',
    cosmic: 'p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white',
  };

  return (
    <Dropdown
      trigger={
        <button className={triggerClasses[variant]} aria-label="Actions">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      }
      className={className}
    >
      {items.map((item, index) => {
        if (item === 'divider') {
          return <DropdownDivider key={`divider-${index}`} />;
        }
        return (
          <DropdownItem
            key={item.label}
            onClick={item.onClick}
            href={item.href}
            icon={item.icon}
            disabled={item.disabled}
            danger={item.danger}
          >
            {item.label}
          </DropdownItem>
        );
      })}
    </Dropdown>
  );
}

// Select Dropdown - for selection from options
interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SelectDropdownProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  variant?: 'default' | 'cosmic';
  className?: string;
}

export function SelectDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  variant = 'default',
  className = '',
}: SelectDropdownProps) {
  const selectedOption = options.find(o => o.value === value);

  const triggerClasses = {
    default: `
      w-full flex items-center justify-between gap-2 px-4 py-2
      bg-white dark:bg-gray-800
      border border-gray-300 dark:border-gray-600
      rounded-lg text-sm
      hover:border-gray-400 dark:hover:border-gray-500
      focus:outline-none focus:ring-2 focus:ring-blue-500
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    cosmic: `
      w-full flex items-center justify-between gap-2 px-4 py-2
      bg-white/5
      border border-[#FFD700]/20
      rounded-lg text-sm text-white
      hover:border-[#FFD700]/40
      focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
  };

  return (
    <Dropdown
      trigger={
        <button
          type="button"
          className={`${triggerClasses[variant]} ${className}`}
          disabled={disabled}
        >
          <span className={selectedOption ? '' : 'text-gray-400'}>
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                {selectedOption.label}
              </span>
            ) : placeholder}
          </span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      }
    >
      {options.map((option) => (
        <DropdownItem
          key={option.value}
          onClick={() => onChange(option.value)}
          icon={option.icon}
          disabled={option.disabled}
        >
          <span className="flex items-center justify-between w-full">
            {option.label}
            {option.value === value && (
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

export default Dropdown;

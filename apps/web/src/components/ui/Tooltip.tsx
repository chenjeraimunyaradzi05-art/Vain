'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
type TooltipVariant = 'default' | 'dark' | 'light' | 'cosmic';

interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  placement?: TooltipPlacement;
  variant?: TooltipVariant;
  delay?: number;
  offset?: number;
  disabled?: boolean;
  className?: string;
}

interface PopoverProps {
  children: React.ReactElement;
  content: React.ReactNode;
  placement?: TooltipPlacement;
  variant?: TooltipVariant;
  trigger?: 'click' | 'hover';
  closeOnClickOutside?: boolean;
  className?: string;
}

const variantClasses: Record<TooltipVariant, string> = {
  default: 'bg-gray-900 text-white dark:bg-gray-700',
  dark: 'bg-black text-white',
  light: 'bg-white text-gray-900 border border-gray-200 shadow-lg',
  cosmic: 'bg-gradient-to-r from-[#1A0F2E] to-[#2D1B69] text-white border border-[#FFD700]/30',
};

export function Tooltip({
  children,
  content,
  placement = 'top',
  variant = 'default',
  delay = 300,
  offset = 8,
  disabled = false,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - offset;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + offset;
        break;
    }

    // Keep tooltip within viewport
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    if (left < 8) left = 8;
    if (left + tooltipRect.width > viewport.width - 8) {
      left = viewport.width - tooltipRect.width - 8;
    }
    if (top < 8) top = 8;
    if (top + tooltipRect.height > viewport.height - 8) {
      top = viewport.height - tooltipRect.height - 8;
    }

    setPosition({ top, left });
  }, [placement, offset]);

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
    }

    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isVisible, calculatePosition]);

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const arrowClasses: Record<TooltipPlacement, string> = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-current border-x-transparent border-b-transparent',
    bottom:
      'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-current border-x-transparent border-t-transparent',
    left: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-l-current border-y-transparent border-r-transparent',
    right:
      'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-r-current border-y-transparent border-l-transparent',
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-flex"
      >
        {children}
      </span>

      {isVisible &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className={`
              fixed z-50 px-3 py-2 text-sm rounded-lg
              pointer-events-none
              animate-in fade-in-0 zoom-in-95 duration-150
              ${variantClasses[variant]}
              ${className}
            `}
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            {content}
            <span
              className={`absolute w-0 h-0 border-4 ${arrowClasses[placement]}`}
              style={{
                borderColor:
                  variant === 'cosmic' ? '#1A0F2E' : variant === 'light' ? 'white' : '#1f2937',
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

export function Popover({
  children,
  content,
  placement = 'bottom',
  variant = 'light',
  trigger = 'click',
  closeOnClickOutside = true,
  className = '',
}: PopoverProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const offset = 8;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top - popoverRect.height - offset;
        left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
        left = triggerRect.left - popoverRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
        left = triggerRect.right + offset;
        break;
    }

    // Keep popover within viewport
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    if (left < 8) left = 8;
    if (left + popoverRect.width > viewport.width - 8)
      left = viewport.width - popoverRect.width - 8;
    if (top < 8) top = 8;
    if (top + popoverRect.height > viewport.height - 8)
      top = viewport.height - popoverRect.height - 8;

    setPosition({ top, left });
  }, [placement]);

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
    }

    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isVisible, calculatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isVisible || !closeOnClickOutside) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, closeOnClickOutside]);

  const handleTrigger = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  return (
    <>
      <span
        ref={triggerRef}
        onClick={handleTrigger}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex"
      >
        {children}
      </span>

      {isVisible &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            className={`
              fixed z-50 rounded-lg shadow-xl
              animate-in fade-in-0 zoom-in-95 duration-200
              ${variantClasses[variant]}
              ${className}
            `}
            style={{
              top: position.top,
              left: position.left,
            }}
            onMouseEnter={trigger === 'hover' ? handleMouseEnter : undefined}
            onMouseLeave={trigger === 'hover' ? handleMouseLeave : undefined}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}

export default Tooltip;

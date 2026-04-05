'use client';

/**
 * Keyboard Navigation Enhancement Component (Step 92)
 * 
 * A hook and wrapper component to enhance keyboard navigation
 * throughout the application, ensuring WCAG 2.1 compliance.
 */

import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Hook for managing focus trap within a modal or dialog
 */
export function useFocusTrap(isActive = true) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
    
    // Focus first element on mount
    firstElement?.focus();
    
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
  
  return containerRef;
}

/**
 * Hook for roving tabindex navigation (e.g., toolbars, tab lists)
 */
export function useRovingTabIndex(items, options = {}) {
  const { orientation = 'horizontal', loop = true } = options;
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const elements = Array.from(container.querySelectorAll('[data-roving-item]'));
    
    if (elements.length === 0) return;
    
    // Set initial tabindex
    elements.forEach((el, i) => {
      el.setAttribute('tabindex', i === 0 ? '0' : '-1');
    });
    
    function handleKeyDown(e) {
      const currentIndex = elements.findIndex(el => el === document.activeElement);
      if (currentIndex === -1) return;
      
      let nextIndex = currentIndex;
      const isHorizontal = orientation === 'horizontal';
      
      switch (e.key) {
        case isHorizontal ? 'ArrowRight' : 'ArrowDown':
          e.preventDefault();
          nextIndex = loop 
            ? (currentIndex + 1) % elements.length
            : Math.min(currentIndex + 1, elements.length - 1);
          break;
          
        case isHorizontal ? 'ArrowLeft' : 'ArrowUp':
          e.preventDefault();
          nextIndex = loop
            ? (currentIndex - 1 + elements.length) % elements.length
            : Math.max(currentIndex - 1, 0);
          break;
          
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
          
        case 'End':
          e.preventDefault();
          nextIndex = elements.length - 1;
          break;
          
        default:
          return;
      }
      
      // Update tabindex and focus
      elements[currentIndex].setAttribute('tabindex', '-1');
      elements[nextIndex].setAttribute('tabindex', '0');
      elements[nextIndex].focus();
    }
    
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [orientation, loop]);
  
  return containerRef;
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcut(key, callback, options = {}) {
  const { ctrl = false, alt = false, shift = false, meta = false } = options;
  
  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        e.ctrlKey === ctrl &&
        e.altKey === alt &&
        e.shiftKey === shift &&
        e.metaKey === meta
      ) {
        e.preventDefault();
        callback(e);
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, ctrl, alt, shift, meta]);
}

/**
 * Skip Link Component - must be first focusable element on page
 */
export function SkipLink({ href = '#main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      {children}
    </a>
  );
}

/**
 * Announce to screen readers (live region)
 */
export function useAnnounce() {
  const announce = useCallback((message, priority = 'polite') => {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', priority);
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    el.textContent = message;
    
    document.body.appendChild(el);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(el);
    }, 1000);
  }, []);
  
  return announce;
}

/**
 * Accessible Modal Wrapper
 */
export function AccessibleModal({ isOpen, onClose, title, children }) {
  const modalRef = useFocusTrap(isOpen);
  
  useKeyboardShortcut('Escape', () => {
    if (isOpen) onClose();
  });
  
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      // Set aria-hidden on main content
      const main = document.querySelector('main');
      if (main) main.setAttribute('aria-hidden', 'true');
    } else {
      document.body.style.overflow = '';
      const main = document.querySelector('main');
      if (main) main.removeAttribute('aria-hidden');
    }
    
    return () => {
      document.body.style.overflow = '';
      const main = document.querySelector('main');
      if (main) main.removeAttribute('aria-hidden');
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="modal-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Accessible Tabs Component
 */
export function AccessibleTabs({ tabs, activeTab, onTabChange, children }) {
  const tabListRef = useRovingTabIndex(tabs, { orientation: 'horizontal' });
  
  return (
    <div>
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Tabs"
        className="flex border-b"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            data-roving-item
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map(tab => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          tabIndex={0}
        >
          {activeTab === tab.id && children}
        </div>
      ))}
    </div>
  );
}

/**
 * Accessible Dropdown Menu
 */
export function AccessibleDropdown({ trigger, items, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  
  useKeyboardShortcut('Escape', () => setIsOpen(false));
  
  function handleKeyDown(e) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    
    const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]');
    const currentIndex = Array.from(menuItems || []).findIndex(
      el => el === document.activeElement
    );
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < menuItems.length - 1) {
          menuItems[currentIndex + 1].focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          menuItems[currentIndex - 1].focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        menuItems[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        menuItems[menuItems.length - 1]?.focus();
        break;
    }
  }
  
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector('[role="menuitem"]');
      firstItem?.focus();
    }
  }, [isOpen]);
  
  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
      >
        {trigger}
      </button>
      
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg min-w-[160px] py-1 z-10"
        >
          {items.map((item, index) => (
            <button
              key={index}
              role="menuitem"
              onClick={() => {
                onSelect(item);
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default {
  SkipLink,
  AccessibleModal,
  AccessibleTabs,
  AccessibleDropdown,
  useFocusTrap,
  useRovingTabIndex,
  useKeyboardShortcut,
  useAnnounce,
};

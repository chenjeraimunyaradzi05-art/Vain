/**
 * Accessibility Hook Tests
 * Unit tests for accessibility utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useFocusTrap,
  useArrowNavigation,
  useAnnouncer,
  useReducedMotion,
  useKeyboardShortcuts,
  useFocusVisible,
  useRovingTabIndex,
  announcePolite,
  announceAssertive,
} from '@/hooks/useAccessibility';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <button id="first">First</button>
      <input id="middle" type="text" />
      <button id="last">Last</button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should trap focus within container', () => {
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, { enabled: true }));

    const first = container.querySelector('#first') as HTMLElement;
    const last = container.querySelector('#last') as HTMLElement;

    // Focus last element
    last.focus();

    // Tab should wrap to first
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    container.dispatchEvent(tabEvent);

    // Focus should be on first focusable element
    expect(document.activeElement).toBe(first);
  });

  it('should handle shift+tab at start', () => {
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, { enabled: true }));

    const first = container.querySelector('#first') as HTMLElement;
    const last = container.querySelector('#last') as HTMLElement;

    // Focus first element
    first.focus();

    // Shift+Tab should wrap to last
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    container.dispatchEvent(tabEvent);

    expect(document.activeElement).toBe(last);
  });

  it('should restore focus on unmount', () => {
    const outsideButton = document.createElement('button');
    document.body.appendChild(outsideButton);
    outsideButton.focus();

    const ref = { current: container };
    const { unmount } = renderHook(() => 
      useFocusTrap(ref, { enabled: true, returnFocus: true })
    );

    // Focus moves inside trap
    const first = container.querySelector('#first') as HTMLElement;
    first.focus();

    unmount();

    // Focus should return to original element
    expect(document.activeElement).toBe(outsideButton);

    document.body.removeChild(outsideButton);
  });

  it('should not trap when disabled', () => {
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, { enabled: false }));

    const last = container.querySelector('#last') as HTMLElement;
    last.focus();

    // Tab should not be trapped
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    Object.defineProperty(tabEvent, 'defaultPrevented', { value: false });

    container.dispatchEvent(tabEvent);

    // Event should not be prevented (focus not trapped)
    expect(tabEvent.defaultPrevented).toBe(false);
  });
});

describe('useArrowNavigation', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <button data-index="0">Item 1</button>
      <button data-index="1">Item 2</button>
      <button data-index="2">Item 3</button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should navigate with arrow keys', () => {
    const items = container.querySelectorAll('button');
    const { result } = renderHook(() => 
      useArrowNavigation({ items: Array.from(items) as HTMLElement[] })
    );

    expect(result.current.activeIndex).toBe(0);

    act(() => {
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      container.dispatchEvent(downEvent);
    });

    expect(result.current.activeIndex).toBe(1);
  });

  it('should wrap at boundaries', () => {
    const items = container.querySelectorAll('button');
    const { result } = renderHook(() => 
      useArrowNavigation({ items: Array.from(items) as HTMLElement[], wrap: true })
    );

    act(() => {
      result.current.setActiveIndex(2);
    });

    act(() => {
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      container.dispatchEvent(downEvent);
    });

    expect(result.current.activeIndex).toBe(0);
  });

  it('should support horizontal navigation', () => {
    const items = container.querySelectorAll('button');
    const { result } = renderHook(() => 
      useArrowNavigation({ items: Array.from(items) as HTMLElement[], orientation: 'horizontal' })
    );

    act(() => {
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      container.dispatchEvent(rightEvent);
    });

    expect(result.current.activeIndex).toBe(1);
  });

  it('should support home/end keys', () => {
    const items = container.querySelectorAll('button');
    const { result } = renderHook(() => 
      useArrowNavigation({ items: Array.from(items) as HTMLElement[] })
    );

    act(() => {
      const endEvent = new KeyboardEvent('keydown', { key: 'End' });
      container.dispatchEvent(endEvent);
    });

    expect(result.current.activeIndex).toBe(2);

    act(() => {
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
      container.dispatchEvent(homeEvent);
    });

    expect(result.current.activeIndex).toBe(0);
  });
});

describe('useAnnouncer', () => {
  describe('polite announcements', () => {
    it('should create live region for announcements', () => {
      const { result } = renderHook(() => useAnnouncer());

      act(() => {
        result.current.announce('Hello world');
      });

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeDefined();
      expect(liveRegion?.textContent).toBe('Hello world');
    });

    it('should clear announcement after delay', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useAnnouncer());

      act(() => {
        result.current.announce('Temporary message');
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toBe('');

      vi.useRealTimers();
    });
  });

  describe('assertive announcements', () => {
    it('should use assertive politeness for urgent messages', () => {
      const { result } = renderHook(() => useAnnouncer());

      act(() => {
        result.current.announce('Error occurred!', 'assertive');
      });

      const liveRegion = document.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeDefined();
    });
  });
});

describe('announcePolite and announceAssertive', () => {
  it('should create polite announcement', () => {
    announcePolite('Items loaded');
    
    const region = document.querySelector('[aria-live="polite"]');
    expect(region?.textContent).toBe('Items loaded');
  });

  it('should create assertive announcement', () => {
    announceAssertive('Error: Connection lost');
    
    const region = document.querySelector('[aria-live="assertive"]');
    expect(region?.textContent).toBe('Error: Connection lost');
  });
});

describe('useReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('should detect reduced motion preference', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('should return false when no preference', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('should update on preference change', () => {
    let listener: ((e: any) => void) | null = null;

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((_, cb) => { listener = cb; }),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);

    act(() => {
      listener?.({ matches: true });
    });

    expect(result.current).toBe(true);
  });
});

describe('useKeyboardShortcuts', () => {
  it('should register keyboard shortcuts', () => {
    const handler = vi.fn();

    renderHook(() => 
      useKeyboardShortcuts({
        'ctrl+s': handler,
      })
    );

    const event = new KeyboardEvent('keydown', { 
      key: 's', 
      ctrlKey: true 
    });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  it('should handle multiple modifiers', () => {
    const handler = vi.fn();

    renderHook(() => 
      useKeyboardShortcuts({
        'ctrl+shift+p': handler,
      })
    );

    const event = new KeyboardEvent('keydown', { 
      key: 'p', 
      ctrlKey: true,
      shiftKey: true,
    });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  it('should prevent default when specified', () => {
    const handler = vi.fn();

    renderHook(() => 
      useKeyboardShortcuts({
        'ctrl+s': { handler, preventDefault: true },
      })
    );

    const event = new KeyboardEvent('keydown', { 
      key: 's', 
      ctrlKey: true,
    });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    document.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should clean up on unmount', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => 
      useKeyboardShortcuts({
        'ctrl+k': handler,
      })
    );

    unmount();

    const event = new KeyboardEvent('keydown', { 
      key: 'k', 
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should ignore shortcuts in input fields by default', () => {
    const handler = vi.fn();

    renderHook(() => 
      useKeyboardShortcuts({
        'escape': handler,
      })
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    Object.defineProperty(event, 'target', { value: input });
    document.dispatchEvent(event);

    // Handler should not be called when in input
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});

describe('useFocusVisible', () => {
  it('should detect keyboard navigation', () => {
    const { result } = renderHook(() => useFocusVisible());

    // Simulate keyboard interaction
    act(() => {
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      document.dispatchEvent(tabEvent);
    });

    expect(result.current.isKeyboardUser).toBe(true);
  });

  it('should detect mouse navigation', () => {
    const { result } = renderHook(() => useFocusVisible());

    // Simulate mouse interaction
    act(() => {
      const mouseEvent = new MouseEvent('mousedown');
      document.dispatchEvent(mouseEvent);
    });

    expect(result.current.isKeyboardUser).toBe(false);
  });
});

describe('useRovingTabIndex', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <button id="btn-0">Button 0</button>
      <button id="btn-1">Button 1</button>
      <button id="btn-2">Button 2</button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should set tabIndex correctly', () => {
    const items = Array.from(container.querySelectorAll('button')) as HTMLElement[];

    const { result } = renderHook(() => useRovingTabIndex({ items }));

    // First item should have tabIndex 0
    expect(items[0].getAttribute('tabindex')).toBe('0');
    
    // Others should have tabIndex -1
    expect(items[1].getAttribute('tabindex')).toBe('-1');
    expect(items[2].getAttribute('tabindex')).toBe('-1');

    // Change active index
    act(() => {
      result.current.setActiveIndex(1);
    });

    expect(items[0].getAttribute('tabindex')).toBe('-1');
    expect(items[1].getAttribute('tabindex')).toBe('0');
    expect(items[2].getAttribute('tabindex')).toBe('-1');
  });

  it('should focus active item', () => {
    const items = Array.from(container.querySelectorAll('button')) as HTMLElement[];

    const { result } = renderHook(() => useRovingTabIndex({ items }));

    act(() => {
      result.current.focusItem(1);
    });

    expect(document.activeElement).toBe(items[1]);
  });
});

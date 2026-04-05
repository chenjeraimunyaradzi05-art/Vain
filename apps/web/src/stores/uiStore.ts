'use client';

/**
 * UI Store
 * 
 * Manages global UI state like modals, sidebars, themes, and toast notifications.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface Modal {
  id: string;
  component: string;
  props?: Record<string, unknown>;
}

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Mobile menu
  mobileMenuOpen: boolean;
  
  // Modals
  modals: Modal[];
  
  // Toasts
  toasts: Toast[];
  
  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;
  
  // Search
  searchOpen: boolean;
  searchQuery: string;
  
  // Command palette
  commandPaletteOpen: boolean;
  
  // Onboarding
  onboardingStep: number;
  onboardingComplete: boolean;
}

interface UIActions {
  // Theme
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  
  // Sidebar
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Mobile menu
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  
  // Modals
  openModal: (id: string, component: string, props?: Record<string, unknown>) => void;
  closeModal: (id?: string) => void;
  closeAllModals: () => void;
  
  // Toasts
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  
  // Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;
  
  // Search
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  
  // Command palette
  setCommandPaletteOpen: (open: boolean) => void;
  
  // Onboarding
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setOnboardingComplete: (complete: boolean) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // State
      theme: 'dark',
      sidebarOpen: true,
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      modals: [],
      toasts: [],
      globalLoading: false,
      loadingMessage: null,
      searchOpen: false,
      searchQuery: '',
      commandPaletteOpen: false,
      onboardingStep: 0,
      onboardingComplete: false,

      // Theme
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        set({ theme: newTheme });
      },

      // Sidebar
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Mobile menu
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

      // Modals
      openModal: (id, component, props) => {
        set((state) => ({
          modals: [...state.modals, { id, component, props }],
        }));
      },
      closeModal: (id) => {
        if (id) {
          set((state) => ({
            modals: state.modals.filter((m) => m.id !== id),
          }));
        } else {
          // Close the last modal
          set((state) => ({
            modals: state.modals.slice(0, -1),
          }));
        }
      },
      closeAllModals: () => set({ modals: [] }),

      // Toasts
      showToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast = { ...toast, id };
        
        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto-dismiss after duration
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().dismissToast(id);
          }, duration);
        }
      },
      dismissToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },
      clearToasts: () => set({ toasts: [] }),

      // Loading
      setGlobalLoading: (loading, message) => {
        set({ globalLoading: loading, loadingMessage: message || null });
      },

      // Search
      setSearchOpen: (open) => set({ searchOpen: open }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Command palette
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      // Onboarding
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      completeOnboarding: () => set({ onboardingComplete: true, onboardingStep: 0 }),
      resetOnboarding: () => set({ onboardingComplete: false, onboardingStep: 0 }),
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
    }),
    {
      name: 'ngurra-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        onboardingComplete: state.onboardingComplete,
      }),
    }
  )
);

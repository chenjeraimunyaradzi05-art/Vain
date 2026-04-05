/**
 * Hook Exports
 * 
 * Central export point for all custom hooks.
 * Ngurra Pathways - Celestial Precious Stone Theme
 */

// Auth Hooks
export { useAuth } from './useAuth';

// Data Fetching Hooks
export { useFetch, useMutation, usePaginatedFetch, useSearch } from './useFetch';
export { useDebounce } from './useFetch'; // Using useFetch's version as canonical

// i18n Hooks
export { I18nProvider, useI18n, useTranslation } from './useI18n';

// Storage Hooks
export { useLocalStorage, useSessionStorage } from './useStorage';

// Pagination Hooks
export { usePagination, useInfiniteScroll, useVirtualScroll } from './usePagination';

// Form Hooks
export { useForm, validationPatterns, validators } from './useForm';

// Modal Hooks
export { useModal, useConfirm, useAlert } from './useModal';

// Intersection Observer Hooks
export { 
  useIntersectionObserver, 
  useLazyLoad, 
  useAnimateOnScroll, 
  useScrollProgress 
} from './useIntersectionObserver';

// Clipboard Hooks
export { useClipboard, useCopyToClipboard } from './useClipboard';

// Online Status Hooks
export { 
  useOnlineStatus, 
  useConnectionAwareFetch, 
  useConnectionQuality 
} from './useOnlineStatus';

// Utility Hooks
export {
  useDebouncedCallback,
  useThrottledCallback,
  useIsMounted,
  usePrevious,
  useInterval,
  useTimeout,
  useWindowSize,
  useMediaQuery,
  useClickOutside,
} from './useUtils';

// Keyboard Navigation Hooks
export {
  useFocusTrap,
  useArrowNavigation,
  useEscapeKey,
  useRovingTabIndex,
  useTypeahead,
  useFocusVisible,
} from './useKeyboardNavigation';


'use client';

import { useEffect, useState } from 'react';

/**
 * Service Worker Registration Hook
 * 
 * Registers the PWA service worker and handles updates.
 */
export function useServiceWorker() {
  const [registration, setRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let updateIntervalId = null;

    // Register service worker
    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setRegistration(reg);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Check for updates every hour
        updateIntervalId = window.setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000);

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerSW();

    // Track online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (updateIntervalId) {
        clearInterval(updateIntervalId);
      }
    };
  }, []);

  // Force update the service worker
  const updateServiceWorker = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return {
    registration,
    updateAvailable,
    updateServiceWorker,
    isOffline,
  };
}

/**
 * Offline Storage Hook
 * 
 * Provides IndexedDB storage for offline data.
 */
export function useOfflineStorage(storeName) {
  const [db, setDb] = useState(null);

  useEffect(() => {
    let database = null;

    const openDb = async () => {
      const request = indexedDB.open('ngurra-offline', 1);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
      };

      request.onsuccess = () => {
        database = request.result;
        setDb(database);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        
        // Create object stores
        if (!database.objectStoreNames.contains('pending-applications')) {
          database.createObjectStore('pending-applications', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
        }
        
        if (!database.objectStoreNames.contains('pending-messages')) {
          database.createObjectStore('pending-messages', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
        }
        
        if (!database.objectStoreNames.contains('cached-data')) {
          database.createObjectStore('cached-data', { keyPath: 'key' });
        }
      };
    };

    openDb();

    return () => {
      if (database) {
        database.close();
      }
    };
  }, []);

  // Add item to store
  const addItem = async (data) => {
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  // Get all items from store
  const getAllItems = async () => {
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  // Delete item from store
  const deleteItem = async (id) => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  // Clear all items from store
  const clearStore = async () => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  return {
    addItem,
    getAllItems,
    deleteItem,
    clearStore,
    isReady: !!db,
  };
}

/**
 * Background Sync Hook
 * 
 * Schedules background sync for offline actions.
 */
export function useBackgroundSync() {
  const [syncSupported, setSyncSupported] = useState(false);
  const applicationStorage = useOfflineStorage('pending-applications');
  const messageStorage = useOfflineStorage('pending-messages');

  useEffect(() => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      setSyncSupported(true);
    }
  }, []);

  // Register a sync event
  const requestSync = async (tag) => {
    if (!syncSupported) {
      console.warn('Background sync not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      return true;
    } catch (error) {
      console.error('Failed to register sync:', error);
      return false;
    }
  };

  // Queue an application for background submission
  const queueApplication = async (application, token) => {
    await applicationStorage.addItem({
      data: application,
      token,
      createdAt: new Date().toISOString(),
    });

    await requestSync('submit-application');
  };

  // Queue a message for background sending
  const queueMessage = async (message, token) => {
    await messageStorage.addItem({
      data: message,
      token,
      createdAt: new Date().toISOString(),
    });

    await requestSync('send-message');
  };

  return {
    syncSupported,
    requestSync,
    queueApplication,
    queueMessage,
  };
}

/**
 * Install Prompt Hook
 * 
 * Handles the PWA install prompt.
 */
export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Show the install prompt
  const promptInstall = async () => {
    if (!installPrompt) {
      return false;
    }

    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
      return true;
    }
    
    return false;
  };

  return {
    canInstall: !!installPrompt,
    isInstalled,
    promptInstall,
  };
}

const serviceWorkerHooks = {
  useServiceWorker,
  useOfflineStorage,
  useBackgroundSync,
  useInstallPrompt,
};

export default serviceWorkerHooks;

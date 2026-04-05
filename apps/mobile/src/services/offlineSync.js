/**
 * Offline Sync Service for React Native
 * 
 * Provides offline-first functionality:
 * - Queues mutations when offline
 * - Syncs when connection restored
 * - Shows sync status indicators
 * - Background sync support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

// Storage keys
const OFFLINE_QUEUE_KEY = '@ngurra_offline_queue';
const SYNC_STATUS_KEY = '@ngurra_sync_status';

// Background task name
const BACKGROUND_SYNC_TASK = 'NGURRA_BACKGROUND_SYNC';

// Queue item types
export const QueueItemType = {
  JOB_APPLICATION: 'job_application',
  PROFILE_UPDATE: 'profile_update',
  SESSION_BOOKING: 'session_booking',
  COURSE_ENROLLMENT: 'course_enrollment',
  MESSAGE_SEND: 'message_send',
  WELLNESS_CHECK: 'wellness_check',
};

/**
 * Sync status object
 */
let syncStatus = {
  isOnline: true,
  isSyncing: false,
  lastSyncTime: null,
  pendingCount: 0,
  failedCount: 0,
  listeners: [],
};

/**
 * Add a listener for sync status changes
 */
export function addSyncStatusListener(callback) {
  syncStatus.listeners.push(callback);
  // Return unsubscribe function
  return () => {
    syncStatus.listeners = syncStatus.listeners.filter(l => l !== callback);
  };
}

/**
 * Notify all listeners of status change
 */
function notifyListeners() {
  const status = getSyncStatus();
  syncStatus.listeners.forEach(callback => {
    try {
      callback(status);
    } catch (e) {
      console.warn('Sync status listener error:', e);
    }
  });
}

/**
 * Get current sync status
 */
export function getSyncStatus() {
  return {
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    lastSyncTime: syncStatus.lastSyncTime,
    pendingCount: syncStatus.pendingCount,
    failedCount: syncStatus.failedCount,
  };
}

/**
 * Initialize offline sync service
 */
export async function initializeOfflineSync() {
  // Load persisted sync status
  try {
    const savedStatus = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    if (savedStatus) {
      const parsed = JSON.parse(savedStatus);
      syncStatus.lastSyncTime = parsed.lastSyncTime;
    }
  } catch (e) {
    console.warn('Failed to load sync status:', e);
  }

  // Get initial queue count
  const queue = await getOfflineQueue();
  syncStatus.pendingCount = queue.filter(i => !i.failed).length;
  syncStatus.failedCount = queue.filter(i => i.failed).length;

  // Subscribe to network state changes
  NetInfo.addEventListener(state => {
    const wasOffline = !syncStatus.isOnline;
    syncStatus.isOnline = state.isConnected && state.isInternetReachable;
    
    // Trigger sync if we just came online
    if (wasOffline && syncStatus.isOnline) {
      console.log('Network restored, syncing...');
      syncOfflineQueue();
    }
    
    notifyListeners();
  });

  // Check initial network state
  const netState = await NetInfo.fetch();
  syncStatus.isOnline = netState.isConnected && netState.isInternetReachable;
  
  // If online, sync any pending items
  if (syncStatus.isOnline) {
    syncOfflineQueue();
  }

  notifyListeners();
}

/**
 * Get the offline queue
 */
export async function getOfflineQueue() {
  try {
    const queueData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return queueData ? JSON.parse(queueData) : [];
  } catch (e) {
    console.warn('Failed to get offline queue:', e);
    return [];
  }
}

/**
 * Save the offline queue
 */
async function saveOfflineQueue(queue) {
  try {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    syncStatus.pendingCount = queue.filter(i => !i.failed).length;
    syncStatus.failedCount = queue.filter(i => i.failed).length;
    notifyListeners();
  } catch (e) {
    console.warn('Failed to save offline queue:', e);
  }
}

/**
 * Add an item to the offline queue
 */
export async function queueOfflineAction(type, data, metadata = {}) {
  const queueItem = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    metadata,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    failed: false,
  };

  const queue = await getOfflineQueue();
  queue.push(queueItem);
  await saveOfflineQueue(queue);

  console.log(`Queued offline action: ${type}`, queueItem.id);

  // If online, try to sync immediately
  if (syncStatus.isOnline && !syncStatus.isSyncing) {
    syncOfflineQueue();
  }

  return queueItem.id;
}

/**
 * Remove an item from the queue
 */
export async function removeFromQueue(itemId) {
  const queue = await getOfflineQueue();
  const filtered = queue.filter(item => item.id !== itemId);
  await saveOfflineQueue(filtered);
}

/**
 * Mark an item as failed
 */
async function markItemFailed(itemId, error) {
  const queue = await getOfflineQueue();
  const item = queue.find(i => i.id === itemId);
  if (item) {
    item.failed = true;
    item.failedReason = error.message || 'Unknown error';
    item.failedAt = new Date().toISOString();
  }
  await saveOfflineQueue(queue);
}

/**
 * Retry failed items
 */
export async function retryFailedItems() {
  const queue = await getOfflineQueue();
  const failed = queue.filter(i => i.failed);
  
  for (const item of failed) {
    item.failed = false;
    item.retryCount = (item.retryCount || 0) + 1;
    delete item.failedReason;
    delete item.failedAt;
  }
  
  await saveOfflineQueue(queue);
  
  if (syncStatus.isOnline) {
    syncOfflineQueue();
  }
}

/**
 * Clear all failed items
 */
export async function clearFailedItems() {
  const queue = await getOfflineQueue();
  const pending = queue.filter(i => !i.failed);
  await saveOfflineQueue(pending);
}

/**
 * Process a single queue item
 */
async function processQueueItem(item) {
  const { type, data, metadata } = item;

  // Import API functions dynamically to avoid circular dependencies
  const api = await import('./api');

  switch (type) {
    case QueueItemType.JOB_APPLICATION:
      await api.jobsApi.applyForJob(data.jobId, data.applicationData);
      break;

    case QueueItemType.PROFILE_UPDATE:
      await api.profileApi.updateProfile(data);
      break;

    case QueueItemType.SESSION_BOOKING:
      await api.mentorshipApi.bookSession(data.mentorId, data.sessionData);
      break;

    case QueueItemType.COURSE_ENROLLMENT:
      await api.coursesApi.enrollInCourse(data.courseId);
      break;

    case QueueItemType.MESSAGE_SEND:
      await api.messagesApi.sendMessage(data.conversationId, data.message);
      break;

    case QueueItemType.WELLNESS_CHECK:
      await api.wellnessApi.submitWellnessCheck(data);
      break;

    default:
      console.warn(`Unknown queue item type: ${type}`);
      throw new Error(`Unknown queue item type: ${type}`);
  }
}

/**
 * Sync the offline queue
 */
export async function syncOfflineQueue() {
  if (syncStatus.isSyncing) {
    console.log('Sync already in progress');
    return;
  }

  if (!syncStatus.isOnline) {
    console.log('Offline, skipping sync');
    return;
  }

  const queue = await getOfflineQueue();
  const pending = queue.filter(item => !item.failed);

  if (pending.length === 0) {
    console.log('No pending items to sync');
    return;
  }

  syncStatus.isSyncing = true;
  notifyListeners();

  console.log(`Starting sync of ${pending.length} items...`);

  const results = {
    synced: 0,
    failed: 0,
  };

  for (const item of pending) {
    try {
      await processQueueItem(item);
      await removeFromQueue(item.id);
      results.synced++;
      console.log(`Synced: ${item.type} (${item.id})`);
    } catch (error) {
      console.error(`Failed to sync ${item.type}:`, error);
      
      // Mark as failed after 3 retries
      if ((item.retryCount || 0) >= 3) {
        await markItemFailed(item.id, error);
        results.failed++;
      } else {
        // Increment retry count for next attempt
        const q = await getOfflineQueue();
        const i = q.find(x => x.id === item.id);
        if (i) {
          i.retryCount = (i.retryCount || 0) + 1;
          await saveOfflineQueue(q);
        }
      }
    }
  }

  // Update sync status
  syncStatus.isSyncing = false;
  syncStatus.lastSyncTime = new Date().toISOString();
  
  // Persist last sync time
  await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
    lastSyncTime: syncStatus.lastSyncTime,
  }));

  notifyListeners();

  console.log(`Sync complete: ${results.synced} synced, ${results.failed} failed`);
  
  return results;
}

/**
 * Check if we should use offline queue for an action
 */
export function shouldQueueOffline() {
  return !syncStatus.isOnline;
}

/**
 * Wrapper for API calls with offline support
 * Returns true if action was queued for later, false if executed immediately
 */
export async function executeWithOfflineSupport(type, data, metadata = {}) {
  if (syncStatus.isOnline) {
    // Try to execute immediately
    try {
      await processQueueItem({ type, data, metadata });
      return { queued: false, success: true };
    } catch (error) {
      // If network error, queue for later
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        const id = await queueOfflineAction(type, data, metadata);
        return { queued: true, queueId: id };
      }
      throw error;
    }
  } else {
    // Queue for later
    const id = await queueOfflineAction(type, data, metadata);
    return { queued: true, queueId: id };
  }
}

/**
 * Register background sync task
 */
export async function registerBackgroundSync() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Background sync registered');
  } catch (err) {
    console.warn('Background sync registration failed:', err);
  }
}

/**
 * Unregister background sync task
 */
export async function unregisterBackgroundSync() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log('Background sync unregistered');
  } catch (err) {
    console.warn('Background sync unregister failed:', err);
  }
}

// Define background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('[BackgroundSync] Starting...');
    
    // Check network status
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.log('[BackgroundSync] Offline, skipping');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Run sync
    const queue = await getOfflineQueue();
    if (queue.filter(i => !i.failed).length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const results = await syncOfflineQueue();
    
    if (results.synced > 0) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    console.error('[BackgroundSync] Error:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export default {
  initializeOfflineSync,
  getSyncStatus,
  addSyncStatusListener,
  queueOfflineAction,
  syncOfflineQueue,
  retryFailedItems,
  clearFailedItems,
  shouldQueueOffline,
  executeWithOfflineSupport,
  registerBackgroundSync,
  unregisterBackgroundSync,
  getOfflineQueue,
  QueueItemType,
};

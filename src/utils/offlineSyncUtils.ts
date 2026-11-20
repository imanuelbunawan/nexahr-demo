/**
 * Offline Storage Synchronization & Action Queue Utilities
 * Provides pure functions for queuing offline mutations, managing local storage sync state,
 * calculating metrics, and handling reconnection reconciliation.
 */

export type OfflineActionType =
  | 'CREATE_LEAVE_REQUEST'
  | 'PROCESS_LEAVE_APPROVAL'
  | 'CREATE_REIMBURSEMENT'
  | 'PROCESS_REIMBURSEMENT_APPROVAL'
  | 'UPDATE_EMPLOYEE'
  | 'CREATE_EMPLOYEE'
  | 'UPDATE_ROLE_PERMISSIONS'
  | 'CREATE_TASK'
  | 'UPDATE_TASK';

export type OfflineEntityType =
  | 'leave'
  | 'reimbursement'
  | 'employee'
  | 'role'
  | 'task';

export type OfflineSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface OfflineSyncAction {
  id: string;
  actionType: OfflineActionType;
  entityType: OfflineEntityType;
  entityId: string;
  summary: string;
  payload: Record<string, unknown>;
  queuedAt: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  status: OfflineSyncStatus;
  errorMessage?: string;
  retryCount?: number;
}

export interface OfflineSyncStats {
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  totalCount: number;
  lastSyncedAt: string | null;
  storageUsageBytes: number;
  storageUsageFormatted: string;
  isOnline: boolean;
  isSyncing: boolean;
}

/**
 * Creates a unique offline sync action record
 */
export function createOfflineSyncAction(params: {
  actionType: OfflineActionType;
  entityType: OfflineEntityType;
  entityId: string;
  summary: string;
  payload: Record<string, unknown>;
  actorId: string;
  actorName: string;
  actorRole: string;
  id?: string;
  queuedAt?: string;
}): OfflineSyncAction {
  return {
    id: params.id || `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    actionType: params.actionType,
    entityType: params.entityType,
    entityId: params.entityId,
    summary: params.summary,
    payload: params.payload,
    queuedAt: params.queuedAt || new Date().toISOString(),
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    status: 'pending',
    retryCount: 0,
  };
}

/**
 * Enqueues an offline action into the queue.
 * Appends to queue and respects a maximum capacity limit (default: 200).
 */
export function enqueueOfflineAction(
  queue: OfflineSyncAction[],
  newAction: OfflineSyncAction,
  maxCapacity = 200
): OfflineSyncAction[] {
  // If an action with the exact same ID already exists, update it
  const exists = queue.some((item) => item.id === newAction.id);
  if (exists) {
    return queue.map((item) => (item.id === newAction.id ? newAction : item));
  }
  const updated = [...queue, newAction];
  if (updated.length > maxCapacity) {
    return updated.slice(updated.length - maxCapacity);
  }
  return updated;
}

/**
 * Removes an action from the queue by its ID
 */
export function dequeueOfflineAction(
  queue: OfflineSyncAction[],
  actionId: string
): OfflineSyncAction[] {
  return queue.filter((item) => item.id !== actionId);
}

/**
 * Updates status of a specific action in queue
 */
export function markActionStatus(
  queue: OfflineSyncAction[],
  actionId: string,
  status: OfflineSyncStatus,
  errorMessage?: string
): OfflineSyncAction[] {
  return queue.map((item) => {
    if (item.id !== actionId) return item;
    return {
      ...item,
      status,
      errorMessage: errorMessage ?? item.errorMessage,
      retryCount: status === 'failed' ? (item.retryCount || 0) + 1 : item.retryCount,
    };
  });
}

/**
 * Clears all synced actions or all actions if forced
 */
export function pruneOfflineQueue(
  queue: OfflineSyncAction[],
  onlySynced = true
): OfflineSyncAction[] {
  if (onlySynced) {
    return queue.filter((item) => item.status !== 'synced');
  }
  return [];
}

/**
 * Formats byte size into human readable string
 */
export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Calculates current storage estimate across specified keys in localStorage
 */
export function calculateStorageUsageBytes(
  keys: string[],
  storageProvider?: { getItem: (key: string) => string | null }
): number {
  const provider =
    storageProvider ||
    (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
  if (!provider) return 0;

  let total = 0;
  for (const key of keys) {
    try {
      const val = provider.getItem(key);
      if (val) {
        // Approximate byte size: 2 bytes per UTF-16 character + key length
        total += (key.length + val.length) * 2;
      }
    } catch {
      // Ignore quota or security errors
    }
  }
  return total;
}

/**
 * Aggregates statistics for offline sync display and health check
 */
export function calculateSyncStats(
  queue: OfflineSyncAction[],
  lastSyncedAt: string | null,
  isOnline: boolean,
  isSyncing: boolean,
  storageUsageBytes = 0
): OfflineSyncStats {
  const pendingCount = queue.filter((item) => item.status === 'pending').length;
  const syncedCount = queue.filter((item) => item.status === 'synced').length;
  const failedCount = queue.filter((item) => item.status === 'failed').length;

  return {
    pendingCount,
    syncedCount,
    failedCount,
    totalCount: queue.length,
    lastSyncedAt,
    storageUsageBytes,
    storageUsageFormatted: formatStorageSize(storageUsageBytes),
    isOnline,
    isSyncing,
  };
}

/**
 * Returns human-readable Indonesian badge text and tone for the offline banner
 */
export function getOfflineBadgeMeta(
  isOnline: boolean,
  pendingCount: number,
  isSyncing: boolean
): {
  label: string;
  badgeClass: string;
  dotColor: string;
  description: string;
} {
  if (isSyncing) {
    return {
      label: 'Menyinkronkan...',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotColor: 'bg-amber-500 animate-pulse',
      description: `Sedang mengunggah ${pendingCount} perubahan ke server...`,
    };
  }

  if (!isOnline) {
    return {
      label: pendingCount > 0 ? `Offline (${pendingCount} tertunda)` : 'Offline (Tersimpan Lokal)',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
      dotColor: 'bg-rose-500',
      description:
        pendingCount > 0
          ? `${pendingCount} perubahan tersimpan di peramban lokal dan akan otomatis disinkronkan saat online.`
          : 'Koneksi terputus. Data HR dapat dibaca dan diedit secara offline.',
    };
  }

  if (pendingCount > 0) {
    return {
      label: `${pendingCount} Menunggu Sinkronisasi`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotColor: 'bg-amber-500',
      description: 'Ada perubahan lokal yang belum terunggah ke basis data cloud.',
    };
  }

  return {
    label: 'Online & Terhubung',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotColor: 'bg-emerald-500',
    description: 'Semua data HR tersinkronisasi penuh secara real-time.',
  };
}

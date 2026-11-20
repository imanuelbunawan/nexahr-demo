import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createOfflineSyncAction,
  enqueueOfflineAction,
  dequeueOfflineAction,
  markActionStatus,
  pruneOfflineQueue,
  formatStorageSize,
  calculateStorageUsageBytes,
  calculateSyncStats,
  getOfflineBadgeMeta,
} from './offlineSyncUtils.ts';

test('createOfflineSyncAction produces complete item with pending status', () => {
  const action = createOfflineSyncAction({
    actionType: 'CREATE_LEAVE_REQUEST',
    entityType: 'leave',
    entityId: 'req-123',
    summary: 'Pengajuan Cuti Tahunan 3 Hari',
    payload: { leaveType: 'Cuti Tahunan', totalDays: 3 },
    actorId: 'usr-1',
    actorName: 'Rina Kusuma',
    actorRole: 'Staff HR',
  });

  assert.equal(action.actionType, 'CREATE_LEAVE_REQUEST');
  assert.equal(action.entityType, 'leave');
  assert.equal(action.entityId, 'req-123');
  assert.equal(action.status, 'pending');
  assert.equal(action.actorName, 'Rina Kusuma');
  assert.ok(action.id.startsWith('sync_'));
  assert.ok(action.queuedAt.length > 0);
});

test('enqueueOfflineAction appends items and handles deduplication/capacity limit', () => {
  const a1 = createOfflineSyncAction({
    id: 's-1',
    actionType: 'CREATE_LEAVE_REQUEST',
    entityType: 'leave',
    entityId: 'req-1',
    summary: 'Cuti 1',
    payload: {},
    actorId: 'u-1',
    actorName: 'Test',
    actorRole: 'Role',
  });

  const a2 = createOfflineSyncAction({
    id: 's-2',
    actionType: 'PROCESS_LEAVE_APPROVAL',
    entityType: 'leave',
    entityId: 'req-1',
    summary: 'Approve Cuti',
    payload: { decision: 'APPROVED' },
    actorId: 'u-1',
    actorName: 'Test',
    actorRole: 'Role',
  });

  let queue = enqueueOfflineAction([], a1);
  assert.equal(queue.length, 1);

  queue = enqueueOfflineAction(queue, a2);
  assert.equal(queue.length, 2);

  // Updating existing item
  const a1Updated = { ...a1, summary: 'Cuti 1 Updated' };
  queue = enqueueOfflineAction(queue, a1Updated);
  assert.equal(queue.length, 2);
  assert.equal(queue[0].summary, 'Cuti 1 Updated');

  // Capacity limit truncation
  const qLimit = enqueueOfflineAction([a1, a2], a1Updated, 2);
  assert.equal(qLimit.length, 2);
});

test('dequeueOfflineAction removes specified action by id', () => {
  const a1 = createOfflineSyncAction({
    id: 's-1',
    actionType: 'CREATE_LEAVE_REQUEST',
    entityType: 'leave',
    entityId: 'req-1',
    summary: 'Cuti 1',
    payload: {},
    actorId: 'u-1',
    actorName: 'Test',
    actorRole: 'Role',
  });
  const a2 = createOfflineSyncAction({
    id: 's-2',
    actionType: 'PROCESS_LEAVE_APPROVAL',
    entityType: 'leave',
    entityId: 'req-1',
    summary: 'Approve',
    payload: {},
    actorId: 'u-1',
    actorName: 'Test',
    actorRole: 'Role',
  });

  const queue = dequeueOfflineAction([a1, a2], 's-1');
  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, 's-2');
});

test('markActionStatus updates status and increments retry count on failure', () => {
  const a1 = createOfflineSyncAction({
    id: 's-1',
    actionType: 'CREATE_LEAVE_REQUEST',
    entityType: 'leave',
    entityId: 'req-1',
    summary: 'Cuti 1',
    payload: {},
    actorId: 'u-1',
    actorName: 'Test',
    actorRole: 'Role',
  });

  let queue = markActionStatus([a1], 's-1', 'syncing');
  assert.equal(queue[0].status, 'syncing');

  queue = markActionStatus(queue, 's-1', 'failed', 'Timeout error');
  assert.equal(queue[0].status, 'failed');
  assert.equal(queue[0].errorMessage, 'Timeout error');
  assert.equal(queue[0].retryCount, 1);

  queue = markActionStatus(queue, 's-1', 'synced');
  assert.equal(queue[0].status, 'synced');
});

test('pruneOfflineQueue removes synced items or clears completely', () => {
  const a1 = { ...createOfflineSyncAction({ actionType: 'CREATE_TASK', entityType: 'task', entityId: 't-1', summary: 'T1', payload: {}, actorId: 'u-1', actorName: 'T', actorRole: 'R' }), status: 'synced' as const };
  const a2 = { ...createOfflineSyncAction({ actionType: 'CREATE_TASK', entityType: 'task', entityId: 't-2', summary: 'T2', payload: {}, actorId: 'u-1', actorName: 'T', actorRole: 'R' }), status: 'pending' as const };

  const pruned = pruneOfflineQueue([a1, a2], true);
  assert.equal(pruned.length, 1);
  assert.equal(pruned[0].status, 'pending');

  const cleared = pruneOfflineQueue([a1, a2], false);
  assert.equal(cleared.length, 0);
});

test('formatStorageSize formats bytes, KB, and MB accurately', () => {
  assert.equal(formatStorageSize(500), '500 B');
  assert.equal(formatStorageSize(2048), '2.0 KB');
  assert.equal(formatStorageSize(1048576 * 2.5), '2.50 MB');
});

test('calculateStorageUsageBytes estimates size across keys using mock provider', () => {
  const mockStorage: Record<string, string> = {
    'key1': 'abc', // key1 len 4, val len 3 -> (4+3)*2 = 14 bytes
    'key2': 'hello world', // key2 len 4, val len 11 -> (4+11)*2 = 30 bytes
  };

  const usage = calculateStorageUsageBytes(['key1', 'key2'], {
    getItem: (k: string) => mockStorage[k] || null,
  });

  assert.equal(usage, 44);
});

test('calculateSyncStats accurately breaks down counts and state', () => {
  const a1 = { ...createOfflineSyncAction({ actionType: 'CREATE_TASK', entityType: 'task', entityId: 't-1', summary: 'T1', payload: {}, actorId: 'u-1', actorName: 'T', actorRole: 'R' }), status: 'pending' as const };
  const a2 = { ...createOfflineSyncAction({ actionType: 'CREATE_TASK', entityType: 'task', entityId: 't-2', summary: 'T2', payload: {}, actorId: 'u-1', actorName: 'T', actorRole: 'R' }), status: 'synced' as const };
  const a3 = { ...createOfflineSyncAction({ actionType: 'CREATE_TASK', entityType: 'task', entityId: 't-3', summary: 'T3', payload: {}, actorId: 'u-1', actorName: 'T', actorRole: 'R' }), status: 'failed' as const };

  const stats = calculateSyncStats([a1, a2, a3], '2026-03-31T09:00:00Z', true, false, 20480);
  assert.equal(stats.pendingCount, 1);
  assert.equal(stats.syncedCount, 1);
  assert.equal(stats.failedCount, 1);
  assert.equal(stats.totalCount, 3);
  assert.equal(stats.isOnline, true);
  assert.equal(stats.isSyncing, false);
  assert.equal(stats.storageUsageFormatted, '20.0 KB');
});

test('getOfflineBadgeMeta returns correct tone and status text', () => {
  const syncing = getOfflineBadgeMeta(true, 2, true);
  assert.equal(syncing.label, 'Menyinkronkan...');

  const offlineWithPending = getOfflineBadgeMeta(false, 3, false);
  assert.ok(offlineWithPending.label.includes('Offline (3 tertunda)'));

  const offlineClean = getOfflineBadgeMeta(false, 0, false);
  assert.ok(offlineClean.label.includes('Offline (Tersimpan Lokal)'));

  const onlineClean = getOfflineBadgeMeta(true, 0, false);
  assert.equal(onlineClean.label, 'Online & Terhubung');
});

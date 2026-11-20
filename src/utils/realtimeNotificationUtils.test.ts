import test from 'node:test';
import assert from 'node:assert';
import {
  getBadgeColorForStatus,
  createToastFromSocketEvent,
  createToastForNewLeave,
  createToastForApprovalUpdate,
  filterActiveToasts,
  RealTimeToast,
} from './realtimeNotificationUtils.ts';
import { SocketApprovalPayload } from '../types/index.ts';

test('getBadgeColorForStatus maps statuses to correct badge colors', () => {
  assert.strictEqual(getBadgeColorForStatus('FINAL_APPROVED'), 'emerald');
  assert.strictEqual(getBadgeColorForStatus('PENDING_TIER_2'), 'amber');
  assert.strictEqual(getBadgeColorForStatus('REJECTED'), 'rose');
  assert.strictEqual(getBadgeColorForStatus('NEW_REQUEST'), 'indigo');
});

test('createToastFromSocketEvent handles approval:new for leave', () => {
  const payload: SocketApprovalPayload = {
    id: 'sock_1',
    event: 'approval:new',
    itemType: 'leave',
    itemId: 'req_1',
    title: 'Permohonan Cuti Tahunan',
    applicantName: 'Budi Santoso',
    departmentName: 'Technology & Engineering',
    stageName: 'Tahap 1: Persetujuan Manajer',
    currentRoleTarget: 'Manajer',
    amountOrDuration: '3 Hari Kerja',
    timestamp: '2026-11-03T10:00:00Z',
    room: 'room:approvals',
  };

  const toast = createToastFromSocketEvent(payload);
  assert.strictEqual(toast.category, 'leave_new');
  assert.strictEqual(toast.itemType, 'leave');
  assert.strictEqual(toast.statusState, 'NEW_REQUEST');
  assert.strictEqual(toast.statusBadgeLabel, 'Cuti Baru Masuk');
  assert.strictEqual(toast.statusBadgeColor, 'indigo');
  assert.strictEqual(toast.applicantName, 'Budi Santoso');
  assert.strictEqual(toast.metaDetail, '3 Hari Kerja');
  assert.strictEqual(toast.targetModule, 'approval');
});

test('createToastFromSocketEvent handles approval:final_approved', () => {
  const payload: SocketApprovalPayload = {
    id: 'sock_2',
    event: 'approval:final_approved',
    itemType: 'reimbursement',
    itemId: 'reimb_1',
    title: 'Klaim Biaya Transportasi',
    applicantName: 'Maya Putri',
    departmentName: 'Marketing',
    stageName: 'Tahap Final',
    currentRoleTarget: 'All',
    amountOrDuration: 'Rp 250.000',
    timestamp: '2026-11-03T11:00:00Z',
    room: 'room:approvals',
  };

  const toast = createToastFromSocketEvent(payload);
  assert.strictEqual(toast.statusState, 'FINAL_APPROVED');
  assert.strictEqual(toast.statusBadgeLabel, 'Persetujuan Final Sah');
  assert.strictEqual(toast.statusBadgeColor, 'emerald');
  assert.strictEqual(toast.targetModule, 'approval');
});

test('createToastFromSocketEvent handles approval:rejected', () => {
  const payload: SocketApprovalPayload = {
    id: 'sock_3',
    event: 'approval:rejected',
    itemType: 'leave',
    itemId: 'req_2',
    title: 'Permohonan Cuti Ditolak',
    applicantName: 'Ahmad Fauzi',
    departmentName: 'Technology',
    stageName: 'Penolakan Pengajuan',
    currentRoleTarget: 'All',
    amountOrDuration: '2 Hari Kerja',
    timestamp: '2026-11-03T11:30:00Z',
    room: 'room:approvals',
  };

  const toast = createToastFromSocketEvent(payload);
  assert.strictEqual(toast.statusState, 'REJECTED');
  assert.strictEqual(toast.statusBadgeColor, 'rose');
  assert.strictEqual(toast.statusBadgeLabel, 'Pengajuan Ditolak');
});

test('createToastForNewLeave formats correct fields and values', () => {
  const toast = createToastForNewLeave(
    'Siti Rahmawati',
    'Human Resources',
    'Cuti Tahunan',
    4,
    'Acara keluarga di kampung halaman'
  );

  assert.strictEqual(toast.category, 'leave_new');
  assert.strictEqual(toast.applicantName, 'Siti Rahmawati');
  assert.strictEqual(toast.applicantDepartment, 'Human Resources');
  assert.strictEqual(toast.metaDetail, '4 Hari Kerja');
  assert.strictEqual(toast.statusBadgeColor, 'indigo');
  assert.ok(toast.message.includes('Acara keluarga'));
});

test('createToastForApprovalUpdate formats approved and rejected states', () => {
  const approvedToast = createToastForApprovalUpdate(
    'Budi Santoso',
    'Engineering',
    'leave',
    'Cuti Sakit',
    'FINAL_APPROVED',
    'Ir. Hendra Pratama',
    'Owner',
    'Surat dokter valid',
    '2 Hari'
  );

  assert.strictEqual(approvedToast.statusState, 'FINAL_APPROVED');
  assert.strictEqual(approvedToast.statusBadgeColor, 'emerald');
  assert.strictEqual(approvedToast.metaDetail, '2 Hari');

  const rejectedToast = createToastForApprovalUpdate(
    'Dewi Lestari',
    'Finance',
    'reimbursement',
    'Klaim Makan Lembur',
    'REJECTED',
    'Siti Rahmawati',
    'Manager',
    'Struk tidak terbaca jelas',
    'Rp 120.000'
  );

  assert.strictEqual(rejectedToast.statusState, 'REJECTED');
  assert.strictEqual(rejectedToast.statusBadgeColor, 'rose');
  assert.strictEqual(rejectedToast.rejectionReason, 'Struk tidak terbaca jelas');
});

test('filterActiveToasts limits maximum items cleanly', () => {
  const mockToasts: RealTimeToast[] = Array.from({ length: 10 }).map((_, i) => ({
    id: `toast_${i}`,
    category: 'leave_new',
    title: `Toast ${i}`,
    message: `Message ${i}`,
    applicantName: `User ${i}`,
    applicantDepartment: 'IT',
    itemType: 'leave',
    statusState: 'NEW_REQUEST',
    statusBadgeLabel: 'Baru',
    statusBadgeColor: 'indigo',
    metaDetail: '1 Hari',
    timestamp: '10:00 WIB',
    targetModule: 'approval',
    createdAt: Date.now() + i,
    durationMs: 5000,
  }));

  const filtered = filterActiveToasts(mockToasts, 3);
  assert.strictEqual(filtered.length, 3);
  assert.strictEqual(filtered[0].id, 'toast_0');
  assert.strictEqual(filtered[2].id, 'toast_2');
});

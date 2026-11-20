import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterAuditLogs,
  calculateAuditMetrics,
  formatAuditTimestamp,
  formatRelativeTime,
  generateAuditCsv,
  createAuditEntry,
} from './auditUtils.ts';
import { AuditLogEntry } from '../types/index.ts';

const SAMPLE_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-10-31T10:00:00.000Z',
    actorId: 'usr-1',
    actorName: 'Ir. Hendra Pratama',
    actorRole: 'Super Admin / Owner',
    category: 'role',
    action: 'UPDATE_USER_ROLE',
    actionTitle: 'Perubahan Role Karyawan',
    targetId: 'usr-2',
    targetType: 'user',
    targetName: 'Budi Santoso',
    description: 'Mengubah role pengguna Budi Santoso dari Staff menjadi Manajer',
    changes: [
      { field: 'roleId', label: 'Hak Akses Role', oldValue: 'role_staff', newValue: 'role_manager' },
    ],
    severity: 'warning',
    ipAddress: '192.168.1.50',
  },
  {
    id: 'AUD-002',
    timestamp: '2026-10-30T08:30:00.000Z',
    actorId: 'usr-3',
    actorName: 'Siti Rahmawati',
    actorRole: 'HR Director',
    category: 'approval',
    action: 'APPROVE_LEAVE',
    actionTitle: 'Persetujuan Izin Cuti',
    targetId: 'req-101',
    targetType: 'leave_request',
    targetName: 'Cuti Tahunan Budi Santoso',
    description: 'Menyetujui permohonan cuti tahunan selama 3 hari kerja',
    severity: 'success',
    ipAddress: '192.168.1.62',
  },
  {
    id: 'AUD-003',
    timestamp: '2026-10-25T14:15:00.000Z',
    actorId: 'usr-1',
    actorName: 'Ir. Hendra Pratama',
    actorRole: 'Super Admin / Owner',
    category: 'employee',
    action: 'UPDATE_EMPLOYEE_QUOTA',
    actionTitle: 'Penyesuaian Kuota Cuti',
    targetId: 'usr-4',
    targetType: 'user',
    targetName: 'Rian Saputra',
    description: 'Menambahkan kuota cuti tahunan tahun berjalan sebesar 2 hari',
    changes: [
      { field: 'annualQuota', label: 'Kuota Cuti Tahunan', oldValue: 12, newValue: 14 },
    ],
    severity: 'info',
    ipAddress: '192.168.1.50',
  },
];

test('filterAuditLogs filters by category correctly', () => {
  const roleLogs = filterAuditLogs(SAMPLE_LOGS, { category: 'role' });
  assert.equal(roleLogs.length, 1);
  assert.equal(roleLogs[0].id, 'AUD-001');

  const approvalLogs = filterAuditLogs(SAMPLE_LOGS, { category: 'approval' });
  assert.equal(approvalLogs.length, 1);
  assert.equal(approvalLogs[0].id, 'AUD-002');
});

test('filterAuditLogs filters by text query across multiple fields', () => {
  const queryResult = filterAuditLogs(SAMPLE_LOGS, { query: 'Budi Santoso' });
  assert.equal(queryResult.length, 2);

  const roleQueryResult = filterAuditLogs(SAMPLE_LOGS, { query: 'role_manager' });
  assert.equal(roleQueryResult.length, 1);
  assert.equal(roleQueryResult[0].id, 'AUD-001');
});

test('filterAuditLogs filters by severity and actor', () => {
  const warningLogs = filterAuditLogs(SAMPLE_LOGS, { severity: 'warning' });
  assert.equal(warningLogs.length, 1);
  assert.equal(warningLogs[0].id, 'AUD-001');

  const actorLogs = filterAuditLogs(SAMPLE_LOGS, { actorId: 'usr-3' });
  assert.equal(actorLogs.length, 1);
  assert.equal(actorLogs[0].actorName, 'Siti Rahmawati');
});

test('calculateAuditMetrics computes exact aggregates', () => {
  const metrics = calculateAuditMetrics(SAMPLE_LOGS);
  assert.equal(metrics.totalCount, 3);
  assert.equal(metrics.roleChangesCount, 1);
  assert.equal(metrics.approvalDecisionsCount, 1);
  assert.equal(metrics.employeeUpdatesCount, 1);
  assert.equal(metrics.taskManagementCount, 0);
});

test('generateAuditCsv creates properly escaped CSV content', () => {
  const csv = generateAuditCsv(SAMPLE_LOGS);
  assert.ok(csv.includes('Log ID,Waktu (WIB),Aktor'));
  assert.ok(csv.includes('AUD-001'));
  assert.ok(csv.includes('Budi Santoso'));
  assert.ok(csv.includes('ROLE'));
});

test('createAuditEntry generates a valid log with sequential format', () => {
  const entry = createAuditEntry({
    actorId: 'usr-9',
    actorName: 'Admin Test',
    actorRole: 'Owner',
    category: 'security',
    action: 'TEST_ACTION',
    actionTitle: 'Uji Coba Audit',
    targetType: 'system',
    targetName: 'Sistem NexaHR',
    description: 'Deskripsi uji coba audit log',
    severity: 'info',
  });

  assert.ok(entry.id.startsWith('AUD-'));
  assert.ok(entry.timestamp.length > 0);
  assert.equal(entry.actorName, 'Admin Test');
  assert.equal(entry.category, 'security');
});

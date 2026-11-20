import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRupiah,
  parseRupiah,
  hasPermission,
  canAccessModule,
  calculateWorkingDays,
  validateLeaveRequest,
  getNextLeaveApprovalStage,
  getNextReimbursementApprovalStage,
} from './rbac.ts';

test('formatRupiah formats IDR currency properly', () => {
  assert.equal(formatRupiah(0), 'Rp 0');
  assert.equal(formatRupiah(150000), 'Rp 150.000');
  assert.equal(formatRupiah(2500000), 'Rp 2.500.000');
});

test('parseRupiah cleanses strings and formats to pure number', () => {
  assert.equal(parseRupiah('Rp 1.500.000'), 1500000);
  assert.equal(parseRupiah('750.000'), 750000);
  assert.equal(parseRupiah('abc'), 0);
});

test('hasPermission validates permission map accurately', () => {
  const rolePermissions = {
    role_owner: ['view_dashboard', 'edit_role', 'view_roles', 'approve_leave'],
    role_staff: ['view_dashboard', 'create_leave', 'view_leave'],
  };

  assert.equal(hasPermission('role_owner', 'edit_role', rolePermissions), true);
  assert.equal(hasPermission('role_staff', 'edit_role', rolePermissions), false);
  assert.equal(hasPermission('role_staff', 'view_leave', rolePermissions), true);
  assert.equal(hasPermission('non_existent', 'view_leave', rolePermissions), false);
});

test('canAccessModule checks combined action and module permission', () => {
  const rolePermissions = {
    role_hrd: ['view_leave', 'approve_leave', 'create_employees', 'view_employees'],
  };

  assert.equal(canAccessModule('role_hrd', 'leave', 'view', rolePermissions), true);
  assert.equal(canAccessModule('role_hrd', 'leave', 'approve', rolePermissions), true);
  assert.equal(canAccessModule('role_hrd', 'roles', 'edit', rolePermissions), false);
});

test('calculateWorkingDays counts week days only', () => {
  // 2026-10-19 is Monday, 2026-10-23 is Friday (5 working days)
  assert.equal(calculateWorkingDays('2026-10-19', '2026-10-23'), 5);
  // 2026-10-19 (Mon) to 2026-10-25 (Sun) should still be 5 working days
  assert.equal(calculateWorkingDays('2026-10-19', '2026-10-25'), 5);
});

test('validateLeaveRequest checks quota and dates correctly', () => {
  // Valid request
  const valid = validateLeaveRequest('2026-11-01', '2026-11-03', 3, 12, true);
  assert.equal(valid.valid, true);

  // Exceeding balance
  const invalidQuota = validateLeaveRequest('2026-11-01', '2026-11-15', 10, 5, true);
  assert.equal(invalidQuota.valid, false);
  assert.match(invalidQuota.error || '', /Kuota cuti tidak mencukupi/);

  // Inverted dates
  const invalidDates = validateLeaveRequest('2026-11-10', '2026-11-05', 3, 12, true);
  assert.equal(invalidDates.valid, false);
});

test('getNextLeaveApprovalStage implements multi-level workflow', () => {
  // Manager approves stage 1
  const stage1 = getNextLeaveApprovalStage('PENDING_MANAGER', 'APPROVED');
  assert.equal(stage1.nextStatus, 'PENDING_HRD');
  assert.equal(stage1.isFinal, false);
  assert.equal(stage1.nextRole, 'HRD');

  // HRD approves stage 2
  const stage2 = getNextLeaveApprovalStage('PENDING_HRD', 'APPROVED');
  assert.equal(stage2.nextStatus, 'APPROVED');
  assert.equal(stage2.isFinal, true);

  // Rejection at any stage
  const reject = getNextLeaveApprovalStage('PENDING_MANAGER', 'REJECTED');
  assert.equal(reject.nextStatus, 'REJECTED');
  assert.equal(reject.isFinal, true);
});

test('getNextReimbursementApprovalStage implements multi-level approval', () => {
  const stage1 = getNextReimbursementApprovalStage('PENDING_MANAGER', 'APPROVED');
  assert.equal(stage1.nextStatus, 'PENDING_FINANCE');
  assert.equal(stage1.isFinal, false);

  const stage2 = getNextReimbursementApprovalStage('PENDING_FINANCE', 'APPROVED');
  assert.equal(stage2.nextStatus, 'APPROVED');
  assert.equal(stage2.isFinal, true);
});

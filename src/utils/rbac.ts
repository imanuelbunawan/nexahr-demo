import type {
  ActionType,
  LeaveStatus,
  ModuleType,
  ReimbursementStatus,
} from '../types/index.ts';

/**
 * Format a numeric amount into Indonesian Rupiah (e.g. 1500000 -> "Rp 1.500.000")
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0';
  }
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp ${formatted}`;
}

/**
 * Parse a formatted Rupiah string or digit input into clean number
 */
export function parseRupiah(val: string): number {
  if (!val) return 0;
  const digitsOnly = val.replace(/[^0-9]/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

/**
 * Check if a role possesses a specific permission ID
 */
export function hasPermission(
  roleId: string,
  permissionId: string,
  rolePermissions: Record<string, string[]>
): boolean {
  if (!roleId || !permissionId || !rolePermissions) return false;
  const permissions = rolePermissions[roleId];
  if (!permissions) return false;
  return permissions.includes(permissionId);
}

/**
 * Check if a role can perform an action on a module
 */
export function canAccessModule(
  roleId: string,
  module: ModuleType,
  action: ActionType,
  rolePermissions: Record<string, string[]>
): boolean {
  const permissionId = `${action}_${module}`;
  return hasPermission(roleId, permissionId, rolePermissions);
}

/**
 * Calculate working days between two date strings (inclusive, excluding weekends if needed, or calendar days)
 */
export function calculateWorkingDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return 0;
  }

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dayOfWeek = cur.getDay(); // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count > 0 ? count : 1; // Minimum 1 day if within same day
}

/**
 * Validate a leave submission
 */
export function validateLeaveRequest(
  startDateStr: string,
  endDateStr: string,
  requestedDays: number,
  remainingBalance: number,
  isAnnualLeave: boolean = true
): { valid: boolean; error?: string } {
  if (!startDateStr || !endDateStr) {
    return { valid: false, error: 'Tanggal mulai dan selesai wajib diisi.' };
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start > end) {
    return { valid: false, error: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' };
  }

  if (requestedDays <= 0) {
    return { valid: false, error: 'Durasi cuti minimal 1 hari kerja.' };
  }

  if (isAnnualLeave && requestedDays > remainingBalance) {
    return {
      valid: false,
      error: `Kuota cuti tidak mencukupi. Kuota tersisa ${remainingBalance} hari, namun Anda mengajukan ${requestedDays} hari.`,
    };
  }

  return { valid: true };
}

/**
 * Check if a role corresponds to any departmental manager tier
 */
export function isDepartmentManager(roleId?: string): boolean {
  if (!roleId) return false;
  return roleId === 'role_manager' || roleId.startsWith('role_manager');
}

/**
 * Check if a role possesses executive or HRD enterprise oversight
 */
export function isExecutiveOrHRD(roleId?: string): boolean {
  if (!roleId) return false;
  return roleId === 'role_owner' || roleId === 'role_hrd';
}

/**
 * Check if a role possesses executive or Finance disbursement oversight
 */
export function isExecutiveOrFinance(roleId?: string): boolean {
  if (!roleId) return false;
  return roleId === 'role_owner' || roleId === 'role_hrd' || roleId === 'role_finance';
}

/**
 * Multi-level approval stage progression for Leave:
 * PENDING_MANAGER -> (approve) -> PENDING_HRD -> (approve) -> APPROVED
 * Any reject -> REJECTED
 */
export function getNextLeaveApprovalStage(
  currentStatus: LeaveStatus,
  decision: 'APPROVED' | 'REJECTED'
): { nextStatus: LeaveStatus; isFinal: boolean; nextRole: 'Manajer' | 'HRD' | null } {
  if (decision === 'REJECTED') {
    return { nextStatus: 'REJECTED', isFinal: true, nextRole: null };
  }

  if (currentStatus === 'PENDING_MANAGER') {
    return { nextStatus: 'PENDING_HRD', isFinal: false, nextRole: 'HRD' };
  }

  if (currentStatus === 'PENDING_HRD') {
    return { nextStatus: 'APPROVED', isFinal: true, nextRole: null };
  }

  return { nextStatus: currentStatus, isFinal: true, nextRole: null };
}

/**
 * Multi-level approval stage progression for Reimbursement:
 * PENDING_MANAGER -> (approve) -> PENDING_FINANCE -> (approve) -> APPROVED
 * Any reject -> REJECTED
 */
export function getNextReimbursementApprovalStage(
  currentStatus: ReimbursementStatus,
  decision: 'APPROVED' | 'REJECTED'
): { nextStatus: ReimbursementStatus; isFinal: boolean; nextRole: 'Manajer' | 'HRD' | null } {
  if (decision === 'REJECTED') {
    return { nextStatus: 'REJECTED', isFinal: true, nextRole: null };
  }

  if (currentStatus === 'PENDING_MANAGER') {
    return { nextStatus: 'PENDING_FINANCE', isFinal: false, nextRole: 'HRD' }; // In enterprise HRIS HRD/Finance reviews stage 2
  }

  if (currentStatus === 'PENDING_FINANCE') {
    return { nextStatus: 'APPROVED', isFinal: true, nextRole: null };
  }

  return { nextStatus: currentStatus, isFinal: true, nextRole: null };
}

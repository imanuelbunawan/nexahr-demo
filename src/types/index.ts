export type ModuleType =
  | 'dashboard'
  | 'leave'
  | 'reimbursement'
  | 'approval'
  | 'employees'
  | 'roles'
  | 'reports'
  | 'kanban'
  | 'audit_logs'
  | 'attendance'
  | 'payroll';

export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export interface Permission {
  id: string; // e.g., 'view_leave', 'edit_role', 'approve_reimbursement'
  module: ModuleType;
  action: ActionType;
  name: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  label: string;
  description: string;
  color: string;
  isSystemRole?: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  managerName: string;
  location: string;
}

export type HierarchyLevelId =
  | 'c_level'
  | 'vp_director'
  | 'head_division'
  | 'manager'
  | 'supervisor'
  | 'staff'
  | 'entry_support';

export interface HierarchyLevelConfig {
  id: HierarchyLevelId;
  name: string;
  order: number;
  description: string;
  badgeColor: string;
  bgClass: string;
  borderClass: string;
  exampleRoles: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  roleId: string;
  departmentId: string;
  position: string;
  phone: string;
  joinDate: string;
  status: 'active' | 'on_leave' | 'inactive';
  employeeNumber: string; // NIP
  password?: string;
  managerId?: string | null;
  hierarchyLevel?: HierarchyLevelId;
}

export interface LeaveBalance {
  id: string;
  userId: string;
  annualQuota: number;
  usedQuota: number;
  remainingQuota: number;
  carryOverQuota: number;
}

export type LeaveStatus =
  | 'PENDING_MANAGER'
  | 'PENDING_HRD'
  | 'APPROVED'
  | 'REJECTED';

export type LeaveType =
  | 'Cuti Tahunan'
  | 'Cuti Sakit'
  | 'Cuti Melahirkan'
  | 'Cuti Menikah'
  | 'Cuti Khusus / Duka';

export interface ApprovalLog {
  id: string;
  requestId: string;
  stageName: string;
  approverId: string;
  approverName: string;
  approverRole: string;
  decision: 'APPROVED' | 'REJECTED';
  note: string;
  timestamp: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  emergencyContact: string;
  status: LeaveStatus;
  currentApproverRole: 'Manajer' | 'HRD' | null;
  createdAt: string;
  approvalLogs: ApprovalLog[];
}

export type ReimbursementCategory =
  | 'Kesehatan & Medis'
  | 'Transportasi & Bensin'
  | 'Makan Klien & Lembur'
  | 'Office Supplies & Alat Kerja'
  | 'Pelatihan & Sertifikasi';

export type ReimbursementStatus =
  | 'PENDING_MANAGER'
  | 'PENDING_FINANCE'
  | 'APPROVED'
  | 'REJECTED';

export interface Reimbursement {
  id: string;
  userId: string;
  category: ReimbursementCategory;
  amount: number;
  title: string;
  description: string;
  invoiceNumber: string;
  receiptName: string;
  receiptUrl: string;
  receiptDate: string;
  status: ReimbursementStatus;
  currentApproverRole: 'Manajer' | 'HRD' | null;
  createdAt: string;
  approvalLogs: ApprovalLog[];
}

export interface NotificationItem {
  id: string;
  recipientId: string | 'all';
  title: string;
  message: string;
  type: 'leave' | 'reimbursement' | 'role' | 'system' | 'socket';
  targetModule?: ModuleType;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  socketEvent?: string;
}

// Socket.io Real-time Event System Types
export type SocketConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export type SocketEventType =
  | 'approval:new'
  | 'approval:stage_passed'
  | 'approval:final_approved'
  | 'approval:rejected'
  | 'approval:reminder'
  | 'system:announcement';

export interface SocketApprovalPayload {
  id: string;
  event: SocketEventType;
  itemType: 'leave' | 'reimbursement';
  itemId: string;
  title: string;
  applicantName: string;
  applicantAvatar?: string;
  departmentName: string;
  stageName: string;
  currentRoleTarget: 'Manajer' | 'HRD' | 'All';
  amountOrDuration: string;
  timestamp: string;
  room: string;
}

// Kanban Work Management Types
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  departmentId: string;
  dueDate: string; // YYYY-MM-DD
  tags: string[];
  createdAt: string;
  completedAt?: string;
  createdBy: string;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// Audit Logs & Historical Activity Types
export type AuditActionCategory =
  | 'role'
  | 'approval'
  | 'employee'
  | 'task'
  | 'security'
  | 'attendance'
  | 'payroll';

export type AuditSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface AuditChangeDiff {
  field: string;
  label: string;
  oldValue?: string | number | boolean | null;
  newValue?: string | number | boolean | null;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601 string
  actorId: string;
  actorName: string;
  actorRole: string;
  actorAvatar?: string;
  category: AuditActionCategory;
  action: string; // e.g. 'UPDATE_USER_ROLE', 'APPROVE_LEAVE', 'REJECT_REIMBURSEMENT', 'EDIT_EMPLOYEE', 'TOGGLE_PERMISSION'
  actionTitle: string; // Human-readable summary e.g. "Perubahan Hak Akses Role Karyawan"
  targetId?: string;
  targetType: 'user' | 'role' | 'leave_request' | 'reimbursement' | 'task' | 'permission' | 'system' | 'attendance' | 'payroll' | 'overtime';
  targetName: string;
  description: string;
  changes?: AuditChangeDiff[];
  severity: AuditSeverity;
  ipAddress: string;
  metadata?: Record<string, unknown>;
}

export type NewAuditLogPayload = Omit<
  AuditLogEntry,
  'id' | 'timestamp' | 'actorId' | 'actorName' | 'actorRole' | 'ipAddress'
> & {
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  actorAvatar?: string;
  ipAddress?: string;
};

// Offline Synchronization & Storage Persistence Types
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

// Attendance & Shift Management Types
export type WorkType = 'WFO' | 'WFH' | 'DINAS_LUAR';
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ON_LEAVE' | 'ABSENT';

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:mm
  checkOutTime?: string; // HH:mm
  workType: WorkType;
  status: AttendanceStatus;
  locationName: string;
  notes?: string;
  ipAddress?: string;
}

export type OvertimeStatus = 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED';

export interface OvertimeRequest {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationHours: number;
  tasksDescription: string;
  status: OvertimeStatus;
  approverId?: string;
  approverName?: string;
  rejectionReason?: string;
  createdAt: string;
}

// Payroll & Payslip Management Types
export type PayrollStatus = 'DRAFT' | 'PROCESSED' | 'PAID';

export interface PayrollRecord {
  id: string;
  userId: string;
  month: string; // YYYY-MM e.g. "2026-11"
  periodLabel: string; // e.g. "November 2026"
  basicSalary: number; // Gaji Pokok
  allowancePosition: number; // Tunjangan Jabatan
  allowanceTransportMeal: number; // Tunjangan Makan & Transport
  overtimePay: number; // Insentif Lembur
  bonus: number; // Bonus Performa
  deductionBpjs: number; // BPJS Kesehatan & Ketenagakerjaan
  deductionTax: number; // PPh 21
  deductionOther: number; // Potongan Lainnya
  netSalary: number; // Take Home Pay
  paymentDate: string; // YYYY-MM-DD
  status: PayrollStatus;
  bankName: string;
  bankAccountNumber: string;
  createdAt: string;
}





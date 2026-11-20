import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterLeaveRequestsForExport,
  filterReimbursementsForExport,
  filterAuditLogsForExport,
  generateLeaveExportCsv,
  generateReimbursementExportCsv,
  generateEmployeesExportCsv,
  generateAuditExportCsv,
  generateAttendanceExportCsv,
  generatePayrollExportCsv,
} from './globalExportUtils.ts';
import {
  LeaveRequest,
  Reimbursement,
  User,
  Department,
  Role,
  LeaveBalance,
  AuditLogEntry,
  AttendanceRecord,
  PayrollRecord,
} from '../types/index.ts';

const SAMPLE_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Budi Santoso',
    email: 'budi@example.com',
    avatar: '',
    roleId: 'role_mgr',
    departmentId: 'dept_it',
    position: 'Manager IT',
    phone: '08123',
    joinDate: '2023-01-01',
    status: 'active',
    employeeNumber: 'NX-001',
  },
  {
    id: 'u-2',
    name: 'Siti Aminah',
    email: 'siti@example.com',
    avatar: '',
    roleId: 'role_staff',
    departmentId: 'dept_hr',
    position: 'Staff HR',
    phone: '08124',
    joinDate: '2023-06-01',
    status: 'active',
    employeeNumber: 'NX-002',
  },
];

const SAMPLE_DEPTS: Department[] = [
  { id: 'dept_it', name: 'Technology', code: 'ENG', managerName: 'Budi', location: 'Lt 5' },
  { id: 'dept_hr', name: 'Human Resources', code: 'HRGA', managerName: 'Siti', location: 'Lt 4' },
];

const SAMPLE_ROLES: Role[] = [
  { id: 'role_mgr', name: 'Manager', label: 'Manajer Divisi', description: 'Manager', color: 'blue' },
  { id: 'role_staff', name: 'Staff', label: 'Staff Karyawan', description: 'Staff', color: 'slate' },
];

const SAMPLE_BALANCES: LeaveBalance[] = [
  { id: 'b-1', userId: 'u-1', annualQuota: 15, usedQuota: 3, remainingQuota: 12, carryOverQuota: 0 },
  { id: 'b-2', userId: 'u-2', annualQuota: 12, usedQuota: 2, remainingQuota: 10, carryOverQuota: 0 },
];

const SAMPLE_LEAVE: LeaveRequest[] = [
  {
    id: 'req-1',
    userId: 'u-1',
    leaveType: 'Cuti Tahunan',
    startDate: '2026-10-10',
    endDate: '2026-10-12',
    totalDays: 3,
    reason: 'Liburan Keluarga',
    emergencyContact: '0811',
    status: 'APPROVED',
    currentApproverRole: null,
    createdAt: '2026-10-01T08:00:00Z',
    approvalLogs: [],
  },
  {
    id: 'req-2',
    userId: 'u-2',
    leaveType: 'Cuti Sakit',
    startDate: '2026-10-15',
    endDate: '2026-10-16',
    totalDays: 2,
    reason: 'Flu berat',
    emergencyContact: '0812',
    status: 'PENDING_MANAGER',
    currentApproverRole: 'Manajer',
    createdAt: '2026-10-14T08:00:00Z',
    approvalLogs: [],
  },
];

const SAMPLE_REIMB: Reimbursement[] = [
  {
    id: 'reimb-1',
    userId: 'u-1',
    category: 'Transportasi & Bensin',
    amount: 150000,
    title: 'Taksi Visit Klien',
    description: 'Grab Taxi ke kantor klien',
    invoiceNumber: 'INV-001',
    receiptName: 'struk.jpg',
    receiptUrl: '',
    receiptDate: '2026-10-11',
    status: 'APPROVED',
    currentApproverRole: null,
    createdAt: '2026-10-12T09:00:00Z',
    approvalLogs: [],
  },
];

const SAMPLE_AUDIT: AuditLogEntry[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-10-31T10:00:00Z',
    actorId: 'u-1',
    actorName: 'Budi Santoso',
    actorRole: 'Manager',
    category: 'role',
    action: 'UPDATE_ROLE',
    actionTitle: 'Update Role',
    targetName: 'Siti Aminah',
    targetType: 'user',
    description: 'Promosi jabatan',
    severity: 'info',
    ipAddress: '192.168.1.1',
  },
];

test('filterLeaveRequestsForExport filters by department', () => {
  const result = filterLeaveRequestsForExport(SAMPLE_LEAVE, SAMPLE_USERS, {
    dateRange: 'ALL',
    departmentId: 'dept_it',
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'req-1');
});

test('filterReimbursementsForExport filters properly', () => {
  const result = filterReimbursementsForExport(SAMPLE_REIMB, SAMPLE_USERS, {
    dateRange: 'ALL',
    departmentId: 'dept_hr',
  });
  assert.equal(result.length, 0);

  const itResult = filterReimbursementsForExport(SAMPLE_REIMB, SAMPLE_USERS, {
    dateRange: 'ALL',
    departmentId: 'dept_it',
  });
  assert.equal(itResult.length, 1);
});

test('filterAuditLogsForExport filters by audit category', () => {
  const roleLogs = filterAuditLogsForExport(SAMPLE_AUDIT, {
    dateRange: 'ALL',
    auditCategory: 'role',
  });
  assert.equal(roleLogs.length, 1);

  const approvalLogs = filterAuditLogsForExport(SAMPLE_AUDIT, {
    dateRange: 'ALL',
    auditCategory: 'approval',
  });
  assert.equal(approvalLogs.length, 0);
});

test('generateLeaveExportCsv creates valid CSV with headers and escaped values', () => {
  const csv = generateLeaveExportCsv(SAMPLE_LEAVE, SAMPLE_USERS, SAMPLE_DEPTS);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('ID Permohonan,NIP Karyawan,Nama Lengkap'));
  assert.ok(csv.includes('Budi Santoso'));
  assert.ok(csv.includes('Technology'));
});

test('generateReimbursementExportCsv creates valid CSV', () => {
  const csv = generateReimbursementExportCsv(SAMPLE_REIMB, SAMPLE_USERS, SAMPLE_DEPTS);
  assert.ok(csv.includes('Nomor Invoice'));
  assert.ok(csv.includes('INV-001'));
  assert.ok(csv.includes('150000'));
});

test('generateEmployeesExportCsv creates headcount CSV', () => {
  const csv = generateEmployeesExportCsv(SAMPLE_USERS, SAMPLE_DEPTS, SAMPLE_ROLES, SAMPLE_BALANCES);
  assert.ok(csv.includes('NIP Karyawan'));
  assert.ok(csv.includes('NX-001'));
  assert.ok(csv.includes('Manajer Divisi'));
});

test('generateAuditExportCsv creates audit log CSV', () => {
  const csv = generateAuditExportCsv(SAMPLE_AUDIT);
  assert.ok(csv.includes('Log ID,Waktu Eksekusi (WIB),Aktor Pelaksana'));
  assert.ok(csv.includes('AUD-001'));
  assert.ok(csv.includes('ROLE'));
});

test('generateAttendanceExportCsv creates valid attendance CSV', () => {
  const sampleAtt: AttendanceRecord[] = [
    {
      id: 'att-1',
      userId: 'u-1',
      date: '2026-11-16',
      checkInTime: '08:15',
      checkOutTime: '17:00',
      workType: 'WFO',
      status: 'PRESENT',
      locationName: 'Kantor Pusat',
      notes: 'Hadir tepat waktu',
    },
  ];
  const csv = generateAttendanceExportCsv(sampleAtt, SAMPLE_USERS, SAMPLE_DEPTS);
  assert.ok(csv.includes('ID Presensi,NIP,Nama Karyawan'));
  assert.ok(csv.includes('Budi Santoso'));
  assert.ok(csv.includes('08:15'));
  assert.ok(csv.includes('WFO'));
});

test('generatePayrollExportCsv creates valid payroll CSV', () => {
  const samplePay: PayrollRecord[] = [
    {
      id: 'pay-1',
      userId: 'u-1',
      month: '2026-11',
      periodLabel: 'November 2026',
      basicSalary: 15000000,
      allowancePosition: 3000000,
      allowanceTransportMeal: 2000000,
      overtimePay: 0,
      bonus: 0,
      deductionBpjs: 600000,
      deductionTax: 800000,
      deductionOther: 0,
      netSalary: 18600000,
      paymentDate: '2026-11-25',
      status: 'PROCESSED',
      bankName: 'BCA',
      bankAccountNumber: '12345',
      createdAt: '2026-11-01',
    },
  ];
  const csv = generatePayrollExportCsv(samplePay, SAMPLE_USERS, SAMPLE_DEPTS);
  assert.ok(csv.includes('ID Payroll,Periode,NIP'));
  assert.ok(csv.includes('Budi Santoso'));
  assert.ok(csv.includes('15000000'));
  assert.ok(csv.includes('18600000'));
});

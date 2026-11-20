import test from 'node:test';
import assert from 'node:assert';
import {
  formatReportIndonesianDate,
  generateReportNumber,
  calculateHRMetricsReport,
} from './reportMetricsUtils.ts';
import { User, Department, LeaveRequest, Reimbursement, LeaveBalance } from '../types/index.ts';

const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Budi Santoso',
    email: 'budi@nexahr.co.id',
    avatar: 'https://example.com/budi.jpg',
    roleId: 'role_mgr',
    departmentId: 'dept_it',
    position: 'VP Engineering',
    phone: '0811',
    joinDate: '2022-01-01',
    status: 'active',
    employeeNumber: 'NX-001',
  },
  {
    id: 'u2',
    name: 'Maya Putri',
    email: 'maya@nexahr.co.id',
    avatar: 'https://example.com/maya.jpg',
    roleId: 'role_staff',
    departmentId: 'dept_mkt',
    position: 'Growth Lead',
    phone: '0812',
    joinDate: '2023-01-01',
    status: 'on_leave',
    employeeNumber: 'NX-002',
  },
];

const mockDepts: Department[] = [
  { id: 'dept_it', name: 'Information Technology', code: 'IT', managerName: 'Budi', location: 'Jakarta' },
  { id: 'dept_mkt', name: 'Marketing', code: 'MKT', managerName: 'Maya', location: 'Jakarta' },
];

const mockBalances: LeaveBalance[] = [
  { id: 'b1', userId: 'u1', annualQuota: 15, usedQuota: 5, remainingQuota: 10, carryOverQuota: 0 },
  { id: 'b2', userId: 'u2', annualQuota: 12, usedQuota: 3, remainingQuota: 9, carryOverQuota: 0 },
];

const mockLeaves: LeaveRequest[] = [
  {
    id: 'l1',
    userId: 'u1',
    leaveType: 'Cuti Tahunan',
    startDate: '2026-10-10',
    endDate: '2026-10-12',
    totalDays: 3,
    reason: 'Family',
    emergencyContact: '0811',
    status: 'APPROVED',
    currentApproverRole: null,
    createdAt: '2026-10-01T00:00:00Z',
    approvalLogs: [],
  },
  {
    id: 'l2',
    userId: 'u2',
    leaveType: 'Cuti Sakit',
    startDate: '2026-10-20',
    endDate: '2026-10-21',
    totalDays: 2,
    reason: 'Fever',
    emergencyContact: '0812',
    status: 'PENDING_HRD',
    currentApproverRole: 'HRD',
    createdAt: '2026-10-18T00:00:00Z',
    approvalLogs: [],
  },
];

const mockReimbs: Reimbursement[] = [
  {
    id: 'r1',
    userId: 'u1',
    category: 'Office Supplies & Alat Kerja',
    amount: 1000000,
    title: 'Monitor Stand',
    description: 'Work tool',
    invoiceNumber: 'INV-1',
    receiptName: 'r1.jpg',
    receiptUrl: 'https://example.com/r1.jpg',
    receiptDate: '2026-10-10',
    status: 'APPROVED',
    currentApproverRole: null,
    createdAt: '2026-10-10T00:00:00Z',
    approvalLogs: [],
  },
  {
    id: 'r2',
    userId: 'u2',
    category: 'Transportasi & Bensin',
    amount: 500000,
    title: 'Taxi',
    description: 'Meeting',
    invoiceNumber: 'INV-2',
    receiptName: 'r2.jpg',
    receiptUrl: 'https://example.com/r2.jpg',
    receiptDate: '2026-10-15',
    status: 'PENDING_MANAGER',
    currentApproverRole: 'Manajer',
    createdAt: '2026-10-15T00:00:00Z',
    approvalLogs: [],
  },
];

test('formatReportIndonesianDate formats standard dates correctly', () => {
  const d = new Date(2026, 9, 25); // Oct 25, 2026
  assert.strictEqual(formatReportIndonesianDate(d), '25 Oktober 2026');
});

test('generateReportNumber generates formatted serial string', () => {
  const d = new Date(2026, 9, 25);
  const num = generateReportNumber(d);
  assert.ok(num.startsWith('RPT-HRIS/202610/25'));
});

test('calculateHRMetricsReport calculates exact aggregations for report document', () => {
  const fixedDate = new Date(2026, 9, 25);
  const report = calculateHRMetricsReport(
    mockUsers,
    mockDepts,
    mockLeaves,
    mockReimbs,
    mockBalances,
    fixedDate
  );

  assert.strictEqual(report.totalEmployees, 2);
  assert.strictEqual(report.activeEmployees, 1);
  assert.strictEqual(report.onLeaveEmployees, 1);
  assert.strictEqual(report.departmentCount, 2);

  // Leave stats
  assert.strictEqual(report.leaveMetrics.totalAnnualQuota, 27); // 15 + 12
  assert.strictEqual(report.leaveMetrics.totalUsedDays, 8); // 5 + 3
  assert.strictEqual(report.leaveMetrics.totalRemainingDays, 19); // 10 + 9
  assert.strictEqual(report.leaveMetrics.approvedRequestsCount, 1);
  assert.strictEqual(report.leaveMetrics.pendingRequestsCount, 1);
  assert.strictEqual(report.leaveMetrics.utilizationRate, 30); // 8/27 = 29.6% -> 30%

  // Reimbursement stats
  assert.strictEqual(report.reimbursementMetrics.totalApprovedAmount, 1000000);
  assert.strictEqual(report.reimbursementMetrics.totalPendingAmount, 500000);
  assert.strictEqual(report.reimbursementMetrics.approvedTransactionsCount, 1);
  assert.strictEqual(report.reimbursementMetrics.pendingTransactionsCount, 1);
  assert.strictEqual(report.reimbursementMetrics.categoryBreakdown.length, 1);
  assert.strictEqual(report.reimbursementMetrics.categoryBreakdown[0].category, 'Office Supplies & Alat Kerja');

  // Department breakdown
  const itDept = report.departmentMetrics.find((d) => d.id === 'dept_it');
  assert.ok(itDept);
  assert.strictEqual(itDept.headcount, 1);
  assert.strictEqual(itDept.leaveDaysTaken, 3);
  assert.strictEqual(itDept.approvedReimbursementAmount, 1000000);

  // Approval velocity (2 approved/rejected out of 4 total submissions = 50%)
  assert.strictEqual(report.approvalVelocityRate, 50);
});

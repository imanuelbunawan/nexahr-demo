import test from 'node:test';
import assert from 'node:assert';
import {
  isDateInRange,
  padZero,
  formatDateKey,
  formatIndonesianDate,
  getDaysInMonth,
  generateMonthGrid,
  buildTeamCalendarMonth,
  calculateMonthWorkforceSummary,
} from './teamCalendarUtils.ts';
import { User, LeaveRequest, Department } from '../types/index.ts';

const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Budi Santoso',
    email: 'budi@example.com',
    avatar: 'https://example.com/budi.jpg',
    roleId: 'role_manager',
    departmentId: 'dept_it',
    position: 'VP of Tech',
    phone: '0812345678',
    joinDate: '2022-01-15',
    status: 'active',
    employeeNumber: 'NX-001',
  },
  {
    id: 'u2',
    name: 'Reza Aditya',
    email: 'reza@example.com',
    avatar: 'https://example.com/reza.jpg',
    roleId: 'role_staff',
    departmentId: 'dept_it',
    position: 'Fullstack Dev',
    phone: '0812345679',
    joinDate: '2023-03-01',
    status: 'active',
    employeeNumber: 'NX-002',
  },
  {
    id: 'u3',
    name: 'Maya Putri',
    email: 'maya@example.com',
    avatar: 'https://example.com/maya.jpg',
    roleId: 'role_staff',
    departmentId: 'dept_mkt',
    position: 'Growth Lead',
    phone: '0812345680',
    joinDate: '2023-08-15',
    status: 'active',
    employeeNumber: 'NX-003',
  },
];

const mockDepartments: Department[] = [
  { id: 'dept_it', name: 'Information Technology', code: 'IT', managerName: 'Budi', location: 'Jakarta' },
  { id: 'dept_mkt', name: 'Marketing & Growth', code: 'MKT', managerName: 'Maya', location: 'Jakarta' },
];

const mockLeaves: LeaveRequest[] = [
  {
    id: 'leave_1',
    userId: 'u1',
    leaveType: 'Cuti Tahunan',
    startDate: '2026-10-14',
    endDate: '2026-10-16',
    totalDays: 3,
    reason: 'Family event',
    emergencyContact: '0811',
    status: 'APPROVED',
    currentApproverRole: null,
    createdAt: '2026-10-01T10:00:00Z',
    approvalLogs: [],
  },
  {
    id: 'leave_2',
    userId: 'u2',
    leaveType: 'Cuti Sakit',
    startDate: '2026-10-15',
    endDate: '2026-10-17',
    totalDays: 3,
    reason: 'Fever',
    emergencyContact: '0812',
    status: 'PENDING_MANAGER',
    currentApproverRole: 'Manajer',
    createdAt: '2026-10-14T08:00:00Z',
    approvalLogs: [],
  },
  {
    id: 'leave_3',
    userId: 'u3',
    leaveType: 'Cuti Menikah',
    startDate: '2026-10-26',
    endDate: '2026-10-28',
    totalDays: 3,
    reason: 'Wedding ceremony',
    emergencyContact: '0813',
    status: 'PENDING_HRD',
    currentApproverRole: 'HRD',
    createdAt: '2026-10-10T12:00:00Z',
    approvalLogs: [],
  },
  {
    id: 'leave_rejected',
    userId: 'u2',
    leaveType: 'Cuti Tahunan',
    startDate: '2026-10-20',
    endDate: '2026-10-22',
    totalDays: 3,
    reason: 'Personal',
    emergencyContact: '0812',
    status: 'REJECTED',
    currentApproverRole: null,
    createdAt: '2026-10-05T08:00:00Z',
    approvalLogs: [],
  },
];

test('isDateInRange correctly identifies date containment', () => {
  assert.strictEqual(isDateInRange('2026-10-15', '2026-10-14', '2026-10-16'), true);
  assert.strictEqual(isDateInRange('2026-10-14', '2026-10-14', '2026-10-16'), true);
  assert.strictEqual(isDateInRange('2026-10-16', '2026-10-14', '2026-10-16'), true);
  assert.strictEqual(isDateInRange('2026-10-13', '2026-10-14', '2026-10-16'), false);
  assert.strictEqual(isDateInRange('2026-10-17', '2026-10-14', '2026-10-16'), false);
});

test('padZero and formatDateKey format proper date keys', () => {
  assert.strictEqual(padZero(5), '05');
  assert.strictEqual(padZero(12), '12');
  assert.strictEqual(formatDateKey(2026, 10, 5), '2026-10-05');
});

test('formatIndonesianDate outputs proper Indonesian string', () => {
  assert.strictEqual(formatIndonesianDate('2026-10-25'), '25 Oktober 2026');
  assert.strictEqual(formatIndonesianDate('2026-01-01'), '1 Januari 2026');
});

test('getDaysInMonth returns accurate days for regular and leap years', () => {
  assert.strictEqual(getDaysInMonth(2026, 10), 31);
  assert.strictEqual(getDaysInMonth(2026, 2), 28);
  assert.strictEqual(getDaysInMonth(2024, 2), 29); // leap year
});

test('generateMonthGrid creates complete 35 or 42 cell grid aligned to Monday', () => {
  const grid = generateMonthGrid(2026, 10, '2026-10-25');
  assert.ok(grid.length === 35 || grid.length === 42, `Grid length was ${grid.length}`);
  
  // October 2026: Oct 1 is Thursday, so Monday starts on Sep 28
  assert.strictEqual(grid[0].date, '2026-09-28');
  assert.strictEqual(grid[0].isCurrentMonth, false);

  // Today check
  const todayCell = grid.find((c) => c.date === '2026-10-25');
  assert.ok(todayCell);
  assert.strictEqual(todayCell.isToday, true);
  assert.strictEqual(todayCell.isCurrentMonth, true);
});

test('buildTeamCalendarMonth correctly maps leave requests and excludes rejected requests', () => {
  const calendar = buildTeamCalendarMonth(
    2026,
    10,
    mockLeaves,
    mockUsers,
    mockDepartments,
    undefined,
    '2026-10-25'
  );

  // Check Oct 15: u1 (approved) and u2 (pending) are both on leave!
  const cellOct15 = calendar.find((c) => c.date === '2026-10-15');
  assert.ok(cellOct15);
  assert.strictEqual(cellOct15.leaves.length, 2);
  assert.strictEqual(cellOct15.hasApproved, true);
  assert.strictEqual(cellOct15.hasPending, true);
  assert.strictEqual(cellOct15.isCoverageRisk, true);

  // Check Oct 20: leave_rejected should NOT be mapped
  const cellOct20 = calendar.find((c) => c.date === '2026-10-20');
  assert.ok(cellOct20);
  assert.strictEqual(cellOct20.leaves.length, 0);

  // Check Oct 26: u3 (pending HRD) is on leave
  const cellOct26 = calendar.find((c) => c.date === '2026-10-26');
  assert.ok(cellOct26);
  assert.strictEqual(cellOct26.leaves.length, 1);
  assert.strictEqual(cellOct26.leaves[0].user.name, 'Maya Putri');
  assert.strictEqual(cellOct26.hasPending, true);
});

test('buildTeamCalendarMonth respects department and status filters', () => {
  // Filter by dept_it only
  const calendarIt = buildTeamCalendarMonth(
    2026,
    10,
    mockLeaves,
    mockUsers,
    mockDepartments,
    { departmentId: 'dept_it', status: 'ALL' }
  );

  const cellOct26It = calendarIt.find((c) => c.date === '2026-10-26');
  assert.ok(cellOct26It);
  // Maya is in dept_mkt, so should be filtered out
  assert.strictEqual(cellOct26It.leaves.length, 0);

  // Filter by APPROVED only
  const calendarApprovedOnly = buildTeamCalendarMonth(
    2026,
    10,
    mockLeaves,
    mockUsers,
    mockDepartments,
    { departmentId: 'ALL', status: 'APPROVED' }
  );
  const cellOct15Approved = calendarApprovedOnly.find((c) => c.date === '2026-10-15');
  assert.ok(cellOct15Approved);
  // Only u1 is approved on Oct 15
  assert.strictEqual(cellOct15Approved.leaves.length, 1);
  assert.strictEqual(cellOct15Approved.leaves[0].user.name, 'Budi Santoso');
});

test('calculateMonthWorkforceSummary aggregates key planning metrics', () => {
  const calendar = buildTeamCalendarMonth(
    2026,
    10,
    mockLeaves,
    mockUsers,
    mockDepartments,
    undefined,
    '2026-10-25'
  );

  const summary = calculateMonthWorkforceSummary(2026, 10, calendar, mockUsers);

  assert.strictEqual(summary.monthName, 'Oktober');
  assert.strictEqual(summary.year, 2026);
  assert.strictEqual(summary.totalTeamMembers, 3);
  assert.strictEqual(summary.totalLeaveEvents, 3); // leave_1, leave_2, leave_3
  assert.strictEqual(summary.approvedCount, 1); // leave_1
  assert.strictEqual(summary.pendingCount, 2); // leave_2, leave_3
  assert.strictEqual(summary.uniqueEmployeesOnLeave, 3);
  assert.strictEqual(summary.peakAbsenceDate, '2026-10-15');
  assert.strictEqual(summary.peakAbsenceCount, 2);
  assert.strictEqual(summary.coverageRiskDaysCount >= 1, true);
});

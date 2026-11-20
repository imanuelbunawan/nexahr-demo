import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHeadcountTimeline,
  calculateLeaveDistribution,
  calculateReimbursementPipeline,
  calculateQuickSummaryStats,
} from './dashboardChartUtils.ts';
import { User, LeaveRequest, Reimbursement } from '../types/index.ts';

const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'User One',
    email: 'u1@test.com',
    avatar: '',
    roleId: 'r1',
    departmentId: 'd1',
    position: 'Dev',
    phone: '123',
    joinDate: '2022-01-10',
    status: 'active',
    employeeNumber: 'NX-001',
  },
  {
    id: 'u2',
    name: 'User Two',
    email: 'u2@test.com',
    avatar: '',
    roleId: 'r2',
    departmentId: 'd2',
    position: 'QA',
    phone: '456',
    joinDate: '2023-04-15',
    status: 'active',
    employeeNumber: 'NX-002',
  },
];

const mockLeaves: LeaveRequest[] = [
  {
    id: 'l1',
    userId: 'u1',
    leaveType: 'Cuti Tahunan',
    startDate: '2026-05-01',
    endDate: '2026-05-03',
    totalDays: 3,
    reason: 'Vacation',
    emergencyContact: '081',
    status: 'APPROVED',
    currentApproverRole: null,
    createdAt: '2026-04-20',
    approvalLogs: [],
  },
  {
    id: 'l2',
    userId: 'u2',
    leaveType: 'Cuti Sakit',
    startDate: '2026-05-10',
    endDate: '2026-05-11',
    totalDays: 2,
    reason: 'Flu',
    emergencyContact: '082',
    status: 'PENDING_MANAGER',
    currentApproverRole: 'Manajer',
    createdAt: '2026-05-09',
    approvalLogs: [],
  },
];

const mockReimbursements: Reimbursement[] = [
  {
    id: 'r1',
    userId: 'u1',
    category: 'Transportasi & Bensin',
    amount: 150000,
    title: 'Taxi to client',
    description: '',
    invoiceNumber: 'INV-01',
    receiptName: 'receipt.png',
    receiptUrl: '',
    receiptDate: '2026-05-01',
    status: 'APPROVED',
    currentApproverRole: null,
    createdAt: '2026-05-02',
    approvalLogs: [],
  },
  {
    id: 'r2',
    userId: 'u2',
    category: 'Kesehatan & Medis',
    amount: 500000,
    title: 'Doctor check',
    description: '',
    invoiceNumber: 'INV-02',
    receiptName: 'receipt2.png',
    receiptUrl: '',
    receiptDate: '2026-05-03',
    status: 'PENDING_MANAGER',
    currentApproverRole: 'Manajer',
    createdAt: '2026-05-04',
    approvalLogs: [],
  },
];

test('calculateHeadcountTimeline creates sorted cumulative progression', () => {
  const points = calculateHeadcountTimeline(mockUsers);
  assert.equal(points.length, 2);
  assert.equal(points[0].period, 'Jan 2022');
  assert.equal(points[0].headcount, 1);
  assert.equal(points[1].period, 'Apr 2023');
  assert.equal(points[1].headcount, 2);
});

test('calculateLeaveDistribution computes approved and pending days per category', () => {
  const points = calculateLeaveDistribution(mockLeaves);
  const annual = points.find((p) => p.name === 'Cuti Tahunan');
  const sick = points.find((p) => p.name === 'Cuti Sakit');

  assert.ok(annual);
  assert.equal(annual.approvedDays, 3);
  assert.equal(annual.pendingDays, 0);

  assert.ok(sick);
  assert.equal(sick.approvedDays, 0);
  assert.equal(sick.pendingDays, 2);
});

test('calculateReimbursementPipeline categorizes pending and approved amounts', () => {
  const points = calculateReimbursementPipeline(mockReimbursements);
  const transport = points.find((p) => p.category === 'Transportasi & Bensin');
  const health = points.find((p) => p.category === 'Kesehatan & Medis');

  assert.ok(transport);
  assert.equal(transport.approvedAmount, 150000);
  assert.equal(transport.pendingAmount, 0);

  assert.ok(health);
  assert.equal(health.pendingAmount, 500000);
  assert.equal(health.approvedAmount, 0);
});

test('calculateQuickSummaryStats aggregates overall metrics', () => {
  const stats = calculateQuickSummaryStats(mockUsers, mockLeaves, mockReimbursements);
  assert.equal(stats.totalHeadcount, 2);
  assert.equal(stats.activeLeavesCount, 2);
  assert.equal(stats.totalLeaveDaysTaken, 3);
  assert.equal(stats.pendingReimbursementAmount, 500000);
  assert.equal(stats.pendingReimbursementCount, 1);
  assert.equal(stats.approvedReimbursementAmount, 150000);
  // Total 4 submissions: 2 processed (1 approved leave, 1 approved reimb), 2 pending -> 50%
  assert.equal(stats.approvalVelocityRate, 50);
});

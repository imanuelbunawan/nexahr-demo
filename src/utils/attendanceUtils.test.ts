import test from 'node:test';
import assert from 'node:assert';
import {
  determineAttendanceStatus,
  calculateAttendanceStats,
  validateOvertimeRequest,
  calculateOvertimePay,
  filterAttendanceRecords,
} from './attendanceUtils.ts';
import { AttendanceRecord, User } from '../types/index.ts';

test('determineAttendanceStatus determines PRESENT or LATE accurately', () => {
  assert.strictEqual(determineAttendanceStatus('08:30', '09:00'), 'PRESENT');
  assert.strictEqual(determineAttendanceStatus('09:00', '09:00'), 'PRESENT');
  assert.strictEqual(determineAttendanceStatus('09:01', '09:00'), 'LATE');
  assert.strictEqual(determineAttendanceStatus('10:15', '09:00'), 'LATE');
  assert.strictEqual(determineAttendanceStatus(''), 'ABSENT');
});

test('calculateAttendanceStats aggregates presence counts and punctuality rate', () => {
  const sampleRecords: AttendanceRecord[] = [
    {
      id: 'a1',
      userId: 'u1',
      date: '2026-11-16',
      checkInTime: '08:15',
      workType: 'WFO',
      status: 'PRESENT',
      locationName: 'Kantor',
    },
    {
      id: 'a2',
      userId: 'u2',
      date: '2026-11-16',
      checkInTime: '08:45',
      workType: 'WFH',
      status: 'PRESENT',
      locationName: 'Rumah',
    },
    {
      id: 'a3',
      userId: 'u3',
      date: '2026-11-16',
      checkInTime: '09:30',
      workType: 'WFO',
      status: 'LATE',
      locationName: 'Kantor',
    },
  ];

  const stats = calculateAttendanceStats(sampleRecords);
  assert.strictEqual(stats.totalRecords, 3);
  assert.strictEqual(stats.presentCount, 2);
  assert.strictEqual(stats.lateCount, 1);
  assert.strictEqual(stats.wfoCount, 2);
  assert.strictEqual(stats.wfhCount, 1);
  assert.strictEqual(stats.punctualityRate, 67); // 2/3 = 66.6% -> 67%
});

test('validateOvertimeRequest handles valid and invalid payloads', () => {
  const valid = validateOvertimeRequest({
    date: '2026-11-16',
    startTime: '18:00',
    endTime: '21:00',
    durationHours: 3,
    tasksDescription: 'Deploy microservices release patch v2.4',
  });
  assert.strictEqual(valid.valid, true);

  const invalidTime = validateOvertimeRequest({
    date: '2026-11-16',
    startTime: '21:00',
    endTime: '18:00',
    durationHours: 3,
    tasksDescription: 'Invalid timing',
  });
  assert.strictEqual(invalidTime.valid, false);

  const emptyDesc = validateOvertimeRequest({
    date: '2026-11-16',
    startTime: '18:00',
    endTime: '20:00',
    durationHours: 2,
    tasksDescription: '',
  });
  assert.strictEqual(emptyDesc.valid, false);
});

test('calculateOvertimePay computes tiered depnaker rates', () => {
  const hourlyRate = 50000;
  // 1 hour: 1.5 * 50000 = 75000
  assert.strictEqual(calculateOvertimePay(hourlyRate, 1), 75000);
  // 2 hours: (1.5 * 50000) + (2.0 * 50000 * 1) = 75000 + 100000 = 175000
  assert.strictEqual(calculateOvertimePay(hourlyRate, 2), 175000);
});

test('filterAttendanceRecords filters by department and query', () => {
  const users: User[] = [
    {
      id: 'u1',
      name: 'Budi Santoso',
      email: 'budi@test.com',
      avatar: '',
      roleId: 'role_manager',
      departmentId: 'dept_it',
      position: 'VP',
      phone: '',
      joinDate: '2022-01-01',
      status: 'active',
      employeeNumber: 'NX-001',
    },
    {
      id: 'u2',
      name: 'Maya Lestari',
      email: 'maya@test.com',
      avatar: '',
      roleId: 'role_karyawan',
      departmentId: 'dept_mkt',
      position: 'Staff',
      phone: '',
      joinDate: '2023-01-01',
      status: 'active',
      employeeNumber: 'NX-002',
    },
  ];

  const records: AttendanceRecord[] = [
    {
      id: 'a1',
      userId: 'u1',
      date: '2026-11-16',
      checkInTime: '08:30',
      workType: 'WFO',
      status: 'PRESENT',
      locationName: 'Gedung Cyber',
    },
    {
      id: 'a2',
      userId: 'u2',
      date: '2026-11-16',
      checkInTime: '09:10',
      workType: 'WFH',
      status: 'LATE',
      locationName: 'Home',
    },
  ];

  const itOnly = filterAttendanceRecords(records, users, { departmentId: 'dept_it' });
  assert.strictEqual(itOnly.length, 1);
  assert.strictEqual(itOnly[0].userId, 'u1');

  const searchMaya = filterAttendanceRecords(records, users, { searchQuery: 'Maya' });
  assert.strictEqual(searchMaya.length, 1);
  assert.strictEqual(searchMaya[0].userId, 'u2');
});


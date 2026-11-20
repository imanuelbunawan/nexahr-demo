import test from 'node:test';
import assert from 'node:assert';
import {
  calculateGrossEarnings,
  calculateTotalDeductions,
  calculateNetSalary,
  numberToIndonesianWords,
  generatePayslipSerial,
  calculatePayrollStats,
  filterPayrollRecords,
} from './payrollUtils.ts';
import { PayrollRecord, User } from '../types/index.ts';

test('calculateGrossEarnings, deductions and net salary compute exact sums', () => {
  const item = {
    basicSalary: 10000000,
    allowancePosition: 2000000,
    allowanceTransportMeal: 1500000,
    overtimePay: 500000,
    bonus: 1000000,
    deductionBpjs: 400000,
    deductionTax: 600000,
    deductionOther: 0,
  };

  const gross = calculateGrossEarnings(item);
  assert.strictEqual(gross, 15000000);

  const deductions = calculateTotalDeductions(item);
  assert.strictEqual(deductions, 1000000);

  const net = calculateNetSalary(gross, deductions);
  assert.strictEqual(net, 14000000);
});

test('numberToIndonesianWords formats exact numbers to Indonesian phrases', () => {
  assert.strictEqual(numberToIndonesianWords(0), 'Nol Rupiah');
  assert.strictEqual(numberToIndonesianWords(50000), 'Lima Puluh Ribu Rupiah');
  assert.strictEqual(numberToIndonesianWords(1500000), 'Satu Juta Lima Ratus Ribu Rupiah');
  assert.strictEqual(numberToIndonesianWords(10000000), 'Sepuluh Juta Rupiah');
  assert.strictEqual(numberToIndonesianWords(25300000), 'Dua Puluh Lima Juta Tiga Ratus Ribu Rupiah');
});

test('generatePayslipSerial formats correct serial structure', () => {
  const serial = generatePayslipSerial('user_owner', '2026-11');
  assert.strictEqual(serial, 'PAY-202611-USEROWNE');
});

test('calculatePayrollStats aggregates list statistics accurately', () => {
  const records: PayrollRecord[] = [
    {
      id: 'p1',
      userId: 'u1',
      month: '2026-11',
      periodLabel: 'November 2026',
      basicSalary: 10000000,
      allowancePosition: 2000000,
      allowanceTransportMeal: 1000000,
      overtimePay: 0,
      bonus: 0,
      deductionBpjs: 400000,
      deductionTax: 600000,
      deductionOther: 0,
      netSalary: 12000000,
      paymentDate: '2026-11-25',
      status: 'PROCESSED',
      bankName: 'BCA',
      bankAccountNumber: '123',
      createdAt: '2026-11-01',
    },
    {
      id: 'p2',
      userId: 'u2',
      month: '2026-11',
      periodLabel: 'November 2026',
      basicSalary: 8000000,
      allowancePosition: 1000000,
      allowanceTransportMeal: 1000000,
      overtimePay: 0,
      bonus: 0,
      deductionBpjs: 300000,
      deductionTax: 400000,
      deductionOther: 0,
      netSalary: 9300000,
      paymentDate: '2026-11-25',
      status: 'PROCESSED',
      bankName: 'Mandiri',
      bankAccountNumber: '456',
      createdAt: '2026-11-01',
    },
  ];

  const stats = calculatePayrollStats(records);
  assert.strictEqual(stats.totalRecords, 2);
  assert.strictEqual(stats.totalGrossPayroll, 23000000);
  assert.strictEqual(stats.totalNetPayroll, 21300000);
  assert.strictEqual(stats.totalTaxPaid, 1000000);
  assert.strictEqual(stats.totalBpjsPaid, 700000);
  assert.strictEqual(stats.averageNetSalary, 10650000);
});

test('filterPayrollRecords filters by month, department, and query', () => {
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
  ];

  const records: PayrollRecord[] = [
    {
      id: 'p1',
      userId: 'u1',
      month: '2026-11',
      periodLabel: 'November 2026',
      basicSalary: 10000000,
      allowancePosition: 0,
      allowanceTransportMeal: 0,
      overtimePay: 0,
      bonus: 0,
      deductionBpjs: 0,
      deductionTax: 0,
      deductionOther: 0,
      netSalary: 10000000,
      paymentDate: '2026-11-25',
      status: 'PROCESSED',
      bankName: 'BCA',
      bankAccountNumber: '123',
      createdAt: '2026-11-01',
    },
  ];

  const filtered = filterPayrollRecords(records, users, { month: '2026-11', departmentId: 'dept_it' });
  assert.strictEqual(filtered.length, 1);

  const mismatch = filterPayrollRecords(records, users, { month: '2026-10' });
  assert.strictEqual(mismatch.length, 0);
});


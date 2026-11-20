import { PayrollRecord, User, Department, PayrollStatus } from '../types/index.ts';

export interface PayrollSummaryStats {
  totalRecords: number;
  totalGrossPayroll: number;
  totalNetPayroll: number;
  totalDeductions: number;
  totalTaxPaid: number;
  totalBpjsPaid: number;
  averageNetSalary: number;
}

export function calculateGrossEarnings(record: {
  basicSalary: number;
  allowancePosition: number;
  allowanceTransportMeal: number;
  overtimePay: number;
  bonus: number;
}): number {
  return (
    (record.basicSalary || 0) +
    (record.allowancePosition || 0) +
    (record.allowanceTransportMeal || 0) +
    (record.overtimePay || 0) +
    (record.bonus || 0)
  );
}

export function calculateTotalDeductions(record: {
  deductionBpjs: number;
  deductionTax: number;
  deductionOther: number;
}): number {
  return (
    (record.deductionBpjs || 0) +
    (record.deductionTax || 0) +
    (record.deductionOther || 0)
  );
}

export function calculateNetSalary(gross: number, deductions: number): number {
  return Math.max(0, gross - deductions);
}

/**
 * Converts a positive integer to formal Indonesian words (Terbilang).
 * E.g. 1500000 -> "Satu Juta Lima Ratus Ribu Rupiah"
 */
export function numberToIndonesianWords(num: number): string {
  if (num === 0) return 'Nol Rupiah';
  if (num < 0) return 'Minus ' + numberToIndonesianWords(Math.abs(num));

  const satuan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  function convert(n: number): string {
    if (n < 12) {
      return satuan[n];
    } else if (n < 20) {
      return convert(n - 10) + ' Belas';
    } else if (n < 100) {
      const s = convert(n % 10);
      return convert(Math.floor(n / 10)) + ' Puluh' + (s ? ' ' + s : '');
    } else if (n < 200) {
      const s = convert(n - 100);
      return 'Seratus' + (s ? ' ' + s : '');
    } else if (n < 1000) {
      const s = convert(n % 100);
      return convert(Math.floor(n / 100)) + ' Ratus' + (s ? ' ' + s : '');
    } else if (n < 2000) {
      const s = convert(n - 1000);
      return 'Seribu' + (s ? ' ' + s : '');
    } else if (n < 1000000) {
      const s = convert(n % 1000);
      return convert(Math.floor(n / 1000)) + ' Ribu' + (s ? ' ' + s : '');
    } else if (n < 1000000000) {
      const s = convert(n % 1000000);
      return convert(Math.floor(n / 1000000)) + ' Juta' + (s ? ' ' + s : '');
    } else if (n < 1000000000000) {
      const s = convert(n % 1000000000);
      return convert(Math.floor(n / 1000000000)) + ' Miliar' + (s ? ' ' + s : '');
    }
    return n.toString();
  }

  const result = convert(Math.round(num)).trim();
  return result ? `${result} Rupiah` : 'Nol Rupiah';
}

/**
 * Generates an official payslip serial code.
 */
export function generatePayslipSerial(userId: string, month: string): string {
  const cleanMonth = month.replace(/[^0-9]/g, '');
  const cleanUser = userId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  return `PAY-${cleanMonth}-${cleanUser}`;
}

/**
 * Calculates payroll aggregates across a list of records.
 */
export function calculatePayrollStats(records: PayrollRecord[]): PayrollSummaryStats {
  const total = records.length;
  if (total === 0) {
    return {
      totalRecords: 0,
      totalGrossPayroll: 0,
      totalNetPayroll: 0,
      totalDeductions: 0,
      totalTaxPaid: 0,
      totalBpjsPaid: 0,
      averageNetSalary: 0,
    };
  }

  let gross = 0;
  let net = 0;
  let deductions = 0;
  let tax = 0;
  let bpjs = 0;

  for (const r of records) {
    const curGross = calculateGrossEarnings(r);
    const curDed = calculateTotalDeductions(r);
    gross += curGross;
    net += r.netSalary;
    deductions += curDed;
    tax += r.deductionTax;
    bpjs += r.deductionBpjs;
  }

  return {
    totalRecords: total,
    totalGrossPayroll: gross,
    totalNetPayroll: net,
    totalDeductions: deductions,
    totalTaxPaid: tax,
    totalBpjsPaid: bpjs,
    averageNetSalary: Math.round(net / total),
  };
}

/**
 * Filter payroll records by department, status, month, and user.
 */
export function filterPayrollRecords(
  records: PayrollRecord[],
  users: User[],
  options: {
    month?: string;
    departmentId?: string;
    status?: PayrollStatus | 'ALL';
    searchQuery?: string;
  }
): PayrollRecord[] {
  const userMap = new Map(users.map((u) => [u.id, u]));

  return records.filter((r) => {
    const user = userMap.get(r.userId);
    if (!user) return false;

    if (options.month && options.month !== 'ALL' && r.month !== options.month) {
      return false;
    }

    if (options.departmentId && options.departmentId !== 'ALL' && user.departmentId !== options.departmentId) {
      return false;
    }

    if (options.status && options.status !== 'ALL' && r.status !== options.status) {
      return false;
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase();
      const matchName = user.name.toLowerCase().includes(q);
      const matchNip = user.employeeNumber.toLowerCase().includes(q);
      const matchBank = r.bankName.toLowerCase().includes(q);
      if (!matchName && !matchNip && !matchBank) {
        return false;
      }
    }

    return true;
  });
}


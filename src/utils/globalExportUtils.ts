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
import { formatAuditTimestamp } from './auditUtils.ts';
import { formatRupiah } from './rbac.ts';

export type ExportDatasetType =
  | 'leave_requests'
  | 'reimbursements'
  | 'employees'
  | 'audit_logs'
  | 'attendance'
  | 'payroll';

export type ExportFormat = 'csv' | 'pdf';

export interface GlobalExportFilterOptions {
  dataset: ExportDatasetType;
  format: ExportFormat;
  dateRange: 'ALL' | 'this_month' | '30days' | '7days';
  departmentId: string | 'ALL';
  auditCategory?: string | 'ALL';
}

export interface ExportSummaryMeta {
  title: string;
  filename: string;
  recordsCount: number;
  format: ExportFormat;
  generatedAt: string;
  generatedBy: string;
}

/**
 * Filter leave requests by date range and department
 */
export function filterLeaveRequestsForExport(
  requests: LeaveRequest[],
  users: User[],
  options: { dateRange: string; departmentId: string }
): LeaveRequest[] {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return requests.filter((r) => {
    const user = users.find((u) => u.id === r.userId);
    if (options.departmentId !== 'ALL' && user?.departmentId !== options.departmentId) {
      return false;
    }

    if (options.dateRange !== 'ALL') {
      const time = new Date(r.createdAt).getTime();
      if (options.dateRange === 'this_month' && time < thisMonthStart) return false;
      if (options.dateRange === '30days' && time < thirtyDaysAgo) return false;
      if (options.dateRange === '7days' && time < sevenDaysAgo) return false;
    }

    return true;
  });
}

/**
 * Filter reimbursements by date range and department
 */
export function filterReimbursementsForExport(
  reimbursements: Reimbursement[],
  users: User[],
  options: { dateRange: string; departmentId: string }
): Reimbursement[] {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return reimbursements.filter((r) => {
    const user = users.find((u) => u.id === r.userId);
    if (options.departmentId !== 'ALL' && user?.departmentId !== options.departmentId) {
      return false;
    }

    if (options.dateRange !== 'ALL') {
      const time = new Date(r.createdAt).getTime();
      if (options.dateRange === 'this_month' && time < thisMonthStart) return false;
      if (options.dateRange === '30days' && time < thirtyDaysAgo) return false;
      if (options.dateRange === '7days' && time < sevenDaysAgo) return false;
    }

    return true;
  });
}

/**
 * Filter audit logs for global export
 */
export function filterAuditLogsForExport(
  logs: AuditLogEntry[],
  options: { dateRange: string; auditCategory?: string }
): AuditLogEntry[] {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return logs.filter((log) => {
    if (options.auditCategory && options.auditCategory !== 'ALL' && log.category !== options.auditCategory) {
      return false;
    }

    if (options.dateRange !== 'ALL') {
      const time = new Date(log.timestamp).getTime();
      if (options.dateRange === 'this_month' && time < thisMonthStart) return false;
      if (options.dateRange === '30days' && time < thirtyDaysAgo) return false;
      if (options.dateRange === '7days' && time < sevenDaysAgo) return false;
    }

    return true;
  });
}

/**
 * Generate CSV string for Leave Requests
 */
export function generateLeaveExportCsv(
  leaveRequests: LeaveRequest[],
  users: User[],
  departments: Department[]
): string {
  const headers = [
    'ID Permohonan',
    'NIP Karyawan',
    'Nama Lengkap',
    'Departemen',
    'Jenis Cuti',
    'Tanggal Mulai',
    'Tanggal Selesai',
    'Total Hari Kerja',
    'Status Pengajuan',
    'Alasan Cuti',
    'Tanggal Pengajuan',
  ];

  const escapeField = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = leaveRequests.map((r) => {
    const user = users.find((u) => u.id === r.userId);
    const dept = departments.find((d) => d.id === user?.departmentId);

    return [
      escapeField(r.id),
      escapeField(user?.employeeNumber || ''),
      escapeField(user?.name || ''),
      escapeField(dept?.name || ''),
      escapeField(r.leaveType),
      escapeField(r.startDate),
      escapeField(r.endDate),
      escapeField(r.totalDays),
      escapeField(r.status),
      escapeField(r.reason),
      escapeField(r.createdAt.split('T')[0]),
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

/**
 * Generate CSV string for Reimbursements
 */
export function generateReimbursementExportCsv(
  reimbursements: Reimbursement[],
  users: User[],
  departments: Department[]
): string {
  const headers = [
    'ID Klaim',
    'Nomor Invoice',
    'NIP Karyawan',
    'Nama Lengkap',
    'Departemen',
    'Kategori Pengeluaran',
    'Judul Pengeluaran',
    'Nominal (IDR)',
    'Status Verifikasi',
    'Tanggal Nota',
    'Tanggal Diajukan',
  ];

  const escapeField = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = reimbursements.map((r) => {
    const user = users.find((u) => u.id === r.userId);
    const dept = departments.find((d) => d.id === user?.departmentId);

    return [
      escapeField(r.id),
      escapeField(r.invoiceNumber),
      escapeField(user?.employeeNumber || ''),
      escapeField(user?.name || ''),
      escapeField(dept?.name || ''),
      escapeField(r.category),
      escapeField(r.title),
      escapeField(r.amount),
      escapeField(r.status),
      escapeField(r.receiptDate),
      escapeField(r.createdAt.split('T')[0]),
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

/**
 * Generate CSV string for Employees Headcount
 */
export function generateEmployeesExportCsv(
  users: User[],
  departments: Department[],
  roles: Role[],
  balances: LeaveBalance[]
): string {
  const headers = [
    'NIP Karyawan',
    'Nama Lengkap',
    'Email Kerja',
    'Departemen',
    'Jabatan Organisasi',
    'Role Dynamic RBAC',
    'Status Kepegawaian',
    'Tanggal Bergabung',
    'Sisa Kuota Cuti (Hari)',
  ];

  const escapeField = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = users.map((u) => {
    const dept = departments.find((d) => d.id === u.departmentId);
    const role = roles.find((r) => r.id === u.roleId);
    const bal = balances.find((b) => b.userId === u.id);

    return [
      escapeField(u.employeeNumber),
      escapeField(u.name),
      escapeField(u.email),
      escapeField(dept?.name || ''),
      escapeField(u.position),
      escapeField(role?.label || u.roleId),
      escapeField(u.status),
      escapeField(u.joinDate),
      escapeField(bal?.remainingQuota ?? 12),
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

/**
 * Generate CSV string for Audit Logs
 */
export function generateAuditExportCsv(logs: AuditLogEntry[]): string {
  const headers = [
    'Log ID',
    'Waktu Eksekusi (WIB)',
    'Aktor Pelaksana',
    'Role Aktor',
    'Kategori Audit',
    'Tindakan',
    'Target Sumber Daya',
    'Tingkat Urgensi',
    'Deskripsi Narasi',
    'Rincian Perubahan',
    'Alamat IP / Jaringan',
  ];

  const escapeField = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = logs.map((log) => {
    const changesStr = (log.changes || [])
      .map((c) => `${c.label}: ${c.oldValue ?? '-'} -> ${c.newValue ?? '-'}`)
      .join('; ');

    return [
      escapeField(log.id),
      escapeField(formatAuditTimestamp(log.timestamp)),
      escapeField(log.actorName),
      escapeField(log.actorRole),
      escapeField(log.category.toUpperCase()),
      escapeField(log.actionTitle),
      escapeField(log.targetName),
      escapeField(log.severity.toUpperCase()),
      escapeField(log.description),
      escapeField(changesStr),
      escapeField(log.ipAddress),
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

export function filterAttendanceForExport(
  records: AttendanceRecord[],
  users: User[],
  options: { dateRange: string; departmentId: string }
): AttendanceRecord[] {
  return records.filter((r) => {
    const user = users.find((u) => u.id === r.userId);
    if (options.departmentId !== 'ALL' && user?.departmentId !== options.departmentId) {
      return false;
    }
    return true;
  });
}

export function filterPayrollForExport(
  payrolls: PayrollRecord[],
  users: User[],
  options: { departmentId: string }
): PayrollRecord[] {
  return payrolls.filter((p) => {
    const user = users.find((u) => u.id === p.userId);
    if (options.departmentId !== 'ALL' && user?.departmentId !== options.departmentId) {
      return false;
    }
    return true;
  });
}

export function generateAttendanceExportCsv(
  records: AttendanceRecord[],
  users: User[],
  departments: Department[]
): string {
  const headers = [
    'ID Presensi',
    'NIP',
    'Nama Karyawan',
    'Departemen',
    'Tanggal',
    'Jam Masuk',
    'Jam Pulang',
    'Mode Kerja',
    'Status Kehadiran',
    'Lokasi',
    'Catatan',
  ];

  const escapeField = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = records.map((rec) => {
    const u = users.find((usr) => usr.id === rec.userId);
    const d = departments.find((dept) => dept.id === u?.departmentId);
    return [
      escapeField(rec.id),
      escapeField(u?.employeeNumber || ''),
      escapeField(u?.name || ''),
      escapeField(d?.name || ''),
      escapeField(rec.date),
      escapeField(rec.checkInTime),
      escapeField(rec.checkOutTime || '-'),
      escapeField(rec.workType),
      escapeField(rec.status),
      escapeField(rec.locationName),
      escapeField(rec.notes || ''),
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

export function generatePayrollExportCsv(
  payrolls: PayrollRecord[],
  users: User[],
  departments: Department[]
): string {
  const headers = [
    'ID Payroll',
    'Periode',
    'NIP',
    'Nama Karyawan',
    'Departemen',
    'Jabatan',
    'Gaji Pokok (IDR)',
    'Tunjangan Jabatan (IDR)',
    'Uang Makan Transport (IDR)',
    'Insentif Lembur (IDR)',
    'Bonus (IDR)',
    'Potongan BPJS (IDR)',
    'Pajak PPh 21 (IDR)',
    'Gaji Bersih Diterima (IDR)',
    'Bank',
    'Nomor Rekening',
    'Status Pembayaran',
  ];

  const escapeField = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = payrolls.map((p) => {
    const u = users.find((usr) => usr.id === p.userId);
    const d = departments.find((dept) => dept.id === u?.departmentId);
    return [
      escapeField(p.id),
      escapeField(p.periodLabel),
      escapeField(u?.employeeNumber || ''),
      escapeField(u?.name || ''),
      escapeField(d?.name || ''),
      escapeField(u?.position || ''),
      p.basicSalary,
      p.allowancePosition,
      p.allowanceTransportMeal,
      p.overtimePay,
      p.bonus,
      p.deductionBpjs,
      p.deductionTax,
      p.netSalary,
      escapeField(p.bankName),
      escapeField(p.bankAccountNumber),
      escapeField(p.status),
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

/**
 * Helper to trigger client-side download of a file
 */
export function triggerBlobDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import { LeaveRequest, Reimbursement, User, Department } from '../types/index.ts';

export function downloadLeaveCSV(
  leaveRequests: LeaveRequest[],
  users: User[],
  departments: Department[]
): void {
  const headers = [
    'ID Permohonan',
    'NIP',
    'Nama Karyawan',
    'Departemen',
    'Jenis Cuti',
    'Tanggal Mulai',
    'Tanggal Selesai',
    'Durasi (Hari)',
    'Status Persetujuan',
    'Alasan Cuti',
  ];

  const rows = leaveRequests.map((r) => {
    const user = users.find((u) => u.id === r.userId);
    const dept = departments.find((d) => d.id === user?.departmentId);
    return [
      r.id,
      user?.employeeNumber || '',
      `"${user?.name || ''}"`,
      `"${dept?.name || ''}"`,
      `"${r.leaveType}"`,
      r.startDate,
      r.endDate,
      r.totalDays,
      r.status,
      `"${r.reason.replace(/"/g, '""')}"`,
    ];
  });

  const csvContent =
    '\uFEFF' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Rekap_Cuti_Karyawan_${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadReimbursementCSV(
  reimbursements: Reimbursement[],
  users: User[],
  departments: Department[]
): void {
  const headers = [
    'ID Transaksi',
    'No Invoice',
    'NIP',
    'Nama Karyawan',
    'Departemen',
    'Kategori',
    'Judul Pengeluaran',
    'Nominal (IDR)',
    'Status Verifikasi',
    'Tanggal Nota',
  ];

  const rows = reimbursements.map((r) => {
    const user = users.find((u) => u.id === r.userId);
    const dept = departments.find((d) => d.id === user?.departmentId);
    return [
      r.id,
      r.invoiceNumber,
      user?.employeeNumber || '',
      `"${user?.name || ''}"`,
      `"${dept?.name || ''}"`,
      `"${r.category}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      r.amount,
      r.status,
      r.receiptDate,
    ];
  });

  const csvContent =
    '\uFEFF' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Rekap_Reimbursement_Keuangan_${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

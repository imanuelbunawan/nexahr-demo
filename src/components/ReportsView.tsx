import React, { useState } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { formatRupiah } from '../utils/rbac.ts';
import { LeaveRequest, Reimbursement } from '../types/index.ts';
import { OfficialLeaveLetterModal } from './OfficialLeaveLetterModal.tsx';
import { OfficialReimbursementVoucherModal } from './OfficialReimbursementVoucherModal.tsx';
import { ExecutiveHRReportModal } from './ExecutiveHRReportModal.tsx';
import {
  FileSpreadsheet,
  Download,
  Printer,
  CalendarDays,
  ReceiptText,
  Filter,
  CheckCircle2,
  TrendingUp,
  FileCheck,
  PenTool,
  Clock,
  CreditCard,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const {
    users,
    departments,
    roles,
    leaveRequests,
    reimbursements,
    leaveBalances,
    attendances,
    payrolls,
  } = useHRIS();

  const [selectedLeaveForPrint, setSelectedLeaveForPrint] =
    useState<LeaveRequest | null>(null);
  const [selectedReimbForPrint, setSelectedReimbForPrint] =
    useState<Reimbursement | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Export CSV for Leave Recap
  const exportLeaveCSV = () => {
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
  };

  // Export CSV for Reimbursement Expense Recap
  const exportReimbursementCSV = () => {
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
  };

  // Export CSV for Attendance Records
  const exportAttendanceCSV = () => {
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

    const rows = attendances.map((rec) => {
      const u = users.find((usr) => usr.id === rec.userId);
      const d = departments.find((dept) => dept.id === u?.departmentId);
      return [
        rec.id,
        u?.employeeNumber || '',
        `"${u?.name || ''}"`,
        `"${d?.name || ''}"`,
        rec.date,
        rec.checkInTime,
        rec.checkOutTime || '-',
        rec.workType,
        rec.status,
        `"${rec.locationName.replace(/"/g, '""')}"`,
        `"${(rec.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Rekap_Presensi_Karyawan_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV for Payroll Compensation
  const exportPayrollCSV = () => {
    const headers = [
      'ID Payroll',
      'Periode',
      'NIP',
      'Nama Karyawan',
      'Departemen',
      'Jabatan',
      'Gaji Pokok',
      'Tunjangan Jabatan',
      'Uang Makan Transport',
      'Insentif Lembur',
      'Bonus',
      'Potongan BPJS',
      'Pajak PPh 21',
      'Gaji Bersih Diterima',
      'Status Pembayaran',
    ];

    const rows = payrolls.map((p) => {
      const u = users.find((usr) => usr.id === p.userId);
      const d = departments.find((dept) => dept.id === u?.departmentId);
      return [
        p.id,
        p.periodLabel,
        u?.employeeNumber || '',
        `"${u?.name || ''}"`,
        `"${d?.name || ''}"`,
        `"${u?.position || ''}"`,
        p.basicSalary,
        p.allowancePosition,
        p.allowanceTransportMeal,
        p.overtimePay,
        p.bonus,
        p.deductionBpjs,
        p.deductionTax,
        p.netSalary,
        p.status,
      ];
    });

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Rekap_Payroll_Karyawan_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalExpenseApproved = reimbursements
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + r.amount, 0);

  const approvedLeaves = leaveRequests.filter((l) => l.status === 'APPROVED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Laporan Rekapitulasi &amp; Ekspor Dokumen
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Ekspor data komprehensif ke format Excel / CSV dan cetak Surat Cuti
            resmi bertanda tangan digital.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer"
            title="Generate and Download Official HR Metrics PDF Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </button>
          <button
            onClick={exportLeaveCSV}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Ekspor Rekap Cuti (CSV)
          </button>
          <button
            onClick={exportReimbursementCSV}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor Reimbursement (CSV)
          </button>
          <button
            onClick={exportAttendanceCSV}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02]"
          >
            <Clock className="w-3.5 h-3.5" />
            Ekspor Presensi (CSV)
          </button>
          <button
            onClick={exportPayrollCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Ekspor Payroll (CSV)
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase">
            Total Klaim Cair (Disetujui)
          </span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">
            {formatRupiah(totalExpenseApproved)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {reimbursements.filter((r) => r.status === 'APPROVED').length}{' '}
            transaksi tervalidasi
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase">
            Total Cuti Disetujui
          </span>
          <div className="mt-2 text-2xl font-extrabold text-indigo-700">
            {approvedLeaves.reduce((s, l) => s + l.totalDays, 0)} Hari Kerja
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {approvedLeaves.length} permohonan selesai
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase">
            Surat Izin Cuti Sah
          </span>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {approvedLeaves.length} Dokumen PDF
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Siap dicetak sewaktu-waktu
          </p>
        </div>
      </div>

      {/* Official Leave Letters Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Arsip Surat Izin Cuti Resmi Siap Cetak
            </h2>
            <p className="text-xs text-slate-500">
              Dokumen resmi dengan kop surat korporat, NIP, serta tanda tangan
              digital 3 pihak.
            </p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {approvedLeaves.length} Tersedia
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {approvedLeaves.map((leave) => {
            const user = users.find((u) => u.id === leave.userId);
            const dept = departments.find((d) => d.id === user?.departmentId);

            return (
              <div
                key={leave.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {user?.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {user?.employeeNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {dept?.code} &bull; {leave.leaveType}
                  </div>
                  <div className="text-[11px] font-semibold text-indigo-700 mt-1">
                    {leave.startDate} s/d {leave.endDate} ({leave.totalDays} hari)
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLeaveForPrint(leave)}
                  className="w-full py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-800 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  Pratinjau &amp; Cetak Surat Resmi
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Reimbursement Vouchers Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-indigo-600" />
              Arsip Voucher Disposisi Reimbursement Siap Cetak &amp; Tanda Tangan
            </h2>
            <p className="text-xs text-slate-500">
              Voucher disposisi pengeluaran kas resmi dengan kop korporat dan tanda tangan digital 3 pihak.
            </p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {reimbursements.length} Tersedia
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {reimbursements.map((reimb) => {
            const user = users.find((u) => u.id === reimb.userId);
            const dept = departments.find((d) => d.id === user?.departmentId);

            return (
              <div
                key={reimb.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {user?.name}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-mono font-semibold">
                      {reimb.invoiceNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {dept?.code} &bull; {reimb.category}
                  </div>
                  <div className="text-xs font-extrabold text-emerald-700 mt-1">
                    {formatRupiah(reimb.amount)}
                  </div>
                  <div className="text-[11px] text-slate-600 truncate mt-0.5">
                    {reimb.title}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedReimbForPrint(reimb)}
                  className="w-full py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-800 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  Pratinjau &amp; Tanda Tangani Voucher
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Leave Letter Modal */}
      {selectedLeaveForPrint && (
        <OfficialLeaveLetterModal
          isOpen={true}
          onClose={() => setSelectedLeaveForPrint(null)}
          leaveRequest={selectedLeaveForPrint}
          applicant={users.find((u) => u.id === selectedLeaveForPrint.userId)}
          department={departments.find(
            (d) =>
              d.id ===
              users.find((u) => u.id === selectedLeaveForPrint.userId)
                ?.departmentId
          )}
          role={roles.find(
            (r) =>
              r.id ===
              users.find((u) => u.id === selectedLeaveForPrint.userId)?.roleId
          )}
        />
      )}

      {/* Official Reimbursement Voucher Modal */}
      {selectedReimbForPrint && (
        <OfficialReimbursementVoucherModal
          isOpen={true}
          onClose={() => setSelectedReimbForPrint(null)}
          reimbursement={selectedReimbForPrint}
          applicant={users.find((u) => u.id === selectedReimbForPrint.userId)}
          department={departments.find(
            (d) =>
              d.id ===
              users.find((u) => u.id === selectedReimbForPrint.userId)
                ?.departmentId
          )}
          role={roles.find(
            (r) =>
              r.id ===
              users.find((u) => u.id === selectedReimbForPrint.userId)?.roleId
          )}
        />
      )}

      {/* Executive HR Metrics Summary Report Modal (Print-to-PDF) */}
      <ExecutiveHRReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
};

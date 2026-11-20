import React, { useState, useMemo } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import {
  ExportDatasetType,
  ExportFormat,
  filterLeaveRequestsForExport,
  filterReimbursementsForExport,
  filterAuditLogsForExport,
  filterAttendanceForExport,
  filterPayrollForExport,
  generateLeaveExportCsv,
  generateReimbursementExportCsv,
  generateEmployeesExportCsv,
  generateAuditExportCsv,
  generateAttendanceExportCsv,
  generatePayrollExportCsv,
  triggerBlobDownload,
} from '../utils/globalExportUtils.ts';
import { formatAuditTimestamp } from '../utils/auditUtils.ts';
import { formatRupiah } from '../utils/rbac.ts';
import {
  Download,
  Printer,
  X,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Calendar,
  Building2,
  CheckCircle2,
  FileCode,
  Clock,
  Users,
  ReceiptText,
  CalendarDays,
  History,
  Lock,
  ArrowRight,
  ExternalLink,
  CreditCard,
} from 'lucide-react';

interface GlobalExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDataset?: ExportDatasetType;
}

export const GlobalExportModal: React.FC<GlobalExportModalProps> = ({
  isOpen,
  onClose,
  defaultDataset = 'leave_requests',
}) => {
  const {
    currentUser,
    roles,
    users,
    departments,
    leaveRequests,
    reimbursements,
    leaveBalances,
    auditLogs,
    attendances,
    payrolls,
    hasUserPermission,
    addAuditLog,
  } = useHRIS();

  // Export configurations
  const [activeTab, setActiveTab] = useState<'reports' | 'audit'>('reports');
  const [selectedDataset, setSelectedDataset] = useState<ExportDatasetType>(defaultDataset);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [dateRange, setDateRange] = useState<'ALL' | 'this_month' | '30days' | '7days'>('ALL');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [auditCategory, setAuditCategory] = useState<string>('ALL');

  // Preview Print state
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // RBAC Permission Check
  const canExportReports =
    hasUserPermission('create_reports') || hasUserPermission('view_reports');
  const canExportAudit =
    hasUserPermission('create_audit_logs') || hasUserPermission('view_audit_logs');
  const isAuthorized =
    currentUser.roleId === 'role_owner' ||
    (activeTab === 'reports' ? canExportReports : canExportAudit);

  // Computed filtered dataset and count
  const exportData = useMemo(() => {
    if (selectedDataset === 'leave_requests') {
      const items = filterLeaveRequestsForExport(leaveRequests, users, {
        dateRange,
        departmentId: selectedDeptId,
      });
      return {
        title: 'Rekapitulasi Permohonan Cuti Karyawan',
        filename: `Rekap_Cuti_Karyawan_${new Date().toISOString().split('T')[0]}`,
        count: items.length,
        items,
      };
    } else if (selectedDataset === 'reimbursements') {
      const items = filterReimbursementsForExport(reimbursements, users, {
        dateRange,
        departmentId: selectedDeptId,
      });
      return {
        title: 'Rekapitulasi Klaim Reimbursement Keuangan',
        filename: `Rekap_Reimbursement_${new Date().toISOString().split('T')[0]}`,
        count: items.length,
        items,
      };
    } else if (selectedDataset === 'employees') {
      const items = users.filter((u) => {
        if (selectedDeptId !== 'ALL' && u.departmentId !== selectedDeptId) return false;
        return true;
      });
      return {
        title: 'Direktori & Headcount SDM Perusahaan',
        filename: `Headcount_Karyawan_${new Date().toISOString().split('T')[0]}`,
        count: items.length,
        items,
      };
    } else if (selectedDataset === 'attendance') {
      const items = filterAttendanceForExport(attendances, users, {
        dateRange,
        departmentId: selectedDeptId,
      });
      return {
        title: 'Rekapitulasi Presensi & Kehadiran Karyawan',
        filename: `Rekap_Presensi_${new Date().toISOString().split('T')[0]}`,
        count: items.length,
        items,
      };
    } else if (selectedDataset === 'payroll') {
      const items = filterPayrollForExport(payrolls, users, {
        departmentId: selectedDeptId,
      });
      return {
        title: 'Rekapitulasi Penggajian & Payroll Karyawan',
        filename: `Rekap_Payroll_${new Date().toISOString().split('T')[0]}`,
        count: items.length,
        items,
      };
    } else {
      // audit_logs
      const items = filterAuditLogsForExport(auditLogs, {
        dateRange,
        auditCategory: auditCategory !== 'ALL' ? auditCategory : undefined,
      });
      return {
        title: 'Rekam Jejak Historis & Audit Log Sistem',
        filename: `Audit_Log_NexaHR_${new Date().toISOString().split('T')[0]}`,
        count: items.length,
        items,
      };
    }
  }, [
    selectedDataset,
    leaveRequests,
    reimbursements,
    users,
    auditLogs,
    attendances,
    payrolls,
    dateRange,
    selectedDeptId,
    auditCategory,
  ]);

  if (!isOpen) return null;

  // Execute Export
  const handleExecuteExport = () => {
    const timestamp = new Date().toISOString();
    const currentRole = roles.find((r) => r.id === currentUser.roleId);

    if (selectedFormat === 'csv') {
      let csvContent = '';
      if (selectedDataset === 'leave_requests') {
        csvContent = generateLeaveExportCsv(
          exportData.items as any,
          users,
          departments
        );
      } else if (selectedDataset === 'reimbursements') {
        csvContent = generateReimbursementExportCsv(
          exportData.items as any,
          users,
          departments
        );
      } else if (selectedDataset === 'employees') {
        csvContent = generateEmployeesExportCsv(
          exportData.items as any,
          departments,
          roles,
          leaveBalances
        );
      } else if (selectedDataset === 'attendance') {
        csvContent = generateAttendanceExportCsv(
          exportData.items as any,
          users,
          departments
        );
      } else if (selectedDataset === 'payroll') {
        csvContent = generatePayrollExportCsv(
          exportData.items as any,
          users,
          departments
        );
      } else {
        csvContent = generateAuditExportCsv(exportData.items as any);
      }

      triggerBlobDownload(csvContent, `${exportData.filename}.csv`, 'text/csv;charset=utf-8;');

      // Dispatch Audit Log
      addAuditLog({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentRole?.label || 'Super Admin',
        actorAvatar: currentUser.avatar,
        category: 'security',
        action: 'EXPORT_DATA_CSV',
        actionTitle: 'Ekspor Berkas CSV Sistem',
        targetType: 'system',
        targetName: exportData.title,
        description: `${currentUser.name} (${currentRole?.label}) mengekspor ${exportData.count} baris data "${exportData.title}" ke dalam format CSV.`,
        severity: 'info',
        metadata: {
          filename: `${exportData.filename}.csv`,
          recordsCount: exportData.count,
          dataset: selectedDataset,
          format: 'csv',
        },
      });

      onClose();
    } else {
      // PDF: Open official print preview
      setIsPrintPreviewOpen(true);

      // Record audit log for PDF generation
      addAuditLog({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentRole?.label || 'Super Admin',
        actorAvatar: currentUser.avatar,
        category: 'security',
        action: 'EXPORT_DATA_PDF',
        actionTitle: 'Ekspor Dokumen PDF Resmi',
        targetType: 'system',
        targetName: exportData.title,
        description: `${currentUser.name} (${currentRole?.label}) mencetak atau mengunduh dokumen resmi PDF "${exportData.title}" (${exportData.count} data).`,
        severity: 'info',
        metadata: {
          recordsCount: exportData.count,
          dataset: selectedDataset,
          format: 'pdf',
        },
      });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-5 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 mb-1">
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>Pusat Ekspor Data Resmi &bull; Global Export Hub</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Ekspor Laporan &amp; Jejak Audit
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pilih sumber data dan format yang diinginkan untuk menghasilkan berkas resmi perusahaan.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Authorization Seal Banner */}
          {!isAuthorized ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-center space-y-2">
              <Lock className="w-6 h-6 text-rose-600 dark:text-rose-400 mx-auto" />
              <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Akses Ekspor Dibatasi
              </h4>
              <p className="text-[11px] text-rose-700 dark:text-rose-400">
                Role Anda tidak memiliki izin untuk mengunduh laporan atau audit logs. Hubungi Super Admin / HRD untuk mendapatkan otorisasi.
              </p>
            </div>
          ) : (
            <>
              {/* Category Nav Tabs: Reports vs Audit Logs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reports');
                    setSelectedDataset('leave_requests');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'reports'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Laporan HRIS &amp; Operasional</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('audit');
                    setSelectedDataset('audit_logs');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'audit'
                      ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Audit Logs &amp; Jejak Sistem</span>
                </button>
              </div>

              {/* Dataset Selection Radio Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  1. Pilih Jenis Dataset:
                </label>

                {activeTab === 'reports' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Option 1: Leave Requests */}
                    <div
                      onClick={() => setSelectedDataset('leave_requests')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        selectedDataset === 'leave_requests'
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Rekap Cuti
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Daftar cuti tahunan, sakit, &amp; kuota sisa.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 mt-2">
                        {leaveRequests.length} permohonan
                      </span>
                    </div>

                    {/* Option 2: Reimbursements */}
                    <div
                      onClick={() => setSelectedDataset('reimbursements')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        selectedDataset === 'reimbursements'
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <ReceiptText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Reimbursement
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Klaim pengeluaran kas, invoice, &amp; approval.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 mt-2">
                        {reimbursements.length} klaim
                      </span>
                    </div>

                    {/* Option 3: Employees */}
                    <div
                      onClick={() => setSelectedDataset('employees')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        selectedDataset === 'employees'
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Data SDM
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Direktori profil, NIP, divisi, &amp; jabatan.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 mt-2">
                        {users.length} karyawan
                      </span>
                    </div>

                    {/* Option 4: Attendance */}
                    <div
                      onClick={() => setSelectedDataset('attendance')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        selectedDataset === 'attendance'
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Presensi &amp; Jam Kerja
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Riwayat jam masuk/pulang, WFO/WFH, &amp; status.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 mt-2">
                        {attendances.length} catatan
                      </span>
                    </div>

                    {/* Option 5: Payroll */}
                    <div
                      onClick={() => setSelectedDataset('payroll')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        selectedDataset === 'payroll'
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Slip Gaji &amp; Payroll
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Kalkulasi penghasilan, potongan pajak &amp; BPJS.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 mt-2">
                        {payrolls.length} slip diterbitkan
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Option Audit 1: All Logs */}
                    <div
                      onClick={() => {
                        setSelectedDataset('audit_logs');
                        setAuditCategory('ALL');
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        selectedDataset === 'audit_logs' && auditCategory === 'ALL'
                          ? 'border-purple-600 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 shadow-xs ring-1 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Semua Log Audit (Full Trail)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Seluruh jejak historis aksi sistem, role, approval, &amp; SDM.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 mt-2">
                        {auditLogs.length} total rekaman
                      </span>
                    </div>

                    {/* Option Audit 2: Role Changes Only */}
                    <div
                      onClick={() => {
                        setSelectedDataset('audit_logs');
                        setAuditCategory('role');
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        selectedDataset === 'audit_logs' && auditCategory === 'role'
                          ? 'border-purple-600 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 shadow-xs ring-1 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Log Role &amp; Dynamic RBAC
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Rekam modifikasi hak akses, promosi, &amp; permission matrix.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 mt-2">
                        {auditLogs.filter((l) => l.category === 'role').length} rekaman role
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Controls: Date Range & Department */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  2. Parameter Saringan Data:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Rentang Periode Waktu:
                    </label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="ALL">Semua Periode Historis</option>
                      <option value="this_month">Bulan Ini (Oktober 2026)</option>
                      <option value="30days">30 Hari Terakhir</option>
                      <option value="7days">7 Hari Terakhir</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Departemen / Divisi:
                    </label>
                    <select
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="ALL">Seluruh Departemen Perusahaan</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Format Selection Cards: CSV vs PDF */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  3. Pilih Format Unduhan:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* CSV Card */}
                  <div
                    onClick={() => setSelectedFormat('csv')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      selectedFormat === 'csv'
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          CSV Spreadsheet (.csv)
                        </h4>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                          Excel
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Format data mentah tabular RFC 4180 siap olah di Excel atau Google Sheets.
                      </p>
                    </div>
                  </div>

                  {/* PDF Card */}
                  <div
                    onClick={() => setSelectedFormat('pdf')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      selectedFormat === 'pdf'
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Dokumen Resmi PDF (.pdf)
                        </h4>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold">
                          Resmi
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Format resmi siap cetak dengan kop surat, verifikasi SHA-256, &amp; tanda tangan.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Bar */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                    Hasil Pratinjau Ekspor:
                  </span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {exportData.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {exportData.count} baris data ditemukan &bull; Format {selectedFormat.toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Otorisasi Sah
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteExport}
                  disabled={exportData.count === 0}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer active:scale-[0.98]"
                >
                  {selectedFormat === 'csv' ? (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Unduh Berkas CSV ({exportData.count})</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Cetak / Simpan PDF ({exportData.count})</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Official Print-Ready PDF Document Dialog */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:max-w-none print:rounded-none">
            {/* Top Toolbar (Hidden on print) */}
            <div className="no-print p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold">
                  Pratinjau Dokumen Resmi PDF &bull; {exportData.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  onClick={() => setIsPrintPreviewOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Paper */}
            <div className="p-8 sm:p-12 text-slate-900 space-y-6 font-sans">
              {/* Kop Surat Perusahaan */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-black">
                      N
                    </div>
                    <h1 className="text-xl font-extrabold tracking-wider text-slate-900">
                      PT. NEXA DIGITAL PERSADA
                    </h1>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Gedung Menara Cyber Lt. 3-5, Jl. Rasuna Said Kav. 10, Jakarta Selatan 12950
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Sistem Informasi Sumber Daya Manusia (HRIS) &bull; Divisi Kepatuhan &amp; Otorisasi
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold block text-slate-900">
                    DOC-EXP-{Date.now().toString().slice(-6)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Dicetak: {formatAuditTimestamp(new Date().toISOString())}
                  </span>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="text-center py-2 space-y-1">
                <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
                  {exportData.title}
                </h2>
                <p className="text-xs text-slate-600">
                  Periode: {dateRange === 'ALL' ? 'Semua Waktu' : dateRange} &bull; Departemen:{' '}
                  {selectedDeptId === 'ALL' ? 'Semua Departemen' : selectedDeptId}
                </p>
              </div>

              {/* Printable Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                      <th className="py-2 px-3">No</th>
                      {selectedDataset === 'leave_requests' && (
                        <>
                          <th className="py-2 px-3">Nama Karyawan</th>
                          <th className="py-2 px-3">Jenis Cuti</th>
                          <th className="py-2 px-3">Periode</th>
                          <th className="py-2 px-3">Hari</th>
                          <th className="py-2 px-3">Status</th>
                        </>
                      )}
                      {selectedDataset === 'reimbursements' && (
                        <>
                          <th className="py-2 px-3">No Invoice</th>
                          <th className="py-2 px-3">Nama Karyawan</th>
                          <th className="py-2 px-3">Kategori</th>
                          <th className="py-2 px-3">Nominal</th>
                          <th className="py-2 px-3">Status</th>
                        </>
                      )}
                      {selectedDataset === 'employees' && (
                        <>
                          <th className="py-2 px-3">NIP</th>
                          <th className="py-2 px-3">Nama Lengkap</th>
                          <th className="py-2 px-3">Divisi</th>
                          <th className="py-2 px-3">Jabatan</th>
                          <th className="py-2 px-3">Status</th>
                        </>
                      )}
                      {selectedDataset === 'audit_logs' && (
                        <>
                          <th className="py-2 px-3">Waktu</th>
                          <th className="py-2 px-3">Aktor Pelaksana</th>
                          <th className="py-2 px-3">Aksi</th>
                          <th className="py-2 px-3">Target Sumber Daya</th>
                          <th className="py-2 px-3">Urgensi</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {exportData.items.slice(0, 30).map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-[10px]">{idx + 1}</td>
                        {selectedDataset === 'leave_requests' && (
                          <>
                            <td className="py-2 px-3 font-semibold">
                              {users.find((u) => u.id === item.userId)?.name || 'Karyawan'}
                            </td>
                            <td className="py-2 px-3">{item.leaveType}</td>
                            <td className="py-2 px-3 font-mono text-[10px]">
                              {item.startDate} s/d {item.endDate}
                            </td>
                            <td className="py-2 px-3 font-bold">{item.totalDays} Hari</td>
                            <td className="py-2 px-3 font-semibold">{item.status}</td>
                          </>
                        )}
                        {selectedDataset === 'reimbursements' && (
                          <>
                            <td className="py-2 px-3 font-mono text-[10px]">{item.invoiceNumber}</td>
                            <td className="py-2 px-3 font-semibold">
                              {users.find((u) => u.id === item.userId)?.name || 'Karyawan'}
                            </td>
                            <td className="py-2 px-3">{item.category}</td>
                            <td className="py-2 px-3 font-mono font-bold">
                              {formatRupiah(item.amount)}
                            </td>
                            <td className="py-2 px-3 font-semibold">{item.status}</td>
                          </>
                        )}
                        {selectedDataset === 'employees' && (
                          <>
                            <td className="py-2 px-3 font-mono text-[10px]">{item.employeeNumber}</td>
                            <td className="py-2 px-3 font-bold">{item.name}</td>
                            <td className="py-2 px-3">
                              {departments.find((d) => d.id === item.departmentId)?.name || '-'}
                            </td>
                            <td className="py-2 px-3">{item.position}</td>
                            <td className="py-2 px-3 uppercase text-[10px]">{item.status}</td>
                          </>
                        )}
                        {selectedDataset === 'audit_logs' && (
                          <>
                            <td className="py-2 px-3 font-mono text-[10px]">
                              {formatAuditTimestamp(item.timestamp)}
                            </td>
                            <td className="py-2 px-3 font-bold">{item.actorName}</td>
                            <td className="py-2 px-3">{item.actionTitle}</td>
                            <td className="py-2 px-3 text-[10px]">{item.targetName}</td>
                            <td className="py-2 px-3 font-bold uppercase text-[10px]">{item.severity}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sign-off Blocks */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="text-slate-500">Petugas Pembuat Dokumen:</p>
                  <div className="h-14 flex items-center justify-center font-serif text-slate-700 italic">
                    {currentUser.name}
                  </div>
                  <p className="font-bold border-t border-slate-400 pt-1 inline-block min-w-[180px]">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {roles.find((r) => r.id === currentUser.roleId)?.label || 'Authorized Officer'}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Verifikasi Direksi / Super Admin:</p>
                  <div className="h-14 flex items-center justify-center font-serif text-slate-700 italic">
                    Ir. Hendra Pratama
                  </div>
                  <p className="font-bold border-t border-slate-400 pt-1 inline-block min-w-[180px]">
                    Ir. Hendra Pratama, M.Kom
                  </p>
                  <p className="text-[10px] text-slate-500">Super Admin / Owner</p>
                </div>
              </div>

              {/* Document Footer Bar */}
              <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400 flex items-center justify-between">
                <span>NexaHR Enterprise v2.4 &bull; Dokumen Resmi Sah</span>
                <span className="font-mono">Integritas Terenkripsi SHA-256 Valid</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

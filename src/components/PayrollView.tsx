import React, { useState } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { PayrollRecord, PayrollStatus, User, Department } from '../types/index.ts';
import { formatRupiah } from '../utils/rbac.ts';
import {
  calculateGrossEarnings,
  calculateTotalDeductions,
  calculatePayrollStats,
  filterPayrollRecords,
} from '../utils/payrollUtils.ts';
import { OfficialPayslipModal } from './OfficialPayslipModal.tsx';
import {
  CreditCard,
  Building2,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  ShieldCheck,
  Plus,
  RefreshCw,
  Sparkles,
  DollarSign,
  ChevronRight,
  Eye,
  Trash2,
  X,
} from 'lucide-react';

export const PayrollView: React.FC = () => {
  const {
    currentUser,
    users,
    departments,
    roles,
    payrolls,
    generateMonthlyPayroll,
    updatePayrollStatus,
    deletePayroll,
    hasUserPermission,
  } = useHRIS();

  // Filters state
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<PayrollStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected payroll for viewing payslip modal
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);

  // Generate payroll modal state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [targetMonth, setTargetMonth] = useState('2026-11');
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  // Permissions
  const canCreatePayroll = hasUserPermission('create_payroll');
  const canApprovePayroll = hasUserPermission('approve_payroll');
  const canDeletePayroll = hasUserPermission('delete_payroll');
  const isOwnerOrHrd =
    currentUser.roleId === 'role_owner' || currentUser.roleId === 'role_hrd';

  // If normal employee, only show their own payslips
  const displayedRecords = isOwnerOrHrd
    ? payrolls
    : payrolls.filter((p) => p.userId === currentUser.id);

  const stats = calculatePayrollStats(displayedRecords);

  const filteredRecords = filterPayrollRecords(displayedRecords, users, {
    month: selectedMonth,
    departmentId: selectedDeptId,
    status: selectedStatus,
    searchQuery,
  });

  const handleOpenGenerateModal = () => {
    setGenerateResult(null);
    setIsGenerateModalOpen(true);
  };

  const handleConfirmGenerate = () => {
    const res = generateMonthlyPayroll(targetMonth);
    setGenerateResult(res.message);
    setTimeout(() => {
      setIsGenerateModalOpen(false);
      setSelectedMonth(targetMonth);
    }, 1200);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Payroll',
      'Periode',
      'NIP',
      'Nama Karyawan',
      'Departemen',
      'Jabatan',
      'Gaji Pokok (IDR)',
      'Tunjangan Jabatan (IDR)',
      'Tunjangan Makan Transport (IDR)',
      'Insentif Lembur (IDR)',
      'Bonus (IDR)',
      'Potongan BPJS (IDR)',
      'Pajak PPh 21 (IDR)',
      'Gaji Bersih Diterima (IDR)',
      'Bank',
      'No Rekening',
      'Status Pembayaran',
    ];

    const rows = filteredRecords.map((r) => {
      const u = users.find((usr) => usr.id === r.userId);
      const d = departments.find((dept) => dept.id === u?.departmentId);
      return [
        r.id,
        r.periodLabel,
        u?.employeeNumber || '',
        `"${u?.name || ''}"`,
        `"${d?.name || ''}"`,
        `"${u?.position || ''}"`,
        r.basicSalary,
        r.allowancePosition,
        r.allowanceTransportMeal,
        r.overtimePay,
        r.bonus,
        r.deductionBpjs,
        r.deductionTax,
        r.netSalary,
        `"${r.bankName}"`,
        `"${r.bankAccountNumber}"`,
        r.status,
      ];
    });

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Payroll_Gaji_${selectedMonth}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeEmployee = users.find((u) => u.id === selectedPayroll?.userId) || null;
  const activeDepartment =
    departments.find((d) => d.id === activeEmployee?.departmentId) || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Enterprise Payroll &amp; Compensation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Penggajian &amp; Slip Gaji Karyawan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kalkulasi penghasilan bruto, potongan BPJS/PPh 21, transfer bank payroll, dan cetak e-payslip resmi.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
          {canCreatePayroll && (
            <button
              onClick={handleOpenGenerateModal}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Proses Payroll Bulanan</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Take Home Pay */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Total Gaji Bersih</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-400 truncate block">
              {formatRupiah(stats.totalNetPayroll)}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">
              Take Home Pay Terdistribusi
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>{stats.totalRecords} Slip Diterbitkan</span>
            <span className="text-indigo-600 font-bold">Lunas</span>
          </div>
        </div>

        {/* Card 2: Rata-rata Gaji */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Rata-rata Gaji</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 truncate block">
              {formatRupiah(stats.averageNetSalary)}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">
              Rata-rata per Karyawan
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Kompetitif Industri</span>
            <span className="text-emerald-600 font-bold">Optimal</span>
          </div>
        </div>

        {/* Card 3: BPJS & Pajak */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>PPh 21 &amp; BPJS</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 truncate block">
              {formatRupiah(stats.totalTaxPaid + stats.totalBpjsPaid)}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">
              Kepatuhan Fiskal &amp; Jamsostek
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Pajak: {formatRupiah(stats.totalTaxPaid)}</span>
            <span className="text-blue-600 font-bold">Compliant</span>
          </div>
        </div>

        {/* Card 4: Periode Aktif */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Periode Penggajian</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate block">
              {selectedMonth === 'ALL' ? 'Semua Periode' : 'November 2026'}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">
              Jadwal Cut-off Tanggal 25
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Status Batch Transfer</span>
            <span className="text-purple-600 font-bold">Verified</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Periode:
          </span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="2026-11">November 2026</option>
            <option value="2026-10">Oktober 2026</option>
            <option value="ALL">Semua Periode</option>
          </select>

          {isOwnerOrHrd && (
            <>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">
                Divisi:
              </span>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="ALL">Semua Departemen</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">
                Status:
              </span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as PayrollStatus | 'ALL')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="ALL">Semua Status</option>
                <option value="PAID">Lunas (Paid)</option>
                <option value="PROCESSED">Diproses</option>
                <option value="DRAFT">Draf</option>
              </select>
            </>
          )}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama karyawan, NIP, atau bank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
              <tr>
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4 text-right">Gaji Pokok</th>
                <th className="py-3 px-4 text-right">Tunjangan &amp; Lembur</th>
                <th className="py-3 px-4 text-right">Potongan (Pajak/BPJS)</th>
                <th className="py-3 px-4 text-right">Gaji Bersih</th>
                <th className="py-3 px-4">Rekening Transfer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Slip Gaji</th>
                {canDeletePayroll && <th className="py-3 px-4 text-center">Hapus</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-xs">Tidak ada data payroll yang sesuai.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const u = users.find((usr) => usr.id === r.userId);
                  const d = departments.find((dept) => dept.id === u?.departmentId);
                  const allowancesTotal =
                    r.allowancePosition + r.allowanceTransportMeal + r.overtimePay + r.bonus;
                  const deductionsTotal = calculateTotalDeductions(r);

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u?.avatar}
                            alt={u?.name}
                            className="w-8 h-8 rounded-xl object-cover shrink-0"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {u?.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {u?.employeeNumber} &bull; {d?.code}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {r.periodLabel}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatRupiah(r.basicSalary)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{formatRupiah(allowancesTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                        -{formatRupiah(deductionsTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-indigo-700 dark:text-indigo-400 text-sm">
                        {formatRupiah(r.netSalary)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[11px]">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            {r.bankName}
                          </span>
                          <span className="font-mono text-slate-400 block">
                            {r.bankAccountNumber}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                          }`}
                        >
                          {r.status === 'PAID' ? '✓ LUNAS' : 'SELESAI'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedPayroll(r)}
                          type="button"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Slip</span>
                        </button>
                      </td>
                      {canDeletePayroll && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => deletePayroll(r.id)}
                            type="button"
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Hapus slip gaji"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {isGenerateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Kalkulasi Payroll Bulanan Otomatis
                </h3>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                type="button"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generateResult ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-semibold text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600" />
                <p>{generateResult}</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Sistem akan mengalkulasi gaji pokok, tunjangan posisi, insentif lembur terverifikasi, potongan BPJS, dan PPh 21 untuk seluruh <strong>{users.filter((u) => u.status === 'active').length} karyawan aktif</strong> pada periode yang dipilih.
                </p>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih Periode Bulan &amp; Tahun:
                  </label>
                  <input
                    type="month"
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGenerateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmGenerate}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    Eksekusi Kalkulasi Payroll
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official Payslip View / Print Modal */}
      <OfficialPayslipModal
        isOpen={Boolean(selectedPayroll)}
        onClose={() => setSelectedPayroll(null)}
        payroll={selectedPayroll}
        user={activeEmployee}
        department={activeDepartment}
      />
    </div>
  );
};


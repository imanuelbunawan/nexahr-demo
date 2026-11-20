import React from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { formatRupiah } from '../utils/rbac.ts';
import { calculateHRMetricsReport } from '../utils/reportMetricsUtils.ts';
import {
  Printer,
  Download,
  X,
  Building2,
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  CalendarDays,
  Receipt,
  FileCheck,
  TrendingUp,
} from 'lucide-react';

interface ExecutiveHRReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutiveHRReportModal: React.FC<ExecutiveHRReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    users,
    departments,
    leaveRequests,
    reimbursements,
    leaveBalances,
  } = useHRIS();

  if (!isOpen) return null;

  // Compute metrics data
  const report = calculateHRMetricsReport(
    users,
    departments,
    leaveRequests,
    reimbursements,
    leaveBalances
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container Card */}
      <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:border-none print:shadow-none print:bg-white print:max-w-none print:rounded-none">
        
        {/* Floating Action Bar (Hidden during print) */}
        <div className="no-print p-4 sm:p-5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Pratinjau Dokumen Eksekutif: Laporan Metrik SDM
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gunakan kemampuan cetak bawaan browser (browser-native print) untuk Simpan sebagai PDF (Save as PDF).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer"
              title="Cetak atau Unduh Dokumen sebagai PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Unduh PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body (A4 Styled Paper) */}
        <div className="p-4 sm:p-8 max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          <div className="print-container bg-white text-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200/90 shadow-md max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none print:rounded-none print:p-0 print:max-w-none">
            
            {/* 1. KOP SURAT RESMI PERUSAHAAN (Corporate Letterhead) */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                    N
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase">
                      PT. NEXA DIGITAL PERSADA
                    </h1>
                    <p className="text-[11px] font-semibold text-indigo-700 tracking-wider uppercase">
                      Divisi Human Capital &amp; Operasional SDM Terpadu
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Gedung Cyber 2 Tower Lt. 18, Jl. HR Rasuna Said Kav. X-5 No. 13, Jakarta Selatan 12950 &bull; Telp: (021) 5566-7788 &bull; Email: hc@nexahr.co.id
                    </p>
                  </div>
                </div>

                <div className="text-right hidden sm:block shrink-0">
                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                    Klasifikasi: Internal / Rahasia
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Dokumen ID: {report.reportNumber}
                  </p>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-300 pt-0.5" />
            </div>

            {/* 2. JUDUL LAPORAN & META INFORMASI */}
            <div className="text-center py-2 space-y-1">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-950 uppercase tracking-tight">
                LAPORAN RINGKASAN EKSEKUTIF METRIK SDM, CUTI &amp; REIMBURSEMENT
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Periode Rekapitulasi Berjalan &bull; Per Tanggal: <span className="font-bold text-slate-900">{report.generatedDateFormatted}</span>
              </p>
            </div>

            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Nomor Laporan</span>
                <span className="font-bold text-slate-900 font-mono text-[11px]">{report.reportNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Tanggal Terbit</span>
                <span className="font-bold text-slate-900">{report.generatedDateFormatted}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Otorisasi Sistem</span>
                <span className="font-bold text-indigo-700">Dynamic RBAC Matrix</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Status Audit</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" /> Tervalidasi
                </span>
              </div>
            </div>

            {/* 3. BAGIAN I: EXECUTIVE KPI HIGHLIGHTS */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                I. Ringkasan Kinerja &amp; Demografi SDM
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Total Headcount</span>
                  <div className="text-xl font-black text-slate-900">
                    {report.totalEmployees} <span className="text-xs font-semibold text-slate-500">Staf</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-semibold">
                    {report.activeEmployees} Aktif &bull; {report.departmentCount} Divisi
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Utilisasi Kuota Cuti</span>
                  <div className="text-xl font-black text-indigo-700">
                    {report.leaveMetrics.utilizationRate}%
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {report.leaveMetrics.totalUsedDays} dari {report.leaveMetrics.totalAnnualQuota} hari
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Reimbursement Cair</span>
                  <div className="text-base sm:text-lg font-black text-emerald-700 truncate">
                    {formatRupiah(report.reimbursementMetrics.totalApprovedAmount)}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {report.reimbursementMetrics.approvedTransactionsCount} klaim disetujui
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Kecepatan SLA Approval</span>
                  <div className="text-xl font-black text-blue-700">
                    {report.approvalVelocityRate}%
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Persetujuan multi-tier
                  </p>
                </div>
              </div>
            </div>

            {/* 4. BAGIAN II: RINCIAN DISTRIBUSI TENAGA KERJA PER DEPARTEMEN */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                II. Distribusi Kapasitas &amp; Biaya per Departemen
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Departemen</th>
                      <th className="py-2.5 px-3">Kepala / Manajer</th>
                      <th className="py-2.5 px-3 text-center">Headcount</th>
                      <th className="py-2.5 px-3 text-center">Cuti Terpakai</th>
                      <th className="py-2.5 px-3 text-right">Reimbursement Cair</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.departmentMetrics.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {dept.name} <span className="text-[10px] text-slate-400 font-normal">({dept.code})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {dept.managerName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {dept.headcount} orang
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700">
                          {dept.leaveDaysTaken} hari
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                          {formatRupiah(dept.approvedReimbursementAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3">Total Akumulasi Perusahaan</td>
                      <td className="py-2.5 px-3 text-center">{report.totalEmployees} orang</td>
                      <td className="py-2.5 px-3 text-center">{report.leaveMetrics.totalUsedDays} hari</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">
                        {formatRupiah(report.reimbursementMetrics.totalApprovedAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 5. BAGIAN III: REKAPITULASI CUTI & PIPELINE REIMBURSEMENT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Box 1: Cuti */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                  Rincian Status Kuota Cuti
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Total Alokasi Kuota Tahunan:</span>
                    <span className="font-bold text-slate-900">{report.leaveMetrics.totalAnnualQuota} Hari</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Hak Cuti Telah Digunakan:</span>
                    <span className="font-bold text-indigo-700">{report.leaveMetrics.totalUsedDays} Hari</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Sisa Kuota Cuti Perusahaan:</span>
                    <span className="font-bold text-emerald-700">{report.leaveMetrics.totalRemainingDays} Hari</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Pengajuan Antre (Pending Review):</span>
                    <span className="font-bold text-amber-600">{report.leaveMetrics.pendingRequestsCount} Berkas</span>
                  </div>
                </div>
              </div>

              {/* Box 2: Reimbursement Breakdown */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  Rincian Anggaran Reimbursement
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Total Nominal Disetujui (Cair):</span>
                    <span className="font-bold text-emerald-700">
                      {formatRupiah(report.reimbursementMetrics.totalApprovedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Dana Antrean (Menunggu Approval):</span>
                    <span className="font-bold text-amber-600">
                      {formatRupiah(report.reimbursementMetrics.totalPendingAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Jumlah Transaksi Disetujui:</span>
                    <span className="font-bold text-slate-900">
                      {report.reimbursementMetrics.approvedTransactionsCount} Transaksi
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Jumlah Transaksi Menunggu Review:</span>
                    <span className="font-bold text-amber-600">
                      {report.reimbursementMetrics.pendingTransactionsCount} Transaksi
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. LEMBAR PENGESAHAN & TANDA TANGAN OTORISASI RESMI */}
            <div className="pt-4 border-t-2 border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider text-center sm:text-left">
                Pengesahan &amp; Otorisasi Manajemen Perusahaan
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Signer 1: VP HRD */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between h-44">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold border-b border-slate-200 pb-1.5">
                    <span>Disusun &amp; Diverifikasi Oleh:</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Terotentikasi
                    </span>
                  </div>

                  {/* Digital Signature Stamp */}
                  <div className="my-auto text-center py-2">
                    <div className="inline-block px-3 py-1 rounded border border-emerald-400 bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold tracking-wider">
                      DIGITALLY SIGNED &bull; HC OPS
                      <div className="text-[9px] font-normal text-emerald-600">
                        SHA256: 7a8f9d0c...b4e21
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-1 text-center">
                    <p className="text-xs font-bold text-slate-950">Siti Rahmawati, S.Psi</p>
                    <p className="text-[10px] text-slate-500">VP Human Capital &amp; People Ops &bull; NIP: NX-002</p>
                  </div>
                </div>

                {/* Signer 2: CEO / Owner */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between h-44">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold border-b border-slate-200 pb-1.5">
                    <span>Diketahui &amp; Disahkan Oleh:</span>
                    <span className="text-indigo-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Legal &amp; Sah
                    </span>
                  </div>

                  {/* Digital Signature Stamp */}
                  <div className="my-auto text-center py-2">
                    <div className="inline-block px-3 py-1 rounded border border-indigo-400 bg-indigo-50 text-indigo-900 font-mono text-[10px] font-bold tracking-wider">
                      APPROVED &bull; EXECUTIVE BOARD
                      <div className="text-[9px] font-normal text-indigo-700">
                        SHA256: 3c9b1a4f...e709a
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-1 text-center">
                    <p className="text-xs font-bold text-slate-950">Ir. Hendra Pratama, M.Kom</p>
                    <p className="text-[10px] text-slate-500">Chief Executive Officer &amp; Founder &bull; NIP: NX-001</p>
                  </div>
                </div>
              </div>

              {/* Security Audit Footnote */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[9px] text-slate-400 gap-1">
                <span>
                  Dokumen ini dihasilkan resmi oleh NexaHR Enterprise System. Menggunakan enkripsi digital terpadu Dynamic RBAC.
                </span>
                <span>
                  Dicetak pada: {report.generatedDateFormatted}
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

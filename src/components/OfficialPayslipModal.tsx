import React, { useRef } from 'react';
import { PayrollRecord, User, Department } from '../types/index.ts';
import { formatRupiah } from '../utils/rbac.ts';
import {
  calculateGrossEarnings,
  calculateTotalDeductions,
  numberToIndonesianWords,
  generatePayslipSerial,
} from '../utils/payrollUtils.ts';
import {
  Printer,
  Download,
  X,
  Building2,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  FileText,
  CreditCard,
  UserCheck,
} from 'lucide-react';

interface OfficialPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payroll: PayrollRecord | null;
  user: User | null;
  department: Department | null;
}

export const OfficialPayslipModal: React.FC<OfficialPayslipModalProps> = ({
  isOpen,
  onClose,
  payroll,
  user,
  department,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !payroll || !user) return null;

  const grossEarnings = calculateGrossEarnings(payroll);
  const totalDeductions = calculateTotalDeductions(payroll);
  const serialNumber = generatePayslipSerial(user.id, payroll.month);
  const terbilangStr = numberToIndonesianWords(payroll.netSalary);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payslip-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 id="payslip-modal-title" className="text-sm font-bold tracking-tight">
                Slip Gaji Resmi Elektronik (E-Payslip)
              </h2>
              <p className="text-[11px] text-slate-400">
                Dokumen resmi penggajian terotentikasi &bull; {payroll.periodLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div ref={printAreaRef} className="p-6 sm:p-8 bg-white text-slate-900 space-y-6">
          {/* Company Letterhead */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-5 border-b-2 border-slate-900 gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                NX
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 uppercase">
                  PT. NEXA DIGITAL PERSADA
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  Enterprise Human Capital &amp; Software Solutions
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Gedung Menara Cyber Lantai 4-5, Jl. Kuningan Barat No. 8, Jakarta Selatan 12710
                </p>
                <p className="text-[11px] text-slate-500">
                  Telp: +62 21 5566-7788 &bull; Email: payroll@nexahr.co.id &bull; www.nexahr.co.id
                </p>
              </div>
            </div>

            <div className="text-right sm:self-center bg-slate-50 border border-slate-200 p-3 rounded-xl shrink-0">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
                Bukti Pembayaran Gaji
              </div>
              <div className="text-sm font-extrabold text-indigo-700 font-mono mt-0.5">
                {serialNumber}
              </div>
              <div className="text-[11px] font-semibold text-slate-600 mt-1">
                Periode: <strong className="text-slate-900">{payroll.periodLabel}</strong>
              </div>
            </div>
          </div>

          {/* Employee Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Nama Karyawan</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{user.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">NIP / ID Karyawan</span>
              <span className="font-bold text-slate-900 font-mono mt-0.5 block">{user.employeeNumber}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Departemen / Divisi</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{department?.name || 'General'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Jabatan Struktural</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{user.position}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Metode Pembayaran</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{payroll.bankName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Nomor Rekening</span>
              <span className="font-bold text-slate-900 font-mono mt-0.5 block">{payroll.bankAccountNumber}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Tanggal Transfer</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{payroll.paymentDate}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Status Penggajian</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px] mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                {payroll.status === 'PAID' ? 'LUNAS DITRANSFER' : 'SELESAI DIPROSES'}
              </span>
            </div>
          </div>

          {/* Earnings & Deductions Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Earnings Column */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-indigo-50/70 border-b border-indigo-100 px-4 py-2.5 font-bold text-indigo-900 flex items-center justify-between">
                  <span>PENGHASILAN / EARNINGS</span>
                  <span className="text-[10px] font-semibold text-indigo-700">(+) Kredit</span>
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Gaji Pokok (Basic Salary)</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(payroll.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Tunjangan Jabatan</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(payroll.allowancePosition)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Uang Makan &amp; Transportasi</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(payroll.allowanceTransportMeal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Insentif Lembur (Overtime)</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(payroll.overtimePay)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Bonus / Insentif Performa</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(payroll.bonus)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex justify-between items-center font-bold text-slate-900">
                <span>Total Penghasilan Kotor</span>
                <span className="text-sm text-indigo-700">{formatRupiah(grossEarnings)}</span>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-rose-50/70 border-b border-rose-100 px-4 py-2.5 font-bold text-rose-900 flex items-center justify-between">
                  <span>POTONGAN / DEDUCTIONS</span>
                  <span className="text-[10px] font-semibold text-rose-700">(-) Debit</span>
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex justify-between items-center text-slate-700">
                    <span>BPJS Kesehatan &amp; Ketenagakerjaan</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(payroll.deductionBpjs)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Pajak Penghasilan (PPh 21)</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(payroll.deductionTax)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Potongan Lainnya / Keterlambatan</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(payroll.deductionOther)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex justify-between items-center font-bold text-slate-900">
                <span>Total Potongan</span>
                <span className="text-sm text-rose-600">{formatRupiah(totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Take Home Pay Box */}
          <div className="bg-linear-to-r from-indigo-900 to-indigo-800 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider block">
                GAJI BERSIH DITERIMA (TAKE HOME PAY)
              </span>
              <span className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5 block">
                {formatRupiah(payroll.netSalary)}
              </span>
            </div>
            <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-indigo-700/60 pt-3 sm:pt-0 sm:pl-5 max-w-sm">
              <span className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold block">Terbilang:</span>
              <span className="text-xs font-bold text-indigo-100 italic block mt-0.5">
                "{terbilangStr}"
              </span>
            </div>
          </div>

          {/* Signatures & Electronic Verification Section */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-center text-xs">
            {/* Employee */}
            <div className="flex flex-col items-center justify-between h-32">
              <span className="text-[11px] text-slate-500 font-medium">Penerima Gaji,</span>
              <div className="h-14 flex items-center justify-center">
                <span className="font-serif italic text-slate-700 text-base">{user.name}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 block">{user.name}</span>
                <span className="text-[10px] text-slate-500 block">NIP: {user.employeeNumber}</span>
              </div>
            </div>

            {/* QR Verification Seal */}
            <div className="flex flex-col items-center justify-center border-x border-slate-100 px-2">
              <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                <QrCode className="w-11 h-11" />
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">
                VERIFIED DIGITAL SLIP
              </span>
              <span className="text-[8px] text-slate-400 font-mono">
                SHA256-{serialNumber.slice(-8)}
              </span>
            </div>

            {/* Finance Authority */}
            <div className="flex flex-col items-center justify-between h-32">
              <span className="text-[11px] text-slate-500 font-medium">Head of Finance &amp; HRD,</span>
              <div className="h-14 flex items-center justify-center">
                <div className="px-2 py-1 rounded bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-800">
                  DIGITALLY SIGNED &amp; APPROVED
                </div>
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Linda Kusuma, S.E., Ak.</span>
                <span className="text-[10px] text-slate-500 block">Corporate Finance Manager</span>
              </div>
            </div>
          </div>

          {/* Footer Disclaimer */}
          <div className="text-[10px] text-slate-500 text-center pt-2 border-t border-slate-100">
            Dokumen ini dicetak otomatis dari NexaHR Enterprise System. Sah tanpa tanda tangan basah berdasarkan UU ITE No. 11/2008.
          </div>
        </div>
      </div>
    </div>
  );
};


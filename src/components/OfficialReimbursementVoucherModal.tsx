import React, { useState } from 'react';
import { Reimbursement, User, Department, Role } from '../types/index.ts';
import { Printer, X, ShieldCheck, PenTool, Receipt, FileText, CheckCircle2 } from 'lucide-react';
import { formatRupiah } from '../utils/rbac.ts';
import { DocumentSignatureSlot } from './DocumentSignatureSlot.tsx';
import { DigitalSignatureOverlay } from './DigitalSignatureOverlay.tsx';
import { DigitalSignatureRecord } from '../utils/signatureUtils.ts';
import { useHRIS } from '../context/HRISContext.tsx';

interface OfficialReimbursementVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  reimbursement: Reimbursement | null;
  applicant: User | undefined;
  department: Department | undefined;
  role: Role | undefined;
}

export const OfficialReimbursementVoucherModal: React.FC<OfficialReimbursementVoucherModalProps> = ({
  isOpen,
  onClose,
  reimbursement,
  applicant,
  department,
  role,
}) => {
  const { currentUser } = useHRIS();

  // Signature state keyed by slot ('applicant', 'verifier', 'finance')
  const [signatures, setSignatures] = useState<Record<string, DigitalSignatureRecord>>({});

  // Active overlay state
  const [activeSignSlot, setActiveSignSlot] = useState<{
    key: string;
    slotTitle: string;
    expectedSigner: {
      id?: string;
      name: string;
      position?: string;
      nip?: string;
      role?: string;
    };
  } | null>(null);

  if (!isOpen || !reimbursement || !applicant) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const managerApproval = reimbursement.approvalLogs.find((l) =>
    l.stageName.includes('Manajer')
  );
  const financeApproval = reimbursement.approvalLogs.find((l) =>
    l.stageName.includes('Finance')
  );

  const applicantSigner = {
    id: applicant.id,
    name: applicant.name,
    position: applicant.position,
    nip: applicant.employeeNumber,
    role: 'Karyawan Pemohon',
  };

  const verifierSigner = {
    name: managerApproval?.approverName || 'Budi Santoso, S.T',
    position: 'VP of Engineering / Atasan Langsung',
    nip: 'NIP-ENG-2022-019',
    role: 'Pemeriksa Teknis',
  };

  const financeSigner = {
    name: financeApproval?.approverName || 'Dewi Lestari, S.E., Ak.',
    position: 'Head of Treasury & Finance Disbursement',
    nip: 'NIP-FIN-2020-008',
    role: 'Otorisator Keuangan',
  };

  const signedCount = Object.keys(signatures).length;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="official-voucher-title"
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5"
      >
        <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]">
          {/* Modal Actions Bar (hidden when printed) */}
          <div className="no-print p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between gap-2 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0"></span>
              <div className="min-w-0">
                <span id="official-voucher-title" className="text-xs sm:text-sm font-bold tracking-wide block truncate">
                  Voucher Disposisi Pembayaran
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 truncate block">
                  {reimbursement.invoiceNumber} &bull; {signedCount}/3 TTD
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handlePrint}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cetak / Simpan PDF</span>
                <span className="sm:hidden">Cetak</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="no-print bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200 dark:border-indigo-900/50 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-300">
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">
                <strong>Tanda Tangan Digital Canvas:</strong> Klik kolom tanda tangan pada dokumen untuk menggambar goresan tanda tangan asli sebelum dokumen dicetak atau diarsip.
              </span>
            </div>
          </div>

          {/* Printable Official Voucher Document Body */}
          <div className="p-4 sm:p-10 overflow-y-auto font-serif text-slate-900 bg-white print-container">
            {/* Company Letterhead */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-sans font-black text-xl">
                  NX
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight font-sans text-slate-900">
                    PT. NEXA DIGITAL PERSADA
                  </h1>
                  <p className="text-xs font-sans text-slate-600">
                    Divisi Keuangan &amp; Akuntansi Operasional &bull; Menara Cyber Lt. 5, Jakarta Selatan
                  </p>
                  <p className="text-[11px] font-sans text-slate-500">
                    Telepon: (021) 555-8900 &bull; Email: finance-ops@nexahr.co.id
                  </p>
                </div>
              </div>
              <div className="text-right font-sans">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
                  DISPOSISI SAH
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  ID: {reimbursement.id.toUpperCase()}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {todayStr}
                </p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-6">
              <h2 className="text-lg font-bold uppercase underline tracking-wider font-sans">
                VOUCHER DISPOSISI PEMBAYARAN KLAIM BIAYA (REIMBURSEMENT)
              </h2>
              <p className="text-xs font-sans text-slate-500 mt-1">
                Nomor Voucher: VCR-FIN/{new Date().getFullYear()}/{reimbursement.id.slice(-6).toUpperCase()}
              </p>
            </div>

            {/* Document Content */}
            <div className="text-sm leading-relaxed space-y-4 font-sans text-slate-800">
              {/* Beneficiary Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-500">Karyawan Penerima Manfaat:</span>
                  <p className="font-bold text-slate-900">{applicant.name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Nomor Induk Karyawan (NIP):</span>
                  <p className="font-bold text-slate-900">{applicant.employeeNumber}</p>
                </div>
                <div>
                  <span className="text-slate-500">Jabatan &amp; Departemen:</span>
                  <p className="font-bold text-slate-900">
                    {applicant.position} ({department?.name || 'General'})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Metode Penyaluran:</span>
                  <p className="font-bold text-slate-900">Transfer Payroll Bank Mandiri</p>
                </div>
              </div>

              {/* Expense Details Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Kategori Beban</th>
                      <th className="p-3">Uraian / Deskripsi Pengeluaran</th>
                      <th className="p-3">No. Nota / Invoice</th>
                      <th className="p-3 text-right">Nominal (IDR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">
                        {reimbursement.category}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">
                          {reimbursement.title}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {reimbursement.description || 'Tidak ada keterangan tambahan.'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {reimbursement.invoiceNumber}
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-900">
                        {formatRupiah(reimbursement.amount)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                    <tr>
                      <td colSpan={3} className="p-3 text-right uppercase text-[11px] text-slate-600">
                        Total Dana yang Disetujui:
                      </td>
                      <td className="p-3 text-right font-black text-indigo-900 text-sm">
                        {formatRupiah(reimbursement.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Receipt Preview Attachment */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-4 text-xs">
                <img
                  src={reimbursement.receiptUrl}
                  alt={reimbursement.receiptName}
                  className="w-16 h-16 rounded-lg object-cover border border-slate-300 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Bukti Fisik / Nota Digital Terverifikasi Asli
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Berkas: {reimbursement.receiptName} &bull; Tanggal Transaksi: {reimbursement.receiptDate}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Telah diverifikasi sesuai batas pagu tunjangan dan ketentuan perpajakan.
                  </p>
                </div>
              </div>
            </div>

            {/* Three Formal Signatures Block with HTML5 Canvas Digital Signature Overlays */}
            <div className="mt-10 pt-6 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Signature 1: Applicant */}
              <div className="border border-slate-200/80 rounded-2xl p-3 bg-slate-50/40">
                <DocumentSignatureSlot
                  slotTitle="Karyawan Pemohon"
                  expectedSigner={applicantSigner}
                  signature={signatures['applicant'] || null}
                  onOpenSignOverlay={() =>
                    setActiveSignSlot({
                      key: 'applicant',
                      slotTitle: 'Karyawan Pemohon',
                      expectedSigner: applicantSigner,
                    })
                  }
                  onClearSignature={() => {
                    setSignatures((prev) => {
                      const updated = { ...prev };
                      delete updated['applicant'];
                      return updated;
                    });
                  }}
                  approvalStatusBadge="Diajukan"
                />
              </div>

              {/* Signature 2: Verifier / Manager */}
              <div className="border border-slate-200/80 rounded-2xl p-3 bg-slate-50/40">
                <DocumentSignatureSlot
                  slotTitle="Diverifikasi (Atasan Langsung)"
                  expectedSigner={verifierSigner}
                  signature={signatures['verifier'] || null}
                  onOpenSignOverlay={() =>
                    setActiveSignSlot({
                      key: 'verifier',
                      slotTitle: 'Diverifikasi (Atasan Langsung)',
                      expectedSigner: verifierSigner,
                    })
                  }
                  onClearSignature={() => {
                    setSignatures((prev) => {
                      const updated = { ...prev };
                      delete updated['verifier'];
                      return updated;
                    });
                  }}
                  approvalStatusBadge="Diverifikasi"
                />
              </div>

              {/* Signature 3: Finance Disbursement */}
              <div className="border border-slate-200/80 rounded-2xl p-3 bg-slate-50/40">
                <DocumentSignatureSlot
                  slotTitle="Disetujui untuk Pencairan (Finance)"
                  expectedSigner={financeSigner}
                  signature={signatures['finance'] || null}
                  onOpenSignOverlay={() =>
                    setActiveSignSlot({
                      key: 'finance',
                      slotTitle: 'Disetujui untuk Pencairan (Finance)',
                      expectedSigner: financeSigner,
                    })
                  }
                  onClearSignature={() => {
                    setSignatures((prev) => {
                      const updated = { ...prev };
                      delete updated['finance'];
                      return updated;
                    });
                  }}
                  approvalStatusBadge="Siap Bayar"
                />
              </div>
            </div>

            {/* Document Verification Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] font-sans text-slate-400 gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>
                  Voucher sah dengan tanda tangan digital terenkripsi HTML5 Canvas &amp; audit trail terpusat.
                </span>
              </div>
              <div>
                NexaHR Financial Module &bull; {todayStr}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Digital Signature Overlay Modal */}
      {activeSignSlot && (
        <DigitalSignatureOverlay
          isOpen={true}
          onClose={() => setActiveSignSlot(null)}
          documentId={reimbursement.id}
          documentTitle={`Voucher Klaim: ${reimbursement.title}`}
          slotTitle={activeSignSlot.slotTitle}
          defaultSigner={activeSignSlot.expectedSigner}
          onSaveSignature={(sigRecord) => {
            setSignatures((prev) => ({
              ...prev,
              [activeSignSlot.key]: sigRecord,
            }));
          }}
        />
      )}
    </>
  );
};

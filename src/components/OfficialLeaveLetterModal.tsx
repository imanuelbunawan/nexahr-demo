import React, { useState } from 'react';
import { LeaveRequest, User, Department, Role } from '../types/index.ts';
import { Printer, X, Building2, CheckCircle2, ShieldCheck, PenTool, Sparkles } from 'lucide-react';
import { DocumentSignatureSlot } from './DocumentSignatureSlot.tsx';
import { DigitalSignatureOverlay } from './DigitalSignatureOverlay.tsx';
import { DigitalSignatureRecord } from '../utils/signatureUtils.ts';
import { useHRIS } from '../context/HRISContext.tsx';

interface OfficialLeaveLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequest: LeaveRequest | null;
  applicant: User | undefined;
  department: Department | undefined;
  role: Role | undefined;
}

export const OfficialLeaveLetterModal: React.FC<OfficialLeaveLetterModalProps> = ({
  isOpen,
  onClose,
  leaveRequest,
  applicant,
  department,
  role,
}) => {
  const { currentUser } = useHRIS();

  // Signature state keyed by slot ('applicant', 'manager', 'hrd')
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

  if (!isOpen || !leaveRequest || !applicant) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const managerApproval = leaveRequest.approvalLogs.find((l) =>
    l.stageName.includes('Manajer')
  );
  const hrdApproval = leaveRequest.approvalLogs.find((l) =>
    l.stageName.includes('HRD')
  );

  const managerSigner = {
    name: managerApproval?.approverName || 'Budi Santoso, S.T',
    position: 'VP of Engineering',
    nip: 'NIP-ENG-2022-019',
    role: 'Atasan Langsung',
  };

  const hrdSigner = {
    name: hrdApproval?.approverName || 'Siti Rahmawati, S.Psi',
    position: 'VP Human Capital & People Ops',
    nip: 'NIP-HR-2021-004',
    role: 'HRD & People Ops',
  };

  const applicantSigner = {
    id: applicant.id,
    name: applicant.name,
    position: applicant.position,
    nip: applicant.employeeNumber,
    role: 'Pemohon Cuti',
  };

  const signedCount = Object.keys(signatures).length;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="official-leave-title"
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5"
      >
        <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]">
          {/* Modal Actions Bar (hidden when printed) */}
          <div className="no-print p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between gap-2 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <div className="min-w-0">
                <span id="official-leave-title" className="text-xs sm:text-sm font-bold tracking-wide block truncate">
                  Surat Izin Cuti Resmi
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 truncate block">
                  Ref: {leaveRequest.id.toUpperCase()} &bull; {signedCount}/3 TTD
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
          <div className="no-print bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">
                <strong>Fitur Tanda Tangan Digital Canvas:</strong> Klik tombol tanda tangan pada kolom nama di bawah untuk membubuhkan goresan tanda tangan asli atau kaligrafi sebelum mencetak dokumen.
              </span>
            </div>
          </div>

          {/* Printable Official Document Body */}
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
                    Gedung Menara Cyber Lt. 5, Jl. Rasuna Said Kav. 8, Jakarta Selatan 12950
                  </p>
                  <p className="text-[11px] font-sans text-slate-500">
                    Telepon: (021) 555-8900 &bull; Email: people-ops@nexahr.co.id &bull; Website: nexahr.co.id
                  </p>
                </div>
              </div>
              <div className="text-right font-sans">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  TERVERIFIKASI SISTEM
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ref: {leaveRequest.id.toUpperCase()}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {todayStr}
                </p>
              </div>
            </div>

            {/* Letter Title */}
            <div className="text-center my-6">
              <h2 className="text-lg font-bold uppercase underline tracking-wider font-sans">
                SURAT KETERANGAN IZIN CUTI KARYAWAN
              </h2>
              <p className="text-xs font-sans text-slate-500 mt-1">
                Nomor Dokumen: 108/HRD-CUTI/{new Date().getFullYear()}
              </p>
            </div>

            {/* Body Content */}
            <div className="text-sm leading-relaxed space-y-4 font-sans text-slate-800">
              <p>
                Manajemen Sumber Daya Manusia (People Operations) PT. Nexa Digital
                Persada dengan ini menerangkan dan memberikan izin kepada:
              </p>

              {/* Employee Details Table */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-500">Nama Karyawan:</span>
                  <p className="font-bold text-slate-900">{applicant.name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Nomor Induk Karyawan (NIP):</span>
                  <p className="font-bold text-slate-900">{applicant.employeeNumber}</p>
                </div>
                <div>
                  <span className="text-slate-500">Jabatan:</span>
                  <p className="font-bold text-slate-900">{applicant.position}</p>
                </div>
                <div>
                  <span className="text-slate-500">Departemen / Divisi:</span>
                  <p className="font-bold text-slate-900">
                    {department?.name || 'Technology'}
                  </p>
                </div>
              </div>

              <p>
                Telah diberikan izin permohonan{' '}
                <strong className="text-slate-900">{leaveRequest.leaveType}</strong>{' '}
                selama{' '}
                <strong className="text-slate-900">{leaveRequest.totalDays} hari kerja</strong>,
                terhitung mulai:
              </p>

              <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 flex items-center justify-around text-xs font-semibold text-indigo-900">
                <div>
                  Tanggal Mulai:{' '}
                  <span className="font-bold">{leaveRequest.startDate}</span>
                </div>
                <div>&rarr;</div>
                <div>
                  Tanggal Selesai:{' '}
                  <span className="font-bold">{leaveRequest.endDate}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                <strong>Keterangan / Alasan Cuti:</strong> "{leaveRequest.reason}"
                <br />
                <strong>Kontak Darurat Selama Cuti:</strong> {leaveRequest.emergencyContact || '-'}
              </p>

              <p className="text-xs text-slate-600">
                Selama masa cuti tersebut di atas, hak dan kewajiban ketenagakerjaan
                tetap tunduk pada Peraturan Perusahaan dan Undang-Undang Ketenagakerjaan
                yang berlaku di Republik Indonesia.
              </p>
            </div>

            {/* Three Formal Signatures Block with HTML5 Canvas Digital Signature Overlays */}
            <div className="mt-10 pt-6 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Signature 1: Employee */}
              <div className="border border-slate-200/80 rounded-2xl p-3 bg-slate-50/40">
                <DocumentSignatureSlot
                  slotTitle="Pemohon / Karyawan"
                  expectedSigner={applicantSigner}
                  signature={signatures['applicant'] || null}
                  onOpenSignOverlay={() =>
                    setActiveSignSlot({
                      key: 'applicant',
                      slotTitle: 'Pemohon / Karyawan',
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

              {/* Signature 2: Manager */}
              <div className="border border-slate-200/80 rounded-2xl p-3 bg-slate-50/40">
                <DocumentSignatureSlot
                  slotTitle="Mengetahui (Atasan Langsung)"
                  expectedSigner={managerSigner}
                  signature={signatures['manager'] || null}
                  onOpenSignOverlay={() =>
                    setActiveSignSlot({
                      key: 'manager',
                      slotTitle: 'Mengetahui (Atasan Langsung)',
                      expectedSigner: managerSigner,
                    })
                  }
                  onClearSignature={() => {
                    setSignatures((prev) => {
                      const updated = { ...prev };
                      delete updated['manager'];
                      return updated;
                    });
                  }}
                  approvalStatusBadge="Disetujui Manajer"
                />
              </div>

              {/* Signature 3: HRD */}
              <div className="border border-slate-200/80 rounded-2xl p-3 bg-slate-50/40">
                <DocumentSignatureSlot
                  slotTitle="Menyetujui (People Operations)"
                  expectedSigner={hrdSigner}
                  signature={signatures['hrd'] || null}
                  onOpenSignOverlay={() =>
                    setActiveSignSlot({
                      key: 'hrd',
                      slotTitle: 'Menyetujui (People Operations)',
                      expectedSigner: hrdSigner,
                    })
                  }
                  onClearSignature={() => {
                    setSignatures((prev) => {
                      const updated = { ...prev };
                      delete updated['hrd'];
                      return updated;
                    });
                  }}
                  approvalStatusBadge="Disetujui HRD"
                />
              </div>
            </div>

            {/* Document Verification Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] font-sans text-slate-400 gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Dokumen ini dilengkapi tanda tangan digital terotentikasi canvas berstandar SHA-256.
                </span>
              </div>
              <div>
                Dicetak melalui NexaHR Enterprise System pada {todayStr}.
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
          documentId={leaveRequest.id}
          documentTitle={`Surat Izin Cuti: ${leaveRequest.leaveType}`}
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

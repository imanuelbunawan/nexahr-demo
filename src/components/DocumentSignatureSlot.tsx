import React from 'react';
import { PenTool, CheckCircle2, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { DigitalSignatureRecord } from '../utils/signatureUtils.ts';

interface DocumentSignatureSlotProps {
  slotTitle: string;
  expectedSigner: {
    id?: string;
    name: string;
    position?: string;
    nip?: string;
    role?: string;
  };
  signature: DigitalSignatureRecord | null;
  onOpenSignOverlay: () => void;
  onClearSignature: () => void;
  approvalStatusBadge?: string;
  canSign?: boolean;
}

export const DocumentSignatureSlot: React.FC<DocumentSignatureSlotProps> = ({
  slotTitle,
  expectedSigner,
  signature,
  onOpenSignOverlay,
  onClearSignature,
  approvalStatusBadge,
  canSign = true,
}) => {
  return (
    <div className="flex flex-col justify-between h-full text-center font-sans text-xs select-none">
      {/* Title / Heading of Slot */}
      <div className="mb-2">
        <span className="text-slate-600 font-semibold block">{slotTitle}</span>
        {approvalStatusBadge && (
          <div className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {approvalStatusBadge}
          </div>
        )}
      </div>

      {/* Signature Box (Interactive Canvas or Digital Graphic) */}
      <div className="my-auto min-h-[90px] flex flex-col items-center justify-center relative">
        {signature ? (
          <div className="relative group w-full flex flex-col items-center">
            {/* Signature Graphic Overlay from HTML5 Canvas */}
            <div className="relative w-44 h-16 flex items-center justify-center">
              <img
                src={signature.dataUrl}
                alt={`Tanda tangan ${signature.signerName}`}
                className="max-h-16 max-w-full object-contain filter contrast-125"
              />
            </div>

            {/* Verification Watermark Badge */}
            <div className="mt-1 flex items-center gap-1 text-[9px] font-mono text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>{signature.verificationCode}</span>
              <span className="text-emerald-500 hidden sm:inline">&bull;</span>
              <span className="text-emerald-600 text-[8px] hidden sm:inline">
                {signature.signedAt}
              </span>
            </div>

            {/* Quick Actions (Screen only, hidden on print) */}
            <div className="no-print absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 shadow-md border border-slate-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={onOpenSignOverlay}
                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                title="Tanda tangani ulang"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={onClearSignature}
                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                title="Hapus tanda tangan"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            {/* Unsigned State with Prompt Button */}
            <div className="no-print my-2 w-full">
              <button
                type="button"
                onClick={onOpenSignOverlay}
                className="w-full py-2.5 px-2 border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-xl text-indigo-700 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all group cursor-pointer"
                title="Bubuhkan Tanda Tangan Digital dengan Canvas"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PenTool className="w-3.5 h-3.5" />
                </div>
                <span>Tanda Tangan Digital</span>
                <span className="text-[9px] text-indigo-500 font-normal">
                  Klik untuk gambar kanvas
                </span>
              </button>
            </div>

            {/* Print Fallback Placeholder when printed without signature */}
            <div className="hidden print-only h-16 w-full border-b border-dashed border-slate-300 items-end justify-center pb-1">
              <span className="text-[9px] text-slate-400 italic">
                (Tanda tangan di sini)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Signer Printed Name & Title */}
      <div className="mt-3 pt-1 border-t border-slate-400 mx-2">
        <p className="font-bold text-slate-900 tracking-tight">
          {signature?.signerName || expectedSigner.name}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          {signature?.signerRole || expectedSigner.position || expectedSigner.role || 'Pejabat Berwenang'}
        </p>
        <p className="text-[9px] text-slate-400 font-mono">
          NIP: {signature?.signerNip || expectedSigner.nip || '-'}
        </p>
      </div>
    </div>
  );
};

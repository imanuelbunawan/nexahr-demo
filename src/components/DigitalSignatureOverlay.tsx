import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  PenTool,
  RotateCcw,
  Trash2,
  Check,
  Type,
  BookmarkCheck,
  ShieldCheck,
  Palette,
  Sparkles,
} from 'lucide-react';
import {
  DigitalSignatureRecord,
  generateSignatureVerificationCode,
  formatSignatureTimestamp,
  createCursiveSignatureSvg,
} from '../utils/signatureUtils.ts';

interface DigitalSignatureOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  slotTitle: string;
  defaultSigner: {
    id?: string;
    name: string;
    position?: string;
    nip?: string;
    role?: string;
  };
  onSaveSignature: (record: DigitalSignatureRecord) => void;
}

const PEN_COLORS = [
  { name: 'Corporate Blue', hex: '#1e3a8a' },
  { name: 'Classic Slate', hex: '#0f172a' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Emerald Formal', hex: '#047857' },
];

const STROKE_WIDTHS = [
  { label: 'Halus (1.5px)', value: 1.8 },
  { label: 'Standar (2.5px)', value: 2.8 },
  { label: 'Tebal (4.0px)', value: 4.2 },
];

export const DigitalSignatureOverlay: React.FC<DigitalSignatureOverlayProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  slotTitle,
  defaultSigner,
  onSaveSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#1e3a8a');
  const [strokeWidth, setStrokeWidth] = useState(2.8);
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'saved'>('draw');

  // Type mode state
  const [typedName, setTypedName] = useState(defaultSigner.name || '');
  const [typedStyle, setTypedStyle] = useState<'script' | 'cursive' | 'formal'>('script');

  // Undo history
  const historyRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // Saved signature from localStorage
  const storageKey = `nexahr_saved_sig_${defaultSigner.id || defaultSigner.name.replace(/\s+/g, '_')}`;
  const [savedSigUrl, setSavedSigUrl] = useState<string | null>(null);
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  // Signer metadata
  const [signerName, setSignerName] = useState(defaultSigner.name);
  const [signerNip, setSignerNip] = useState(defaultSigner.nip || '-');
  const [signerPosition, setSignerPosition] = useState(defaultSigner.position || '-');

  // Verification code preview
  const [verificationCode, setVerificationCode] = useState('');
  const [signedAtTimestamp, setSignedAtTimestamp] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSignerName(defaultSigner.name);
      setSignerNip(defaultSigner.nip || '-');
      setSignerPosition(defaultSigner.position || '-');
      setTypedName(defaultSigner.name);
      setVerificationCode(generateSignatureVerificationCode(documentId, defaultSigner.name));
      setSignedAtTimestamp(formatSignatureTimestamp());

      // Check saved signature
      try {
        const stored = localStorage.getItem(storageKey);
        setSavedSigUrl(stored);
      } catch {
        setSavedSigUrl(null);
      }

      // Initialize canvas
      setTimeout(() => {
        initCanvas();
      }, 50);
    }
  }, [isOpen, documentId, defaultSigner]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set display vs pixel ratio
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth;

    // Clear with transparent
    ctx.clearRect(0, 0, rect.width, rect.height);
    historyRef.current = [];
    setCanUndo(false);
    setHasDrawn(false);
  };

  const getCanvasCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save state before stroke
    saveCanvasState();

    setIsDrawing(true);
    setHasDrawn(true);

    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth;
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const currentState = ctx.getImageData(0, 0, rect.width * dpr, rect.height * dpr);
    historyRef.current.push(currentState);
    if (historyRef.current.length > 20) {
      historyRef.current.shift();
    }
    setCanUndo(true);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previousState = historyRef.current.pop();
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
    }
    setCanUndo(historyRef.current.length > 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveCanvasState();
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  // Type-to-sign generation onto canvas
  const handleRenderTypedSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveCanvasState();
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    const svgUrl = createCursiveSignatureSvg(typedName, typedStyle, penColor);
    const img = new Image();
    img.onload = () => {
      // Draw centered onto canvas
      const targetWidth = Math.min(rect.width * 0.8, 360);
      const targetHeight = (targetWidth / 500) * 160;
      const posX = (rect.width - targetWidth) / 2;
      const posY = (rect.height - targetHeight) / 2;

      ctx.drawImage(img, posX, posY, targetWidth, targetHeight);
      setHasDrawn(true);
    };
    img.src = svgUrl;
  };

  // Load saved signature onto canvas
  const handleLoadSavedSignature = () => {
    if (!savedSigUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveCanvasState();
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    const img = new Image();
    img.onload = () => {
      const targetWidth = Math.min(rect.width * 0.85, img.width);
      const targetHeight = (targetWidth / img.width) * img.height;
      const posX = (rect.width - targetWidth) / 2;
      const posY = (rect.height - targetHeight) / 2;

      ctx.drawImage(img, posX, posY, targetWidth, targetHeight);
      setHasDrawn(true);
    };
    img.src = savedSigUrl;
  };

  const handleSaveAndApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let finalDataUrl = '';
    if (hasDrawn) {
      finalDataUrl = canvas.toDataURL('image/png');
    } else if (activeTab === 'saved' && savedSigUrl) {
      finalDataUrl = savedSigUrl;
    } else if (activeTab === 'type' && typedName.trim()) {
      // Auto-render typed signature if not done yet
      handleRenderTypedSignature();
      finalDataUrl = canvas.toDataURL('image/png');
    }

    if (!finalDataUrl) {
      alert('Harap bubuhkan atau buat tanda tangan terlebih dahulu pada kanvas.');
      return;
    }

    // Save to localStorage if requested
    if (saveAsDefault && finalDataUrl) {
      try {
        localStorage.setItem(storageKey, finalDataUrl);
      } catch (err) {
        console.warn('Could not save signature to localStorage', err);
      }
    }

    const record: DigitalSignatureRecord = {
      id: `sig_${Date.now()}`,
      dataUrl: finalDataUrl,
      signerName: signerName.trim() || defaultSigner.name,
      signerNip: signerNip.trim() || defaultSigner.nip,
      signerRole: signerPosition.trim() || defaultSigner.position,
      signedAt: signedAtTimestamp || formatSignatureTimestamp(),
      verificationCode: verificationCode,
      method: activeTab,
    };

    onSaveSignature(record);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-dialog-title"
      className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3.5 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <PenTool className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="signature-dialog-title" className="text-xs sm:text-base font-bold text-white flex items-center gap-2 truncate">
                Overlay Tanda Tangan Digital (HTML5 Canvas)
              </h3>
              <p className="text-[11px] sm:text-xs text-indigo-200/80 truncate">
                {documentTitle} &bull; <span className="font-semibold text-white">{slotTitle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup Overlay"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Method Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('draw')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'draw'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Gores Tangan (Canvas)
            </button>
            <button
              onClick={() => setActiveTab('type')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'type'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Ketik &amp; Font Kaligrafi
            </button>
            {savedSigUrl && (
              <button
                onClick={() => {
                  setActiveTab('saved');
                  handleLoadSavedSignature();
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'saved'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-500" />
                Tanda Tangan Tersimpan
              </button>
            )}
          </div>

          {/* Canvas Tools Toolbar (When in draw mode) */}
          {activeTab === 'draw' && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs">
              {/* Pen Colors */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
                  <Palette className="w-3.5 h-3.5" /> Tinta:
                </span>
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setPenColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                    aria-label={`Warna tinta ${c.name}`}
                    className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center text-white ${
                      penColor === c.hex
                        ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {penColor === c.hex && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>

              {/* Stroke Width */}
              <div className="flex items-center gap-1">
                {STROKE_WIDTHS.map((sw) => (
                  <button
                    key={sw.value}
                    type="button"
                    onClick={() => setStrokeWidth(sw.value)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      strokeWidth === sw.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {sw.label.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Undo & Clear */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-600"
                  title="Urungkan goresan terakhir"
                >
                  <RotateCcw className="w-3 h-3" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1 hover:bg-rose-100"
                  title="Bersihkan kanvas"
                >
                  <Trash2 className="w-3 h-3" />
                  Bersihkan
                </button>
              </div>
            </div>
          )}

          {/* Type Mode Controls */}
          {activeTab === 'type' && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Ketik Nama Penandatangan
                  </label>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Masukkan nama lengkap..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Gaya Kaligrafi
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTypedStyle('script')}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-serif italic ${
                        typedStyle === 'script'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Script Klasik
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypedStyle('cursive')}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs italic ${
                        typedStyle === 'cursive'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Cursive Modern
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypedStyle('formal')}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs italic ${
                        typedStyle === 'formal'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Formal
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Pratinjau font akan langsung di-render ke kanvas digital.
                </span>
                <button
                  type="button"
                  onClick={handleRenderTypedSignature}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Render Tanda Tangan ke Kanvas
                </button>
              </div>
            </div>
          )}

          {/* HTML5 Canvas Surface */}
          <div className="relative rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-950 overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[170px] sm:min-h-[220px]">
            {/* Guide line in middle */}
            <div className="absolute inset-x-8 bottom-10 sm:bottom-12 border-b border-slate-300/60 dark:border-slate-700 pointer-events-none flex items-center justify-between text-[10px] text-slate-400 select-none">
              <span>&times; Tanda tangan di atas garis ini</span>
              <span className="hidden sm:inline">NexaHR E-Sign Canvas Engine</span>
            </div>

            <canvas
              ref={canvasRef}
              data-testid="signature-html5-canvas"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-44 sm:h-56 touch-none cursor-crosshair z-10"
              style={{ touchAction: 'none' }}
            />

            {!hasDrawn && activeTab === 'draw' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 select-none">
                <PenTool className="w-8 h-8 mb-1.5 text-indigo-400/50 animate-bounce" />
                <p className="text-xs font-medium">
                  Gunakan Mouse, Stylus, atau Jari untuk membubuhkan tanda tangan
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Kanvas mendeteksi tekanan dan koordinat multi-touch secara halus
                </p>
              </div>
            )}
          </div>

          {/* Signer Metadata Card & Security Seal */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-slate-800/40 border border-indigo-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{signerName}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-mono">
                    NIP: {signerNip}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Jabatan: {signerPosition} &bull; Segel Digital:{' '}
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                    {verificationCode}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
              <div>Waktu Tanda Tangan:</div>
              <div className="font-medium text-slate-700 dark:text-slate-300">
                {signedAtTimestamp}
              </div>
            </div>
          </div>

          {/* Quick save checkbox */}
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>Simpan tanda tangan ini di profil saya untuk dokumen berikutnya</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 sm:px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSaveAndApply}
            className="px-4 sm:px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-indigo-600/30 hover:scale-[1.01] transition-all"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Terapkan Tanda Tangan ke Dokumen</span>
            <span className="sm:hidden">Terapkan Tanda Tangan</span>
          </button>
        </div>
      </div>
    </div>
  );
};

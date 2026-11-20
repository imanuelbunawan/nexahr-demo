import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed, hide the button completely
  if (isInstalled) {
    return null;
  }

  // If not installable and not on iOS Safari, hide button
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    try {
      setIsInstalling(true);
      await promptInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        title="Instal NexaHR sebagai Aplikasi Desktop atau Mobile"
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors shadow-xs ${className}`}
      >
        <svg
          className="w-4 h-4 text-indigo-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>{isInstalling ? 'Menginstal...' : 'Instal Aplikasi'}</span>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                  N
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Instal NexaHR ke Layar Utama</h3>
                  <p className="text-xs text-slate-500">Akses cepat & bekerja secara offline</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <p>
                  Ketuk tombol <strong>Bagikan (Share)</strong> pada bilah bawah Safari.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <p>
                  Gulir ke bawah lalu pilih opsi <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <p>
                  Ketuk <strong>Tambah</strong> di sudut kanan atas untuk mengonfirmasi.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};

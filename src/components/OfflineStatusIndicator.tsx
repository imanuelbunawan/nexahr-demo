import React, { useState } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import {
  formatStorageSize,
  getOfflineBadgeMeta,
  OfflineSyncAction,
} from '../utils/offlineSyncUtils.ts';

export const OfflineStatusIndicator: React.FC = () => {
  const {
    isOnline,
    isSyncing,
    isOfflineSimulated,
    effectiveOnline,
    pendingOfflineActions,
    lastSyncedAt,
    syncOfflineQueue,
    toggleOfflineSimulation,
    clearOfflineQueue,
    removeOfflineAction,
    storageUsageBytes,
  } = useHRIS();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  React.useEffect(() => {
    const handleOpen = () => setIsDrawerOpen(true);
    window.addEventListener('nexahr:open-sync-drawer', handleOpen);
    return () => window.removeEventListener('nexahr:open-sync-drawer', handleOpen);
  }, []);

  const pendingCount = pendingOfflineActions.length;
  const badgeMeta = getOfflineBadgeMeta(effectiveOnline, pendingCount, isSyncing);

  // Format date helper for last synced timestamp
  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return 'Belum tersinkron';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';
    } catch {
      return isoString;
    }
  };

  const getEntityBadge = (entityType: OfflineSyncAction['entityType']) => {
    switch (entityType) {
      case 'leave':
        return { label: 'Cuti', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
      case 'reimbursement':
        return { label: 'Reimbursement', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'employee':
        return { label: 'Karyawan', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'role':
        return { label: 'Role RBAC', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'task':
        return { label: 'Tugas', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      default:
        return { label: 'Sistem', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <>
      {/* Top Banner when offline or when there are pending offline mutations */}
      {(!effectiveOnline || pendingCount > 0) && (
        <div
          role="status"
          aria-live="polite"
          className={`px-4 py-2.5 transition-colors border-b ${
            !effectiveOnline
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    !effectiveOnline ? 'bg-rose-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    !effectiveOnline ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                />
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">
                  {!effectiveOnline ? 'Mode Offline Aktif:' : 'Perubahan Tertunda:'}
                </span>
                <span className="text-slate-700">
                  {!effectiveOnline
                    ? 'Data HR tetap dapat dibaca dan diedit tanpa koneksi. Perubahan tersimpan di browser.'
                    : 'Koneksi aktif kembali. Perubahan lokal siap disinkronkan ke server.'}
                </span>
                {pendingCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/80 border border-slate-300 shadow-2xs">
                    {pendingCount} aksi tertunda
                  </span>
                )}
                {isOfflineSimulated && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                    Simulasi
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {pendingCount > 0 && (
                <button
                  onClick={() => syncOfflineQueue()}
                  disabled={isSyncing || !effectiveOnline}
                  title={
                    !effectiveOnline
                      ? 'Harap hubungkan jaringan untuk menyinkronkan'
                      : 'Sinkronkan perubahan sekarang'
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-2xs"
                >
                  {isSyncing ? (
                    <>
                      <svg
                        className="animate-spin -ml-0.5 h-3.5 w-3.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Menyinkronkan...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span>Sinkronkan Sekarang</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setIsDrawerOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <span>Kelola Antrean</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Sync Management Drawer / Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7h16m-8 4v6m-3-3h6"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Sinkronisasi Data & Penyimpanan Lokal
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manajemen status jaringan, antrean mutasi offline, dan penyimpanan cache peramban
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                    Koneksi
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        effectiveOnline ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <span className="font-bold text-sm text-slate-800">
                      {effectiveOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  {isOfflineSimulated && (
                    <span className="text-[10px] text-purple-600 font-medium block mt-0.5">
                      (Mode Simulasi)
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                    Antrean Tertunda
                  </span>
                  <div className="font-bold text-base text-slate-900 mt-1">
                    {pendingCount} Aksi
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Tersimpan lokal
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                    Ukuran Cache
                  </span>
                  <div className="font-bold text-base text-slate-900 mt-1">
                    {formatStorageSize(storageUsageBytes)}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    LocalStorage
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                    Sinkronisasi Terakhir
                  </span>
                  <div className="font-semibold text-xs text-slate-800 mt-1 truncate" title={formatLastSync(lastSyncedAt)}>
                    {lastSyncedAt ? formatLastSync(lastSyncedAt) : 'Belum pernah'}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Audit trail cloud
                  </span>
                </div>
              </div>

              {/* Simulation Toggle Box */}
              <div className="p-4 rounded-lg bg-indigo-50/60 border border-indigo-100 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Simulasi Putus Koneksi (Offline Mode)
                  </h4>
                  <p className="text-xs text-indigo-700/80">
                    Uji coba fungsionalitas pengajuan cuti, klaim, atau manajemen tugas saat jaringan terputus tanpa mematikan internet asli.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleOfflineSimulation}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    isOfflineSimulated ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                  aria-pressed={isOfflineSimulated}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isOfflineSimulated ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Offline Actions List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Daftar Tindakan Dalam Antrean ({pendingCount})
                  </h3>
                  {pendingCount > 0 && (
                    <button
                      onClick={clearOfflineQueue}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline"
                    >
                      Kosongkan Antrean
                    </button>
                  )}
                </div>

                {pendingCount === 0 ? (
                  <div className="py-8 px-4 text-center border-2 border-dashed border-slate-200 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      Semua Data HR Telah Tersinkronkan
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tidak ada perubahan tertunda yang menunggu diunggah.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                    {pendingOfflineActions.map((action) => {
                      const badge = getEntityBadge(action.entityType);
                      return (
                        <div
                          key={action.id}
                          className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.color}`}
                              >
                                {badge.label}
                              </span>
                              <span className="text-xs font-semibold text-slate-900 truncate">
                                {action.summary}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              <span>Oleh: {action.actorName}</span>
                              <span>•</span>
                              <span>
                                {new Date(action.queuedAt).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}{' '}
                                WIB
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => removeOfflineAction(action.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors shrink-0"
                            title="Hapus aksi ini dari antrean"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                PWA Service Worker: <strong className="text-slate-700">Aktif & Siap Offline</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => syncOfflineQueue()}
                  disabled={isSyncing || pendingCount === 0 || !effectiveOnline}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  {isSyncing ? (
                    <>
                      <svg
                        className="animate-spin h-3.5 w-3.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Menyinkronkan...</span>
                    </>
                  ) : (
                    <span>Sinkronkan Sekarang</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Compact Offline Status Pill for placement inside top headers / navigation bars
 */
export const OfflineStatusPill: React.FC<{ onClick?: () => void; className?: string }> = ({
  onClick,
  className = '',
}) => {
  const { effectiveOnline, isSyncing, pendingOfflineActions } = useHRIS();
  const pendingCount = pendingOfflineActions.length;
  const meta = getOfflineBadgeMeta(effectiveOnline, pendingCount, isSyncing);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.dispatchEvent(new CustomEvent('nexahr:open-sync-drawer'));
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors shadow-2xs cursor-pointer ${meta.badgeClass} ${className}`}
      title={meta.description}
      aria-label="Status Sinkronisasi & Penyimpanan Offline"
    >
      <span className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
      <span>{meta.label}</span>
    </button>
  );
};

import React, { useState, useEffect } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { ModuleType } from '../types/index.ts';
import {
  Radio,
  Wifi,
  WifiOff,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  ArrowRight,
  X,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';
import { globalSocket, createApprovalSocketPayload } from '../utils/socketService.ts';

interface GlobalNotificationSystemProps {
  onNavigate: (module: ModuleType) => void;
}

export const GlobalNotificationSystem: React.FC<GlobalNotificationSystemProps> = ({
  onNavigate,
}) => {
  const {
    socketStatus,
    socketLatency,
    socketRooms,
    activeSocketToasts,
    dismissSocketToast,
    simulateIncomingApprovalSocket,
    reconnectSocket,
    toggleSocketConnection,
    leaveRequests,
    reimbursements,
    hasUserPermission,
  } = useHRIS();

  const [showSocketMenu, setShowSocketMenu] = useState(false);
  const [autoSimulate, setAutoSimulate] = useState(false);

  // Calculate live pending approvals
  const pendingLeaves = leaveRequests.filter(
    (l) => l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HRD'
  );
  const pendingReimbursements = reimbursements.filter(
    (r) => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_FINANCE'
  );
  const totalPendingApprovals =
    pendingLeaves.length + pendingReimbursements.length;

  // Auto-simulation interval if enabled
  useEffect(() => {
    if (!autoSimulate || socketStatus !== 'connected') return;

    const interval = setInterval(() => {
      const type = Math.random() > 0.5 ? 'leave' : 'reimbursement';
      simulateIncomingApprovalSocket(type);
    }, 28000); // Trigger every 28 seconds

    return () => clearInterval(interval);
  }, [autoSimulate, socketStatus, simulateIncomingApprovalSocket]);

  return (
    <>
      {/* Header Live Socket Indicator & Quick Simulator */}
      <div className="relative">
        <button
          onClick={() => setShowSocketMenu(!showSocketMenu)}
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs ${
            socketStatus === 'connected'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/80'
              : socketStatus === 'connecting'
              ? 'bg-amber-50/70 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-300 animate-pulse'
              : 'bg-rose-50/70 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-300'
          }`}
          title="Status Real-time & Antrean Persetujuan"
          aria-label="Status Antrean"
        >
          <div className="relative flex items-center justify-center">
            {socketStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 relative" />
              </>
            ) : socketStatus === 'connecting' ? (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </div>

          <span className="text-[11px] font-medium hidden sm:inline">
            Live Antrean
          </span>

          {totalPendingApprovals > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-extrabold text-[10px]">
              {totalPendingApprovals}
            </span>
          )}
        </button>

        {/* Socket Control & Event Stream Dropdown Popover */}
        {showSocketMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowSocketMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* Header */}
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                    Real-Time Socket.io System
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Sinkronisasi persetujuan &amp; notifikasi instan tanpa refresh.
                  </p>
                </div>
                <button
                  onClick={toggleSocketConnection}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                    socketStatus === 'connected'
                      ? 'border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60'
                      : 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                  }`}
                >
                  {socketStatus === 'connected' ? 'Putuskan' : 'Hubungkan'}
                </button>
              </div>

              {/* Status Specs */}
              <div className="py-3 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Status Koneksi</span>
                  <span className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    Tersambung (WebSocket Bi-Directional)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Latensi Jaringan</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {socketLatency} ms (Real-time Ping)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Kamar Subskripsi</span>
                  <div className="flex items-center gap-1">
                    {socketRooms.map((room) => (
                      <span
                        key={room}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-indigo-900/60"
                      >
                        {room}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pending Approvals Tracker Box */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <ClipboardCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Live Pending Approvals Queue
                    </span>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                      {totalPendingApprovals} Berjalan
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-amber-100 dark:border-amber-900/50">
                      <span className="text-slate-500 dark:text-slate-400 block">Permohonan Cuti</span>
                      <strong className="text-slate-900 dark:text-white font-bold text-sm">
                        {pendingLeaves.length} Permohonan
                      </strong>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-amber-100 dark:border-amber-900/50">
                      <span className="text-slate-500 dark:text-slate-400 block">Reimbursement</span>
                      <strong className="text-slate-900 dark:text-white font-bold text-sm">
                        {pendingReimbursements.length} Klaim
                      </strong>
                    </div>
                  </div>

                  {hasUserPermission('view_approval') && (
                    <button
                      onClick={() => {
                        onNavigate('approval');
                        setShowSocketMenu(false);
                      }}
                      className="w-full mt-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      Buka Meja Approval Sekarang <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Socket Simulator Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Trigger Simulasi Real-Time</span>
                  <button
                    onClick={() => setAutoSimulate(!autoSimulate)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                      autoSimulate
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {autoSimulate ? (
                      <>
                        <Pause className="w-2.5 h-2.5" /> Auto: ON (28s)
                      </>
                    ) : (
                      <>
                        <Play className="w-2.5 h-2.5" /> Auto Sim: OFF
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      simulateIncomingApprovalSocket('leave');
                    }}
                    className="p-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-left transition-all hover:scale-[1.01] border border-transparent dark:border-slate-700 cursor-pointer"
                  >
                    <div className="text-[11px] font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      + Cuti Masuk
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 block mt-0.5">
                      New Leave Request
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      simulateIncomingApprovalSocket('reimbursement');
                    }}
                    className="p-2 rounded-xl bg-emerald-700 dark:bg-emerald-800 hover:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-left transition-all hover:scale-[1.01] border border-transparent dark:border-emerald-700 cursor-pointer"
                  >
                    <div className="text-[11px] font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-300" />
                      + Klaim Nota
                    </div>
                    <span className="text-[10px] text-emerald-200 block mt-0.5">
                      New Reimbursement
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      const payload = createApprovalSocketPayload(
                        'approval:final_approved',
                        'leave',
                        `req_live_${Date.now()}`,
                        'Maya Putri Lestari',
                        'Persetujuan Cuti Tahunan Disahkan',
                        'Marketing & Brand Growth',
                        'All',
                        '3 Hari Kerja'
                      );
                      globalSocket.dispatchApprovalEvent(payload);
                    }}
                    className="p-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-left transition-all hover:scale-[1.01] border border-emerald-700/60 cursor-pointer"
                  >
                    <div className="text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      + Status Approved
                    </div>
                    <span className="text-[10px] text-emerald-400/80 block mt-0.5">
                      Approval Disahkan
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      const payload = createApprovalSocketPayload(
                        'approval:rejected',
                        'leave',
                        `req_live_${Date.now()}`,
                        'Budi Santoso',
                        'Permohonan Cuti Ditolak: Jadwal rilis v2.4 sprint akhir',
                        'Technology & Engineering',
                        'All',
                        '2 Hari Kerja'
                      );
                      globalSocket.dispatchApprovalEvent(payload);
                    }}
                    className="p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-left transition-all hover:scale-[1.01] border border-rose-700/60 cursor-pointer"
                  >
                    <div className="text-[11px] font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      + Status Rejected
                    </div>
                    <span className="text-[10px] text-rose-400/80 block mt-0.5">
                      Approval Ditolak
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

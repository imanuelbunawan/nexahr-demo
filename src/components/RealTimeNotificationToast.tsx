import React, { useEffect, useState, useRef } from 'react';
import { RealTimeToast } from '../utils/realtimeNotificationUtils.ts';
import { ModuleType } from '../types/index.ts';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  X,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';

interface ToastItemProps {
  toast: RealTimeToast;
  onDismiss: (id: string) => void;
  onNavigate: (module: ModuleType) => void;
  isSoundMuted?: boolean;
}

export const ToastItem: React.FC<ToastItemProps> = ({
  toast,
  onDismiss,
  onNavigate,
}) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const totalDuration = toast.durationMs || 7000;
  const intervalMs = 50;

  useEffect(() => {
    if (isPaused) return;

    const timeout = setTimeout(() => {
      onDismiss(toast.id);
    }, totalDuration);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rem = Math.max(0, 100 - (elapsed / totalDuration) * 100);
      setProgress(rem);
    }, 50);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isPaused, totalDuration, toast.id, onDismiss]);

  const getStatusIcon = () => {
    switch (toast.statusState) {
      case 'FINAL_APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'PENDING_TIER_2':
        return <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'NEW_REQUEST':
      default:
        return <CalendarDays className="w-4 h-4 text-indigo-400 shrink-0" />;
    }
  };

  const getBadgeStyle = () => {
    switch (toast.statusBadgeColor) {
      case 'emerald':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'amber':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      case 'rose':
        return 'bg-rose-950/80 text-rose-300 border-rose-700/60';
      case 'indigo':
      default:
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60';
    }
  };

  const getProgressColor = () => {
    switch (toast.statusBadgeColor) {
      case 'emerald':
        return 'bg-emerald-500';
      case 'amber':
        return 'bg-amber-500';
      case 'rose':
        return 'bg-rose-500';
      case 'indigo':
      default:
        return 'bg-indigo-500';
    }
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      aria-live="polite"
      className="pointer-events-auto relative w-full bg-slate-950/95 text-white rounded-2xl shadow-2xl border border-slate-800 hover:border-slate-700 overflow-hidden backdrop-blur-md transition-all duration-200 animate-in slide-in-from-top-4 fade-in"
    >
      <div className="p-3.5 sm:p-4 space-y-2.5">
        {/* Top Header: Ping beacon, Badge, Timestamp & Dismiss */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getProgressColor()}`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${getProgressColor()}`}
              />
            </span>
            <span
              className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border truncate ${getBadgeStyle()}`}
            >
              {toast.statusBadgeLabel}
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              {toast.timestamp}
            </span>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Tutup Notifikasi"
            title="Tutup Notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title & Body Description */}
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
            {getStatusIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white leading-tight">
              {toast.title}
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              {toast.message}
            </p>
            {toast.rejectionReason && (
              <div className="mt-1 px-2 py-1 rounded-lg bg-rose-950/50 border border-rose-900/50 text-[10px] text-rose-300">
                <span className="font-bold">Alasan Penolakan:</span> {toast.rejectionReason}
              </div>
            )}
          </div>
        </div>

        {/* Action & Meta Footer */}
        <div className="pt-1 border-t border-slate-900 flex items-center justify-between gap-2 text-xs">
          <span className="text-[10px] text-slate-400 font-semibold truncate">
            {toast.metaDetail}
          </span>

          <button
            onClick={() => {
              onNavigate(toast.targetModule);
              onDismiss(toast.id);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer hover:underline"
          >
            <span>
              {toast.targetModule === 'approval'
                ? 'Meja Approval'
                : toast.targetModule === 'leave'
                ? 'Riwayat Cuti'
                : 'Lihat Detail'}
            </span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Progress countdown indicator line */}
      <div className="w-full h-1 bg-slate-900">
        <div
          className={`h-full transition-all duration-75 ease-linear ${getProgressColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

interface RealTimeNotificationContainerProps {
  toasts: RealTimeToast[];
  onDismiss: (id: string) => void;
  onNavigate: (module: ModuleType) => void;
}

export const RealTimeNotificationContainer: React.FC<RealTimeNotificationContainerProps> = ({
  toasts,
  onDismiss,
  onNavigate,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifikasi Real-Time Berjalan"
      className="fixed top-16 sm:top-20 right-3 sm:right-6 z-60 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { HRISProvider, useHRIS } from './context/HRISContext.tsx';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { LeaveView } from './components/LeaveView.tsx';
import { ReimbursementView } from './components/ReimbursementView.tsx';
import { ApprovalDeskView } from './components/ApprovalDeskView.tsx';
import { EmployeeView } from './components/EmployeeView.tsx';
import { RolesMatrixView } from './components/RolesMatrixView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { KanbanView } from './components/KanbanView.tsx';
import { AuditLogsView } from './components/AuditLogsView.tsx';
import { AttendanceView } from './components/AttendanceView.tsx';
import { PayrollView } from './components/PayrollView.tsx';
import { GlobalExportModal } from './components/GlobalExportModal.tsx';
import { RealTimeNotificationContainer } from './components/RealTimeNotificationToast.tsx';
import { OfflineStatusIndicator } from './components/OfflineStatusIndicator.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { ModuleType, SocketApprovalPayload } from './types/index.ts';
import {
  RealTimeToast,
  createToastFromSocketEvent,
} from './utils/realtimeNotificationUtils.ts';
import { globalSocket } from './utils/socketService.ts';
import {
  Lock,
  ShieldAlert,
  ArrowRight,
  Shield,
  Sparkles,
  UserCheck,
} from 'lucide-react';

function MainApp() {
  const { hasUserPermission, currentUser, roles } = useHRIS();

  const [currentModule, setCurrentModule] = useState<ModuleType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Quick modals state from Dashboard and Centralized Actions
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isReimbursementModalOpen, setIsReimbursementModalOpen] =
    useState(false);
  const [isNewEmployeeModalOpen, setIsNewEmployeeModalOpen] = useState(false);
  const [isNewRoleModalOpen, setIsNewRoleModalOpen] = useState(false);
  const [isGlobalExportModalOpen, setIsGlobalExportModalOpen] = useState(false);

  // Real-time Notification Toasts State for Approval Updates & New Leave Requests
  const [realtimeToasts, setRealtimeToasts] = useState<RealTimeToast[]>([]);

  // Self-contained Web Audio API gentle synthesizer chime
  const playToastChime = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Note 1: 523.25 Hz (C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.32);

      // Note 2: 659.25 Hz (E5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.1);
      gain2.gain.setValueAtTime(0.08, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.42);
    } catch {
      // Ignored if browser policy blocks autoplay before interaction
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setRealtimeToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Subscribe to real-time approval events & new requests
  useEffect(() => {
    const handleApprovalEvent = (payload: SocketApprovalPayload) => {
      const toast = createToastFromSocketEvent(payload);
      setRealtimeToasts((prev) => [toast, ...prev.slice(0, 3)]);
      playToastChime();
    };

    const cleanup = globalSocket.on('approval:event', handleApprovalEvent);
    return () => {
      cleanup();
    };
  }, [playToastChime]);

  const currentRole = roles.find((r) => r.id === currentUser.roleId);

  // Dynamic permission check for the currently active screen
  const getRequiredViewPermission = (mod: ModuleType): string => {
    switch (mod) {
      case 'dashboard':
        return 'view_dashboard';
      case 'leave':
        return 'view_leave';
      case 'reimbursement':
        return 'view_reimbursement';
      case 'approval':
        return 'view_approval';
      case 'employees':
        return 'view_employees';
      case 'roles':
        return 'view_roles';
      case 'reports':
        return 'view_reports';
      case 'kanban':
        return 'view_kanban';
      case 'audit_logs':
        return 'view_audit_logs';
      case 'attendance':
        return 'view_attendance';
      case 'payroll':
        return 'view_payroll';
      default:
        return 'view_dashboard';
    }
  };

  const isModulePermitted = hasUserPermission(
    getRequiredViewPermission(currentModule)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col antialiased text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white relative transition-colors duration-200">
      {/* Offline Status & Synchronization Banner */}
      <OfflineStatusIndicator />

      {/* Top Application Header with Centralized Actions Dropdown */}
      <Header
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onNavigate={(mod) => setCurrentModule(mod)}
        onOpenLeaveModal={() => {
          setCurrentModule('leave');
          setIsLeaveModalOpen(true);
        }}
        onOpenReimbursementModal={() => {
          setCurrentModule('reimbursement');
          setIsReimbursementModalOpen(true);
        }}
        onOpenNewEmployeeModal={() => {
          setCurrentModule('employees');
          setIsNewEmployeeModalOpen(true);
        }}
        onOpenNewRoleModal={() => {
          setCurrentModule('roles');
          setIsNewRoleModalOpen(true);
        }}
        onOpenExportModal={() => setIsGlobalExportModalOpen(true)}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Dynamic RBAC Sidebar */}
        <Sidebar
          currentModule={currentModule}
          onSelectModule={(mod) => setCurrentModule(mod)}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 min-w-0 pb-24 lg:pb-12">
          {/* RBAC Access Denied Fallback if Owner toggles off permission */}
          {!isModulePermitted ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 uppercase tracking-wider border border-rose-200 dark:border-rose-900/60">
                  403 Forbidden &bull; Dynamic RBAC Guard
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-3">
                  Akses Modul Dibatasi oleh Sistem
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Role Anda (
                  <strong className="text-slate-800 dark:text-slate-200">
                    {currentRole?.label || currentRole?.name}
                  </strong>
                  ) saat ini tidak memiliki izin{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-indigo-700 dark:text-indigo-400 font-bold">
                    {getRequiredViewPermission(currentModule)}
                  </code>{' '}
                  pada matriks otorisasi perusahaan.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentModule('dashboard')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-indigo-500 shadow-sm transition-all"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {currentModule === 'dashboard' && (
                <DashboardView
                  onNavigate={(mod) => setCurrentModule(mod)}
                  onOpenLeaveModal={() => {
                    setCurrentModule('leave');
                    setIsLeaveModalOpen(true);
                  }}
                  onOpenReimbursementModal={() => {
                    setCurrentModule('reimbursement');
                    setIsReimbursementModalOpen(true);
                  }}
                />
              )}

              {currentModule === 'leave' && (
                <LeaveView
                  isModalOpen={isLeaveModalOpen}
                  onCloseModal={() => setIsLeaveModalOpen(false)}
                  onOpenModal={() => setIsLeaveModalOpen(true)}
                />
              )}

              {currentModule === 'reimbursement' && (
                <ReimbursementView
                  isModalOpen={isReimbursementModalOpen}
                  onCloseModal={() => setIsReimbursementModalOpen(false)}
                  onOpenModal={() => setIsReimbursementModalOpen(true)}
                />
              )}

              {currentModule === 'approval' && <ApprovalDeskView />}

              {currentModule === 'employees' && (
                <EmployeeView
                  isAddModalOpen={isNewEmployeeModalOpen}
                  onCloseAddModal={() => setIsNewEmployeeModalOpen(false)}
                  onOpenAddModal={() => setIsNewEmployeeModalOpen(true)}
                />
              )}

              {currentModule === 'roles' && (
                <RolesMatrixView
                  isNewRoleModalOpen={isNewRoleModalOpen}
                  onCloseNewRoleModal={() => setIsNewRoleModalOpen(false)}
                  onOpenNewRoleModal={() => setIsNewRoleModalOpen(true)}
                />
              )}

              {currentModule === 'reports' && <ReportsView />}

              {currentModule === 'kanban' && <KanbanView />}

              {currentModule === 'attendance' && <AttendanceView />}

              {currentModule === 'payroll' && <PayrollView />}

              {currentModule === 'audit_logs' && <AuditLogsView />}
            </>
          )}
        </main>
      </div>

      {/* Global Data Export Modal (CSV & PDF) */}
      <GlobalExportModal
        isOpen={isGlobalExportModalOpen}
        onClose={() => setIsGlobalExportModalOpen(false)}
      />

      {/* Real-time Notification Toast System for Approval Updates & New Requests */}
      <RealTimeNotificationContainer
        toasts={realtimeToasts}
        onDismiss={dismissToast}
        onNavigate={(mod) => setCurrentModule(mod)}
      />

      {/* Modern Mobile Bottom Navigation Dock */}
      <MobileBottomNav
        currentModule={currentModule}
        onSelectModule={(mod) => setCurrentModule(mod)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Global Quick Persona Notice Bar at Bottom - Always docked and visible without scrolling */}
      <footer className="no-print shrink-0 sticky bottom-0 z-20 w-full bg-slate-900 text-slate-400 border-t border-slate-800 py-2.5 px-4 text-xs mb-14 lg:mb-0 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300 font-semibold">
              NexaHR Enterprise v2.4
            </span>
            <span className="text-slate-500 hidden sm:inline">&bull;</span>
            <span className="text-slate-400 hidden sm:inline">
              Pengguna aktif: {currentUser.name} ({currentRole?.name})
            </span>
          </div>

          <div className="text-[11px] text-slate-500">
            Sistem Informasi HRIS Berbasis Dynamic RBAC &bull; Multi-Level Approvals
          </div>
        </div>
      </footer>
    </div>
  );
}

function RootApp() {
  const { isAuthenticated } = useHRIS();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <MainApp />;
}

export default function App() {
  return (
    <ThemeProvider>
      <HRISProvider>
        <RootApp />
      </HRISProvider>
    </ThemeProvider>
  );
}

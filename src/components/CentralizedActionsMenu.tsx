import React, { useState } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { ModuleType } from '../types/index.ts';
import { downloadLeaveCSV, downloadReimbursementCSV } from '../utils/exportHelpers.ts';
import {
  Plus,
  CalendarDays,
  ReceiptText,
  UserPlus,
  ShieldPlus,
  Download,
  ChevronDown,
  Sparkles,
  X,
  FileSpreadsheet,
  Kanban,
  Clock,
  CreditCard,
} from 'lucide-react';

interface CentralizedActionsMenuProps {
  mode: 'header' | 'fab';
  onOpenLeaveModal: () => void;
  onOpenReimbursementModal: () => void;
  onNavigate: (module: ModuleType) => void;
  onOpenNewEmployeeModal?: () => void;
  onOpenNewRoleModal?: () => void;
  onOpenExportModal?: () => void;
}

export const CentralizedActionsMenu: React.FC<CentralizedActionsMenuProps> = ({
  mode,
  onOpenLeaveModal,
  onOpenReimbursementModal,
  onNavigate,
  onOpenNewEmployeeModal,
  onOpenNewRoleModal,
  onOpenExportModal,
}) => {
  const {
    hasUserPermission,
    leaveRequests,
    reimbursements,
    users,
    departments,
  } = useHRIS();

  const [isOpen, setIsOpen] = useState(false);

  // Permission checks
  const canCreateLeave = hasUserPermission('create_leave');
  const canCreateReimb = hasUserPermission('create_reimbursement');
  const canCreateEmployee = hasUserPermission('create_employees');
  const canCreateRole = hasUserPermission('create_roles');
  const canViewKanban = hasUserPermission('view_kanban');
  const canExportReports =
    hasUserPermission('create_reports') || hasUserPermission('view_reports');
  const canExportAudit =
    hasUserPermission('create_audit_logs') || hasUserPermission('view_audit_logs');
  const canExport = canExportReports || canExportAudit;

  // If user has no creation or export rights, do not render
  const hasAnyAction =
    canCreateLeave ||
    canCreateReimb ||
    canCreateEmployee ||
    canCreateRole ||
    canViewKanban ||
    canExportReports ||
    canExport;

  if (!hasAnyAction) return null;

  const handleAction = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  const handleLeaveCSV = () => {
    downloadLeaveCSV(leaveRequests, users, departments);
  };

  const handleReimbursementCSV = () => {
    downloadReimbursementCSV(reimbursements, users, departments);
  };

  // Header Dropdown Menu
  if (mode === 'header') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          title="Buka Menu Aksi Cepat Terpusat"
          aria-expanded={isOpen}
          aria-label="Buat Baru"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Buat Baru</span>
          <ChevronDown
            className={`hidden sm:block w-3 h-3 opacity-80 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Aksi Cepat Terpusat
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 px-1.5 py-0.5 rounded">
                  Otorisasi Aktif
                </span>
              </div>

              {/* Group 1: Pengajuan Karyawan */}
              {(canCreateLeave || canCreateReimb) && (
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Pengajuan
                  </div>

                  {canCreateLeave && (
                    <button
                      onClick={() => handleAction(onOpenLeaveModal)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <CalendarDays className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="leading-tight">Ajukan Cuti Baru</div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          Tahunan, Sakit, atau Khusus
                        </span>
                      </div>
                    </button>
                  )}

                  {canCreateReimb && (
                    <button
                      onClick={() => handleAction(onOpenReimbursementModal)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <ReceiptText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="leading-tight">Klaim Reimbursement</div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          Unggah nota biaya operasional
                        </span>
                      </div>
                    </button>
                  )}

                  {hasUserPermission('view_attendance') && (
                    <button
                      onClick={() => handleAction(() => onNavigate('attendance'))}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/70 dark:hover:bg-purple-950/40 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="leading-tight">Presensi &amp; Lembur</div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          Check-in, jam kerja &amp; lembur
                        </span>
                      </div>
                    </button>
                  )}

                  {hasUserPermission('view_payroll') && (
                    <button
                      onClick={() => handleAction(() => onNavigate('payroll'))}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="leading-tight">Slip Gaji &amp; Payroll</div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          Lihat slip &amp; rekap kompensasi
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Group 2: Administrasi SDM & Roles */}
              {(canCreateEmployee || canCreateRole) && (
                <div className="py-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Administrasi
                  </div>

                  {canCreateEmployee && (
                    <button
                      onClick={() =>
                        handleAction(() => {
                          onNavigate('employees');
                          if (onOpenNewEmployeeModal) onOpenNewEmployeeModal();
                        })
                      }
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="leading-tight">Tambah Karyawan</div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          Daftarkan personil baru
                        </span>
                      </div>
                    </button>
                  )}

                  {canCreateRole && (
                    <button
                      onClick={() =>
                        handleAction(() => {
                          onNavigate('roles');
                          if (onOpenNewRoleModal) onOpenNewRoleModal();
                        })
                      }
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:bg-slate-900 dark:group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ShieldPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="leading-tight">Tambah Role Baru</div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          Atur matriks otorisasi
                        </span>
                      </div>
                    </button>
                  )}

                  {canViewKanban && (
                    <button
                      onClick={() =>
                        handleAction(() => {
                          onNavigate('kanban');
                        })
                      }
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-amber-950/40 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <Kanban className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="leading-tight">Buka Papan Kanban</div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          Kelola & pantau status tugas
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Group 3: Ekspor Data */}
              {(canExportReports || canExport) && (
                <div className="py-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Ekspor Data
                  </div>

                  {onOpenExportModal && (
                    <button
                      onClick={() => handleAction(onOpenExportModal)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="leading-tight font-bold">Hub Ekspor Data</div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          Laporan &amp; Audit Trail (CSV / PDF)
                        </span>
                      </div>
                    </button>
                  )}

                  {canExportReports && (
                    <>
                      <button
                        onClick={() => handleAction(handleLeaveCSV)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span>Unduh Cuti Cepat (CSV)</span>
                      </button>

                      <button
                        onClick={() => handleAction(handleReimbursementCSV)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Unduh Biaya Cepat (CSV)</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Floating Action Button (FAB) Mode
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/20 backdrop-blur-2xs z-30 transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative z-40 mb-3 flex flex-col items-end gap-2 animate-in slide-in-from-bottom-4 fade-in duration-150">
            {canCreateLeave && (
              <button
                onClick={() => handleAction(onOpenLeaveModal)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xl border border-slate-200/90 dark:border-slate-800 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-105 active:scale-95"
              >
                <span>Ajukan Cuti Baru</span>
                <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
              </button>
            )}

            {canCreateReimb && (
              <button
                onClick={() => handleAction(onOpenReimbursementModal)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xl border border-slate-200/90 dark:border-slate-800 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all hover:scale-105 active:scale-95"
              >
                <span>Klaim Reimbursement</span>
                <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ReceiptText className="w-3.5 h-3.5" />
                </div>
              </button>
            )}

            {hasUserPermission('view_attendance') && (
              <button
                onClick={() => handleAction(() => onNavigate('attendance'))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xl border border-slate-200/90 dark:border-slate-800 text-xs font-bold hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-400 transition-all hover:scale-105 active:scale-95"
              >
                <span>Presensi &amp; Lembur</span>
                <div className="w-7 h-7 rounded-full bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </button>
            )}

            {hasUserPermission('view_payroll') && (
              <button
                onClick={() => handleAction(() => onNavigate('payroll'))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xl border border-slate-200/90 dark:border-slate-800 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-105 active:scale-95"
              >
                <span>Slip Gaji &amp; Payroll</span>
                <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </button>
            )}

            {canCreateEmployee && (
              <button
                onClick={() =>
                  handleAction(() => {
                    onNavigate('employees');
                    if (onOpenNewEmployeeModal) onOpenNewEmployeeModal();
                  })
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xl border border-slate-200/90 dark:border-slate-800 text-xs font-bold hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-400 transition-all hover:scale-105 active:scale-95"
              >
                <span>Tambah Karyawan</span>
                <div className="w-7 h-7 rounded-full bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <UserPlus className="w-3.5 h-3.5" />
                </div>
              </button>
            )}

            {canCreateRole && (
              <button
                onClick={() =>
                  handleAction(() => {
                    onNavigate('roles');
                    if (onOpenNewRoleModal) onOpenNewRoleModal();
                  })
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xl border border-slate-200/90 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all hover:scale-105 active:scale-95"
              >
                <span>Tambah Role Baru</span>
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <ShieldPlus className="w-3.5 h-3.5" />
                </div>
              </button>
            )}

            {canViewKanban && (
              <button
                onClick={() =>
                  handleAction(() => {
                    onNavigate('kanban');
                  })
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xl border border-slate-200/90 dark:border-slate-800 text-xs font-bold hover:bg-amber-50 dark:hover:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400 transition-all hover:scale-105 active:scale-95"
              >
                <span>Papan Kanban</span>
                <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Kanban className="w-3.5 h-3.5" />
                </div>
              </button>
            )}

            {(canExport || canExportReports) && (
              <button
                onClick={() =>
                  handleAction(onOpenExportModal ? onOpenExportModal : handleLeaveCSV)
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xl border border-slate-200/90 dark:border-slate-800 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-105 active:scale-95"
              >
                <span>Hub Ekspor Data (CSV / PDF)</span>
                <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Download className="w-3.5 h-3.5" />
                </div>
              </button>
            )}
          </div>
        </>
      )}

      {/* Main Floating Trigger Button with Optional Label */}
      <div className="flex items-center gap-2.5">
        {!isOpen && (
          <span className="hidden sm:inline-block px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-bold shadow-lg border border-slate-700/50 pointer-events-none select-none animate-in fade-in slide-in-from-right-2 duration-200">
            Aksi Cepat
          </span>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative z-40 w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 ${
            isOpen
              ? 'bg-slate-900 rotate-45 shadow-slate-900/30'
              : 'bg-gradient-to-tr from-indigo-600 via-indigo-600 to-sky-500 shadow-indigo-600/40'
          }`}
          aria-label="Aksi Cepat Terpusat"
          title="Menu Aksi Cepat Terpusat (FAB)"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { ModuleType } from '../types/index.ts';
import {
  LayoutDashboard,
  CalendarDays,
  ReceiptText,
  ClipboardCheck,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  Kanban,
  X,
  Lock,
  ChevronRight,
  Building2,
  History,
  LogOut,
  Clock,
  CreditCard,
} from 'lucide-react';

interface SidebarProps {
  currentModule: ModuleType;
  onSelectModule: (module: ModuleType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItemConfig {
  id: ModuleType;
  label: string;
  icon: React.ElementType;
  requiredPermission: string;
  badgeCount?: number;
  description: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { hasUserPermission, leaveRequests, reimbursements, currentUser, roles, logout } =
    useHRIS();

  // Calculate pending items requiring approval
  const pendingLeaves = leaveRequests.filter(
    (l) => l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HRD'
  ).length;
  const pendingReimbursements = reimbursements.filter(
    (r) => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_FINANCE'
  ).length;
  const totalPendingApprovals = pendingLeaves + pendingReimbursements;

  const currentRole = roles.find((r) => r.id === currentUser.roleId);

  const navItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      requiredPermission: 'view_dashboard',
      description: 'Ringkasan & KPI Sistem',
    },
    {
      id: 'leave',
      label: 'Manajemen Cuti',
      icon: CalendarDays,
      requiredPermission: 'view_leave',
      description: 'Form & Kuota Cuti',
    },
    {
      id: 'reimbursement',
      label: 'Klaim Reimbursement',
      icon: ReceiptText,
      requiredPermission: 'view_reimbursement',
      description: 'Nota & Pengeluaran',
    },
    {
      id: 'approval',
      label: 'Meja Approval',
      icon: ClipboardCheck,
      requiredPermission: 'view_approval',
      badgeCount: totalPendingApprovals,
      description: 'Persetujuan Berjenjang',
    },
    {
      id: 'attendance',
      label: 'Presensi & Kehadiran',
      icon: Clock,
      requiredPermission: 'view_attendance',
      description: 'Jam Kerja & Pengajuan Lembur',
    },
    {
      id: 'payroll',
      label: 'Penggajian & Slip Gaji',
      icon: CreditCard,
      requiredPermission: 'view_payroll',
      description: 'Slip Gaji, BPJS & PPh 21',
    },
    {
      id: 'kanban',
      label: 'Papan Kanban',
      icon: Kanban,
      requiredPermission: 'view_kanban',
      description: 'Tugas & Manajemen Kerja',
    },
    {
      id: 'employees',
      label: 'Data Karyawan',
      icon: Users,
      requiredPermission: 'view_employees',
      description: 'Divisi, SDM & Hierarki',
    },
    {
      id: 'roles',
      label: 'Role & Dynamic RBAC',
      icon: ShieldCheck,
      requiredPermission: 'view_roles',
      description: 'Permission Matrix Dinamis',
    },
    {
      id: 'reports',
      label: 'Laporan & Dokumen',
      icon: FileSpreadsheet,
      requiredPermission: 'view_reports',
      description: 'Ekspor Excel & PDF Resmi',
    },
    {
      id: 'audit_logs',
      label: 'Audit Log Sistem',
      icon: History,
      requiredPermission: 'view_audit_logs',
      description: 'Rekam Jejak Historis & Otorisasi',
    },
  ];

  // Dynamic Filtering based strictly on RBAC permissions
  const visibleNavItems = navItems.filter((item) =>
    hasUserPermission(item.requiredPermission)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Top Organization Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              PT. NEXA DIGITAL PERSADA
            </h3>
            <p className="text-[11px] text-slate-400">Kantor Pusat Jakarta</p>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden text-slate-400 hover:text-white p-1"
          aria-label="Tutup Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Menu Navigasi Otorisasi
        </div>

        {visibleNavItems.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            <Lock className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            <p className="text-xs">Tidak ada menu yang diizinkan untuk role ini.</p>
          </div>
        ) : (
          visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectModule(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-indigo-400'
                    }`}
                  />
                  <div className="truncate">
                    <div className="text-xs font-semibold leading-tight truncate">
                      {item.label}
                    </div>
                    <div
                      className={`text-[10px] leading-tight truncate mt-0.5 ${
                        isActive ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white text-indigo-700'
                          : 'bg-rose-500/90 text-white'
                      }`}
                    >
                      {item.badgeCount}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      isActive ? 'text-indigo-200 opacity-100' : 'opacity-0 group-hover:opacity-60'
                    }`}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom User Card in Sidebar */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              {currentRole?.label || 'Staff'}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors shrink-0 cursor-pointer"
            title="Keluar dari sesi (Logout)"
            aria-label="Keluar dari sesi"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-800">
        <div className="sticky top-16 h-[calc(100vh-4rem)]">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Overlay Sidebar Drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { ModuleType } from '../types/index.ts';
import { useHRIS } from '../context/HRISContext.tsx';
import {
  LayoutDashboard,
  CalendarDays,
  ReceiptText,
  ClipboardCheck,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentModule: ModuleType;
  onSelectModule: (module: ModuleType) => void;
  onOpenMobileMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentModule,
  onSelectModule,
  onOpenMobileMenu,
}) => {
  const { hasUserPermission, leaveRequests, reimbursements } = useHRIS();

  // Pending approvals count for live badge
  const pendingLeaves = leaveRequests.filter(
    (l) => l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HRD'
  ).length;
  const pendingReimbursements = reimbursements.filter(
    (r) => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_FINANCE'
  ).length;
  const totalPending = pendingLeaves + pendingReimbursements;

  const navItems = [
    {
      id: 'dashboard' as ModuleType,
      label: 'Beranda',
      icon: LayoutDashboard,
      requiredPermission: 'view_dashboard',
    },
    {
      id: 'leave' as ModuleType,
      label: 'Cuti',
      icon: CalendarDays,
      requiredPermission: 'view_leave',
    },
    {
      id: 'reimbursement' as ModuleType,
      label: 'Klaim',
      icon: ReceiptText,
      requiredPermission: 'view_reimbursement',
    },
    {
      id: 'approval' as ModuleType,
      label: 'Approval',
      icon: ClipboardCheck,
      requiredPermission: 'view_approval',
      badgeCount: totalPending,
    },
  ];

  const permittedItems = navItems.filter((item) =>
    hasUserPermission(item.requiredPermission)
  );

  return (
    <nav
      aria-label="Navigasi Bawah Mobile"
      className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {permittedItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-w-[56px] ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-[1.04]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white shadow-xs animate-pulse">
                    {item.badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-0.5" />
              )}
            </button>
          );
        })}

        {/* More Menu Drawer Trigger */}
        <button
          onClick={onOpenMobileMenu}
          className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all min-w-[56px]"
          aria-label="Buka Menu Lengkap"
        >
          <Menu className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">Menu</span>
        </button>
      </div>
    </nav>
  );
};

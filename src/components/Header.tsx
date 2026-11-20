import React, { useState } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  Shield,
  UserCheck,
  X,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  Sun,
  Moon,
  Download,
  LogOut,
} from 'lucide-react';
import { GlobalNotificationSystem } from './GlobalNotificationSystem.tsx';
import { CentralizedActionsMenu } from './CentralizedActionsMenu.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { OfflineStatusPill } from './OfflineStatusIndicator.tsx';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onNavigate: (module: any) => void;
  onOpenLeaveModal?: () => void;
  onOpenReimbursementModal?: () => void;
  onOpenNewEmployeeModal?: () => void;
  onOpenNewRoleModal?: () => void;
  onOpenExportModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onNavigate,
  onOpenLeaveModal,
  onOpenReimbursementModal,
  onOpenNewEmployeeModal,
  onOpenNewRoleModal,
  onOpenExportModal,
}) => {
  const {
    currentUser,
    users,
    roles,
    switchUserById,
    notifications,
    markAllNotificationsRead,
    markNotificationAsRead,
    resetAllData,
    hasUserPermission,
    logout,
  } = useHRIS();

  const { isDark, toggleTheme } = useTheme();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  const currentRole = roles.find((r) => r.id === currentUser.roleId);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const canExport =
    hasUserPermission('create_reports') ||
    hasUserPermission('view_reports') ||
    hasUserPermission('create_audit_logs') ||
    hasUserPermission('view_audit_logs');

  const displayedNotifications = filterUnreadOnly
    ? notifications.filter((n) => !n.read)
    : notifications;

  const handleSelectUser = (userId: string) => {
    switchUserById(userId);
    setShowUserDropdown(false);
  };

  const getRoleBadgeColor = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'blue':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'indigo':
        return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
      case 'violet':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left: Mobile hamburger & Brand */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              aria-label="Buka Menu Navigasi"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200 dark:shadow-none shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white truncate">
                    Nexa<span className="text-indigo-600 dark:text-indigo-400">HR</span>
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 shrink-0">
                    ENTERPRISE RBAC
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden md:block truncate">
                  Sistem Informasi SDM &amp; Otorisasi Terpadu
                </p>
              </div>
            </div>
          </div>

          {/* Right: Socket.io Live Tracker, Theme Toggle, Persona Switcher, Notifications, Quick Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Offline Sync Status & Storage Pill */}
            <OfflineStatusPill className="hidden md:inline-flex" />

            {/* PWA In-App Install Prompt */}
            <PWAInstallButton className="hidden sm:inline-flex" />

            {/* Global Real-Time Notification & Approval Socket Tracker */}
            <GlobalNotificationSystem onNavigate={onNavigate} />

            {/* Centralized 'Actions' Dropdown Menu */}
            <CentralizedActionsMenu
              mode="header"
              onOpenLeaveModal={onOpenLeaveModal || (() => {})}
              onOpenReimbursementModal={onOpenReimbursementModal || (() => {})}
              onNavigate={onNavigate}
              onOpenNewEmployeeModal={onOpenNewEmployeeModal}
              onOpenNewRoleModal={onOpenNewRoleModal}
              onOpenExportModal={onOpenExportModal}
            />

            {/* Global Export Data Trigger Button for Authorized Users */}
            {canExport && onOpenExportModal && (
              <button
                onClick={onOpenExportModal}
                className="hidden md:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
                title="Buka Pusat Ekspor Data Resmi (Laporan & Audit Logs)"
                aria-label="Ekspor Data"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Ekspor Data</span>
              </button>
            )}

            {/* Global Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 shadow-2xs cursor-pointer"
              aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
              title={isDark ? 'Aktifkan Mode Terang (Light Mode)' : 'Aktifkan Mode Gelap (Dark Mode)'}
            >
              {isDark ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 transition-transform duration-200 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-300 transition-transform duration-200 hover:-rotate-12" />
              )}
            </button>

            {/* Quick Persona Switcher Button */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-1.5 p-1 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-left bg-white dark:bg-slate-800/90 shadow-2xs"
                title="Ganti Persona Pengguna untuk Uji Coba RBAC"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-indigo-500/20 shrink-0"
                />
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                    {currentUser.name.split(',')[0]}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${getRoleBadgeColor(
                      currentRole?.color
                    )}`}
                  >
                    {currentRole?.name || 'Staff'}
                  </span>
                </div>
                <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Persona Switcher Dropdown */}
              {showUserDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1.5 mb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Simulasi Role &amp; User (RBAC Tester)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Pilih akun untuk menguji perbedaan hak akses seketika.
                        </p>
                      </div>
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/60">
                        6 Akun Siap
                      </span>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-1 py-1">
                      {users.map((u) => {
                        const r = roles.find((role) => role.id === u.roleId);
                        const isCurrent = u.id === currentUser.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => handleSelectUser(u.id)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                              isCurrent
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                            }`}
                          >
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {u.name}
                                </span>
                                <span
                                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase ${getRoleBadgeColor(
                                    r?.color
                                  )}`}
                                >
                                  {r?.name}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {u.position} &bull; {u.employeeNumber}
                              </p>
                            </div>
                            {isCurrent && (
                              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Dynamic Matrix Live Active
                        </span>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                'Kembalikan seluruh data dan izin RBAC ke bawaan awal?'
                              )
                            ) {
                              resetAllData();
                              setShowUserDropdown(false);
                            }
                          }}
                          className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reset Data
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          logout();
                          setShowUserDropdown(false);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/80 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                        title="Keluar dari akun dan kembali ke Halaman Login"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar Akun (Logout)</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90"
                aria-label="Lihat Notifikasi"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] sm:text-[10px] font-bold text-white shadow-xs animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer / Dropdown */}
              {showNotifDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1.5 mb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Notifikasi Sistem
                        </h4>
                        {unreadCount > 0 && (
                          <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 font-bold px-2 py-0.5 rounded-full">
                            {unreadCount} Baru
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                            filterUnreadOnly
                              ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 font-bold'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {filterUnreadOnly ? 'Tampilkan Semua' : 'Hanya Belum Dibaca'}
                        </button>
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                          title="Tandai semua telah dibaca"
                        >
                          Tandai Baca
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 py-1">
                      {displayedNotifications.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                          <p className="text-xs font-medium">
                            Tidak ada notifikasi baru saat ini.
                          </p>
                        </div>
                      ) : (
                        displayedNotifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              if (n.targetModule) {
                                onNavigate(n.targetModule);
                                setShowNotifDropdown(false);
                              }
                            }}
                            className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                              !n.read
                                ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-200/70 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {n.title}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Baru saja
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                              {n.message}
                            </p>
                            {n.targetModule && (
                              <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                                Buka Modul
                                <ExternalLink className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

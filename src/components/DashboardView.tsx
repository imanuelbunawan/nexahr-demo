import React, { useState, useMemo, useEffect } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { ModuleType, LeaveRequest, Reimbursement } from '../types/index.ts';
import { formatRupiah } from '../utils/rbac.ts';
import {
  inferHierarchyLevel,
  HIERARCHY_LEVELS,
  HIERARCHY_LEVEL_ORDER,
} from '../utils/hierarchyUtils.ts';
import {
  CalendarDays,
  ReceiptText,
  ClipboardCheck,
  Users,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Building,
  Briefcase,
  Layers,
  Filter,
  UserCheck,
  CreditCard,
} from 'lucide-react';
import { DashboardChartsSection } from './DashboardChartsSection.tsx';
import { TeamCalendarView } from './TeamCalendarView.tsx';

interface DashboardViewProps {
  onNavigate: (module: ModuleType) => void;
  onOpenLeaveModal: () => void;
  onOpenReimbursementModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenLeaveModal,
  onOpenReimbursementModal,
}) => {
  const {
    currentUser,
    roles,
    users,
    departments,
    leaveBalances,
    leaveRequests,
    reimbursements,
    attendances,
    payrolls,
    hasUserPermission,
    rolePermissions,
  } = useHRIS();

  const currentRole = roles.find((r) => r.id === currentUser.roleId);
  const currentDept = departments.find((d) => d.id === currentUser.departmentId);
  const userHierarchyId = inferHierarchyLevel(currentUser);
  const userHierarchyConfig = HIERARCHY_LEVELS[userHierarchyId];
  const myBalance = leaveBalances.find((b) => b.userId === currentUser.id);

  const isManagerOrAdmin =
    hasUserPermission('approve_approval') ||
    hasUserPermission('view_approval') ||
    currentUser.roleId === 'role_owner' ||
    currentUser.roleId === 'role_hrd' ||
    currentUser.roleId === 'role_manager';

  // Scope filter: 'dept' (Sesuai Divisi Saya) vs 'my' (Pengajuan Saya) vs 'all' (Seluruh Divisi)
  const [pipelineScope, setPipelineScope] = useState<'dept' | 'my' | 'all'>(
    isManagerOrAdmin ? 'dept' : 'my'
  );
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(
    currentUser.departmentId || 'all'
  );
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');

  useEffect(() => {
    setPipelineScope(isManagerOrAdmin ? 'dept' : 'my');
    setSelectedDeptFilter(currentUser.departmentId || 'all');
    setSelectedLevelFilter('all');
  }, [currentUser.id, currentUser.departmentId, isManagerOrAdmin]);

  // Maps for fast lookups
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  // Combined pipeline items (Leaves + Reimbursements)
  type PipelineItem =
    | { kind: 'leave'; data: LeaveRequest; createdAt: string }
    | { kind: 'reimb'; data: Reimbursement; createdAt: string };

  const filteredPipelineItems = useMemo(() => {
    const list: PipelineItem[] = [
      ...leaveRequests.map((l) => ({ kind: 'leave' as const, data: l, createdAt: l.createdAt })),
      ...reimbursements.map((r) => ({ kind: 'reimb' as const, data: r, createdAt: r.createdAt })),
    ];

    return list.filter((item) => {
      const applicantId = item.kind === 'leave' ? item.data.userId : item.data.userId;
      const applicant = userMap.get(applicantId);
      if (!applicant) return false;

      // Filter by Scope
      if (pipelineScope === 'my') {
        if (applicantId !== currentUser.id) return false;
      } else if (pipelineScope === 'dept') {
        if (applicant.departmentId !== currentUser.departmentId) return false;
      } else if (pipelineScope === 'all') {
        if (selectedDeptFilter !== 'all' && applicant.departmentId !== selectedDeptFilter) {
          return false;
        }
      }

      // Filter by Level / Jabatan
      if (selectedLevelFilter !== 'all') {
        const lvl = inferHierarchyLevel(applicant);
        if (lvl !== selectedLevelFilter) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [
    leaveRequests,
    reimbursements,
    pipelineScope,
    selectedDeptFilter,
    selectedLevelFilter,
    userMap,
    currentUser,
  ]);

  const pendingLeavesCount = leaveRequests.filter(
    (l) => l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HRD'
  ).length;

  const totalReimbAmount = reimbursements
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + r.amount, 0);

  // Active permissions for this role
  const permissionsList = rolePermissions[currentUser.roleId] || [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/30">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Sistem Enterprise HRIS Terpadu &bull; Otorisasi Aktif
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Selamat Datang, {currentUser.name}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Anda terautentikasi sebagai{' '}
              <span className="font-bold text-white underline decoration-indigo-400">
                {currentRole?.label || currentRole?.name}
              </span>{' '}
              pada divisi{' '}
              <span className="text-indigo-200 font-bold">{currentDept?.name || 'Umum'} ({currentDept?.code || 'DIV'})</span>{' '}
              dengan jabatan{' '}
              <span className="text-indigo-200 font-bold">{currentUser.position}</span>.
              Hak akses Anda dikendalikan dinamis melalui Dynamic RBAC Matrix.
            </p>
          </div>

          {/* Streamlined Action Trigger */}
          <div className="flex items-center gap-2.5 shrink-0">
            {hasUserPermission('create_leave') && (
              <button
                onClick={onOpenLeaveModal}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Aksi Cepat Pengajuan Cuti"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Ajukan Cuti</span>
              </button>
            )}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-xs text-indigo-200 border border-white/5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Aksi lengkap di Header</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid (6 Essential Enterprise HRIS Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Kuota Cuti Saya */}
        <div
          onClick={() => hasUserPermission('view_leave') && onNavigate('leave')}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all ${
            hasUserPermission('view_leave') ? 'hover:border-indigo-300 cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sisa Kuota Cuti Anda
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {myBalance?.remainingQuota ?? 12}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hari Kerja</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Terpakai: {myBalance?.usedQuota ?? 0} hari</span>
            <span>Total: {myBalance?.annualQuota ?? 12} hari</span>
          </div>
        </div>

        {/* Card 2: Antrean Approval */}
        <div
          onClick={() => hasUserPermission('view_approval') && onNavigate('approval')}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all ${
            hasUserPermission('view_approval') ? 'hover:border-amber-300 cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Menunggu Approval
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {pendingLeavesCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Permohonan Antre
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Tahap Manajer &amp; HRD</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Aktif</span>
          </div>
        </div>

        {/* Card 3: Presensi Kehadiran Hari Ini */}
        <div
          onClick={() => hasUserPermission('view_attendance') && onNavigate('attendance')}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all ${
            hasUserPermission('view_attendance') ? 'hover:border-purple-300 cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Presensi Hari Ini
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
              {attendances.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Karyawan Hadir
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>
              {attendances.some((a) => a.userId === currentUser.id)
                ? '✓ Anda Sudah Check-in'
                : '⚠ Belum Check-in'}
            </span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Shift Normal</span>
          </div>
        </div>

        {/* Card 4: Penggajian & Slip Gaji */}
        <div
          onClick={() => hasUserPermission('view_payroll') && onNavigate('payroll')}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all ${
            hasUserPermission('view_payroll') ? 'hover:border-indigo-300 cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Status Payroll
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-400 truncate">
              {payrolls.length > 0 ? `${payrolls.length} Slip` : '0 Slip'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              November 2026
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Transfer Bank Payroll</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Tersalurkan</span>
          </div>
        </div>

        {/* Card 5: Total SDM Perusahaan */}
        <div
          onClick={() => hasUserPermission('view_employees') && onNavigate('employees')}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all ${
            hasUserPermission('view_employees') ? 'hover:border-emerald-300 cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total SDM Perusahaan
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {users.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Karyawan Aktif
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>5 Divisi Utama</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Organisasi</span>
          </div>
        </div>

        {/* Card 6: Klaim Reimbursement Tersalur */}
        <div
          onClick={() => hasUserPermission('view_reimbursement') && onNavigate('reimbursement')}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all ${
            hasUserPermission('view_reimbursement') ? 'hover:border-teal-300 cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Reimbursement Disetujui
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-teal-700 dark:text-teal-400 truncate">
              {formatRupiah(totalReimbAmount)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Klaim operasional valid</span>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">Terverifikasi</span>
          </div>
        </div>
      </div>

      {/* Quick Summary Statistics & Visual Charts Dashboard */}
      <DashboardChartsSection />

      {/* Team Calendar & Workforce Planning Monthly Grid */}
      <TeamCalendarView onNavigate={onNavigate} onOpenLeaveModal={onOpenLeaveModal} />

      {/* Middle Row: Active Submissions Pipeline & RBAC Security Overview (Sesuai Divisi & Jabatan) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Submissions Pipeline & Stepper (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                <Building className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>Divisi {currentDept?.code || 'DIV'} &bull; Jabatan: {currentUser.position}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Pipeline Tracking Pengajuan Sesuai Divisi &amp; Jabatan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pantau langsung alur persetujuan berkas cuti &amp; klaim yang relevan dengan kewenangan divisi Anda.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => onNavigate('approval')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Meja Approval <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Scope Filter Tabs: Sesuai Divisi vs Pengajuan Saya vs Semua */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPipelineScope('dept')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pipelineScope === 'dept'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Divisi Saya ({currentDept?.code || 'DIV'})
              </button>

              <button
                type="button"
                onClick={() => setPipelineScope('my')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pipelineScope === 'my'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Pengajuan Saya
              </button>

              {isManagerOrAdmin && (
                <button
                  type="button"
                  onClick={() => setPipelineScope('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pipelineScope === 'all'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Semua Divisi
                </button>
              )}
            </div>

            {/* Quick Filter: Tingkat / Jabatan */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tingkat:</span>
              <select
                value={selectedLevelFilter}
                onChange={(e) => setSelectedLevelFilter(e.target.value)}
                className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-hidden"
              >
                <option value="all">Semua Jabatan</option>
                {HIERARCHY_LEVEL_ORDER.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    L{HIERARCHY_LEVELS[lvl].order} - {HIERARCHY_LEVELS[lvl].name.split('(')[0].trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List of Filtered Pipeline Items */}
          {filteredPipelineItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Tidak ada pengajuan aktif pada divisi atau kriteria ini.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Seluruh pengajuan cuti &amp; klaim divisi telah selesai diproses atau belum diajukan.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredPipelineItems.slice(0, 4).map((item) => {
                const isLeave = item.kind === 'leave';
                const leave = isLeave ? (item.data as LeaveRequest) : null;
                const reimb = !isLeave ? (item.data as Reimbursement) : null;
                const applicantId = isLeave ? leave!.userId : reimb!.userId;
                const applicant = userMap.get(applicantId);
                const applicantDept = deptMap.get(applicant?.departmentId || '');
                const applicantLvl = applicant ? inferHierarchyLevel(applicant) : 'staff';
                const lvlConfig = HIERARCHY_LEVELS[applicantLvl];

                const status = isLeave ? leave!.status : reimb!.status;
                const isPendingManager = status === 'PENDING_MANAGER';
                const isPendingTier2 = status === 'PENDING_HRD' || status === 'PENDING_FINANCE';
                const isApproved = status === 'APPROVED';
                const isRejected = status === 'REJECTED';

                return (
                  <div
                    key={isLeave ? `l-${leave!.id}` : `r-${reimb!.id}`}
                    className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xs transition-all space-y-3"
                  >
                    {/* Top Row: Applicant Profile, Division & Position Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={applicant?.avatar}
                          alt={applicant?.name}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700 shadow-2xs"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {applicant?.name}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {applicantDept?.code || 'DIV'}
                            </span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${lvlConfig.badgeColor}`}>
                              L{lvlConfig.order}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {applicant?.position} &bull; {applicantDept?.name}
                          </div>
                        </div>
                      </div>

                      {/* Request Type & Status Badges */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                          {isLeave
                            ? `${leave!.leaveType} (${leave!.totalDays} Hari)`
                            : `${reimb!.category}: ${formatRupiah(reimb!.amount)}`}
                        </span>

                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            isApproved
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                              : isRejected
                              ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200'
                              : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 animate-pulse'
                          }`}
                        >
                          {isApproved
                            ? 'Disetujui'
                            : isRejected
                            ? 'Ditolak'
                            : isPendingManager
                            ? 'Review Manajer Divisi'
                            : isLeave
                            ? 'Review HRD Final'
                            : 'Review Finance Final'}
                        </span>
                      </div>
                    </div>

                    {/* Stepper / Multi-Level Approval Pipeline */}
                    <div className="pt-1">
                      <div className="grid grid-cols-3 gap-2 relative">
                        <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-slate-200 dark:bg-slate-700 -z-0" />

                        {/* Step 1: Pengajuan Karyawan */}
                        <div className="flex flex-col items-center text-center relative z-10">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                            ✓
                          </div>
                          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1">
                            Diajukan
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {applicant?.name ? applicant.name.split(',')[0] : 'Karyawan'}
                          </span>
                        </div>

                        {/* Step 2: Manajer Divisi */}
                        <div className="flex flex-col items-center text-center relative z-10">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs ${
                              isApproved || isPendingTier2
                                ? 'bg-emerald-600 text-white'
                                : isPendingManager
                                ? 'bg-amber-500 text-white ring-2 ring-amber-200'
                                : isRejected
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            }`}
                          >
                            {isApproved || isPendingTier2 ? '✓' : isPendingManager ? '⏳' : isRejected ? '✕' : '2'}
                          </div>
                          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1">
                            Tier 1: Manajer ({applicantDept?.code || 'DIV'})
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {isPendingManager ? 'Sedang Review' : isApproved || isPendingTier2 ? 'Disetujui' : 'Pending'}
                          </span>
                        </div>

                        {/* Step 3: HRD / Finance Final */}
                        <div className="flex flex-col items-center text-center relative z-10">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs ${
                              isApproved
                                ? 'bg-emerald-600 text-white'
                                : isPendingTier2
                                ? 'bg-amber-500 text-white ring-2 ring-amber-200'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            }`}
                          >
                            {isApproved ? '✓' : isPendingTier2 ? '⏳' : '3'}
                          </div>
                          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1">
                            Tier 2: {isLeave ? 'HRD Final' : 'Finance Final'}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {isApproved ? 'Disetujui Penuh' : isPendingTier2 ? 'Sedang Ditinjau' : 'Menunggu'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Note and Action Button */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        Alasan: <strong className="text-slate-700 dark:text-slate-300">{isLeave ? leave!.reason : reimb!.description}</strong>
                      </span>

                      {hasUserPermission('approve_approval') && (isPendingManager || isPendingTier2) && (
                        <button
                          type="button"
                          onClick={() => onNavigate('approval')}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer shrink-0"
                        >
                          Review di Meja Approval &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RBAC Security, Division & Position Overview (1 Col) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Otorisasi Divisi &amp; Jabatan
            </h2>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase">
              {currentRole?.name}
            </span>
          </div>

          {/* User Divisi & Jabatan Profile Cards */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 block">
                  Divisi Kerja Resmi:
                </span>
                <strong className="text-slate-900 dark:text-white font-bold truncate block">
                  {currentDept?.name} ({currentDept?.code})
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
              <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-purple-500 dark:text-purple-400 block">
                  Jabatan &amp; Tingkat:
                </span>
                <strong className="text-slate-900 dark:text-white font-bold truncate block">
                  {currentUser.position}
                </strong>
                <span className={`inline-block mt-0.5 text-[9px] font-extrabold px-2 py-0.2 rounded-full border ${userHierarchyConfig.badgeColor}`}>
                  L{userHierarchyConfig.order}: {userHierarchyConfig.name}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Hak akses dan wewenang approval pengajuan Anda dikalkulasi secara otomatis berdasarkan kombinasi Divisi, Jabatan, dan Dynamic RBAC Matrix:
          </p>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="font-medium text-slate-700 dark:text-slate-300">Total Izin Diberikan</span>
              <span className="font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                {permissionsList.length} Hak Akses
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="font-medium text-slate-700 dark:text-slate-300">Wewenang Approval</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md ${
                  hasUserPermission('approve_approval')
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950'
                    : 'text-slate-500 bg-slate-200/60'
                }`}
              >
                {hasUserPermission('approve_approval')
                  ? currentUser.roleId === 'role_owner'
                    ? 'Super Admin (Semua Divisi)'
                    : `Manajer Divisi (${currentDept?.code})`
                  : 'Pengajuan Mandiri'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="font-medium text-slate-700 dark:text-slate-300">Level Hierarki Organisasi</span>
              <span className="font-bold px-2 py-0.5 rounded-md text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950">
                Tingkat {userHierarchyConfig.order}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {hasUserPermission('view_roles') && (
              <button
                type="button"
                onClick={() => onNavigate('roles')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Buka Permission Matrix (RBAC)</span>
              </button>
            )}

            {hasUserPermission('view_employees') && (
              <button
                type="button"
                onClick={() => onNavigate('employees')}
                className="w-full py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Buka Bagan Hierarki &amp; Org Chart</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

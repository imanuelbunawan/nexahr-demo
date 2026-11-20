import React, { useState } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { LeaveRequest, Reimbursement } from '../types/index.ts';
import { formatRupiah } from '../utils/rbac.ts';
import {
  ClipboardCheck,
  CalendarDays,
  ReceiptText,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  FileCheck,
  Clock,
  Search,
  Filter,
  UserCheck,
  X,
  MessageSquare,
} from 'lucide-react';

export const ApprovalDeskView: React.FC = () => {
  const {
    currentUser,
    users,
    departments,
    roles,
    leaveRequests,
    reimbursements,
    overtimeRequests,
    approveLeave,
    rejectLeave,
    approveReimbursement,
    rejectReimbursement,
    approveOvertime,
    rejectOvertime,
    hasUserPermission,
  } = useHRIS();

  const [activeTab, setActiveTab] = useState<'pending' | 'leaves' | 'reimbursements' | 'overtime' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item for review modal
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [selectedReimb, setSelectedReimb] = useState<Reimbursement | null>(null);

  // Review action modal state
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [actionTarget, setActionTarget] = useState<{
    type: 'leave' | 'reimbursement';
    id: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canApprove = hasUserPermission('approve_approval');

  // Hierarchy and role scoping
  const isOwner = currentUser.roleId === 'role_owner';
  const isHRD = currentUser.roleId === 'role_hrd';
  const isFinance = currentUser.roleId === 'role_finance';
  const isDeptManager = currentUser.roleId === 'role_manager';

  // Visible requests based on corporate hierarchy
  const scopedLeaveRequests = leaveRequests.filter((l) => {
    if (isOwner || isHRD) return true;
    if (isDeptManager) {
      const applicant = users.find((u) => u.id === l.userId);
      return (applicant && applicant.departmentId === currentUser.departmentId) || l.userId === currentUser.id;
    }
    return l.userId === currentUser.id;
  });

  const scopedReimbursements = reimbursements.filter((r) => {
    if (isOwner || isFinance || isHRD) return true;
    if (isDeptManager) {
      const applicant = users.find((u) => u.id === r.userId);
      return (applicant && applicant.departmentId === currentUser.departmentId) || r.userId === currentUser.id;
    }
    return r.userId === currentUser.id;
  });

  const scopedOvertimeRequests = overtimeRequests.filter((ot) => {
    if (isOwner || isHRD) return true;
    if (isDeptManager) {
      const applicant = users.find((u) => u.id === ot.userId);
      return (applicant && applicant.departmentId === currentUser.departmentId) || ot.userId === currentUser.id;
    }
    return ot.userId === currentUser.id;
  });

  // Actionable pending items strictly scoped to reviewer authority
  const pendingLeaves = scopedLeaveRequests.filter((l) => {
    if (l.status !== 'PENDING_MANAGER' && l.status !== 'PENDING_HRD') return false;
    if (isOwner) return true;
    if (isHRD) return l.status === 'PENDING_HRD';
    if (isDeptManager) return l.status === 'PENDING_MANAGER';
    return false;
  });

  const pendingReimbursements = scopedReimbursements.filter((r) => {
    if (r.status !== 'PENDING_MANAGER' && r.status !== 'PENDING_FINANCE') return false;
    if (isOwner) return true;
    if (isFinance) return r.status === 'PENDING_FINANCE';
    if (isDeptManager) return r.status === 'PENDING_MANAGER';
    return false;
  });

  const pendingOvertime = scopedOvertimeRequests.filter((ot) => {
    if (ot.status !== 'PENDING_MANAGER') return false;
    if (isOwner || isHRD || isDeptManager) return true;
    return false;
  });

  const handleOpenActionModal = (
    type: 'leave' | 'reimbursement',
    id: string,
    action: 'APPROVE' | 'REJECT'
  ) => {
    setActionTarget({ type, id });
    setActionType(action);
    setReviewNote(action === 'APPROVE' ? 'Disetujui sesuai SOP dan anggaran.' : '');
    setActionError(null);
  };

  const handleConfirmAction = () => {
    if (!actionTarget || !actionType) return;

    if (actionType === 'REJECT' && !reviewNote.trim()) {
      setActionError('Alasan penolakan wajib diisi untuk audit log.');
      return;
    }

    if (actionTarget.type === 'leave') {
      if (actionType === 'APPROVE') {
        approveLeave(actionTarget.id, reviewNote.trim());
      } else {
        rejectLeave(actionTarget.id, reviewNote.trim());
      }
    } else {
      if (actionType === 'APPROVE') {
        approveReimbursement(actionTarget.id, reviewNote.trim());
      } else {
        rejectReimbursement(actionTarget.id, reviewNote.trim());
      }
    }

    // Reset modals
    setActionTarget(null);
    setActionType(null);
    setSelectedLeave(null);
    setSelectedReimb(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-indigo-600" />
            Meja Persetujuan (Approval Desk)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Pusat verifikasi berjenjang pengajuan cuti dan klaim keuangan karyawan.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
          <UserCheck className="w-4 h-4" />
          Status Peninjau:{' '}
          <span className="font-extrabold underline">
            {canApprove ? 'Wewenang Eksekusi Aktif' : 'Hanya Pantau (Read-Only)'}
          </span>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex overflow-x-auto no-scrollbar items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-white text-amber-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Semua Menunggu</span>
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">
              {pendingLeaves.length + pendingReimbursements.length + pendingOvertime.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'leaves'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Permohonan Cuti</span>
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] flex items-center justify-center font-bold">
              {pendingLeaves.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reimbursements')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'reimbursements'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Reimbursement</span>
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-bold">
              {pendingReimbursements.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('overtime')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'overtime'
                ? 'bg-white text-purple-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Lembur (Overtime)</span>
            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[10px] flex items-center justify-center font-bold">
              {pendingOvertime.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Riwayat Selesai
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama karyawan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Approval Grid/Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Leave Approval Queue */}
        {(activeTab === 'pending' || activeTab === 'leaves' || activeTab === 'history') && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                Antrean Permohonan Cuti
              </h2>
              <span className="text-xs text-slate-400">
                {activeTab === 'history' ? 'Riwayat' : 'Menunggu Tindakan'}
              </span>
            </div>

            <div className="space-y-3">
              {(activeTab === 'history'
                ? scopedLeaveRequests.filter((l) => l.status === 'APPROVED' || l.status === 'REJECTED')
                : pendingLeaves
              ).length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">
                    Tidak ada antrean cuti pada kategori ini.
                  </p>
                </div>
              ) : (
                (activeTab === 'history'
                  ? scopedLeaveRequests.filter((l) => l.status === 'APPROVED' || l.status === 'REJECTED')
                  : pendingLeaves
                ).map((req) => {
                  const applicant = users.find((u) => u.id === req.userId);
                  const dept = departments.find((d) => d.id === applicant?.departmentId);

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/60 hover:bg-white transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={applicant?.avatar}
                            alt={applicant?.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {applicant?.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {dept?.name} &bull; NIP: {applicant?.employeeNumber}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            req.status === 'PENDING_MANAGER'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : req.status === 'PENDING_HRD'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : req.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {req.status === 'PENDING_MANAGER'
                            ? 'Tahap 1: Manajer'
                            : req.status === 'PENDING_HRD'
                            ? 'Tahap 2: HRD Final'
                            : req.status}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200/60 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">Jenis Cuti:</span>
                          <span className="font-bold text-indigo-700">
                            {req.leaveType}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">Rentang Tanggal:</span>
                          <span className="text-slate-800">
                            {req.startDate} s/d {req.endDate} ({req.totalDays} hari)
                          </span>
                        </div>
                        <div className="text-slate-600 pt-1 text-[11px] border-t border-slate-100">
                          <span className="font-medium">Alasan:</span> "{req.reason}"
                        </div>
                      </div>

                      {/* Action buttons */}
                      {req.status.startsWith('PENDING') && canApprove && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() =>
                              handleOpenActionModal('leave', req.id, 'REJECT')
                            }
                            className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Tolak
                          </button>
                          <button
                            onClick={() =>
                              handleOpenActionModal('leave', req.id, 'APPROVE')
                            }
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Setujui
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right Column: Reimbursement Approval Queue */}
        {(activeTab === 'pending' || activeTab === 'reimbursements' || activeTab === 'history') && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-emerald-600" />
                Antrean Klaim Reimbursement
              </h2>
              <span className="text-xs text-slate-400">
                Verifikasi Pengeluaran
              </span>
            </div>

            <div className="space-y-3">
              {(activeTab === 'history'
                ? scopedReimbursements.filter((r) => r.status === 'APPROVED' || r.status === 'REJECTED')
                : pendingReimbursements
              ).length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">
                    Tidak ada antrean reimbursement pada kategori ini.
                  </p>
                </div>
              ) : (
                (activeTab === 'history'
                  ? scopedReimbursements.filter((r) => r.status === 'APPROVED' || r.status === 'REJECTED')
                  : pendingReimbursements
                ).map((reimb) => {
                  const applicant = users.find((u) => u.id === reimb.userId);
                  const dept = departments.find((d) => d.id === applicant?.departmentId);

                  return (
                    <div
                      key={reimb.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 bg-slate-50/60 hover:bg-white transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={applicant?.avatar}
                            alt={applicant?.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {applicant?.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {dept?.name} &bull; {reimb.invoiceNumber}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            reimb.status === 'PENDING_MANAGER'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : reimb.status === 'PENDING_FINANCE'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : reimb.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {reimb.status === 'PENDING_MANAGER'
                            ? 'Tahap 1: Manajer'
                            : reimb.status === 'PENDING_FINANCE'
                            ? 'Tahap 2: Finance'
                            : reimb.status}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200/60 text-xs space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-slate-900">
                            {reimb.title}
                          </span>
                          <span className="font-extrabold text-emerald-700 text-sm">
                            {formatRupiah(reimb.amount)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{reimb.category}</span>
                          <a
                            href={reimb.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <Eye className="w-3 h-3" />
                            Cek Bukti Nota
                          </a>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {reimb.status.startsWith('PENDING') && canApprove && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() =>
                              handleOpenActionModal('reimbursement', reimb.id, 'REJECT')
                            }
                            className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Tolak
                          </button>
                          <button
                            onClick={() =>
                              handleOpenActionModal('reimbursement', reimb.id, 'APPROVE')
                            }
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Setujui Klaim
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Third Column: Overtime Approval Queue */}
        {(activeTab === 'pending' || activeTab === 'overtime' || activeTab === 'history') && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                Antrean Permohonan Lembur (Overtime)
              </h2>
              <span className="text-xs text-slate-400">
                {activeTab === 'history' ? 'Riwayat' : 'Menunggu Persetujuan Manajer'}
              </span>
            </div>

            <div className="space-y-3">
              {(activeTab === 'history'
                ? scopedOvertimeRequests.filter((ot) => ot.status === 'APPROVED' || ot.status === 'REJECTED')
                : pendingOvertime
              ).length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">
                    Tidak ada antrean lembur pada kategori ini.
                  </p>
                </div>
              ) : (
                (activeTab === 'history'
                  ? scopedOvertimeRequests.filter((ot) => ot.status === 'APPROVED' || ot.status === 'REJECTED')
                  : pendingOvertime
                ).map((ot) => {
                  const applicant = users.find((u) => u.id === ot.userId);
                  const dept = departments.find((d) => d.id === applicant?.departmentId);

                  return (
                    <div
                      key={ot.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 bg-slate-50/60 hover:bg-white transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={applicant?.avatar}
                            alt={applicant?.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {applicant?.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {dept?.name} &bull; {ot.date}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            ot.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : ot.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {ot.status === 'APPROVED'
                            ? 'Disetujui'
                            : ot.status === 'REJECTED'
                            ? 'Ditolak'
                            : 'Pending Manajer'}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200/60 text-xs space-y-1.5">
                        <div className="flex justify-between items-baseline font-bold text-slate-900">
                          <span>Waktu: {ot.startTime} - {ot.endTime} WIB</span>
                          <span className="text-purple-700">{ot.durationHours} Jam</span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {ot.tasksDescription}
                        </p>
                      </div>

                      {ot.status === 'PENDING_MANAGER' && canApprove && (
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => {
                              const reason = window.prompt('Alasan penolakan permohonan lembur:');
                              if (reason && reason.trim()) {
                                rejectOvertime(ot.id, reason.trim());
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Tolak
                          </button>
                          <button
                            onClick={() => approveOvertime(ot.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Setujui Lembur
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Approval / Rejection Note Modal (Mandatory Note on Reject!) */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`p-4 text-white flex items-center justify-between ${
                actionType === 'APPROVE'
                  ? 'bg-emerald-700'
                  : 'bg-rose-700'
              }`}
            >
              <h3 className="font-bold text-sm flex items-center gap-2">
                {actionType === 'APPROVE' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Konfirmasi Persetujuan Pengajuan
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    Konfirmasi Penolakan Pengajuan (Wajib Alasan)
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setActionTarget(null);
                  setActionType(null);
                }}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                {actionType === 'APPROVE'
                  ? 'Tindakan ini akan memajukan pengajuan ke tahap berikutnya atau menyelesaikan persetujuan final secara otomatis.'
                  : 'Sesuai SOP perusahaan, penolakan memerlukan catatan keterangan yang jelas agar pemohon dapat mengetahuinya.'}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Catatan Atasan / Reviewer{' '}
                  {actionType === 'REJECT' && (
                    <span className="text-rose-600 font-extrabold">*Wajib</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  required={actionType === 'REJECT'}
                  placeholder={
                    actionType === 'REJECT'
                      ? 'Misal: Jadwal bertabrakan dengan deployment rilis Q4 / Nota belum memenuhi syarat faktur pajak...'
                      : 'Catatan opsional persetujuan...'
                  }
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setActionTarget(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  {actionType === 'APPROVE'
                    ? 'Eksekusi Persetujuan'
                    : 'Eksekusi Penolakan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

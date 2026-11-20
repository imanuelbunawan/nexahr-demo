import React, { useState } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { LeaveRequest, LeaveType } from '../types/index.ts';
import { calculateWorkingDays, validateLeaveRequest } from '../utils/rbac.ts';
import { OfficialLeaveLetterModal } from './OfficialLeaveLetterModal.tsx';
import {
  CalendarDays,
  PlusCircle,
  FileText,
  Printer,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  Filter,
  ChevronRight,
  Info,
} from 'lucide-react';

interface LeaveViewProps {
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
}

export const LeaveView: React.FC<LeaveViewProps> = ({
  isModalOpen,
  onCloseModal,
  onOpenModal,
}) => {
  const {
    currentUser,
    users,
    roles,
    departments,
    leaveBalances,
    leaveRequests,
    submitLeaveRequest,
    deleteLeave,
    hasUserPermission,
  } = useHRIS();

  const myBalance = leaveBalances.find((b) => b.userId === currentUser.id);

  // Form states
  const [leaveType, setLeaveType] = useState<LeaveType>('Cuti Tahunan');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Filter states
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'pending' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected request for Letter printing or detailed Stepper view
  const [selectedForLetter, setSelectedForLetter] = useState<LeaveRequest | null>(null);
  const [detailModalRequest, setDetailModalRequest] = useState<LeaveRequest | null>(null);

  // Calculated days
  const calculatedDays =
    startDate && endDate ? calculateWorkingDays(startDate, endDate) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateLeaveRequest(
      startDate,
      endDate,
      calculatedDays,
      myBalance?.remainingQuota ?? 0,
      leaveType === 'Cuti Tahunan'
    );

    if (!validation.valid) {
      setFormError(validation.error || 'Terjadi kesalahan input.');
      return;
    }

    if (!reason.trim()) {
      setFormError('Alasan permohonan cuti wajib diisi.');
      return;
    }

    const res = submitLeaveRequest({
      leaveType,
      startDate,
      endDate,
      totalDays: calculatedDays,
      reason: reason.trim(),
      emergencyContact: emergencyContact.trim(),
    });

    if (!res.success) {
      setFormError(res.error || 'Gagal mengajukan cuti.');
      return;
    }

    // Reset and close
    setStartDate('');
    setEndDate('');
    setReason('');
    setEmergencyContact('');
    onCloseModal();
  };

  // Filter requests
  const filteredRequests = leaveRequests.filter((item) => {
    // Tab filter
    if (activeTab === 'mine' && item.userId !== currentUser.id) return false;
    if (activeTab === 'pending' && !(item.status === 'PENDING_MANAGER' || item.status === 'PENDING_HRD'))
      return false;
    if (activeTab === 'approved' && item.status !== 'APPROVED') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const applicant = users.find((u) => u.id === item.userId);
      const matchName = applicant?.name.toLowerCase().includes(q);
      const matchReason = item.reason.toLowerCase().includes(q);
      const matchType = item.leaveType.toLowerCase().includes(q);
      if (!matchName && !matchReason && !matchType) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Leave Balance Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-600" />
            Manajemen Permohonan Cuti
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola pengajuan libur, cuti sakit, dan pantau persetujuan berjenjang
            manajemen.
          </p>
        </div>

        {hasUserPermission('create_leave') && (
          <button
            onClick={onOpenModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm shadow-indigo-600/20 transition-all hover:scale-[1.02] self-start sm:self-auto"
            title="Ajukan formulir permohonan cuti"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Ajukan Cuti</span>
          </button>
        )}
      </div>

      {/* Quota Balances Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase">
            Total Hak Cuti Tahunan
          </span>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900">
            {myBalance?.annualQuota ?? 12}{' '}
            <span className="text-xs font-normal text-slate-400">Hari</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Kuota tahun berjalan</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase">
            Cuti Terpakai
          </span>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-amber-600">
            {myBalance?.usedQuota ?? 0}{' '}
            <span className="text-xs font-normal text-slate-400">Hari</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Telah disetujui HRD</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase">
            Sisa Kuota Bersih
          </span>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-emerald-700">
            {myBalance?.remainingQuota ?? 12}{' '}
            <span className="text-xs font-normal text-emerald-600">Hari</span>
          </div>
          <p className="text-[10px] text-emerald-600/90 mt-1">Siap diajukan kapan saja</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase">
            Carry Over (Tahun Lalu)
          </span>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-700">
            {myBalance?.carryOverQuota ?? 0}{' '}
            <span className="text-xs font-normal text-slate-400">Hari</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Kadaluarsa 31 Des</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex overflow-x-auto no-scrollbar items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Semua Riwayat ({leaveRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'mine'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Cuti Saya ({leaveRequests.filter((r) => r.userId === currentUser.id).length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Antrean Review
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'approved'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Disetujui
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari karyawan / alasan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Leave Requests Container: Mobile Cards (md:hidden) & Desktop Table (hidden md:block) */}
      <div className="space-y-3">
        {/* Mobile View: High-Touch Cards */}
        <div className="md:hidden space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center text-slate-400">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-medium text-slate-600 dark:text-slate-300 text-xs">
                Tidak ada permohonan cuti yang sesuai kriteria.
              </p>
            </div>
          ) : (
            filteredRequests.map((item) => {
              const applicant = users.find((u) => u.id === item.userId);
              const dept = departments.find((d) => d.id === applicant?.departmentId);
              const isOwnerOrHrd =
                hasUserPermission('delete_leave') || item.userId === currentUser.id;

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-3 transition-all"
                >
                  {/* Top Bar: Applicant Info & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={applicant?.avatar}
                        alt={applicant?.name}
                        className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {applicant?.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {dept?.code} &bull; {applicant?.position}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {item.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Disetujui
                        </span>
                      )}
                      {item.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          <X className="w-3 h-3" /> Ditolak
                        </span>
                      )}
                      {item.status === 'PENDING_MANAGER' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse">
                          <Clock className="w-3 h-3" /> Review Manajer
                        </span>
                      )}
                      {item.status === 'PENDING_HRD' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800 animate-pulse">
                          <Clock className="w-3 h-3" /> Review HRD
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Info Box */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {item.leaveType}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold text-[11px] border border-indigo-100 dark:border-indigo-900/60">
                        {item.totalDays} Hari Kerja
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.startDate} s/d {item.endDate}</span>
                    </div>
                    {item.reason && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        "{item.reason}"
                      </p>
                    )}
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {item.status === 'APPROVED' ? (
                      <button
                        onClick={() => setSelectedForLetter(item)}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Surat Resmi &amp; Tanda Tangan</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setDetailModalRequest(item)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1 hover:bg-slate-200 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Timeline Persetujuan</span>
                      </button>
                    )}

                    {isOwnerOrHrd && (
                      <button
                        onClick={() => {
                          if (confirm('Batalkan dan hapus pengajuan cuti ini?')) {
                            deleteLeave(item.id);
                          }
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Hapus Permohonan"
                        aria-label="Hapus Permohonan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (Hidden on mobile) */}
        <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Karyawan / Divisi</th>
                  <th className="py-3 px-4">Tipe Cuti</th>
                  <th className="py-3 px-4">Rentang Tanggal</th>
                  <th className="py-3 px-4">Durasi</th>
                  <th className="py-3 px-4">Status &amp; Pipeline</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium text-slate-600 dark:text-slate-300">
                        Tidak ada permohonan cuti yang sesuai kriteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((item) => {
                    const applicant = users.find((u) => u.id === item.userId);
                    const dept = departments.find(
                      (d) => d.id === applicant?.departmentId
                    );
                    const isOwnerOrHrd =
                      hasUserPermission('delete_leave') ||
                      item.userId === currentUser.id;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Applicant */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={applicant?.avatar}
                              alt={applicant?.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {applicant?.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {dept?.code} &bull; {applicant?.position}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {item.leaveType}
                        </td>

                        {/* Dates */}
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-900 dark:text-white block">
                            {item.startDate} s/d {item.endDate}
                          </span>
                          <span className="text-[10px] text-slate-400 line-clamp-1 max-w-xs">
                            {item.reason}
                          </span>
                        </td>

                        {/* Duration */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {item.totalDays} Hari Kerja
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {item.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Disetujui HRD
                            </span>
                          )}
                          {item.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              <X className="w-3 h-3" /> Ditolak
                            </span>
                          )}
                          {item.status === 'PENDING_MANAGER' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse">
                              <Clock className="w-3 h-3" /> Menunggu Manajer
                            </span>
                          )}
                          {item.status === 'PENDING_HRD' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800 animate-pulse">
                              <Clock className="w-3 h-3" /> Menunggu HRD
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Print official letter if approved */}
                            {item.status === 'APPROVED' ? (
                              <button
                                onClick={() => setSelectedForLetter(item)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1 transition-colors"
                                title="Cetak Surat Izin Cuti Resmi Perusahaan"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Surat Cuti
                              </button>
                            ) : (
                              <button
                                onClick={() => setDetailModalRequest(item)}
                                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              >
                                Timeline
                              </button>
                            )}

                            {/* Delete if pending or allowed */}
                            {isOwnerOrHrd && (
                              <button
                                onClick={() => {
                                  if (confirm('Batalkan dan hapus pengajuan cuti ini?')) {
                                    deleteLeave(item.id);
                                  }
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition-colors"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Leave Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-400" />
                  Form Permohonan Izin Cuti Karyawan
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Validasi otomatis kuota dan workflow persetujuan bertingkat.
                </p>
              </div>
              <button
                onClick={onCloseModal}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Tutup Form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tipe Cuti */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Jenis Cuti
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                >
                  <option value="Cuti Tahunan">Cuti Tahunan (Memotong Saldo Tahunan)</option>
                  <option value="Cuti Sakit">Cuti Sakit (Disertai Surat Dokter)</option>
                  <option value="Cuti Melahirkan">Cuti Melahirkan / Parental</option>
                  <option value="Cuti Menikah">Cuti Menikah (3 Hari)</option>
                  <option value="Cuti Khusus / Duka">Cuti Khusus / Anggota Keluarga Duka</option>
                </select>
              </div>

              {/* Date pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Calculated Working Days feedback */}
              {calculatedDays > 0 && (
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">
                    Total Durasi Hari Kerja:
                  </span>
                  <span className="font-extrabold text-indigo-700 text-sm">
                    {calculatedDays} Hari Kerja
                  </span>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alasan / Keterangan Cuti
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Misal: Istirahat rehat fisik pasca peluncuran sprint atau acara keluarga..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kontak Darurat Selama Cuti
                </label>
                <input
                  type="text"
                  placeholder="Nama &amp; Nomor Handphone keluarga..."
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.01]"
                >
                  Kirim Permohonan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stepper Timeline Log Detail Modal */}
      {detailModalRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Tracking Pipeline &amp; Log Persetujuan
                </h3>
                <p className="text-xs text-slate-500">
                  Ref: {detailModalRequest.id}
                </p>
              </div>
              <button
                onClick={() => setDetailModalRequest(null)}
                className="text-slate-400 hover:text-slate-900 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {detailModalRequest.approvalLogs.map((log, index) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {log.stageName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-700 font-medium">
                      Oleh: {log.approverName} ({log.approverRole})
                    </p>
                    <p className="text-xs text-slate-600 mt-1 italic bg-white p-2 rounded-lg border border-slate-200/60">
                      "{log.note}"
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setDetailModalRequest(null)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Official Leave Letter Modal */}
      {selectedForLetter && (
        <OfficialLeaveLetterModal
          isOpen={true}
          onClose={() => setSelectedForLetter(null)}
          leaveRequest={selectedForLetter}
          applicant={users.find((u) => u.id === selectedForLetter.userId)}
          department={departments.find(
            (d) =>
              d.id ===
              users.find((u) => u.id === selectedForLetter.userId)?.departmentId
          )}
          role={roles.find(
            (r) =>
              r.id ===
              users.find((u) => u.id === selectedForLetter.userId)?.roleId
          )}
        />
      )}
    </div>
  );
};

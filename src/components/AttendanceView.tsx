import React, { useState, useEffect } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import {
  AttendanceRecord,
  OvertimeRequest,
  WorkType,
  AttendanceStatus,
} from '../types/index.ts';
import {
  calculateAttendanceStats,
  filterAttendanceRecords,
  validateOvertimeRequest,
} from '../utils/attendanceUtils.ts';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building,
  Home,
  Briefcase,
  Users,
  Search,
  Filter,
  Download,
  Plus,
  X,
  UserCheck,
  TrendingUp,
  MapPin,
  Trash2,
  Check,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const AttendanceView: React.FC = () => {
  const {
    currentUser,
    users,
    departments,
    attendances,
    overtimeRequests,
    checkIn,
    checkOut,
    submitOvertime,
    approveOvertime,
    rejectOvertime,
    deleteAttendance,
    hasUserPermission,
  } = useHRIS();

  const [activeTab, setActiveTab] = useState<'daily' | 'overtime'>('daily');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Live Digital Clock
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Quick Check-in form state
  const [selectedMode, setSelectedMode] = useState<WorkType>('WFO');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkInMessage, setCheckInMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Overtime Modal state
  const [isOtModalOpen, setIsOtModalOpen] = useState(false);
  const [otDate, setOtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [otStartTime, setOtStartTime] = useState('18:00');
  const [otEndTime, setOtEndTime] = useState('21:00');
  const [otDuration, setOtDuration] = useState(3.0);
  const [otTaskDesc, setOtTaskDesc] = useState('');
  const [otError, setOtError] = useState<string | null>(null);

  // Permissions
  const canCheckIn = hasUserPermission('create_attendance');
  const canApproveOt = hasUserPermission('approve_attendance');
  const canDeleteAttendance = hasUserPermission('delete_attendance');

  // Check today's record for current user
  const todayStr = new Date().toISOString().split('T')[0];
  const myTodayAttendance = attendances.find(
    (a) => a.userId === currentUser.id && a.date === todayStr
  );

  const stats = calculateAttendanceStats(attendances);

  // Filtered daily attendance
  const filteredAttendance = filterAttendanceRecords(attendances, users, {
    searchQuery,
    departmentId: selectedDeptId,
    workType: selectedWorkType,
  });

  const handleCheckInSubmit = () => {
    setCheckInMessage(null);
    const res = checkIn(selectedMode, checkInNotes.trim());
    if (res.success) {
      setCheckInMessage({ type: 'success', text: res.message });
      setCheckInNotes('');
    } else {
      setCheckInMessage({ type: 'error', text: res.message });
    }
  };

  const handleCheckOutSubmit = () => {
    setCheckInMessage(null);
    const res = checkOut(checkInNotes.trim());
    if (res.success) {
      setCheckInMessage({ type: 'success', text: res.message });
      setCheckInNotes('');
    } else {
      setCheckInMessage({ type: 'error', text: res.message });
    }
  };

  const handleOpenOtModal = () => {
    setOtDate(new Date().toISOString().split('T')[0]);
    setOtStartTime('18:00');
    setOtEndTime('21:00');
    setOtDuration(3.0);
    setOtTaskDesc('');
    setOtError(null);
    setIsOtModalOpen(true);
  };

  const handleOtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOtError(null);

    const validation = validateOvertimeRequest({
      date: otDate,
      startTime: otStartTime,
      endTime: otEndTime,
      durationHours: otDuration,
      tasksDescription: otTaskDesc,
    });

    if (!validation.valid) {
      setOtError(validation.error || 'Input tidak valid.');
      return;
    }

    const res = submitOvertime({
      date: otDate,
      startTime: otStartTime,
      endTime: otEndTime,
      durationHours: otDuration,
      tasksDescription: otTaskDesc.trim(),
    });

    if (res.success) {
      setIsOtModalOpen(false);
    } else {
      setOtError(res.error || 'Gagal mengirim pengajuan.');
    }
  };

  // Export Attendance CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Presensi',
      'NIP',
      'Nama Karyawan',
      'Departemen',
      'Tanggal',
      'Jam Masuk',
      'Jam Pulang',
      'Tipe Kerja',
      'Status',
      'Lokasi',
      'Catatan',
    ];

    const rows = filteredAttendance.map((rec) => {
      const u = users.find((usr) => usr.id === rec.userId);
      const d = departments.find((dept) => dept.id === u?.departmentId);
      return [
        rec.id,
        u?.employeeNumber || '',
        `"${u?.name || ''}"`,
        `"${d?.name || ''}"`,
        rec.date,
        rec.checkInTime,
        rec.checkOutTime || '-',
        rec.workType,
        rec.status,
        `"${rec.locationName.replace(/"/g, '""')}"`,
        `"${(rec.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Presensi_Karyawan_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Time Tracking &amp; Shift Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Presensi &amp; Kehadiran Karyawan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pencatatan jam kerja harian, status kehadiran WFO/WFH, dan verifikasi lembur berjenjang.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
          {canCheckIn && (
            <button
              onClick={handleOpenOtModal}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajukan Lembur</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Hadir */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Total Hadir</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.presentCount + stats.lateCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Karyawan</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>WFO: {stats.wfoCount} | WFH: {stats.wfhCount}</span>
            <span className="text-emerald-600 font-bold">Aktif</span>
          </div>
        </div>

        {/* Card 2: Tepat Waktu */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Tepat Waktu</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              {stats.presentCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Sebelum 09:00</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Standar Toleransi</span>
            <span className="text-blue-600 font-semibold">Tepat</span>
          </div>
        </div>

        {/* Card 3: Terlambat */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Terlambat</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {stats.lateCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Orang</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Potongan jam kerja</span>
            <span className="text-amber-600 font-semibold">Warning</span>
          </div>
        </div>

        {/* Card 4: Tingkat Ketepatan Waktu */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Ketepatan Waktu</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
              {stats.punctualityRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">Punctuality Score</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Target Perusahaan &ge; 90%</span>
            <span className="text-purple-600 font-bold">Good</span>
          </div>
        </div>
      </div>

      {/* User Quick Check-In / Clock Widget */}
      <div className="bg-linear-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/60">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-400/50 shadow-md"
              />
              <div>
                <h2 className="text-lg font-extrabold text-white leading-tight">
                  {currentUser.name}
                </h2>
                <p className="text-xs text-indigo-200">
                  {currentUser.position} &bull; NIP: {currentUser.employeeNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/30 border border-indigo-400/40 text-xs font-mono font-bold text-indigo-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
                {currentTimeStr || 'Memuat Waktu...'}
              </span>
              <span className="text-xs text-slate-400">
                Tanggal: <strong>{currentDateStr}</strong>
              </span>
            </div>
          </div>

          {/* Action Form */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Work Mode Selector */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedMode('WFO')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedMode === 'WFO'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>WFO</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode('WFH')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedMode === 'WFH'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>WFH</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode('DINAS_LUAR')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedMode === 'DINAS_LUAR'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Dinas</span>
              </button>
            </div>

            {/* Check-in or Check-out Button */}
            {myTodayAttendance ? (
              <div className="flex items-center gap-2">
                <div className="bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs">
                  <span className="text-emerald-400 font-bold block">
                    ✓ Sudah Masuk: {myTodayAttendance.checkInTime} WIB
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Mode: {myTodayAttendance.workType} ({myTodayAttendance.status})
                  </span>
                </div>
                {!myTodayAttendance.checkOutTime && (
                  <button
                    onClick={handleCheckOutSubmit}
                    type="button"
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    Check-Out Pulang
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleCheckInSubmit}
                type="button"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Check-In Sekarang ({selectedMode})
              </button>
            )}
          </div>
        </div>

        {checkInMessage && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs font-semibold border flex items-center justify-between ${
              checkInMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/60 text-rose-200'
            }`}
          >
            <span>{checkInMessage.text}</span>
            <button
              onClick={() => setCheckInMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Tabs: Presensi Harian vs Lembur */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('daily')}
          type="button"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'daily'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Rekap Presensi Harian ({filteredAttendance.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('overtime')}
          type="button"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overtime'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pengajuan Lembur / Overtime ({overtimeRequests.length})</span>
        </button>
      </div>

      {/* Tab 1: Daily Attendance Table */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Divisi:
              </span>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="ALL">Semua Departemen</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">
                Mode:
              </span>
              <select
                value={selectedWorkType}
                onChange={(e) => setSelectedWorkType(e.target.value as WorkType | 'ALL')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="ALL">Semua Mode</option>
                <option value="WFO">WFO (Kantor)</option>
                <option value="WFH">WFH (Remote)</option>
                <option value="DINAS_LUAR">Dinas Luar</option>
              </select>
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, NIP, atau lokasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Karyawan</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Jam Masuk</th>
                    <th className="py-3 px-4">Jam Pulang</th>
                    <th className="py-3 px-4">Mode Kerja</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Lokasi &amp; Catatan</th>
                    {canDeleteAttendance && <th className="py-3 px-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-xs">Tidak ada catatan presensi yang sesuai.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((rec) => {
                      const u = users.find((usr) => usr.id === rec.userId);
                      const d = departments.find((dept) => dept.id === u?.departmentId);

                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={u?.avatar}
                                alt={u?.name}
                                className="w-8 h-8 rounded-xl object-cover shrink-0"
                              />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {u?.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {u?.employeeNumber} &bull; {d?.code}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                            {rec.date}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-mono">
                            {rec.checkInTime} WIB
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                            {rec.checkOutTime ? `${rec.checkOutTime} WIB` : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.workType === 'WFO'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                  : rec.workType === 'WFH'
                                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                                  : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                              }`}
                            >
                              {rec.workType}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.status === 'PRESENT'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : rec.status === 'LATE'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              }`}
                            >
                              {rec.status === 'PRESENT'
                                ? '✓ Tepat Waktu'
                                : rec.status === 'LATE'
                                ? '⚠ Terlambat'
                                : 'Izin / Cuti'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="max-w-xs">
                              <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 block truncate">
                                {rec.locationName}
                              </span>
                              {rec.notes && (
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {rec.notes}
                                </span>
                              )}
                            </div>
                          </td>
                          {canDeleteAttendance && (
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => deleteAttendance(rec.id)}
                                type="button"
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Hapus catatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Overtime Requests Table */}
      {activeTab === 'overtime' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Karyawan</th>
                    <th className="py-3 px-4">Tanggal Lembur</th>
                    <th className="py-3 px-4">Jam Pelaksanaan</th>
                    <th className="py-3 px-4">Durasi</th>
                    <th className="py-3 px-4">Uraian Tugas Lembur</th>
                    <th className="py-3 px-4">Status Lembur</th>
                    <th className="py-3 px-4">Verifikator</th>
                    {canApproveOt && <th className="py-3 px-4 text-center">Tindakan</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {overtimeRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-xs">Belum ada permohonan lembur.</p>
                      </td>
                    </tr>
                  ) : (
                    overtimeRequests.map((ot) => {
                      const u = users.find((usr) => usr.id === ot.userId);
                      const d = departments.find((dept) => dept.id === u?.departmentId);

                      return (
                        <tr
                          key={ot.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={u?.avatar}
                                alt={u?.name}
                                className="w-8 h-8 rounded-xl object-cover shrink-0"
                              />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {u?.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {u?.employeeNumber} &bull; {d?.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {ot.date}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                            {ot.startTime} - {ot.endTime} WIB
                          </td>
                          <td className="py-3 px-4 font-bold text-indigo-700 dark:text-indigo-400 font-mono">
                            {ot.durationHours} Jam
                          </td>
                          <td className="py-3 px-4">
                            <div className="max-w-xs text-slate-700 dark:text-slate-300">
                              <span className="block truncate font-medium">{ot.tasksDescription}</span>
                              {ot.rejectionReason && (
                                <span className="text-[10px] text-rose-600 block mt-0.5">
                                  Alasan Tolak: {ot.rejectionReason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                ot.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200'
                                  : ot.status === 'REJECTED'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200'
                              }`}
                            >
                              {ot.status === 'APPROVED'
                                ? '✓ Disetujui'
                                : ot.status === 'REJECTED'
                                ? '✕ Ditolak'
                                : '⏳ Antre Approval'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-[11px]">
                            {ot.approverName || '-'}
                          </td>
                          {canApproveOt && (
                            <td className="py-3 px-4 text-center">
                              {ot.status === 'PENDING_MANAGER' ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => approveOvertime(ot.id)}
                                    type="button"
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-xs cursor-pointer"
                                  >
                                    Setujui
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = window.prompt('Alasan penolakan lembur:');
                                      if (reason && reason.trim()) {
                                        rejectOvertime(ot.id, reason.trim());
                                      }
                                    }}
                                    type="button"
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold cursor-pointer"
                                  >
                                    Tolak
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400">Selesai</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Overtime Request Modal */}
      {isOtModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Formulir Pengajuan Lembur Kerja
                </h3>
              </div>
              <button
                onClick={() => setIsOtModalOpen(false)}
                type="button"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {otError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {otError}
              </div>
            )}

            <form onSubmit={handleOtSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Lembur
                </label>
                <input
                  type="date"
                  value={otDate}
                  onChange={(e) => setOtDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    value={otStartTime}
                    onChange={(e) => setOtStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    value={otEndTime}
                    onChange={(e) => setOtEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Estimasi Durasi (Jam)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  value={otDuration}
                  onChange={(e) => setOtDuration(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Uraian Tugas / Deliverable Lembur
                </label>
                <textarea
                  rows={3}
                  value={otTaskDesc}
                  onChange={(e) => setOtTaskDesc(e.target.value)}
                  placeholder="Jelaskan kebutuhan operasional atau deadline tugas yang diselesaikan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOtModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20"
                >
                  Kirim Pengajuan Lembur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


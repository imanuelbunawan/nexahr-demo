import React, { useState, useMemo } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { Department, LeaveRequest, ModuleType } from '../types/index.ts';
import {
  buildTeamCalendarMonth,
  calculateMonthWorkforceSummary,
  formatIndonesianDate,
  INDONESIAN_MONTHS,
  INDONESIAN_DAYS_FULL,
  INDONESIAN_DAYS_SHORT,
  CalendarDayCell,
  CalendarLeaveEntry,
} from '../utils/teamCalendarUtils.ts';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  ListFilter,
  Eye,
  X,
  ExternalLink,
  ShieldCheck,
  CalendarCheck,
  UserX,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TeamCalendarViewProps {
  onNavigate?: (module: ModuleType) => void;
  onOpenLeaveModal?: () => void;
}

export const TeamCalendarView: React.FC<TeamCalendarViewProps> = ({
  onNavigate,
  onOpenLeaveModal,
}) => {
  const { users, departments, leaveRequests, hasUserPermission } = useHRIS();

  // Current calendar viewing month and year (default to October 2026 based on mock system context)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10); // 1-12 (October)

  // Filters
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');

  // Selected day for inspection modal
  const [selectedDayCell, setSelectedDayCell] = useState<CalendarDayCell | null>(null);

  // Compute month calendar data
  const calendarCells = useMemo(() => {
    return buildTeamCalendarMonth(
      currentYear,
      currentMonth,
      leaveRequests,
      users,
      departments,
      {
        departmentId: selectedDeptId,
        status: selectedStatus,
      },
      '2026-10-25'
    );
  }, [currentYear, currentMonth, leaveRequests, users, departments, selectedDeptId, selectedStatus]);

  // Compute workforce planning monthly summary
  const summary = useMemo(() => {
    return calculateMonthWorkforceSummary(currentYear, currentMonth, calendarCells, users);
  }, [currentYear, currentMonth, calendarCells, users]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(10);
  };

  // Chronologically sorted leaves for Agenda View
  const monthlyLeaves = useMemo(() => {
    const list: CalendarLeaveEntry[] = [];
    const seenIds = new Set<string>();

    calendarCells.forEach((cell) => {
      if (cell.isCurrentMonth) {
        cell.leaves.forEach((l) => {
          if (!seenIds.has(l.request.id)) {
            seenIds.add(l.request.id);
            list.push(l);
          }
        });
      }
    });

    return list.sort((a, b) => a.request.startDate.localeCompare(b.request.startDate));
  }, [calendarCells]);

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs overflow-hidden">
      {/* Top Header & Workforce Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-700/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200/60 dark:border-indigo-800/60">
              <CalendarCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Perencanaan Kapasitas SDM &bull; Team Roster</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Kalender Cuti Tim (Team Calendar)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualisasi jadwal cuti aktif (Disetujui &amp; Menunggu Approval) untuk mencegah benturan jadwal dan menjaga kapasitas tim.
            </p>
          </div>

          {/* Month Stepper & Today Shortcut */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleJumpToToday}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1 shadow-2xs"
              title="Kembali ke Bulan Berjalan (Oktober 2026)"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Hari Ini</span>
            </button>

            <div className="flex items-center bg-slate-100 dark:bg-slate-900/60 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={handlePrevMonth}
                aria-label="Bulan Sebelumnya"
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[120px] text-center">
                {INDONESIAN_MONTHS[currentMonth - 1]} {currentYear}
              </span>
              <button
                onClick={handleNextMonth}
                aria-label="Bulan Berikutnya"
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Mode Switcher (Grid vs Agenda) */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-900/60 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  viewMode === 'agenda'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ListFilter className="w-3 h-3" />
                <span>Agenda</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Status Legends Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="text-xs font-medium py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Departemen</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="text-xs font-medium py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Status Cuti</option>
                <option value="APPROVED">Hanya Disetujui (Approved)</option>
                <option value="PENDING">Hanya Menunggu Approval</option>
              </select>
            </div>
          </div>

          {/* Color Legends */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                Disetujui (Approved)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                Menunggu Review
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                Risiko Beban Kerja (&ge;2 cuti)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Workforce Planning Quick Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200/80 dark:bg-slate-700/80 border-b border-slate-200/80 dark:border-slate-700/80">
        {/* KPI 1 */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-800/95 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Karyawan Cuti Bulan Ini
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {summary.uniqueEmployeesOnLeave}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              / {summary.totalTeamMembers} Karyawan
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-800/95 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Total Berkas Pengajuan
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {summary.totalLeaveEvents}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {summary.approvedCount} Cair
            </span>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {summary.pendingCount} Antre
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-800/95 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Puncak Absensi (Peak Day)
          </span>
          <div className="flex items-baseline gap-1.5">
            {summary.peakAbsenceDate ? (
              <>
                <span className="text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-400">
                  {summary.peakAbsenceDate.slice(8, 10)} {INDONESIAN_MONTHS[currentMonth - 1]}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  ({summary.peakAbsenceCount} staf off)
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400">Nihil absensi</span>
            )}
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-800/95 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Status Coverage Risiko
          </span>
          <div className="flex items-baseline gap-1.5">
            {summary.coverageRiskDaysCount > 0 ? (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                {summary.coverageRiskDaysCount} Hari Perlu Backup
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Kapasitas Tim Aman
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main View Area: Monthly Grid or Agenda List */}
      {viewMode === 'grid' ? (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Day Header Row */}
            <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/40 text-center">
              {INDONESIAN_DAYS_FULL.map((dayName, idx) => {
                const isWeekend = idx >= 5;
                return (
                  <div
                    key={dayName}
                    className={`py-2.5 text-xs font-bold uppercase tracking-wider ${
                      isWeekend
                        ? 'text-rose-500 dark:text-rose-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className="hidden sm:inline">{dayName}</span>
                    <span className="sm:hidden">{INDONESIAN_DAYS_SHORT[idx]}</span>
                  </div>
                );
              })}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-700/60">
              {calendarCells.map((cell) => {
                const isOffMonth = !cell.isCurrentMonth;
                const leaves = cell.leaves;

                return (
                  <div
                    key={cell.date}
                    onClick={() => setSelectedDayCell(cell)}
                    className={`min-h-[105px] p-1.5 sm:p-2 transition-all flex flex-col justify-between cursor-pointer group ${
                      isOffMonth
                        ? 'bg-slate-50/40 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600'
                        : cell.isWeekend
                        ? 'bg-slate-50/20 dark:bg-slate-800/40'
                        : 'bg-white dark:bg-slate-800/90 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20'
                    } ${
                      cell.isToday
                        ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/30 dark:bg-indigo-950/30'
                        : ''
                    }`}
                  >
                    {/* Top Row in Cell: Day Number and Badges */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : isOffMonth
                            ? 'text-slate-400 dark:text-slate-600'
                            : cell.isWeekend
                            ? 'text-rose-500 dark:text-rose-400'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {/* Coverage Alert Warning Badge */}
                      {cell.isCoverageRisk && cell.isCurrentMonth && (
                        <span
                          className="px-1 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[9px] font-bold flex items-center gap-0.5"
                          title="Peringatan Beban Kerja: 2 atau lebih karyawan berhalangan pada hari ini"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>{leaves.length}</span>
                        </span>
                      )}
                    </div>

                    {/* Leave Items Stack */}
                    <div className="space-y-1 my-1">
                      {leaves.slice(0, 2).map((leave) => {
                        return (
                          <div
                            key={leave.request.id}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border flex items-center justify-between gap-1 transition-all ${
                              leave.isApproved
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/70 border-dashed'
                            }`}
                          >
                            <span className="truncate max-w-[85px] sm:max-w-[110px]" title={leave.user.name}>
                              {leave.user.name.split(' ')[0]}
                            </span>
                            <span className="shrink-0">
                              {leave.isApproved ? (
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              )}
                            </span>
                          </div>
                        );
                      })}

                      {/* Overrun indicator */}
                      {leaves.length > 2 && (
                        <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700/60 text-center">
                          +{leaves.length - 2} lainnya
                        </div>
                      )}
                    </div>

                    {/* Cell Bottom: Hover Indicator */}
                    <div className="text-[9px] text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end">
                      <span>Rincian &rarr;</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Agenda View */
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Daftar Permohonan Cuti Terjadwal ({monthlyLeaves.length} Berkas)
            </h3>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              Bulan {INDONESIAN_MONTHS[currentMonth - 1]} {currentYear}
            </span>
          </div>

          {monthlyLeaves.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Tidak ada data cuti untuk filter yang dipilih pada bulan ini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {monthlyLeaves.map((item) => (
                <div
                  key={item.request.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 px-2 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.user.avatar}
                      alt={item.user.name}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/20 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.user.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          &bull; {item.department?.name || 'Divisi'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {item.request.leaveType} &bull; {formatIndonesianDate(item.request.startDate)} s/d{' '}
                        {formatIndonesianDate(item.request.endDate)} ({item.request.totalDays} hari)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                        item.isApproved
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {item.isApproved ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Disetujui</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Menunggu ({item.request.currentApproverRole || 'Review'})</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interactive Day Inspection Modal */}
      {selectedDayCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                  {selectedDayCell.dayNumber}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Rencana Kerja: {formatIndonesianDate(selectedDayCell.date)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedDayCell.isWeekend
                      ? 'Hari Libur Akhir Pekan'
                      : selectedDayCell.leaves.length > 0
                      ? `${selectedDayCell.leaves.length} Karyawan Berhalangan Hadir`
                      : 'Kapasitas Tim Penuh (100% Hadir)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayCell(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Coverage Risk Notification in Modal */}
            {selectedDayCell.isCoverageRisk && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/80 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    Peringatan Beban Kerja &amp; Kontinuitas Layanan
                  </p>
                  <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                    Ada 2 atau lebih karyawan berhalangan pada tanggal ini. Pastikan delegasi pekerjaan dan PIC operasional telah dikoordinasikan.
                  </p>
                </div>
              </div>
            )}

            {/* Leaves List for this Day */}
            {selectedDayCell.leaves.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Tidak Ada Cuti yang Terjadwal
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Seluruh staf dan manajer dijadwalkan hadir dan aktif bekerja secara normal.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayCell.leaves.map((item) => (
                  <div
                    key={item.request.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.user.avatar}
                          alt={item.user.name}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.user.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.user.position} &bull; {item.department?.name}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.isApproved
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {item.isApproved ? 'Disetujui' : `Menunggu ${item.request.currentApproverRole || 'Review'}`}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Jenis Cuti:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.request.leaveType}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Rentang Waktu:</span>
                        <span className="font-medium">
                          {formatIndonesianDate(item.request.startDate)} s/d{' '}
                          {formatIndonesianDate(item.request.endDate)} ({item.request.totalDays} hari)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Alasan Cuti:</span>
                        <span className="font-medium text-right max-w-[240px] truncate" title={item.request.reason}>
                          {item.request.reason}
                        </span>
                      </div>
                      {item.request.emergencyContact && (
                        <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-700/40 text-[11px]">
                          <span className="text-slate-400">Kontak Darurat:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {item.request.emergencyContact}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60">
              {hasUserPermission('view_approval') && onNavigate ? (
                <button
                  onClick={() => {
                    setSelectedDayCell(null);
                    onNavigate('approval');
                  }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Meja Persetujuan</span>
                </button>
              ) : (
                <span className="text-xs text-slate-400">Hak akses terbatas oleh RBAC</span>
              )}

              <button
                onClick={() => setSelectedDayCell(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold text-xs transition-all shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

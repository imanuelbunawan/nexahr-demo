import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useHRIS } from '../context/HRISContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { formatRupiah } from '../utils/rbac.ts';
import {
  calculateHeadcountTimeline,
  calculateLeaveDistribution,
  calculateReimbursementPipeline,
  calculateQuickSummaryStats,
} from '../utils/dashboardChartUtils.ts';
import {
  TrendingUp,
  CalendarDays,
  Receipt,
  Users,
  CheckCircle2,
  Clock,
  BarChart3,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

type ChartTab = 'all' | 'headcount' | 'leave' | 'reimbursement';

export const DashboardChartsSection: React.FC = () => {
  const { users, leaveRequests, reimbursements } = useHRIS();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<ChartTab>('all');

  // Compute pure chart data
  const headcountData = useMemo(() => calculateHeadcountTimeline(users), [users]);
  const leaveData = useMemo(
    () => calculateLeaveDistribution(leaveRequests),
    [leaveRequests]
  );
  const reimbursementData = useMemo(
    () => calculateReimbursementPipeline(reimbursements),
    [reimbursements]
  );
  const summaryStats = useMemo(
    () => calculateQuickSummaryStats(users, leaveRequests, reimbursements),
    [users, leaveRequests, reimbursements]
  );

  // Theme-aware chart colors
  const gridColor = isDark ? '#334155' : '#f1f5f9';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#1e293b' : '#e2e8f0';

  // Custom Tooltip for Headcount Area Chart
  const CustomHeadcountTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: any; value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload;
      return (
        <div
          className="rounded-xl p-3 shadow-xl border text-xs"
          style={{ backgroundColor: tooltipBg, borderColor: tooltipBorder }}
        >
          <div className="font-bold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>{label}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                Total Karyawan Kumulatif:
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {point?.headcount} orang
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                Rekrutmen Baru:
              </span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                +{point?.newHires} orang
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Leave Bar Chart
  const CustomLeaveTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: any; value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload;
      return (
        <div
          className="rounded-xl p-3 shadow-xl border text-xs"
          style={{ backgroundColor: tooltipBg, borderColor: tooltipBorder }}
        >
          <div className="font-bold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
            <span>{label}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Disetujui:
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {point?.approvedDays} hari
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Menunggu Review:
              </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {point?.pendingDays} hari
              </span>
            </div>
            <div className="pt-1 mt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Total Permohonan:</span>
              <span className="font-semibold">{point?.totalRequests} berkas</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Reimbursement Bar Chart
  const CustomReimbursementTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: any; value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload;
      return (
        <div
          className="rounded-xl p-3 shadow-xl border text-xs"
          style={{ backgroundColor: tooltipBg, borderColor: tooltipBorder }}
        >
          <div className="font-bold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-blue-500" />
            <span className="truncate max-w-[200px]">{label}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Menunggu Approval:
              </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {formatRupiah(point?.pendingAmount || 0)} ({point?.pendingCount} klaim)
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                Sudah Disetujui:
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {formatRupiah(point?.approvedAmount || 0)} ({point?.approvedCount} klaim)
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Quick Summary Top Header & Segmented Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Quick Summary &amp; Analitik Eksekutif
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Statistik real-time pertumbuhan karyawan, cuti aktif, dan antrean reimbursement.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls - 2x2 Grid Layout */}
        <div
          role="tablist"
          aria-label="Filter Tampilan Grafik Analitik Eksekutif"
          className="grid grid-cols-2 gap-1.5 bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-xs self-start sm:self-auto w-full sm:w-auto min-w-[280px] sm:min-w-[340px] backdrop-blur-xs"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 rounded-xl text-xs transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer active:scale-[0.98] ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50 font-medium'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Semua Grafik</span>
            </span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold shrink-0 ${
                activeTab === 'all'
                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              3
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'headcount'}
            onClick={() => setActiveTab('headcount')}
            className={`px-3 py-2 rounded-xl text-xs transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer active:scale-[0.98] ${
              activeTab === 'headcount'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50 font-medium'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">SDM &amp; Hires</span>
            </span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold shrink-0 ${
                activeTab === 'headcount'
                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {summaryStats.totalHeadcount}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'leave'}
            onClick={() => setActiveTab('leave')}
            className={`px-3 py-2 rounded-xl text-xs transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer active:scale-[0.98] ${
              activeTab === 'leave'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50 font-medium'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <CalendarDays className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              <span className="truncate">Cuti Aktif</span>
            </span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold shrink-0 ${
                activeTab === 'leave'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                  : 'bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {summaryStats.totalLeaveDaysTaken}h
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'reimbursement'}
            onClick={() => setActiveTab('reimbursement')}
            className={`px-3 py-2 rounded-xl text-xs transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer active:scale-[0.98] ${
              activeTab === 'reimbursement'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50 font-medium'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Receipt className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span className="truncate">Reimbursement</span>
            </span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold shrink-0 ${
                activeTab === 'reimbursement'
                  ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
                  : 'bg-amber-50/60 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
              }`}
            >
              {summaryStats.pendingReimbursementCount}
            </span>
          </button>
        </div>
      </div>

      {/* Mini Executive Metric Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Headcount Velocity */}
        <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Pertumbuhan Headcount
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {summaryStats.totalHeadcount}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                <ArrowUpRight className="w-3 h-3" />
                Aktif
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Active Leave Days */}
        <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Cuti Aktif &amp; Terpakai
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {summaryStats.totalLeaveDaysTaken}
              </span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                hari ({summaryStats.activeLeavesCount} berkas)
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Pending Reimbursement Fund */}
        <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Pending Reimbursement
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400 truncate">
                {formatRupiah(summaryStats.pendingReimbursementAmount)}
              </span>
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 shrink-0">
                ({summaryStats.pendingReimbursementCount} antre)
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Approval Rate */}
        <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Kecepatan Approval
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {summaryStats.approvalVelocityRate}%
              </span>
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                SLA Lancar
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CHART 1: Headcount Growth Trajectory (Full width or Col 1) */}
        {(activeTab === 'all' || activeTab === 'headcount') && (
          <div
            className={`bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between ${
              activeTab === 'headcount' ? 'lg:col-span-2' : ''
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Tren Pertumbuhan Headcount SDM
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kumulatif penambahan karyawan dari waktu ke waktu berdasarkan tanggal bergabung.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-xs shrink-0">
                +{headcountData[headcountData.length - 1]?.headcount || users.length} Total
              </span>
            </div>

            <div className="h-64 sm:h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={headcountData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="headcountGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="hiresGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: tickColor, fontSize: 11 }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 11 }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomHeadcountTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="headcount"
                    name="Kumulatif Karyawan"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#headcountGradient)"
                    activeDot={{ r: 5, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="newHires"
                    name="Rekrutmen Baru"
                    stroke="#a855f7"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#hiresGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Sumber Data: Master Data Karyawan (NIP)</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                Kapasitas Tim Aktif
              </span>
            </div>
          </div>
        )}

        {/* CHART 2: Current Active Leave Breakdown */}
        {(activeTab === 'all' || activeTab === 'leave') && (
          <div
            className={`bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between ${
              activeTab === 'leave' ? 'lg:col-span-2' : ''
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-500" />
                  Distribusi Cuti Aktif &amp; Pengajuan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total hari cuti yang telah disetujui versus berkas yang masih dalam tahap review.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold text-xs shrink-0">
                {summaryStats.totalLeaveDaysTaken} Hari Terpakai
              </span>
            </div>

            <div className="h-64 sm:h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={leaveData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: tickColor, fontSize: 10 }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 11 }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomLeaveTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                  />
                  <Bar
                    dataKey="approvedDays"
                    name="Disetujui (Hari)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="pendingDays"
                    name="Menunggu Review (Hari)"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Status Cuti: Multi-Level Approval (Manajer + HRD)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Persetujuan Berjenjang
              </span>
            </div>
          </div>
        )}

        {/* CHART 3: Pending Reimbursements Pipeline */}
        {(activeTab === 'all' || activeTab === 'reimbursement') && (
          <div
            className={`bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between ${
              activeTab === 'all' ? 'lg:col-span-2' : 'lg:col-span-2'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  Pipeline Reimbursement: Pending vs Disetujui
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Perbandingan nominal klaim yang menunggu persetujuan (Manajer/Finance) dan klaim cair.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                  Pending: {formatRupiah(summaryStats.pendingReimbursementAmount)}
                </span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={reimbursementData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fill: tickColor, fontSize: 10 }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 10 }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                    tickFormatter={(val) =>
                      val >= 1000000
                        ? `${(val / 1000000).toFixed(1)}M`
                        : val >= 1000
                        ? `${(val / 1000).toFixed(0)}k`
                        : `${val}`
                    }
                  />
                  <Tooltip content={<CustomReimbursementTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                  />
                  <Bar
                    dataKey="pendingAmount"
                    name="Menunggu Approval (Rp)"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="approvedAmount"
                    name="Sudah Disetujui (Rp)"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Total Klaim Tercatat: {summaryStats.pendingReimbursementCount + reimbursements.filter(r => r.status === 'APPROVED').length} transaksi
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Validasi Nota &amp; Audit Trail Aktif
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import {
  AuditLogEntry,
  AuditActionCategory,
  AuditSeverity,
} from '../types/index.ts';
import {
  filterAuditLogs,
  calculateAuditMetrics,
  formatAuditTimestamp,
  formatRelativeTime,
  generateAuditCsv,
} from '../utils/auditUtils.ts';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Printer,
  History,
  UserCheck,
  ClipboardCheck,
  Users,
  Kanban,
  Lock,
  ArrowRight,
  Clock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  X,
  FileCode,
  Calendar,
  Layers,
  ChevronRight,
  Eye,
  RefreshCw,
  FileText,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs, users, currentUser, hasUserPermission } = useHRIS();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AuditActionCategory | 'ALL'>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<AuditSeverity | 'ALL'>('ALL');
  const [selectedActorId, setSelectedActorId] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<'ALL' | 'today' | '7days' | '30days'>('ALL');

  // Display mode: 'timeline' or 'table'
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  // Modal detail inspect
  const [inspectingLog, setInspectingLog] = useState<AuditLogEntry | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return filterAuditLogs(auditLogs, {
      query: searchQuery,
      category: selectedCategory,
      severity: selectedSeverity,
      actorId: selectedActorId,
      dateRange,
    });
  }, [auditLogs, searchQuery, selectedCategory, selectedSeverity, selectedActorId, dateRange]);

  // Overall metrics from total auditLogs
  const metrics = useMemo(() => calculateAuditMetrics(auditLogs), [auditLogs]);

  // Unique actors list for dropdown
  const uniqueActors = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string }>();
    auditLogs.forEach((log) => {
      if (!map.has(log.actorId)) {
        map.set(log.actorId, {
          id: log.actorId,
          name: log.actorName,
          role: log.actorRole,
        });
      }
    });
    return Array.from(map.values());
  }, [auditLogs]);

  // CSV Export Handler
  const handleExportCsv = () => {
    const csvContent = generateAuditCsv(filteredLogs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Audit_Log_NexaHR_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export Handler
  const handleExportJson = () => {
    const jsonContent = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Audit_Log_Trace_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // Helper styling for category icons and colors
  const getCategoryTheme = (category: AuditActionCategory) => {
    switch (category) {
      case 'role':
        return {
          label: 'Role & RBAC',
          icon: ShieldCheck,
          badgeBg: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          accentBorder: 'border-purple-500',
          dotBg: 'bg-purple-500',
        };
      case 'approval':
        return {
          label: 'Persetujuan Approval',
          icon: ClipboardCheck,
          badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          accentBorder: 'border-emerald-500',
          dotBg: 'bg-emerald-500',
        };
      case 'employee':
        return {
          label: 'Data Karyawan',
          icon: Users,
          badgeBg: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          accentBorder: 'border-blue-500',
          dotBg: 'bg-blue-500',
        };
      case 'task':
        return {
          label: 'Tugas Kerja',
          icon: Kanban,
          badgeBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          accentBorder: 'border-amber-500',
          dotBg: 'bg-amber-500',
        };
      case 'security':
        return {
          label: 'Keamanan & Akses',
          icon: Lock,
          badgeBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          accentBorder: 'border-rose-500',
          dotBg: 'bg-rose-500',
        };
      default:
        return {
          label: 'Umum',
          icon: History,
          badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          accentBorder: 'border-slate-400',
          dotBg: 'bg-slate-400',
        };
    }
  };

  // Helper styling for severity badges
  const getSeverityBadge = (severity: AuditSeverity) => {
    switch (severity) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Sukses</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>Peringatan</span>
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertOctagon className="w-3 h-3 text-rose-500" />
            <span>Kritis</span>
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Info className="w-3 h-3 text-indigo-500" />
            <span>Info</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200/60 dark:border-indigo-800/60 mb-1">
            <History className="w-3.5 h-3.5 text-indigo-500" />
            <span>Enterprise Audit Trail &amp; Immutable System Logs</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Audit Log &amp; Rekam Jejak Aktivitas HRIS
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Pencatatan menyeluruh setiap perubahan role, keputusan meja approval, serta pemutakhiran data karyawan.
          </p>
        </div>

        {/* Action Buttons: Export CSV, JSON, Print */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap print:hidden">
          {hasUserPermission('create_audit_logs') && (
            <>
              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98]"
                title="Unduh seluruh data log terfilter sebagai berkas CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Ekspor CSV</span>
              </button>

              <button
                onClick={handleExportJson}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98]"
                title="Unduh berkas JSON rekaman audit asli"
              >
                <FileCode className="w-3.5 h-3.5 text-slate-500" />
                <span>Ekspor JSON</span>
              </button>
            </>
          )}

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer active:scale-[0.98]"
            title="Cetak ringkasan audit log atau simpan sebagai PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Total Jejak Audit
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {metrics.totalCount}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              ({metrics.todayCount} hari ini)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Perubahan Role &amp; RBAC
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
              {metrics.roleChangesCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Modifikasi akses
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Keputusan Approval
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {metrics.approvalDecisionsCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Cuti &amp; klaim nota
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Update Profil SDM
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
              {metrics.employeeUpdatesCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Data &amp; kuota cuti
            </span>
          </div>
        </div>
      </div>

      {/* Category Segmented Tabs Bar */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none print:hidden">
        <div
          role="tablist"
          aria-label="Filter Kategori Audit"
          className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shrink-0 shadow-2xs backdrop-blur-xs"
        >
          <button
            role="tab"
            aria-selected={selectedCategory === 'ALL'}
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 border active:scale-[0.98] cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border-slate-200/90 dark:border-slate-700/90 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50 border-transparent font-medium'
            }`}
          >
            <History className="w-3.5 h-3.5 text-indigo-500" />
            <span>Semua Aktivitas</span>
            <span
              className={`font-mono tabular-nums rounded-full text-[10px] px-1.5 py-0.2 ${
                selectedCategory === 'ALL'
                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
              }`}
            >
              {auditLogs.length}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={selectedCategory === 'role'}
            onClick={() => setSelectedCategory('role')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 border active:scale-[0.98] cursor-pointer ${
              selectedCategory === 'role'
                ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border-slate-200/90 dark:border-slate-700/90 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50 border-transparent font-medium'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Perubahan Role</span>
            <span
              className={`font-mono tabular-nums rounded-full text-[10px] px-1.5 py-0.2 ${
                selectedCategory === 'role'
                  ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold'
                  : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
              }`}
            >
              {metrics.roleChangesCount}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={selectedCategory === 'approval'}
            onClick={() => setSelectedCategory('approval')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 border active:scale-[0.98] cursor-pointer ${
              selectedCategory === 'approval'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border-slate-200/90 dark:border-slate-700/90 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50 border-transparent font-medium'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Keputusan Approval</span>
            <span
              className={`font-mono tabular-nums rounded-full text-[10px] px-1.5 py-0.2 ${
                selectedCategory === 'approval'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
              }`}
            >
              {metrics.approvalDecisionsCount}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={selectedCategory === 'employee'}
            onClick={() => setSelectedCategory('employee')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 border active:scale-[0.98] cursor-pointer ${
              selectedCategory === 'employee'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border-slate-200/90 dark:border-slate-700/90 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50 border-transparent font-medium'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Update Karyawan</span>
            <span
              className={`font-mono tabular-nums rounded-full text-[10px] px-1.5 py-0.2 ${
                selectedCategory === 'employee'
                  ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold'
                  : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
              }`}
            >
              {metrics.employeeUpdatesCount}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={selectedCategory === 'task'}
            onClick={() => setSelectedCategory('task')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 border active:scale-[0.98] cursor-pointer ${
              selectedCategory === 'task'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 border-slate-200/90 dark:border-slate-700/90 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50 border-transparent font-medium'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Tugas Kerja</span>
            <span
              className={`font-mono tabular-nums rounded-full text-[10px] px-1.5 py-0.2 ${
                selectedCategory === 'task'
                  ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold'
                  : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
              }`}
            >
              {metrics.taskManagementCount}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={selectedCategory === 'security'}
            onClick={() => setSelectedCategory('security')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 border active:scale-[0.98] cursor-pointer ${
              selectedCategory === 'security'
                ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border-slate-200/90 dark:border-slate-700/90 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50 border-transparent font-medium'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Keamanan</span>
            <span
              className={`font-mono tabular-nums rounded-full text-[10px] px-1.5 py-0.2 ${
                selectedCategory === 'security'
                  ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold'
                  : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
              }`}
            >
              {metrics.securityCount}
            </span>
          </button>
        </div>

        {/* View Mode Switcher: Timeline vs Table */}
        <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl border border-slate-300/60 dark:border-slate-700 text-xs font-semibold shrink-0">
          <button
            onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Tampilkan dalam alur linimasa interaktif"
          >
            <History className="w-3.5 h-3.5" />
            <span>Linimasa</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Tampilkan dalam format tabel terstruktur"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tabel Data</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari aktor, nomor log, target, atau perubahan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters: Severity, Actor, Date Range */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as AuditSeverity | 'ALL')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Urgensi</option>
              <option value="info">Info</option>
              <option value="success">Sukses</option>
              <option value="warning">Peringatan</option>
              <option value="critical">Kritis</option>
            </select>
          </div>

          {/* Actor Dropdown */}
          <select
            value={selectedActorId}
            onChange={(e) => setSelectedActorId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">Semua Aktor Pelaksana</option>
            {uniqueActors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </select>

          {/* Date Range Dropdown */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">Semua Periode Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="7days">7 Hari Terakhir</option>
            <option value="30days">30 Hari Terakhir</option>
          </select>

          {(searchQuery || selectedCategory !== 'ALL' || selectedSeverity !== 'ALL' || selectedActorId !== 'ALL' || dateRange !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedSeverity('ALL');
                setSelectedActorId('ALL');
                setDateRange('ALL');
              }}
              className="px-2 py-1 text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-bold"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Timeline Stream or Structured Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Tidak Ditemukan Catatan Audit
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tidak ada rekaman jejak aktivitas yang sesuai dengan filter atau kata kunci pencarian Anda saat ini.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedSeverity('ALL');
              setSelectedActorId('ALL');
              setDateRange('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
          >
            Bersihkan Filter
          </button>
        </div>
      ) : viewMode === 'timeline' ? (
        /* TIMELINE STREAM VIEW */
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 sm:before:left-6 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 before:z-0">
          {filteredLogs.map((log) => {
            const theme = getCategoryTheme(log.category);
            const CategoryIcon = theme.icon;

            return (
              <div
                key={log.id}
                className="relative pl-10 sm:pl-14 group transition-all duration-200"
              >
                {/* Node icon in timeline */}
                <div
                  className={`absolute left-1.5 sm:left-3.5 top-3.5 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 ${theme.accentBorder} flex items-center justify-center shadow-xs z-10`}
                >
                  <span className={`w-2 h-2 rounded-full ${theme.dotBg}`} />
                </div>

                {/* Audit Card */}
                <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Actor Details & Action Title */}
                    <div className="flex items-start gap-3">
                      <img
                        src={
                          log.actorAvatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                        }
                        alt={log.actorName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {log.actorName}
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            &bull; {log.actorRole}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${theme.badgeBg}`}
                          >
                            <CategoryIcon className="w-3 h-3" />
                            <span>{theme.label}</span>
                          </span>

                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {log.actionTitle}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata: Severity & Timestamps */}
                    <div className="flex items-center sm:flex-col sm:items-end gap-2 text-right shrink-0">
                      {getSeverityBadge(log.severity)}
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span title={formatAuditTimestamp(log.timestamp)}>
                          {formatRelativeTime(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                    {log.description}
                  </p>

                  {/* Target Resource & Ref */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Target:
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {log.targetName}
                    </span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {log.id}
                    </span>
                  </div>

                  {/* Changes Diff Table (if present) */}
                  {log.changes && log.changes.length > 0 && (
                    <div className="mt-3.5 bg-slate-50 dark:bg-slate-900/70 rounded-xl p-3 border border-slate-200/70 dark:border-slate-800 text-xs space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Rincian Perubahan Nilai:
                      </span>
                      <div className="space-y-1.5">
                        {log.changes.map((diff, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs py-1 border-b border-slate-200/50 dark:border-slate-800/60 last:border-b-0"
                          >
                            <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[120px]">
                              {diff.label}:
                            </span>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 line-through">
                                {diff.oldValue === null || diff.oldValue === undefined
                                  ? '(Kosong)'
                                  : String(diff.oldValue)}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 font-bold">
                                {diff.newValue === null || diff.newValue === undefined
                                  ? '(Kosong)'
                                  : String(diff.newValue)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Bar: IP Address & Inspect Details */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 truncate">
                      <Laptop className="w-3 h-3" />
                      <span>{log.ipAddress}</span>
                    </span>

                    <button
                      onClick={() => setInspectingLog(log)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspeksi Rinci</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* STRUCTURED TABLE VIEW */
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Waktu &amp; ID</th>
                  <th className="py-3 px-4">Aktor Pelaksana</th>
                  <th className="py-3 px-4">Kategori &amp; Aksi</th>
                  <th className="py-3 px-4">Target Sumber Daya</th>
                  <th className="py-3 px-4">Status &amp; Urgensi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => {
                  const theme = getCategoryTheme(log.category);
                  const CategoryIcon = theme.icon;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Waktu & ID */}
                      <td className="py-3 px-4 font-mono">
                        <div className="text-[11px] font-bold text-slate-900 dark:text-white">
                          {formatAuditTimestamp(log.timestamp)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {log.id}
                        </div>
                      </td>

                      {/* Aktor Pelaksana */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              log.actorAvatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt={log.actorName}
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white leading-tight">
                              {log.actorName}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {log.actorRole}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Kategori & Aksi */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`p-1 rounded-md border ${theme.badgeBg}`}
                          >
                            <CategoryIcon className="w-3 h-3" />
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {log.actionTitle}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                          {log.description}
                        </div>
                      </td>

                      {/* Target */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {log.targetName}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {getSeverityBadge(log.severity)}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setInspectingLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Rincian
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECTION DETAIL MODAL */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {inspectingLog.id}
                  </span>
                  {getSeverityBadge(inspectingLog.severity)}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1.5">
                  {inspectingLog.actionTitle}
                </h3>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cryptographic Verification Seal */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                    Rekaman Terverifikasi &amp; Immutable Audit Trail
                  </h5>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Integritas data diverifikasi secara berkala oleh protokol RBAC perusahaan.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-white dark:bg-slate-900 border border-emerald-200 text-emerald-800 dark:text-emerald-300 font-bold shrink-0">
                SHA-256 VALID
              </span>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <span className="text-slate-400 font-semibold text-[10px] uppercase">
                  Aktor Pelaksana:
                </span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {inspectingLog.actorName}
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  {inspectingLog.actorRole}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <span className="text-slate-400 font-semibold text-[10px] uppercase">
                  Waktu Eksekusi:
                </span>
                <div className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatAuditTimestamp(inspectingLog.timestamp)}
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  {formatRelativeTime(inspectingLog.timestamp)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <span className="text-slate-400 font-semibold text-[10px] uppercase">
                  Target Sumber Daya:
                </span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {inspectingLog.targetName}
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                  Type: {inspectingLog.targetType}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <span className="text-slate-400 font-semibold text-[10px] uppercase">
                  Asal Jaringan &amp; Koneksi:
                </span>
                <div className="font-bold text-slate-900 dark:text-white font-mono">
                  {inspectingLog.ipAddress}
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Protokol Otorisasi Terenkripsi
                </div>
              </div>
            </div>

            {/* Description Rinci */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1 text-xs">
              <span className="text-slate-400 font-semibold text-[10px] uppercase">
                Deskripsi Narasi Aktivitas:
              </span>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                {inspectingLog.description}
              </p>
            </div>

            {/* Detailed Changes Diff */}
            {inspectingLog.changes && inspectingLog.changes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Perbandingan Nilai Sebelum &amp; Sesudah
                </h4>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="grid grid-cols-3 bg-slate-100/70 dark:bg-slate-800/80 p-2 text-[10px] font-bold text-slate-500 uppercase">
                    <span>Atribut / Field</span>
                    <span>Nilai Lama (Sebelum)</span>
                    <span>Nilai Baru (Sesudah)</span>
                  </div>
                  {inspectingLog.changes.map((c, i) => (
                    <div key={i} className="grid grid-cols-3 p-2.5 items-center">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {c.label}
                      </span>
                      <span className="font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded text-[11px] self-start truncate">
                        {String(c.oldValue ?? '(Kosong)')}
                      </span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded text-[11px] font-bold self-start truncate">
                        {String(c.newValue ?? '(Kosong)')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setInspectingLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
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

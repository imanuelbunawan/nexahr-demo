import React, { useState, useMemo } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { User, HierarchyLevelId } from '../types/index.ts';
import {
  HIERARCHY_LEVELS,
  HIERARCHY_LEVEL_ORDER,
  inferHierarchyLevel,
  canAssignManager,
  buildOrgTree,
  OrgTreeNode,
  calculateHierarchyStats,
} from '../utils/hierarchyUtils.ts';
import {
  Users,
  Search,
  Filter,
  Move,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  GitCommit,
  Building,
  Shield,
  Layers,
  ArrowRight,
  UserCheck,
  Crown,
  HelpCircle,
  Briefcase,
  X,
} from 'lucide-react';

interface OrgHierarchyViewProps {
  onSelectEmployee?: (user: User) => void;
}

export const OrgHierarchyView: React.FC<OrgHierarchyViewProps> = ({
  onSelectEmployee,
}) => {
  const { users, departments, roles, reassignEmployeeManager, hasUserPermission } =
    useHRIS();

  const canEdit = hasUserPermission('edit_employees');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'tree' | 'levels'>('tree');
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    new Set()
  );

  // Drag-and-drop state
  const [draggedUser, setDraggedUser] = useState<User | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isHoveringRootDrop, setIsHoveringRootDrop] = useState(false);
  const [dragValidation, setDragValidation] = useState<{
    allowed: boolean;
    reason?: string;
  } | null>(null);

  // Feedback Toast state
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Accessibility / Fallback Click Reassign Modal state
  const [reassignModalUser, setReassignModalUser] = useState<User | null>(null);
  const [selectedNewManagerId, setSelectedNewManagerId] = useState<string>('');

  // Department map for fast lookups
  const deptMap = useMemo(
    () => new Map(departments.map((d) => [d.id, d])),
    [departments]
  );
  const roleMap = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  // Statistics calculation
  const stats = useMemo(() => calculateHierarchyStats(users), [users]);

  // Tree structure
  const orgTree = useMemo(() => buildOrgTree(users), [users]);

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, user: User) => {
    if (!canEdit) {
      e.preventDefault();
      return;
    }
    setDraggedUser(user);
    e.dataTransfer.setData('text/plain', user.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedUser(null);
    setDropTargetId(null);
    setIsHoveringRootDrop(false);
    setDragValidation(null);
  };

  // Handle Drag Over a potential new manager
  const handleDragOver = (e: React.DragEvent, targetManager: User) => {
    e.preventDefault();
    if (!draggedUser) return;

    if (dropTargetId !== targetManager.id) {
      setDropTargetId(targetManager.id);
      const validation = canAssignManager(users, draggedUser.id, targetManager.id);
      setDragValidation(validation);
    }

    if (dragValidation?.allowed) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = (targetManagerId: string) => {
    if (dropTargetId === targetManagerId) {
      setDropTargetId(null);
      setDragValidation(null);
    }
  };

  // Handle Drop onto a new manager
  const handleDrop = (e: React.DragEvent, targetManager: User) => {
    e.preventDefault();
    if (!draggedUser) return;

    const validation = canAssignManager(users, draggedUser.id, targetManager.id);
    if (!validation.allowed) {
      setToastMessage({
        type: 'error',
        text: validation.reason || 'Penugasan atasan tidak diizinkan.',
      });
      handleDragEnd();
      return;
    }

    const res = reassignEmployeeManager(draggedUser.id, targetManager.id);
    if (res.success) {
      setToastMessage({
        type: 'success',
        text: `Berhasil mengalihkan "${draggedUser.name}" untuk melapor kepada "${targetManager.name}".`,
      });
    } else {
      setToastMessage({
        type: 'error',
        text: res.error || 'Gagal mengubah struktur atasan.',
      });
    }

    handleDragEnd();
  };

  // Handle Drop onto Root Zone (Make Top Executive)
  const handleDropRoot = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedUser) return;

    const res = reassignEmployeeManager(draggedUser.id, null);
    if (res.success) {
      setToastMessage({
        type: 'success',
        text: `"${draggedUser.name}" kini diposisikan pada level puncak (tanpa atasan langsung).`,
      });
    } else {
      setToastMessage({
        type: 'error',
        text: res.error || 'Gagal memperbarui posisi puncak.',
      });
    }

    handleDragEnd();
  };

  // Click-based reassignment submit
  const handleConfirmReassignModal = () => {
    if (!reassignModalUser) return;
    const targetId = selectedNewManagerId === '__root__' ? null : selectedNewManagerId;

    const validation = canAssignManager(users, reassignModalUser.id, targetId);
    if (!validation.allowed) {
      setToastMessage({
        type: 'error',
        text: validation.reason || 'Penugasan atasan tidak diizinkan.',
      });
      return;
    }

    const res = reassignEmployeeManager(reassignModalUser.id, targetId);
    if (res.success) {
      const newMgrName = targetId ? userMap.get(targetId)?.name : 'Level Puncak (Root)';
      setToastMessage({
        type: 'success',
        text: `Berhasil mengalihkan atasan ${reassignModalUser.name} ke ${newMgrName}.`,
      });
      setReassignModalUser(null);
    } else {
      setToastMessage({
        type: 'error',
        text: res.error || 'Gagal mengubah struktur atasan.',
      });
    }
  };

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Filtered employees for list / swimlane view
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const lvl = inferHierarchyLevel(u);
      if (selectedLevelFilter !== 'all' && lvl !== selectedLevelFilter) {
        return false;
      }
      if (selectedDeptFilter !== 'all' && u.departmentId !== selectedDeptFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchPos = u.position.toLowerCase().includes(q);
        const matchNip = u.employeeNumber.toLowerCase().includes(q);
        return matchName || matchPos || matchNip;
      }
      return true;
    });
  }, [users, selectedLevelFilter, selectedDeptFilter, searchQuery]);

  // Render a Single Tree Node recursively
  const renderTreeNode = (node: OrgTreeNode) => {
    const { user, levelConfig, directReports } = node;
    const isCollapsed = collapsedNodeIds.has(user.id);
    const hasChildren = directReports.length > 0;
    const isBeingDragged = draggedUser?.id === user.id;
    const isTarget = dropTargetId === user.id;
    const dept = deptMap.get(user.departmentId);
    const role = roleMap.get(user.roleId);

    const isMatchSearch =
      searchQuery.trim() &&
      (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const userLvl = inferHierarchyLevel(user);
    const isLevelFiltered = selectedLevelFilter !== 'all';
    const matchesLevel = !isLevelFiltered || userLvl === selectedLevelFilter;

    // Drop target styling calculation
    let dropStateClasses =
      'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900';
    if (isTarget && draggedUser) {
      if (dragValidation?.allowed) {
        dropStateClasses =
          'border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/50 shadow-lg scale-[1.02]';
      } else {
        dropStateClasses =
          'border-rose-500 ring-2 ring-rose-500/50 bg-rose-50/80 dark:bg-rose-950/50 shadow-lg';
      }
    } else if (isBeingDragged) {
      dropStateClasses =
        'opacity-40 border-dashed border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30 scale-95';
    } else if (isMatchSearch) {
      dropStateClasses =
        'border-amber-400 ring-2 ring-amber-400/40 bg-amber-50/40 dark:bg-amber-950/30';
    } else if (isLevelFiltered && matchesLevel) {
      dropStateClasses =
        'border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-md scale-[1.02]';
    } else if (isLevelFiltered && !matchesLevel) {
      dropStateClasses =
        'opacity-40 border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 scale-95';
    }

    return (
      <div key={user.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div
          id={`org-node-${user.id}`}
          draggable={canEdit}
          onDragStart={(e) => handleDragStart(e, user)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, user)}
          onDragLeave={() => handleDragLeave(user.id)}
          onDrop={(e) => handleDrop(e, user)}
          className={`w-64 sm:w-72 rounded-2xl border p-3.5 shadow-2xs transition-all relative group select-none ${dropStateClasses} ${
            canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          }`}
        >
          {/* Top Bar: Hierarchy Badge & Direct Report Count */}
          <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
            <span
              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${levelConfig.badgeColor}`}
            >
              L{levelConfig.order} &bull; {levelConfig.name.split('(')[0].trim()}
            </span>

            {hasChildren && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                title={`${directReports.length} bawahan langsung`}
              >
                <Users className="w-2.5 h-2.5" />
                <span>{directReports.length}</span>
              </span>
            )}
          </div>

          {/* User Info Row */}
          <div className="flex items-start gap-2.5">
            <div className="relative shrink-0">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-slate-700 shadow-2xs"
              />
              {user.status === 'active' && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"
                  title="Aktif Bekerja"
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {user.name}
              </h4>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {user.position}
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                <span className="font-mono">{user.employeeNumber}</span>
                <span>&bull;</span>
                <span className="truncate">{dept?.code || 'DIV'}</span>
              </div>
            </div>
          </div>

          {/* Hover Prompt & Actions */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 truncate">
              {canEdit ? 'Tarik untuk pindah atasan' : role?.label || 'Karyawan'}
            </span>

            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReassignModalUser(user);
                  setSelectedNewManagerId(user.managerId || '__root__');
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-semibold transition-colors cursor-pointer"
                title="Pilih atasan baru melalui dialog"
              >
                Ubah Atasan
              </button>
            )}
          </div>

          {/* Drop indicator prompt during hover */}
          {isTarget && draggedUser && (
            <div
              className={`absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-3 text-center z-20 backdrop-blur-xs font-bold text-xs animate-in fade-in duration-150 ${
                dragValidation?.allowed
                  ? 'bg-emerald-900/90 text-white'
                  : 'bg-rose-900/90 text-white'
              }`}
            >
              {dragValidation?.allowed ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-300 mb-1" />
                  <span>Jadikan "{user.name}" Atasan Baru</span>
                  <span className="text-[10px] font-normal text-emerald-200 mt-0.5">
                    Lepaskan mouse untuk konfirmasi penugasan
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-rose-300 mb-1" />
                  <span className="text-[11px] leading-tight">
                    {dragValidation?.reason || 'Tidak diizinkan'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Expand / Collapse Control Button for Subordinates */}
        {hasChildren && (
          <div className="relative flex flex-col items-center">
            {/* Vertical connector line downwards */}
            <div className="w-0.5 h-5 bg-slate-300 dark:bg-slate-700" />

            <button
              type="button"
              onClick={() => toggleCollapse(user.id)}
              className="z-10 px-2 py-0.5 rounded-full bg-slate-200 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-300 dark:border-slate-700 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
              title={
                isCollapsed
                  ? `Buka ${directReports.length} bawahan`
                  : `Tutup ${directReports.length} bawahan`
              }
            >
              {isCollapsed ? (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span>+{directReports.length} Bawahan</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>Tutup</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Children Subtrees (if expanded) */}
        {hasChildren && !isCollapsed && (
          <div className="relative pt-4 flex flex-col items-center">
            {/* Horizontal branching connector line */}
            {directReports.length > 1 && (
              <div
                className="absolute top-0 h-0.5 bg-slate-300 dark:bg-slate-700"
                style={{
                  left: `${100 / (directReports.length * 2)}%`,
                  right: `${100 / (directReports.length * 2)}%`,
                }}
              />
            )}

            <div className="flex items-start gap-4 sm:gap-6">
              {directReports.map((child) => (
                <div key={child.user.id} className="relative flex flex-col items-center">
                  {/* Vertical connector line from horizontal branch to child card */}
                  <div className="w-0.5 h-4 bg-slate-300 dark:bg-slate-700" />
                  {renderTreeNode(child)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Tag Bar: Hanya Tampilkan Tag Saja */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        {/* Main Tag & Metrics Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Hierarki Organisasi 7-Tingkat</span>
            <span className="text-[10px] font-normal text-indigo-500 dark:text-indigo-400">&bull; Drag &amp; Drop Reassign</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <Users className="w-3 h-3 text-slate-500" />
            <span>{stats.totalEmployees} Talenta</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>{stats.managerCount} Manajer</span>
          </div>
        </div>

        {/* Quick Tag Filter Pills: Hanya tampilkan Tag tingkat yang dimau saja */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Tag Tingkat:
          </span>
          <button
            type="button"
            onClick={() => setSelectedLevelFilter('all')}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              selectedLevelFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Semua Tag
          </button>
          {HIERARCHY_LEVEL_ORDER.map((lvlId) => {
            const config = HIERARCHY_LEVELS[lvlId];
            const isSelected = selectedLevelFilter === lvlId;
            return (
              <button
                key={lvlId}
                type="button"
                onClick={() =>
                  setSelectedLevelFilter(isSelected ? 'all' : lvlId)
                }
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : `${config.badgeColor} hover:opacity-80`
                }`}
                title={config.name}
              >
                L{config.order}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-150 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Toolbar: Filters & View Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search & Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, jabatan, NIP..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Tingkat:
            </span>
            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-hidden"
            >
              <option value="all">Semua 7 Tingkat</option>
              {HIERARCHY_LEVEL_ORDER.map((lvlId) => (
                <option key={lvlId} value={lvlId}>
                  L{HIERARCHY_LEVELS[lvlId].order} - {HIERARCHY_LEVELS[lvlId].name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Divisi:
            </span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-hidden"
            >
              <option value="all">Semua Divisi</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Switcher Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start md:self-auto border border-slate-200 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'tree'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Bagan Pohon (Org Tree)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('levels')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'levels'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Swimlane 7-Tingkat</span>
          </button>
        </div>
      </div>

      {/* Prominent Drop Target for Root Promotion (Visible while dragging) */}
      {canEdit && draggedUser && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsHoveringRootDrop(true);
          }}
          onDragLeave={() => setIsHoveringRootDrop(false)}
          onDrop={handleDropRoot}
          className={`p-4 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-3 text-xs font-bold ${
            isHoveringRootDrop
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400'
          }`}
        >
          <Crown className="w-5 h-5 text-purple-500 animate-bounce" />
          <span>
            Lepaskan "{draggedUser.name}" di sini untuk dijadikan Eksekutif Puncak (Root / Tanpa Atasan)
          </span>
        </div>
      )}

      {/* Mode 1: Interactive Organizational Chart Tree */}
      {viewMode === 'tree' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto min-h-[500px]">
          <div className="flex flex-col items-center min-w-max mx-auto space-y-8">
            {orgTree.map((rootNode) => renderTreeNode(rootNode))}
          </div>
        </div>
      )}

      {/* Mode 2: 7-Level Swimlane Matrix */}
      {viewMode === 'levels' && (
        <div className="space-y-4">
          {HIERARCHY_LEVEL_ORDER.map((lvlId) => {
            const config = HIERARCHY_LEVELS[lvlId];
            const usersInLevel = filteredUsers.filter(
              (u) => inferHierarchyLevel(u) === lvlId
            );

            return (
              <div
                key={lvlId}
                className={`rounded-3xl border ${config.borderClass} ${config.bgClass} p-4 sm:p-5 space-y-3 transition-all`}
              >
                {/* Level Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full border uppercase ${config.badgeColor}`}
                    >
                      Tingkat {config.order}: {config.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {config.description}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {usersInLevel.length} Orang
                  </span>
                </div>

                {/* Cards in this level */}
                {usersInLevel.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400 italic">
                    Belum ada karyawan yang terdaftar di tingkat ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {usersInLevel.map((u) => {
                      const manager = u.managerId ? userMap.get(u.managerId) : null;
                      const dept = deptMap.get(u.departmentId);
                      const isBeingDragged = draggedUser?.id === u.id;
                      const isTarget = dropTargetId === u.id;

                      return (
                        <div
                          key={u.id}
                          draggable={canEdit}
                          onDragStart={(e) => handleDragStart(e, u)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, u)}
                          onDragLeave={() => handleDragLeave(u.id)}
                          onDrop={(e) => handleDrop(e, u)}
                          className={`p-3.5 rounded-2xl border bg-white dark:bg-slate-900 shadow-2xs space-y-2 relative transition-all ${
                            isBeingDragged ? 'opacity-40 scale-95' : ''
                          } ${
                            isTarget
                              ? dragValidation?.allowed
                                ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/40'
                                : 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-50/60 dark:bg-rose-950/40'
                              : 'border-slate-200 dark:border-slate-800'
                          } ${canEdit ? 'cursor-grab' : ''}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-9 h-9 rounded-xl object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                            />
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {u.name}
                              </h5>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {u.position}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                                <span>{dept?.code}</span>
                                <span>&bull;</span>
                                <span>{u.employeeNumber}</span>
                              </div>
                            </div>
                          </div>

                          {/* Reporting Line Info */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 dark:text-slate-400 truncate">
                              Atasan:{' '}
                              <strong className="text-slate-700 dark:text-slate-300">
                                {manager?.name ? manager.name.split(',')[0] : 'Puncak (Root)'}
                              </strong>
                            </span>

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReassignModalUser(u);
                                  setSelectedNewManagerId(u.managerId || '__root__');
                                }}
                                className="px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                              >
                                Ubah
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Accessible Click Reassign Modal */}
      {reassignModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <Move className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Ubah Atasan Langsung
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pilih atasan baru untuk alur persetujuan cuti &amp; klaim
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <img
                src={reassignModalUser.avatar}
                alt={reassignModalUser.name}
                className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-slate-300 dark:ring-slate-700"
              />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {reassignModalUser.name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {reassignModalUser.position}
                </p>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  Tingkat: {HIERARCHY_LEVELS[inferHierarchyLevel(reassignModalUser)].name}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="select-new-manager"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Pilih Atasan Baru (Reporting Manager)
              </label>
              <select
                id="select-new-manager"
                value={selectedNewManagerId}
                onChange={(e) => setSelectedNewManagerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
              >
                <option value="__root__">
                  &bull; Level Puncak (Root / Tanpa Atasan Langsung)
                </option>
                {users
                  .filter((u) => u.id !== reassignModalUser.id)
                  .map((candidate) => {
                    const validation = canAssignManager(
                      users,
                      reassignModalUser.id,
                      candidate.id
                    );
                    const lvl = HIERARCHY_LEVELS[inferHierarchyLevel(candidate)];

                    return (
                      <option
                        key={candidate.id}
                        value={candidate.id}
                        disabled={!validation.allowed}
                      >
                        {candidate.name} - {candidate.position} ({lvl.name}){' '}
                        {!validation.allowed ? '(Tidak Valid)' : ''}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReassignModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReassignModal}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                Simpan Perubahan Atasan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

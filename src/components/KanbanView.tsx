import React, { useState, useMemo, useEffect } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { KanbanTask, TaskStatus, TaskPriority, Department } from '../types/index.ts';
import {
  KANBAN_COLUMNS,
  filterTasks,
  groupTasksByStatus,
  groupTasksByDepartmentAndStatus,
  calculateKanbanStats,
  formatTaskDueDate,
  getPriorityMeta,
} from '../utils/kanbanUtils.ts';
import {
  inferHierarchyLevel,
  HIERARCHY_LEVELS,
  HIERARCHY_LEVEL_ORDER,
} from '../utils/hierarchyUtils.ts';
import {
  Kanban as KanbanIcon,
  Plus,
  Search,
  Filter,
  Building2,
  Users,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Edit2,
  X,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Rows3,
  Briefcase,
  Tag as TagIcon,
  ShieldCheck,
  Check,
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  UserPlus,
  UserCheck,
  Clock,
} from 'lucide-react';

// Department styling metadata for clear visual division
const DEPARTMENT_THEMES: Record<
  string,
  {
    badgeClass: string;
    borderClass: string;
    bgHeaderClass: string;
    accentDot: string;
  }
> = {
  dept_it: {
    badgeClass:
      'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    borderClass: 'border-indigo-200/90 dark:border-indigo-900/60',
    bgHeaderClass: 'bg-indigo-50/60 dark:bg-indigo-950/30',
    accentDot: 'bg-indigo-500',
  },
  dept_hr: {
    badgeClass:
      'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    borderClass: 'border-emerald-200/90 dark:border-emerald-900/60',
    bgHeaderClass: 'bg-emerald-50/60 dark:bg-emerald-950/30',
    accentDot: 'bg-emerald-500',
  },
  dept_fin: {
    badgeClass:
      'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    borderClass: 'border-amber-200/90 dark:border-amber-900/60',
    bgHeaderClass: 'bg-amber-50/60 dark:bg-amber-950/30',
    accentDot: 'bg-amber-500',
  },
  dept_mkt: {
    badgeClass:
      'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    borderClass: 'border-purple-200/90 dark:border-purple-900/60',
    bgHeaderClass: 'bg-purple-50/60 dark:bg-purple-950/30',
    accentDot: 'bg-purple-500',
  },
  dept_ops: {
    badgeClass:
      'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    borderClass: 'border-sky-200/90 dark:border-sky-900/60',
    bgHeaderClass: 'bg-sky-50/60 dark:bg-sky-950/30',
    accentDot: 'bg-sky-500',
  },
};

export const KanbanView: React.FC = () => {
  const {
    tasks,
    users,
    departments,
    currentUser,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    hasUserPermission,
  } = useHRIS();

  // Fast user lookup map
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  // Current user's department and hierarchy resolution
  const userDept = useMemo(
    () => departments.find((d) => d.id === currentUser.departmentId) || departments[0],
    [departments, currentUser.departmentId]
  );
  const userLevelId = useMemo(() => inferHierarchyLevel(currentUser), [currentUser]);
  const userLevel = HIERARCHY_LEVELS[userLevelId];

  // Super Admin / Owner or C-Level / VP have company-wide oversight
  const isOwnerOrCLevel = useMemo(
    () => currentUser.roleId === 'role_owner' || userLevelId === 'c_level',
    [currentUser.roleId, userLevelId]
  );

  const isSuperAdminOrExecutive = useMemo(
    () =>
      isOwnerOrCLevel ||
      userLevelId === 'vp_director',
    [isOwnerOrCLevel, userLevelId]
  );

  const defaultScopeForUser: 'my_dept' | 'all_depts' = isOwnerOrCLevel ? 'all_depts' : 'my_dept';

  // Scope filter:
  // 'all_depts' = all departments (DEFAULT for Owner / C-Level)
  // 'my_dept' = strictly user's division (DEFAULT for Manager / Staff)
  // 'my_position' = only tasks assigned to user's position
  const [kanbanScope, setKanbanScope] = useState<'my_dept' | 'my_position' | 'all_depts'>(
    defaultScopeForUser
  );

  // View modes: 'swimlane' (divided by Management department) or 'board' (unified 4-column)
  const [viewMode, setViewMode] = useState<'swimlane' | 'board'>('swimlane');

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>(
    isOwnerOrCLevel ? 'ALL' : currentUser.departmentId || 'ALL'
  );
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | 'ALL'>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(null);

  // Reset scope and filters cleanly whenever active user changes
  useEffect(() => {
    const nextIsOwner = currentUser.roleId === 'role_owner' || inferHierarchyLevel(currentUser) === 'c_level';
    setKanbanScope(nextIsOwner ? 'all_depts' : 'my_dept');
    setSelectedDept(nextIsOwner ? 'ALL' : currentUser.departmentId || 'ALL');
    setSelectedAssignee('ALL');
    setSelectedLevel('ALL');
    setSelectedTag('ALL');
    setPendingDeleteTaskId(null);
  }, [currentUser]);

  // Department collapse state in swimlane mode
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Modal State (Create / Edit)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);

  // Reject Modal State (Alur Review -> Reject dengan Catatan)
  const [rejectModalTask, setRejectModalTask] = useState<KanbanTask | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // Assign PIC Modal State (Tunjuk / Ganti PIC)
  const [assignModalTask, setAssignModalTask] = useState<KanbanTask | null>(null);
  const [selectedNewAssigneeId, setSelectedNewAssigneeId] = useState('');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState(currentUser.departmentId || '');
  const [formAssigneeId, setFormAssigneeId] = useState('');
  const [formPriority, setFormPriority] = useState<TaskPriority>('MEDIUM');
  const [formDueDate, setFormDueDate] = useState('');
  const [formTags, setFormTags] = useState('');

  // Extract all tags from current scope tasks ("hanya tampilkan Tag mau saja")
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if ((kanbanScope === 'my_dept' || !isSuperAdminOrExecutive) && t.departmentId !== currentUser.departmentId) {
        return;
      }
      if (kanbanScope === 'my_position' && t.assigneeId !== currentUser.id) {
        return;
      }
      if (kanbanScope === 'all_depts' && isSuperAdminOrExecutive && selectedDept !== 'ALL' && t.departmentId !== selectedDept) {
        return;
      }
      t.tags.forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort();
  }, [tasks, kanbanScope, isSuperAdminOrExecutive, selectedDept, currentUser.departmentId, currentUser.id]);

  // Tasks filtered by scope, division, position, hierarchy level, priority, and search (before tag filter)
  const tasksBeforeTagFilter = useMemo(() => {
    let effectiveDept = selectedDept;
    if (kanbanScope === 'my_dept' || !isSuperAdminOrExecutive) {
      effectiveDept = currentUser.departmentId;
    } else if (kanbanScope === 'my_position') {
      effectiveDept = isSuperAdminOrExecutive ? 'ALL' : currentUser.departmentId;
    } else if (kanbanScope === 'all_depts' && isSuperAdminOrExecutive) {
      effectiveDept = selectedDept;
    }

    const baseFiltered = filterTasks(tasks, {
      departmentId: effectiveDept,
      assigneeId: selectedAssignee,
      priority: selectedPriority,
      searchQuery,
    });

    return baseFiltered.filter((task) => {
      // 1. Scope: My Position / Assigned Tasks
      if (kanbanScope === 'my_position') {
        if (task.assigneeId !== currentUser.id) return false;
      }

      // 2. Filter by Hierarchy Level / Jabatan
      if (selectedLevel !== 'ALL') {
        const assignee = userMap.get(task.assigneeId);
        if (!assignee) return false;
        const lvl = inferHierarchyLevel(assignee);
        if (lvl !== selectedLevel) return false;
      }

      return true;
    });
  }, [
    tasks,
    kanbanScope,
    selectedDept,
    selectedAssignee,
    selectedPriority,
    selectedLevel,
    searchQuery,
    currentUser.departmentId,
    currentUser.id,
    isSuperAdminOrExecutive,
    userMap,
  ]);

  // Filtered tasks across global search, division, position, hierarchy level, and tags
  const filteredTasks = useMemo(() => {
    if (selectedTag === 'ALL') return tasksBeforeTagFilter;
    return tasksBeforeTagFilter.filter((task) => task.tags.includes(selectedTag));
  }, [tasksBeforeTagFilter, selectedTag]);

  // Grouped by Management Department (Swimlanes) - strictly scoped to user division unless executive
  const departmentGroups = useMemo(() => {
    let activeDepts: Department[] = [];

    if (kanbanScope === 'my_dept' || !isSuperAdminOrExecutive) {
      activeDepts = departments.filter((d) => d.id === currentUser.departmentId);
    } else if (kanbanScope === 'my_position') {
      const matching = departments.filter((d) =>
        filteredTasks.some((t) => t.departmentId === d.id)
      );
      activeDepts =
        matching.length > 0
          ? matching
          : departments.filter((d) => d.id === currentUser.departmentId);
    } else if (isSuperAdminOrExecutive && kanbanScope === 'all_depts') {
      activeDepts =
        selectedDept === 'ALL'
          ? departments
          : departments.filter((d) => d.id === selectedDept);
    } else {
      activeDepts = departments.filter((d) => d.id === currentUser.departmentId);
    }

    return groupTasksByDepartmentAndStatus(filteredTasks, activeDepts);
  }, [
    filteredTasks,
    departments,
    selectedDept,
    kanbanScope,
    isSuperAdminOrExecutive,
    currentUser.departmentId,
  ]);

  // Grouped by Status for the unified 4-column view
  const unifiedGroupedTasks = useMemo(() => {
    return groupTasksByStatus(filteredTasks);
  }, [filteredTasks]);

  // Overall organization workload stats for current filtered scope
  const overallStats = useMemo(() => {
    return calculateKanbanStats(filteredTasks);
  }, [filteredTasks]);

  // Toggle single department collapse
  const toggleDeptCollapse = (deptId: string) => {
    setCollapsedDepts((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  };

  // Expand / collapse all departments
  const handleExpandAll = () => {
    setCollapsedDepts({});
  };

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    departments.forEach((d) => {
      next[d.id] = true;
    });
    setCollapsedDepts(next);
  };

  // Open modal for Create (with optional pre-selected department)
  const handleOpenCreateModal = (defaultDeptId?: string) => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormDepartmentId(
      defaultDeptId || currentUser.departmentId || departments[0]?.id || 'dept_it'
    );
    setFormAssigneeId(currentUser.id);
    setFormPriority('MEDIUM');
    setFormDueDate('2026-11-05');
    setFormTags('Operasional, Manajemen');
    setIsTaskModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (task: KanbanTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description);
    setFormDepartmentId(task.departmentId);
    setFormAssigneeId(task.assigneeId);
    setFormPriority(task.priority);
    setFormDueDate(task.dueDate);
    setFormTags(task.tags.join(', '));
    setIsTaskModalOpen(true);
  };

  // Save Task (Create or Update)
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const parsedTags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (editingTask) {
      updateTask(editingTask.id, {
        title: formTitle,
        description: formDescription,
        departmentId: formDepartmentId,
        assigneeId: formAssigneeId,
        priority: formPriority,
        dueDate: formDueDate,
        tags: parsedTags,
      });
    } else {
      addTask({
        title: formTitle,
        description: formDescription,
        status: 'TODO',
        priority: formPriority,
        departmentId: formDepartmentId,
        assigneeId: formAssigneeId,
        dueDate: formDueDate,
        tags: parsedTags.length > 0 ? parsedTags : ['Tugas Umum'],
      });
    }

    setIsTaskModalOpen(false);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (
    e: React.DragEvent,
    targetStatus: TaskStatus,
    targetDeptId?: string
  ) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      updateTaskStatus(taskId, targetStatus);
      if (targetDeptId) {
        updateTask(taskId, { departmentId: targetDeptId });
      }
    }
    setDraggedTaskId(null);
  };

  // Column next / previous status transitions
  const getNextStatus = (current: TaskStatus): TaskStatus | null => {
    if (current === 'TODO') return 'IN_PROGRESS';
    if (current === 'IN_PROGRESS') return 'IN_REVIEW';
    if (current === 'IN_REVIEW') return 'DONE';
    return null;
  };

  const getPrevStatus = (current: TaskStatus): TaskStatus | null => {
    if (current === 'DONE') return 'IN_REVIEW';
    if (current === 'IN_REVIEW') return 'IN_PROGRESS';
    if (current === 'IN_PROGRESS') return 'TODO';
    return null;
  };

  // Alur Kerja Interaktif Handlers
  const handleClaimTask = (taskId: string) => {
    updateTask(taskId, { assigneeId: currentUser.id });
  };

  const handleStartProgress = (task: KanbanTask) => {
    const assigneeId = task.assigneeId || currentUser.id;
    updateTask(task.id, {
      status: 'IN_PROGRESS',
      assigneeId,
    });
  };

  const handleRequestReview = (taskId: string) => {
    updateTaskStatus(taskId, 'IN_REVIEW');
  };

  const handleOpenRejectModal = (task: KanbanTask) => {
    setRejectModalTask(task);
    setRejectNote(task.reviewNote || '');
  };

  const handleConfirmReject = () => {
    if (rejectModalTask) {
      updateTask(rejectModalTask.id, {
        status: 'IN_PROGRESS',
        reviewNote: rejectNote.trim() || 'Perlu perbaikan/revisi sebelum disetujui.',
        reviewedBy: currentUser.id,
        reviewedAt: new Date().toISOString(),
      });
      setRejectModalTask(null);
      setRejectNote('');
    }
  };

  const handleApproveTask = (taskId: string) => {
    updateTask(taskId, {
      status: 'DONE',
      completedAt: new Date().toISOString(),
      reviewNote: undefined,
      reviewedBy: currentUser.id,
      reviewedAt: new Date().toISOString(),
    });
  };

  const handleOpenAssignModal = (task: KanbanTask) => {
    setAssignModalTask(task);
    setSelectedNewAssigneeId(task.assigneeId || currentUser.id);
  };

  const handleConfirmAssign = () => {
    if (assignModalTask && selectedNewAssigneeId) {
      updateTask(assignModalTask.id, {
        assigneeId: selectedNewAssigneeId,
      });
      setAssignModalTask(null);
    }
  };

  // Render a single task card with position and interactive tags
  const renderTaskCard = (task: KanbanTask, showDeptBadge: boolean = false) => {
    const assignee = users.find((u) => u.id === task.assigneeId);
    const dept = departments.find((d) => d.id === task.departmentId);
    const priorityMeta = getPriorityMeta(task.priority);
    const dueInfo = formatTaskDueDate(task.dueDate);
    const nextCol = getNextStatus(task.status);
    const prevCol = getPrevStatus(task.status);
    const deptTheme = DEPARTMENT_THEMES[task.departmentId] || DEPARTMENT_THEMES.dept_it;

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2 group"
      >
        {/* Top: ID, Priority, and optional Department badge */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold text-slate-400">
              {task.id}
            </span>
            {showDeptBadge && dept && (
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${deptTheme.badgeClass}`}
                title={dept.name}
              >
                {dept.code}
              </span>
            )}
          </div>

          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${priorityMeta.badgeClass}`}
          >
            {priorityMeta.label}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Tags - Clickable to filter by tag ("hanya tampilkan Tag mau saja") */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag) => {
              const isTagActive = selectedTag === tag;
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTag(isTagActive ? 'ALL' : tag);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all cursor-pointer ${
                    isTagActive
                      ? 'bg-indigo-600 text-white font-bold ring-1 ring-indigo-500 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600'
                  }`}
                  title={isTagActive ? 'Klik untuk membatalkan filter tag' : `Klik untuk hanya tampilkan tag #${tag}`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        )}

        {/* Meta & Assignee Footer with Jabatan & Level */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
          {/* Assignee Avatar & Position info */}
          <div
            className="flex items-center gap-1.5 min-w-0"
            title={assignee ? `${assignee.name} • ${assignee.position}` : undefined}
          >
            {assignee ? (
              <>
                <img
                  src={assignee.avatar}
                  alt={assignee.name}
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-500/30 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {assignee.name.split(' ')[0]}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                      {inferHierarchyLevel(assignee).toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate block max-w-[120px]">
                    {assignee.position}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-[11px] text-slate-400">Tanpa PIC</span>
            )}
          </div>

          {/* Due Date Indicator */}
          <div
            className={`flex items-center gap-1 text-[10px] font-medium shrink-0 ${
              dueInfo.isOverdue && task.status !== 'DONE'
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : dueInfo.isToday
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-400 dark:text-slate-500'
            }`}
            title={`Tenggat waktu: ${task.dueDate}`}
          >
            <Calendar className="w-3 h-3" />
            <span>{dueInfo.label}</span>
          </div>
        </div>

        {/* Review Note Alert if Task was previously Rejected back to In Progress */}
        {task.status === 'IN_PROGRESS' && task.reviewNote && (
          <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl p-2.5 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Catatan Revisi dari Reviewer:
            </div>
            <p className="mt-1 text-[11px] text-rose-800 dark:text-rose-200 leading-relaxed italic bg-white/60 dark:bg-slate-900/40 p-2 rounded-lg border border-rose-100 dark:border-rose-900/60">
              "{task.reviewNote}"
            </p>
          </div>
        )}

        {/* Workflow Action Buttons (Alur Kerja Terarah) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
          {/* Kolom 1: TODO (Belum Dikerjakan) */}
          {task.status === 'TODO' && (
            <div className="space-y-1.5">
              {!task.assigneeId ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleClaimTask(task.id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center gap-1 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                    title="Ambil tugas ini untuk dikerjakan sendiri"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Ambil Tugas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAssignModal(task)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-600 transition-all cursor-pointer"
                    title="Tunjuk personil lain sebagai PIC"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Tunjuk PIC
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                    PIC: <strong className="text-slate-700 dark:text-slate-300">{assignee?.name.split(' ')[0]}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenAssignModal(task)}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    <UserPlus className="w-2.5 h-2.5" />
                    Ganti PIC
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleStartProgress(task)}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all hover:scale-[1.01] cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Mulai Kerjakan
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </div>
          )}

          {/* Kolom 2: IN_PROGRESS (Sedang Berjalan) */}
          {task.status === 'IN_PROGRESS' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold px-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                  Sedang Dikerjakan
                </span>
                <span className="text-slate-400 dark:text-slate-500">
                  {assignee?.name.split(' ')[0] || 'PIC'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRequestReview(task.id)}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20 transition-all hover:scale-[1.01] cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Selesai Dikerjakan & Ajukan Review
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </div>
          )}

          {/* Kolom 3: IN_REVIEW (Tahap Peninjauan & QA) */}
          {task.status === 'IN_REVIEW' && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-900/60">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                Menunggu Evaluasi / Reviewer
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleOpenRejectModal(task)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
                  title="Tolak hasil kerja dan kembalikan dengan catatan revisi"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject / Revisi
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveTask(task.id)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm shadow-emerald-600/20 transition-all hover:scale-[1.01] cursor-pointer"
                  title="Setujui hasil kerja dan tandai selesai"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve / Selesai
                </button>
              </div>
            </div>
          )}

          {/* Kolom 4: DONE (Selesai) */}
          {task.status === 'DONE' && (
            <div className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Tervalidasi Selesai
            </div>
          )}
        </div>

        {/* Interactive Move & Actions Bar */}
        <div className="pt-1.5 flex items-center justify-between gap-1 text-slate-400 border-t border-dashed border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-1">
            {prevCol && (
              <button
                onClick={() => updateTaskStatus(task.id, prevCol)}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 transition-colors"
                title={`Pindahkan ke ${
                  KANBAN_COLUMNS.find((c) => c.id === prevCol)?.title || 'kolom sebelumnya'
                }`}
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
            )}
            {nextCol && (
              <button
                onClick={() => updateTaskStatus(task.id, nextCol)}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 transition-colors"
                title={`Pindahkan ke ${
                  KANBAN_COLUMNS.find((c) => c.id === nextCol)?.title || 'kolom berikutnya'
                }`}
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasUserPermission('edit_kanban') && (
              <button
                onClick={() => handleOpenEditModal(task)}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 transition-colors"
                title="Edit Rincian Tugas"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
            {hasUserPermission('delete_kanban') && (
              pendingDeleteTaskId === task.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      deleteTask(task.id);
                      setPendingDeleteTaskId(null);
                    }}
                    className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => setPendingDeleteTaskId(null)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setPendingDeleteTaskId(task.id)}
                  className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Hapus Tugas"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200/60 dark:border-indigo-800/60 mb-1">
            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
            <span>Papan Tugas Sesuai Divisi &amp; Jabatan Kerja</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <KanbanIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Papan Kanban Tugas Kerja Divisi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Alur kerja tugas tim terisolasi secara aman sesuai divisi kerja dan jabatan pimpinan/staf.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* View Mode Toggle: Swimlane vs Unified Grid */}
          <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl border border-slate-300/60 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setViewMode('swimlane')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'swimlane'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Tampilkan per baris/jalur Bagian Manajemen (Swimlanes)"
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span>Jalur Manajemen</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Tampilkan dalam 4 kolom matriks umum"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Matriks Umum</span>
            </button>
          </div>

          {hasUserPermission('create_kanban') && (
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Tugas</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Workload Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            {kanbanScope === 'all_depts'
              ? 'Total Tugas Perusahaan'
              : kanbanScope === 'my_position'
              ? 'Total Tugas Jabatan Saya'
              : 'Total Tugas Divisi'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {overallStats.totalCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Item terdaftar
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            Sedang Berjalan
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {overallStats.inProgressCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Eksekusi aktif
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            Tahap Review &amp; QA
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {overallStats.inReviewCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Menunggu verifikasi
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            Tingkat Penyelesaian
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {overallStats.completionRate}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ({overallStats.doneCount} selesai)
            </span>
          </div>
        </div>
      </div>

      {/* Scope Indicator: Divisi & Jabatan Aktif ("sesuai dengan divisi nya/ jabatan") */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 dark:from-indigo-950/40 dark:via-slate-800/80 dark:to-purple-950/40 rounded-2xl p-4 sm:p-4.5 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                {kanbanScope === 'all_depts' ? 'ALL' : userDept.code}
              </span>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {kanbanScope === 'all_depts'
                  ? 'Seluruh Divisi Perusahaan'
                  : `Divisi ${userDept.name}`}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {currentUser.roleId === 'role_owner' ? 'Super Admin / Owner' : userLevel.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {kanbanScope === 'all_depts' ? (
                <>
                  Menampilkan seluruh tugas kerja lintas semua divisi (<strong>{departments.length} divisi</strong>) untuk otorisasi <strong>{currentUser.position}</strong>.
                </>
              ) : kanbanScope === 'my_position' ? (
                <>
                  Menampilkan tugas kerja yang ditugaskan khusus kepada <strong>{currentUser.name}</strong> (<strong>{currentUser.position}</strong>).
                </>
              ) : (
                <>
                  Menampilkan alur kerja tugas untuk jabatan <strong>{currentUser.position}</strong> pada divisi <strong>{userDept.name}</strong>.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Scope Mode Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-xs font-semibold self-start md:self-auto flex-wrap shrink-0">
          <button
            onClick={() => {
              setKanbanScope('my_dept');
              setSelectedDept(currentUser.departmentId);
              setSelectedAssignee('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              kanbanScope === 'my_dept'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Divisi Saya ({userDept.code})</span>
          </button>
          <button
            onClick={() => {
              setKanbanScope('my_position');
              setSelectedAssignee(currentUser.id);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              kanbanScope === 'my_position'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Tugas Jabatan Saya ({currentUser.name.split(' ')[0]})</span>
          </button>
          {isSuperAdminOrExecutive && (
            <button
              onClick={() => {
                setKanbanScope('all_depts');
                setSelectedDept('ALL');
                setSelectedAssignee('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                kanbanScope === 'all_depts'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Akses pengawasan menyeluruh untuk level Eksekutif / Super Admin"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Semua Divisi Perusahaan</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Tag Filter Bar ("hanya tampilkan Tag mau saja") */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0 pr-2 border-r border-slate-200 dark:border-slate-700">
          <TagIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Filter Tag:</span>
        </div>

        <button
          onClick={() => setSelectedTag('ALL')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
            selectedTag === 'ALL'
              ? 'bg-indigo-600 text-white font-bold shadow-2xs'
              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Semua Tag
        </button>

        {availableTags.map((tag) => {
          const isActive = selectedTag === tag;
          const count = tasksBeforeTagFilter.filter((t) => t.tags.includes(tag)).length;
          return (
            <button
              key={tag}
              onClick={() => setSelectedTag(isActive ? 'ALL' : tag)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white font-bold shadow-2xs ring-1 ring-indigo-500'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600'
              }`}
              title={`Hanya tampilkan tugas dengan tag #${tag}`}
            >
              <span>#{tag}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {selectedTag !== 'ALL' && (
          <button
            onClick={() => setSelectedTag('ALL')}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold shrink-0 pl-1 flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Reset Tag</span>
          </button>
        )}
      </div>

      {/* Bagian Manajemen Selector Tabs (HANYA untuk Super Admin / Eksekutif dalam mode Semua Divisi) */}
      {isSuperAdminOrExecutive && kanbanScope === 'all_depts' && (
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
          <div
            role="tablist"
            aria-label="Filter Bagian Manajemen"
            className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shrink-0 shadow-2xs backdrop-blur-xs"
          >
            <button
              role="tab"
              aria-selected={selectedDept === 'ALL'}
              onClick={() => setSelectedDept('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 border active:scale-[0.98] cursor-pointer ${
                selectedDept === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border-slate-200/90 dark:border-slate-700/90 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50 border-transparent font-medium'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${selectedDept === 'ALL' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span>Semua Bagian Manajemen</span>
              <span
                className={`font-mono tabular-nums rounded-full transition-colors ${
                  selectedDept === 'ALL'
                    ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 font-bold text-[11px] px-2 py-0.5'
                    : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 text-[10px] px-1.5 py-0.5'
                }`}
              >
                {tasks.length}
              </span>
            </button>

            {departments.map((dept) => {
              const count = tasks.filter((t) => t.departmentId === dept.id).length;
              const isSelected = selectedDept === dept.id;
              const theme = DEPARTMENT_THEMES[dept.id] || DEPARTMENT_THEMES.dept_it;

              return (
                <button
                  key={dept.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedDept(dept.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 border active:scale-[0.98] cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border-slate-200/90 dark:border-slate-700/90 shadow-xs font-bold ring-1 ring-indigo-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50 border-transparent font-medium'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${theme.accentDot} ${
                      isSelected ? 'ring-2 ring-indigo-300 dark:ring-indigo-600' : ''
                    }`}
                  />
                  <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 uppercase">
                    {dept.code}
                  </span>
                  <span className="truncate max-w-[140px] sm:max-w-none">{dept.name}</span>
                  <span
                    className={`font-mono tabular-nums rounded-full transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 font-bold text-[11px] px-2 py-0.5'
                        : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 text-[10px] px-1.5 py-0.5'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {viewMode === 'swimlane' && selectedDept === 'ALL' && (
            <div className="flex items-center gap-1 shrink-0 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs backdrop-blur-xs text-xs">
              <button
                onClick={handleExpandAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900 font-semibold text-[11px] transition-all cursor-pointer shadow-2xs"
                title="Buka semua jalur bagian manajemen"
              >
                <ChevronDown className="w-3 h-3 text-slate-400" />
                <span>Buka Semua</span>
              </button>
              <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />
              <button
                onClick={handleCollapseAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900 font-semibold text-[11px] transition-all cursor-pointer shadow-2xs"
                title="Tutup semua jalur bagian manajemen"
              >
                <ChevronUp className="w-3 h-3 text-slate-400" />
                <span>Tutup Semua</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full lg:w-64 xl:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tugas, instruksi, atau tagar..."
            className="w-full pl-9 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter (Only for Executive in all_depts mode, otherwise locked to userDept) */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {isSuperAdminOrExecutive && kanbanScope === 'all_depts' ? (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Departemen</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs py-1.5 px-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 font-bold">
                {userDept.name} ({userDept.code})
              </span>
            )}
          </div>

          {/* Level / Jabatan Filter ("sesuai dengan divisi nya/ jabatan") */}
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Tingkat Jabatan</option>
              {HIERARCHY_LEVEL_ORDER.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {HIERARCHY_LEVELS[lvl].name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Semua PIC / Assignee</option>
              <option value={currentUser.id}>Tugas Saya ({currentUser.name.split(' ')[0]})</option>
              {users
                .filter((u) => u.id !== currentUser.id && (kanbanScope === 'all_depts' || u.departmentId === currentUser.departmentId))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.position.split(' ')[0]})
                  </option>
                ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as any)}
              className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Prioritas</option>
              <option value="URGENT">Mendesak / Urgent</option>
              <option value="HIGH">Tinggi</option>
              <option value="MEDIUM">Menengah</option>
              <option value="LOW">Rendah</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: SWIMLANES DIVIDED BY MANAGEMENT SECTION */}
      {viewMode === 'swimlane' && (
        <div className="space-y-6">
          {departmentGroups.map((group) => {
            const { department, tasks: deptTasks, columns, stats: deptStats } = group;
            const theme = DEPARTMENT_THEMES[department.id] || DEPARTMENT_THEMES.dept_it;
            const isCollapsed = collapsedDepts[department.id] ?? false;

            return (
              <section
                key={department.id}
                className={`bg-white dark:bg-slate-900/90 rounded-2xl border ${theme.borderClass} shadow-2xs overflow-hidden transition-all`}
              >
                {/* Department Section Header Card */}
                <div
                  className={`p-4 sm:p-5 ${theme.bgHeaderClass} border-b ${theme.borderClass} flex flex-col md:flex-row md:items-center justify-between gap-4`}
                >
                  {/* Left: Division info */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleDeptCollapse(department.id)}
                      className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title={isCollapsed ? 'Buka Jalur Divisi' : 'Sembunyikan Jalur Divisi'}
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronUp className="w-5 h-5" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono uppercase tracking-wider border ${theme.badgeClass}`}
                        >
                          {department.code}
                        </span>
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                          {department.name}
                        </h2>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>Pimpinan: <strong>{department.managerName}</strong></span>
                        <span>&bull;</span>
                        <span>{department.location}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Metrics & Actions */}
                  <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
                    {/* Status Pill Counts */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                        {deptStats.todoCount} Rencana
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                        {deptStats.inProgressCount} Berjalan
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                        {deptStats.inReviewCount} Review
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                        {deptStats.doneCount} Selesai
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="hidden sm:flex items-center gap-2 min-w-[130px]">
                      <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${deptStats.completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {deptStats.completionRate}%
                      </span>
                    </div>

                    {/* Add Task in this specific management division */}
                    {hasUserPermission('create_kanban') && (
                      <button
                        onClick={() => handleOpenCreateModal(department.id)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-indigo-200 dark:border-indigo-900/60 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs hover:scale-[1.02] cursor-pointer"
                        title={`Tambah tugas untuk bagian ${department.name}`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Tambah Tugas</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 4-Columns Board for this Department */}
                {!isCollapsed && (
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 items-start">
                      {KANBAN_COLUMNS.map((col) => {
                        const colTasks = columns[col.id] || [];

                        return (
                          <div
                            key={col.id}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id, department.id)}
                            className="bg-slate-50/70 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200/70 dark:border-slate-800 flex flex-col min-h-[220px] transition-colors"
                          >
                            {/* Column Header */}
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70 dark:border-slate-800">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    col.id === 'TODO'
                                      ? 'bg-slate-400'
                                      : col.id === 'IN_PROGRESS'
                                      ? 'bg-indigo-500'
                                      : col.id === 'IN_REVIEW'
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {col.title}
                                </span>
                              </div>
                              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                {colTasks.length}
                              </span>
                            </div>

                            {/* Task Cards */}
                            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[460px] pr-0.5">
                              {colTasks.length === 0 ? (
                                <div className="py-6 px-2 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                  <p className="text-[11px] text-slate-400">
                                    Tarik tugas ke kolom ini
                                  </p>
                                </div>
                              ) : (
                                colTasks.map((task) => renderTaskCard(task, false))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: UNIFIED 4-COLUMNS BOARD */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((column) => {
            const colTasks = unifiedGroupedTasks[column.id] || [];

            return (
              <div
                key={column.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
                className="bg-slate-100/70 dark:bg-slate-900/50 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col min-h-[460px] transition-colors"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        column.id === 'TODO'
                          ? 'bg-slate-400'
                          : column.id === 'IN_PROGRESS'
                          ? 'bg-indigo-500'
                          : column.id === 'IN_REVIEW'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {column.title}
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        {column.description}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs border border-slate-200/80 dark:border-slate-700">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards Stack */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[640px] pr-1">
                  {colTasks.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-400 font-medium">
                        Belum ada tugas di kolom ini.
                      </p>
                    </div>
                  ) : (
                    colTasks.map((task) => renderTaskCard(task, true))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingTask ? 'Edit Tugas Kerja' : 'Tambah Tugas Kerja Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3.5">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Tugas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Pembaruan API Gateway & Otorisasi RBAC"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Rincian Instruksi
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Jelaskan ruang lingkup pekerjaan, kriteria tuntas, atau referensi berkas..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Department & Assignee Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bagian Manajemen (Departemen) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formDepartmentId}
                    onChange={(e) => setFormDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    {isSuperAdminOrExecutive ? (
                      departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))
                    ) : (
                      <option value={userDept.id}>
                        {userDept.name} ({userDept.code})
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Penanggung Jawab (PIC)
                  </label>
                  <select
                    value={formAssigneeId}
                    onChange={(e) => setFormAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {users
                      .filter((u) => isSuperAdminOrExecutive || u.departmentId === currentUser.departmentId)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.position})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Priority & Due Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Prioritas
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="LOW">Rendah (Low)</option>
                    <option value="MEDIUM">Menengah (Medium)</option>
                    <option value="HIGH">Tinggi (High)</option>
                    <option value="URGENT">Mendesak (Urgent)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tenggat Waktu (Due Date)
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Label Tags (pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Contoh: Infrastruktur, Security, Q4"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  {editingTask ? 'Simpan Perubahan' : 'Buat Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reject dengan Catatan Revisi */}
      {rejectModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800 shadow-2xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tolak & Minta Revisi Tugas
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ID Tugas: <strong className="font-mono text-slate-700 dark:text-slate-300">{rejectModalTask.id}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {rejectModalTask.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>PIC:</span>
                <strong className="text-slate-700 dark:text-slate-300">
                  {users.find((u) => u.id === rejectModalTask.assigneeId)?.name || 'Belum ada PIC'}
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Catatan Kesalahan & Instruksi Revisi <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Contoh: Validasi form belum menangani input kosong dan format tanggal belum sesuai standar. Mohon diperbaiki sebelum deploy..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Catatan ini akan tampil jelas di kartu PIC saat tugas dikembalikan ke kolom <strong>Sedang Berjalan</strong>.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalTask(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Kembalikan untuk Direvisi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tunjuk / Ganti PIC */}
      {assignModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tunjuk Penanggung Jawab (PIC)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ID Tugas: <strong className="font-mono text-slate-700 dark:text-slate-300">{assignModalTask.id}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {assignModalTask.title}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Pilih Karyawan sebagai PIC <span className="text-indigo-500">*</span>
              </label>
              <select
                value={selectedNewAssigneeId}
                onChange={(e) => setSelectedNewAssigneeId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-semibold"
              >
                <option value="">-- Pilih PIC Pelaksana --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.position} ({departments.find((d) => d.id === u.departmentId)?.code || 'DIV'})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAssignModalTask(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAssign}
                disabled={!selectedNewAssigneeId}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tetapkan PIC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { KanbanTask, TaskStatus, TaskPriority, Department } from '../types/index.ts';

export interface KanbanColumnConfig {
  id: TaskStatus;
  title: string;
  description: string;
  accentColor: string;
}

export interface DepartmentKanbanGroup {
  department: Department;
  tasks: KanbanTask[];
  columns: Record<TaskStatus, KanbanTask[]>;
  stats: KanbanStatsSummary;
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'TODO',
    title: 'Belum Dikerjakan',
    description: 'Antrean rencana kerja',
    accentColor: 'slate',
  },
  {
    id: 'IN_PROGRESS',
    title: 'Sedang Berjalan',
    description: 'Dalam proses eksekusi aktif',
    accentColor: 'indigo',
  },
  {
    id: 'IN_REVIEW',
    title: 'Tahap Peninjauan',
    description: 'Menunggu review atasan / QA',
    accentColor: 'amber',
  },
  {
    id: 'DONE',
    title: 'Selesai',
    description: 'Tuntas dan tervalidasi',
    accentColor: 'emerald',
  },
];

export interface KanbanStatsSummary {
  totalCount: number;
  todoCount: number;
  inProgressCount: number;
  inReviewCount: number;
  doneCount: number;
  urgentCount: number;
  completionRate: number; // percentage (0-100)
}

/**
 * Filter tasks by status, department, assignee, priority, and search query.
 */
export function filterTasks(
  tasks: KanbanTask[],
  filters: {
    status?: TaskStatus | 'ALL';
    departmentId?: string;
    assigneeId?: string;
    priority?: TaskPriority | 'ALL';
    searchQuery?: string;
  }
): KanbanTask[] {
  return tasks.filter((task) => {
    if (filters.status && filters.status !== 'ALL' && task.status !== filters.status) {
      return false;
    }
    if (
      filters.departmentId &&
      filters.departmentId !== 'ALL' &&
      task.departmentId !== filters.departmentId
    ) {
      return false;
    }
    if (
      filters.assigneeId &&
      filters.assigneeId !== 'ALL' &&
      task.assigneeId !== filters.assigneeId
    ) {
      return false;
    }
    if (
      filters.priority &&
      filters.priority !== 'ALL' &&
      task.priority !== filters.priority
    ) {
      return false;
    }
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      const matchTags = task.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Groups tasks by their status column.
 */
export function groupTasksByStatus(
  tasks: KanbanTask[]
): Record<TaskStatus, KanbanTask[]> {
  const grouped: Record<TaskStatus, KanbanTask[]> = {
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    DONE: [],
  };

  tasks.forEach((task) => {
    if (grouped[task.status]) {
      grouped[task.status].push(task);
    } else {
      grouped.TODO.push(task);
    }
  });

  return grouped;
}

/**
 * Groups tasks by Management Department, providing partitioned column states and department-level stats.
 */
export function groupTasksByDepartmentAndStatus(
  tasks: KanbanTask[],
  departments: Department[]
): DepartmentKanbanGroup[] {
  return departments.map((dept) => {
    const deptTasks = tasks.filter((t) => t.departmentId === dept.id);
    const columns = groupTasksByStatus(deptTasks);
    const stats = calculateKanbanStats(deptTasks);
    return {
      department: dept,
      tasks: deptTasks,
      columns,
      stats,
    };
  });
}

/**
 * Updates a task's status and updates completion timestamp if status is DONE.
 */
export function moveTaskStatus(
  tasks: KanbanTask[],
  taskId: string,
  newStatus: TaskStatus,
  nowIsoString: string = new Date().toISOString()
): KanbanTask[] {
  return tasks.map((task) => {
    if (task.id === taskId) {
      return {
        ...task,
        status: newStatus,
        completedAt: newStatus === 'DONE' ? nowIsoString : undefined,
      };
    }
    return task;
  });
}

/**
 * Calculates executive workload statistics across all work items.
 */
export function calculateKanbanStats(tasks: KanbanTask[]): KanbanStatsSummary {
  const totalCount = tasks.length;
  let todoCount = 0;
  let inProgressCount = 0;
  let inReviewCount = 0;
  let doneCount = 0;
  let urgentCount = 0;

  tasks.forEach((task) => {
    if (task.status === 'TODO') todoCount++;
    if (task.status === 'IN_PROGRESS') inProgressCount++;
    if (task.status === 'IN_REVIEW') inReviewCount++;
    if (task.status === 'DONE') doneCount++;
    if (task.priority === 'URGENT' || task.priority === 'HIGH') urgentCount++;
  });

  const completionRate =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return {
    totalCount,
    todoCount,
    inProgressCount,
    inReviewCount,
    doneCount,
    urgentCount,
    completionRate,
  };
}

/**
 * Formats due date with overdue / today indicators.
 */
export function formatTaskDueDate(
  dueDateStr: string,
  referenceDateStr: string = '2026-10-25'
): { label: string; isOverdue: boolean; isToday: boolean } {
  if (!dueDateStr) return { label: '-', isOverdue: false, isToday: false };

  const isToday = dueDateStr === referenceDateStr;
  const isOverdue = dueDateStr < referenceDateStr;

  const parts = dueDateStr.split('-');
  if (parts.length === 3) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return {
      label: `${day} ${months[monthIdx] || parts[1]}`,
      isOverdue,
      isToday,
    };
  }

  return { label: dueDateStr, isOverdue, isToday };
}

/**
 * Color and label properties for task priority tags.
 */
export function getPriorityMeta(priority: TaskPriority): {
  label: string;
  badgeClass: string;
} {
  switch (priority) {
    case 'URGENT':
      return {
        label: 'Mendesak / Urgent',
        badgeClass:
          'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900',
      };
    case 'HIGH':
      return {
        label: 'Tinggi',
        badgeClass:
          'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900',
      };
    case 'MEDIUM':
      return {
        label: 'Menengah',
        badgeClass:
          'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900',
      };
    case 'LOW':
    default:
      return {
        label: 'Rendah',
        badgeClass:
          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      };
  }
}

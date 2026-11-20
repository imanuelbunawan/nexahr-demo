import test from 'node:test';
import assert from 'node:assert';
import {
  filterTasks,
  groupTasksByStatus,
  groupTasksByDepartmentAndStatus,
  moveTaskStatus,
  calculateKanbanStats,
  formatTaskDueDate,
  getPriorityMeta,
} from './kanbanUtils.ts';
import { KanbanTask, Department } from '../types/index.ts';

const sampleTasks: KanbanTask[] = [
  {
    id: 'T1',
    title: 'Migrasi Database Cloud',
    description: 'Setup koneksi pool dan failover cluster',
    status: 'TODO',
    priority: 'HIGH',
    assigneeId: 'u1',
    departmentId: 'dept_it',
    dueDate: '2026-10-30',
    tags: ['Tech', 'DevOps'],
    createdAt: '2026-10-20T00:00:00Z',
    createdBy: 'u1',
  },
  {
    id: 'T2',
    title: 'Review Payroll & Tunjangan',
    description: 'Perhitungan lembur staf operasional',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    assigneeId: 'u2',
    departmentId: 'dept_hr',
    dueDate: '2026-10-25',
    tags: ['HR', 'Payroll'],
    createdAt: '2026-10-22T00:00:00Z',
    createdBy: 'u2',
  },
  {
    id: 'T3',
    title: 'Audit Hak Akses RBAC',
    description: 'Validasi matriks izin peran',
    status: 'IN_REVIEW',
    priority: 'MEDIUM',
    assigneeId: 'u1',
    departmentId: 'dept_it',
    dueDate: '2026-10-28',
    tags: ['Security', 'RBAC'],
    createdAt: '2026-10-21T00:00:00Z',
    createdBy: 'u1',
  },
  {
    id: 'T4',
    title: 'Publikasi Newsletter Internal',
    description: 'Kirim buletin via email perusahaan',
    status: 'DONE',
    priority: 'LOW',
    assigneeId: 'u3',
    departmentId: 'dept_mkt',
    dueDate: '2026-10-24',
    tags: ['Internal', 'Marketing'],
    createdAt: '2026-10-19T00:00:00Z',
    completedAt: '2026-10-24T15:00:00Z',
    createdBy: 'u3',
  },
];

test('groupTasksByStatus correctly partitions tasks across 4 columns', () => {
  const grouped = groupTasksByStatus(sampleTasks);
  assert.strictEqual(grouped.TODO.length, 1);
  assert.strictEqual(grouped.IN_PROGRESS.length, 1);
  assert.strictEqual(grouped.IN_REVIEW.length, 1);
  assert.strictEqual(grouped.DONE.length, 1);
  assert.strictEqual(grouped.TODO[0].id, 'T1');
  assert.strictEqual(grouped.IN_PROGRESS[0].id, 'T2');
});

test('groupTasksByDepartmentAndStatus partitions tasks by department swimlanes', () => {
  const depts: Department[] = [
    { id: 'dept_it', name: 'Technology & Engineering', code: 'ENG', managerName: 'Budi', location: 'Lantai 5' },
    { id: 'dept_hr', name: 'Human Resources & GA', code: 'HRGA', managerName: 'Siti', location: 'Lantai 4' },
    { id: 'dept_fin', name: 'Finance & Accounting', code: 'FIN', managerName: 'Linda', location: 'Lantai 4' },
  ];
  const grouped = groupTasksByDepartmentAndStatus(sampleTasks, depts);
  assert.strictEqual(grouped.length, 3);
  // IT has 2 tasks (T1, T3)
  assert.strictEqual(grouped[0].department.id, 'dept_it');
  assert.strictEqual(grouped[0].tasks.length, 2);
  assert.strictEqual(grouped[0].columns.TODO.length, 1);
  assert.strictEqual(grouped[0].columns.IN_REVIEW.length, 1);
  // HR has 1 task (T2)
  assert.strictEqual(grouped[1].department.id, 'dept_hr');
  assert.strictEqual(grouped[1].tasks.length, 1);
  assert.strictEqual(grouped[1].columns.IN_PROGRESS.length, 1);
  // Finance has 0 tasks
  assert.strictEqual(grouped[2].department.id, 'dept_fin');
  assert.strictEqual(grouped[2].tasks.length, 0);
});

test('moveTaskStatus transitions a task to new column and sets completedAt when DONE', () => {
  const updated = moveTaskStatus(sampleTasks, 'T1', 'DONE', '2026-10-25T12:00:00Z');
  const task1 = updated.find((t) => t.id === 'T1');
  assert.ok(task1);
  assert.strictEqual(task1.status, 'DONE');
  assert.strictEqual(task1.completedAt, '2026-10-25T12:00:00Z');
});

test('filterTasks filters by department, priority, and search query', () => {
  const itTasks = filterTasks(sampleTasks, { departmentId: 'dept_it' });
  assert.strictEqual(itTasks.length, 2);

  const urgentTasks = filterTasks(sampleTasks, { priority: 'URGENT' });
  assert.strictEqual(urgentTasks.length, 1);
  assert.strictEqual(urgentTasks[0].id, 'T2');

  const searchPayroll = filterTasks(sampleTasks, { searchQuery: 'payroll' });
  assert.strictEqual(searchPayroll.length, 1);
  assert.strictEqual(searchPayroll[0].id, 'T2');
});

test('calculateKanbanStats calculates totals and completion rates accurately', () => {
  const stats = calculateKanbanStats(sampleTasks);
  assert.strictEqual(stats.totalCount, 4);
  assert.strictEqual(stats.todoCount, 1);
  assert.strictEqual(stats.inProgressCount, 1);
  assert.strictEqual(stats.inReviewCount, 1);
  assert.strictEqual(stats.doneCount, 1);
  assert.strictEqual(stats.urgentCount, 2); // T1 (HIGH), T2 (URGENT)
  assert.strictEqual(stats.completionRate, 25); // 1 / 4 = 25%
});

test('formatTaskDueDate detects today and overdue dates', () => {
  const todayResult = formatTaskDueDate('2026-10-25', '2026-10-25');
  assert.strictEqual(todayResult.isToday, true);
  assert.strictEqual(todayResult.isOverdue, false);

  const overdueResult = formatTaskDueDate('2026-10-20', '2026-10-25');
  assert.strictEqual(overdueResult.isToday, false);
  assert.strictEqual(overdueResult.isOverdue, true);

  const futureResult = formatTaskDueDate('2026-10-30', '2026-10-25');
  assert.strictEqual(futureResult.isToday, false);
  assert.strictEqual(futureResult.isOverdue, false);
  assert.strictEqual(futureResult.label, '30 Okt');
});

test('getPriorityMeta returns proper badges and labels', () => {
  const urgentMeta = getPriorityMeta('URGENT');
  assert.ok(urgentMeta.label.includes('Urgent'));
  assert.ok(urgentMeta.badgeClass.includes('rose'));

  const lowMeta = getPriorityMeta('LOW');
  assert.strictEqual(lowMeta.label, 'Rendah');
});

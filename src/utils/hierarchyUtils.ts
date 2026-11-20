import { User, HierarchyLevelId, HierarchyLevelConfig } from '../types/index.ts';

export const HIERARCHY_LEVELS: Record<HierarchyLevelId, HierarchyLevelConfig> = {
  c_level: {
    id: 'c_level',
    name: 'C-Level (Eksekutif)',
    order: 1,
    description:
      'Level tertinggi di perusahaan yang bertanggung jawab atas arah strategis bisnis secara keseluruhan.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800',
    bgClass: 'bg-purple-50/50 dark:bg-purple-950/20',
    borderClass: 'border-purple-300 dark:border-purple-700',
    exampleRoles: ['CEO (Chief Executive Officer)', 'CFO', 'CTO', 'COO'],
  },
  vp_director: {
    id: 'vp_director',
    name: 'VP / Director',
    order: 2,
    description:
      'Pemimpin strategis yang membawahi satu pilar bisnis besar dan menjembatani visi eksekutif ke divisi di bawahnya.',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800',
    bgClass: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    borderClass: 'border-indigo-300 dark:border-indigo-700',
    exampleRoles: [
      'VP of Engineering / IT Director',
      'VP of Human Resources',
      'VP of Sales & Marketing',
    ],
  },
  head_division: {
    id: 'head_division',
    name: 'Head of Division / GM',
    order: 3,
    description:
      'Pemimpin operasional tingkat atas yang bertanggung jawab penuh atas satu divisi spesifik beserta anggarannya.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800',
    bgClass: 'bg-blue-50/50 dark:bg-blue-950/20',
    borderClass: 'border-blue-300 dark:border-blue-700',
    exampleRoles: ['Head of IT', 'Head of Finance', 'General Manager Operations'],
  },
  manager: {
    id: 'manager',
    name: 'Manager',
    order: 4,
    description:
      'Pemimpin level menengah yang merencanakan strategi taktis, mengelola KPI, dan membawahi beberapa tim sekaligus.',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800',
    bgClass: 'bg-teal-50/50 dark:bg-teal-950/20',
    borderClass: 'border-teal-300 dark:border-teal-700',
    exampleRoles: ['Engineering Manager', 'HR Manager', 'Finance Manager'],
  },
  supervisor: {
    id: 'supervisor',
    name: 'Supervisor / Team Lead',
    order: 5,
    description:
      'Manajemen garis depan yang langsung mengawasi tugas harian dan menjadi pihak pertama approval cuti/absen/klaim.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
    bgClass: 'bg-amber-50/50 dark:bg-amber-950/20',
    borderClass: 'border-amber-300 dark:border-amber-700',
    exampleRoles: ['IT Supervisor', 'Frontend/Backend Tech Lead', 'HR Supervisor'],
  },
  staff: {
    id: 'staff',
    name: 'Staff / Karyawan Inti',
    order: 6,
    description:
      'Tenaga profesional yang mengeksekusi pekerjaan teknis dan operasional sehari-hari (Senior, Mid, Junior).',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
    bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
    exampleRoles: [
      'Senior Software Engineer',
      'HR Officer / Specialist',
      'Data Analyst',
      'Admin Staff',
    ],
  },
  entry_support: {
    id: 'entry_support',
    name: 'Entry Level / Support',
    order: 7,
    description:
      'Pekerja pendukung operasional, pekerja kontrak jangka pendek, atau program pelatihan.',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    bgClass: 'bg-slate-50/50 dark:bg-slate-900/40',
    borderClass: 'border-slate-300 dark:border-slate-700',
    exampleRoles: [
      'Intern (Anak Magang)',
      'Freelancer / Kontraktor',
      'Office Boy / Security',
    ],
  },
};

export const HIERARCHY_LEVEL_ORDER: HierarchyLevelId[] = [
  'c_level',
  'vp_director',
  'head_division',
  'manager',
  'supervisor',
  'staff',
  'entry_support',
];

/**
 * Infers the hierarchy level of a user based on explicit property, position keywords, or roleId.
 */
export function inferHierarchyLevel(user: User): HierarchyLevelId {
  if (user.hierarchyLevel) {
    return user.hierarchyLevel;
  }

  const pos = (user.position || '').toLowerCase();
  const role = (user.roleId || '').toLowerCase();

  // 1. C-Level (Eksekutif)
  const isCLevel =
    /\b(chief|ceo|cfo|cto|coo|founder|owner)\b/i.test(pos) ||
    pos.includes('chief executive') ||
    pos.includes('chief technology') ||
    pos.includes('chief financial') ||
    pos.includes('chief operating') ||
    role === 'role_owner';

  if (isCLevel) {
    return 'c_level';
  }

  // 2. VP / Director
  if (
    pos.includes('vp') ||
    pos.includes('vice president') ||
    pos.includes('director') ||
    pos.includes('direktur')
  ) {
    return 'vp_director';
  }

  // 3. Head of Division / GM
  if (
    pos.includes('head of') ||
    pos.includes('general manager') ||
    pos.includes('gm ')
  ) {
    return 'head_division';
  }

  // 4. Manager
  if (pos.includes('manager') || role === 'role_manager') {
    return 'manager';
  }

  // 5. Supervisor / Team Lead / Tech Lead
  if (
    pos.includes('lead') ||
    pos.includes('supervisor') ||
    pos.includes('spv') ||
    pos.includes('team lead') ||
    pos.includes('tech lead')
  ) {
    return 'supervisor';
  }

  // 7. Entry Level / Support
  if (
    pos.includes('intern') ||
    pos.includes('magang') ||
    pos.includes('freelance') ||
    pos.includes('kontraktor') ||
    pos.includes('contract') ||
    pos.includes('security') ||
    pos.includes('office boy') ||
    pos.includes('fasilitas')
  ) {
    return 'entry_support';
  }

  // 6. Default to Staff
  return 'staff';
}

/**
 * Gets direct reports for a specific manager ID.
 */
export function getDirectReports(users: User[], managerId: string): User[] {
  return users.filter((u) => u.managerId === managerId);
}

/**
 * Returns a set of all recursive subordinate user IDs for a given user.
 * Used for cycle prevention during drag-and-drop reassignment.
 */
export function getAllDescendantIds(users: User[], managerId: string): Set<string> {
  const descendants = new Set<string>();
  const queue = [managerId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const directReports = users.filter((u) => u.managerId === currentId);

    for (const report of directReports) {
      if (!descendants.has(report.id)) {
        descendants.add(report.id);
        queue.push(report.id);
      }
    }
  }

  return descendants;
}

/**
 * Validates whether an employee can be reassigned to a new manager.
 * Prevents self-assignment and circular reporting chains.
 */
export function canAssignManager(
  users: User[],
  employeeId: string,
  newManagerId: string | null
): { allowed: boolean; reason?: string } {
  // If removing manager (assigning as root)
  if (newManagerId === null) {
    return { allowed: true };
  }

  // Cannot report to self
  if (employeeId === newManagerId) {
    return {
      allowed: false,
      reason: 'Karyawan tidak dapat menjadi atasan langsung untuk dirinya sendiri.',
    };
  }

  const manager = users.find((u) => u.id === newManagerId);
  if (!manager) {
    return {
      allowed: false,
      reason: 'Calon atasan yang dipilih tidak ditemukan dalam sistem.',
    };
  }

  // Cannot report to a subordinate/descendant (cycle detection)
  const descendants = getAllDescendantIds(users, employeeId);
  if (descendants.has(newManagerId)) {
    return {
      allowed: false,
      reason: `Tidak dapat menugaskan "${manager.name}" sebagai atasan karena saat ini merupakan bawahan dari karyawan ini (mencegah siklus hierarki melingkar).`,
    };
  }

  return { allowed: true };
}

/**
 * Immutably updates an employee's managerId and returns the updated user array.
 */
export function reassignEmployeeManager(
  users: User[],
  employeeId: string,
  newManagerId: string | null
): { success: boolean; users: User[]; error?: string } {
  const validation = canAssignManager(users, employeeId, newManagerId);
  if (!validation.allowed) {
    return { success: false, users, error: validation.reason };
  }

  const updatedUsers = users.map((u) => {
    if (u.id === employeeId) {
      return {
        ...u,
        managerId: newManagerId,
      };
    }
    return u;
  });

  return { success: true, users: updatedUsers };
}

export interface OrgTreeNode {
  user: User;
  levelConfig: HierarchyLevelConfig;
  directReports: OrgTreeNode[];
  depth: number;
}

/**
 * Builds an organizational tree rooted at top-level executives (managerId is null or non-existent).
 */
export function buildOrgTree(users: User[]): OrgTreeNode[] {
  const userMap = new Map<string, User>(users.map((u) => [u.id, u]));

  // Find root nodes: users whose managerId is null or not found in userMap
  const rootUsers = users.filter(
    (u) => !u.managerId || !userMap.has(u.managerId)
  );

  // If cyclic or no roots found, fallback to C-Level users or first user
  const effectiveRoots =
    rootUsers.length > 0
      ? rootUsers
      : users.filter((u) => inferHierarchyLevel(u) === 'c_level').length > 0
      ? users.filter((u) => inferHierarchyLevel(u) === 'c_level')
      : users.slice(0, 1);

  function buildSubtree(user: User, depth: number, visited: Set<string>): OrgTreeNode {
    visited.add(user.id);
    const directReports = users.filter(
      (u) => u.managerId === user.id && !visited.has(u.id)
    );

    const children = directReports.map((report) =>
      buildSubtree(report, depth + 1, new Set(visited))
    );

    const levelId = inferHierarchyLevel(user);
    return {
      user,
      levelConfig: HIERARCHY_LEVELS[levelId],
      directReports: children,
      depth,
    };
  }

  return effectiveRoots.map((root) => buildSubtree(root, 0, new Set()));
}

/**
 * Computes hierarchy breakdown and statistics.
 */
export function calculateHierarchyStats(users: User[]) {
  const byLevel: Record<HierarchyLevelId, number> = {
    c_level: 0,
    vp_director: 0,
    head_division: 0,
    manager: 0,
    supervisor: 0,
    staff: 0,
    entry_support: 0,
  };

  let unassignedCount = 0;
  let managerCount = 0;

  users.forEach((u) => {
    const lvl = inferHierarchyLevel(u);
    byLevel[lvl] = (byLevel[lvl] || 0) + 1;

    if (!u.managerId && lvl !== 'c_level') {
      unassignedCount++;
    }

    const reports = users.filter((report) => report.managerId === u.id);
    if (reports.length > 0) {
      managerCount++;
    }
  });

  return {
    totalEmployees: users.length,
    byLevel,
    unassignedCount,
    managerCount,
  };
}

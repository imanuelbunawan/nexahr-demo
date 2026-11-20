import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HIERARCHY_LEVELS,
  HIERARCHY_LEVEL_ORDER,
  inferHierarchyLevel,
  getDirectReports,
  getAllDescendantIds,
  canAssignManager,
  reassignEmployeeManager,
  buildOrgTree,
  calculateHierarchyStats,
} from './hierarchyUtils.ts';
import { User } from '../types/index.ts';

const mockUsers: User[] = [
  {
    id: 'u_ceo',
    name: 'Hendra Pratama',
    email: 'ceo@example.com',
    avatar: '',
    roleId: 'role_owner',
    departmentId: 'dept_it',
    position: 'Chief Executive Officer',
    phone: '',
    joinDate: '2021-01-01',
    status: 'active',
    employeeNumber: 'NX-001',
    managerId: null,
    hierarchyLevel: 'c_level',
  },
  {
    id: 'u_vp_eng',
    name: 'Budi Santoso',
    email: 'vp.eng@example.com',
    avatar: '',
    roleId: 'role_manager',
    departmentId: 'dept_it',
    position: 'VP of Software Engineering',
    phone: '',
    joinDate: '2021-02-01',
    status: 'active',
    employeeNumber: 'NX-002',
    managerId: 'u_ceo',
    hierarchyLevel: 'vp_director',
  },
  {
    id: 'u_head_it',
    name: 'Ahmad Fauzi',
    email: 'head.it@example.com',
    avatar: '',
    roleId: 'role_manager',
    departmentId: 'dept_it',
    position: 'Head of IT Infrastructure',
    phone: '',
    joinDate: '2021-03-01',
    status: 'active',
    employeeNumber: 'NX-003',
    managerId: 'u_vp_eng',
    hierarchyLevel: 'head_division',
  },
  {
    id: 'u_mgr_backend',
    name: 'Citra Dewi',
    email: 'mgr.backend@example.com',
    avatar: '',
    roleId: 'role_manager',
    departmentId: 'dept_it',
    position: 'Engineering Manager Backend',
    phone: '',
    joinDate: '2022-01-01',
    status: 'active',
    employeeNumber: 'NX-004',
    managerId: 'u_head_it',
    hierarchyLevel: 'manager',
  },
  {
    id: 'u_lead_fe',
    name: 'Reza Aditya',
    email: 'reza@example.com',
    avatar: '',
    roleId: 'role_staff_it',
    departmentId: 'dept_it',
    position: 'Frontend Tech Lead',
    phone: '',
    joinDate: '2022-06-01',
    status: 'active',
    employeeNumber: 'NX-005',
    managerId: 'u_mgr_backend',
    hierarchyLevel: 'supervisor',
  },
  {
    id: 'u_staff_dev',
    name: 'Dimas Arya',
    email: 'dimas@example.com',
    avatar: '',
    roleId: 'role_karyawan',
    departmentId: 'dept_it',
    position: 'Software Engineer',
    phone: '',
    joinDate: '2023-01-01',
    status: 'active',
    employeeNumber: 'NX-006',
    managerId: 'u_lead_fe',
    hierarchyLevel: 'staff',
  },
  {
    id: 'u_intern',
    name: 'Kevin Sanjaya',
    email: 'kevin@example.com',
    avatar: '',
    roleId: 'role_karyawan',
    departmentId: 'dept_it',
    position: 'Frontend Intern (Magang)',
    phone: '',
    joinDate: '2024-01-01',
    status: 'active',
    employeeNumber: 'NX-007',
    managerId: 'u_staff_dev',
    hierarchyLevel: 'entry_support',
  },
];

test('Hierarchy levels map 7 levels correctly', () => {
  assert.equal(HIERARCHY_LEVEL_ORDER.length, 7);
  assert.equal(HIERARCHY_LEVELS.c_level.order, 1);
  assert.equal(HIERARCHY_LEVELS.entry_support.order, 7);
});

test('inferHierarchyLevel infers levels based on keywords and roles', () => {
  assert.equal(
    inferHierarchyLevel({ position: 'Chief Operating Officer' } as User),
    'c_level'
  );
  assert.equal(
    inferHierarchyLevel({ position: 'IT Director' } as User),
    'vp_director'
  );
  assert.equal(
    inferHierarchyLevel({ position: 'Head of Finance' } as User),
    'head_division'
  );
  assert.equal(
    inferHierarchyLevel({ position: 'HR Manager' } as User),
    'manager'
  );
  assert.equal(
    inferHierarchyLevel({ position: 'Backend Tech Lead' } as User),
    'supervisor'
  );
  assert.equal(
    inferHierarchyLevel({ position: 'Data Analyst' } as User),
    'staff'
  );
  assert.equal(
    inferHierarchyLevel({ position: 'Staff Intern Magang' } as User),
    'entry_support'
  );
});

test('getAllDescendantIds recursively retrieves all subordinates', () => {
  // Budi (u_vp_eng) manages Ahmad (head) -> Citra (mgr) -> Reza (lead) -> Dimas (staff) -> Kevin (intern)
  const descendants = getAllDescendantIds(mockUsers, 'u_vp_eng');
  assert.equal(descendants.has('u_head_it'), true);
  assert.equal(descendants.has('u_mgr_backend'), true);
  assert.equal(descendants.has('u_lead_fe'), true);
  assert.equal(descendants.has('u_staff_dev'), true);
  assert.equal(descendants.has('u_intern'), true);
  assert.equal(descendants.has('u_ceo'), false);
  assert.equal(descendants.size, 5);
});

test('canAssignManager permits valid reassignment', () => {
  // Moving Kevin (intern) to report directly to Reza (lead)
  const res = canAssignManager(mockUsers, 'u_intern', 'u_lead_fe');
  assert.equal(res.allowed, true);

  // Promoting someone to top-level (null manager)
  const rootRes = canAssignManager(mockUsers, 'u_vp_eng', null);
  assert.equal(rootRes.allowed, true);
});

test('canAssignManager rejects self-assignment', () => {
  const res = canAssignManager(mockUsers, 'u_lead_fe', 'u_lead_fe');
  assert.equal(res.allowed, false);
  assert.match(res.reason || '', /Karyawan tidak dapat menjadi atasan langsung untuk dirinya sendiri/);
});

test('canAssignManager prevents circular reporting loops', () => {
  // Trying to assign Budi (u_vp_eng) to report to Kevin (u_intern) who is his indirect report
  const res = canAssignManager(mockUsers, 'u_vp_eng', 'u_intern');
  assert.equal(res.allowed, false);
  assert.match(res.reason || '', /mencegah siklus hierarki/);
});

test('reassignEmployeeManager immutably updates managerId', () => {
  const result = reassignEmployeeManager(mockUsers, 'u_intern', 'u_lead_fe');
  assert.equal(result.success, true);
  const updatedUser = result.users.find((u) => u.id === 'u_intern');
  assert.equal(updatedUser?.managerId, 'u_lead_fe');

  // Original array remains untouched
  assert.equal(
    mockUsers.find((u) => u.id === 'u_intern')?.managerId,
    'u_staff_dev'
  );
});

test('buildOrgTree constructs valid hierarchy tree structure', () => {
  const tree = buildOrgTree(mockUsers);
  assert.equal(tree.length, 1); // Hendra Pratama (CEO) is root
  assert.equal(tree[0].user.id, 'u_ceo');
  assert.equal(tree[0].directReports.length, 1); // Budi Santoso
  assert.equal(tree[0].directReports[0].user.id, 'u_vp_eng');
});

test('calculateHierarchyStats breaks down counts accurately', () => {
  const stats = calculateHierarchyStats(mockUsers);
  assert.equal(stats.totalEmployees, 7);
  assert.equal(stats.byLevel.c_level, 1);
  assert.equal(stats.byLevel.vp_director, 1);
  assert.equal(stats.byLevel.head_division, 1);
  assert.equal(stats.byLevel.manager, 1);
  assert.equal(stats.byLevel.supervisor, 1);
  assert.equal(stats.byLevel.staff, 1);
  assert.equal(stats.byLevel.entry_support, 1);
});

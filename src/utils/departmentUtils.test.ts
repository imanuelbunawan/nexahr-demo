import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDepartmentInput,
  addDepartmentToList,
  updateDepartmentInList,
  removeDepartmentFromList,
  getDepartmentStats,
} from './departmentUtils.ts';
import { Department, User } from '../types/index.ts';

const mockDepartments: Department[] = [
  {
    id: 'dept_it',
    name: 'Technology & Engineering',
    code: 'ENG',
    managerName: 'Budi Santoso',
    location: 'Lantai 5, Gedung Menara Cyber',
  },
  {
    id: 'dept_hr',
    name: 'Human Resources & General Affairs',
    code: 'HRGA',
    managerName: 'Siti Rahmawati',
    location: 'Lantai 4, Gedung Menara Cyber',
  },
];

const mockUsers: User[] = [
  {
    id: 'usr_1',
    name: 'Dev One',
    email: 'dev1@example.com',
    avatar: '',
    roleId: 'role_staff',
    departmentId: 'dept_it',
    position: 'Frontend Dev',
    phone: '+62812345678',
    joinDate: '2023-01-01',
    status: 'active',
    employeeNumber: 'NX-001',
  },
  {
    id: 'usr_2',
    name: 'HR One',
    email: 'hr1@example.com',
    avatar: '',
    roleId: 'role_hr',
    departmentId: 'dept_hr',
    position: 'HR Officer',
    phone: '+62812345679',
    joinDate: '2023-01-01',
    status: 'active',
    employeeNumber: 'NX-002',
  },
];

describe('Department Utilities', () => {
  describe('validateDepartmentInput', () => {
    it('validates correct department input', () => {
      const res = validateDepartmentInput({
        name: 'Finance & Tax',
        code: 'FIN',
        managerName: 'Ani',
        location: 'Lt 3',
      });
      assert.strictEqual(res.valid, true);
      assert.deepStrictEqual(res.errors, {});
    });

    it('rejects empty department name and code', () => {
      const res = validateDepartmentInput({
        name: '   ',
        code: '',
      });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.name);
      assert.ok(res.errors.code);
    });

    it('rejects too short or too long code', () => {
      const tooShort = validateDepartmentInput({ name: 'Valid Name', code: 'A' });
      assert.strictEqual(tooShort.valid, false);
      assert.ok(tooShort.errors.code);

      const tooLong = validateDepartmentInput({ name: 'Valid Name', code: 'VERYLONGCODE123' });
      assert.strictEqual(tooLong.valid, false);
      assert.ok(tooLong.errors.code);
    });
  });

  describe('addDepartmentToList', () => {
    it('adds a department and formats code to uppercase', () => {
      const result = addDepartmentToList(
        mockDepartments,
        {
          name: ' Product & Design ',
          code: ' prod ',
          managerName: ' Dimas ',
          location: ' Hub 2 ',
        },
        'dept_test_123'
      );

      assert.strictEqual(result.updatedDepartments.length, 3);
      assert.strictEqual(result.newDepartment.id, 'dept_test_123');
      assert.strictEqual(result.newDepartment.name, 'Product & Design');
      assert.strictEqual(result.newDepartment.code, 'PROD');
      assert.strictEqual(result.newDepartment.managerName, 'Dimas');
      assert.strictEqual(result.newDepartment.location, 'Hub 2');
    });
  });

  describe('updateDepartmentInList', () => {
    it('updates specified department attributes and retains other departments', () => {
      const updated = updateDepartmentInList(mockDepartments, 'dept_it', {
        name: 'Cloud & Engineering',
        code: 'cloud',
      });

      const itDept = updated.find((d) => d.id === 'dept_it');
      assert.strictEqual(itDept?.name, 'Cloud & Engineering');
      assert.strictEqual(itDept?.code, 'CLOUD');
      assert.strictEqual(itDept?.managerName, 'Budi Santoso'); // preserved

      const hrDept = updated.find((d) => d.id === 'dept_hr');
      assert.strictEqual(hrDept?.name, 'Human Resources & General Affairs');
    });
  });

  describe('removeDepartmentFromList', () => {
    it('prevents removing if only 1 department exists', () => {
      const singleDept = [mockDepartments[0]];
      const res = removeDepartmentFromList(singleDept, mockUsers, 'dept_it');
      assert.strictEqual(res.success, false);
      assert.match(res.error || '', /minimal satu divisi/i);
    });

    it('safely removes department and reassigns affected users to fallback', () => {
      const res = removeDepartmentFromList(
        mockDepartments,
        mockUsers,
        'dept_it',
        'dept_hr'
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.updatedDepartments.length, 1);
      assert.strictEqual(res.updatedDepartments[0].id, 'dept_hr');
      assert.strictEqual(res.reassignedCount, 1);
      assert.strictEqual(res.reassignedTo?.id, 'dept_hr');

      // User that was in dept_it should now be in dept_hr
      const reassignedUser = res.updatedUsers.find((u) => u.id === 'usr_1');
      assert.strictEqual(reassignedUser?.departmentId, 'dept_hr');
    });
  });

  describe('getDepartmentStats', () => {
    it('calculates employee count correctly per department', () => {
      const stats = getDepartmentStats(mockDepartments, mockUsers);
      assert.strictEqual(stats.length, 2);
      assert.strictEqual(stats.find((s) => s.department.id === 'dept_it')?.employeeCount, 1);
      assert.strictEqual(stats.find((s) => s.department.id === 'dept_hr')?.employeeCount, 1);
    });
  });
});

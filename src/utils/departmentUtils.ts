import { Department, User } from '../types/index.ts';

export interface DepartmentValidationResult {
  valid: boolean;
  errors: {
    name?: string;
    code?: string;
    managerName?: string;
    location?: string;
  };
}

/**
 * Validates department form inputs.
 */
export function validateDepartmentInput(data: {
  name?: string;
  code?: string;
  managerName?: string;
  location?: string;
}): DepartmentValidationResult {
  const errors: DepartmentValidationResult['errors'] = {};

  const nameTrimmed = data.name?.trim() || '';
  if (!nameTrimmed) {
    errors.name = 'Nama divisi wajib diisi.';
  } else if (nameTrimmed.length < 2) {
    errors.name = 'Nama divisi minimal 2 karakter.';
  }

  const codeTrimmed = data.code?.trim() || '';
  if (!codeTrimmed) {
    errors.code = 'Kode divisi wajib diisi.';
  } else if (codeTrimmed.length < 2 || codeTrimmed.length > 10) {
    errors.code = 'Kode divisi harus antara 2-10 karakter.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Pure function to add a department to the list.
 */
export function addDepartmentToList(
  departments: Department[],
  newDeptData: Omit<Department, 'id'>,
  idOverride?: string
): { updatedDepartments: Department[]; newDepartment: Department } {
  const id = idOverride || `dept_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newDepartment: Department = {
    ...newDeptData,
    id,
    name: newDeptData.name.trim(),
    code: newDeptData.code.trim().toUpperCase(),
    managerName: newDeptData.managerName.trim(),
    location: newDeptData.location.trim(),
  };

  return {
    updatedDepartments: [...departments, newDepartment],
    newDepartment,
  };
}

/**
 * Pure function to update an existing department.
 */
export function updateDepartmentInList(
  departments: Department[],
  deptId: string,
  data: Partial<Department>
): Department[] {
  return departments.map((d) => {
    if (d.id !== deptId) return d;
    return {
      ...d,
      ...data,
      name: data.name !== undefined ? data.name.trim() : d.name,
      code: data.code !== undefined ? data.code.trim().toUpperCase() : d.code,
      managerName: data.managerName !== undefined ? data.managerName.trim() : d.managerName,
      location: data.location !== undefined ? data.location.trim() : d.location,
    };
  });
}

export interface RemoveDepartmentResult {
  success: boolean;
  error?: string;
  updatedDepartments: Department[];
  updatedUsers: User[];
  deletedDepartment?: Department;
  reassignedCount: number;
  reassignedTo?: Department;
}

/**
 * Pure function to safely remove a department.
 * - Prevents deleting if only 1 department remains in system.
 * - Automatically reassigns any affected users to a fallback department.
 */
export function removeDepartmentFromList(
  departments: Department[],
  users: User[],
  deptId: string,
  targetReassignDeptId?: string
): RemoveDepartmentResult {
  if (departments.length <= 1) {
    return {
      success: false,
      error: 'Sistem harus memiliki minimal satu divisi aktif.',
      updatedDepartments: departments,
      updatedUsers: users,
      reassignedCount: 0,
    };
  }

  const deptToDelete = departments.find((d) => d.id === deptId);
  if (!deptToDelete) {
    return {
      success: false,
      error: 'Divisi tidak ditemukan.',
      updatedDepartments: departments,
      updatedUsers: users,
      reassignedCount: 0,
    };
  }

  // Find fallback department (not the one being deleted)
  const remainingDepts = departments.filter((d) => d.id !== deptId);
  const fallbackDept =
    remainingDepts.find((d) => d.id === targetReassignDeptId) ||
    remainingDepts[0];

  const affectedUsers = users.filter((u) => u.departmentId === deptId);
  const updatedUsers =
    affectedUsers.length > 0 && fallbackDept
      ? users.map((u) =>
          u.departmentId === deptId ? { ...u, departmentId: fallbackDept.id } : u
        )
      : users;

  return {
    success: true,
    updatedDepartments: remainingDepts,
    updatedUsers,
    deletedDepartment: deptToDelete,
    reassignedCount: affectedUsers.length,
    reassignedTo: fallbackDept,
  };
}

/**
 * Computes statistics for each department (e.g. employee count).
 */
export function getDepartmentStats(
  departments: Department[],
  users: User[]
): Array<{
  department: Department;
  employeeCount: number;
}> {
  return departments.map((dept) => ({
    department: dept,
    employeeCount: users.filter((u) => u.departmentId === dept.id).length,
  }));
}

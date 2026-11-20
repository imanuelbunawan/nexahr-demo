import React, { useState } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { User, Role, Department } from '../types/index.ts';
import {
  Users,
  UserPlus,
  Shield,
  Calendar,
  Phone,
  Mail,
  Search,
  Sliders,
  Check,
  X,
  Edit,
  AlertCircle,
  Building,
  KeyRound,
  RotateCcw,
  Plus,
  Trash2,
  Building2,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  GitCommit,
} from 'lucide-react';
import {
  validateDepartmentInput,
  getDepartmentStats,
} from '../utils/departmentUtils.ts';
import { OrgHierarchyView } from './OrgHierarchyView.tsx';

interface EmployeeViewProps {
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
  onOpenAddModal?: () => void;
}

export const EmployeeView: React.FC<EmployeeViewProps> = ({
  isAddModalOpen: externalIsOpen,
  onCloseAddModal: externalOnClose,
  onOpenAddModal: externalOnOpen,
}) => {
  const {
    users,
    roles,
    departments,
    leaveBalances,
    createUser,
    updateUser,
    updateUserRole,
    updateLeaveQuota,
    hasUserPermission,
    currentUser,
    resetUserPassword,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  } = useHRIS();

  const [resetSuccessToast, setResetSuccessToast] = useState<{
    name: string;
    email: string;
    defaultPassword: string;
  } | null>(null);

  const canEdit = hasUserPermission('edit_employees');
  const canCreate = hasUserPermission('create_employees');

  // View Mode: Table Directory vs Drag & Drop Org Hierarchy Chart
  const [employeeViewTab, setEmployeeViewTab] = useState<'directory' | 'hierarchy'>('directory');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  const getRoleColorBadge = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'blue':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'violet':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Add Employee Modal (Controlled / Uncontrolled)
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isAddModalOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const openAddModal = externalOnOpen || (() => setInternalIsOpen(true));
  const closeAddModal = externalOnClose || (() => setInternalIsOpen(false));
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newPhone, setNewPhone] = useState('+62 ');
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || 'dept_it');
  const [newRoleId, setNewRoleId] = useState(roles[4]?.id || 'role_karyawan');
  const [newQuota, setNewQuota] = useState(12);
  const [formError, setFormError] = useState<string | null>(null);

  // Quota Adjustment Modal
  const [quotaModalUser, setQuotaModalUser] = useState<User | null>(null);
  const [adjustedQuota, setAdjustedQuota] = useState<number>(12);

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim() || !newEmail.trim() || !newPosition.trim()) {
      setFormError('Nama, email, dan jabatan wajib diisi.');
      return;
    }

    createUser(
      {
        name: newName.trim(),
        email: newEmail.trim(),
        avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 500000)}?w=150&auto=format&fit=crop&q=80`,
        roleId: newRoleId,
        departmentId: newDeptId,
        position: newPosition.trim(),
        phone: newPhone.trim(),
        joinDate: new Date().toISOString().split('T')[0],
        status: 'active',
        employeeNumber: `NX-${100 + users.length}`,
      },
      newQuota
    );

    closeAddModal();
    setNewName('');
    setNewEmail('');
    setNewPosition('');
  };

  const handleSaveQuota = () => {
    if (quotaModalUser) {
      updateLeaveQuota(quotaModalUser.id, adjustedQuota);
      setQuotaModalUser(null);
    }
  };

  // Division Management State
  const [isManageDeptsModalOpen, setIsManageDeptsModalOpen] = useState(false);
  const [deptFormModalMode, setDeptFormModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [reassignDeptId, setReassignDeptId] = useState<string>('');

  // Department Form Fields
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptManager, setDeptManager] = useState('');
  const [deptLocation, setDeptLocation] = useState('');
  const [deptFormErrors, setDeptFormErrors] = useState<{ name?: string; code?: string }>({});
  const [deptFeedbackToast, setDeptFeedbackToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleOpenAddDeptModal = () => {
    setDeptFormModalMode('create');
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setDeptManager('');
    setDeptLocation('');
    setDeptFormErrors({});
  };

  const handleOpenEditDeptModal = (dept: Department) => {
    setDeptFormModalMode('edit');
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptManager(dept.managerName || '');
    setDeptLocation(dept.location || '');
    setDeptFormErrors({});
  };

  const handleOpenDeleteDeptModal = (dept: Department) => {
    setDeptToDelete(dept);
    const otherDepts = departments.filter((d) => d.id !== dept.id);
    setReassignDeptId(otherDepts[0]?.id || '');
  };

  const handleSaveDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateDepartmentInput({
      name: deptName,
      code: deptCode,
      managerName: deptManager,
      location: deptLocation,
    });

    if (!validation.valid) {
      setDeptFormErrors(validation.errors);
      return;
    }

    if (deptFormModalMode === 'create') {
      const created = createDepartment({
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        managerName: deptManager.trim(),
        location: deptLocation.trim(),
      });
      setDeptFeedbackToast({
        type: 'success',
        message: `Divisi "${created.name}" (${created.code}) berhasil ditambahkan.`,
      });
      setSelectedDeptId(created.id);
    } else if (deptFormModalMode === 'edit' && editingDept) {
      updateDepartment(editingDept.id, {
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        managerName: deptManager.trim(),
        location: deptLocation.trim(),
      });
      setDeptFeedbackToast({
        type: 'success',
        message: `Divisi "${deptName.trim()}" berhasil diperbarui.`,
      });
    }

    setDeptFormModalMode(null);
    setEditingDept(null);
  };

  const handleConfirmDeleteDept = () => {
    if (!deptToDelete) return;
    const res = deleteDepartment(deptToDelete.id, reassignDeptId);
    if (!res.success) {
      setDeptFeedbackToast({
        type: 'error',
        message: res.error || 'Gagal menghapus divisi.',
      });
    } else {
      if (selectedDeptId === deptToDelete.id) {
        setSelectedDeptId('all');
      }
      setDeptFeedbackToast({
        type: 'success',
        message: `Divisi "${deptToDelete.name}" telah berhasil dihapus.`,
      });
    }
    setDeptToDelete(null);
  };

  const currentSelectedDept = departments.find((d) => d.id === selectedDeptId);

  const filteredUsers = users.filter((u) => {
    if (selectedDeptId !== 'all' && u.departmentId !== selectedDeptId) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPos = u.position.toLowerCase().includes(q);
      const matchNip = u.employeeNumber.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPos && !matchNip) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Direktori &amp; Manajemen Karyawan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Daftar seluruh talenta, penugasan role dinamis, dan pengaturan kuota
            hak cuti.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm shadow-indigo-600/20 transition-all hover:scale-[1.02] self-start sm:self-auto"
            title="Tambah data karyawan baru"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Karyawan</span>
          </button>
        )}
      </div>

      {/* Success Notification for Password Reset to 123456 */}
      {resetSuccessToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <strong className="font-bold">Kata Sandi Berhasil Direset: </strong>
              Password untuk <strong>{resetSuccessToast.name}</strong> ({resetSuccessToast.email}) telah diatur ulang ke default:{' '}
              <code className="font-mono font-bold bg-emerald-100 dark:bg-emerald-900/80 px-1.5 py-0.5 rounded text-emerald-900 dark:text-emerald-100">
                {resetSuccessToast.defaultPassword}
              </code>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setResetSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-300 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Toast Feedback for Department Operations */}
      {deptFeedbackToast && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
            deptFeedbackToast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {deptFeedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{deptFeedbackToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeptFeedbackToast(null)}
            className="p-1 opacity-70 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* View Switcher: Direktori Karyawan vs Bagan Hierarki & Org Chart */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          id="btn-tab-employee-directory"
          type="button"
          onClick={() => setEmployeeViewTab('directory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            employeeViewTab === 'directory'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Direktori Karyawan</span>
        </button>

        <button
          id="btn-tab-employee-hierarchy"
          type="button"
          onClick={() => setEmployeeViewTab('hierarchy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
            employeeViewTab === 'hierarchy'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <GitCommit className="w-4 h-4" />
          <span>Bagan Hierarki &amp; Org Chart (Drag &amp; Drop)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-400 text-amber-950 uppercase">
            7 Tingkat
          </span>
        </button>
      </div>

      {employeeViewTab === 'hierarchy' ? (
        <OrgHierarchyView />
      ) : (
        <>
          {/* Filter and Search Bar with Division CRUD Buttons */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Divisi:
          </span>
          <select
            id="department-filter-select"
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="all">Semua Departemen ({users.length})</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({users.filter((u) => u.departmentId === d.id).length})
              </option>
            ))}
          </select>

          {/* Division Action Buttons: Add, Edit, Remove, Manage */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              id="btn-add-division"
              onClick={handleOpenAddDeptModal}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
              title="Tambah Divisi / Departemen Baru"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Divisi</span>
            </button>

            {currentSelectedDept && (
              <>
                <button
                  type="button"
                  id="btn-edit-division"
                  onClick={() => handleOpenEditDeptModal(currentSelectedDept)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold transition-all shadow-2xs hover:scale-[1.02]"
                  title={`Edit Data Divisi ${currentSelectedDept.name}`}
                >
                  <Edit className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Edit Divisi</span>
                </button>

                <button
                  type="button"
                  id="btn-delete-division"
                  onClick={() => handleOpenDeleteDeptModal(currentSelectedDept)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition-all shadow-2xs hover:scale-[1.02]"
                  title={`Hapus Divisi ${currentSelectedDept.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Hapus Divisi</span>
                </button>
              </>
            )}

            <button
              type="button"
              id="btn-manage-divisions"
              onClick={() => setIsManageDeptsModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all shadow-2xs"
              title="Buka panel kelola semua divisi"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Kelola Divisi</span>
            </button>
          </div>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, NIP, email, jabatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Employees Container: Mobile Cards (md:hidden) & Desktop Table (hidden md:block) */}
      <div className="space-y-3">
        {/* Mobile View: High-Touch Employee Cards */}
        <div className="md:hidden space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-medium text-slate-600 dark:text-slate-300 text-xs">
                Tidak ada data karyawan yang sesuai kriteria pencarian.
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const dept = departments.find((d) => d.id === user.departmentId);
              const role = roles.find((r) => r.id === user.roleId);
              const balance = leaveBalances.find((b) => b.userId === user.id);

              return (
                <div
                  key={user.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-3 transition-all"
                >
                  {/* Top: Avatar, Name, NIP */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          NIP: {user.employeeNumber}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${getRoleColorBadge(
                        role?.color
                      )}`}
                    >
                      {role?.name || 'Staff'}
                    </span>
                  </div>

                  {/* Department & Position */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {user.position}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        {dept?.name || 'Umum'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">Kuota Cuti:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Sisa {balance?.remainingQuota ?? 12} dari {balance?.annualQuota ?? 12} hari
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono">
                      {user.email} &bull; {user.phone}
                    </div>
                  </div>

                  {/* Actions & Role Switcher */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    {canEdit ? (
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                            Ganti Role RBAC:
                          </label>
                          <select
                            value={user.roleId}
                            onChange={(e) =>
                              updateUserRole(user.id, e.target.value)
                            }
                            className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-900 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500/30"
                            title="Ubah Role Otorisasi Karyawan Seketika"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => {
                            setQuotaModalUser(user);
                            setAdjustedQuota(balance?.annualQuota ?? 12);
                          }}
                          className="self-end py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center gap-1 transition-colors bg-white dark:bg-slate-800 shadow-2xs"
                          title="Sesuaikan Jatah Kuota Cuti"
                        >
                          <Sliders className="w-3.5 h-3.5 text-slate-500" />
                          <span>Set Kuota</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (Hidden on mobile) */}
        <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Karyawan (NIP)</th>
                  <th className="py-3.5 px-4">Jabatan &amp; Divisi</th>
                  <th className="py-3.5 px-4">Role Akses (Dynamic RBAC)</th>
                  <th className="py-3.5 px-4">Saldo Kuota Cuti</th>
                  <th className="py-3.5 px-4">Kontak</th>
                  <th className="py-3.5 px-4 text-right">Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((user) => {
                  const dept = departments.find((d) => d.id === user.departmentId);
                  const role = roles.find((r) => r.id === user.roleId);
                  const balance = leaveBalances.find((b) => b.userId === user.id);

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* User profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {user.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              NIP: {user.employeeNumber} &bull; Gabung{' '}
                              {user.joinDate}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Position */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {user.position}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          {dept?.name || 'Umum'}
                        </div>
                      </td>

                      {/* Instant Role Assignment Dropdown (Phase 3 Feature) */}
                      <td className="py-3.5 px-4">
                        {canEdit ? (
                          <select
                            value={user.roleId}
                            onChange={(e) =>
                              updateUserRole(user.id, e.target.value)
                            }
                            className="text-xs font-bold py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-900 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500/30"
                            title="Ubah Role Otorisasi Karyawan Seketika"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-bold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {role?.label || 'Staff'}
                          </span>
                        )}
                      </td>

                      {/* Leave Quota */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-xs">
                            {balance?.remainingQuota ?? 12} Hari Sisa
                          </span>
                          <span className="text-[10px] text-slate-400">
                            (Total {balance?.annualQuota ?? 12})
                          </span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>{user.email}</div>
                        <div className="text-slate-400">{user.phone}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setQuotaModalUser(user);
                              setAdjustedQuota(balance?.annualQuota ?? 12);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors bg-white dark:bg-slate-800 shadow-2xs"
                            title="Sesuaikan Jatah Kuota Cuti"
                          >
                            <Sliders className="w-3 h-3" />
                            Set Kuota
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-400" />
                  Pendaftaran Karyawan Baru
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Tambahkan data personil dan tentukan role otorisasi awalnya.
                </p>
              </div>
              <button
                onClick={closeAddModal}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Rian Pratama, S.Kom"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Perusahaan
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nama@nexahr.co.id"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Departemen / Divisi
                  </label>
                  <select
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jabatan (Position)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Frontend Engineer"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Role Otorisasi Awal
                  </label>
                  <select
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kuota Cuti Tahunan Awal
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newQuota}
                    onChange={(e) => setNewQuota(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="+62 8..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Daftarkan Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quota Adjustment Modal */}
      {quotaModalUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">
                Atur Ulang Kuota Cuti
              </h3>
              <button
                onClick={() => setQuotaModalUser(null)}
                className="text-slate-400 hover:text-slate-900 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Menyesuaikan alokasi jatah cuti tahunan resmi untuk karyawan:{' '}
              <strong className="text-slate-900">{quotaModalUser.name}</strong>.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Alokasi Kuota Tahunan Baru (Hari)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={adjustedQuota}
                onChange={(e) => setAdjustedQuota(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-indigo-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setQuotaModalUser(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveQuota}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Division Modal */}
      {deptFormModalMode !== null && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {deptFormModalMode === 'create'
                      ? 'Tambah Divisi Baru'
                      : 'Edit Data Divisi'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {deptFormModalMode === 'create'
                      ? 'Daftarkan unit departemen baru untuk penugasan talenta'
                      : `Perbarui konfigurasi divisi ${editingDept?.name || ''}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDeptFormModalMode(null);
                  setEditingDept(null);
                }}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeptSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nama Divisi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-dept-name"
                  required
                  placeholder="Contoh: Product Management & UX"
                  value={deptName}
                  onChange={(e) => {
                    setDeptName(e.target.value);
                    if (deptFormErrors.name) {
                      setDeptFormErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-indigo-500/30 dark:bg-slate-800 dark:text-white ${
                    deptFormErrors.name
                      ? 'border-rose-400 dark:border-rose-600 bg-rose-50/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {deptFormErrors.name && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">
                    {deptFormErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Kode Divisi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-dept-code"
                  required
                  maxLength={10}
                  placeholder="Contoh: PMUX, ENG, HRD"
                  value={deptCode}
                  onChange={(e) => {
                    setDeptCode(e.target.value.toUpperCase());
                    if (deptFormErrors.code) {
                      setDeptFormErrors((prev) => ({ ...prev, code: undefined }));
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold tracking-wider uppercase focus:ring-2 focus:ring-indigo-500/30 dark:bg-slate-800 dark:text-white ${
                    deptFormErrors.code
                      ? 'border-rose-400 dark:border-rose-600 bg-rose-50/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {deptFormErrors.code && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">
                    {deptFormErrors.code}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Kepala Divisi / Manajer
                </label>
                <input
                  type="text"
                  id="input-dept-manager"
                  placeholder="Contoh: Budi Santoso, M.Kom"
                  value={deptManager}
                  onChange={(e) => setDeptManager(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Lokasi / Lantai Kantor
                </label>
                <input
                  type="text"
                  id="input-dept-location"
                  placeholder="Contoh: Lantai 4, Menara Cyber Jakarta"
                  value={deptLocation}
                  onChange={(e) => setDeptLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setDeptFormModalMode(null);
                    setEditingDept(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-division-form"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02]"
                >
                  {deptFormModalMode === 'create'
                    ? 'Simpan Divisi'
                    : 'Perbarui Divisi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Division Confirmation Dialog */}
      {deptToDelete && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Hapus Divisi
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Konfirmasi penghapusan unit organisasi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeptToDelete(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>{deptToDelete.name}</span>
                  <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                    {deptToDelete.code}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kepala: {deptToDelete.managerName || '-'} &bull; Lokasi: {deptToDelete.location || '-'}
                </div>
              </div>

              {departments.length <= 1 ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                  <strong>Peringatan:</strong> Sistem membutuhkan minimal satu divisi aktif. Divisi ini tidak dapat dihapus.
                </div>
              ) : (
                <>
                  {users.filter((u) => u.departmentId === deptToDelete.id).length > 0 ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
                        Terdapat{' '}
                        <strong>
                          {users.filter((u) => u.departmentId === deptToDelete.id).length} karyawan
                        </strong>{' '}
                        yang saat ini terdaftar di divisi ini. Mereka akan dialihkan secara otomatis ke divisi tujuan di bawah:
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          Pindahkan Karyawan ke Divisi:
                        </label>
                        <select
                          id="select-reassign-dept"
                          value={reassignDeptId}
                          onChange={(e) => setReassignDeptId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/30"
                        >
                          {departments
                            .filter((d) => d.id !== deptToDelete.id)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.code})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Tidak ada karyawan yang terdaftar di divisi ini. Penghapusan dapat dilakukan dengan aman tanpa mempengaruhi data karyawan.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeptToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-delete-dept"
                disabled={departments.length <= 1}
                onClick={handleConfirmDeleteDept}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all hover:scale-[1.02]"
              >
                Hapus Divisi Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage All Divisions Overview Modal */}
      {isManageDeptsModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Kelola Seluruh Divisi ({departments.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Struktur divisi organisasi, kepala divisi, dan jumlah talenta aktif
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-modal-add-division"
                  onClick={() => {
                    handleOpenAddDeptModal();
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs hover:scale-[1.02]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Divisi Baru</span>
                </button>
                <button
                  onClick={() => setIsManageDeptsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {departments.map((dept) => {
                const count = users.filter((u) => u.departmentId === dept.id).length;
                return (
                  <div
                    key={dept.id}
                    className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {dept.name}
                        </span>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase shrink-0">
                          {dept.code}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                          {count} Karyawan
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>Kepala: <strong className="text-slate-700 dark:text-slate-300">{dept.managerName || '-'}</strong></span>
                        <span>Lokasi: <span className="text-slate-600 dark:text-slate-400">{dept.location || '-'}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenEditDeptModal(dept);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-2xs"
                      >
                        <Edit className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenDeleteDeptModal(dept);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/60 shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsManageDeptsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold"
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

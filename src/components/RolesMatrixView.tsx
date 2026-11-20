import React, { useState } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { ALL_PERMISSIONS } from '../data/initialData.ts';
import { ModuleType, ActionType, Role } from '../types/index.ts';
import {
  ShieldCheck,
  PlusCircle,
  RotateCcw,
  Check,
  X,
  Lock,
  Unlock,
  AlertCircle,
  Sparkles,
  Info,
  Trash2,
  Edit2,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

const MODULES_CONFIG: { id: ModuleType; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'leave', label: 'Cuti (Leave)', icon: '📅' },
  { id: 'reimbursement', label: 'Reimbursement', icon: '🧾' },
  { id: 'approval', label: 'Meja Approval', icon: '📋' },
  { id: 'attendance', label: 'Presensi & Lembur', icon: '⏱️' },
  { id: 'payroll', label: 'Penggajian & Slip', icon: '💳' },
  { id: 'employees', label: 'Data Karyawan', icon: '👥' },
  { id: 'roles', label: 'Role & RBAC', icon: '🛡️' },
  { id: 'kanban', label: 'Papan Kanban', icon: '📌' },
  { id: 'reports', label: 'Laporan & Ekspor', icon: '📈' },
  { id: 'audit_logs', label: 'Audit Logs', icon: '📜' },
];

const ACTIONS_CONFIG: { id: ActionType; label: string; short: string }[] = [
  { id: 'view', label: 'View (Lihat)', short: 'V' },
  { id: 'create', label: 'Create (Tambah)', short: 'C' },
  { id: 'edit', label: 'Edit (Ubah)', short: 'E' },
  { id: 'delete', label: 'Delete (Hapus)', short: 'D' },
  { id: 'approve', label: 'Approve (Setujui)', short: 'A' },
];

interface RolesMatrixViewProps {
  isNewRoleModalOpen?: boolean;
  onCloseNewRoleModal?: () => void;
  onOpenNewRoleModal?: () => void;
}

export const RolesMatrixView: React.FC<RolesMatrixViewProps> = ({
  isNewRoleModalOpen: externalIsOpen,
  onCloseNewRoleModal: externalOnClose,
  onOpenNewRoleModal: externalOnOpen,
}) => {
  const {
    roles,
    rolePermissions,
    togglePermission,
    createRole,
    deleteRole,
    resetPermissionsToDefault,
    hasUserPermission,
    currentUser,
  } = useHRIS();

  const isOwner = hasUserPermission('edit_roles');

  // New role modal state (Controlled / Uncontrolled)
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isNewRoleModalOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const openNewRoleModal = externalOnOpen || (() => setInternalIsOpen(true));
  const closeNewRoleModal = externalOnClose || (() => setInternalIsOpen(false));
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('indigo');
  const [roleError, setRoleError] = useState<string | null>(null);

  // Selected role tab for focused matrix view
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || 'role_owner');

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    setRoleError(null);

    if (!newRoleName.trim() || !newRoleLabel.trim()) {
      setRoleError('Nama teknis dan label Role wajib diisi.');
      return;
    }

    const created = createRole({
      name: newRoleName.trim(),
      label: newRoleLabel.trim(),
      description: newRoleDescription.trim() || 'Role kustom dengan izin granular.',
      color: newRoleColor,
    });

    setSelectedRoleId(created.id);
    setNewRoleName('');
    setNewRoleLabel('');
    setNewRoleDescription('');
    closeNewRoleModal();
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Konfigurasi Hak Akses (Dynamic Permission Matrix)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kendali otorisasi granular per modul (View, Create, Edit, Delete,
            Approve). Perubahan berlaku instan ke seluruh sesi pengguna.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <>
              <button
                onClick={() => {
                  if (
                    confirm(
                      'Kembalikan pengaturan seluruh hak akses matriks ke bawaan standar perusahaan?'
                    )
                  ) {
                    resetPermissionsToDefault();
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Reset ke Template Default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Standar
              </button>

              <button
                onClick={openNewRoleModal}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                title="Buat role wewenang baru"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Tambah Role Baru
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Authorization Strictness Banner (Phase 8 Requirement) */}
      <div className="p-4 rounded-2xl bg-indigo-950 text-white border border-indigo-800 shadow-md flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold tracking-wide uppercase text-indigo-200 flex items-center gap-2">
            Strict Dynamic Authorization Guard
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Live Enforcement
            </span>
          </h4>
          <p className="text-xs text-indigo-100 leading-relaxed">
            Jika Anda mencentang atau mencabut hak izin suatu role di tabel bawah,
            setiap pengguna dengan role tersebut akan <strong>seketika</strong>{' '}
            mendapatkan akses atau terkunci (403 Forbidden) pada tombol, form,
            dan menu navigasi tanpa perlu login ulang!
          </p>
        </div>
      </div>

      {/* Roles Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {roles.map((r) => {
          const isSelected = selectedRoleId === r.id;
          const assignedPermCount = (rolePermissions[r.id] || []).length;

          return (
            <button
              key={r.id}
              onClick={() => setSelectedRoleId(r.id)}
              className={`px-4 py-2.5 rounded-xl border text-left shrink-0 transition-all flex items-center gap-2.5 ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-400 shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  r.color === 'emerald'
                    ? 'bg-emerald-500'
                    : r.color === 'blue'
                    ? 'bg-blue-500'
                    : r.color === 'indigo'
                    ? 'bg-indigo-500'
                    : 'bg-slate-400'
                }`}
              />
              <div>
                <span
                  className={`text-xs font-extrabold block ${
                    isSelected ? 'text-indigo-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {r.label}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                  {assignedPermCount} Izin Aktif
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Role Meta & Details */}
      {(() => {
        const curRole = roles.find((r) => r.id === selectedRoleId);
        if (!curRole) return null;
        const currentPerms = rolePermissions[curRole.id] || [];

        return (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900">
                  {curRole.label}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRoleColorBadge(
                    curRole.color
                  )}`}
                >
                  {curRole.name}
                </span>
                {curRole.isSystemRole && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
                    Role Bawaan Sistem
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">
                {curRole.description}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-medium">
                  Cakupan Otorisasi
                </span>
                <span className="text-sm font-extrabold text-indigo-700">
                  {currentPerms.length} dari {ALL_PERMISSIONS.length} Hak Akses
                </span>
              </div>

              {!curRole.isSystemRole && isOwner && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Hapus role "${curRole.label}" dan seluruh izinnya?`
                      )
                    ) {
                      deleteRole(curRole.id);
                      setSelectedRoleId(roles[0].id);
                    }
                  }}
                  className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                  title="Hapus Role Kustom"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* The Dynamic Permission Matrix Table (Phase 3 Core Feature) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              Tabel Matriks Akses Granular
            </span>
            <span className="text-[11px] text-slate-500">
              (Klik kotak centang untuk langsung mengubah izin)
            </span>
          </div>

          {!isOwner && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <Lock className="w-3.5 h-3.5" />
              Mode Baca Saja (Hanya Owner yang dapat mencentang)
            </div>
          )}
        </div>

        {/* Mobile Horizontal Scroll Hint */}
        <div className="md:hidden px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-b border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Geser horizontal untuk centang hak akses</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">&rarr;</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 uppercase">
                <th className="py-3.5 px-5 w-60">Halaman / Modul HRIS</th>
                {ACTIONS_CONFIG.map((act) => (
                  <th
                    key={act.id}
                    className="py-3.5 px-4 text-center w-28 border-l border-slate-200/60"
                  >
                    <div className="font-bold">{act.short}</div>
                    <div className="text-[9px] font-normal text-slate-500 normal-case">
                      {act.label}
                    </div>
                  </th>
                ))}
                <th className="py-3.5 px-4 text-center border-l border-slate-200/60">
                  Status Cakupan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MODULES_CONFIG.map((mod) => {
                const targetRole = roles.find((r) => r.id === selectedRoleId);
                const rolePerms = selectedRoleId
                  ? rolePermissions[selectedRoleId] || []
                  : [];

                // Count granted actions for this module
                const grantedInMod = ACTIONS_CONFIG.filter((act) =>
                  rolePerms.includes(`${act.id}_${mod.id}`)
                ).length;

                return (
                  <tr
                    key={mod.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Module Name */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{mod.icon}</span>
                        <div>
                          <div className="font-bold text-slate-900">
                            {mod.label}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            modul: {mod.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Actions Checkboxes */}
                    {ACTIONS_CONFIG.map((act) => {
                      const permId = `${act.id}_${mod.id}`;
                      const isGranted = rolePerms.includes(permId);

                      // Check if permission exists in master dictionary
                      const permDef = ALL_PERMISSIONS.find(
                        (p) => p.id === permId
                      );
                      const isApplicable = !!permDef;

                      return (
                        <td
                          key={act.id}
                          className="py-3.5 px-4 text-center border-l border-slate-200/60"
                        >
                          {isApplicable ? (
                            <button
                              type="button"
                              disabled={!isOwner}
                              onClick={() => {
                                if (isOwner) {
                                  togglePermission(selectedRoleId, permId);
                                }
                              }}
                              className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all ${
                                isGranted
                                  ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-500 hover:scale-105'
                                  : 'bg-slate-100 border border-slate-300 text-transparent hover:border-slate-400'
                              } ${
                                !isOwner ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                              }`}
                              title={`${isGranted ? 'Cabut' : 'Berikan'} izin: ${
                                permDef.name
                              }`}
                            >
                              <Check
                                className={`w-4 h-4 stroke-[3] ${
                                  isGranted ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[11px]">&mdash;</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Module coverage indicator */}
                    <td className="py-3.5 px-4 text-center border-l border-slate-200/60">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          grantedInMod === 0
                            ? 'bg-slate-100 text-slate-400'
                            : grantedInMod >= 4
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {grantedInMod === 0
                          ? 'Terkunci'
                          : `${grantedInMod} Aksi Diizinkan`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Role Creation Modal */}
      {isNewRoleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Tambah Role Organisasi Baru
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Tentukan identitas role lalu sesuaikan matriks perizinannya.
                </p>
              </div>
              <button
                onClick={closeNewRoleModal}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-6 space-y-4">
              {roleError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{roleError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Label Tampilan (Nama Jabatan)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Manajer Keuangan / Auditor IT..."
                  value={newRoleLabel}
                  onChange={(e) => {
                    setNewRoleLabel(e.target.value);
                    if (!newRoleName) {
                      setNewRoleName(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, '_')
                      );
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kode Teknis Role (Slug)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: role_finance_lead"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Warna Lencana
                </label>
                <select
                  value={newRoleColor}
                  onChange={(e) => setNewRoleColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                >
                  <option value="indigo">Indigo (Standar Korporat)</option>
                  <option value="emerald">Emerald (Owner / Eksekutif)</option>
                  <option value="blue">Blue (Manajerial)</option>
                  <option value="violet">Purple (Teknis / IT)</option>
                  <option value="slate">Slate (Operasional)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Deskripsi Tanggung Jawab
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat wewenang jabatan..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeNewRoleModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Simpan &amp; Atur Akses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

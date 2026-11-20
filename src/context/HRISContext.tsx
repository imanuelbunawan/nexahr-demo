import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ActionType,
  Department,
  LeaveBalance,
  LeaveRequest,
  ModuleType,
  NotificationItem,
  Reimbursement,
  Role,
  User,
  SocketApprovalPayload,
  SocketConnectionStatus,
  KanbanTask,
  TaskStatus,
  AuditLogEntry,
  NewAuditLogPayload,
  OfflineActionType,
  OfflineEntityType,
  OfflineSyncAction,
  AttendanceRecord,
  OvertimeRequest,
  WorkType,
  AttendanceStatus,
  PayrollRecord,
  PayrollStatus,
} from '../types/index.ts';
import {
  ALL_PERMISSIONS,
  INITIAL_DEPARTMENTS,
  INITIAL_LEAVE_BALANCES,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_REIMBURSEMENTS,
  INITIAL_ROLES,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_USERS,
  INITIAL_TASKS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ATTENDANCE,
  INITIAL_OVERTIME_REQUESTS,
  INITIAL_PAYROLLS,
} from '../data/initialData.ts';
import {
  canAccessModule,
  getNextLeaveApprovalStage,
  getNextReimbursementApprovalStage,
  hasPermission,
  formatRupiah,
} from '../utils/rbac.ts';
import { globalSocket, createApprovalSocketPayload } from '../utils/socketService.ts';
import { moveTaskStatus } from '../utils/kanbanUtils.ts';
import { createAuditEntry } from '../utils/auditUtils.ts';
import { determineAttendanceStatus } from '../utils/attendanceUtils.ts';
import {
  calculateGrossEarnings,
  calculateTotalDeductions,
  calculateNetSalary,
} from '../utils/payrollUtils.ts';
import {
  createOfflineSyncAction,
  enqueueOfflineAction,
  dequeueOfflineAction,
  calculateStorageUsageBytes,
} from '../utils/offlineSyncUtils.ts';
import {
  authenticateUser,
  resetPasswordToDefault,
  DEFAULT_USER_PASSWORD,
} from '../utils/authUtils.ts';
import {
  addDepartmentToList,
  updateDepartmentInList,
  removeDepartmentFromList,
} from '../utils/departmentUtils.ts';
import { reassignEmployeeManager } from '../utils/hierarchyUtils.ts';

interface HRISContextType {
  // Offline Synchronization & Storage Persistence
  isOnline: boolean;
  isSyncing: boolean;
  isOfflineSimulated: boolean;
  effectiveOnline: boolean;
  pendingOfflineActions: OfflineSyncAction[];
  lastSyncedAt: string | null;
  syncOfflineQueue: () => Promise<void>;
  toggleOfflineSimulation: () => void;
  clearOfflineQueue: () => void;
  removeOfflineAction: (id: string) => void;
  storageUsageBytes: number;

  // Authentication & Active Persona
  isAuthenticated: boolean;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchUserById: (userId: string) => void;
  login: (
    identifier: string,
    password?: string,
    method?: 'credentials' | 'sso_google' | 'sso_microsoft' | 'quick_persona'
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  resetUserPassword: (identifier: string) => Promise<{
    success: boolean;
    user?: User;
    error?: string;
    defaultPassword: string;
  }>;

  // Master Data
  departments: Department[];
  roles: Role[];
  users: User[];
  rolePermissions: Record<string, string[]>;
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  reimbursements: Reimbursement[];
  notifications: NotificationItem[];

  // RBAC Permission Checks
  hasUserPermission: (permissionId: string) => boolean;
  canAccess: (module: ModuleType, action?: ActionType) => boolean;
  togglePermission: (roleId: string, permissionId: string) => void;
  createRole: (role: Omit<Role, 'id'>) => Role;
  updateRole: (roleId: string, data: Partial<Role>) => void;
  deleteRole: (roleId: string) => void;
  resetPermissionsToDefault: () => void;

  // Employee Management
  createUser: (userData: Omit<User, 'id'>, initialQuota?: number) => void;
  updateUser: (userId: string, data: Partial<User>) => void;
  updateUserRole: (userId: string, roleId: string) => void;
  updateLeaveQuota: (userId: string, newQuota: number) => void;
  reassignEmployeeManager: (
    employeeId: string,
    newManagerId: string | null
  ) => { success: boolean; error?: string };

  // Department & Division Management
  createDepartment: (dept: Omit<Department, 'id'>) => Department;
  updateDepartment: (deptId: string, data: Partial<Department>) => void;
  deleteDepartment: (
    deptId: string,
    reassignToDeptId?: string
  ) => { success: boolean; error?: string };

  // Leave Actions
  submitLeaveRequest: (data: {
    leaveType: LeaveRequest['leaveType'];
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    emergencyContact: string;
  }) => { success: boolean; error?: string };
  approveLeave: (requestId: string, note?: string) => void;
  rejectLeave: (requestId: string, reason: string) => void;
  deleteLeave: (requestId: string) => void;

  // Reimbursement Actions
  submitReimbursement: (data: {
    category: Reimbursement['category'];
    amount: number;
    title: string;
    description: string;
    invoiceNumber: string;
    receiptName: string;
    receiptUrl: string;
    receiptDate: string;
  }) => { success: boolean; error?: string };
  approveReimbursement: (reimbursementId: string, note?: string) => void;
  rejectReimbursement: (reimbursementId: string, reason: string) => void;
  deleteReimbursement: (reimbursementId: string) => void;

  // Notifications
  markAllNotificationsRead: () => void;
  markNotificationAsRead: (id: string) => void;
  addNotification: (
    item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>
  ) => void;

  // Simulated Socket.io Real-Time Tracking & Global Event Bus
  socketStatus: SocketConnectionStatus;
  socketLatency: number;
  socketRooms: string[];
  reconnectSocket: () => void;
  toggleSocketConnection: () => void;
  activeSocketToasts: SocketApprovalPayload[];
  dismissSocketToast: (id: string) => void;
  simulateIncomingApprovalSocket: (kind?: 'leave' | 'reimbursement') => void;
  // Kanban Work Task Management
  tasks: KanbanTask[];
  addTask: (taskData: Omit<KanbanTask, 'id' | 'createdAt' | 'createdBy'>) => KanbanTask;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  updateTask: (taskId: string, data: Partial<KanbanTask>) => void;
  deleteTask: (taskId: string) => void;

  // Attendance & Shift Management
  attendances: AttendanceRecord[];
  overtimeRequests: OvertimeRequest[];
  checkIn: (workType: WorkType, notes?: string) => { success: boolean; message: string };
  checkOut: (notes?: string) => { success: boolean; message: string };
  submitOvertime: (data: {
    date: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    tasksDescription: string;
  }) => { success: boolean; error?: string };
  approveOvertime: (id: string, note?: string) => void;
  rejectOvertime: (id: string, reason: string) => void;
  deleteAttendance: (id: string) => void;

  // Payroll & Payslip Management
  payrolls: PayrollRecord[];
  generateMonthlyPayroll: (month: string) => { count: number; message: string };
  updatePayrollStatus: (id: string, status: PayrollStatus) => void;
  deletePayroll: (id: string) => void;

  // Audit Logs & Historical Activity
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: NewAuditLogPayload) => void;
  clearAuditLogs: () => void;

  // Reset all state to factory defaults
  resetAllData: () => void;
}

const HRISContext = createContext<HRISContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'nexahr_enterprise_v4_';

// Resilient localStorage helpers for sandboxed iframe environments
function safeLoadStorage<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultValue;
    }
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    return JSON.parse(saved) as T;
  } catch (err) {
    console.warn(`[HRIS Storage] Safe fallback used for key "${key}":`, err);
    return defaultValue;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch (err) {
    console.warn(`[HRIS Storage] Failed to save key "${key}":`, err);
  }
}

function safeRemoveStorage(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn(`[HRIS Storage] Failed to remove key "${key}":`, err);
  }
}

function safeClearStorage(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear();
    }
  } catch (err) {
    console.warn('[HRIS Storage] Failed to clear storage:', err);
  }
}

export const HRISProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Initialize state with resilient localStorage fallbacks
  const [departments, setDepartments] = useState<Department[]>(() =>
    safeLoadStorage(`${STORAGE_KEY_PREFIX}depts`, INITIAL_DEPARTMENTS)
  );

  const [roles, setRoles] = useState<Role[]>(() => {
    const loaded = safeLoadStorage(`${STORAGE_KEY_PREFIX}roles`, INITIAL_ROLES);
    if (!loaded.some((r) => r.id === 'role_manager_mkt')) {
      return INITIAL_ROLES;
    }
    return loaded;
  });

  const [rolePermissions, setRolePermissions] = useState<
    Record<string, string[]>
  >(() => {
    try {
      const parsed = safeLoadStorage<Record<string, string[]> | null>(
        `${STORAGE_KEY_PREFIX}permissions`,
        null
      );
      if (
        parsed &&
        parsed['role_manager_mkt'] &&
        parsed['role_staff_fin'] &&
        parsed['role_staff_fin'].includes('view_kanban')
      ) {
        return parsed;
      }
    } catch {
      return INITIAL_ROLE_PERMISSIONS;
    }
    return INITIAL_ROLE_PERMISSIONS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const loaded = safeLoadStorage(`${STORAGE_KEY_PREFIX}users`, INITIAL_USERS);
    if (!loaded.some((u) => u.id === 'user_mgr_mkt')) {
      return INITIAL_USERS;
    }
    return loaded;
  });

  // Active session authentication status (defaults to false to present the Login Page)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_authenticated`);
        if (saved !== null) {
          return saved === 'true';
        }
      }
    } catch {
      // fallback
    }
    return false;
  });

  // Current active logged in user persona
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedId = localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`);
        if (savedId) {
          const found = INITIAL_USERS.find((u) => u.id === savedId);
          if (found) return found;
        }
      }
    } catch {
      // Ignored fallback
    }
    return INITIAL_USERS[0]; // Hendra Pratama (Owner) by default
  });

  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>(() =>
    safeLoadStorage(`${STORAGE_KEY_PREFIX}leave_balances`, INITIAL_LEAVE_BALANCES)
  );

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() =>
    safeLoadStorage(`${STORAGE_KEY_PREFIX}leave_requests`, INITIAL_LEAVE_REQUESTS)
  );

  const [reimbursements, setReimbursements] = useState<Reimbursement[]>(() =>
    safeLoadStorage(`${STORAGE_KEY_PREFIX}reimbursements`, INITIAL_REIMBURSEMENTS)
  );

  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    safeLoadStorage(`${STORAGE_KEY_PREFIX}notifications`, INITIAL_NOTIFICATIONS)
  );

  const [tasks, setTasks] = useState<KanbanTask[]>(() =>
    safeLoadStorage(`${STORAGE_KEY_PREFIX}tasks`, INITIAL_TASKS)
  );

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() =>
    safeLoadStorage(`${STORAGE_KEY_PREFIX}audit_logs`, INITIAL_AUDIT_LOGS)
  );

  const [attendances, setAttendances] = useState<AttendanceRecord[]>(() =>
    safeLoadStorage(`${STORAGE_KEY_PREFIX}attendances`, INITIAL_ATTENDANCE)
  );

  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>(() =>
    safeLoadStorage(`${STORAGE_KEY_PREFIX}overtime_requests`, INITIAL_OVERTIME_REQUESTS)
  );

  const [payrolls, setPayrolls] = useState<PayrollRecord[]>(() =>
    safeLoadStorage(`${STORAGE_KEY_PREFIX}payrolls`, INITIAL_PAYROLLS)
  );

  // Offline Synchronization & Storage Persistence State
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const effectiveOnline = isOnline && !isOfflineSimulated;

  const [pendingOfflineActions, setPendingOfflineActions] = useState<
    OfflineSyncAction[]
  >(() => safeLoadStorage(`${STORAGE_KEY_PREFIX}offline_queue`, []));

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage
        ? localStorage.getItem(`${STORAGE_KEY_PREFIX}last_synced_at`)
        : null;
    } catch {
      return null;
    }
  });

  const [storageUsageBytes, setStorageUsageBytes] = useState<number>(0);

  // Socket.io Real-Time Event State
  const [socketStatus, setSocketStatus] = useState<SocketConnectionStatus>(
    globalSocket.status
  );
  const [socketLatency, setSocketLatency] = useState<number>(globalSocket.latency);
  const [socketRooms, setSocketRooms] = useState<string[]>(globalSocket.getRooms());
  const [activeSocketToasts, setActiveSocketToasts] = useState<
    SocketApprovalPayload[]
  >([]);

  // Sound chime for real-time notification
  const playNotificationChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(
        880,
        audioCtx.currentTime + 0.12
      ); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, []);

  // Save changes to localStorage with resilient safeSetStorage
  useEffect(() => {
    safeSetStorage(`${STORAGE_KEY_PREFIX}depts`, JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    safeSetStorage(`${STORAGE_KEY_PREFIX}roles`, JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    safeSetStorage(
      `${STORAGE_KEY_PREFIX}permissions`,
      JSON.stringify(rolePermissions)
    );
  }, [rolePermissions]);

  useEffect(() => {
    safeSetStorage(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeSetStorage(
      `${STORAGE_KEY_PREFIX}current_user_id`,
      currentUser.id
    );
  }, [currentUser]);

  useEffect(() => {
    safeSetStorage(
      `${STORAGE_KEY_PREFIX}leave_balances`,
      JSON.stringify(leaveBalances)
    );
  }, [leaveBalances]);

  useEffect(() => {
    safeSetStorage(
      `${STORAGE_KEY_PREFIX}leave_requests`,
      JSON.stringify(leaveRequests)
    );
  }, [leaveRequests]);

  useEffect(() => {
    safeSetStorage(
      `${STORAGE_KEY_PREFIX}reimbursements`,
      JSON.stringify(reimbursements)
    );
  }, [reimbursements]);

  useEffect(() => {
    safeSetStorage(
      `${STORAGE_KEY_PREFIX}notifications`,
      JSON.stringify(notifications)
    );
  }, [notifications]);

  useEffect(() => {
    safeSetStorage(
      `${STORAGE_KEY_PREFIX}tasks`,
      JSON.stringify(tasks)
    );
  }, [tasks]);

  useEffect(() => {
    safeSetStorage(
      `${STORAGE_KEY_PREFIX}audit_logs`,
      JSON.stringify(auditLogs)
    );
  }, [auditLogs]);

  useEffect(() => {
    safeSetStorage(
      `${STORAGE_KEY_PREFIX}attendances`,
      JSON.stringify(attendances)
    );
  }, [attendances]);

  useEffect(() => {
    safeSetStorage(
      `${STORAGE_KEY_PREFIX}overtime_requests`,
      JSON.stringify(overtimeRequests)
    );
  }, [overtimeRequests]);

  useEffect(() => {
    safeSetStorage(
      `${STORAGE_KEY_PREFIX}payrolls`,
      JSON.stringify(payrolls)
    );
  }, [payrolls]);

  // Offline sync queue storage persistence
  useEffect(() => {
    safeSetStorage(
      `${STORAGE_KEY_PREFIX}offline_queue`,
      JSON.stringify(pendingOfflineActions)
    );
  }, [pendingOfflineActions]);

  // Network online/offline event listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculate current storage usage across all HRIS keys
  useEffect(() => {
    const keys = [
      `${STORAGE_KEY_PREFIX}depts`,
      `${STORAGE_KEY_PREFIX}roles`,
      `${STORAGE_KEY_PREFIX}permissions`,
      `${STORAGE_KEY_PREFIX}users`,
      `${STORAGE_KEY_PREFIX}current_user_id`,
      `${STORAGE_KEY_PREFIX}leave_balances`,
      `${STORAGE_KEY_PREFIX}leave_requests`,
      `${STORAGE_KEY_PREFIX}reimbursements`,
      `${STORAGE_KEY_PREFIX}notifications`,
      `${STORAGE_KEY_PREFIX}tasks`,
      `${STORAGE_KEY_PREFIX}audit_logs`,
      `${STORAGE_KEY_PREFIX}attendances`,
      `${STORAGE_KEY_PREFIX}overtime_requests`,
      `${STORAGE_KEY_PREFIX}payrolls`,
      `${STORAGE_KEY_PREFIX}offline_queue`,
      `${STORAGE_KEY_PREFIX}last_synced_at`,
    ];
    setStorageUsageBytes(calculateStorageUsageBytes(keys));
  }, [
    roles,
    rolePermissions,
    users,
    currentUser,
    leaveBalances,
    leaveRequests,
    reimbursements,
    notifications,
    tasks,
    auditLogs,
    attendances,
    overtimeRequests,
    payrolls,
    pendingOfflineActions,
  ]);

  // Keep currentUser synced if user record changes (e.g. role update)
  useEffect(() => {
    const updated = users.find((u) => u.id === currentUser.id);
    if (updated && updated.roleId !== currentUser.roleId) {
      setCurrentUser(updated);
    }
  }, [users, currentUser.id]);

  // Dismiss a live floating socket toast
  const dismissSocketToast = useCallback((id: string) => {
    setActiveSocketToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Socket Connection Toggle
  const toggleSocketConnection = useCallback(() => {
    if (globalSocket.connected) {
      globalSocket.disconnect();
      setSocketStatus('disconnected');
    } else {
      globalSocket.connect();
      setSocketStatus('connected');
      setSocketLatency(globalSocket.latency);
    }
  }, []);

  const reconnectSocket = useCallback(() => {
    globalSocket.disconnect();
    setSocketStatus('connecting');
    setTimeout(() => {
      globalSocket.connect();
      setSocketStatus('connected');
      setSocketLatency(Math.floor(16 + Math.random() * 12));
    }, 600);
  }, []);

  // Listen to incoming simulated Socket.io events
  useEffect(() => {
    const handleApprovalEvent = (payload: SocketApprovalPayload) => {
      // Play chime
      playNotificationChime();

      // Show temporary floating toast at the top
      setActiveSocketToasts((prev) => [payload, ...prev.slice(0, 3)]);

      // Auto dismiss toast after 6 seconds
      setTimeout(() => {
        dismissSocketToast(payload.id);
      }, 6000);

      // Add to persistent notification drawer
      const newNotif: NotificationItem = {
        id: `notif_sock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: 'all',
        title: `[Socket.io] ${payload.title}`,
        message: `${payload.applicantName} (${payload.departmentName}): ${payload.stageName} • ${payload.amountOrDuration}`,
        type: 'socket',
        targetModule: 'approval',
        read: false,
        createdAt: new Date().toISOString(),
        socketEvent: payload.event,
      };

      setNotifications((prev) => [newNotif, ...prev]);
    };

    const cleanup = globalSocket.on('approval:event', handleApprovalEvent);

    return () => {
      cleanup();
    };
  }, [playNotificationChime, dismissSocketToast]);

  const addNotification = (
    item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>
  ) => {
    const newNotif: NotificationItem = {
      ...item,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    playNotificationChime();
  };

  // Audit Log Dispatcher
  const addAuditLog = useCallback(
    (entry: NewAuditLogPayload) => {
      const currentRoleObj = roles.find((r) => r.id === currentUser.roleId);
      const newEntry = createAuditEntry({
        ...entry,
        actorId: entry.actorId || currentUser.id,
        actorName: entry.actorName || currentUser.name,
        actorRole: entry.actorRole || currentRoleObj?.label || 'Pengguna',
        actorAvatar: entry.actorAvatar || currentUser.avatar,
        ipAddress: entry.ipAddress || '192.168.1.12 (Session Aktif)',
      });
      setAuditLogs((prev) => [newEntry, ...prev]);
    },
    [currentUser, roles]
  );

  const clearAuditLogs = useCallback(() => {
    setAuditLogs([]);
  }, []);

  const queueOfflineMutation = useCallback(
    (
      actionType: OfflineActionType,
      entityType: OfflineEntityType,
      entityId: string,
      summary: string,
      payload: Record<string, unknown>
    ) => {
      const newAction = createOfflineSyncAction({
        actionType,
        entityType,
        entityId,
        summary,
        payload,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: roles.find((r) => r.id === currentUser.roleId)?.name || 'Karyawan',
      });

      setPendingOfflineActions((prev) => enqueueOfflineAction(prev, newAction));
    },
    [currentUser, roles]
  );

  const toggleOfflineSimulation = useCallback(() => {
    setIsOfflineSimulated((prev) => !prev);
  }, []);

  const clearOfflineQueue = useCallback(() => {
    setPendingOfflineActions([]);
    safeRemoveStorage(`${STORAGE_KEY_PREFIX}offline_queue`);
  }, []);

  const removeOfflineAction = useCallback((id: string) => {
    setPendingOfflineActions((prev) => dequeueOfflineAction(prev, id));
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    if (pendingOfflineActions.length === 0 || isSyncing) return;
    setIsSyncing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const count = pendingOfflineActions.length;
      const now = new Date().toISOString();
      setLastSyncedAt(now);
      safeSetStorage(`${STORAGE_KEY_PREFIX}last_synced_at`, now);

      addAuditLog({
        category: 'security',
        action: 'SYNC_OFFLINE_QUEUE',
        actionTitle: 'Sinkronisasi Data Offline Berhasil',
        targetType: 'system',
        targetName: 'Local Storage Sync Engine',
        description: `Sinkronisasi ${count} tindakan operasional HR yang dikerjakan saat mode offline ke basis data utama.`,
        severity: 'success',
      });

      setPendingOfflineActions([]);
      safeRemoveStorage(`${STORAGE_KEY_PREFIX}offline_queue`);

      addNotification({
        recipientId: 'all',
        title: 'Data Offline Berhasil Disinkronkan',
        message: `${count} perubahan data lokal telah disinkronkan ke server secara aman.`,
        type: 'system',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [pendingOfflineActions, isSyncing, addAuditLog]);

  // Auto-sync when effective connection is restored
  useEffect(() => {
    if (effectiveOnline && pendingOfflineActions.length > 0 && !isSyncing) {
      const timer = setTimeout(() => {
        syncOfflineQueue();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [effectiveOnline, pendingOfflineActions.length, isSyncing, syncOfflineQueue]);

  const switchUserById = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      const targetRole = roles.find((r) => r.id === target.roleId);
      addAuditLog({
        actorId: target.id,
        actorName: target.name,
        actorRole: targetRole?.label || 'Pengguna',
        actorAvatar: target.avatar,
        category: 'security',
        action: 'PERSONA_SWITCH',
        actionTitle: 'Simulasi Pergantian Persona Pengguna',
        targetId: target.id,
        targetType: 'system',
        targetName: `${target.name} (${targetRole?.label || target.roleId})`,
        description: `Pengguna aktif beralih ke persona "${target.name}" dengan otorisasi role ${targetRole?.label || target.roleId}.`,
        severity: 'info',
        ipAddress: '192.168.1.12 (Session Aktif)',
      });
    }
  };

  const login = useCallback(
    async (
      identifier: string,
      password?: string,
      method: 'credentials' | 'sso_google' | 'sso_microsoft' | 'quick_persona' = 'credentials'
    ) => {
      // Simulate cryptographic check delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const auth = authenticateUser(users, identifier, password);
      if (!auth.isValid || !auth.matchedUser) {
        return {
          success: false,
          error: auth.error || 'Identitas atau password tidak sesuai.',
        };
      }

      const targetUser = auth.matchedUser;
      setCurrentUser(targetUser);
      setIsAuthenticated(true);
      safeSetStorage(`${STORAGE_KEY_PREFIX}is_authenticated`, 'true');
      safeSetStorage(`${STORAGE_KEY_PREFIX}current_user_id`, targetUser.id);

      const targetRole = roles.find((r) => r.id === targetUser.roleId);

      addAuditLog({
        actorId: targetUser.id,
        actorName: targetUser.name,
        actorRole: targetRole?.label || 'Pengguna',
        actorAvatar: targetUser.avatar,
        category: 'security',
        action: 'USER_LOGIN',
        actionTitle: 'Sesi Autentikasi Masuk Berhasil',
        targetId: targetUser.id,
        targetType: 'user',
        targetName: `${targetUser.name} (${targetUser.email})`,
        description: `Pengguna berhasil login via ${method.toUpperCase()} sebagai ${targetUser.position}.`,
        severity: 'info',
        ipAddress: '192.168.1.12 (Session Aktif)',
      });

      addNotification({
        recipientId: targetUser.id,
        title: 'Sesi Kerja Aktif',
        message: `Selamat datang kembali, ${targetUser.name}! Anda masuk dengan peran ${targetRole?.name || 'Staff'}.`,
        type: 'system',
      });

      return { success: true };
    },
    [users, roles, addAuditLog, addNotification]
  );

  const logout = useCallback(() => {
    // Bersihkan seluruh penyimpanan lokal browser agar data kembali ke awal (static demo data)
    safeClearStorage();

    // Reset seluruh state data kembali ke data awal (INITIAL DATA)
    setDepartments(INITIAL_DEPARTMENTS);
    setRoles(INITIAL_ROLES);
    setRolePermissions(INITIAL_ROLE_PERMISSIONS);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setLeaveBalances(INITIAL_LEAVE_BALANCES);
    setLeaveRequests(INITIAL_LEAVE_REQUESTS);
    setReimbursements(INITIAL_REIMBURSEMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setTasks(INITIAL_TASKS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setAttendances(INITIAL_ATTENDANCE);
    setOvertimeRequests(INITIAL_OVERTIME_REQUESTS);
    setPayrolls(INITIAL_PAYROLLS);
    setActiveSocketToasts([]);
    setPendingOfflineActions([]);
    setLastSyncedAt(null);

    // Set status sesi keluar
    setIsAuthenticated(false);
    safeSetStorage(`${STORAGE_KEY_PREFIX}is_authenticated`, 'false');
  }, []);

  const resetUserPassword = useCallback(
    async (identifier: string) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const res = resetPasswordToDefault(users, identifier);

      if (!res.success || !res.user) {
        return {
          success: false,
          error: res.error || 'Akun tidak ditemukan di direktori pengguna.',
          defaultPassword: DEFAULT_USER_PASSWORD,
        };
      }

      const updatedUser = res.user;
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );

      const targetRole = roles.find((r) => r.id === updatedUser.roleId);

      addAuditLog({
        actorId: updatedUser.id,
        actorName: updatedUser.name,
        actorRole: targetRole?.label || 'Pengguna',
        actorAvatar: updatedUser.avatar,
        category: 'security',
        action: 'PASSWORD_RESET',
        actionTitle: `Reset Kata Sandi ke Default (${DEFAULT_USER_PASSWORD})`,
        targetId: updatedUser.id,
        targetType: 'user',
        targetName: `${updatedUser.name} (${updatedUser.email})`,
        description: `Kata sandi akun ${updatedUser.name} (${updatedUser.employeeNumber}) telah direset ke nilai default resmi (${DEFAULT_USER_PASSWORD}).`,
        severity: 'warning',
        ipAddress: '192.168.1.12 (Session Aktif)',
      });

      addNotification({
        recipientId: updatedUser.id,
        title: 'Kata Sandi Berhasil Direset',
        message: `Kata sandi akun Anda telah diatur ulang ke default (${DEFAULT_USER_PASSWORD}).`,
        type: 'system',
      });

      return {
        success: true,
        user: updatedUser,
        defaultPassword: DEFAULT_USER_PASSWORD,
      };
    },
    [users, roles, addAuditLog, addNotification]
  );

  // Permission Checks
  const hasUserPermission = (permissionId: string): boolean => {
    return hasPermission(currentUser.roleId, permissionId, rolePermissions);
  };

  const canAccess = (
    module: ModuleType,
    action: ActionType = 'view'
  ): boolean => {
    return canAccessModule(
      currentUser.roleId,
      module,
      action,
      rolePermissions
    );
  };

  const togglePermission = (roleId: string, permissionId: string) => {
    const roleObj = roles.find((r) => r.id === roleId);
    const permObj = ALL_PERMISSIONS.find((p) => p.id === permissionId);
    const wasGranted = (rolePermissions[roleId] || []).includes(permissionId);

    setRolePermissions((prev) => {
      const currentList = prev[roleId] || [];
      const updatedList = currentList.includes(permissionId)
        ? currentList.filter((p) => p !== permissionId)
        : [...currentList, permissionId];

      return {
        ...prev,
        [roleId]: updatedList,
      };
    });

    addNotification({
      recipientId: 'all',
      title: 'Dynamic RBAC Matrix Diperbarui',
      message: `Owner telah memperbarui hak akses sistem untuk role ${roleId}.`,
      type: 'role',
      targetModule: 'roles',
    });

    addAuditLog({
      category: 'role',
      action: 'TOGGLE_PERMISSION',
      actionTitle: wasGranted ? 'Pencabutan Izin Role' : 'Pemberian Izin Role',
      targetId: roleId,
      targetType: 'permission',
      targetName: `${roleObj?.label || roleId} - ${permObj?.name || permissionId}`,
      description: `${wasGranted ? 'Mencabut' : 'Memberikan'} izin "${permObj?.name || permissionId}" pada matriks otorisasi role "${roleObj?.label || roleId}".`,
      changes: [
        {
          field: permissionId,
          label: permObj?.name || permissionId,
          oldValue: wasGranted ? 'Diizinkan (Aktif)' : 'Tidak Diizinkan',
          newValue: wasGranted ? 'Tidak Diizinkan' : 'Diizinkan (Aktif)',
        },
      ],
      severity: 'warning',
      ipAddress: '192.168.1.12 (Session Aktif)',
    });
  };

  const createRole = (roleData: Omit<Role, 'id'>): Role => {
    const newId = `role_${Date.now()}`;
    const newRole: Role = {
      ...roleData,
      id: newId,
      isSystemRole: false,
    };
    setRoles((prev) => [...prev, newRole]);
    setRolePermissions((prev) => ({
      ...prev,
      [newId]: ['view_dashboard'], // Baseline access
    }));

    addNotification({
      recipientId: 'all',
      title: 'Role Baru Ditambahkan',
      message: `Role baru "${newRole.label}" telah dibuat oleh Super Admin.`,
      type: 'role',
      targetModule: 'roles',
    });

    addAuditLog({
      category: 'role',
      action: 'CREATE_ROLE',
      actionTitle: 'Pembuatan Role Baru',
      targetId: newId,
      targetType: 'role',
      targetName: newRole.label,
      description: `Membuat role baru "${newRole.label}" (${newRole.name}) dalam organisasi.`,
      severity: 'info',
    });

    return newRole;
  };

  const updateRole = (roleId: string, data: Partial<Role>) => {
    const roleObj = roles.find((r) => r.id === roleId);
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, ...data } : r))
    );

    addAuditLog({
      category: 'role',
      action: 'UPDATE_ROLE',
      actionTitle: 'Pembaruan Konfigurasi Role',
      targetId: roleId,
      targetType: 'role',
      targetName: data.label || roleObj?.label || roleId,
      description: `Mengubah konfigurasi role "${roleObj?.label || roleId}".`,
      severity: 'info',
    });
  };

  const deleteRole = (roleId: string) => {
    const roleObj = roles.find((r) => r.id === roleId);
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    setRolePermissions((prev) => {
      const copy = { ...prev };
      delete copy[roleId];
      return copy;
    });

    addAuditLog({
      category: 'role',
      action: 'DELETE_ROLE',
      actionTitle: 'Penghapusan Role Sistem',
      targetId: roleId,
      targetType: 'role',
      targetName: roleObj?.label || roleId,
      description: `Menghapus role "${roleObj?.label || roleId}" dan mencabut seluruh izin terkait.`,
      severity: 'critical',
    });
  };

  const resetPermissionsToDefault = () => {
    setRolePermissions(INITIAL_ROLE_PERMISSIONS);
    setRoles(INITIAL_ROLES);
    addNotification({
      recipientId: 'all',
      title: 'RBAC Reset ke Standar',
      message: 'Matriks otorisasi dikembalikan ke pengaturan bawaan pabrik.',
      type: 'system',
      targetModule: 'roles',
    });

    addAuditLog({
      category: 'security',
      action: 'RESET_RBAC_PERMISSIONS',
      actionTitle: 'Reset Otorisasi RBAC ke Pengaturan Pabrik',
      targetType: 'system',
      targetName: 'Seluruh Role & Matriks Otorisasi',
      description: 'Mengembalikan matriks hak akses seluruh role ke pengaturan awal sistem.',
      severity: 'critical',
    });
  };

  // Employee management
  const createUser = (userData: Omit<User, 'id'>, initialQuota: number = 12) => {
    const newId = `user_${Date.now()}`;
    const newUser: User = {
      ...userData,
      id: newId,
    };

    const newBalance: LeaveBalance = {
      id: `lb_${newId}`,
      userId: newId,
      annualQuota: initialQuota,
      usedQuota: 0,
      remainingQuota: initialQuota,
      carryOverQuota: 0,
    };

    setUsers((prev) => [...prev, newUser]);
    setLeaveBalances((prev) => [...prev, newBalance]);

    addNotification({
      recipientId: 'all',
      title: 'Karyawan Baru Terdaftar',
      message: `${newUser.name} telah didaftarkan pada departemen terkait.`,
      type: 'system',
      targetModule: 'employees',
    });

    if (!effectiveOnline) {
      queueOfflineMutation(
        'CREATE_EMPLOYEE',
        'employee',
        newId,
        `Pendaftaran karyawan baru ${newUser.name}`,
        { user: newUser, initialQuota } as unknown as Record<string, unknown>
      );
    }

    addAuditLog({
      category: 'employee',
      action: 'CREATE_EMPLOYEE',
      actionTitle: 'Pendaftaran Karyawan Baru',
      targetId: newId,
      targetType: 'user',
      targetName: `${newUser.name} (${newUser.employeeNumber})`,
      description: `Mendaftarkan karyawan baru ${newUser.name} dengan jabatan ${newUser.position} dan jatah cuti awal ${initialQuota} hari.`,
      changes: [
        { field: 'employeeNumber', label: 'NIP Karyawan', oldValue: null, newValue: newUser.employeeNumber },
        { field: 'position', label: 'Jabatan Organisasi', oldValue: null, newValue: newUser.position },
      ],
      severity: 'info',
    });
  };

  const updateUser = (userId: string, data: Partial<User>) => {
    const existing = users.find((u) => u.id === userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...data } : u))
    );

    const changes = Object.entries(data).map(([key, val]) => ({
      field: key,
      label:
        key === 'position'
          ? 'Jabatan'
          : key === 'departmentId'
          ? 'Departemen'
          : key === 'status'
          ? 'Status Karyawan'
          : key === 'name'
          ? 'Nama Lengkap'
          : key === 'phone'
          ? 'Nomor Telepon'
          : key === 'email'
          ? 'Email Kerja'
          : key,
      oldValue: existing ? String((existing as unknown as Record<string, unknown>)[key] ?? '') : '',
      newValue: String(val ?? ''),
    }));

    if (!effectiveOnline) {
      queueOfflineMutation(
        'UPDATE_EMPLOYEE',
        'employee',
        userId,
        `Pembaruan profil ${existing?.name || userId}`,
        data as unknown as Record<string, unknown>
      );
    }

    addAuditLog({
      category: 'employee',
      action: 'UPDATE_EMPLOYEE',
      actionTitle: 'Pembaruan Data Karyawan',
      targetId: userId,
      targetType: 'user',
      targetName: existing?.name || 'Karyawan',
      description: `Memperbarui rincian profil kepegawaian untuk ${existing?.name || 'Karyawan'}.`,
      changes,
      severity: 'info',
    });
  };

  const updateUserRole = (userId: string, roleId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const oldRole = roles.find((r) => r.id === targetUser?.roleId);
    const newRole = roles.find((r) => r.id === roleId);

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, roleId } : u))
    );

    addNotification({
      recipientId: userId,
      title: 'Perubahan Hak Akses Role',
      message: `Jabatan role Anda telah diubah menjadi "${newRole?.label || roleId}".`,
      type: 'role',
    });

    addAuditLog({
      category: 'role',
      action: 'UPDATE_USER_ROLE',
      actionTitle: 'Perubahan Hak Akses Role Karyawan',
      targetId: userId,
      targetType: 'user',
      targetName: targetUser?.name || 'Karyawan',
      description: `Mengubah hak akses role ${targetUser?.name || 'Karyawan'} dari "${oldRole?.label || 'Role Lama'}" menjadi "${newRole?.label || 'Role Baru'}".`,
      changes: [
        {
          field: 'roleId',
          label: 'Hak Akses Role',
          oldValue: oldRole?.label || targetUser?.roleId,
          newValue: newRole?.label || roleId,
        },
      ],
      severity: 'warning',
    });
  };

  const updateLeaveQuota = (userId: string, newQuota: number) => {
    const targetUser = users.find((u) => u.id === userId);
    const oldBalance = leaveBalances.find((b) => b.userId === userId);

    setLeaveBalances((prev) =>
      prev.map((b) => {
        if (b.userId === userId) {
          const remaining = Math.max(0, newQuota - b.usedQuota);
          return {
            ...b,
            annualQuota: newQuota,
            remainingQuota: remaining,
          };
        }
        return b;
      })
    );

    addAuditLog({
      category: 'employee',
      action: 'UPDATE_LEAVE_QUOTA',
      actionTitle: 'Penyesuaian Kuota Cuti Karyawan',
      targetId: userId,
      targetType: 'user',
      targetName: targetUser?.name || 'Karyawan',
      description: `Mengubah jatah kuota cuti tahunan ${targetUser?.name || 'Karyawan'} menjadi ${newQuota} hari.`,
      changes: [
        {
          field: 'annualQuota',
          label: 'Kuota Cuti Tahunan',
          oldValue: `${oldBalance?.annualQuota ?? 12} Hari`,
          newValue: `${newQuota} Hari`,
        },
      ],
      severity: 'info',
    });
  };

  const reassignEmployeeManagerAction = (
    employeeId: string,
    newManagerId: string | null
  ): { success: boolean; error?: string } => {
    const result = reassignEmployeeManager(users, employeeId, newManagerId);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const employee = users.find((u) => u.id === employeeId);
    const oldManager = users.find((u) => u.id === employee?.managerId);
    const newManager = newManagerId ? users.find((u) => u.id === newManagerId) : null;

    setUsers(result.users);

    addNotification({
      recipientId: employeeId,
      title: 'Pembaruan Struktur Pelaporan Organisasi',
      message: newManager
        ? `Struktur hierarki Anda telah dialihkan. Atasan langsung baru: ${newManager.name} (${newManager.position}).`
        : 'Anda sekarang berada pada level puncak tanpa atasan langsung.',
      type: 'role',
    });

    if (newManager) {
      addNotification({
        recipientId: newManager.id,
        title: 'Anggota Tim Baru Ditugaskan',
        message: `${employee?.name} (${employee?.position}) sekarang melapor langsung kepada Anda.`,
        type: 'role',
      });
    }

    addAuditLog({
      category: 'employee',
      action: 'REASSIGN_MANAGER',
      actionTitle: 'Pengalihan Atasan Langsung (Struktur Hierarki)',
      targetId: employeeId,
      targetType: 'user',
      targetName: employee?.name || 'Karyawan',
      description: `Mengalihkan pelaporan hierarki ${employee?.name || 'Karyawan'} dari "${oldManager?.name || 'Tanpa Atasan'}" ke "${newManager?.name || 'Tanpa Atasan (Root)'}".`,
      changes: [
        {
          field: 'managerId',
          label: 'Atasan Langsung',
          oldValue: oldManager?.name || 'Tidak Ada (Root)',
          newValue: newManager?.name || 'Tidak Ada (Root)',
        },
      ],
      severity: 'info',
    });

    return { success: true };
  };

  // Department & Division Management
  const createDepartment = (deptData: Omit<Department, 'id'>): Department => {
    const { updatedDepartments, newDepartment } = addDepartmentToList(
      departments,
      deptData
    );
    setDepartments(updatedDepartments);

    addNotification({
      recipientId: 'all',
      title: 'Divisi Baru Ditambahkan',
      message: `Divisi "${newDepartment.name}" (${newDepartment.code}) berhasil didaftarkan.`,
      type: 'system',
      targetModule: 'employees',
    });

    addAuditLog({
      category: 'employee',
      action: 'CREATE_DEPARTMENT',
      actionTitle: 'Pembuatan Divisi Baru',
      targetId: newDepartment.id,
      targetType: 'system',
      targetName: newDepartment.name,
      description: `Menambahkan divisi baru "${newDepartment.name}" dengan kode ${newDepartment.code}, manajer ${newDepartment.managerName || '-'}, dan lokasi ${newDepartment.location || '-'}.`,
      severity: 'info',
    });

    return newDepartment;
  };

  const updateDepartment = (deptId: string, data: Partial<Department>) => {
    const existing = departments.find((d) => d.id === deptId);
    const updated = updateDepartmentInList(departments, deptId, data);
    setDepartments(updated);

    const updatedDept = updated.find((d) => d.id === deptId);

    addNotification({
      recipientId: 'all',
      title: 'Data Divisi Diperbarui',
      message: `Informasi divisi "${updatedDept?.name || existing?.name || deptId}" telah diperbarui.`,
      type: 'system',
      targetModule: 'employees',
    });

    addAuditLog({
      category: 'employee',
      action: 'UPDATE_DEPARTMENT',
      actionTitle: 'Pembaruan Data Divisi',
      targetId: deptId,
      targetType: 'system',
      targetName: updatedDept?.name || existing?.name || deptId,
      description: `Mengubah konfigurasi divisi "${existing?.name || deptId}".`,
      severity: 'info',
    });
  };

  const deleteDepartment = (
    deptId: string,
    reassignToDeptId?: string
  ): { success: boolean; error?: string } => {
    const res = removeDepartmentFromList(
      departments,
      users,
      deptId,
      reassignToDeptId
    );

    if (!res.success) {
      return { success: false, error: res.error };
    }

    setDepartments(res.updatedDepartments);
    setUsers(res.updatedUsers);

    addNotification({
      recipientId: 'all',
      title: 'Divisi Dihapus',
      message: `Divisi "${res.deletedDepartment?.name || deptId}" telah dihapus dari sistem.${
        res.reassignedCount > 0 && res.reassignedTo
          ? ` ${res.reassignedCount} karyawan dialihkan ke divisi "${res.reassignedTo.name}".`
          : ''
      }`,
      type: 'system',
      targetModule: 'employees',
    });

    addAuditLog({
      category: 'employee',
      action: 'DELETE_DEPARTMENT',
      actionTitle: 'Penghapusan Divisi Sistem',
      targetId: deptId,
      targetType: 'system',
      targetName: res.deletedDepartment?.name || deptId,
      description: `Menghapus divisi "${res.deletedDepartment?.name || deptId}". ${
        res.reassignedCount > 0 && res.reassignedTo
          ? `${res.reassignedCount} karyawan berhasil dialihkan ke divisi "${res.reassignedTo.name}".`
          : 'Tidak ada karyawan yang terpengaruh.'
      }`,
      severity: 'critical',
    });

    return { success: true };
  };

  // Leave Submissions
  const submitLeaveRequest = (data: {
    leaveType: LeaveRequest['leaveType'];
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    emergencyContact: string;
  }): { success: boolean; error?: string } => {
    // Balance check
    const balance = leaveBalances.find((b) => b.userId === currentUser.id);
    if (data.leaveType === 'Cuti Tahunan') {
      const remaining = balance?.remainingQuota ?? 0;
      if (data.totalDays > remaining) {
        return {
          success: false,
          error: `Sisa kuota cuti tahunan Anda (${remaining} hari) tidak mencukupi untuk durasi ${data.totalDays} hari.`,
        };
      }
    }

    const newRequestId = `req_leave_${Date.now()}`;
    const newRequest: LeaveRequest = {
      id: newRequestId,
      userId: currentUser.id,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: data.totalDays,
      reason: data.reason,
      emergencyContact: data.emergencyContact,
      status: 'PENDING_MANAGER',
      currentApproverRole: 'Manajer',
      createdAt: new Date().toISOString(),
      approvalLogs: [
        {
          id: `log_${Date.now()}`,
          requestId: newRequestId,
          stageName: 'Pengajuan Karyawan',
          approverId: currentUser.id,
          approverName: currentUser.name,
          approverRole:
            roles.find((r) => r.id === currentUser.roleId)?.name || 'Karyawan',
          decision: 'APPROVED',
          note: 'Pengajuan cuti berhasil diserahkan ke meja antrean persetujuan.',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setLeaveRequests((prev) => [newRequest, ...prev]);

    if (!effectiveOnline) {
      queueOfflineMutation(
        'CREATE_LEAVE_REQUEST',
        'leave',
        newRequestId,
        `Pengajuan ${data.leaveType} (${data.totalDays} hari) oleh ${currentUser.name}`,
        data as unknown as Record<string, unknown>
      );
    }

    // Broadcast through Simulated Socket.io
    const dept = departments.find((d) => d.id === currentUser.departmentId);
    const socketPayload = createApprovalSocketPayload(
      'approval:new',
      'leave',
      newRequestId,
      currentUser.name,
      `Permohonan ${data.leaveType}`,
      dept?.name || 'Divisi Umum',
      'Manajer',
      `${data.totalDays} Hari Kerja`
    );
    globalSocket.dispatchApprovalEvent(socketPayload);

    return { success: true };
  };

  const approveLeave = (requestId: string, note: string = 'Disetujui.') => {
    let updatedReq: LeaveRequest | undefined;

    setLeaveRequests((prev) => {
      return prev.map((req) => {
        if (req.id !== requestId) return req;

        const next = getNextLeaveApprovalStage(req.status, 'APPROVED');
        const approverRoleName =
          roles.find((r) => r.id === currentUser.roleId)?.name || 'Atasan';

        const stageName =
          req.status === 'PENDING_MANAGER'
            ? 'Persetujuan Manajer (Tier 1)'
            : 'Persetujuan HRD Final (Tier 2)';

        const newLog = {
          id: `log_${Date.now()}`,
          requestId,
          stageName,
          approverId: currentUser.id,
          approverName: currentUser.name,
          approverRole: approverRoleName,
          decision: 'APPROVED' as const,
          note,
          timestamp: new Date().toISOString(),
        };

        // If it is final approval, auto-deduct the leave quota!
        if (next.nextStatus === 'APPROVED' && req.leaveType === 'Cuti Tahunan') {
          setLeaveBalances((bList) =>
            bList.map((bal) => {
              if (bal.userId === req.userId) {
                const used = bal.usedQuota + req.totalDays;
                const rem = Math.max(0, bal.annualQuota - used);
                return {
                  ...bal,
                  usedQuota: used,
                  remainingQuota: rem,
                };
              }
              return bal;
            })
          );
        }

        updatedReq = {
          ...req,
          status: next.nextStatus,
          currentApproverRole: next.nextRole,
          approvalLogs: [...req.approvalLogs, newLog],
        };

        return updatedReq;
      });
    });

    const targetReq = leaveRequests.find((r) => r.id === requestId);
    const applicant = users.find((u) => u.id === targetReq?.userId);
    const dept = departments.find((d) => d.id === applicant?.departmentId);

    // Emit socket event for real-time tracking
    const eventType =
      targetReq?.status === 'PENDING_MANAGER'
        ? 'approval:stage_passed'
        : 'approval:final_approved';

    const socketPayload = createApprovalSocketPayload(
      eventType,
      'leave',
      requestId,
      applicant?.name || 'Karyawan',
      `Persetujuan ${targetReq?.leaveType || 'Cuti'} Disahkan`,
      dept?.name || 'Divisi Umum',
      targetReq?.status === 'PENDING_MANAGER' ? 'HRD' : 'All',
      `${targetReq?.totalDays || 1} Hari`
    );
    globalSocket.dispatchApprovalEvent(socketPayload);

    const isFinal = targetReq?.status === 'PENDING_HRD' || targetReq?.currentApproverRole === 'HRD';

    if (!effectiveOnline) {
      queueOfflineMutation(
        'PROCESS_LEAVE_APPROVAL',
        'leave',
        requestId,
        `Persetujuan cuti ${targetReq?.leaveType || 'Cuti'} oleh ${currentUser.name}`,
        { requestId, decision: 'APPROVED', note }
      );
    }

    addAuditLog({
      category: 'approval',
      action: 'APPROVE_LEAVE',
      actionTitle: isFinal ? 'Persetujuan Final Cuti Karyawan' : 'Persetujuan Tier-1 Manajer (Cuti)',
      targetId: requestId,
      targetType: 'leave_request',
      targetName: `${targetReq?.leaveType || 'Cuti'} - ${applicant?.name || 'Karyawan'}`,
      description: `${currentUser.name} (${roles.find((r) => r.id === currentUser.roleId)?.label || 'Approver'}) menyetujui permohonan ${targetReq?.leaveType || 'Cuti'} (${targetReq?.totalDays || 1} Hari) untuk ${applicant?.name || 'Karyawan'}. Catatan: "${note}"`,
      changes: [
        {
          field: 'status',
          label: 'Status Pengajuan',
          oldValue: targetReq?.status,
          newValue: isFinal ? 'APPROVED' : 'PENDING_HRD',
        },
      ],
      severity: 'success',
      metadata: { note, requestId, applicantId: applicant?.id },
    });
  };

  const rejectLeave = (requestId: string, reason: string) => {
    setLeaveRequests((prev) => {
      return prev.map((req) => {
        if (req.id !== requestId) return req;

        const approverRoleName =
          roles.find((r) => r.id === currentUser.roleId)?.name || 'Atasan';

        const newLog = {
          id: `log_${Date.now()}`,
          requestId,
          stageName: 'Penolakan Pengajuan',
          approverId: currentUser.id,
          approverName: currentUser.name,
          approverRole: approverRoleName,
          decision: 'REJECTED' as const,
          note: reason,
          timestamp: new Date().toISOString(),
        };

        return {
          ...req,
          status: 'REJECTED',
          currentApproverRole: null,
          approvalLogs: [...req.approvalLogs, newLog],
        };
      });
    });

    const targetReq = leaveRequests.find((r) => r.id === requestId);
    const applicant = users.find((u) => u.id === targetReq?.userId);

    const socketPayload = createApprovalSocketPayload(
      'approval:rejected',
      'leave',
      requestId,
      applicant?.name || 'Karyawan',
      `Permohonan Cuti Ditolak: "${reason}"`,
      'Divisi Pemohon',
      'All',
      `${targetReq?.totalDays || 1} Hari`
    );
    globalSocket.dispatchApprovalEvent(socketPayload);

    if (!effectiveOnline) {
      queueOfflineMutation(
        'PROCESS_LEAVE_APPROVAL',
        'leave',
        requestId,
        `Penolakan cuti ${targetReq?.leaveType || 'Cuti'} oleh ${currentUser.name}`,
        { requestId, decision: 'REJECTED', reason }
      );
    }

    addAuditLog({
      category: 'approval',
      action: 'REJECT_LEAVE',
      actionTitle: 'Penolakan Permohonan Cuti Karyawan',
      targetId: requestId,
      targetType: 'leave_request',
      targetName: `${targetReq?.leaveType || 'Cuti'} - ${applicant?.name || 'Karyawan'}`,
      description: `${currentUser.name} (${roles.find((r) => r.id === currentUser.roleId)?.label || 'Approver'}) menolak permohonan cuti untuk ${applicant?.name || 'Karyawan'}. Alasan: "${reason}"`,
      changes: [
        {
          field: 'status',
          label: 'Status Pengajuan',
          oldValue: targetReq?.status,
          newValue: 'REJECTED',
        },
      ],
      severity: 'warning',
      metadata: { reason, requestId, applicantId: applicant?.id },
    });
  };

  const deleteLeave = (requestId: string) => {
    setLeaveRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  // Reimbursements
  const submitReimbursement = (data: {
    category: Reimbursement['category'];
    amount: number;
    title: string;
    description: string;
    invoiceNumber: string;
    receiptName: string;
    receiptUrl: string;
    receiptDate: string;
  }): { success: boolean; error?: string } => {
    if (data.amount <= 0) {
      return {
        success: false,
        error: 'Nominal reimbursement harus lebih dari Rp 0.',
      };
    }

    const newId = `reimb_${Date.now()}`;
    const newReimb: Reimbursement = {
      id: newId,
      userId: currentUser.id,
      category: data.category,
      amount: data.amount,
      title: data.title,
      description: data.description,
      invoiceNumber: data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      receiptName: data.receiptName,
      receiptUrl: data.receiptUrl,
      receiptDate: data.receiptDate || new Date().toISOString().split('T')[0],
      status: 'PENDING_MANAGER',
      currentApproverRole: 'Manajer',
      createdAt: new Date().toISOString(),
      approvalLogs: [
        {
          id: `rlog_${Date.now()}`,
          requestId: newId,
          stageName: 'Pengajuan Klaim Karyawan',
          approverId: currentUser.id,
          approverName: currentUser.name,
          approverRole:
            roles.find((r) => r.id === currentUser.roleId)?.name || 'Karyawan',
          decision: 'APPROVED',
          note: 'Nota dan kuitansi klaim pengeluaran telah dilampirkan.',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setReimbursements((prev) => [newReimb, ...prev]);

    if (!effectiveOnline) {
      queueOfflineMutation(
        'CREATE_REIMBURSEMENT',
        'reimbursement',
        newId,
        `Klaim ${data.title} (${formatRupiah(data.amount)}) oleh ${currentUser.name}`,
        data as unknown as Record<string, unknown>
      );
    }

    // Dispatch via Socket.io
    const dept = departments.find((d) => d.id === currentUser.departmentId);
    const socketPayload = createApprovalSocketPayload(
      'approval:new',
      'reimbursement',
      newId,
      currentUser.name,
      `Klaim Nota: ${data.title}`,
      dept?.name || 'Divisi Umum',
      'Manajer',
      formatRupiah(data.amount)
    );
    globalSocket.dispatchApprovalEvent(socketPayload);

    return { success: true };
  };

  const approveReimbursement = (
    reimbursementId: string,
    note: string = 'Disetujui.'
  ) => {
    setReimbursements((prev) => {
      return prev.map((item) => {
        if (item.id !== reimbursementId) return item;

        const next = getNextReimbursementApprovalStage(item.status, 'APPROVED');
        const approverRoleName =
          roles.find((r) => r.id === currentUser.roleId)?.name || 'Atasan';

        const stageName =
          item.status === 'PENDING_MANAGER'
            ? 'Persetujuan Manajer (Tier 1)'
            : 'Persetujuan HRD / Finance Final (Tier 2)';

        const newLog = {
          id: `rlog_${Date.now()}`,
          requestId: reimbursementId,
          stageName,
          approverId: currentUser.id,
          approverName: currentUser.name,
          approverRole: approverRoleName,
          decision: 'APPROVED' as const,
          note,
          timestamp: new Date().toISOString(),
        };

        return {
          ...item,
          status: next.nextStatus,
          currentApproverRole: next.nextRole,
          approvalLogs: [...item.approvalLogs, newLog],
        };
      });
    });

    const target = reimbursements.find((r) => r.id === reimbursementId);
    const applicant = users.find((u) => u.id === target?.userId);
    const dept = departments.find((d) => d.id === applicant?.departmentId);

    const eventType =
      target?.status === 'PENDING_MANAGER'
        ? 'approval:stage_passed'
        : 'approval:final_approved';

    const socketPayload = createApprovalSocketPayload(
      eventType,
      'reimbursement',
      reimbursementId,
      applicant?.name || 'Karyawan',
      `Klaim ${target?.title || 'Pengeluaran'} Disetujui`,
      dept?.name || 'Divisi Umum',
      target?.status === 'PENDING_MANAGER' ? 'HRD' : 'All',
      formatRupiah(target?.amount || 0)
    );
    globalSocket.dispatchApprovalEvent(socketPayload);

    const isFinalReimb = target?.status === 'PENDING_FINANCE' || target?.currentApproverRole === 'HRD';

    if (!effectiveOnline) {
      queueOfflineMutation(
        'PROCESS_REIMBURSEMENT_APPROVAL',
        'reimbursement',
        reimbursementId,
        `Persetujuan klaim ${target?.title || 'Biaya'} oleh ${currentUser.name}`,
        { reimbursementId, decision: 'APPROVED', note }
      );
    }

    addAuditLog({
      category: 'approval',
      action: 'APPROVE_REIMBURSEMENT',
      actionTitle: isFinalReimb ? 'Persetujuan Final Reimbursement' : 'Persetujuan Tier-1 Manajer (Reimbursement)',
      targetId: reimbursementId,
      targetType: 'reimbursement',
      targetName: `${target?.title || 'Klaim'} - ${formatRupiah(target?.amount || 0)}`,
      description: `${currentUser.name} menyetujui klaim reimbursement "${target?.title || 'Biaya'}" senilai ${formatRupiah(target?.amount || 0)} untuk ${applicant?.name || 'Karyawan'}. Catatan: "${note}"`,
      changes: [
        {
          field: 'status',
          label: 'Status Pembayaran',
          oldValue: target?.status,
          newValue: isFinalReimb ? 'APPROVED' : 'PENDING_FINANCE',
        },
      ],
      severity: 'success',
      metadata: { invoiceNumber: target?.invoiceNumber, amount: target?.amount },
    });
  };

  const rejectReimbursement = (reimbursementId: string, reason: string) => {
    setReimbursements((prev) => {
      return prev.map((item) => {
        if (item.id !== reimbursementId) return item;

        const approverRoleName =
          roles.find((r) => r.id === currentUser.roleId)?.name || 'Atasan';

        const newLog = {
          id: `rlog_${Date.now()}`,
          requestId: reimbursementId,
          stageName: 'Penolakan Klaim',
          approverId: currentUser.id,
          approverName: currentUser.name,
          approverRole: approverRoleName,
          decision: 'REJECTED' as const,
          note: reason,
          timestamp: new Date().toISOString(),
        };

        return {
          ...item,
          status: 'REJECTED',
          currentApproverRole: null,
          approvalLogs: [...item.approvalLogs, newLog],
        };
      });
    });

    const target = reimbursements.find((r) => r.id === reimbursementId);
    const applicant = users.find((u) => u.id === target?.userId);

    const socketPayload = createApprovalSocketPayload(
      'approval:rejected',
      'reimbursement',
      reimbursementId,
      applicant?.name || 'Karyawan',
      `Klaim Biaya Ditolak: "${reason}"`,
      'Divisi Pemohon',
      'All',
      formatRupiah(target?.amount || 0)
    );
    globalSocket.dispatchApprovalEvent(socketPayload);

    if (!effectiveOnline) {
      queueOfflineMutation(
        'PROCESS_REIMBURSEMENT_APPROVAL',
        'reimbursement',
        reimbursementId,
        `Penolakan klaim ${target?.title || 'Biaya'} oleh ${currentUser.name}`,
        { reimbursementId, decision: 'REJECTED', reason }
      );
    }

    addAuditLog({
      category: 'approval',
      action: 'REJECT_REIMBURSEMENT',
      actionTitle: 'Penolakan Klaim Reimbursement',
      targetId: reimbursementId,
      targetType: 'reimbursement',
      targetName: `${target?.title || 'Klaim'} - ${formatRupiah(target?.amount || 0)}`,
      description: `${currentUser.name} menolak klaim reimbursement "${target?.title || 'Biaya'}" untuk ${applicant?.name || 'Karyawan'}. Alasan: "${reason}"`,
      changes: [
        {
          field: 'status',
          label: 'Status Pembayaran',
          oldValue: target?.status,
          newValue: 'REJECTED',
        },
      ],
      severity: 'warning',
      metadata: { reason, invoiceNumber: target?.invoiceNumber },
    });
  };

  const deleteReimbursement = (reimbursementId: string) => {
    setReimbursements((prev) => prev.filter((r) => r.id !== reimbursementId));
  };

  // Helper method: Simulate Incoming Approval from remote client via Socket.io
  const simulateIncomingApprovalSocket = (
    kind: 'leave' | 'reimbursement' = 'leave'
  ) => {
    const candidateUsers = users.filter((u) => u.id !== currentUser.id);
    const randomUser =
      candidateUsers[Math.floor(Math.random() * candidateUsers.length)] ||
      users[0];
    const dept = departments.find((d) => d.id === randomUser.departmentId);

    if (kind === 'leave') {
      const leaveTypes: LeaveRequest['leaveType'][] = [
        'Cuti Tahunan',
        'Cuti Sakit',
        'Cuti Khusus / Duka',
      ];
      const selectedType =
        leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
      const days = Math.floor(1 + Math.random() * 3);
      const reqId = `req_live_sock_${Date.now()}`;

      const newLeave: LeaveRequest = {
        id: reqId,
        userId: randomUser.id,
        leaveType: selectedType,
        startDate: '2026-11-16',
        endDate: '2026-11-18',
        totalDays: days,
        reason: 'Pengajuan real-time instan melalui websocket stream.',
        emergencyContact: '+62 812-3344-9988',
        status: 'PENDING_MANAGER',
        currentApproverRole: 'Manajer',
        createdAt: new Date().toISOString(),
        approvalLogs: [
          {
            id: `log_${Date.now()}`,
            requestId: reqId,
            stageName: 'Pengajuan Karyawan via Socket.io',
            approverId: randomUser.id,
            approverName: randomUser.name,
            approverRole: 'Karyawan',
            decision: 'APPROVED',
            note: 'Pengajuan disiarkan real-time melalui Socket.io event.',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      setLeaveRequests((prev) => [newLeave, ...prev]);

      const payload = createApprovalSocketPayload(
        'approval:new',
        'leave',
        reqId,
        randomUser.name,
        `Permohonan ${selectedType} Baru`,
        dept?.name || 'Teknologi',
        'Manajer',
        `${days} Hari Kerja`
      );
      globalSocket.dispatchApprovalEvent(payload);
    } else {
      const categories: Reimbursement['category'][] = [
        'Makan Klien & Lembur',
        'Transportasi & Bensin',
        'Office Supplies & Alat Kerja',
      ];
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const amount = (Math.floor(2 + Math.random() * 15) * 50000);
      const reimbId = `reimb_live_sock_${Date.now()}`;

      const newReimb: Reimbursement = {
        id: reimbId,
        userId: randomUser.id,
        category: cat,
        amount,
        title: `Klaim Operasional ${cat}`,
        description: 'Nota asli telah diunggah dan disinkronkan real-time.',
        invoiceNumber: `INV-SOCK-${Date.now().toString().slice(-4)}`,
        receiptName: 'nota_realtime.jpg',
        receiptUrl:
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
        receiptDate: new Date().toISOString().split('T')[0],
        status: 'PENDING_MANAGER',
        currentApproverRole: 'Manajer',
        createdAt: new Date().toISOString(),
        approvalLogs: [
          {
            id: `rlog_${Date.now()}`,
            requestId: reimbId,
            stageName: 'Pengajuan Klaim via Socket.io',
            approverId: randomUser.id,
            approverName: randomUser.name,
            approverRole: 'Karyawan',
            decision: 'APPROVED',
            note: 'Disinkronkan secara langsung via WebSocket.',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      setReimbursements((prev) => [newReimb, ...prev]);

      const payload = createApprovalSocketPayload(
        'approval:new',
        'reimbursement',
        reimbId,
        randomUser.name,
        `Klaim Biaya Baru (${cat})`,
        dept?.name || 'Teknologi',
        'Manajer',
        formatRupiah(amount)
      );
      globalSocket.dispatchApprovalEvent(payload);
    }
  };

  // Notifications
  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const addTask = useCallback(
    (taskData: Omit<KanbanTask, 'id' | 'createdAt' | 'createdBy'>) => {
      const newTask: KanbanTask = {
        ...taskData,
        id: `TSK-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id,
      };
      setTasks((prev) => [newTask, ...prev]);

      if (!effectiveOnline) {
        queueOfflineMutation(
          'CREATE_TASK',
          'task',
          newTask.id,
          `Tugas baru: ${newTask.title}`,
          taskData as unknown as Record<string, unknown>
        );
      }

      addNotification({
        recipientId: taskData.assigneeId || 'all',
        title: 'Tugas Kerja Baru Ditambahkan',
        message: `${currentUser.name} membuat tugas: "${newTask.title}".`,
        type: 'system',
        targetModule: 'kanban',
      });

      return newTask;
    },
    [currentUser, addNotification, effectiveOnline, queueOfflineMutation]
  );

  const updateTaskStatus = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      setTasks((prev) =>
        moveTaskStatus(prev, taskId, newStatus, new Date().toISOString())
      );

      if (!effectiveOnline) {
        queueOfflineMutation(
          'UPDATE_TASK',
          'task',
          taskId,
          `Perubahan status tugas ${taskId} ke ${newStatus}`,
          { taskId, newStatus }
        );
      }
    },
    [effectiveOnline, queueOfflineMutation]
  );

  const updateTask = useCallback(
    (taskId: string, data: Partial<KanbanTask>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...data } : t))
      );
    },
    []
  );

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  // Attendance & Shift Actions
  const checkIn = useCallback(
    (workType: WorkType, notes?: string): { success: boolean; message: string } => {
      const todayStr = new Date().toISOString().split('T')[0];
      const nowTimeStr = new Date().toTimeString().slice(0, 5); // HH:mm

      const existingIndex = attendances.findIndex(
        (a) => a.userId === currentUser.id && a.date === todayStr
      );

      const status = determineAttendanceStatus(nowTimeStr, '09:00');
      const locationLabel =
        workType === 'WFO'
          ? 'Headquarters Menara Cyber Jakarta'
          : workType === 'WFH'
          ? 'Remote Work (Work From Home)'
          : 'Dinas Luar Kantor / Meeting Eksternal';

      if (existingIndex >= 0) {
        // Update existing check-in
        setAttendances((prev) =>
          prev.map((a, idx) =>
            idx === existingIndex
              ? {
                  ...a,
                  checkInTime: nowTimeStr,
                  workType,
                  status,
                  notes: notes || a.notes,
                }
              : a
          )
        );
      } else {
        const newRecord: AttendanceRecord = {
          id: `att_${Date.now()}`,
          userId: currentUser.id,
          date: todayStr,
          checkInTime: nowTimeStr,
          workType,
          status,
          locationName: locationLabel,
          notes: notes || (status === 'LATE' ? 'Terlambat check-in sistem' : 'Hadir tepat waktu'),
          ipAddress: '192.168.1.100 (Presensi App)',
        };
        setAttendances((prev) => [newRecord, ...prev]);
      }

      addAuditLog({
        category: 'attendance',
        action: 'CHECK_IN',
        actionTitle: `Presensi Masuk (${workType})`,
        targetId: currentUser.id,
        targetType: 'attendance',
        targetName: currentUser.name,
        description: `${currentUser.name} melakukan check-in ${workType} pada pukul ${nowTimeStr} WIB (${status === 'LATE' ? 'Terlambat' : 'Tepat Waktu'}).`,
        severity: status === 'LATE' ? 'warning' : 'success',
      });

      return {
        success: true,
        message: `Presensi masuk (${workType}) berhasil dicatat pukul ${nowTimeStr} WIB.`,
      };
    },
    [attendances, currentUser, addAuditLog]
  );

  const checkOut = useCallback(
    (notes?: string): { success: boolean; message: string } => {
      const todayStr = new Date().toISOString().split('T')[0];
      const nowTimeStr = new Date().toTimeString().slice(0, 5);

      const existingIndex = attendances.findIndex(
        (a) => a.userId === currentUser.id && a.date === todayStr
      );

      if (existingIndex < 0) {
        return {
          success: false,
          message: 'Anda belum melakukan check-in hari ini.',
        };
      }

      setAttendances((prev) =>
        prev.map((a, idx) =>
          idx === existingIndex
            ? {
                ...a,
                checkOutTime: nowTimeStr,
                notes: notes ? `${a.notes || ''} | Checkout: ${notes}` : a.notes,
              }
            : a
        )
      );

      addAuditLog({
        category: 'attendance',
        action: 'CHECK_OUT',
        actionTitle: 'Presensi Pulang',
        targetId: currentUser.id,
        targetType: 'attendance',
        targetName: currentUser.name,
        description: `${currentUser.name} melakukan check-out pada pukul ${nowTimeStr} WIB.`,
        severity: 'info',
      });

      return {
        success: true,
        message: `Presensi pulang berhasil dicatat pukul ${nowTimeStr} WIB. Selamat beristirahat!`,
      };
    },
    [attendances, currentUser, addAuditLog]
  );

  const submitOvertime = useCallback(
    (data: {
      date: string;
      startTime: string;
      endTime: string;
      durationHours: number;
      tasksDescription: string;
    }): { success: boolean; error?: string } => {
      const newOt: OvertimeRequest = {
        id: `ot_${Date.now()}`,
        userId: currentUser.id,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        durationHours: data.durationHours,
        tasksDescription: data.tasksDescription,
        status: 'PENDING_MANAGER',
        createdAt: new Date().toISOString(),
      };

      setOvertimeRequests((prev) => [newOt, ...prev]);

      addAuditLog({
        category: 'attendance',
        action: 'SUBMIT_OVERTIME',
        actionTitle: 'Pengajuan Lembur Kerja',
        targetId: newOt.id,
        targetType: 'overtime',
        targetName: currentUser.name,
        description: `${currentUser.name} mengajukan lembur ${data.durationHours} jam pada ${data.date} (${data.startTime} - ${data.endTime}).`,
        severity: 'info',
      });

      // Dispatch socket event
      const userDept = departments.find((d) => d.id === currentUser.departmentId);
      const payload = createApprovalSocketPayload(
        'approval:new',
        'leave',
        newOt.id,
        currentUser.name,
        `Pengajuan Lembur (${data.durationHours} Jam)`,
        userDept?.name || 'Divisi',
        'Manajer',
        `${data.durationHours} Jam`
      );
      globalSocket.dispatchApprovalEvent(payload);

      return { success: true };
    },
    [currentUser, departments, addAuditLog]
  );

  const approveOvertime = useCallback(
    (id: string, note: string = 'Disetujui sesuai kebutuhan operasional.') => {
      setOvertimeRequests((prev) =>
        prev.map((ot) =>
          ot.id === id
            ? {
                ...ot,
                status: 'APPROVED',
                approverId: currentUser.id,
                approverName: currentUser.name,
              }
            : ot
        )
      );

      const targetOt = overtimeRequests.find((o) => o.id === id);
      const targetUser = users.find((u) => u.id === targetOt?.userId);

      addAuditLog({
        category: 'attendance',
        action: 'APPROVE_OVERTIME',
        actionTitle: 'Persetujuan Lembur',
        targetId: id,
        targetType: 'overtime',
        targetName: targetUser?.name || 'Karyawan',
        description: `Lembur disetujui oleh ${currentUser.name}. Catatan: ${note}`,
        severity: 'success',
      });
    },
    [currentUser, overtimeRequests, users, addAuditLog]
  );

  const rejectOvertime = useCallback(
    (id: string, reason: string) => {
      setOvertimeRequests((prev) =>
        prev.map((ot) =>
          ot.id === id
            ? {
                ...ot,
                status: 'REJECTED',
                approverId: currentUser.id,
                approverName: currentUser.name,
                rejectionReason: reason,
              }
            : ot
        )
      );

      const targetOt = overtimeRequests.find((o) => o.id === id);
      const targetUser = users.find((u) => u.id === targetOt?.userId);

      addAuditLog({
        category: 'attendance',
        action: 'REJECT_OVERTIME',
        actionTitle: 'Penolakan Lembur',
        targetId: id,
        targetType: 'overtime',
        targetName: targetUser?.name || 'Karyawan',
        description: `Lembur ditolak oleh ${currentUser.name}. Alasan: ${reason}`,
        severity: 'warning',
      });
    },
    [currentUser, overtimeRequests, users, addAuditLog]
  );

  const deleteAttendance = useCallback(
    (id: string) => {
      setAttendances((prev) => prev.filter((a) => a.id !== id));
      addAuditLog({
        category: 'attendance',
        action: 'DELETE_ATTENDANCE',
        actionTitle: 'Hapus Catatan Presensi',
        targetId: id,
        targetType: 'attendance',
        targetName: 'Data Presensi',
        description: `Catatan presensi ${id} dihapus oleh ${currentUser.name}.`,
        severity: 'warning',
      });
    },
    [currentUser, addAuditLog]
  );

  // Payroll & Payslip Actions
  const generateMonthlyPayroll = useCallback(
    (month: string): { count: number; message: string } => {
      const activeUsers = users.filter((u) => u.status === 'active');
      const [year, monthNum] = month.split('-');
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const periodLabel = `${monthNames[parseInt(monthNum, 10) - 1] || 'Bulan'} ${year}`;

      let addedCount = 0;
      const newPayrolls: PayrollRecord[] = [];

      for (const u of activeUsers) {
        // Check if payroll already exists for this user and month
        const exists = payrolls.some((p) => p.userId === u.id && p.month === month);
        if (exists) continue;

        // Base salary tiering based on position / hierarchy
        let basic = 8000000;
        let posAllow = 1000000;
        if (u.hierarchyLevel === 'c_level') {
          basic = 35000000;
          posAllow = 12000000;
        } else if (u.hierarchyLevel === 'vp_director') {
          basic = 22000000;
          posAllow = 6000000;
        } else if (u.hierarchyLevel === 'head_division') {
          basic = 20000000;
          posAllow = 5000000;
        } else if (u.hierarchyLevel === 'manager') {
          basic = 16000000;
          posAllow = 4000000;
        } else if (u.hierarchyLevel === 'supervisor') {
          basic = 13000000;
          posAllow = 2500000;
        } else if (u.hierarchyLevel === 'entry_support') {
          basic = 4500000;
          posAllow = 0;
        }

        const mealTransport = 1800000;
        const bpjs = Math.round(basic * 0.04);
        const pph21 = Math.round(basic * 0.05);

        // Sum approved overtime for this user
        const userOtHours = overtimeRequests
          .filter((ot) => ot.userId === u.id && ot.status === 'APPROVED' && ot.date.startsWith(month))
          .reduce((sum, ot) => sum + ot.durationHours, 0);
        const overtimePay = Math.round(userOtHours * (basic / 173) * 1.5);

        const gross = basic + posAllow + mealTransport + overtimePay;
        const deductions = bpjs + pph21;
        const netSalary = Math.max(0, gross - deductions);

        const rec: PayrollRecord = {
          id: `pay_${Date.now()}_${u.id}`,
          userId: u.id,
          month,
          periodLabel,
          basicSalary: basic,
          allowancePosition: posAllow,
          allowanceTransportMeal: mealTransport,
          overtimePay,
          bonus: 0,
          deductionBpjs: bpjs,
          deductionTax: pph21,
          deductionOther: 0,
          netSalary,
          paymentDate: `${month}-25`,
          status: 'PROCESSED',
          bankName: 'Bank Central Asia (BCA)',
          bankAccountNumber: `527-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100 + Math.random() * 900)}`,
          createdAt: new Date().toISOString(),
        };

        newPayrolls.push(rec);
        addedCount++;
      }

      if (newPayrolls.length > 0) {
        setPayrolls((prev) => [...newPayrolls, ...prev]);

        addAuditLog({
          category: 'payroll',
          action: 'GENERATE_PAYROLL',
          actionTitle: `Kalkulasi Payroll ${periodLabel}`,
          targetId: month,
          targetType: 'payroll',
          targetName: `Payroll Periode ${periodLabel}`,
          description: `Kalkulasi payroll berhasil diproses untuk ${addedCount} karyawan aktif oleh ${currentUser.name}.`,
          severity: 'success',
        });
      }

      return {
        count: addedCount,
        message: `Kalkulasi gaji ${periodLabel} berhasil diproses untuk ${addedCount} karyawan.`,
      };
    },
    [users, payrolls, overtimeRequests, currentUser, addAuditLog]
  );

  const updatePayrollStatus = useCallback(
    (id: string, status: PayrollStatus) => {
      setPayrolls((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );

      const pRecord = payrolls.find((p) => p.id === id);
      const pUser = users.find((u) => u.id === pRecord?.userId);

      addAuditLog({
        category: 'payroll',
        action: 'UPDATE_PAYROLL_STATUS',
        actionTitle: `Pembaruan Status Payroll (${status})`,
        targetId: id,
        targetType: 'payroll',
        targetName: pUser?.name || 'Karyawan',
        description: `Status slip gaji ${pRecord?.periodLabel} karyawan ${pUser?.name} diperbarui menjadi ${status} oleh ${currentUser.name}.`,
        severity: status === 'PAID' ? 'success' : 'info',
      });
    },
    [payrolls, users, currentUser, addAuditLog]
  );

  const deletePayroll = useCallback(
    (id: string) => {
      setPayrolls((prev) => prev.filter((p) => p.id !== id));
      addAuditLog({
        category: 'payroll',
        action: 'DELETE_PAYROLL',
        actionTitle: 'Hapus Slip Gaji',
        targetId: id,
        targetType: 'payroll',
        targetName: 'Data Payroll',
        description: `Slip gaji ${id} dihapus dari sistem oleh ${currentUser.name}.`,
        severity: 'warning',
      });
    },
    [currentUser, addAuditLog]
  );

  const resetAllData = () => {
    safeClearStorage();
    setDepartments(INITIAL_DEPARTMENTS);
    setRoles(INITIAL_ROLES);
    setRolePermissions(INITIAL_ROLE_PERMISSIONS);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setLeaveBalances(INITIAL_LEAVE_BALANCES);
    setLeaveRequests(INITIAL_LEAVE_REQUESTS);
    setReimbursements(INITIAL_REIMBURSEMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setTasks(INITIAL_TASKS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setAttendances(INITIAL_ATTENDANCE);
    setOvertimeRequests(INITIAL_OVERTIME_REQUESTS);
    setPayrolls(INITIAL_PAYROLLS);
    setActiveSocketToasts([]);
    setPendingOfflineActions([]);
    setLastSyncedAt(null);
  };

  return (
    <HRISContext.Provider
      value={{
        isOnline,
        isSyncing,
        isOfflineSimulated,
        effectiveOnline,
        pendingOfflineActions,
        lastSyncedAt,
        syncOfflineQueue,
        toggleOfflineSimulation,
        clearOfflineQueue,
        removeOfflineAction,
        storageUsageBytes,
        isAuthenticated,
        login,
        logout,
        resetUserPassword,
        currentUser,
        setCurrentUser,
        switchUserById,
        departments,
        roles,
        users,
        rolePermissions,
        leaveBalances,
        leaveRequests,
        reimbursements,
        notifications,
        tasks,
        addTask,
        updateTaskStatus,
        updateTask,
        deleteTask,
        auditLogs,
        addAuditLog,
        clearAuditLogs,
        hasUserPermission,
        canAccess,
        togglePermission,
        createRole,
        updateRole,
        deleteRole,
        resetPermissionsToDefault,
        createUser,
        updateUser,
        updateUserRole,
        updateLeaveQuota,
        reassignEmployeeManager: reassignEmployeeManagerAction,
        createDepartment,
        updateDepartment,
        deleteDepartment,
        submitLeaveRequest,
        approveLeave,
        rejectLeave,
        deleteLeave,
        submitReimbursement,
        approveReimbursement,
        rejectReimbursement,
        deleteReimbursement,
        // Attendance & Shift Management
        attendances,
        overtimeRequests,
        checkIn,
        checkOut,
        submitOvertime,
        approveOvertime,
        rejectOvertime,
        deleteAttendance,
        // Payroll & Payslips
        payrolls,
        generateMonthlyPayroll,
        updatePayrollStatus,
        deletePayroll,
        markAllNotificationsRead,
        markNotificationAsRead,
        addNotification,
        socketStatus,
        socketLatency,
        socketRooms,
        reconnectSocket,
        toggleSocketConnection,
        activeSocketToasts,
        dismissSocketToast,
        simulateIncomingApprovalSocket,
        resetAllData,
      }}
    >
      {children}
    </HRISContext.Provider>
  );
};

export const useHRIS = () => {
  const context = useContext(HRISContext);
  if (!context) {
    throw new Error('useHRIS must be used within an HRISProvider');
  }
  return context;
};

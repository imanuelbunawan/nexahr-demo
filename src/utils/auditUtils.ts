import {
  AuditLogEntry,
  AuditActionCategory,
  AuditSeverity,
  AuditChangeDiff,
  NewAuditLogPayload,
} from '../types/index.ts';

export interface AuditFilters {
  query?: string;
  category?: AuditActionCategory | 'ALL';
  severity?: AuditSeverity | 'ALL';
  actorId?: string;
  dateRange?: 'ALL' | 'today' | '7days' | '30days';
}

export interface AuditMetrics {
  totalCount: number;
  roleChangesCount: number;
  approvalDecisionsCount: number;
  employeeUpdatesCount: number;
  taskManagementCount: number;
  securityCount: number;
  todayCount: number;
}

/**
 * Filter audit logs by keyword query, category, severity, actor, and date range
 */
export function filterAuditLogs(
  logs: AuditLogEntry[],
  filters: AuditFilters
): AuditLogEntry[] {
  const {
    query = '',
    category = 'ALL',
    severity = 'ALL',
    actorId = 'ALL',
    dateRange = 'ALL',
  } = filters;

  const normalizedQuery = query.trim().toLowerCase();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

  return logs.filter((log) => {
    // Category filter
    if (category !== 'ALL' && log.category !== category) {
      return false;
    }

    // Severity filter
    if (severity !== 'ALL' && log.severity !== severity) {
      return false;
    }

    // Actor filter
    if (actorId !== 'ALL' && log.actorId !== actorId) {
      return false;
    }

    // Date range filter
    if (dateRange !== 'ALL') {
      const logTime = new Date(log.timestamp).getTime();
      if (dateRange === 'today' && logTime < todayStart) {
        return false;
      }
      if (dateRange === '7days' && logTime < sevenDaysAgo) {
        return false;
      }
      if (dateRange === '30days' && logTime < thirtyDaysAgo) {
        return false;
      }
    }

    // Text search query
    if (normalizedQuery) {
      const matchesSearch =
        log.actionTitle.toLowerCase().includes(normalizedQuery) ||
        log.description.toLowerCase().includes(normalizedQuery) ||
        log.actorName.toLowerCase().includes(normalizedQuery) ||
        log.actorRole.toLowerCase().includes(normalizedQuery) ||
        log.targetName.toLowerCase().includes(normalizedQuery) ||
        log.action.toLowerCase().includes(normalizedQuery) ||
        log.id.toLowerCase().includes(normalizedQuery) ||
        (log.changes &&
          log.changes.some(
            (c) =>
              c.label.toLowerCase().includes(normalizedQuery) ||
              String(c.oldValue || '').toLowerCase().includes(normalizedQuery) ||
              String(c.newValue || '').toLowerCase().includes(normalizedQuery)
          ));

      if (!matchesSearch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculates aggregated KPI metrics from audit logs
 */
export function calculateAuditMetrics(logs: AuditLogEntry[]): AuditMetrics {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let roleChangesCount = 0;
  let approvalDecisionsCount = 0;
  let employeeUpdatesCount = 0;
  let taskManagementCount = 0;
  let securityCount = 0;
  let todayCount = 0;

  logs.forEach((log) => {
    if (log.category === 'role') roleChangesCount++;
    else if (log.category === 'approval') approvalDecisionsCount++;
    else if (log.category === 'employee') employeeUpdatesCount++;
    else if (log.category === 'task') taskManagementCount++;
    else if (log.category === 'security') securityCount++;

    const logTime = new Date(log.timestamp).getTime();
    if (logTime >= todayStart) {
      todayCount++;
    }
  });

  return {
    totalCount: logs.length,
    roleChangesCount,
    approvalDecisionsCount,
    employeeUpdatesCount,
    taskManagementCount,
    securityCount,
    todayCount,
  };
}

/**
 * Formats ISO date into localized Indonesian date string
 */
export function formatAuditTimestamp(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;

    const day = d.getDate().toString().padStart(2, '0');
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
  } catch {
    return isoDate;
  }
}

/**
 * Returns human-readable relative time string
 */
export function formatRelativeTime(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit yang lalu`;
    if (diffHour < 24) return `${diffHour} jam yang lalu`;
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    return formatAuditTimestamp(isoDate);
  } catch {
    return isoDate;
  }
}

/**
 * Exports audit logs to standard CSV formatted text
 */
export function generateAuditCsv(logs: AuditLogEntry[]): string {
  const headers = [
    'Log ID',
    'Waktu (WIB)',
    'Aktor',
    'Role Aktor',
    'Kategori',
    'Tindakan',
    'Target Sumber Daya',
    'Tingkat Urgensi',
    'Deskripsi Rinci',
    'Perubahan Data',
    'Alamat IP',
  ];

  const rows = logs.map((log) => {
    const formattedDate = formatAuditTimestamp(log.timestamp);
    const changesSummary = (log.changes || [])
      .map((c) => `${c.label}: "${c.oldValue ?? '-'}" -> "${c.newValue ?? '-'}"`)
      .join('; ');

    const escapeCsv = (val: string) => {
      const sanitized = (val || '').replace(/"/g, '""');
      return `"${sanitized}"`;
    };

    return [
      escapeCsv(log.id),
      escapeCsv(formattedDate),
      escapeCsv(log.actorName),
      escapeCsv(log.actorRole),
      escapeCsv(log.category.toUpperCase()),
      escapeCsv(log.actionTitle),
      escapeCsv(log.targetName),
      escapeCsv(log.severity.toUpperCase()),
      escapeCsv(log.description),
      escapeCsv(changesSummary),
      escapeCsv(log.ipAddress),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Creates a complete AuditLogEntry with generated sequential-style ID and timestamp
 */
export function createAuditEntry(
  params: NewAuditLogPayload & {
    id?: string;
    timestamp?: string;
  }
): AuditLogEntry {
  const now = new Date();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = params.id || `AUD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${randomSuffix}`;
  const timestamp = params.timestamp || now.toISOString();

  return {
    id,
    timestamp,
    actorId: params.actorId || 'user_owner',
    actorName: params.actorName || 'Ir. Hendra Pratama, M.Kom',
    actorRole: params.actorRole || 'Super Admin / Owner',
    actorAvatar: params.actorAvatar,
    category: params.category,
    action: params.action,
    actionTitle: params.actionTitle,
    targetId: params.targetId,
    targetType: params.targetType,
    targetName: params.targetName,
    description: params.description,
    changes: params.changes || [],
    severity: params.severity || 'info',
    ipAddress: params.ipAddress || '192.168.1.12 (Session Aktif)',
    metadata: params.metadata,
  };
}

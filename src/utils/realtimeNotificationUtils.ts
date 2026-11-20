import { SocketApprovalPayload } from '../types/index.ts';

export type RealTimeToastCategory =
  | 'leave_new'
  | 'approval_update'
  | 'reimbursement_update'
  | 'system';

export type ApprovalStatusState =
  | 'NEW_REQUEST'
  | 'PENDING_TIER_2'
  | 'FINAL_APPROVED'
  | 'REJECTED';

export interface RealTimeToast {
  id: string;
  category: RealTimeToastCategory;
  title: string;
  message: string;
  applicantName: string;
  applicantDepartment: string;
  itemType: 'leave' | 'reimbursement';
  statusState: ApprovalStatusState;
  statusBadgeLabel: string;
  statusBadgeColor: 'emerald' | 'amber' | 'rose' | 'indigo' | 'blue';
  metaDetail: string;
  stageProgressText?: string;
  rejectionReason?: string;
  timestamp: string;
  targetModule: 'approval' | 'leave' | 'reimbursement';
  createdAt: number;
  durationMs: number;
}

/**
 * Returns consistent badge color styling for a given approval status
 */
export function getBadgeColorForStatus(
  status: ApprovalStatusState
): 'emerald' | 'amber' | 'rose' | 'indigo' | 'blue' {
  switch (status) {
    case 'FINAL_APPROVED':
      return 'emerald';
    case 'PENDING_TIER_2':
      return 'amber';
    case 'REJECTED':
      return 'rose';
    case 'NEW_REQUEST':
    default:
      return 'indigo';
  }
}

/**
 * Transforms an incoming Socket.io approval event into a structured real-time toast
 */
export function createToastFromSocketEvent(
  payload: SocketApprovalPayload
): RealTimeToast {
  let statusState: ApprovalStatusState = 'NEW_REQUEST';
  let badgeLabel = 'Pengajuan Baru';
  let category: RealTimeToastCategory =
    payload.itemType === 'leave' ? 'leave_new' : 'reimbursement_update';
  let targetModule: 'approval' | 'leave' | 'reimbursement' = 'approval';
  let progressText = 'Menunggu Verifikasi Manajer';

  if (payload.event === 'approval:stage_passed') {
    statusState = 'PENDING_TIER_2';
    badgeLabel = 'Tahap 1 Disetujui';
    category = 'approval_update';
    progressText = 'Diteruskan ke Meja Persetujuan HRD / Finance';
  } else if (payload.event === 'approval:final_approved') {
    statusState = 'FINAL_APPROVED';
    badgeLabel = 'Persetujuan Final Sah';
    category = 'approval_update';
    progressText = 'Persetujuan Lengkap & Kuota / Saldo Diperbarui';
  } else if (payload.event === 'approval:rejected') {
    statusState = 'REJECTED';
    badgeLabel = 'Pengajuan Ditolak';
    category = 'approval_update';
    progressText = 'Keputusan Final Penolakan oleh Approver';
  } else {
    // approval:new
    statusState = 'NEW_REQUEST';
    badgeLabel = payload.itemType === 'leave' ? 'Cuti Baru Masuk' : 'Klaim Biaya Baru';
    category = payload.itemType === 'leave' ? 'leave_new' : 'reimbursement_update';
    progressText = 'Menunggu Persetujuan Atasan Langsung';
  }

  const badgeColor = getBadgeColorForStatus(statusState);

  return {
    id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    category,
    title: payload.title,
    message: `${payload.applicantName} (${payload.departmentName}) • ${payload.stageName}`,
    applicantName: payload.applicantName,
    applicantDepartment: payload.departmentName,
    itemType: payload.itemType,
    statusState,
    statusBadgeLabel: badgeLabel,
    statusBadgeColor: badgeColor,
    metaDetail: payload.amountOrDuration,
    stageProgressText: progressText,
    timestamp: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WIB',
    targetModule,
    createdAt: Date.now(),
    durationMs: 7000,
  };
}

/**
 * Creates a toast notification specifically when a new leave request is submitted
 */
export function createToastForNewLeave(
  applicantName: string,
  deptName: string,
  leaveType: string,
  totalDays: number,
  reason: string
): RealTimeToast {
  return {
    id: `toast_leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    category: 'leave_new',
    title: `Permohonan ${leaveType} Diajukan`,
    message: `${applicantName} (${deptName}) mengajukan permohonan ${leaveType}. Alasan: "${reason}"`,
    applicantName,
    applicantDepartment: deptName,
    itemType: 'leave',
    statusState: 'NEW_REQUEST',
    statusBadgeLabel: 'Pengajuan Cuti Baru',
    statusBadgeColor: 'indigo',
    metaDetail: `${totalDays} Hari Kerja`,
    stageProgressText: 'Menunggu Persetujuan Manajer Divisi (Tier 1)',
    timestamp: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WIB',
    targetModule: 'approval',
    createdAt: Date.now(),
    durationMs: 7000,
  };
}

/**
 * Creates a toast notification for an approval decision (Approved / Rejected)
 */
export function createToastForApprovalUpdate(
  applicantName: string,
  deptName: string,
  itemType: 'leave' | 'reimbursement',
  title: string,
  statusState: ApprovalStatusState,
  approverName: string,
  approverRole: string,
  note?: string,
  amountOrDuration?: string
): RealTimeToast {
  let badgeLabel = 'Status Persetujuan Diperbarui';
  let progressText = '';

  if (statusState === 'PENDING_TIER_2') {
    badgeLabel = 'Disetujui Tier-1 (Manajer)';
    progressText = `Disetujui oleh ${approverName} (${approverRole}). Menunggu otorisasi HRD / Finance.`;
  } else if (statusState === 'FINAL_APPROVED') {
    badgeLabel = 'Persetujuan Final Sah';
    progressText = `Disetujui penuh oleh ${approverName} (${approverRole}). Status resmi APPROVED.`;
  } else if (statusState === 'REJECTED') {
    badgeLabel = 'Pengajuan Ditolak';
    progressText = `Ditolak oleh ${approverName} (${approverRole}). Alasan: "${note || 'Tidak memenuhi kualifikasi.'}"`;
  }

  return {
    id: `toast_appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    category: 'approval_update',
    title: statusState === 'REJECTED' ? `Pengajuan Ditolak: ${title}` : `Pembaruan Approval: ${title}`,
    message: progressText,
    applicantName,
    applicantDepartment: deptName,
    itemType,
    statusState,
    statusBadgeLabel: badgeLabel,
    statusBadgeColor: getBadgeColorForStatus(statusState),
    metaDetail: amountOrDuration || (itemType === 'leave' ? 'Cuti Karyawan' : 'Klaim Biaya'),
    stageProgressText: progressText,
    rejectionReason: statusState === 'REJECTED' ? note : undefined,
    timestamp: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WIB',
    targetModule: itemType === 'leave' ? 'leave' : 'reimbursement',
    createdAt: Date.now(),
    durationMs: 7500,
  };
}

/**
 * Truncates and keeps only the latest N active toasts to prevent viewport clutter
 */
export function filterActiveToasts(
  toasts: RealTimeToast[],
  maxCount: number = 4
): RealTimeToast[] {
  return toasts.slice(0, maxCount);
}

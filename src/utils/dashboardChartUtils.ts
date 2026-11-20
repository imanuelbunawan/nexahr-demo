import { User, LeaveRequest, Reimbursement, Department } from '../types/index.ts';

export interface HeadcountPoint {
  period: string; // e.g. "Q1 2023" or "Jan 2024"
  headcount: number;
  newHires: number;
}

export interface LeaveDistributionPoint {
  name: string; // Leave type e.g. "Cuti Tahunan"
  approvedDays: number;
  pendingDays: number;
  totalRequests: number;
  fill?: string;
}

export interface ReimbursementPipelinePoint {
  category: string;
  pendingAmount: number;
  approvedAmount: number;
  pendingCount: number;
  approvedCount: number;
}

export interface QuickSummaryStats {
  totalHeadcount: number;
  activeLeavesCount: number;
  totalLeaveDaysTaken: number;
  pendingReimbursementAmount: number;
  pendingReimbursementCount: number;
  approvedReimbursementAmount: number;
  approvalVelocityRate: number; // percentage of processed requests
}

/**
 * Calculates cumulative headcount growth and monthly hire velocity.
 */
export function calculateHeadcountTimeline(users: User[]): HeadcountPoint[] {
  if (!users || users.length === 0) {
    return [];
  }

  // Sort users by joinDate ascending
  const sorted = [...users].sort((a, b) => a.joinDate.localeCompare(b.joinDate));

  // Extract years and quarters or monthly groupings
  const groups: Record<string, number> = {};
  sorted.forEach((u) => {
    // format YYYY-MM
    const key = u.joinDate.slice(0, 7); // e.g. "2023-03"
    groups[key] = (groups[key] || 0) + 1;
  });

  const sortedKeys = Object.keys(groups).sort();
  let cumulative = 0;

  return sortedKeys.map((key) => {
    const newHires = groups[key];
    cumulative += newHires;

    // Format label to readable month e.g. "Mar 2023"
    const [year, month] = key.split('-');
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    const label = `${monthNames[monthIdx] || month} ${year}`;

    return {
      period: label,
      headcount: cumulative,
      newHires,
    };
  });
}

/**
 * Calculates current active leaves and breakdown by leave type.
 */
export function calculateLeaveDistribution(leaveRequests: LeaveRequest[]): LeaveDistributionPoint[] {
  const typeMap: Record<
    string,
    { approvedDays: number; pendingDays: number; totalRequests: number }
  > = {};

  const knownTypes = [
    'Cuti Tahunan',
    'Cuti Sakit',
    'Cuti Melahirkan',
    'Cuti Menikah',
    'Cuti Khusus / Duka',
  ];

  knownTypes.forEach((t) => {
    typeMap[t] = { approvedDays: 0, pendingDays: 0, totalRequests: 0 };
  });

  leaveRequests.forEach((req) => {
    const t = req.leaveType || 'Cuti Tahunan';
    if (!typeMap[t]) {
      typeMap[t] = { approvedDays: 0, pendingDays: 0, totalRequests: 0 };
    }

    typeMap[t].totalRequests += 1;
    if (req.status === 'APPROVED') {
      typeMap[t].approvedDays += req.totalDays;
    } else if (req.status === 'PENDING_MANAGER' || req.status === 'PENDING_HRD') {
      typeMap[t].pendingDays += req.totalDays;
    }
  });

  return Object.entries(typeMap).map(([name, data]) => ({
    name,
    approvedDays: data.approvedDays,
    pendingDays: data.pendingDays,
    totalRequests: data.totalRequests,
  }));
}

/**
 * Calculates reimbursement amounts and counts categorized by category and pending vs approved.
 */
export function calculateReimbursementPipeline(
  reimbursements: Reimbursement[]
): ReimbursementPipelinePoint[] {
  const categoryMap: Record<
    string,
    {
      pendingAmount: number;
      approvedAmount: number;
      pendingCount: number;
      approvedCount: number;
    }
  > = {};

  reimbursements.forEach((r) => {
    const cat = r.category;
    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        pendingAmount: 0,
        approvedAmount: 0,
        pendingCount: 0,
        approvedCount: 0,
      };
    }

    if (r.status === 'APPROVED') {
      categoryMap[cat].approvedAmount += r.amount;
      categoryMap[cat].approvedCount += 1;
    } else if (r.status === 'PENDING_MANAGER' || r.status === 'PENDING_FINANCE') {
      categoryMap[cat].pendingAmount += r.amount;
      categoryMap[cat].pendingCount += 1;
    }
  });

  return Object.entries(categoryMap).map(([category, data]) => ({
    category,
    pendingAmount: data.pendingAmount,
    approvedAmount: data.approvedAmount,
    pendingCount: data.pendingCount,
    approvedCount: data.approvedCount,
  }));
}

/**
 * Produces aggregated high-level KPIs for quick executive summary banner.
 */
export function calculateQuickSummaryStats(
  users: User[],
  leaveRequests: LeaveRequest[],
  reimbursements: Reimbursement[]
): QuickSummaryStats {
  const totalHeadcount = users.length;

  const activeLeaves = leaveRequests.filter(
    (l) => l.status === 'APPROVED' || l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HRD'
  );

  const totalLeaveDaysTaken = leaveRequests
    .filter((l) => l.status === 'APPROVED')
    .reduce((sum, l) => sum + l.totalDays, 0);

  const pendingReimb = reimbursements.filter(
    (r) => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_FINANCE'
  );

  const pendingReimbursementAmount = pendingReimb.reduce((sum, r) => sum + r.amount, 0);
  const pendingReimbursementCount = pendingReimb.length;

  const approvedReimb = reimbursements.filter((r) => r.status === 'APPROVED');
  const approvedReimbursementAmount = approvedReimb.reduce((sum, r) => sum + r.amount, 0);

  // Approval velocity: total approved or rejected / total requests
  const totalSubmissions = leaveRequests.length + reimbursements.length;
  const processedSubmissions =
    leaveRequests.filter((l) => l.status === 'APPROVED' || l.status === 'REJECTED').length +
    reimbursements.filter((r) => r.status === 'APPROVED' || r.status === 'REJECTED').length;

  const approvalVelocityRate =
    totalSubmissions > 0 ? Math.round((processedSubmissions / totalSubmissions) * 100) : 100;

  return {
    totalHeadcount,
    activeLeavesCount: activeLeaves.length,
    totalLeaveDaysTaken,
    pendingReimbursementAmount,
    pendingReimbursementCount,
    approvedReimbursementAmount,
    approvalVelocityRate,
  };
}

import { User, Department, Role, LeaveRequest, Reimbursement, LeaveBalance } from '../types/index.ts';

export interface DepartmentMetricItem {
  id: string;
  name: string;
  code: string;
  managerName: string;
  headcount: number;
  leaveDaysTaken: number;
  approvedReimbursementAmount: number;
}

export interface LeaveMetricsSummary {
  totalAnnualQuota: number;
  totalUsedDays: number;
  totalRemainingDays: number;
  pendingRequestsCount: number;
  approvedRequestsCount: number;
  rejectedRequestsCount: number;
  utilizationRate: number; // percentage
}

export interface ReimbursementMetricsSummary {
  totalApprovedAmount: number;
  totalPendingAmount: number;
  approvedTransactionsCount: number;
  pendingTransactionsCount: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}

export interface HRMetricsReportData {
  reportNumber: string;
  generatedAt: string;
  generatedDateFormatted: string;
  companyName: string;
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  departmentCount: number;
  departmentMetrics: DepartmentMetricItem[];
  leaveMetrics: LeaveMetricsSummary;
  reimbursementMetrics: ReimbursementMetricsSummary;
  approvalVelocityRate: number;
}

/**
 * Formats date to Indonesian formal standard e.g. "25 Oktober 2026".
 */
export function formatReportIndonesianDate(date: Date = new Date()): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Generates an official report identification number.
 */
export function generateReportNumber(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `RPT-HRIS/${year}${month}/${day}-NX88`;
}

/**
 * Decoupled calculation engine for HR metrics report summary.
 */
export function calculateHRMetricsReport(
  users: User[],
  departments: Department[],
  leaveRequests: LeaveRequest[],
  reimbursements: Reimbursement[],
  leaveBalances: LeaveBalance[],
  currentDate: Date = new Date()
): HRMetricsReportData {
  const totalEmployees = users.length;
  const activeEmployees = users.filter((u) => u.status === 'active').length;
  const onLeaveEmployees = users.filter((u) => u.status === 'on_leave').length;

  // Leave metrics
  const totalAnnualQuota = leaveBalances.reduce((sum, b) => sum + b.annualQuota, 0);
  const totalUsedDays = leaveBalances.reduce((sum, b) => sum + b.usedQuota, 0);
  const totalRemainingDays = leaveBalances.reduce((sum, b) => sum + b.remainingQuota, 0);

  const approvedLeaves = leaveRequests.filter((l) => l.status === 'APPROVED');
  const pendingLeaves = leaveRequests.filter(
    (l) => l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HRD'
  );
  const rejectedLeaves = leaveRequests.filter((l) => l.status === 'REJECTED');

  const utilizationRate =
    totalAnnualQuota > 0 ? Math.round((totalUsedDays / totalAnnualQuota) * 100) : 0;

  // Reimbursement metrics
  const approvedReimb = reimbursements.filter((r) => r.status === 'APPROVED');
  const pendingReimb = reimbursements.filter(
    (r) => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_FINANCE'
  );

  const totalApprovedAmount = approvedReimb.reduce((sum, r) => sum + r.amount, 0);
  const totalPendingAmount = pendingReimb.reduce((sum, r) => sum + r.amount, 0);

  // Category breakdown for reimbursement
  const catMap: Record<string, { amount: number; count: number }> = {};
  approvedReimb.forEach((r) => {
    if (!catMap[r.category]) {
      catMap[r.category] = { amount: 0, count: 0 };
    }
    catMap[r.category].amount += r.amount;
    catMap[r.category].count += 1;
  });

  const categoryBreakdown = Object.entries(catMap).map(([category, val]) => ({
    category,
    amount: val.amount,
    count: val.count,
    percentage:
      totalApprovedAmount > 0 ? Math.round((val.amount / totalApprovedAmount) * 100) : 0,
  }));

  // Department metrics breakdown
  const departmentMetrics: DepartmentMetricItem[] = departments.map((dept) => {
    const deptUsers = users.filter((u) => u.departmentId === dept.id);
    const deptUserIds = new Set(deptUsers.map((u) => u.id));

    const leaveDaysTaken = approvedLeaves
      .filter((l) => deptUserIds.has(l.userId))
      .reduce((sum, l) => sum + l.totalDays, 0);

    const approvedReimbursementAmount = approvedReimb
      .filter((r) => deptUserIds.has(r.userId))
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      managerName: dept.managerName,
      headcount: deptUsers.length,
      leaveDaysTaken,
      approvedReimbursementAmount,
    };
  });

  // Approval velocity rate
  const totalSubmissions = leaveRequests.length + reimbursements.length;
  const processedSubmissions =
    leaveRequests.filter((l) => l.status === 'APPROVED' || l.status === 'REJECTED').length +
    reimbursements.filter((r) => r.status === 'APPROVED' || r.status === 'REJECTED').length;

  const approvalVelocityRate =
    totalSubmissions > 0 ? Math.round((processedSubmissions / totalSubmissions) * 100) : 100;

  return {
    reportNumber: generateReportNumber(currentDate),
    generatedAt: currentDate.toISOString(),
    generatedDateFormatted: formatReportIndonesianDate(currentDate),
    companyName: 'PT. NEXA DIGITAL PERSADA',
    totalEmployees,
    activeEmployees,
    onLeaveEmployees,
    departmentCount: departments.length,
    departmentMetrics,
    leaveMetrics: {
      totalAnnualQuota,
      totalUsedDays,
      totalRemainingDays,
      pendingRequestsCount: pendingLeaves.length,
      approvedRequestsCount: approvedLeaves.length,
      rejectedRequestsCount: rejectedLeaves.length,
      utilizationRate,
    },
    reimbursementMetrics: {
      totalApprovedAmount,
      totalPendingAmount,
      approvedTransactionsCount: approvedReimb.length,
      pendingTransactionsCount: pendingReimb.length,
      categoryBreakdown,
    },
    approvalVelocityRate,
  };
}

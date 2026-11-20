import { User, LeaveRequest, Department, LeaveStatus } from '../types/index.ts';

export interface CalendarLeaveEntry {
  request: LeaveRequest;
  user: User;
  department?: Department;
  isPending: boolean;
  isApproved: boolean;
}

export interface CalendarDayCell {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  month: number; // 1-12
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  leaves: CalendarLeaveEntry[];
  hasApproved: boolean;
  hasPending: boolean;
  isCoverageRisk: boolean; // 2 or more staff on leave
}

export interface WorkforceMonthSummary {
  monthName: string;
  year: number;
  totalTeamMembers: number;
  totalLeaveEvents: number;
  approvedCount: number;
  pendingCount: number;
  uniqueEmployeesOnLeave: number;
  peakAbsenceDate: string | null;
  peakAbsenceCount: number;
  coverageRiskDaysCount: number;
}

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const INDONESIAN_DAYS_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
export const INDONESIAN_DAYS_FULL = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

/**
 * Checks whether a date string (YYYY-MM-DD) falls between startDate and endDate inclusive.
 */
export function isDateInRange(
  dateStr: string,
  startDateStr: string,
  endDateStr: string
): boolean {
  if (!dateStr || !startDateStr || !endDateStr) return false;
  return dateStr >= startDateStr && dateStr <= endDateStr;
}

/**
 * Pads a single-digit number with leading zero.
 */
export function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 */
export function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${padZero(month)}-${padZero(day)}`;
}

/**
 * Formats an ISO or YYYY-MM-DD date to formal Indonesian string.
 * e.g. "2026-10-25" -> "25 Oktober 2026"
 */
export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${day} ${INDONESIAN_MONTHS[monthIdx] || parts[1]} ${year}`;
}

/**
 * Returns the number of days in a given year and month (month 1-12).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generates the full 35-day or 42-day monthly calendar grid (Monday-Sunday).
 */
export function generateMonthGrid(
  year: number,
  month: number,
  todayStr: string = '2026-10-25'
): Omit<CalendarDayCell, 'leaves' | 'hasApproved' | 'hasPending' | 'isCoverageRisk'>[] {
  // First day of month: get day of week (0 is Sunday, 1 is Monday ... 6 is Saturday)
  const firstDay = new Date(year, month - 1, 1).getDay();
  // We want Monday = 0, Sunday = 6
  const startDayOffset = (firstDay + 6) % 7;

  const daysInCurrentMonth = getDaysInMonth(year, month);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const cells: Omit<CalendarDayCell, 'leaves' | 'hasApproved' | 'hasPending' | 'isCoverageRisk'>[] = [];

  // Previous month trailing days
  for (let i = startDayOffset - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateKey = formatDateKey(prevYear, prevMonth, dayNum);
    const dayOfWeek = new Date(prevYear, prevMonth - 1, dayNum).getDay();
    cells.push({
      date: dateKey,
      dayNumber: dayNum,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
      isToday: dateKey === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateKey = formatDateKey(year, month, d);
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    cells.push({
      date: dateKey,
      dayNumber: d,
      month,
      year,
      isCurrentMonth: true,
      isToday: dateKey === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Next month leading days to complete full grid (multiples of 7, 35 or 42)
  const totalCellsNeeded = cells.length > 35 ? 42 : 35;
  const remaining = totalCellsNeeded - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const dateKey = formatDateKey(nextYear, nextMonth, d);
    const dayOfWeek = new Date(nextYear, nextMonth - 1, d).getDay();
    cells.push({
      date: dateKey,
      dayNumber: d,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
      isToday: dateKey === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  return cells;
}

/**
 * Builds the complete Team Calendar data with leave requests mapped to each day.
 */
export function buildTeamCalendarMonth(
  year: number,
  month: number,
  leaveRequests: LeaveRequest[],
  users: User[],
  departments: Department[],
  filters?: {
    departmentId?: string;
    status?: 'ALL' | 'APPROVED' | 'PENDING';
  },
  todayStr: string = '2026-10-25'
): CalendarDayCell[] {
  const baseGrid = generateMonthGrid(year, month, todayStr);
  const userMap = new Map<string, User>(users.map((u) => [u.id, u]));
  const deptMap = new Map<string, Department>(departments.map((d) => [d.id, d]));

  // Pre-filter valid requests (exclude rejected)
  const validRequests = leaveRequests.filter((req) => {
    if (req.status === 'REJECTED') return false;

    if (filters?.status === 'APPROVED' && req.status !== 'APPROVED') {
      return false;
    }
    if (
      filters?.status === 'PENDING' &&
      req.status !== 'PENDING_MANAGER' &&
      req.status !== 'PENDING_HRD'
    ) {
      return false;
    }

    if (filters?.departmentId && filters.departmentId !== 'ALL') {
      const user = userMap.get(req.userId);
      if (user?.departmentId !== filters.departmentId) {
        return false;
      }
    }

    return true;
  });

  return baseGrid.map((cell) => {
    const dayLeaves: CalendarLeaveEntry[] = [];

    validRequests.forEach((req) => {
      if (isDateInRange(cell.date, req.startDate, req.endDate)) {
        const user = userMap.get(req.userId);
        if (user) {
          const dept = deptMap.get(user.departmentId);
          dayLeaves.push({
            request: req,
            user,
            department: dept,
            isPending: req.status === 'PENDING_MANAGER' || req.status === 'PENDING_HRD',
            isApproved: req.status === 'APPROVED',
          });
        }
      }
    });

    const hasApproved = dayLeaves.some((l) => l.isApproved);
    const hasPending = dayLeaves.some((l) => l.isPending);
    const isCoverageRisk = dayLeaves.length >= 2;

    return {
      ...cell,
      leaves: dayLeaves,
      hasApproved,
      hasPending,
      isCoverageRisk,
    };
  });
}

/**
 * Calculates high-level workforce planning metrics for the selected month.
 */
export function calculateMonthWorkforceSummary(
  year: number,
  month: number,
  calendarDays: CalendarDayCell[],
  users: User[]
): WorkforceMonthSummary {
  const currentMonthCells = calendarDays.filter((c) => c.isCurrentMonth);
  const uniqueEmployeeIds = new Set<string>();
  const leaveEventIds = new Set<string>();

  let approvedEvents = 0;
  let pendingEvents = 0;
  const dateLeaveCount: Record<string, number> = {};

  currentMonthCells.forEach((c) => {
    dateLeaveCount[c.date] = c.leaves.length;
    c.leaves.forEach((l) => {
      uniqueEmployeeIds.add(l.user.id);
      if (!leaveEventIds.has(l.request.id)) {
        leaveEventIds.add(l.request.id);
        if (l.isApproved) approvedEvents++;
        if (l.isPending) pendingEvents++;
      }
    });
  });

  let peakAbsenceDate: string | null = null;
  let peakAbsenceCount = 0;

  Object.entries(dateLeaveCount).forEach(([date, count]) => {
    if (count > peakAbsenceCount) {
      peakAbsenceCount = count;
      peakAbsenceDate = date;
    }
  });

  const coverageRiskDaysCount = currentMonthCells.filter((c) => c.isCoverageRisk).length;

  return {
    monthName: INDONESIAN_MONTHS[month - 1] || `${month}`,
    year,
    totalTeamMembers: users.length,
    totalLeaveEvents: leaveEventIds.size,
    approvedCount: approvedEvents,
    pendingCount: pendingEvents,
    uniqueEmployeesOnLeave: uniqueEmployeeIds.size,
    peakAbsenceDate,
    peakAbsenceCount,
    coverageRiskDaysCount,
  };
}

import { AttendanceRecord, OvertimeRequest, User, AttendanceStatus, WorkType } from '../types/index.ts';

export interface AttendanceSummaryStats {
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  onLeaveCount: number;
  absentCount: number;
  wfoCount: number;
  wfhCount: number;
  dinasLuarCount: number;
  punctualityRate: number; // percentage (0 - 100)
}

/**
 * Determines whether a check-in is on-time or late based on standard work schedule (default 09:00).
 */
export function determineAttendanceStatus(
  checkInTimeStr: string,
  cutoffTimeStr: string = '09:00'
): AttendanceStatus {
  if (!checkInTimeStr) return 'ABSENT';

  const [inHour, inMin] = checkInTimeStr.split(':').map((v) => parseInt(v, 10));
  const [cutHour, cutMin] = cutoffTimeStr.split(':').map((v) => parseInt(v, 10));

  if (isNaN(inHour) || isNaN(inMin)) return 'ABSENT';

  const inMinutesTotal = inHour * 60 + inMin;
  const cutoffMinutesTotal = cutHour * 60 + cutMin;

  return inMinutesTotal > cutoffMinutesTotal ? 'LATE' : 'PRESENT';
}

/**
 * Calculates summary statistics for a list of attendance records.
 */
export function calculateAttendanceStats(records: AttendanceRecord[]): AttendanceSummaryStats {
  const total = records.length;
  if (total === 0) {
    return {
      totalRecords: 0,
      presentCount: 0,
      lateCount: 0,
      onLeaveCount: 0,
      absentCount: 0,
      wfoCount: 0,
      wfhCount: 0,
      dinasLuarCount: 0,
      punctualityRate: 100,
    };
  }

  let present = 0;
  let late = 0;
  let onLeave = 0;
  let absent = 0;
  let wfo = 0;
  let wfh = 0;
  let dinasLuar = 0;

  for (const r of records) {
    if (r.status === 'PRESENT') present++;
    else if (r.status === 'LATE') late++;
    else if (r.status === 'ON_LEAVE') onLeave++;
    else if (r.status === 'ABSENT') absent++;

    if (r.workType === 'WFO') wfo++;
    else if (r.workType === 'WFH') wfh++;
    else if (r.workType === 'DINAS_LUAR') dinasLuar++;
  }

  const attended = present + late;
  const punctualityRate = attended > 0 ? Math.round((present / attended) * 100) : 0;

  return {
    totalRecords: total,
    presentCount: present,
    lateCount: late,
    onLeaveCount: onLeave,
    absentCount: absent,
    wfoCount: wfo,
    wfhCount: wfh,
    dinasLuarCount: dinasLuar,
    punctualityRate,
  };
}

/**
 * Validates overtime request submission input.
 */
export function validateOvertimeRequest(data: {
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  tasksDescription: string;
}): { valid: boolean; error?: string } {
  if (!data.date || !data.date.trim()) {
    return { valid: false, error: 'Tanggal lembur wajib diisi.' };
  }
  if (!data.startTime || !data.endTime) {
    return { valid: false, error: 'Jam mulai dan jam selesai lembur wajib diisi.' };
  }
  if (data.startTime >= data.endTime) {
    return { valid: false, error: 'Jam selesai lembur harus setelah jam mulai.' };
  }
  if (data.durationHours <= 0) {
    return { valid: false, error: 'Durasi lembur harus lebih dari 0 jam.' };
  }
  if (!data.tasksDescription || data.tasksDescription.trim().length < 5) {
    return { valid: false, error: 'Uraian pekerjaan lembur minimal 5 karakter.' };
  }
  return { valid: true };
}

/**
 * Calculates standard Indonesian overtime compensation based on hourly rate.
 * Depnaker standard: 1.5x for hour 1, 2.0x for subsequent hours.
 */
export function calculateOvertimePay(hourlyRate: number, durationHours: number): number {
  if (durationHours <= 0 || hourlyRate <= 0) return 0;
  if (durationHours <= 1) {
    return Math.round(hourlyRate * 1.5 * durationHours);
  }
  const firstHourPay = hourlyRate * 1.5;
  const remainingHours = durationHours - 1;
  const subsequentPay = hourlyRate * 2.0 * remainingHours;
  return Math.round(firstHourPay + subsequentPay);
}

/**
 * Filter attendance records by date range, department, and search text.
 */
export function filterAttendanceRecords(
  records: AttendanceRecord[],
  users: User[],
  options: {
    searchQuery?: string;
    departmentId?: string;
    workType?: WorkType | 'ALL';
    status?: AttendanceStatus | 'ALL';
    date?: string;
  }
): AttendanceRecord[] {
  const userMap = new Map(users.map((u) => [u.id, u]));

  return records.filter((rec) => {
    const user = userMap.get(rec.userId);
    if (!user) return false;

    if (options.departmentId && options.departmentId !== 'ALL') {
      if (user.departmentId !== options.departmentId) return false;
    }

    if (options.workType && options.workType !== 'ALL') {
      if (rec.workType !== options.workType) return false;
    }

    if (options.status && options.status !== 'ALL') {
      if (rec.status !== options.status) return false;
    }

    if (options.date && options.date.trim()) {
      if (rec.date !== options.date) return false;
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase();
      const matchName = user.name.toLowerCase().includes(q);
      const matchNip = user.employeeNumber.toLowerCase().includes(q);
      const matchLoc = rec.locationName.toLowerCase().includes(q);
      const matchNotes = (rec.notes || '').toLowerCase().includes(q);
      if (!matchName && !matchNip && !matchLoc && !matchNotes) {
        return false;
      }
    }

    return true;
  });
}


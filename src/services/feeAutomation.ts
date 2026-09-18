import { NexusStudent, FeeTransaction } from '../types';

/**
 * Returns current date, time, and month formatted specifically in Pakistan Time (Asia/Karachi, PKT, UTC+5).
 */
export function getPakistanTime() {
  const now = new Date();

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const ymFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
  });

  const monthNameFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    month: 'long',
    year: 'numeric',
  });

  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
  });

  const timeString = timeFormatter.format(now);
  const dateString = dateFormatter.format(now);
  const yearMonth = ymFormatter.format(now); // e.g. "2026-09"
  const monthYearName = monthNameFormatter.format(now); // e.g. "September 2026"
  const dayName = dayFormatter.format(now);

  return {
    now,
    timeString,
    dateString,
    yearMonth,
    monthYearName,
    dayName,
    fullDisplay: `${timeString} • ${dayName}, ${dateString} (PKT, UTC+5)`,
  };
}

/**
 * Formats "YYYY-MM" into a readable "Month Year" string (e.g., "2026-09" -> "September 2026").
 */
export function formatYearMonth(yearMonth: string): string {
  if (!yearMonth || !yearMonth.includes('-')) return yearMonth || 'Unknown Month';
  try {
    const [year, month] = yearMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return yearMonth;
  }
}

/**
 * Calculates all chronological "YYYY-MM" months between startYM (exclusive) and endYM (inclusive).
 */
export function getElapsedMonths(startYM: string, endYM: string): string[] {
  if (!startYM || !endYM) return [];
  if (startYM >= endYM) return [];

  const [startYear, startMonth] = startYM.split('-').map(Number);
  const [endYear, endMonth] = endYM.split('-').map(Number);

  const months: string[] = [];
  let y = startYear;
  let m = startMonth + 1; // Start from the next month

  while (y < endYear || (y === endYear && m <= endMonth)) {
    if (m > 12) {
      m = 1;
      y++;
    }
    const ymStr = `${y}-${String(m).padStart(2, '0')}`;
    months.push(ymStr);
    m++;
  }

  return months;
}

/**
 * Computes billing status and unbilled months for a student based on current Pakistan Time.
 */
export function getStudentBillingStatus(student: NexusStudent, currentYM?: string) {
  const pkt = getPakistanTime();
  const currentMonth = currentYM || pkt.yearMonth;

  // Student must be enrolled in a class and have a monthly fee
  const isEnrolled = !!(student.className && (student.monthlyFee || 0) > 0);

  if (!isEnrolled) {
    return {
      isEnrolled: false,
      lastBilledMonth: student.lastBilledMonth || '',
      lastBilledMonthName: formatYearMonth(student.lastBilledMonth || ''),
      unbilledMonths: [],
      unbilledMonthsNames: [],
      pendingFeeAmount: 0,
      isDueForFee: false,
    };
  }

  // Determine baseline month
  let baselineYM = student.lastBilledMonth;

  if (!baselineYM) {
    // Infer from admission date or registeredAt
    const refDate = student.admissionDate || student.lastAdmissionDate || student.registeredAt;
    if (refDate && refDate.length >= 7) {
      baselineYM = refDate.substring(0, 7); // e.g. "2026-08"
    } else {
      // Fallback to current month - 1 so at least current month is checked
      baselineYM = currentMonth;
    }
  }

  // Calculate unbilled elapsed months
  const unbilledMonths = getElapsedMonths(baselineYM, currentMonth).filter((ym) => {
    // If student already has this month in feeMonthsBilled, do not charge again
    return !(student.feeMonthsBilled || []).includes(ym);
  });

  const unbilledMonthsNames = unbilledMonths.map(formatYearMonth);
  const pendingFeeAmount = (student.monthlyFee || 0) * unbilledMonths.length;
  const isDueForFee = unbilledMonths.length > 0;

  return {
    isEnrolled: true,
    lastBilledMonth: baselineYM,
    lastBilledMonthName: formatYearMonth(baselineYM),
    unbilledMonths,
    unbilledMonthsNames,
    pendingFeeAmount,
    isDueForFee,
  };
}

/**
 * Processes fee additions for eligible students who have entered a new billing month.
 * Adds monthlyFee * unbilledMonths to their dues, marks the months as billed,
 * and logs FeeTransactions.
 */
export function applyMonthlyFeesToStudents(params: {
  students: NexusStudent[];
  targetMonth?: string;
  targetClassName?: string;
  currency?: string;
}): {
  updatedStudents: NexusStudent[];
  transactions: FeeTransaction[];
  totalAmountAdded: number;
  studentsBilledCount: number;
  billedDetails: { studentName: string; studentId: string; months: string[]; amount: number }[];
} {
  const { students, targetMonth, targetClassName, currency = 'PKR' } = params;
  const pkt = getPakistanTime();
  const currentYM = targetMonth || pkt.yearMonth;
  const todayStr = pkt.dateString;

  let totalAmountAdded = 0;
  let studentsBilledCount = 0;
  const transactions: FeeTransaction[] = [];
  const billedDetails: { studentName: string; studentId: string; months: string[]; amount: number }[] = [];

  const updatedStudents = students.map((student) => {
    // Check class filter
    if (targetClassName && targetClassName !== 'ALL' && student.className !== targetClassName) {
      return student;
    }

    const status = getStudentBillingStatus(student, currentYM);
    if (!status.isEnrolled || !status.isDueForFee || status.unbilledMonths.length === 0) {
      return student;
    }

    const feePerMonth = student.monthlyFee || 0;
    const additionalDues = feePerMonth * status.unbilledMonths.length;
    const oldDues = student.dues || 0;
    const newDues = oldDues + additionalDues;

    totalAmountAdded += additionalDues;
    studentsBilledCount++;

    const updatedBilledList = Array.from(
      new Set([...(student.feeMonthsBilled || []), ...status.unbilledMonths])
    );

    billedDetails.push({
      studentName: student.name,
      studentId: student.id,
      months: status.unbilledMonthsNames,
      amount: additionalDues,
    });

    // Generate transaction records for each unbilled month
    status.unbilledMonths.forEach((ym) => {
      transactions.push({
        id: 'TXN-M-' + Math.floor(100000 + Math.random() * 900000),
        date: new Date().toISOString().split('T')[0],
        studentId: student.id,
        studentName: student.name,
        type: 'charge_monthly',
        amount: feePerMonth,
        prevDues: oldDues,
        newDues: newDues,
        note: `Monthly Tuition Fee - ${formatYearMonth(ym)} (Pakistan Time Month Cycle)`,
      });
    });

    return {
      ...student,
      dues: newDues,
      lastBilledMonth: status.unbilledMonths[status.unbilledMonths.length - 1],
      feeMonthsBilled: updatedBilledList,
    };
  });

  return {
    updatedStudents,
    transactions,
    totalAmountAdded,
    studentsBilledCount,
    billedDetails,
  };
}

export type NexusTab =
  | 'dashboard'
  | 'admission'
  | 'registration'
  | 'classes'
  | 'attendance'
  | 'test-marks'
  | 'student-info'
  | 'dues'
  | 'directory'
  | 'settings'
  | 'apps'
  | 'deployment';

export interface NexusStudent {
  id: string;
  name: string;
  fatherName: string;
  guardianName?: string;
  guardianNumber?: string;
  studentNumber?: string;
  gmail?: string;
  photo?: string;
  className?: string;
  admissionDate?: string;
  registeredAt?: string;
  lastAdmissionDate?: string;
  monthlyFee: number;
  admissionFee: number;
  dues: number;
  totalPaid: number;
  lastBilledMonth?: string;
  feeMonthsBilled?: string[];
}

export interface NexusClass {
  teacher: string;
  category: string;
  className: string;
  startTime: string;
  endTime: string;
  duration: string;
  monthlyFee: number;
  admissionFee: number;
}

export interface NexusAttendanceRecord {
  studentId: string;
  status: 'Present' | 'Absent' | 'Leave';
  note?: string;
}

export interface NexusTestScore {
  studentId: string;
  marks: number;
}

export interface NexusTestRecord {
  id: string;
  date: string;
  className: string;
  testName: string;
  totalMarks: number;
  passingMarks: number;
  scores: NexusTestScore[];
}

export interface NexusTestMarkRecord {
  studentId: string;
  testName: string;
  date: string;
  maxMarks: number;
  marksObtained: number;
  percentage: number;
}

export interface NexusSettings {
  name: string;
  subtitle: string;
  address: string;
  logo?: string;
  currency: string;
  adminPin: string;
  backgroundColor?: string;
  backgroundImage?: string;
  autoMonthlyFeeBilling?: boolean;
}

export interface CloudConfig {
  provider: 'built-in' | 'firebase' | 'supabase';
  firebase?: {
    projectId: string;
    apiKey: string;
  };
  supabase?: {
    url: string;
    anonKey: string;
    dbName?: string;
    dbPassword?: string;
  };
}

export interface ReceiptData {
  receiptNo: string;
  date: string;
  studentId: string;
  studentName: string;
  fatherName: string;
  className: string;
  monthlyFee: number;
  admissionFee: number;
  prevDues: number;
  paidAmount: number;
  remainingDues: number;
  studentPhoto?: string;
  note?: string;
}


export interface FeeTransaction {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  type: 'charge_monthly' | 'payment_dues';
  amount: number;
  prevDues: number;
  newDues: number;
  receiptNo?: string;
  note?: string;
}

export interface AppState {
  schemaVersion?: string;
  students: NexusStudent[];
  classes: NexusClass[];
  attendance?: Record<string, Record<string, NexusAttendanceRecord[]>>;
  attendanceRecords?: Record<string, Record<string, NexusAttendanceRecord[]>>;
  tests?: NexusTestRecord[];
  testRecords?: NexusTestRecord[];
  testMarks?: Record<string, Record<string, NexusTestMarkRecord[]>>;
  feeTransactions?: FeeTransaction[];
  receipts?: ReceiptData[];
  settings: NexusSettings;
  cloudConfig: CloudConfig;
}

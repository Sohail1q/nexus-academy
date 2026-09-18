import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { RegistrationView } from './components/RegistrationView';
import { AdmissionView } from './components/AdmissionView';
import { AttendanceView } from './components/AttendanceView';
import { TestMarksView } from './components/TestMarksView';
import { StudentInfoView } from './components/StudentInfoView';
import { DirectoryView } from './components/DirectoryView';
import { DuesView } from './components/DuesView';
import { ClassesView } from './components/ClassesView';
import { AppsView } from './components/AppsView';
import { SettingsView } from './components/SettingsView';
import { ReceiptModal } from './components/ReceiptModal';
import { AddFeeModal } from './components/AddFeeModal';
import { EditStudentModal } from './components/EditStudentModal';
import { DeploymentGuideModal } from './components/DeploymentGuideModal';
import { PakistanClock } from './components/PakistanClock';
import {
  applyMonthlyFeesToStudents,
  getPakistanTime,
  formatYearMonth,
} from './services/feeAutomation';
import {
  NexusTab,
  NexusStudent,
  NexusClass,
  NexusAttendanceRecord,
  NexusTestMarkRecord,
  NexusSettings,
  CloudConfig,
  AppState,
  ReceiptData,
} from './types';
import { cloudSync, CloudStatus } from './services/cloudSync';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  Globe,
} from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<NexusTab>('dashboard');

  // Global State
  const [appState, setAppState] = useState<AppState>(() => cloudSync.getState());
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('syncing');

  // Modals
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [viewingStudent, setViewingStudent] = useState<NexusStudent | null>(null);
  const [addFeeStudent, setAddFeeStudent] = useState<NexusStudent | null>(null);
  const [editStudent, setEditStudent] = useState<NexusStudent | null>(null);
  const [showDeployGuide, setShowDeployGuide] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Date.now();
      setToast({ id, message, type });
      setTimeout(() => {
        setToast((curr) => (curr?.id === id ? null : curr));
      }, 3500);
    },
    []
  );

  // Initialize Cloud Sync & Real-time Global Event Listeners
  useEffect(() => {
    // 1. Subscribe to state updates (from SSE or other clients)
    const unsubState = cloudSync.onStateChange((newState: AppState) => {
      setAppState(newState);
    });

    // 2. Subscribe to status changes
    const unsubStatus = cloudSync.onStatusChange((status: CloudStatus) => {
      setCloudStatus(status);
    });

    // 3. Initialize connection
    cloudSync.init().catch((err: any) => {
      console.warn('Cloud sync init fallback:', err);
    });

    return () => {
      unsubState();
      unsubStatus();
    };
  }, []);

  // Update State Globally & Broadcast to Backend/Cloud
  const updateGlobalState = useCallback((updater: (prev: AppState) => AppState) => {
    setAppState((prev) => {
      const updated = updater(prev);
      cloudSync.saveState(updated).catch((err) => {
        console.error('Failed to sync state globally:', err);
      });
      return updated;
    });
  }, []);

  // --- ACTIONS ---

  // Register Student
  const handleRegisterStudent = (newStudent: NexusStudent) => {
    updateGlobalState((prev) => ({
      ...prev,
      students: [...prev.students, newStudent],
    }));
  };

  // Admit Student
  const handleAdmitStudent = (updatedStudent: NexusStudent, receipt: ReceiptData) => {
    updateGlobalState((prev) => {
      const index = prev.students.findIndex((s) => s.id === updatedStudent.id);
      const newStudents = [...prev.students];
      if (index >= 0) {
        newStudents[index] = updatedStudent;
      } else {
        newStudents.push(updatedStudent);
      }
      return {
        ...prev,
        students: newStudents,
        receipts: [...(prev.receipts || []), receipt],
      };
    });

    // Open receipt modal immediately
    setActiveReceipt(receipt);
  };

  // Save Attendance
  const handleSaveAttendance = (
    date: string,
    className: string,
    records: NexusAttendanceRecord[]
  ) => {
    updateGlobalState((prev) => {
      const newAttendance = { ...(prev.attendance || {}) };
      if (!newAttendance[date]) {
        newAttendance[date] = {};
      }
      newAttendance[date][className] = records;
      return {
        ...prev,
        attendance: newAttendance,
        attendanceRecords: newAttendance,
      };
    });
  };

  // Save Test Marks
  const handleSaveTestMarks = (
    testKey: string,
    className: string,
    records: NexusTestMarkRecord[]
  ) => {
    updateGlobalState((prev) => {
      const newMarks = { ...(prev.testMarks || {}) };
      if (!newMarks[testKey]) {
        newMarks[testKey] = {};
      }
      newMarks[testKey][className] = records;
      return {
        ...prev,
        testMarks: newMarks,
      };
    });
  };

  // Classes Management
  const handleSaveClass = (newClass: NexusClass, editIndex: number) => {
    updateGlobalState((prev) => {
      const newClasses = [...prev.classes];
      if (editIndex >= 0 && editIndex < newClasses.length) {
        newClasses[editIndex] = newClass;
      } else {
        newClasses.push(newClass);
      }
      return {
        ...prev,
        classes: newClasses,
      };
    });
  };

  const handleDeleteClass = (index: number) => {
    updateGlobalState((prev) => {
      const newClasses = prev.classes.filter((_, i) => i !== index);
      return {
        ...prev,
        classes: newClasses,
      };
    });
  };

  // Delete Student
  const handleDeleteStudent = (id: string) => {
    updateGlobalState((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== id),
    }));
    showNotification(`Student ID "${id}" removed from records.`, 'info');
  };

  // Update Student info from Edit modal
  const handleSaveEditedStudent = (updated: NexusStudent) => {
    updateGlobalState((prev) => {
      const newStudents = prev.students.map((s) => (s.id === updated.id ? updated : s));
      return {
        ...prev,
        students: newStudents,
      };
    });
    showNotification(`Student ${updated.name} updated globally!`, 'success');
  };

  // Submit Fee from AddFeeModal (payment or monthly charge)
  const handleSubmitFee = (
    updatedStudent: NexusStudent,
    receiptData?: ReceiptData,
    message?: string
  ) => {
    updateGlobalState((prev) => {
      const newStudents = prev.students.map((s) =>
        s.id === updatedStudent.id ? updatedStudent : s
      );
      return {
        ...prev,
        students: newStudents,
        receipts: receiptData ? [...(prev.receipts || []), receiptData] : (prev.receipts || []),
        feeTransactions: receiptData ? [...(prev.feeTransactions || []), {
          id: 'FEE-PAY-' + Date.now(), date: receiptData.date, studentId: updatedStudent.id, studentName: updatedStudent.name,
          type: 'payment_dues' as const, amount: receiptData.paidAmount, prevDues: receiptData.prevDues,
          newDues: receiptData.remainingDues, receiptNo: receiptData.receiptNo, note: receiptData.note || 'Fee payment received',
        }] : (prev.feeTransactions || []),
      };
    });

    if (receiptData) {
      setActiveReceipt(receiptData);
    }

    if (message) {
      showNotification(message, 'success');
    }
  };

  // Batch add monthly fee to class with month identification
  const handleBatchAddMonthlyFee = (targetClassName: string, targetMonth?: string) => {
    const pkt = getPakistanTime();
    const selectedMonth = targetMonth || pkt.yearMonth;
    const result = applyMonthlyFeesToStudents({
      students: appState.students,
      targetMonth: selectedMonth,
      targetClassName,
      currency: appState.settings.currency,
    });

    if (result.studentsBilledCount === 0) {
      showNotification(
        `All enrolled students in ${targetClassName === 'ALL' ? 'the academy' : 'this class'} are already billed for ${formatYearMonth(selectedMonth)}.`,
        'info'
      );
      return;
    }

    updateGlobalState((prev) => ({
      ...prev,
      students: result.updatedStudents,
      feeTransactions: [...(prev.feeTransactions || []), ...result.transactions],
    }));

    showNotification(
      `Monthly fee applied for ${formatYearMonth(selectedMonth)}: ${result.studentsBilledCount} student(s) updated (+${appState.settings.currency} ${result.totalAmountAdded.toLocaleString()})!`,
      'success'
    );
  };

  // Automatically apply due monthly fees across all eligible students
  const handleApplyDueMonthlyFees = (targetMonth?: string) => {
    const pkt = getPakistanTime();
    const selectedMonth = targetMonth || pkt.yearMonth;
    const result = applyMonthlyFeesToStudents({
      students: appState.students,
      targetMonth: selectedMonth,
      currency: appState.settings.currency,
    });

    if (result.studentsBilledCount === 0) {
      showNotification(
        `All enrolled students are already up-to-date for ${formatYearMonth(selectedMonth)}.`,
        'info'
      );
      return;
    }

    updateGlobalState((prev) => ({
      ...prev,
      students: result.updatedStudents,
      feeTransactions: [...(prev.feeTransactions || []), ...result.transactions],
    }));

    showNotification(
      `1-Month Fee Applied Live: ${result.studentsBilledCount} student(s) billed for ${formatYearMonth(selectedMonth)} (+${appState.settings.currency} ${result.totalAmountAdded.toLocaleString()} added to dues)!`,
      'success'
    );
  };

  // Automatic monthly billing: no manual batch/add-monthly-fee action is required.
  useEffect(() => {
    if (appState.settings.autoMonthlyFeeBilling === false) return;
    const result = applyMonthlyFeesToStudents({
      students: appState.students,
      currency: appState.settings.currency,
    });
    if (result.studentsBilledCount > 0) {
      updateGlobalState((prev) => ({
        ...prev,
        students: result.updatedStudents,
        feeTransactions: [...(prev.feeTransactions || []), ...result.transactions],
      }));
    }
  }, [appState.students, appState.settings.autoMonthlyFeeBilling, appState.settings.currency, updateGlobalState]);

  // Settings & Cloud Config Updates
  const handleUpdateSettings = (newSettings: NexusSettings) => {
    updateGlobalState((prev) => ({
      ...prev,
      settings: newSettings,
    }));
  };

  const handleUpdateCloudConfig = (newConfig: CloudConfig) => {
    updateGlobalState((prev) => ({
      ...prev,
      cloudConfig: newConfig,
    }));
    cloudSync.setCloudConfig(newConfig);
  };

  const handleRestoreBackup = (restored: AppState) => {
    updateGlobalState(() => restored);
  };

  const handleForceSync = () => {
    cloudSync.forcePull();
    showNotification('Global cloud sync refreshed!', 'info');
  };

  // Select student to view full profile & chart
  const handleSelectStudentForView = (student: NexusStudent) => {
    setViewingStudent(student);
    setActiveTab('student-info');
  };

  // Dynamic Background Style
  const customBackgroundStyle = appState.settings.backgroundImage
    ? {
        backgroundImage: `url(${appState.settings.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {
        backgroundColor: appState.settings.backgroundColor || '#f8fafc',
      };

  return (
    <div
      style={customBackgroundStyle}
      className="min-h-screen flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900"
    >
      {/* Top Professional Navigation Bar with Global Search */}
      <Navbar
        settings={appState.settings}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'deployment') {
            setShowDeployGuide(true);
          } else {
            setActiveTab(tab);
          }
        }}
        students={appState.students}
        cloudStatus={cloudStatus}
        onSelectStudent={handleSelectStudentForView}
        onOpenDeployGuide={() => setShowDeployGuide(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            students={appState.students}
            classes={appState.classes}
            currency={appState.settings.currency}
            settings={appState.settings}
            onNavigate={setActiveTab}
            onTabChange={setActiveTab}
            onOpenReceipt={(student) => {
              const receipt: ReceiptData = {
                receiptNo: 'REC-' + Math.floor(100000 + Math.random() * 900000),
                date: new Date().toISOString().split('T')[0],
                studentId: student.id,
                studentName: student.name,
                fatherName: student.fatherName || '',
                className: student.className || 'General Tuition',
                monthlyFee: student.monthlyFee || 0,
                admissionFee: 0,
                prevDues: student.dues || 0,
                paidAmount: student.totalPaid || 0,
                remainingDues: student.dues || 0,
                studentPhoto: student.photo,
              };
              setActiveReceipt(receipt);
            }}
          />
        )}

        {activeTab === 'registration' && (
          <RegistrationView
            students={appState.students}
            onRegisterStudent={handleRegisterStudent}
            onNotification={showNotification}
          />
        )}

        {activeTab === 'admission' && (
          <AdmissionView
            students={appState.students}
            classes={appState.classes}
            currency={appState.settings.currency}
            onAdmitStudent={handleAdmitStudent}
            onSaveAdmission={handleAdmitStudent}
            onTransferStudent={handleSubmitFee}
            onNotification={showNotification}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceView
            students={appState.students}
            classes={appState.classes}
            attendanceRecords={appState.attendance || {}}
            onSaveAttendance={handleSaveAttendance}
            onNotification={showNotification}
          />
        )}

        {activeTab === 'test-marks' && (
          <TestMarksView
            students={appState.students}
            classes={appState.classes}
            testMarks={appState.testMarks || {}}
            onSaveTestMarks={handleSaveTestMarks}
            onNotification={showNotification}
          />
        )}

        {activeTab === 'student-info' && (
          <StudentInfoView
            students={appState.students}
            tests={appState.tests || []}
            attendance={appState.attendance || {}}
            currency={appState.settings.currency}
            selectedStudentFromNav={viewingStudent}
            onNotification={showNotification}
          />
        )}

        {activeTab === 'directory' && (
          <DirectoryView
            students={appState.students}
            classes={appState.classes}
            currency={appState.settings.currency}
            onSelectStudent={handleSelectStudentForView}
            onEditStudent={(student) => setEditStudent(student)}
            onAddFee={(student) => setAddFeeStudent(student)}
            onOpenReceipt={(student) => {
              const history = (appState.receipts || []).filter((r) => r.studentId === student.id);
              const latest = history[history.length - 1];
              setActiveReceipt(latest ? { ...latest, className: student.className || latest.className, monthlyFee: student.monthlyFee || 0, remainingDues: student.dues || 0, studentPhoto: student.photo } : {
                receiptNo: 'ACCOUNT-' + student.id,
                date: new Date().toISOString().split('T')[0],
                studentId: student.id, studentName: student.name, fatherName: student.fatherName || student.guardianName || '',
                className: student.className || 'Not Admitted', monthlyFee: student.monthlyFee || 0, admissionFee: 0,
                prevDues: student.dues || 0, paidAmount: student.totalPaid || 0, remainingDues: student.dues || 0, studentPhoto: student.photo,
                note: 'Current student fee account receipt / statement.',
              });
            }}
            onDeleteStudent={handleDeleteStudent}
            onNotification={showNotification}
          />
        )}

        {activeTab === 'dues' && (
          <DuesView
            students={appState.students}
            classes={appState.classes}
            currency={appState.settings.currency}
            onAddFee={(student) => setAddFeeStudent(student)}
            onNotification={showNotification}
          />
        )}

        {activeTab === 'classes' && (
          <ClassesView
            classes={appState.classes}
            currency={appState.settings.currency}
            onSaveClass={handleSaveClass}
            onDeleteClass={handleDeleteClass}
            onNotification={showNotification}
          />
        )}

        {activeTab === 'apps' && (
          <AppsView
            settings={appState.settings}
            onNotification={showNotification}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={appState.settings}
            cloudConfig={appState.cloudConfig}
            cloudStatus={cloudStatus}
            appState={appState}
            onUpdateSettings={handleUpdateSettings}
            onUpdateCloudConfig={handleUpdateCloudConfig}
            onRestoreBackup={handleRestoreBackup}
            onForceSync={handleForceSync}
            onNotification={showNotification}
          />
        )}
      </main>

      {/* Global Modals */}

      {/* 1. Official Receipt Modal with Browser Print Dialog */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          settings={appState.settings}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* 2. Collect Fee Payment Modal */}
      {addFeeStudent && (
        <AddFeeModal
          student={addFeeStudent}
          currency={appState.settings.currency}
          onClose={() => setAddFeeStudent(null)}
          onSubmitFee={handleSubmitFee}
        />
      )}

      {/* 3. Edit Student Information Modal */}
      {editStudent && (
        <EditStudentModal
          student={editStudent}
          classes={appState.classes}
          currency={appState.settings.currency}
          onClose={() => setEditStudent(null)}
          onSave={handleSaveEditedStudent}
        />
      )}

      {/* 4. Global Deployment & Cloudflare/GitHub Publishing Guide */}
      {showDeployGuide && (
        <DeploymentGuideModal
          onClose={() => setShowDeployGuide(false)}
          onNotification={showNotification}
        />
      )}

      {/* Floating Global Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold border backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-900/95 text-white border-emerald-500/50'
              : toast.type === 'error'
              ? 'bg-red-900/95 text-white border-red-500/50'
              : 'bg-slate-900/95 text-white border-slate-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-blue-300 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-xs py-3.5 px-6 text-xs text-slate-500 max-w-7xl w-full mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex items-center flex-wrap justify-center md:justify-start gap-2">
            <span className="font-semibold text-slate-700">{appState.settings.name} &copy; {new Date().getFullYear()}</span>
            <span>•</span>
            <PakistanClock locationText={appState.settings.address} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeployGuide(true)}
              className="text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <Globe className="w-3.5 h-3.5" /> Deployment Guide
            </button>
            <span>•</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Global Database Live
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

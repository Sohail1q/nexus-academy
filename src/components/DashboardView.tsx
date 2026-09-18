import React, { useState, useEffect } from 'react';
import {
  Wallet2,
  AlertTriangle,
  UserCheck,
  Clock,
  BookOpen,
  ArrowRight,
  UserPlus,
  Coins,
  CalendarCheck,
  FileCheck2,
  Calendar,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { NexusStudent, NexusClass, NexusTab, NexusSettings } from '../types';
import { getPakistanTime, getStudentBillingStatus } from '../services/feeAutomation';

interface DashboardViewProps {
  students: NexusStudent[];
  classes: NexusClass[];
  currency?: string;
  settings?: NexusSettings;
  onNavigate?: (tab: NexusTab) => void;
  onTabChange?: (tab: NexusTab) => void;
  onOpenReceipt?: (student: NexusStudent) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  classes,
  currency,
  settings,
  onNavigate,
  onTabChange,
  onOpenReceipt,
}) => {
  const activeCurrency = currency || settings?.currency || 'PKR';
  const handleNavigate = (tab: NexusTab) => {
    if (onNavigate) onNavigate(tab);
    else if (onTabChange) onTabChange(tab);
  };

  // Live Pakistan Time
  const [pkt, setPkt] = useState(getPakistanTime());
  useEffect(() => {
    const timer = setInterval(() => {
      setPkt(getPakistanTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Aggregate stats
  const totalCollected = students.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
  const totalDues = students.reduce((acc, s) => acc + (s.dues || 0), 0);
  const activeCount = students.length;

  // Month fee check
  const studentsDueForFee = students.filter(
    (s) => !!s.className && (s.monthlyFee || 0) > 0 && getStudentBillingStatus(s, pkt.yearMonth).isDueForFee
  );
  const totalPendingNewFee = studentsDueForFee.reduce((acc, s) => {
    const status = getStudentBillingStatus(s, pkt.yearMonth);
    return acc + status.pendingFeeAmount;
  }, 0);

  const recentStudents = [...students].reverse().slice(0, 6);

  return (
    <div className="space-y-6">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Collections */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm flex items-center gap-4.5 hover:shadow-md transition">
          <div className="w-13 h-13 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl shrink-0">
            <Wallet2 className="w-6 h-6 text-purple-600" />
          </div>
          <div className="min-w-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Total Collections Received
            </label>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5 truncate">
              {activeCurrency} {totalCollected.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm flex items-center gap-4.5 hover:shadow-md transition">
          <div className="w-13 h-13 rounded-xl bg-red-100 text-red-700 flex items-center justify-center text-2xl shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="min-w-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Outstanding Dues Balance
            </label>
            <h2 className="text-2xl font-bold text-red-600 mt-0.5 truncate">
              {activeCurrency} {totalDues.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* Active Students */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm flex items-center gap-4.5 hover:shadow-md transition">
          <div className="w-13 h-13 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl shrink-0">
            <UserCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Active Enrolled Students
            </label>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5 truncate">
              {activeCount}
            </h2>
          </div>
        </div>
      </div>

      {/* Live Pakistan Standard Time & Monthly Fee Automation Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white rounded-2xl p-4 sm:p-5 border border-slate-750 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Pakistan Standard Time (Asia/Karachi)
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">•</span>
              <span className="text-xs text-slate-300 font-mono font-bold">
                {pkt.timeString} — {pkt.dateString}
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold text-white mt-1 flex items-center gap-2 flex-wrap">
              <span>Billing Cycle: <span className="text-blue-300">{pkt.monthYearName}</span></span>
              <span className="text-slate-500">•</span>
              {studentsDueForFee.length > 0 ? (
                <span className="text-amber-300 text-xs font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {studentsDueForFee.length} student(s) due for 1-month fee (+{activeCurrency} {totalPendingNewFee.toLocaleString()})
                </span>
              ) : (
                <span className="text-emerald-300 text-xs font-semibold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  All enrolled students billed for current cycle
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleNavigate('dues')}
          className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg inline-flex items-center gap-2 shadow-xs transition shrink-0 cursor-pointer self-stretch md:self-auto justify-center"
        >
          <span>Manage Month Cycle</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Access Shortcut Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => handleNavigate('registration')}
          className="p-3.5 bg-white border border-slate-200 hover:border-blue-500 rounded-xl shadow-2xs hover:shadow-sm text-left flex items-center gap-3 transition cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 truncate">Register Student</div>
            <div className="text-[10px] text-slate-400">New registration</div>
          </div>
        </button>

        <button
          onClick={() => handleNavigate('dues')}
          className="p-3.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-xl shadow-2xs hover:shadow-sm text-left flex items-center gap-3 transition cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
            <Coins className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 truncate">Fee &amp; Dues</div>
            <div className="text-[10px] text-slate-400">Collect &amp; add fee</div>
          </div>
        </button>

        <button
          onClick={() => handleNavigate('attendance')}
          className="p-3.5 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl shadow-2xs hover:shadow-sm text-left flex items-center gap-3 transition cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 truncate">Attendance Calendar</div>
            <div className="text-[10px] text-slate-400">Mark daily &amp; trends</div>
          </div>
        </button>

        <button
          onClick={() => handleNavigate('test-marks')}
          className="p-3.5 bg-white border border-slate-200 hover:border-amber-500 rounded-xl shadow-2xs hover:shadow-sm text-left flex items-center gap-3 transition cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 truncate">Test Score Marks</div>
            <div className="text-[10px] text-slate-400">Grading &amp; tests</div>
          </div>
        </button>
      </div>

      {/* Main Grid: Recent Registrations + Available Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Enrollments Table */}
        <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Recent Student Enrollments
            </h3>
            <button
              onClick={() => handleNavigate('directory')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              View All Directory <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">ID #</th>
                  <th className="py-2.5 px-3">Photo</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Class Option</th>
                  <th className="py-2.5 px-3 text-right">Total Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No registrations recorded yet. Register your first student in the Registration tab!
                    </td>
                  </tr>
                ) : (
                  recentStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-semibold text-blue-600">{s.id}</td>
                      <td className="py-2.5 px-3">
                        {s.photo && !s.photo.includes('svg') ? (
                          <img
                            src={s.photo}
                            alt={s.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {s.name ? s.name.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 max-w-[200px] truncate">
                          {s.className || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                        {activeCurrency} {(s.totalPaid || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Available Classes Panel */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" /> Available Classes
            </h3>
            <button
              onClick={() => handleNavigate('classes')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Manage
            </button>
          </div>

          <div className="space-y-3">
            {classes.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No active classes configured.</p>
            ) : (
              classes.map((c, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>{c.category} - {c.className}</span>
                    <span className="text-blue-600 font-bold">{activeCurrency} {c.monthlyFee}</span>
                  </div>
                  <div className="text-slate-500 mt-1 flex items-center justify-between">
                    <span>Teacher: {c.teacher}</span>
                    <span>{c.startTime} - {c.endTime}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

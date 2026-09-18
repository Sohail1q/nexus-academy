import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Save,
  Users,
  FileSpreadsheet,
  Layers,
  Eye,
  X,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { NexusStudent, NexusClass, NexusAttendanceRecord } from '../types';
import {
  exportToExcelXls,
  exportMultiSheetExcelXls,
  ExcelSheetConfig,
  ExcelDateSection,
  ExcelColumn,
  ExcelCell,
} from '../services/cloudSync';

interface AttendanceViewProps {
  students: NexusStudent[];
  classes: NexusClass[];
  attendanceRecords: Record<string, Record<string, NexusAttendanceRecord[]>>;
  onSaveAttendance: (date: string, className: string, records: NexusAttendanceRecord[]) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  classes,
  attendanceRecords,
  onSaveAttendance,
  onNotification,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusMap, setStatusMap] = useState<Record<string, 'Present' | 'Absent' | 'Leave'>>({});
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string; id: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-select first class if none selected
  useEffect(() => {
    if (!selectedClass && classes.length > 0) {
      const first = classes[0];
      setSelectedClass(`${first.teacher} | ${first.category} - ${first.className} (${first.startTime} to ${first.endTime})`);
    }
  }, [classes, selectedClass]);

  // Filter students enrolled in the selected class
  const enrolledStudents = students.filter((s) => s.className === selectedClass);

  // When class or date changes, load saved attendance or default to 'Present'
  useEffect(() => {
    if (!selectedClass || !date) {
      setStatusMap({});
      return;
    }

    const savedForDate = attendanceRecords[date]?.[selectedClass] || [];
    const newMap: Record<string, 'Present' | 'Absent' | 'Leave'> = {};

    enrolledStudents.forEach((s) => {
      const existing = savedForDate.find((r) => r.studentId === s.id);
      newMap[s.id] = existing ? existing.status : 'Present';
    });

    setStatusMap(newMap);
  }, [selectedClass, date, students, attendanceRecords]);

  const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Leave') => {
    setStatusMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAll = (status: 'Present' | 'Absent' | 'Leave') => {
    const updated: Record<string, 'Present' | 'Absent' | 'Leave'> = {};
    enrolledStudents.forEach((s) => {
      updated[s.id] = status;
    });
    setStatusMap(updated);
  };

  const handleSave = () => {
    if (!selectedClass) {
      onNotification('Please select an active class first.', 'error');
      return;
    }

    if (enrolledStudents.length === 0) {
      onNotification('No students are enrolled in this class to record attendance.', 'error');
      return;
    }

    const records: NexusAttendanceRecord[] = enrolledStudents.map((s) => ({
      studentId: s.id,
      status: statusMap[s.id] || 'Present',
    }));

    onSaveAttendance(date, selectedClass, records);
    onNotification(`Daily attendance saved for ${records.length} student(s) on ${date}!`, 'success');
  };

  const getFullPhotoUrl = (photoPath?: string) => {
    if (!photoPath) return '';
    if (photoPath.startsWith('http')) return photoPath;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
  };

  // Helper: Enrolled students for a given class string
  const getEnrolledForClass = (targetClassStr: string): NexusStudent[] => {
    return students.filter((s) => {
      if (!s.className) return false;
      if (s.className === targetClassStr) return true;
      const parts = targetClassStr.split('|');
      const teacherName = parts[0]?.trim();
      const categoryAndClass = parts[1]?.trim();
      if (categoryAndClass && s.className.includes(categoryAndClass)) {
        if (!teacherName || s.className.includes(teacherName)) {
          return true;
        }
      }
      return false;
    });
  };

  // Helper: Get all recorded dates for a class + active UI date
  const getRecordedDatesForClass = (targetClassStr: string): string[] => {
    const datesSet = new Set<string>();

    Object.keys(attendanceRecords).forEach((d) => {
      if (
        attendanceRecords[d] &&
        attendanceRecords[d][targetClassStr] &&
        attendanceRecords[d][targetClassStr].length > 0
      ) {
        datesSet.add(d);
      }
    });

    if (selectedClass === targetClassStr && date) {
      datesSet.add(date);
    }

    if (datesSet.size === 0 && date) {
      datesSet.add(date);
    }

    return Array.from(datesSet).sort((a, b) => a.localeCompare(b));
  };

  // Helper: Build Date Sections for a Class with all recorded dates
  // After each date's records, 2 blank lines are preserved in the Excel table
  const buildDateSectionsForClass = (
    targetClassStr: string,
    enrolledList: NexusStudent[]
  ): ExcelDateSection[] => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const classDates = getRecordedDatesForClass(targetClassStr);

    const columns: ExcelColumn[] = [
      { header: 'Student ID', width: 95 },
      { header: 'Photo Link', width: 120 },
      { header: 'Student Name', width: 140 },
      { header: 'Father Name', width: 140 },
      { header: 'Class Name', width: 220 },
      { header: 'Attendance Date', width: 120 },
      { header: 'Day of Week', width: 100 },
      { header: 'Status', width: 110 },
    ];

    return classDates.map((d) => {
      const dateObj = new Date(d);
      const dayName = isNaN(dateObj.getTime()) ? '' : dayNames[dateObj.getDay()];
      const savedForDate = attendanceRecords[d]?.[targetClassStr] || [];
      const isCurrentActive = targetClassStr === selectedClass && d === date;

      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;

      const rows: ExcelCell[][] = enrolledList.map((s) => {
        let st: 'Present' | 'Absent' | 'Leave' = 'Present';

        if (isCurrentActive && statusMap[s.id]) {
          st = statusMap[s.id];
        } else {
          const rec = savedForDate.find((r) => r.studentId === s.id);
          if (rec) {
            st = rec.status;
          }
        }

        if (st === 'Present') presentCount++;
        else if (st === 'Absent') absentCount++;
        else if (st === 'Leave') leaveCount++;

        const fullPhoto = getFullPhotoUrl(s.photo);

        return [
          { text: s.id },
          {
            text: fullPhoto ? 'View Online Photo' : 'No Photo',
            isLink: !!fullPhoto,
            linkUrl: fullPhoto,
          },
          { text: s.name },
          { text: s.fatherName || s.guardianName || '' },
          { text: targetClassStr },
          { text: d, isDate: true },
          { text: dayName },
          { text: st, isStatus: true },
        ];
      });

      return {
        dateTitle: `ATTENDANCE DATE: ${d} (${dayName})  |  Enrolled: ${enrolledList.length}  |  Present: ${presentCount}  |  Absent: ${absentCount}  |  Leave: ${leaveCount}`,
        columns,
        rows,
      };
    });
  };

  // 1. Export ALL classes to an Excel workbook: Every class on a separate sheet!
  // In each sheet, all dates are displayed with 2 blank rows between each day!
  const handleExportAllClassesMultiSheet = () => {
    if (classes.length === 0) {
      onNotification('No classes available in academy to export.', 'error');
      return;
    }

    const sheets: ExcelSheetConfig[] = [];

    classes.forEach((cls) => {
      const displayStr = `${cls.teacher} | ${cls.category} - ${cls.className} (${cls.startTime} to ${cls.endTime})`;
      const classEnrolled = getEnrolledForClass(displayStr);
      const dateSections = buildDateSectionsForClass(displayStr, classEnrolled);

      const cleanSheetName = (cls.className || cls.category || 'Class')
        .replace(/[\\/?*:[\]]/g, '_')
        .substring(0, 26);

      sheets.push({
        sheetName: cleanSheetName,
        title: `Nexus Academy — Attendance Register: ${cls.className}`,
        subtitle: `Teacher: ${cls.teacher} | Category: ${cls.category} | Time: ${cls.startTime} - ${cls.endTime} | Enrolled: ${classEnrolled.length}`,
        columns: [
          { header: 'Student ID', width: 95 },
          { header: 'Photo Link', width: 120 },
          { header: 'Student Name', width: 140 },
          { header: 'Father Name', width: 140 },
          { header: 'Class Name', width: 220 },
          { header: 'Attendance Date', width: 120 },
          { header: 'Day of Week', width: 100 },
          { header: 'Status', width: 110 },
        ],
        dateSections,
      });
    });

    const todayStr = new Date().toISOString().split('T')[0];
    exportMultiSheetExcelXls({
      sheets,
      filename: `Nexus_Academy_Attendance_All_Classes_${todayStr}.xls`,
    });

    onNotification(
      `Exported ${sheets.length} class(es)! Each class is saved on its own separate sheet with 2 blank rows separating each date.`,
      'success'
    );
  };

  // 2. Export CURRENT active class with all its dates separated by 2 blank rows
  const handleExportCurrentClassAllDates = () => {
    if (!selectedClass) {
      onNotification('Please select an active class first.', 'error');
      return;
    }
    if (enrolledStudents.length === 0) {
      onNotification('No students enrolled in this class to export.', 'info');
      return;
    }

    const matchedCls = classes.find(
      (c) => `${c.teacher} | ${c.category} - ${c.className} (${c.startTime} to ${c.endTime})` === selectedClass
    );

    const sheetName = matchedCls ? (matchedCls.className || 'Class_Attendance') : 'Attendance';
    const dateSections = buildDateSectionsForClass(selectedClass, enrolledStudents);

    const sheets: ExcelSheetConfig[] = [
      {
        sheetName,
        title: `Nexus Academy — Attendance Register: ${matchedCls?.className || selectedClass}`,
        subtitle: `Class: ${selectedClass} | Enrolled Students: ${enrolledStudents.length}`,
        columns: [
          { header: 'Student ID', width: 95 },
          { header: 'Photo Link', width: 120 },
          { header: 'Student Name', width: 140 },
          { header: 'Father Name', width: 140 },
          { header: 'Class Name', width: 220 },
          { header: 'Attendance Date', width: 120 },
          { header: 'Day of Week', width: 100 },
          { header: 'Status', width: 110 },
        ],
        dateSections,
      },
    ];

    const safeClass = (matchedCls?.className || selectedClass).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25);
    const todayStr = new Date().toISOString().split('T')[0];
    exportMultiSheetExcelXls({
      sheets,
      filename: `Attendance_${safeClass}_All_Dates_${todayStr}.xls`,
    });

    onNotification(
      `Exported attendance for ${sheetName}! All dates included with 2 blank rows separating each day.`,
      'success'
    );
  };

  // 3. Export single active date
  const handleExportExcelSingleDate = () => {
    if (!selectedClass) {
      onNotification('Please select an active class first to export attendance.', 'error');
      return;
    }
    if (enrolledStudents.length === 0) {
      onNotification('No students found in this class to export.', 'info');
      return;
    }

    const dateObj = new Date(date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = isNaN(dateObj.getTime()) ? '' : dayNames[dateObj.getDay()];

    const columns = [
      { header: 'Student ID', width: 90 },
      { header: 'Photo Link', width: 110 },
      { header: 'Student Name', width: 130 },
      { header: 'Father Name', width: 130 },
      { header: 'Class Name', width: 180 },
      { header: 'Attendance Date', width: 120 },
      { header: 'Day of Week', width: 100 },
      { header: 'Status', width: 110 },
    ];

    const rows = enrolledStudents.map((s) => {
      const fullPhoto = getFullPhotoUrl(s.photo);
      const st = statusMap[s.id] || 'Present';
      return [
        { text: s.id },
        {
          text: fullPhoto ? 'View Online Photo' : 'No Photo',
          isLink: !!fullPhoto,
          linkUrl: fullPhoto,
        },
        { text: s.name },
        { text: s.fatherName || s.guardianName || '' },
        { text: selectedClass },
        { text: date, isDate: true },
        { text: day },
        { text: st, isStatus: true },
      ];
    });

    const safeClass = selectedClass.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25);
    exportToExcelXls({
      sheetName: `${date}_Attendance`,
      title: `Nexus Academy — Daily Attendance Sheet: ${date} (${day})`,
      subtitle: `Class: ${selectedClass} | Enrolled Students: ${enrolledStudents.length}`,
      columns,
      rows,
      filename: `Attendance_${safeClass}_${date}.xls`,
    });

    onNotification(`Exported Excel attendance sheet for ${date}!`, 'success');
  };

  const copyPhotoLink = (url: string) => {
    const full = getFullPhotoUrl(url);
    navigator.clipboard.writeText(full);
    setCopiedLink(true);
    onNotification('Online photo link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Class & Date Bar */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-200 flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-blue-600" /> Daily Attendance Marking &amp; Verification
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mark attendance and export Excel registers with separate sheets per class and all dates.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {classes.length > 0 && (
              <button
                type="button"
                onClick={handleExportAllClassesMultiSheet}
                className="h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
                title="Export Excel workbook where every class is saved on its own separate sheet with all dates separated by 2 blank rows"
              >
                <Layers className="w-4 h-4 text-emerald-200" />
                <span>Export All Classes (Separate Sheet per Class)</span>
              </button>
            )}

            {selectedClass && enrolledStudents.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExportCurrentClassAllDates}
                  className="h-9 px-3 bg-white border border-emerald-600 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  title="Export this class's complete history with all dates separated by 2 blank rows and headings"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export Class (All Dates)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcelSingleDate}
                  className="h-9 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1 transition cursor-pointer"
                  title="Export only the active selected date for this class"
                >
                  <span>Single Date</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Select Active Class <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
            >
              <option value="">-- Select Active Class --</option>
              {classes.map((cls, idx) => {
                const displayStr = `${cls.teacher} | ${cls.category} - ${cls.className} (${cls.startTime} to ${cls.endTime})`;
                return (
                  <option key={idx} value={displayStr}>
                    {displayStr}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Active Marking Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Attendance Table Marking Card */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* Quick Actions Bar */}
        {selectedClass && enrolledStudents.length > 0 ? (
          <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-700">
              Marking Date: <strong className="text-blue-600">{date}</strong> ({enrolledStudents.length} students)
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">Batch Mark:</span>
              <button
                type="button"
                onClick={() => handleMarkAll('Present')}
                className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition cursor-pointer"
              >
                All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('Absent')}
                className="px-2.5 py-1 text-xs font-bold rounded bg-red-100 text-red-800 hover:bg-red-200 transition cursor-pointer"
              >
                All Absent
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('Leave')}
                className="px-2.5 py-1 text-xs font-bold rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition cursor-pointer"
              >
                All Leave
              </button>
            </div>
          </div>
        ) : null}

        {/* Attendance Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">ID #</th>
                <th className="py-2.5 px-3">Photo</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Father Name</th>
                <th className="py-2.5 px-3">Status (Present / Absent / Leave)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!selectedClass ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Please select an active class above to load enrolled students.
                  </td>
                </tr>
              ) : enrolledStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No students are enrolled in this class yet. Complete student admission first in the Admission tab.
                  </td>
                </tr>
              ) : (
                enrolledStudents.map((s) => {
                  const currentStatus = statusMap[s.id] || 'Present';
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-semibold text-blue-600">{s.id}</td>
                      <td className="py-2.5 px-3">
                        <div
                          onClick={() => setPreviewPhoto({ url: s.photo || '', name: s.name, id: s.id })}
                          className="cursor-pointer group relative inline-block"
                          title="Click to preview photo & link"
                        >
                          {s.photo && !s.photo.includes('svg') ? (
                            <img
                              src={s.photo}
                              alt={s.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-300 shadow-xs group-hover:ring-2 group-hover:ring-blue-500 transition"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 group-hover:ring-2 group-hover:ring-blue-500">
                              {s.name ? s.name.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.fatherName}</td>
                      <td className="py-2.5 px-3">
                        <select
                          value={currentStatus}
                          onChange={(e) =>
                            handleStatusChange(
                              s.id,
                              e.target.value as 'Present' | 'Absent' | 'Leave'
                            )
                          }
                          className={`h-8 px-2.5 rounded-md text-xs font-semibold outline-none border transition cursor-pointer ${
                            currentStatus === 'Present'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : currentStatus === 'Absent'
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Leave">Leave</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Save & Export Controls */}
        {selectedClass && enrolledStudents.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCurrentClassAllDates}
                className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md inline-flex items-center gap-2 border border-slate-300 transition cursor-pointer"
                title="Export this class register with all dates separated by 2 blank rows"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Export Class (All Dates)
              </button>

              <button
                type="button"
                onClick={handleExportAllClassesMultiSheet}
                className="h-10 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-md inline-flex items-center gap-2 border border-emerald-300 transition cursor-pointer"
                title="Export all classes (separate sheet per class)"
              >
                <Layers className="w-4 h-4 text-emerald-700" /> Export All Classes (.xls)
              </button>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Daily Attendance
            </button>
          </div>
        )}
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> {previewPhoto.name} ({previewPhoto.id})
              </h3>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col items-center">
              {previewPhoto.url && !previewPhoto.url.includes('svg') ? (
                <img
                  src={previewPhoto.url}
                  alt={previewPhoto.name}
                  className="w-52 h-52 object-cover rounded-xl border border-slate-200 shadow-md"
                />
              ) : (
                <div className="w-52 h-52 bg-slate-100 rounded-xl flex items-center justify-center text-4xl font-bold text-slate-400 border border-slate-200">
                  {previewPhoto.name.charAt(0)}
                </div>
              )}

              {/* Online Image Link */}
              <div className="mt-4 w-full bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Online Image URL Link:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getFullPhotoUrl(previewPhoto.url)}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-1.5 flex-1 font-mono text-slate-700 outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyPhotoLink(previewPhoto.url)}
                    className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
                    title="Copy URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={getFullPhotoUrl(previewPhoto.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Contact,
  Search,
  FileSpreadsheet,
  Download,
  Calendar,
  Award,
  ExternalLink,
  Eye,
  X,
  Copy,
  Check,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { NexusStudent, NexusTestRecord, NexusAttendanceRecord } from '../types';
import { downloadBlob, exportToExcelXls } from '../services/cloudSync';

interface StudentInfoViewProps {
  students: NexusStudent[];
  tests: NexusTestRecord[];
  attendance: Record<string, Record<string, NexusAttendanceRecord[]>>;
  currency?: string;
  selectedStudentFromNav?: NexusStudent | null;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StudentInfoView: React.FC<StudentInfoViewProps> = ({
  students,
  tests,
  attendance,
  currency = 'PKR',
  selectedStudentFromNav,
  onNotification,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeStudent, setActiveStudent] = useState<NexusStudent | null>(
    selectedStudentFromNav || students[0] || null
  );
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string; id: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Sync if student selected from Navbar
  React.useEffect(() => {
    if (selectedStudentFromNav) {
      setActiveStudent(selectedStudentFromNav);
    }
  }, [selectedStudentFromNav]);

  const handleSearch = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      onNotification('Please enter a student name, ID, or father name to search.', 'error');
      return;
    }

    const found = students.find(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
        (s.guardianName && s.guardianName.toLowerCase().includes(q))
    );

    if (found) {
      setActiveStudent(found);
      onNotification(`Found profile for ${found.name} (${found.id})`, 'success');
    } else {
      onNotification(`No student matching "${q}" was found.`, 'error');
    }
  };

  // Compile attendance history rows for the active student
  const attendanceHistory: Array<{ date: string; day: string; status: string; className: string }> = [];
  if (activeStudent) {
    const targetId = activeStudent.id.trim().toLowerCase();
    const targetName = activeStudent.name.trim().toLowerCase();

    Object.keys(attendance || {})
      .sort()
      .reverse()
      .forEach((date) => {
        const classesForDate = attendance[date] || {};
        Object.entries(classesForDate).forEach(([clsName, records]) => {
          const recList = (records as NexusAttendanceRecord[]) || [];
          recList.forEach((r) => {
            const rId = (r.studentId || '').trim().toLowerCase();
            if (rId === targetId || rId === targetName) {
              const dateObj = new Date(date);
              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const day = isNaN(dateObj.getTime()) ? '' : dayNames[dateObj.getDay()];

              attendanceHistory.push({
                date,
                day,
                status: r.status,
                className: clsName,
              });
            }
          });
        });
      });
  }

  // Compile test history rows for the active student
  const testHistory: Array<{
    date: string;
    testName: string;
    totalMarks: number;
    achieved: number;
    percentage: number;
    isPass: boolean;
  }> = [];

  if (activeStudent) {
    const targetId = activeStudent.id.trim().toLowerCase();
    (tests || [])
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((t) => {
        const scoreObj = t.scores?.find(
          (s) => (s.studentId || '').trim().toLowerCase() === targetId
        );
        if (scoreObj) {
          const percentage = Math.round((scoreObj.marks / t.totalMarks) * 100);
          testHistory.push({
            date: t.date,
            testName: t.testName,
            totalMarks: t.totalMarks,
            achieved: scoreObj.marks,
            percentage,
            isPass: scoreObj.marks >= t.passingMarks,
          });
        }
      });
  }

  // Chart data formatted for Recharts
  const chartData = testHistory.map((t) => ({
    name: t.testName.length > 15 ? t.testName.substring(0, 15) + '...' : t.testName,
    fullName: t.testName,
    date: t.date,
    percentage: t.percentage,
    score: `${t.achieved} / ${t.totalMarks}`,
    achieved: t.achieved,
    total: t.totalMarks,
    isPass: t.isPass,
  }));

  const getFullPhotoUrl = (photoPath?: string) => {
    if (!photoPath) return '';
    if (photoPath.startsWith('http')) return photoPath;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
  };

  // Download Attendance in native Excel spreadsheet (.xls)
  const handleDownloadExcel = () => {
    if (!activeStudent) return;
    if (attendanceHistory.length === 0) {
      onNotification(`No attendance records to export for ${activeStudent.name}.`, 'info');
      return;
    }

    const photoFullUrl = getFullPhotoUrl(activeStudent.photo);

    const columns = [
      { header: 'Student ID', width: 90 },
      { header: 'Photo Link', width: 110 },
      { header: 'Student Name', width: 130 },
      { header: 'Father / Guardian', width: 130 },
      { header: 'Class Name', width: 160 },
      { header: 'Attendance Date', width: 120 },
      { header: 'Day of Week', width: 100 },
      { header: 'Status (Present/Absent/Leave)', width: 140 },
    ];

    const rows = attendanceHistory.map((r) => [
      { text: activeStudent.id },
      {
        text: photoFullUrl ? 'View Online Photo' : 'No Photo',
        isLink: !!photoFullUrl,
        linkUrl: photoFullUrl,
      },
      { text: activeStudent.name },
      { text: activeStudent.fatherName || activeStudent.guardianName || '' },
      { text: r.className },
      { text: r.date, isDate: true },
      { text: r.day },
      { text: r.status, isStatus: true },
    ]);

    const safeName = activeStudent.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    exportToExcelXls({
      sheetName: `${activeStudent.id}_Attendance`,
      title: `Nexus Academy — Official Attendance Log: ${activeStudent.name}`,
      subtitle: `Student ID: ${activeStudent.id} | Class: ${activeStudent.className || 'General'} | Guardian: ${activeStudent.fatherName || 'N/A'} | Total Records: ${attendanceHistory.length}`,
      columns,
      rows,
      filename: `${activeStudent.id}_${safeName}_attendance.xls`,
    });

    onNotification(`Excel attendance sheet exported for ${activeStudent.name}!`, 'success');
  };

  // Download Attendance CSV
  const handleDownloadCSV = () => {
    if (!activeStudent) return;
    if (attendanceHistory.length === 0) {
      onNotification(`No attendance records to export for ${activeStudent.name}.`, 'info');
      return;
    }

    const photoFullUrl = getFullPhotoUrl(activeStudent.photo);

    const rows = [
      [
        'Student ID',
        'Student Name',
        'Father / Guardian',
        'Class',
        'Attendance Date',
        'Day of Week',
        'Status',
        'Online Photo URL',
      ],
    ];

    attendanceHistory.forEach((r) => {
      rows.push([
        activeStudent.id,
        activeStudent.name,
        activeStudent.fatherName || activeStudent.guardianName || '',
        r.className,
        `="${r.date}"`,
        r.day,
        r.status,
        photoFullUrl,
      ]);
    });

    const csvContent =
      '\ufeff' +
      rows
        .map((row) =>
          row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
        )
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const safeName = activeStudent.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadBlob(blob, `${activeStudent.id}_${safeName}_attendance.csv`);

    onNotification(`Attendance CSV exported for ${activeStudent.name}!`, 'success');
  };

  const copyPhotoLink = (url: string) => {
    const full = getFullPhotoUrl(url);
    navigator.clipboard.writeText(full);
    setCopiedLink(true);
    onNotification('Online photo link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-wrap gap-3">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Contact className="w-5 h-5 text-blue-600" /> Student Profile, Analytics &amp; Records
        </h3>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search Student by Name, ID, or Father Name..."
          className="h-10 px-3.5 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 flex-1 max-w-md"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 transition cursor-pointer"
        >
          <Search className="w-4 h-4" /> Search Student
        </button>
      </div>

      {/* Student Profile Card */}
      {activeStudent ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Info Banner */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-4">
              <div
                className="relative group cursor-pointer shrink-0"
                onClick={() =>
                  setPreviewPhoto({
                    url: activeStudent.photo || '',
                    name: activeStudent.name,
                    id: activeStudent.id,
                  })
                }
              >
                {activeStudent.photo && !activeStudent.photo.includes('svg') ? (
                  <img
                    src={activeStudent.photo}
                    alt={activeStudent.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 shadow-sm group-hover:opacity-90 transition"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-xl font-bold text-slate-600 border-2 border-blue-600">
                    {activeStudent.name ? activeStudent.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <span
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full shadow hover:bg-blue-700"
                  title="Click to view photo"
                >
                  <Eye className="w-3 h-3" />
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900">{activeStudent.name}</h2>
                  {activeStudent.photo && (
                    <button
                      type="button"
                      onClick={() => copyPhotoLink(activeStudent.photo!)}
                      className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                      title="Copy online photo URL"
                    >
                      {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedLink ? 'Copied' : 'Photo URL'}
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-0.5">
                  Father: <strong className="text-slate-800">{activeStudent.fatherName}</strong> | ID:{' '}
                  <strong className="text-blue-600">{activeStudent.id}</strong> | Phone:{' '}
                  <span className="text-slate-700 font-medium">
                    {activeStudent.studentNumber || activeStudent.guardianNumber || 'N/A'}
                  </span>
                </p>

                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                    {activeStudent.className || 'No Class Assigned'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                    Monthly Fee: {currency} {(activeStudent.monthlyFee || 0).toLocaleString()}
                  </span>
                  {activeStudent.lastBilledMonth && (
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
                      Last Billed: {activeStudent.lastBilledMonth}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold">
                    Outstanding Dues: {currency} {(activeStudent.dues || 0).toLocaleString()}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    Total Paid: {currency} {(activeStudent.totalPaid || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="h-10 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
                title="Export native Excel file with full date strings & photo links"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" /> Export Excel (.xls)
              </button>

              <button
                type="button"
                onClick={handleDownloadCSV}
                className="h-10 px-3.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Download CSV"
              >
                <Download className="w-4 h-4 text-slate-300" /> CSV
              </button>
            </div>
          </div>

          {/* Academic Progress Visualization (Recharts) */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" /> Academic Test Score History Over Time
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visual progress chart tracking percentage marks across tests, helping teachers identify academic growth.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Score (%)
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-0.5 bg-red-400"></span> Passing Line (50%)
                </span>
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs">
                <BarChart3 className="w-8 h-8 text-slate-300 mb-1" />
                <span>No test scores recorded yet for {activeStudent.name}.</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Record test marks in the "Test Marks" tab to view academic progress charts.
                </span>
              </div>
            ) : (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      unit="%"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1 border border-slate-700">
                              <div className="font-bold text-sm text-blue-300">{data.fullName}</div>
                              <div className="text-slate-400">Date: {data.date}</div>
                              <div className="font-semibold">
                                Marks: <span className="text-emerald-400">{data.score}</span> ({data.percentage}%)
                              </div>
                              <div className="pt-1">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    data.isPass ? 'bg-emerald-800 text-emerald-200' : 'bg-red-800 text-red-200'
                                  }`}
                                >
                                  {data.isPass ? 'PASSED' : 'FAILED'}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Passing', fill: '#ef4444', fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="percentage"
                      stroke="#2563eb"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#scoreColor)"
                      dot={{ r: 5, stroke: '#1d4ed8', strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 7, stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* History Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance History */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> Attendance History Log ({attendanceHistory.length})
                </h4>
                {attendanceHistory.length > 0 && (
                  <button
                    onClick={handleDownloadExcel}
                    className="text-xs text-emerald-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export Sheet
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Day</th>
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          No attendance records found for this student.
                        </td>
                      </tr>
                    ) : (
                      attendanceHistory.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-800">{r.date}</td>
                          <td className="py-2 px-3 text-slate-500">{r.day}</td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-[130px]">
                            {r.className}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                r.status === 'Present'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'Absent'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Test History */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" /> Academic Test History ({testHistory.length})
              </h4>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Test Title</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3">Percentage</th>
                      <th className="py-2.5 px-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {testHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No test scores recorded for this student.
                        </td>
                      </tr>
                    ) : (
                      testHistory.map((t, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-500">{t.date}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{t.testName}</td>
                          <td className="py-2 px-3 font-semibold text-slate-700">
                            {t.achieved} / {t.totalMarks}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-600">
                            {t.percentage}%
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.isPass
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {t.isPass ? 'Passed' : 'Failed'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Search for any student above or click a student from the global search bar to view their complete dossier.
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Contact className="w-4 h-4 text-blue-600" /> {previewPhoto.name} ({previewPhoto.id})
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
                  className="w-56 h-56 object-cover rounded-xl border border-slate-200 shadow-md"
                />
              ) : (
                <div className="w-56 h-56 bg-slate-100 rounded-xl flex items-center justify-center text-4xl font-bold text-slate-400 border border-slate-200">
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

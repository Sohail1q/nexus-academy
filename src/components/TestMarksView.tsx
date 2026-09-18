import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Save,
  FileSpreadsheet,
  Award,
  Users,
} from 'lucide-react';
import { NexusStudent, NexusClass, NexusTestMarkRecord } from '../types';
import { exportToExcelXls } from '../services/cloudSync';

interface TestMarksViewProps {
  students: NexusStudent[];
  classes: NexusClass[];
  testMarks: Record<string, Record<string, NexusTestMarkRecord[]>>;
  onSaveTestMarks: (
    testKey: string,
    className: string,
    records: NexusTestMarkRecord[]
  ) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TestMarksView: React.FC<TestMarksViewProps> = ({
  students,
  classes,
  testMarks,
  onSaveTestMarks,
  onNotification,
}) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [testName, setTestName] = useState('Monthly Evaluation Exam');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [marksMap, setMarksMap] = useState<Record<string, number>>({});

  // Auto-select first class
  useEffect(() => {
    if (!selectedClass && classes.length > 0) {
      const first = classes[0];
      setSelectedClass(`${first.teacher} | ${first.category} - ${first.className} (${first.startTime} to ${first.endTime})`);
    }
  }, [classes, selectedClass]);

  const enrolledStudents = students.filter((s) => s.className === selectedClass);
  const testKey = `${testDate}_${testName.trim().replace(/\s+/g, '_')}`;

  // Load existing marks if available for this testKey & class
  useEffect(() => {
    if (!selectedClass) {
      setMarksMap({});
      return;
    }

    const existingRecords = testMarks[testKey]?.[selectedClass] || [];
    const newMap: Record<string, number> = {};

    enrolledStudents.forEach((s) => {
      const found = existingRecords.find((r) => r.studentId === s.id);
      newMap[s.id] = found ? found.marksObtained : 0;
    });

    setMarksMap(newMap);
  }, [selectedClass, testKey, students, testMarks]);

  const handleMarkChange = (studentId: string, val: number) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: Math.min(maxMarks, Math.max(0, val)),
    }));
  };

  const handleSave = () => {
    if (!selectedClass) {
      onNotification('Please select a class first.', 'error');
      return;
    }

    if (enrolledStudents.length === 0) {
      onNotification('No students enrolled in this class to record marks.', 'error');
      return;
    }

    const records: NexusTestMarkRecord[] = enrolledStudents.map((s) => {
      const obt = marksMap[s.id] || 0;
      const pct = maxMarks > 0 ? Math.round((obt / maxMarks) * 100) : 0;
      return {
        studentId: s.id,
        testName: testName.trim(),
        date: testDate,
        maxMarks: maxMarks,
        marksObtained: obt,
        percentage: pct,
      };
    });

    onSaveTestMarks(testKey, selectedClass, records);
    onNotification(`Saved test marks for ${records.length} student(s)!`, 'success');
  };

  const getFullPhotoUrl = (photoPath?: string) => {
    if (!photoPath) return '';
    if (photoPath.startsWith('http')) return photoPath;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
  };

  const handleExportExcel = () => {
    if (!selectedClass || enrolledStudents.length === 0) {
      onNotification('No student records to export for this test.', 'info');
      return;
    }

    const columns = [
      { header: 'Student ID', width: 90 },
      { header: 'Photo Link', width: 110 },
      { header: 'Student Name', width: 130 },
      { header: 'Father Name', width: 130 },
      { header: 'Test Name', width: 150 },
      { header: 'Date', width: 110 },
      { header: 'Total Marks', width: 100 },
      { header: 'Marks Obtained', width: 120 },
      { header: 'Percentage', width: 110 },
      { header: 'Result Status', width: 110 },
    ];

    const rows = enrolledStudents.map((s) => {
      const obt = marksMap[s.id] || 0;
      const pct = maxMarks > 0 ? Math.round((obt / maxMarks) * 100) : 0;
      const pass = pct >= 40;
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
        { text: testName },
        { text: testDate, isDate: true },
        { text: maxMarks },
        { text: obt },
        { text: `${pct}%` },
        { text: pass ? 'PASSED' : 'FAILED', isStatus: !pass },
      ];
    });

    const safeTest = testName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 20);
    exportToExcelXls({
      sheetName: 'Test_Marks',
      title: `Nexus Academy — Test Score Sheet: ${testName} (${testDate})`,
      subtitle: `Class: ${selectedClass} | Max Marks: ${maxMarks}`,
      columns,
      rows,
      filename: `TestMarks_${safeTest}_${testDate}.xls`,
    });

    onNotification('Exported test marks sheet to Excel (.xls)!', 'success');
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-wrap gap-3">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" /> Test Score Evaluation &amp; Grading
        </h3>

        {selectedClass && enrolledStudents.length > 0 && (
          <button
            type="button"
            onClick={handleExportExcel}
            className="h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" /> Export Sheet to Excel (.xls)
          </button>
        )}
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            Select Class <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
          >
            <option value="">-- Select Class --</option>
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
            Test Title / Exam Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            Test Date
          </label>
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            Total / Max Marks
          </label>
          <input
            type="number"
            min={1}
            value={maxMarks}
            onChange={(e) => setMaxMarks(parseFloat(e.target.value) || 100)}
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Marks Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
              <th className="py-2.5 px-3">ID #</th>
              <th className="py-2.5 px-3">Photo</th>
              <th className="py-2.5 px-3">Student Name</th>
              <th className="py-2.5 px-3">Father Name</th>
              <th className="py-2.5 px-3">Marks Obtained (Max: {maxMarks})</th>
              <th className="py-2.5 px-3">Percentage</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!selectedClass ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Please select a class above to load enrolled students.
                </td>
              </tr>
            ) : enrolledStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No students are enrolled in this class yet.
                </td>
              </tr>
            ) : (
              enrolledStudents.map((s) => {
                const obt = marksMap[s.id] ?? 0;
                const pct = maxMarks > 0 ? Math.round((obt / maxMarks) * 100) : 0;
                const pass = pct >= 40;

                return (
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
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {s.name ? s.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.fatherName || s.guardianName}</td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min={0}
                        max={maxMarks}
                        value={obt}
                        onChange={(e) =>
                          handleMarkChange(s.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-24 h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{pct}%</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                          pass
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {pass ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Save Button */}
      {selectedClass && enrolledStudents.length > 0 && (
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSave}
            className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Test Marks Record
          </button>
        </div>
      )}
    </div>
  );
};

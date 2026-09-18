import React, { useState } from 'react';
import {
  Users,
  Search,
  FileSpreadsheet,
  Trash2,
  Coins,
  Edit2,
  ExternalLink,
  Eye,
  Filter,
  ReceiptText,
} from 'lucide-react';
import { NexusStudent, NexusClass } from '../types';
import { exportToExcelXls } from '../services/cloudSync';

interface DirectoryViewProps {
  students: NexusStudent[];
  classes: NexusClass[];
  currency?: string;
  onSelectStudent: (student: NexusStudent) => void;
  onEditStudent: (student: NexusStudent) => void;
  onAddFee: (student: NexusStudent) => void;
  onOpenReceipt: (student: NexusStudent) => void;
  onDeleteStudent: (id: string) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  students,
  classes,
  currency = 'PKR',
  onSelectStudent,
  onEditStudent,
  onAddFee,
  onOpenReceipt,
  onDeleteStudent,
  onNotification,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(term) ||
      s.id.toLowerCase().includes(term) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(term)) ||
      (s.className && s.className.toLowerCase().includes(term));

    const matchClass = filterClass ? s.className === filterClass : true;
    return matchSearch && matchClass;
  });

  const getFullPhotoUrl = (photoPath?: string) => {
    if (!photoPath) return '';
    if (photoPath.startsWith('http')) return photoPath;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
  };

  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      onNotification('No student records found to export.', 'info');
      return;
    }

    const columns = [
      { header: 'Student ID', width: 90 },
      { header: 'Photo Link', width: 110 },
      { header: 'Student Name', width: 130 },
      { header: 'Father Name', width: 130 },
      { header: 'Guardian Phone', width: 120 },
      { header: 'Student Phone', width: 120 },
      { header: 'Email', width: 150 },
      { header: 'Class Name', width: 180 },
      { header: 'Monthly Fee', width: 100 },
      { header: 'Outstanding Dues', width: 110 },
      { header: 'Total Paid', width: 100 },
    ];

    const rows = filteredStudents.map((s) => {
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
        { text: s.guardianNumber || '' },
        { text: s.studentNumber || '' },
        { text: s.gmail || '' },
        { text: s.className || 'Unassigned' },
        { text: `${currency} ${(s.monthlyFee || 0).toLocaleString()}` },
        { text: `${currency} ${(s.dues || 0).toLocaleString()}`, isStatus: (s.dues || 0) > 0 },
        { text: `${currency} ${(s.totalPaid || 0).toLocaleString()}` },
      ];
    });

    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcelXls({
      sheetName: 'Students_Directory',
      title: 'Nexus Academy — Complete Student Records Directory',
      subtitle: `Exported: ${dateStr} | Total Enrolled: ${filteredStudents.length} students`,
      columns,
      rows,
      filename: `Students_Directory_${dateStr}.xls`,
    });

    onNotification(`Exported ${filteredStudents.length} student records to Excel (.xls)!`, 'success');
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Student Directory &amp; Academic Profiles
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            View all admitted students, examine academic progress charts, or collect tuition fees.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-200" /> Export All to Excel (.xls)
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, ID number, or father name..."
            className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm outline-none focus:border-blue-600"
          >
            <option value="">-- All Classes --</option>
            {classes.map((c, idx) => {
              const displayStr = `${c.teacher} | ${c.category} - ${c.className} (${c.startTime} to ${c.endTime})`;
              return (
                <option key={idx} value={displayStr}>
                  {c.category} - {c.className} ({c.teacher})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
              <th className="py-2.5 px-3">ID #</th>
              <th className="py-2.5 px-3">Photo</th>
              <th className="py-2.5 px-3">Student Name</th>
              <th className="py-2.5 px-3">Father Name</th>
              <th className="py-2.5 px-3">Class Option</th>
              <th className="py-2.5 px-3">Monthly Fee</th>
              <th className="py-2.5 px-3">Dues</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No students matching your search criteria.
                </td>
              </tr>
            ) : (
              filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-3 font-semibold text-blue-600">{s.id}</td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => onSelectStudent(s)}
                      className="cursor-pointer group relative inline-block"
                      title="Click to view full student profile & charts"
                    >
                      {s.photo && !s.photo.includes('svg') ? (
                        <img
                          src={s.photo}
                          alt={s.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 group-hover:ring-2 group-hover:ring-blue-500"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 group-hover:ring-2 group-hover:ring-blue-500">
                          {s.name ? s.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    <button
                      onClick={() => onSelectStudent(s)}
                      className="hover:text-blue-600 hover:underline cursor-pointer text-left font-bold"
                    >
                      {s.name}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{s.fatherName || s.guardianName}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-800 max-w-[180px] truncate">
                      {s.className || 'Unassigned'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    {currency} {(s.monthlyFee || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    {(s.dues || 0) > 0 ? (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">
                        {currency} {s.dues.toLocaleString()}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                        Cleared
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectStudent(s)}
                      className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                      title="View Profile & Academic Progress Chart"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(s)}
                      className="p-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                      title="View Current Fee Receipt"
                    >
                      <ReceiptText className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddFee(s)}
                      className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                      title="Receive Fee Payment"
                    >
                      <Coins className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditStudent(s)}
                      className="p-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                      title="Edit Student Information"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete student "${s.name}" (${s.id})?`)) {
                          onDeleteStudent(s.id);
                        }
                      }}
                      className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer"
                      title="Delete Student Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

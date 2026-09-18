import React, { useState } from 'react';
import { UserPlus, Camera, CheckCircle } from 'lucide-react';
import { NexusStudent } from '../types';
import { fileToDataURL } from '../services/cloudSync';

interface RegistrationViewProps {
  students: NexusStudent[];
  onRegisterStudent: (newStudent: NexusStudent) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const RegistrationView: React.FC<RegistrationViewProps> = ({
  students,
  onRegisterStudent,
  onNotification,
}) => {
  const [photoData, setPhotoData] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [guardianName, setGuardianName] = useState<string>('');
  const [guardianNumber, setGuardianNumber] = useState<string>('');
  const [studentNumber, setStudentNumber] = useState<string>('');
  const [gmail, setGmail] = useState<string>('');

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await fileToDataURL(file);
        setPhotoData(dataUrl);
      } catch {
        onNotification('Could not read selected photo file', 'error');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let id = studentId.trim();
    if (!id) {
      id = 'NEX-' + Math.floor(1000 + Math.random() * 9000);
    }

    // Check duplicate ID
    if (students.some((s) => s.id.toLowerCase() === id.toLowerCase())) {
      onNotification(
        `Student ID "${id}" already exists. Please choose a unique ID or leave blank to auto-generate.`,
        'error'
      );
      return;
    }

    const defaultPhoto =
      "data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'><rect width='140' height='140' rx='16' fill='%23e2e8f0'/><circle cx='70' cy='52' r='24' fill='%2394a3b8'/><path d='M28 124c5-29 21-44 42-44s37 15 42 44' fill='%2394a3b8'/></svg>";

    const newStudent: NexusStudent = {
      id,
      name: studentName.trim(),
      fatherName: guardianName.trim(),
      guardianName: guardianName.trim(),
      guardianNumber: guardianNumber.trim(),
      studentNumber: studentNumber.trim(),
      gmail: gmail.trim(),
      photo: photoData || defaultPhoto,
      className: '',
      admissionDate: new Date().toISOString().split('T')[0],
      registeredAt: new Date().toISOString(),
      monthlyFee: 0,
      admissionFee: 0,
      dues: 0,
      totalPaid: 0,
    };

    onRegisterStudent(newStudent);

    // Reset Form
    setPhotoData('');
    setStudentId('');
    setStudentName('');
    setGuardianName('');
    setGuardianNumber('');
    setStudentNumber('');
    setGmail('');

    onNotification(`Student ${newStudent.name} registered with ID ${newStudent.id}!`, 'success');
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-600" /> New Student Registration &amp; Contact Information
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload Box */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300">
          <div className="relative shrink-0">
            {photoData ? (
              <img
                src={photoData}
                alt="Student preview"
                className="w-18 h-18 rounded-xl object-cover border-2 border-blue-500 shadow-sm"
              />
            ) : (
              <div className="w-18 h-18 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 border border-slate-300">
                <Camera className="w-8 h-8 text-slate-400" />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Student Photograph
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">PNG, JPG or WebP images up to 5MB.</p>
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Student ID Number (Leave empty for auto-generation)
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. NEX-1045 or blank"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Student Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Student Full Name"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Guardian / Father Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Guardian Name"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Guardian Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={guardianNumber}
              onChange={(e) => setGuardianNumber(e.target.value)}
              placeholder="03XXXXXXXXX"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Student Mobile Number
            </label>
            <input
              type="tel"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder="03XXXXXXXXX"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Email / Gmail Address
            </label>
            <input
              type="email"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              placeholder="student@gmail.com"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" /> Register Student Record
          </button>
        </div>
      </form>
    </div>
  );
};

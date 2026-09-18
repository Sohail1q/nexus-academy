import React, { useState } from 'react';
import { Edit2, X, Check, Camera } from 'lucide-react';
import { NexusStudent, NexusClass } from '../types';
import { fileToDataURL } from '../services/cloudSync';

interface EditStudentModalProps {
  student: NexusStudent | null;
  classes: NexusClass[];
  currency?: string;
  onClose: () => void;
  onSave: (updated: NexusStudent) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  student,
  classes,
  currency = 'PKR',
  onClose,
  onSave,
}) => {
  if (!student) return null;

  const [name, setName] = useState(student.name || '');
  const [fatherName, setFatherName] = useState(student.fatherName || student.guardianName || '');
  const [guardianNumber, setGuardianNumber] = useState(student.guardianNumber || '');
  const [studentNumber, setStudentNumber] = useState(student.studentNumber || '');
  const [gmail, setGmail] = useState(student.gmail || '');
  const [className, setClassName] = useState(student.className || '');
  const [monthlyFee, setMonthlyFee] = useState<number>(student.monthlyFee || 0);
  const [dues, setDues] = useState<number>(student.dues || 0);
  const [photo, setPhoto] = useState<string>(student.photo || '');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await fileToDataURL(file);
        setPhoto(url);
      } catch (err) {
        console.error('Could not read photo file', err);
      }
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setClassName(selected);
    const matched = classes.find(
      (c) =>
        `${c.teacher} | ${c.category} - ${c.className} (${c.startTime} to ${c.endTime})` ===
        selected
    );
    if (matched) {
      setMonthlyFee(matched.monthlyFee);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: NexusStudent = {
      ...student,
      name: name.trim(),
      fatherName: fatherName.trim(),
      guardianName: fatherName.trim(),
      guardianNumber: guardianNumber.trim(),
      studentNumber: studentNumber.trim(),
      gmail: gmail.trim(),
      className: className.trim(),
      monthlyFee: Number(monthlyFee) || 0,
      dues: Number(dues) || 0,
      photo: photo,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-blue-600" /> Edit Student Record ({student.id})
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Photo & Basic Info */}
          <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            {photo && !photo.includes('svg') ? (
              <img
                src={photo}
                alt={name}
                className="w-14 h-14 rounded-full object-cover border border-slate-300 shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-lg font-bold text-slate-600">
                {name.charAt(0) || '?'}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Change Photograph
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Student Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Father / Guardian Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Guardian Phone Number
              </label>
              <input
                type="tel"
                value={guardianNumber}
                onChange={(e) => setGuardianNumber(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Student Phone Number
              </label>
              <input
                type="tel"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Email / Gmail
              </label>
              <input
                type="email"
                value={gmail}
                onChange={(e) => setGmail(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Enrolled Class
              </label>
              <select
                value={className}
                onChange={handleClassChange}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm outline-none focus:border-blue-600"
              >
                <option value="">-- None / Unassigned --</option>
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
                Monthly Fee ({currency})
              </label>
              <input
                type="number"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Outstanding Dues ({currency})
              </label>
              <input
                type="number"
                value={dues}
                onChange={(e) => setDues(parseFloat(e.target.value) || 0)}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs sm:text-sm text-red-600 font-bold outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

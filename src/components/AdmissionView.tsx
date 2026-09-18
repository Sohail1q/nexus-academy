import React, { useMemo, useState } from 'react';
import { BadgeCheck, CloudDownload, CheckCircle, ArrowRightLeft, X } from 'lucide-react';
import { NexusStudent, NexusClass, ReceiptData } from '../types';

interface AdmissionViewProps {
  students: NexusStudent[];
  classes: NexusClass[];
  currency?: string;
  onAdmitStudent?: (updatedStudent: NexusStudent, receiptData: ReceiptData) => void;
  onSaveAdmission?: (updatedStudent: NexusStudent, receiptData: ReceiptData) => void;
  onTransferStudent?: (updatedStudent: NexusStudent, receiptData?: ReceiptData, message?: string) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const classValue = (c: NexusClass) => `${c.teacher} | ${c.category} - ${c.className} (${c.startTime} to ${c.endTime})`;
const makeReceiptNo = () => 'REC-' + Math.floor(100000 + Math.random() * 900000);

export const AdmissionView: React.FC<AdmissionViewProps> = ({
  students, classes, currency = 'PKR', onAdmitStudent, onSaveAdmission, onTransferStudent, onNotification,
}) => {
  const [fetchId, setFetchId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<NexusStudent | null>(null);
  const [selectedClassStr, setSelectedClassStr] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferClass, setTransferClass] = useState('');
  const [chargeTransferFee, setChargeTransferFee] = useState(false);

  const selectedClass = useMemo(() => classes.find(c => classValue(c) === selectedClassStr), [classes, selectedClassStr]);
  const transferTarget = useMemo(() => classes.find(c => classValue(c) === transferClass), [classes, transferClass]);

  const handleFetch = () => {
    const found = students.find(s => s.id.toLowerCase() === fetchId.trim().toLowerCase());
    if (!found) {
      onNotification(`Student ID "${fetchId.trim()}" not found. Please register the student first.`, 'error');
      return;
    }
    setSelectedStudent(found);
    setSelectedClassStr(found.className || '');
    setPaidAmount(0);
    onNotification(`Found records for ${found.name}.`, 'success');
  };

  const reset = () => {
    setFetchId(''); setSelectedStudent(null); setSelectedClassStr(''); setPaidAmount(0);
    setShowTransfer(false); setTransferClass(''); setChargeTransferFee(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedClassStr || !selectedClass) {
      onNotification('Fetch a student and select a valid class first.', 'error'); return;
    }
    if (selectedStudent.className && selectedStudent.className !== selectedClassStr) {
      setTransferClass(selectedClassStr);
      setShowTransfer(true);
      return;
    }
    if (selectedStudent.className === selectedClassStr) {
      onNotification('This student is already admitted in this class.', 'info'); return;
    }

    const prevDues = selectedStudent.dues || 0;
    const totalRequired = selectedClass.monthlyFee + selectedClass.admissionFee + prevDues;
    const remainingDues = Math.max(0, totalRequired - paidAmount);
    const month = admissionDate.substring(0, 7);
    const updated: NexusStudent = {
      ...selectedStudent,
      className: selectedClassStr,
      monthlyFee: selectedClass.monthlyFee,
      admissionFee: selectedClass.admissionFee,
      dues: remainingDues,
      totalPaid: (selectedStudent.totalPaid || 0) + paidAmount,
      admissionDate: selectedStudent.admissionDate || admissionDate,
      lastAdmissionDate: admissionDate,
      lastBilledMonth: month,
      feeMonthsBilled: Array.from(new Set([...(selectedStudent.feeMonthsBilled || []), month])),
    };
    const receipt: ReceiptData = {
      receiptNo: makeReceiptNo(), date: admissionDate, studentId: updated.id, studentName: updated.name,
      fatherName: updated.fatherName || updated.guardianName || '', className: selectedClassStr,
      monthlyFee: selectedClass.monthlyFee, admissionFee: selectedClass.admissionFee, prevDues,
      paidAmount, remainingDues, studentPhoto: updated.photo,
    };
    (onAdmitStudent || onSaveAdmission)?.(updated, receipt);
    onNotification('Student admission recorded and receipt generated.', 'success');
    reset();
  };

  const confirmTransfer = () => {
    if (!selectedStudent || !transferTarget || !transferClass) return;
    const previousClass = selectedStudent.className || 'Unassigned';
    const prevDues = selectedStudent.dues || 0;
    const transferCharge = chargeTransferFee ? transferTarget.monthlyFee : 0;
    const newDues = prevDues + transferCharge;
    const currentMonth = admissionDate.substring(0, 7);

    // The old class stops billing immediately. The new class becomes the only future monthly fee source.
    const updated: NexusStudent = {
      ...selectedStudent,
      className: transferClass,
      monthlyFee: transferTarget.monthlyFee,
      admissionFee: transferTarget.admissionFee,
      dues: newDues,
      lastAdmissionDate: admissionDate,
      lastBilledMonth: chargeTransferFee ? currentMonth : selectedStudent.lastBilledMonth,
      feeMonthsBilled: chargeTransferFee
        ? Array.from(new Set([...(selectedStudent.feeMonthsBilled || []), currentMonth]))
        : selectedStudent.feeMonthsBilled,
    };

    const receipt = chargeTransferFee ? {
      receiptNo: makeReceiptNo(), date: admissionDate, studentId: updated.id, studentName: updated.name,
      fatherName: updated.fatherName || updated.guardianName || '', className: transferClass,
      monthlyFee: transferTarget.monthlyFee, admissionFee: 0, prevDues, paidAmount: 0,
      remainingDues: newDues, studentPhoto: updated.photo,
      note: `Class transfer from ${previousClass} to ${transferClass}; new class monthly fee charged on transfer.`,
    } as ReceiptData : undefined;

    onTransferStudent?.(updated, receipt, `${updated.name} transferred successfully. Future monthly billing now uses ${currency} ${transferTarget.monthlyFee.toLocaleString()} for the new class.`);
    reset();
  };

  const monthlyFee = selectedClass?.monthlyFee || 0;
  const admissionFee = selectedClass?.admissionFee || 0;
  const prevDues = selectedStudent?.dues || 0;
  const remainingDues = Math.max(0, monthlyFee + admissionFee + prevDues - paidAmount);

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-blue-600" /> Student Admission &amp; Course Enrollment</h3>
      </div>
      <div className="bg-slate-100 p-3.5 rounded-lg mb-6 flex items-center gap-3 flex-wrap">
        <input value={fetchId} onChange={e=>setFetchId(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleFetch()} placeholder="Type Student ID Number to Fetch Data..." className="h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600 flex-1 min-w-[240px]" />
        <button type="button" onClick={handleFetch} className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md inline-flex items-center gap-2"><CloudDownload className="w-4 h-4"/> Fetch Data</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Student ID" value={selectedStudent?.id || ''} />
          <Field label="Student Name" value={selectedStudent?.name || ''} />
          <Field label="Father / Guardian" value={selectedStudent?.fatherName || selectedStudent?.guardianName || ''} />
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">Admission / Transfer Date</label><input type="date" value={admissionDate} onChange={e=>setAdmissionDate(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm" /></div>
          <div className="md:col-span-2"><label className="text-xs font-semibold text-slate-600 block mb-1">Class</label><select value={selectedClassStr} onChange={e=>setSelectedClassStr(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm"><option value="">-- Select Class --</option>{classes.map((c,i)=><option key={i} value={classValue(c)}>{c.category} - {c.className} | {c.teacher} | {c.startTime}-{c.endTime}</option>)}</select></div>
          <Field label={`Monthly Fee (${currency})`} value={monthlyFee ? monthlyFee.toLocaleString() : ''} />
          <Field label={`Admission Fee (${currency})`} value={admissionFee ? admissionFee.toLocaleString() : ''} />
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">Paid Amount Now ({currency})</label><input type="number" min={0} value={paidAmount || ''} onChange={e=>setPaidAmount(Number(e.target.value)||0)} className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm font-semibold text-emerald-700" /></div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><span className="text-xs text-slate-500">Calculated Remaining Dues</span><div className="text-lg font-bold text-red-600">{currency} {remainingDues.toLocaleString()}</div></div>
        </div>
        <div className="flex justify-end pt-3 border-t border-slate-100"><button type="submit" className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md inline-flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Admit Student</button></div>
      </form>

      {showTransfer && selectedStudent && transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b"><h3 className="font-bold text-slate-900 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-blue-600"/> Student Already Admitted — Transfer?</h3><button onClick={()=>setShowTransfer(false)}><X className="w-5 h-5 text-slate-500"/></button></div>
            <div className="p-5 space-y-4 text-sm">
              <p className="text-slate-700"><strong>{selectedStudent.name}</strong> is already admitted in another class. Choose the demanded class below, then Transfer or Cancel.</p>
              <div className="p-3 bg-slate-50 border rounded-lg text-xs"><div><strong>Current:</strong> {selectedStudent.className}</div><div className="mt-1"><strong>New:</strong> {transferClass}</div></div>
              <select value={transferClass} onChange={e=>setTransferClass(e.target.value)} className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm">{classes.filter(c=>classValue(c)!==selectedStudent.className).map((c,i)=><option key={i} value={classValue(c)}>{c.category} - {c.className} | {currency} {c.monthlyFee.toLocaleString()}/month</option>)}</select>
              <div className="grid grid-cols-2 gap-3"><Field label="New Monthly Fee" value={`${currency} ${transferTarget.monthlyFee.toLocaleString()}`} /><Field label="Admission Fee" value={`${currency} ${transferTarget.admissionFee.toLocaleString()}`} /></div>
              <label className="flex items-start gap-3 p-3 border border-blue-200 bg-blue-50/50 rounded-lg cursor-pointer"><input type="checkbox" checked={chargeTransferFee} onChange={e=>setChargeTransferFee(e.target.checked)} className="mt-0.5"/><span className="text-xs text-slate-700"><strong>Charge the new class fee now</strong><br/>If unchecked, no transfer fee is added now. Future automatic monthly billing will use only the new class fee.</span></label>
            </div>
            <div className="p-4 border-t flex justify-end gap-2"><button onClick={()=>setShowTransfer(false)} className="h-10 px-4 bg-slate-100 rounded-lg text-xs font-semibold">Cancel</button><button onClick={confirmTransfer} className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-2"><ArrowRightLeft className="w-4 h-4"/> Transfer Student</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({label, value}:{label:string; value:string}) => <div><label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label><input readOnly value={value} className="w-full h-10 px-3 bg-slate-100 border border-slate-300 rounded-md text-sm text-slate-700 font-semibold" /></div>;

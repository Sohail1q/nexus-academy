import React, { useState } from 'react';
import { Coins, X, Check } from 'lucide-react';
import { NexusStudent, ReceiptData } from '../types';

interface AddFeeModalProps {
  student: NexusStudent | null;
  currency?: string;
  onClose: () => void;
  onSubmitFee: (student: NexusStudent, receiptData?: ReceiptData, message?: string) => void;
}

export const AddFeeModal: React.FC<AddFeeModalProps> = ({ student, currency='PKR', onClose, onSubmitFee }) => {
  if (!student) return null;
  const [payAmount, setPayAmount] = useState<number>(student.dues > 0 ? student.dues : 0);
  const oldDues = student.dues || 0;
  const newDues = Math.max(0, oldDues - (payAmount || 0));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) return;
    const updated = { ...student, dues: newDues, totalPaid: (student.totalPaid || 0) + payAmount };
    const receipt: ReceiptData = {
      receiptNo: 'REC-' + Math.floor(100000 + Math.random() * 900000), date: new Date().toISOString().split('T')[0],
      studentId: student.id, studentName: student.name, fatherName: student.fatherName || student.guardianName || '',
      className: student.className || 'General Tuition', monthlyFee: student.monthlyFee || 0, admissionFee: 0,
      prevDues: oldDues, paidAmount: payAmount, remainingDues: newDues, studentPhoto: student.photo,
    };
    onSubmitFee(updated, receipt, `Payment of ${currency} ${payAmount.toLocaleString()} recorded for ${student.name}.`);
    onClose();
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"><div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden"><div className="flex items-center justify-between p-5 border-b"><h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><Coins className="w-5 h-5 text-emerald-600"/> Receive Fee Payment</h3><button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button></div><form onSubmit={handleSubmit} className="p-5 space-y-4"><input readOnly value={`${student.name} (${student.id}) — ${student.className || 'General'}`} className="w-full h-10 px-3 bg-slate-100 border rounded-md text-xs font-bold"/><div className="grid grid-cols-2 gap-3"><Info label="Monthly Fee" value={`${currency} ${(student.monthlyFee||0).toLocaleString()}`}/><Info label="Current Dues" value={`${currency} ${oldDues.toLocaleString()}`}/></div><div><label className="text-xs font-semibold text-slate-700 block mb-1">Payment Amount Received ({currency})</label><input type="number" min={1} value={payAmount||''} onChange={e=>setPayAmount(Number(e.target.value)||0)} className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm font-bold text-emerald-700" required autoFocus/></div><div className="bg-slate-50 p-3 rounded-lg border text-xs flex justify-between"><span>Updated Remaining Dues:</span><strong className={newDues>0?'text-red-600':'text-emerald-600'}>{currency} {newDues.toLocaleString()}</strong></div><p className="text-[11px] text-slate-500">Monthly tuition charges are added automatically by the system. Manual monthly-fee charging has been removed.</p><div className="flex justify-end gap-2 pt-3 border-t"><button type="button" onClick={onClose} className="h-10 px-4 bg-slate-100 rounded-lg text-xs font-semibold">Cancel</button><button type="submit" className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"><Check className="w-4 h-4"/> Receive &amp; Generate Receipt</button></div></form></div></div>;
};
const Info=({label,value}:{label:string;value:string})=><div><label className="text-[11px] font-semibold text-slate-500 block mb-1">{label}</label><div className="h-9 px-3 bg-slate-50 border rounded-md text-xs font-semibold flex items-center">{value}</div></div>;

import React, { useEffect, useState } from 'react';
import { Coins, FileSpreadsheet, CheckCircle2, AlertTriangle, Search, Clock, ShieldCheck } from 'lucide-react';
import { NexusStudent, NexusClass } from '../types';
import { exportToExcelXls } from '../services/cloudSync';
import { getPakistanTime, getStudentBillingStatus, formatYearMonth } from '../services/feeAutomation';

interface DuesViewProps {
  students: NexusStudent[];
  classes: NexusClass[];
  currency?: string;
  onAddFee: (student: NexusStudent) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DuesView: React.FC<DuesViewProps> = ({ students, classes, currency='PKR', onAddFee, onNotification }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'outstanding'|'month_cycle'>('outstanding');
  const [pkt, setPkt] = useState(getPakistanTime());
  useEffect(()=>{ const t=setInterval(()=>setPkt(getPakistanTime()),1000); return()=>clearInterval(t); },[]);

  const duesStudents = students.filter(s => (s.dues||0)>0);
  const filteredDues = duesStudents.filter(s => {
    const q=searchTerm.toLowerCase();
    return (!filterClass || s.className===filterClass) && (s.name.toLowerCase().includes(q)||s.id.toLowerCase().includes(q)||(s.fatherName||'').toLowerCase().includes(q));
  });
  const enrolled = students.filter(s=>!!s.className && (s.monthlyFee||0)>0);
  const billing = enrolled.map(student=>({student,status:getStudentBillingStatus(student,pkt.yearMonth)}));
  const totalOutstanding=duesStudents.reduce((a,s)=>a+(s.dues||0),0);

  const exportExcel=()=>{
    if(!filteredDues.length){ onNotification('No outstanding dues records to export.','info'); return; }
    exportToExcelXls({
      sheetName:'Outstanding_Dues', title:'Nexus Academy — Outstanding Tuition Dues Report',
      subtitle:`Total Outstanding: ${currency} ${totalOutstanding.toLocaleString()}`,
      columns:[{header:'Student ID',width:90},{header:'Student Name',width:140},{header:'Father Name',width:140},{header:'Class',width:200},{header:'Monthly Fee',width:100},{header:'Outstanding Dues',width:120}],
      rows:filteredDues.map(s=>[{text:s.id},{text:s.name},{text:s.fatherName||s.guardianName||''},{text:s.className||'Unassigned'},{text:`${currency} ${(s.monthlyFee||0).toLocaleString()}`},{text:`${currency} ${(s.dues||0).toLocaleString()}`,isStatus:true}]),
      filename:`Tuition_Dues_Report_${new Date().toISOString().split('T')[0]}.xls`,
    });
    onNotification('Dues report exported.','success');
  };

  return <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
    <div className="pb-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
      <div><h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Coins className="w-5 h-5 text-amber-500"/> Tuition Fees &amp; Automatic Monthly Cycle</h3><p className="text-xs text-slate-500 mt-0.5">Monthly tuition is added automatically according to the active class and billing month.</p></div>
      <div className="flex gap-2 flex-wrap"><div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs"><Clock className="w-3.5 h-3.5 text-emerald-400"/><strong>{pkt.timeString}</strong><span className="text-slate-400">PKT</span></div><button onClick={exportExcel} className="h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4"/> Export Excel</button></div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><Card label="Outstanding Students" value={String(duesStudents.length)}/><Card label="Total Outstanding" value={`${currency} ${totalOutstanding.toLocaleString()}`}/><Card label="Billing Month" value={pkt.monthYearName}/></div>

    <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-lg text-xs font-bold"><button onClick={()=>setActiveSubTab('outstanding')} className={`py-2 rounded-md ${activeSubTab==='outstanding'?'bg-white shadow-sm text-red-700':'text-slate-500'}`}>Outstanding Dues</button><button onClick={()=>setActiveSubTab('month_cycle')} className={`py-2 rounded-md ${activeSubTab==='month_cycle'?'bg-white shadow-sm text-blue-700':'text-slate-500'}`}>Automatic Billing Status</button></div>

    {activeSubTab==='outstanding' ? <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border"><div className="sm:col-span-2 relative"><Search className="w-4 h-4 absolute left-3 top-3 text-slate-400"/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search student name, ID, father name..." className="w-full h-10 pl-9 pr-3 border rounded-lg text-sm"/></div><select value={filterClass} onChange={e=>setFilterClass(e.target.value)} className="h-10 px-3 border rounded-lg text-xs"><option value="">-- All Classes --</option>{classes.map((c,i)=>{const v=`${c.teacher} | ${c.category} - ${c.className} (${c.startTime} to ${c.endTime})`;return <option key={i} value={v}>{c.category} - {c.className}</option>})}</select></div>
      <Table>{filteredDues.length?filteredDues.map(s=><tr key={s.id} className="border-b hover:bg-slate-50"><td className="p-3 font-semibold text-blue-600">{s.id}</td><td className="p-3 font-semibold">{s.name}</td><td className="p-3 text-slate-600">{s.className||'Unassigned'}</td><td className="p-3 font-semibold">{currency} {(s.monthlyFee||0).toLocaleString()}</td><td className="p-3 font-bold text-red-600">{currency} {(s.dues||0).toLocaleString()}</td><td className="p-3 text-right"><button onClick={()=>onAddFee(s)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md">Receive Payment</button></td></tr>):<tr><td colSpan={6} className="p-8 text-center text-slate-400">No outstanding dues.</td></tr>}</Table>
    </> : <div className="space-y-4"><div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 flex gap-3"><ShieldCheck className="w-5 h-5 text-blue-600 shrink-0"/><p><strong>Automatic billing is active.</strong> The system checks billed months and adds only the active class monthly fee when a new billing month becomes due. There is no manual monthly-fee button, preventing duplicate charges.</p></div><div className="overflow-x-auto border rounded-lg"><table className="w-full text-left text-xs"><thead className="bg-slate-50 border-b"><tr><th className="p-3">Student</th><th className="p-3">Class</th><th className="p-3">Monthly Fee</th><th className="p-3">Last Billed</th><th className="p-3">Status</th></tr></thead><tbody>{billing.length?billing.map(({student,status})=><tr key={student.id} className="border-b"><td className="p-3"><strong>{student.name}</strong><div className="text-blue-600 font-mono">{student.id}</div></td><td className="p-3">{student.className}</td><td className="p-3 font-semibold">{currency} {(student.monthlyFee||0).toLocaleString()}</td><td className="p-3">{formatYearMonth(student.lastBilledMonth||'')}</td><td className="p-3">{status.isDueForFee?<span className="inline-flex gap-1 items-center px-2 py-1 bg-amber-100 text-amber-900 rounded-full font-bold"><AlertTriangle className="w-3.5 h-3.5"/> Pending automatic charge</span>:<span className="inline-flex gap-1 items-center px-2 py-1 bg-emerald-50 text-emerald-800 rounded-full font-semibold"><CheckCircle2 className="w-3.5 h-3.5"/> Up to date</span>}</td></tr>):<tr><td colSpan={5} className="p-8 text-center text-slate-400">No enrolled students.</td></tr>}</tbody></table></div></div>}
  </div>;
};

const Card=({label,value}:{label:string;value:string})=><div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><span className="text-[11px] font-bold text-slate-500 uppercase">{label}</span><div className="text-base font-extrabold text-slate-900 mt-1">{value}</div></div>;
const Table=({children}:{children:React.ReactNode})=><div className="overflow-x-auto border rounded-lg"><table className="w-full text-left text-xs sm:text-sm"><thead className="bg-slate-50 border-b"><tr><th className="p-3">ID #</th><th className="p-3">Student</th><th className="p-3">Class</th><th className="p-3">Monthly Fee</th><th className="p-3 text-red-600">Outstanding</th><th className="p-3 text-right">Action</th></tr></thead><tbody>{children}</tbody></table></div>;

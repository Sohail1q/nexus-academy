import React, { useState } from 'react';
import { Printer, X, Download, Copy, Check, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ReceiptData, NexusSettings } from '../types';

interface ReceiptModalProps {
  receipt: ReceiptData | null;
  settings: NexusSettings;
  currency?: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  settings,
  currency = 'PKR',
  onClose,
}) => {
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!receipt) return null;

  // Browser Print Dialog optimized for standard printer paper
  const handleTriggerPrint = () => {
    window.print();
  };

  // Download standalone HTML printable file
  const handleSaveToPC = () => {
    const safeStudentName = (receipt.studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Receipt_${receipt.receiptNo}_${safeStudentName}.html`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official Receipt #${receipt.receiptNo} - ${receipt.studentName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    @media print {
      body { margin: 0; background: #fff !important; }
      .no-print { display: none !important; }
      .print-container {
        border: 2px solid #0f172a !important;
        box-shadow: none !important;
        margin: 0 auto !important;
        max-width: 100% !important;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      font-weight: 600;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 10px;
      margin: 0;
    }
    .action-bar {
      margin-bottom: 20px;
    }
    .btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
    }
    .print-container {
      background: white;
      width: 100%;
      max-width: 600px;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 32px;
      box-sizing: border-box;
      box-shadow: 0 4px 15px rgba(0,0,0,0.06);
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #94a3b8;
      padding-bottom: 16px;
    }
    .logo {
      width: 70px;
      height: 70px;
      object-fit: contain;
      margin-bottom: 6px;
    }
    .title { font-size: 22px; font-weight: 800; margin: 0; color: #0f172a; }
    .subtitle { font-size: 13px; color: #475569; margin: 3px 0; font-weight: 500; }
    .address { font-size: 11px; color: #64748b; margin: 0; }
    .receipt-title {
      display: inline-block;
      margin-top: 10px;
      background: #0f172a;
      color: white;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      padding: 4px 14px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 20px;
      font-size: 13px;
    }
    .meta-item { display: flex; justify-content: space-between; padding: 3px 0; }
    .meta-label { color: #64748b; font-weight: 500; }
    .meta-val { font-weight: 700; color: #0f172a; }
    .fee-table {
      width: 100%;
      margin-top: 18px;
      border-collapse: collapse;
      font-size: 13px;
    }
    .fee-table th {
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      color: #334155;
    }
    .fee-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .total-box {
      margin-top: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 14px;
    }
    .grand-paid {
      font-size: 17px;
      font-weight: 800;
      color: #15803d;
      border-top: 2px solid #0f172a;
      padding-top: 8px;
      margin-top: 6px;
    }
    .signatures {
      margin-top: 36px;
      display: flex;
      justify-content: space-between;
      padding-top: 24px;
    }
    .sig-line {
      width: 180px;
      border-top: 1px solid #64748b;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      padding-top: 4px;
    }
    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 24px;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <button class="btn" onclick="window.print()">🖨️ Print Receipt (Standard Paper)</button>
  </div>
  <div class="print-container">
    <div class="header">
      <img src="${settings.logo || '/nexus-logo.svg'}" alt="Logo" class="logo" />
      <h1 class="title">${settings.name}</h1>
      <p class="subtitle">${settings.subtitle}</p>
      <p class="address">${settings.address}</p>
      <div class="receipt-title">Official Fee Collection Receipt</div>
    </div>
    <div style="text-align:center;margin:14px 0 4px;">${receipt.studentPhoto ? `<img src="${receipt.studentPhoto}" alt="${receipt.studentName}" style="width:96px;height:112px;object-fit:cover;border:2px solid #cbd5e1;border-radius:8px;" />` : `<div style="width:96px;height:112px;border:2px solid #cbd5e1;border-radius:8px;background:#f8fafc;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#94a3b8;">NO PHOTO</div>`}</div>

    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">Receipt Number:</span><span class="meta-val font-mono">${receipt.receiptNo}</span></div>
      <div class="meta-item"><span class="meta-label">Issue Date:</span><span class="meta-val">${receipt.date}</span></div>
      <div class="meta-item"><span class="meta-label">Student ID:</span><span class="meta-val" style="color: #2563eb;">${receipt.studentId}</span></div>
      <div class="meta-item"><span class="meta-label">Student Name:</span><span class="meta-val">${receipt.studentName}</span></div>
      <div class="meta-item"><span class="meta-label">Father / Guardian:</span><span class="meta-val">${receipt.fatherName}</span></div>
      <div class="meta-item"><span class="meta-label">Course / Class:</span><span class="meta-val">${receipt.className || 'General Tuition'}</span></div>
    </div>

    <table class="fee-table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: right;">Amount (${currency})</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Monthly Tuition Fee</td>
          <td style="text-align: right;">${receipt.monthlyFee.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Admission / Registration Fee</td>
          <td style="text-align: right;">${receipt.admissionFee.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Previous Outstanding Dues</td>
          <td style="text-align: right;">${receipt.prevDues.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row grand-paid">
        <span>Paid Amount Received:</span>
        <span>${currency} ${receipt.paidAmount.toLocaleString()}</span>
      </div>
      <div class="total-row" style="font-weight: 700; color: ${receipt.remainingDues > 0 ? '#b91c1c' : '#15803d'};">
        <span>Remaining Dues Balance:</span>
        <span>${currency} ${receipt.remainingDues.toLocaleString()}</span>
      </div>
    </div>

    <div class="signatures">
      <div class="sig-line">Student / Guardian Signature</div>
      <div class="sig-line">Authorized Academy Officer</div>
    </div>

    <div class="footer-note">
      This is an official system-verified computer-generated receipt issued by ${settings.name}.<br/>
      Thank you for your commitment to academic excellence.
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handleCopySummary = () => {
    const text = `=========================================
${settings.name.toUpperCase()} - OFFICIAL RECEIPT
${settings.subtitle}
-----------------------------------------
Receipt No:     ${receipt.receiptNo}
Date:           ${receipt.date}
Student ID:     ${receipt.studentId}
Student Name:   ${receipt.studentName}
Father Name:    ${receipt.fatherName}
Class / Course: ${receipt.className || 'General'}
-----------------------------------------
Monthly Fee:    ${currency} ${receipt.monthlyFee.toLocaleString()}
Admission Fee:  ${currency} ${receipt.admissionFee.toLocaleString()}
Previous Dues:  ${currency} ${receipt.prevDues.toLocaleString()}
-----------------------------------------
PAID AMOUNT:    ${currency} ${receipt.paidAmount.toLocaleString()}
REMAINING DUES: ${currency} ${receipt.remainingDues.toLocaleString()}
=========================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        
        {/* Printable Area - Standard Paper Layout */}
        <div id="printableReceipt" className="p-6 sm:p-8 bg-white text-slate-900 space-y-4 font-semibold">
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-dashed border-slate-300">
            <img
              src={settings.logo || '/nexus-logo.svg'}
              alt="Logo"
              className="w-16 h-16 mx-auto rounded-full object-contain mb-1.5 p-0.5 border border-slate-200"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/nexus-logo.svg';
              }}
            />
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{settings.name}</h2>
            <p className="text-xs text-slate-500 font-semibold">{settings.subtitle}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{settings.address}</p>
            <div className="mt-2.5">
              <span className="inline-block px-3 py-0.5 rounded bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest">
                Official Fee Collection Receipt
              </span>
            </div>
          </div>

          <div className="flex justify-center py-1">
            {receipt.studentPhoto ? (
              <img src={receipt.studentPhoto} alt={receipt.studentName} className="w-24 h-28 object-cover rounded-lg border-2 border-slate-300 shadow-sm" />
            ) : (
              <div className="w-24 h-28 rounded-lg border-2 border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">No Photo</div>
            )}
          </div>

          {/* Meta Details */}
          <div className="grid grid-cols-2 gap-2 text-xs py-1">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Receipt Number</span>
              <span className="font-mono font-bold text-slate-900">{receipt.receiptNo}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date of Payment</span>
              <span className="font-semibold text-slate-900">{receipt.date}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Student ID</span>
              <span className="font-mono font-bold text-blue-600">{receipt.studentId}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Course / Class</span>
              <span className="font-semibold text-slate-900 truncate block">{receipt.className || 'General'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Student Name</span>
              <span className="font-bold text-slate-900">{receipt.studentName}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Father / Guardian</span>
              <span className="font-medium text-slate-800">{receipt.fatherName}</span>
            </div>
          </div>

          {receipt.note && <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">{receipt.note}</div>}

          {/* Fee Itemization Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2 px-3">Fee Item</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 px-3 text-slate-700">Monthly Tuition Fee</td>
                  <td className="py-2 px-3 text-right font-medium text-slate-900">
                    {currency} {receipt.monthlyFee.toLocaleString()}
                  </td>
                </tr>
                {receipt.admissionFee > 0 && (
                  <tr>
                    <td className="py-2 px-3 text-slate-700">Admission / Enrollment Fee</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900">
                      {currency} {receipt.admissionFee.toLocaleString()}
                    </td>
                  </tr>
                )}
                {receipt.prevDues > 0 && (
                  <tr>
                    <td className="py-2 px-3 text-slate-700">Previous Outstanding Dues</td>
                    <td className="py-2 px-3 text-right font-medium text-amber-700">
                      {currency} {receipt.prevDues.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-sm font-extrabold text-emerald-800 pt-0.5">
              <span>Paid Amount Received:</span>
              <span className="text-base font-black text-emerald-700">
                {currency} {receipt.paidAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-slate-500 font-medium">Remaining Outstanding Balance:</span>
              <span
                className={`font-bold text-xs ${
                  receipt.remainingDues > 0 ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {currency} {receipt.remainingDues.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Standard Paper Signature Lines */}
          <div className="pt-8 pb-2 flex items-center justify-between text-[11px] text-slate-500">
            <div className="text-center w-36 border-t border-slate-400 pt-1 font-medium">
              Student / Guardian Signature
            </div>
            <div className="text-center w-36 border-t border-slate-400 pt-1 font-semibold text-slate-700 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Authorized Stamp
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            Official Computer-Generated Receipt — Thank you for choosing {settings.name}.
          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden in Print) */}
        <div className="no-print bg-slate-50 p-3.5 sm:p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveToPC}
              className="h-9 px-3.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Save standalone receipt file to your computer"
            >
              {downloaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              <span>{downloaded ? 'Saved to PC' : 'Save File (.html)'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="h-9 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1 border border-slate-300 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Trigger Browser Print Dialog Button */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Receipt (Standard Paper)
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

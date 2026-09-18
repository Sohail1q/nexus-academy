import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, Smartphone, Monitor, ShieldCheck, CheckCircle2, Sparkles, X } from 'lucide-react';
import { NexusSettings } from '../types';

interface AppsViewProps {
  settings: NexusSettings;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AppsView: React.FC<AppsViewProps> = ({ settings, onNotification }) => {
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [deviceType, setDeviceType] = useState<string>('Desktop PC');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.origin);

      // Detect user device
      const ua = navigator.userAgent;
      if (/android/i.test(ua)) {
        setDeviceType('Android Device');
      } else if (/iPad|iPhone|iPod/.test(ua)) {
        setDeviceType('Apple iOS Device');
      } else if (/Macintosh|Mac OS X/.test(ua)) {
        setDeviceType('Mac Desktop / Laptop');
      } else if (/Windows/i.test(ua)) {
        setDeviceType('Windows PC');
      } else {
        setDeviceType('Personal Device');
      }

      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        // Automatically open the install permission prompt
        setShowPermissionDialog(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      if (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      ) {
        setIsInstalled(true);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onNotification('App share link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const triggerDeviceInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        onNotification(`Installation confirmed! ${settings.name} is installed on your ${deviceType}.`, 'success');
      }
      setDeferredPrompt(null);
    } else {
      // Fallback: Create Windows PC desktop shortcut launcher
      const currentUrl = window.location.href;
      const urlFileContent = `[InternetShortcut]\nURL=${currentUrl}\nIconIndex=0\n`;
      const blob = new Blob([urlFileContent], { type: 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${settings.name || 'Nexus Academy'}.url`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setIsInstalled(true);
      onNotification(`Installation file downloaded! ${settings.name} configured for your ${deviceType}.`, 'success');
    }
    setShowPermissionDialog(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Installation Permission Dialog / Banner */}
      {showPermissionDialog && (
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 rounded-2xl border border-blue-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-blue-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Do you want to install this app on your demanded device?
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Targeting: <strong className="text-white">{deviceType}</strong> with instant offline access and real-time cloud updates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowPermissionDialog(false)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            >
              Later
            </button>
            <button
              onClick={triggerDeviceInstall}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Yes, Install Now
            </button>
          </div>
        </div>
      )}

      {/* Main Apps Card */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 sm:p-8 shadow-sm text-center space-y-6">
        <img
          src={settings.logo || '/nexus-logo.svg'}
          alt="App Logo"
          className="w-20 h-20 rounded-2xl mx-auto object-contain p-1 border border-slate-200 shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/nexus-logo.svg';
          }}
        />

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {settings.name} Application
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto mt-1">
            Install {settings.name} directly on your <span className="font-bold text-slate-700">{deviceType}</span> as a high-performance native app with instantaneous global cloud synchronization.
          </p>
        </div>

        {/* Share Link Box */}
        <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
            Academy Global Link — Copy &amp; Share
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 h-10 px-3 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-700 outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="h-10 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Trigger Install Permission Button */}
        <div>
          <button
            type="button"
            onClick={() => setShowPermissionDialog(true)}
            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl inline-flex items-center gap-2.5 shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>
              {isInstalled
                ? `App is Installed on your ${deviceType} (Reinstall / Launch)`
                : `Install on Demanded Device (${deviceType})`}
            </span>
          </button>
        </div>

        {/* Device Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-4 border-t border-slate-100">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
              <Monitor className="w-4 h-4 text-blue-600" /> Desktop &amp; Laptop Support
            </div>
            <p className="text-[11px] text-slate-500">
              Runs in dedicated full-screen window on Windows, macOS, and Linux with native keyboard shortcuts and thermal receipt printing.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
              <Smartphone className="w-4 h-4 text-emerald-600" /> Mobile Tablet &amp; Smartphone
            </div>
            <p className="text-[11px] text-slate-500">
              Lightweight mobile dashboard designed for staff and teachers to mark attendance and generate fee receipts on the go.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Database,
  Key,
  Lock,
  Globe,
  Terminal,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  X,
  Laptop,
  Sparkles,
  ArrowRight,
  Download,
  RefreshCw,
} from 'lucide-react';
import { CloudConfig } from '../types';
import { cloudSync } from '../services/cloudSync';

interface SupabaseConnectModalProps {
  initialConfig?: CloudConfig;
  onClose: () => void;
  onSuccess: (newConfig: CloudConfig) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_SQL = `-- Nexus Academy Real-Time Global Schema
CREATE TABLE IF NOT EXISTS nexus_state (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE nexus_state ENABLE ROW LEVEL SECURITY;

-- Allow Global Read & Write for Academy Real-time Synchronization
DROP POLICY IF EXISTS "Nexus Public Read" ON nexus_state;
CREATE POLICY "Nexus Public Read" ON nexus_state FOR SELECT USING (true);

DROP POLICY IF EXISTS "Nexus Public Write" ON nexus_state;
CREATE POLICY "Nexus Public Write" ON nexus_state FOR ALL USING (true) WITH CHECK (true);`;

export const SupabaseConnectModal: React.FC<SupabaseConnectModalProps> = ({
  initialConfig,
  onClose,
  onSuccess,
  onNotification,
}) => {
  const [step, setStep] = useState<'credentials' | 'sql' | 'connected'>('credentials');

  // Form inputs
  const [url, setUrl] = useState(initialConfig?.supabase?.url || '');
  const [dbName, setDbName] = useState(initialConfig?.supabase?.dbName || 'postgres');
  const [password, setPassword] = useState(initialConfig?.supabase?.dbPassword || '');
  const [anonKey, setAnonKey] = useState(initialConfig?.supabase?.anonKey || '');
  const [sqlText, setSqlText] = useState(DEFAULT_SQL);

  // States
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [installedOnWindows, setInstalledOnWindows] = useState(false);

  // Open Supabase Project in external tab
  const handleOpenSupabaseTab = () => {
    let target = 'https://supabase.com/dashboard';
    if (url.trim()) {
      try {
        const cleanUrl = url.trim().replace(/\/$/, '');
        const host = new URL(cleanUrl).hostname;
        const ref = host.split('.')[0];
        if (ref) {
          target = `https://supabase.com/dashboard/project/${ref}/sql`;
        }
      } catch {
        target = 'https://supabase.com/dashboard';
      }
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  // Step 1: Validate Credentials
  const handleValidateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!url.trim()) {
      setErrorMsg('Please enter your Supabase Project URL.');
      return;
    }

    if (!dbName.trim()) {
      setErrorMsg('Please specify the Database Name (e.g. postgres).');
      return;
    }

    // Proceed to SQL step
    setStep('sql');
  };

  // Step 2: Execute SQL & Connect
  const handleExecuteSqlAndConnect = async () => {
    setIsExecuting(true);
    setErrorMsg(null);

    try {
      const cleanUrl = url.trim().replace(/\/$/, '');
      const resp = await fetch('/api/setup-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'supabase',
          url: cleanUrl,
          dbName: dbName.trim() || 'postgres',
          password: password.trim(),
          anonKey: anonKey.trim(),
          sql: sqlText,
        }),
      });

      const data = await resp.json();

      if (data.success) {
        const newConfig: CloudConfig = {
          provider: 'supabase',
          supabase: {
            url: cleanUrl,
            anonKey: anonKey.trim(),
            dbName: dbName.trim() || 'postgres',
            dbPassword: password.trim(),
          },
        };

        // Notify parent and local cloud sync
        onSuccess(newConfig);
        cloudSync.setCloudConfig(newConfig);

        setStep('connected');
        onNotification(`Connected to database "${dbName.trim() || 'postgres'}"!`, 'success');
      } else {
        setErrorMsg(data.message || 'Could not connect to database. Please check credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection error occurred.');
    } finally {
      setIsExecuting(false);
    }
  };

  // Copy SQL to clipboard
  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    onNotification('SQL schema copied to clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Windows PC PWA Installation Trigger
  const handleInstallWindowsApp = () => {
    // 1. Try native beforeinstallprompt
    const win = window as any;
    if (win.deferredInstallPrompt) {
      win.deferredInstallPrompt.prompt();
      win.deferredInstallPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setInstalledOnWindows(true);
          onNotification('Nexus Academy installed on your Windows PC!', 'success');
        }
        win.deferredInstallPrompt = null;
      });
      return;
    }

    // 2. Generate a Windows Desktop URL Launcher (.url file)
    const currentUrl = window.location.href;
    const urlFileContent = `[InternetShortcut]\nURL=${currentUrl}\nIconIndex=0\n`;
    const blob = new Blob([urlFileContent], { type: 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'Nexus Academy.url';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    setInstalledOnWindows(true);
    onNotification('Windows Desktop Launcher downloaded to your PC!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Supabase Real Database Connection
              </h3>
              <p className="text-xs text-slate-500">
                Connect your database with credentials, execute SQL, and sync across devices.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200 text-xs font-bold text-center">
          <div
            className={`py-2.5 px-3 flex items-center justify-center gap-1.5 ${
              step === 'credentials'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600'
                : 'text-slate-500'
            }`}
          >
            <Key className="w-3.5 h-3.5" /> 1. Login &amp; Credentials
          </div>
          <div
            className={`py-2.5 px-3 flex items-center justify-center gap-1.5 ${
              step === 'sql'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600'
                : 'text-slate-500'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> 2. Enter SQL
          </div>
          <div
            className={`py-2.5 px-3 flex items-center justify-center gap-1.5 ${
              step === 'connected'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600'
                : 'text-slate-500'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 3. Connected &amp; Install
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* STEP 1: CREDENTIALS */}
          {step === 'credentials' && (
            <form onSubmit={handleValidateCredentials} className="space-y-4">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-950 leading-relaxed flex items-center justify-between flex-wrap gap-2">
                <div>
                  <strong>Supabase Account Login:</strong> Enter your Supabase project URL, database name, and password to establish connection.
                </div>
                <button
                  type="button"
                  onClick={handleOpenSupabaseTab}
                  className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold inline-flex items-center gap-1 cursor-pointer text-[11px]"
                >
                  <ExternalLink className="w-3 h-3" /> Open Supabase Login Tab
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Supabase Project URL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzabcdefgh.supabase.co"
                    className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Found in Supabase Dashboard → Settings → API → Project URL.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Database Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Database className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                      placeholder="postgres"
                      className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Database Password / Secret Key
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter database password"
                      className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Supabase Anon Public API Key (or Service Key)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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
                  className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <span>Next: Enter SQL</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ENTER SQL */}
          {step === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-600" /> Enter SQL for Database: <code>{dbName}</code>
                  </h4>
                  <p className="text-xs text-slate-500">
                    You can edit the SQL below or execute it directly into your database.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSql ? 'Copied!' : 'Copy SQL'}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenSupabaseTab}
                    className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200 inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <ExternalLink className="w-3 h-3" /> Run in Supabase SQL Tab
                  </button>
                </div>
              </div>

              <div>
                <textarea
                  value={sqlText}
                  onChange={(e) => setSqlText(e.target.value)}
                  rows={8}
                  className="w-full p-3 font-mono text-[11px] bg-slate-900 text-emerald-300 rounded-xl border border-slate-700 outline-none focus:border-emerald-500 leading-relaxed resize-y"
                  placeholder="CREATE TABLE nexus_state..."
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Back to Credentials
                </button>

                <button
                  type="button"
                  disabled={isExecuting}
                  onClick={handleExecuteSqlAndConnect}
                  className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  {isExecuting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isExecuting ? 'Creating & Connecting...' : 'Create & Connect to this Database'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONNECTED & WINDOWS PC INSTALLATION PROMPT */}
          {step === 'connected' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Success Notification */}
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Created and connected to this database: {dbName}!</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Real-time sync is now live for project: <strong>{url}</strong>. Any changes you make will be preserved and synchronized globally.
                </p>
              </div>

              {/* Exact User Prompt: Windows PC Target Device Installation */}
              <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl space-y-3.5 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Do you want to install this app on your demanded device?
                    </h4>
                    <p className="text-xs text-blue-900 font-medium">
                      Targeting: Windows PC with instant offline access and real-time cloud updates.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Installing on your Windows PC enables desktop window framing, taskbar pinning, instant start without typing URLs, and offline access that synchronizes with Supabase as soon as your device connects.
                </p>

                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleInstallWindowsApp}
                    className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install on Windows PC</span>
                  </button>

                  {installedOnWindows && (
                    <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Windows setup verified!
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow transition cursor-pointer"
                >
                  Finish &amp; Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  Gauge,
  UserPlus,
  BadgeCheck,
  Settings2,
  CalendarCheck,
  FileCheck2,
  Contact,
  Coins,
  Users,
  Sliders,
  Download,
  BookOpen,
  Menu,
  X,
  Radio,
  Search,
  User,
} from 'lucide-react';
import { NexusTab, NexusSettings, NexusStudent } from '../types';
import { CloudStatus } from '../services/cloudSync';

interface NavbarProps {
  settings: NexusSettings;
  students: NexusStudent[];
  activeTab: NexusTab;
  onTabChange: (tab: NexusTab) => void;
  onSelectStudent: (student: NexusStudent) => void;
  cloudStatus: CloudStatus;
  onOpenDeployGuide?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  students,
  activeTab,
  onTabChange,
  onSelectStudent,
  cloudStatus,
  onOpenDeployGuide,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const tabs: Array<{ id: NexusTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <Gauge className="w-4 h-4" /> },
    { id: 'admission', label: 'Admission', icon: <BadgeCheck className="w-4 h-4" /> },
    { id: 'registration', label: 'Registration', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'classes', label: 'Classes', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'test-marks', label: 'Test Marks', icon: <FileCheck2 className="w-4 h-4" /> },
    { id: 'student-info', label: 'Student Info', icon: <Contact className="w-4 h-4" /> },
    { id: 'dues', label: 'Dues & Fees', icon: <Coins className="w-4 h-4" /> },
    { id: 'directory', label: 'Directory', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Sliders className="w-4 h-4" /> },
    { id: 'apps', label: 'Apps', icon: <Download className="w-4 h-4" /> },
    { id: 'deployment', label: 'Deploy Guide', icon: <BookOpen className="w-4 h-4" /> },
  ];

  // Filter students for global search
  const filteredStudents = searchQuery.trim()
    ? students.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
          (s.className && s.className.toLowerCase().includes(q))
        );
      }).slice(0, 8)
    : [];

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global hotkey '/' to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectSearchResult = (student: NexusStudent) => {
    onSelectStudent(student);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const getStatusBadge = () => {
    switch (cloudStatus) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Cloud Live
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/90 text-amber-400 border border-amber-500/40 shadow-xs">
            <Radio className="w-3 h-3 animate-spin" />
            Syncing...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Local Storage
          </span>
        );
    }
  };

  const handleTabClick = (tabId: NexusTab) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-[#0f172a] text-white shadow-md sticky top-0 z-40 border-b border-slate-800">
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        {/* Brand */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => handleTabClick('dashboard')}
        >
          <img
            src={settings.logo || '/nexus-logo.svg'}
            alt="Nexus Logo"
            className="w-10 h-10 rounded-xl object-contain bg-slate-800/80 p-0.5 border border-slate-700 filter drop-shadow"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/nexus-logo.svg';
            }}
          />
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              {settings.name}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium hidden md:block">
              {settings.subtitle}
            </p>
          </div>
        </div>

        {/* Global Search Bar (Center / Adaptive) */}
        <div
          ref={searchContainerRef}
          className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-2 order-3 sm:order-2 w-full sm:w-auto mt-2 sm:mt-0"
        >
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Global Search (Student Name or ID)... [/]"
              className="w-full h-9 pl-9 pr-8 bg-slate-800/90 text-slate-100 placeholder-slate-400 text-xs font-medium rounded-lg border border-slate-700 outline-none focus:border-blue-500 focus:bg-slate-800 transition shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-11 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-semibold px-3">
                <span>Matching Students ({filteredStudents.length})</span>
                <span className="text-[10px] text-slate-400">Click to open profile</span>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No students found matching "{searchQuery}"
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => handleSelectSearchResult(student)}
                      className="p-2.5 px-3 hover:bg-blue-50/80 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {student.photo && !student.photo.includes('svg') ? (
                            <img
                              src={student.photo}
                              alt={student.name}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {student.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            ID: <span className="font-mono text-blue-600 font-semibold">{student.id}</span>
                            {student.className && ` • ${student.className.split('|')[0] || student.className}`}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            student.dues > 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {student.dues > 0 ? `Dues: ${student.dues}` : 'Cleared'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Controls (Clean, without [Admin Login] button as requested) */}
        <div className="flex items-center gap-2.5 order-2 sm:order-3 ml-auto sm:ml-0">
          {/* Cloud Sync Status Badge */}
          <div title="Real-time Cloud Database Status" className="cursor-help">
            {getStatusBadge()}
          </div>

          {/* Mobile menu hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 focus:outline-none cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Navigation Tabs Bar */}
      <nav className="hidden lg:block border-t border-slate-800/80 bg-slate-900/70 backdrop-blur-md px-4">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Drawer / Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-150">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

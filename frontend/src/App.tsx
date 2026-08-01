import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { ReportComplaint } from './pages/ReportComplaint';
import { TrackComplaint } from './pages/TrackComplaint';
import { OfficialLogin } from './pages/OfficialLogin';
import { OfficialDashboard } from './pages/OfficialDashboard';
import { useAuthStore } from './store/useAuthStore';
import { ShieldCheck, FilePlus2, Search, Building2, Sun, Moon, LogOut } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Nagrik AI</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Civic AI Assistant
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2 sm:gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Link
            to="/report"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <FilePlus2 className="w-4 h-4 text-blue-600" /> Report Issue
          </Link>

          <Link
            to="/track"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Search className="w-4 h-4 text-slate-500" /> Track Issue
          </Link>

          {user && user.role === 'official' ? (
            <div className="flex items-center gap-2">
              <Link
                to="/official/dashboard"
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white font-bold rounded-lg shadow"
              >
                <Building2 className="w-4 h-4" /> Dashboard
              </Link>
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/official/login"
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Building2 className="w-4 h-4 text-slate-500" /> Official Login
            </Link>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </nav>
      </div>
    </header>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/report" element={<ReportComplaint />} />
          <Route path="/track" element={<TrackComplaint />} />
          <Route path="/official/login" element={<OfficialLogin />} />
          <Route path="/official/dashboard" element={<OfficialDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

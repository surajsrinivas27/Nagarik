import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SLABadge } from '../components/SLABadge';
import { Search, CheckCircle2, Languages, AlertCircle, RefreshCw } from 'lucide-react';

export const TrackComplaint: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const [code, setCode] = useState(initialCode);
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi' | 'kn'>('en');

  const fetchComplaint = async (searchCode: string) => {
    if (!searchCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/complaints/${searchCode.trim()}`);
      setComplaint(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Complaint code not found. Check code and try again.');
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      fetchComplaint(initialCode);
    }
  }, [initialCode]);

  // Auto polling every 15s
  useEffect(() => {
    if (!initialCode) return;
    const interval = setInterval(() => {
      fetchComplaint(initialCode);
    }, 15000);
    return () => clearInterval(interval);
  }, [initialCode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      setSearchParams({ code: code.trim() });
      fetchComplaint(code.trim());
    }
  };

  const steps = ['submitted', 'acknowledged', 'in_progress', 'resolved'];

  const getStepStatus = (stepName: string) => {
    if (!complaint) return 'upcoming';
    const currentIdx = steps.indexOf(complaint.status);
    const stepIdx = steps.indexOf(stepName);

    if (complaint.status === 'rejected') return stepName === 'submitted' ? 'completed' : 'rejected';
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen py-12 px-4 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Track Grievance Status</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Real-time status tracking with automated multilingual notifications</p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="mb-8 flex gap-2">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter tracking code (e.g. GRV-2026-00148)"
            className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 uppercase font-mono font-bold shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow flex items-center gap-2 shrink-0"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2 mb-6">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {complaint && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{complaint.complaint_code}</span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{complaint.title}</h2>
            </div>
            <SLABadge deadline={complaint.sla_deadline} status={complaint.status} isOverdue={complaint.is_overdue} />
          </div>

          {/* Details Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-400 block">Department</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{complaint.department}</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-400 block">Urgency</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{complaint.urgency}</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-400 block">Citizen Reports</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{complaint.report_count} Clustered</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
              <span className="text-slate-400 block">Location</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">{complaint.address}</span>
            </div>
          </div>

          {/* Language Selector for Status Updates */}
          <div className="flex items-center justify-between p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900">
            <span className="text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-blue-600" /> Language Preferences for Updates
            </span>
            <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <button
                onClick={() => setSelectedLang('en')}
                className={`px-2.5 py-1 rounded font-semibold transition ${selectedLang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
              >
                English
              </button>
              <button
                onClick={() => setSelectedLang('hi')}
                className={`px-2.5 py-1 rounded font-semibold transition ${selectedLang === 'hi' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
              >
                हिंदी
              </button>
              <button
                onClick={() => setSelectedLang('kn')}
                className={`px-2.5 py-1 rounded font-semibold transition ${selectedLang === 'kn' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
              >
                ಕನ್ನಡ
              </button>
            </div>
          </div>

          {/* Vertical Timeline Tracker */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Grievance Resolution Progress</h3>
            <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {steps.map((st, idx) => {
                const state = getStepStatus(st);
                const historyMatch = complaint.status_history?.find((h: any) => h.status === st);
                const noteText = historyMatch?.translated_notes?.[selectedLang] || historyMatch?.note || `Status: ${st}`;

                return (
                  <div key={st} className="relative flex items-start gap-4 pl-10">
                    <div
                      className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition ${
                        state === 'completed'
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : state === 'active'
                          ? 'bg-blue-600 text-white border-blue-600 animate-pulse'
                          : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {state === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>

                    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {st.replace('_', ' ')}
                        </span>
                        {historyMatch?.at && (
                          <span className="text-[11px] text-slate-400">
                            {new Date(historyMatch.at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {state === 'upcoming' ? 'Awaiting departmental step completion' : noteText}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

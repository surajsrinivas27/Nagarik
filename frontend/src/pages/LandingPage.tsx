import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ShieldCheck, FilePlus2, Search, Sparkles, Mic, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export const LandingPage: React.FC = () => {
  const [stats, setStats] = useState({
    total_complaints: 64,
    resolved_this_week: 18,
    avg_resolution_hours: 14.5,
    sla_compliance_percentage: 95.8,
  });

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch((err) => console.log('Stats ticker poll error:', err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Banner Ticker */}
      <div className="bg-blue-900 text-blue-100 py-2.5 px-4 text-xs font-medium border-b border-blue-800 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Official Municipal Governance Assistant — Live System Operational</span>
          </div>
          <div className="flex items-center gap-6 text-blue-200 text-xs">
            <span>Resolved This Week: <strong className="text-white">{stats.resolved_this_week}</strong></span>
            <span>Avg Resolution Time: <strong className="text-white">{stats.avg_resolution_hours} hrs</strong></span>
            <span>SLA Compliance: <strong className="text-emerald-300">{stats.sla_compliance_percentage}%</strong></span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold mb-6"
          >
            <Sparkles className="w-4 h-4 text-blue-600" /> Powered by Groq Llama-3.3 & Gemini 2.5 Multimodal AI
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15] mb-6"
          >
            Nagrik AI <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Citizen Grievance & Governance Assistant
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed"
          >
            Report potholes, water leaks, sanitation issues, and electrical faults instantly using voice, photo, or text. Our AI auto-classifies, clusters duplicate complaints, and delivers multilingual updates directly to your phone.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              to="/report"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/25 transition text-base"
            >
              <FilePlus2 className="w-5 h-5" /> Report an Issue Now
            </Link>

            <Link
              to="/track"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm transition text-base"
            >
              <Search className="w-5 h-5" /> Track Complaint
            </Link>
          </motion.div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Multimodal Intake</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Speak in Hindi, Kannada, or English. Groq Whisper transcribes your voice while Gemini Vision analyzes photo evidence automatically.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Vector Duplicate Clustering</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Instead of 40 separate tickets for the same pothole, MongoDB Vector Search clusters nearby duplicate reports into 1 unified priority ticket.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">SLA & Live Heatmap</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Strict 24h to 72h resolution deadlines with red overdue indicators and live WebSocket density heatmaps for department officials.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WSEvent } from '../hooks/useWebSocket';
import { KPICard } from '../components/KPICard';
import { HeatmapView } from '../components/HeatmapView';
import type { HeatmapFeature } from '../components/HeatmapView';
import { SLABadge } from '../components/SLABadge';
import { useAuthStore } from '../store/useAuthStore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Building2, Layers, AlertCircle, Clock, CheckCircle2, Filter, Eye, X, Send, Users, Radio, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OfficialDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'analytics'>('overview');
  
  // Data states
  const [stats, setStats] = useState({
    total_complaints: 0,
    resolved_this_week: 0,
    avg_resolution_hours: 0,
    sla_compliance_percentage: 0,
    department_counts: { Roads: 0, Water: 0, Electricity: 0, Sanitation: 0, Other: 0 },
    urgency_counts: { Critical: 0, High: 0, Medium: 0, Low: 0 },
  });

  const [complaints, setComplaints] = useState<any[]>([]);
  const [heatmapFeatures, setHeatmapFeatures] = useState<HeatmapFeature[]>([]);

  // Filters
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('All');

  // Selected Detail Modal
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('in_progress');
  const [updateNote, setUpdateNote] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // WebSocket Live Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [statsRes, complaintsRes, heatmapRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/complaints?limit=100'),
        api.get('/dashboard/heatmap'),
      ]);
      setStats(statsRes.data);
      setComplaints(complaintsRes.data);
      setHeatmapFeatures(heatmapRes.data.features || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // WebSocket Subscriber
  const { isConnected } = useWebSocket('ws://localhost:8000/ws/dashboard', (evt: WSEvent) => {
    if (evt.event === 'new_complaint') {
      setToastMessage(`🚨 New Grievance: [${evt.data.complaint_code}] ${evt.data.title}`);
      fetchData();
    } else if (evt.event === 'status_update') {
      setToastMessage(`🔄 Update: [${evt.data.complaint_code}] Status set to ${evt.data.status}`);
      fetchData();
    }
    setTimeout(() => setToastMessage(null), 5000);
  });

  const handleStatusUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setIsUpdating(true);
    try {
      await api.patch(`/complaints/${selectedComplaint.id}/status`, {
        status: updateStatus,
        note: updateNote.trim() || `Status updated to ${updateStatus} by official.`,
      });
      setSelectedComplaint(null);
      setUpdateNote('');
      fetchData();
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (deptFilter !== 'All' && c.department !== deptFilter) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (urgencyFilter !== 'All' && c.urgency !== urgencyFilter) return false;
    return true;
  });

  // Recharts data formatters
  const deptChartData = Object.entries(stats.department_counts).map(([name, count]) => ({ name, count }));
  const urgencyChartData = [
    { name: 'Critical', value: stats.urgency_counts.Critical, color: '#ef4444' },
    { name: 'High', value: stats.urgency_counts.High, color: '#f97316' },
    { name: 'Medium', value: stats.urgency_counts.Medium, color: '#f59e0b' },
    { name: 'Low', value: stats.urgency_counts.Low, color: '#10b981' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 max-w-7xl mx-auto">
      {/* Toast Notification Stream */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[999] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-blue-500/30 flex items-center gap-3 text-xs font-semibold"
          >
            <Bell className="w-4 h-4 text-blue-400 animate-bounce" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Municipal Command Center</h1>
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              <Radio className="w-3 h-3 animate-pulse" /> {isConnected ? 'Live WebSocket Connected' : 'Syncing...'}
            </span>
          </div>
          <p className="text-xs text-slate-500">Official Department: <strong>{user?.department || 'Roads & Infrastructure'}</strong></p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-200 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg transition ${activeTab === 'overview' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow' : 'text-slate-600 dark:text-slate-300'}`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2 rounded-lg transition ${activeTab === 'heatmap' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow' : 'text-slate-600 dark:text-slate-300'}`}
          >
            Geo Density Heatmap
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg transition ${activeTab === 'analytics' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow' : 'text-slate-600 dark:text-slate-300'}`}
          >
            Analytics & SLA Trends
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KPICard title="Total Primary Tickets" value={stats.total_complaints} icon={Building2} color="blue" subtitle="De-duplicated Primary Grievances" />
        <KPICard title="Resolved This Week" value={stats.resolved_this_week} icon={CheckCircle2} color="emerald" subtitle="Completed by Field Engineers" />
        <KPICard title="Avg Resolution Time" value={stats.avg_resolution_hours} suffix="hrs" icon={Clock} color="amber" subtitle="Average Turnaround Speed" />
        <KPICard title="SLA Compliance %" value={stats.sla_compliance_percentage} suffix="%" icon={AlertCircle} color="indigo" subtitle="Resolved within SLA Deadline" />
      </div>

      {/* TAB 1: OVERVIEW & TABLE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
            <div className="flex items-center gap-2 text-slate-500">
              <Filter className="w-4 h-4 text-blue-600" /> Filter Grievances:
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-slate-400 mr-2">Department:</span>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="All">All Departments</option>
                  <option value="Roads">Roads</option>
                  <option value="Water">Water</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Sanitation">Sanitation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <span className="text-slate-400 mr-2">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="All">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div>
                <span className="text-slate-400 mr-2">Urgency:</span>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="All">All Urgencies</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Complaints Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Title & Description</th>
                    <th className="p-3.5">Dept</th>
                    <th className="p-3.5">Urgency</th>
                    <th className="p-3.5">Reports</th>
                    <th className="p-3.5">SLA Status</th>
                    <th className="p-3.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No complaints matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map((c) => (
                      <tr key={c.id || c.complaint_code} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition">
                        <td className="p-3.5 font-mono font-bold text-blue-600">{c.complaint_code}</td>
                        <td className="p-3.5 max-w-xs">
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{c.title}</div>
                          <div className="text-[11px] text-slate-500 truncate">{c.address}</div>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">{c.department}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            c.urgency === 'Critical' ? 'bg-red-100 text-red-700 border-red-300' :
                            c.urgency === 'High' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                            c.urgency === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          }`}>
                            {c.urgency}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded">
                            <Users className="w-3 h-3" /> {c.report_count}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <SLABadge deadline={c.sla_deadline} status={c.status} isOverdue={c.is_overdue} />
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => setSelectedComplaint(c)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> Action
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GEO HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" /> Filter Heatmap Density Layer by Department
            </span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold"
            >
              <option value="All">All City Departments</option>
              <option value="Roads">Roads</option>
              <option value="Water">Water</option>
              <option value="Electricity">Electricity</option>
              <option value="Sanitation">Sanitation</option>
            </select>
          </div>

          <HeatmapView
            features={heatmapFeatures}
            selectedDepartment={deptFilter}
            onSelectComplaint={(code) => {
              const matched = complaints.find((c) => c.complaint_code === code);
              if (matched) setSelectedComplaint(matched);
            }}
          />
        </div>
      )}

      {/* TAB 3: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Grievance Distribution by Department</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                  <YAxis stroke="#888888" fontSize={11} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Urgency Distribution Breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={urgencyChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {urgencyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Action Drawer Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600">{selectedComplaint.complaint_code}</span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedComplaint.title}</h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2">
                <p><strong>Description:</strong> {selectedComplaint.description}</p>
                <p><strong>Address:</strong> {selectedComplaint.address}</p>
                <p><strong>Clustered Citizens:</strong> <span className="font-bold text-amber-600">{selectedComplaint.report_count} reports merged</span></p>
                {selectedComplaint.voice_transcript && (
                  <p className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded text-blue-900 dark:text-blue-200">
                    <strong>Voice Transcript (Whisper):</strong> {selectedComplaint.voice_transcript}
                  </p>
                )}
              </div>

              {selectedComplaint.photo_url && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-48 flex justify-center bg-black/5">
                  <img src={selectedComplaint.photo_url} alt="Evidence" className="max-h-48 object-contain" />
                </div>
              )}

              {/* Status Update Form */}
              <form onSubmit={handleStatusUpdateSubmit} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white">Update Official Status & Notify Citizens</h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Target Status</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold"
                  >
                    <option value="acknowledged">Acknowledged (Send to Department)</option>
                    <option value="in_progress">In Progress (Field Crew On-Site)</option>
                    <option value="resolved">Resolved (Inspection Completed)</option>
                    <option value="rejected">Rejected (Invalid Ticket)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Official Resolution Note (Auto-translated to Hindi & Kannada via Gemini)</label>
                  <textarea
                    value={updateNote}
                    onChange={(e) => setUpdateNote(e.target.value)}
                    placeholder="e.g. Field repair crew dispatched with asphalt mixer..."
                    rows={3}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedComplaint(null)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> {isUpdating ? 'Broadcasting...' : 'Update & Notify'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

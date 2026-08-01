import React from 'react';
import { SLABadge } from './SLABadge';
import { MapPin, Users, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ComplaintCardProps {
  complaint: {
    id: string;
    complaint_code: string;
    title: string;
    description: string;
    department: string;
    urgency: string;
    ai_reasoning?: string;
    status: string;
    address: string;
    report_count: number;
    sla_deadline: string;
    created_at: string;
  };
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint }) => {
  const urgencyColors: Record<string, string> = {
    Critical: 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border-red-200 dark:border-red-800',
    High: 'bg-orange-100 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    Low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
            {complaint.complaint_code}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${urgencyColors[complaint.urgency] || urgencyColors.Medium}`}>
              {complaint.urgency}
            </span>
            <SLABadge deadline={complaint.sla_deadline} status={complaint.status} />
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 line-clamp-1">
          {complaint.title}
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
          {complaint.description}
        </p>

        {complaint.ai_reasoning && (
          <div className="mb-3 p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span><strong className="font-semibold">AI Routing Reasoning:</strong> {complaint.ai_reasoning}</span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400" /> {complaint.address}
          </span>
          {complaint.report_count > 1 && (
            <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded">
              <Users className="w-3.5 h-3.5" /> {complaint.report_count} Reports
            </span>
          )}
        </div>

        <Link
          to={`/track?code=${complaint.complaint_code}`}
          className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          Track <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

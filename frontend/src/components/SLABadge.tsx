import React from 'react';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface SLABadgeProps {
  deadline: string;
  status: string;
  isOverdue?: boolean;
}

export const SLABadge: React.FC<SLABadgeProps> = ({ deadline, status, isOverdue }) => {
  if (status === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
        <CheckCircle className="w-3.5 h-3.5" /> Resolved
      </span>
    );
  }

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffHours = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  const overdue = isOverdue !== undefined ? isOverdue : diffHours < 0;

  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">
        <AlertCircle className="w-3.5 h-3.5" /> OVERDUE ({Math.abs(diffHours)}h late)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
      <Clock className="w-3.5 h-3.5" /> SLA: {diffHours > 0 ? `${diffHours}h left` : 'Due soon'}
    </span>
  );
};

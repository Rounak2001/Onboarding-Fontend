import {
  Clock,
  Hash,
  MessageCircle,
  PhoneCall,
  Tag,
  UserRound,
} from 'lucide-react';
import { OUTCOME_LABELS } from '../shared/constants';

const KIND_ICONS = {
  call_log:     <PhoneCall size={12} className="text-emerald-600" />,
  note:         <MessageCircle size={12} className="text-sky-600" />,
  followup:     <Clock size={12} className="text-amber-600" />,
  assigned:     <UserRound size={12} className="text-violet-600" />,
  temp_change:  <Tag size={12} className="text-orange-600" />,
};

const KIND_LABELS = {
  call_log:     'Call',
  note:         'Note',
  followup:     'Follow-up',
  assigned:     'Assigned',
  temp_change:  'Temperature changed',
};

export default function ActivityItem({ activity }) {
  const meta = activity.meta || {};

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1 shadow-sm">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          {KIND_ICONS[activity.kind] || <Hash size={12} className="text-slate-500" />}
          <span className="text-[11px] font-semibold text-slate-700">
            {activity.kind === 'call_log'
              ? `Call — ${OUTCOME_LABELS[meta.outcome] || meta.outcome || ''}`
              : KIND_LABELS[activity.kind] || activity.kind.replace('_', ' ')}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 shrink-0">
          {activity.author?.name || 'System'}
        </span>
      </div>
      {activity.kind === 'call_log' && (
        <div className="space-y-0.5 pl-5">
          {meta.what_user_said && (
            <p className="text-[11px] text-slate-600">
              <span className="font-medium text-slate-700">User:</span> {meta.what_user_said}
            </p>
          )}
          {meta.what_rep_said && (
            <p className="text-[11px] text-slate-600">
              <span className="font-medium text-slate-700">Rep:</span> {meta.what_rep_said}
            </p>
          )}
        </div>
      )}
      {activity.kind === 'note' && activity.body && (
        <p className="pl-5 text-[11px] text-slate-600">{activity.body}</p>
      )}
      {activity.followup_due_at && (
        <p className="pl-5 text-[11px] text-amber-600 flex items-center gap-1">
          <Clock size={10} />
          Follow-up: {new Date(activity.followup_due_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      {activity.kind !== 'call_log' && activity.kind !== 'note' && activity.body && (
        <p className="pl-5 text-[11px] text-slate-600">{activity.body}</p>
      )}
      <p className="text-right text-[10px] text-slate-400">
        {new Date(activity.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}

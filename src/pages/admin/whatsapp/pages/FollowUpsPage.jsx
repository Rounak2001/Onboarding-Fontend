import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertCircle, Bell, CheckCircle2, Clock, Phone, RefreshCw } from 'lucide-react';
import { cn } from '../shared/cn';
import {
  fetchFollowupsDue,
  fetchFollowupsUpcoming,
  markFollowupDone,
  snoozeFollowup,
} from '../shared/api';

function FollowupCard({ followup, onDone, onSnooze, urgent }) {
  return (
    <div className={cn(
      'rounded-xl border bg-white p-4 shadow-sm space-y-2',
      urgent ? 'border-red-200' : 'border-slate-200'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{followup.contact_name || 'Unknown lead'}</p>
          <p className="text-xs text-slate-500">{followup.contact_phone}</p>
        </div>
        {urgent && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200 shrink-0">
            <Bell size={10} />
            Due
          </span>
        )}
      </div>
      {followup.note && (
        <p className="text-xs text-slate-700 rounded-md bg-slate-50 px-3 py-2">
          {followup.note}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <Clock size={11} />
          {new Date(followup.due_at).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onDone(followup.id)}
            className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
          >
            <CheckCircle2 size={11} />
            Done
          </button>
          <button
            type="button"
            onClick={() => onSnooze(followup.id)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Snooze 1d
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FollowUpsPage() {
  const { activeSp } = useOutletContext();
  const [due, setDue] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [scope, setScope] = useState('mine'); // mine | all
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const spId = scope === 'mine' ? activeSp?.id : undefined;
      const [dueData, upcomingData] = await Promise.all([
        fetchFollowupsDue(spId),
        fetchFollowupsUpcoming(spId),
      ]);
      setDue(Array.isArray(dueData) ? dueData : []);
      setUpcoming(Array.isArray(upcomingData) ? upcomingData : []);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load follow-ups.');
    } finally {
      setIsLoading(false);
    }
  }, [scope, activeSp?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDone = async (id) => {
    await markFollowupDone(id);
    setDue((f) => f.filter((x) => x.id !== id));
    setUpcoming((f) => f.filter((x) => x.id !== id));
  };

  const handleSnooze = async (id) => {
    await snoozeFollowup(id, 24);
    setDue((f) => f.filter((x) => x.id !== id));
    setUpcoming((f) => f.filter((x) => x.id !== id));
  };

  return (
    <div className="p-6 space-y-5">
      {/* Tabs + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {[
            { id: 'mine', label: 'My follow-ups' },
            { id: 'all',  label: 'All team' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition',
                scope === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={cn(isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {scope === 'mine' && !activeSp && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle size={14} />
          Select your name (top right) to see your personal follow-ups.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Due (red column) */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Phone size={13} />
          </span>
          <h2 className="text-sm font-bold text-slate-800">Due now</h2>
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            {due.length}
          </span>
        </div>
        {due.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
            <p className="mt-2 text-sm text-slate-600">All caught up — no follow-ups due.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {due.map((f) => (
              <FollowupCard key={f.id} followup={f} onDone={handleDone} onSnooze={handleSnooze} urgent />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <Clock size={13} />
          </span>
          <h2 className="text-sm font-bold text-slate-800">Upcoming</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {upcoming.length}
          </span>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500 px-1">No upcoming follow-ups scheduled.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((f) => (
              <FollowupCard key={f.id} followup={f} onDone={handleDone} onSnooze={handleSnooze} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

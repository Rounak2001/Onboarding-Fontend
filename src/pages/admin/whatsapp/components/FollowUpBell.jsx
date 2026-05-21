import { useEffect, useRef, useState } from 'react';
import { Bell, Clock } from 'lucide-react';
import { fetchFollowupsDue, markFollowupDone, snoozeFollowup } from '../shared/api';

export default function FollowUpBell({ activeSp }) {
  const [dueFollowups, setDueFollowups] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!activeSp) {
      setDueFollowups([]);
      return;
    }
    const spId = activeSp.id;
    const load = async () => {
      try {
        const data = await fetchFollowupsDue(spId);
        setDueFollowups(Array.isArray(data) ? data : []);
      } catch { /* silent */ }
    };
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [activeSp]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSnooze = async (id) => {
    await snoozeFollowup(id, 24);
    setDueFollowups((f) => f.filter((x) => x.id !== id));
  };

  const handleDone = async (id) => {
    await markFollowupDone(id);
    setDueFollowups((f) => f.filter((x) => x.id !== id));
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Due follow-ups"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
      >
        <Bell size={16} />
        {dueFollowups.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {dueFollowups.length > 9 ? '9+' : dueFollowups.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-800">Due Follow-ups</p>
            {!activeSp && (
              <p className="text-[11px] text-slate-500 mt-0.5">Select your name (top right) to see your follow-ups.</p>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {dueFollowups.length === 0 && (
              <p className="p-4 text-xs text-slate-500 text-center">No follow-ups due 🎉</p>
            )}
            {dueFollowups.map((f) => (
              <div key={f.id} className="px-4 py-3 border-b border-slate-200 space-y-1.5 last:border-0">
                <p className="text-sm font-medium text-slate-800">{f.contact_name}</p>
                <p className="text-xs text-slate-500">{f.contact_phone}</p>
                {f.note && <p className="text-xs text-slate-700">{f.note}</p>}
                <p className="text-[11px] text-amber-600 flex items-center gap-1">
                  <Clock size={10} />
                  Due: {new Date(f.due_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDone(f.id)}
                    className="rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSnooze(f.id)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Snooze 1d
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

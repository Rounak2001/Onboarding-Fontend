import { useState } from 'react';
import { Phone, X } from 'lucide-react';
import { OUTCOME_LABELS } from '../shared/constants';
import { logCall } from '../shared/api';
import { inputCls, modalCardCls, modalOverlayCls, selectCls, textareaCls } from '../shared/cn';

export default function LogCallModal({ conversation, salesPersons, activeSp, onClose, onSaved }) {
  const [form, setForm] = useState({
    outcome: 'connected',
    what_user_said: '',
    what_rep_said: '',
    notes: '',
    has_followup: false,
    follow_up_due_at: '',
    follow_up_assigned_to_id: activeSp?.id ?? '',
    author_id: activeSp?.id ?? '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.outcome) { setErr('Please select an outcome.'); return; }
    setIsSaving(true);
    setErr('');
    try {
      const payload = {
        outcome: form.outcome,
        what_user_said: form.what_user_said,
        what_rep_said: form.what_rep_said,
        notes: form.notes,
        author_id: form.author_id || null,
        follow_up_due_at: form.has_followup ? form.follow_up_due_at || null : null,
        follow_up_assigned_to_id: form.has_followup ? form.follow_up_assigned_to_id || null : null,
      };
      await logCall(conversation.id, payload);
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save call log.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={modalOverlayCls} onClick={onClose}>
      <div className={`w-110 ${modalCardCls}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
            <Phone size={17} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-slate-800">Log Call</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{conversation?.contact?.full_name || conversation?.contact?.phone_number || 'Lead'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Called by</label>
              <select
                value={form.author_id}
                onChange={(e) => set('author_id', e.target.value)}
                className={selectCls}
              >
                <option value="">Select rep</option>
                {salesPersons.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Outcome</label>
              <select
                value={form.outcome}
                onChange={(e) => set('outcome', e.target.value)}
                className={selectCls}
              >
                {Object.entries(OUTCOME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">What the user said</label>
            <textarea
              rows={2}
              value={form.what_user_said}
              onChange={(e) => set('what_user_said', e.target.value)}
              placeholder="User said they want ITR for FY24…"
              className={textareaCls}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">What I said / action taken</label>
            <textarea
              rows={2}
              value={form.what_rep_said}
              onChange={(e) => set('what_rep_said', e.target.value)}
              placeholder="Explained pricing, sent checkout link…"
              className={textareaCls}
            />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-slate-200 px-3 py-2.5 hover:bg-slate-50 transition">
            <input
              type="checkbox"
              checked={form.has_followup}
              onChange={(e) => set('has_followup', e.target.checked)}
              className="accent-emerald-600 h-4 w-4 shrink-0"
            />
            <span className="text-sm text-slate-700">Set follow-up reminder <span className="text-[11px] text-emerald-600">(sent via WhatsApp)</span></span>
          </label>
          {form.has_followup && (
            <div className="pl-4 space-y-3 border-l-2 border-emerald-300 ml-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.follow_up_due_at}
                  onChange={(e) => set('follow_up_due_at', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Assign to</label>
                <select
                  value={form.follow_up_assigned_to_id}
                  onChange={(e) => set('follow_up_assigned_to_id', e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select rep</option>
                  {salesPersons.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </select>
              </div>
            </div>
          )}
          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {isSaving ? 'Saving…' : 'Save Call Log'}
          </button>
        </div>
      </div>
    </div>
  );
}

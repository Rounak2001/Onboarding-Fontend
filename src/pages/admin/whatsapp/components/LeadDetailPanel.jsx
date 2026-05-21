import { useCallback, useEffect, useState } from 'react';
import { Phone, StickyNote, X } from 'lucide-react';
import { cn, selectCls, textareaCls } from '../shared/cn';
import { formatPhone } from '../shared/format';
import { TEMP_CONFIG } from '../shared/constants';
import {
  addConversationNote,
  assignConversation,
  fetchConversationActivities,
  setConversationTemperature,
} from '../shared/api';
import ActivityItem from './ActivityItem';
import LogCallModal from './LogCallModal';

export default function LeadDetailPanel({
  conversation,
  salesPersons,
  activeSp,
  onClose,
  onUpdate,
}) {
  const [activities, setActivities] = useState([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [showLogCall, setShowLogCall] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [assigneeId, setAssigneeId] = useState(conversation?.assigned_to?.id ?? '');
  const [temperature, setTemperature] = useState(conversation?.temperature ?? '');

  const loadActivities = useCallback(async () => {
    if (!conversation) return;
    setIsLoadingActivities(true);
    try {
      const data = await fetchConversationActivities(conversation.id);
      setActivities(data.results || []);
    } catch { /* silent */ }
    finally { setIsLoadingActivities(false); }
  }, [conversation]);

  useEffect(() => {
    if (!conversation) return;
    setAssigneeId(conversation.assigned_to?.id ?? '');
    setTemperature(conversation.temperature ?? '');
    loadActivities();
  }, [conversation, loadActivities]);

  const handleAssign = async (spId) => {
    setAssigneeId(spId);
    try {
      await assignConversation(conversation.id, spId || null, activeSp?.id);
      onUpdate?.();
      loadActivities();
    } catch { /* silent */ }
  };

  const handleTemperature = async (temp) => {
    setTemperature(temp);
    try {
      await setConversationTemperature(conversation.id, temp, activeSp?.id);
      onUpdate?.();
      loadActivities();
    } catch { /* silent */ }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setIsSavingNote(true);
    try {
      await addConversationNote(conversation.id, noteText.trim(), activeSp?.id);
      setNoteText('');
      loadActivities();
    } catch { /* silent */ }
    finally { setIsSavingNote(false); }
  };

  if (!conversation) return null;
  const contact = conversation.contact || {};
  const displayName = contact.full_name || contact.whatsapp_profile_name || contact.phone_number || 'Unknown';

  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col border-l border-slate-200 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-slate-200">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
          <p className="text-[11px] text-slate-500">{formatPhone(contact.phone_number)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X size={16} />
        </button>
      </div>

      {/* Quick meta — assignee + temperature */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Assigned to</p>
          <select
            value={assigneeId}
            onChange={(e) => handleAssign(e.target.value ? Number(e.target.value) : null)}
            className={selectCls}
          >
            <option value="">Unassigned</option>
            {salesPersons.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
          </select>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Temperature</p>
          <div className="grid grid-cols-4 gap-1">
            {['hot', 'warm', 'cold', ''].map((t) => {
              const cfg = TEMP_CONFIG[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTemperature(t)}
                  className={cn(
                    'rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition',
                    temperature === t
                      ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {cfg.emoji && <span className="mr-0.5">{cfg.emoji}</span>}
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity timeline */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Activity</p>
        {isLoadingActivities && <p className="text-xs text-slate-500">Loading…</p>}
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
        {!isLoadingActivities && !activities.length && (
          <p className="text-xs text-slate-500 py-6 text-center">No activity yet.</p>
        )}
      </div>

      {/* Add note + log call buttons */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 space-y-2">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a quick note…"
          rows={2}
          className={`${textareaCls} text-xs`}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddNote}
            disabled={isSavingNote || !noteText.trim()}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <StickyNote size={12} />
            {isSavingNote ? 'Saving…' : 'Note'}
          </button>
          <button
            type="button"
            onClick={() => setShowLogCall(true)}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            <Phone size={12} />
            Log Call
          </button>
        </div>
      </div>

      {showLogCall && (
        <LogCallModal
          conversation={conversation}
          salesPersons={salesPersons}
          activeSp={activeSp}
          onClose={() => setShowLogCall(false)}
          onSaved={() => {
            setShowLogCall(false);
            loadActivities();
            onUpdate?.();
          }}
        />
      )}
    </div>
  );
}

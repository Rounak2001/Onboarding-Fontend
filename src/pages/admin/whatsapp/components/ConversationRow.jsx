import { Clock } from 'lucide-react';
import { cn } from '../shared/cn';
import { formatDateTime } from '../shared/format';
import { STAGE_CONFIG, TEMP_CONFIG } from '../shared/constants';
import Avatar from './Avatar';

export default function ConversationRow({ conversation, isSelected, onSelect }) {
  const contact = conversation.contact || {};
  const displayName =
    contact.full_name ||
    contact.whatsapp_profile_name ||
    contact.masked_phone_number ||
    'Unknown';
  const stageConfig = STAGE_CONFIG[conversation.current_stage] || STAGE_CONFIG.unknown;
  const temp = conversation.temperature || '';
  const tempDot = TEMP_CONFIG[temp]?.dot || 'bg-transparent';
  const preview =
    conversation.last_inbound_preview ||
    conversation.latest_message?.message_text ||
    '…';
  const followup = conversation.pending_followup;
  const assignee = conversation.assigned_to;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
        isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
      )}
    >
      <div className="relative shrink-0">
        <Avatar name={displayName} />
        {temp && (
          <span className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#111b21]',
            tempDot
          )} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-[#e9edef]">{displayName}</p>
          <span className="shrink-0 text-[11px] text-[#8696a0]">
            {formatDateTime(conversation.last_message_at || conversation.created_at)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-[#8696a0]">{preview}</p>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#e9edef]">
            <span className={cn('h-1.5 w-1.5 rounded-full', stageConfig.dot)} />
            {stageConfig.short}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {assignee && (
            <span className="text-[10px] text-[#00a884] truncate">{assignee.name}</span>
          )}
          {followup && (
            <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
              <Clock size={9} />
              {new Date(followup.due_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
              })}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

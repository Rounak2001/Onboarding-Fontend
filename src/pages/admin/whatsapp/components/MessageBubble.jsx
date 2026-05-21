import { AlertCircle, MousePointerClick } from 'lucide-react';
import { cn } from '../shared/cn';
import { formatTime } from '../shared/format';
import {
  parsePayload,
  parseBotMessage,
  getSendErrorText,
} from '../shared/constants';
import MessageTick from './MessageTick';

export default function MessageBubble({ message, contactName }) {
  const isInbound = message.direction === 'inbound';
  const isHumanAgent = message.sender_type === 'sales';
  const senderLabel = isInbound ? (contactName || 'User') : (isHumanAgent ? 'Agent' : 'Bot');
  const rawText = message.display_text || message.message_text || '';
  const fallbackText = message.metadata?.fallback_text;
  const sendErrorText = getSendErrorText(message.metadata?.send_error);

  // Inbound list-tap payload (e.g. "cat:ITR")
  const payload = isInbound ? parsePayload(rawText) : null;
  if (payload) {
    const { config, displayValue } = payload;
    return (
      <div className="flex justify-start">
        <div className="max-w-[72%] overflow-hidden rounded-lg rounded-tl-none shadow-sm">
          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold', config.headerBg, config.headerText)}>
            <span>{config.label}</span>
          </div>
          <div className="bg-[#1f2c34] px-3 pb-2.5 pt-2">
            <p className="text-sm font-semibold text-[#e9edef]">{displayValue}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#8696a0]">{formatTime(message.created_at)}</span>
              <MessageTick status={message.status} variant="light" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Outbound bot action (e.g. "WhatsApp list sent: …")
  const botAction = !isInbound ? parseBotMessage(rawText) : null;
  if (botAction) {
    const ActionIcon = botAction.icon;
    return (
      <div className="flex justify-end">
        <div className="max-w-[72%] overflow-hidden rounded-lg rounded-tr-none shadow-sm">
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold',
            botAction.failed ? 'bg-red-950/80 text-red-200' : 'bg-[#025c4c] text-[#06cf9c]'
          )}>
            <ActionIcon size={11} />
            <span>{botAction.label}</span>
          </div>
          <div className="bg-[#005c4b] px-3 pb-2.5 pt-2">
            <p className="text-sm font-medium text-[#e9edef]">{botAction.action}</p>
            {botAction.failed && (
              <div className="mt-2 rounded-md border border-red-500/30 bg-red-950/40 p-2 text-[11px] leading-relaxed text-red-100">
                <p className="font-semibold">Debug</p>
                <p>reply_kind: {message.metadata?.reply_kind || 'n/a'}</p>
                <p>sent_as: {message.metadata?.sent_as || 'n/a'}</p>
                <p>flow_id: {message.metadata?.flow_id || 'n/a'}</p>
                <p>flow_cta: {message.metadata?.flow_cta || 'n/a'}</p>
                <p>flow_token: {message.metadata?.flow_token_present ? 'present' : 'missing'}</p>
                {sendErrorText && <p className="mt-1 whitespace-pre-wrap">error: {sendErrorText}</p>}
              </div>
            )}
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <span className="text-[11px] text-[#8696a0]">{formatTime(message.created_at)}</span>
              <MessageTick status={message.status} variant="light" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isFlowMessage = message.metadata?.reply_kind === 'flow' || Boolean(message.metadata?.flow_type);
  const isSendFallback = ['text_fallback', 'flow_failed_text_failed', 'list_failed_text_failed'].includes(
    message.metadata?.sent_as
  );

  return (
    <div className={cn('flex', isInbound ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'relative max-w-[72%] rounded-lg px-3 py-2 shadow-sm',
          isInbound
            ? 'bg-[#1f2c34] text-[#e9edef] rounded-tl-none'
            : isHumanAgent
              ? 'bg-[#1d3a5c] text-[#e9edef] rounded-tr-none'
              : 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
        )}
      >
        {!isInbound && (
          <p className={cn('mb-0.5 text-[11px] font-semibold', isHumanAgent ? 'text-[#53bdeb]' : 'text-[#06cf9c]')}>
            {senderLabel}
          </p>
        )}
        {isFlowMessage && (
          <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[#00a884]/20 px-2 py-0.5 text-[11px] font-medium text-[#06cf9c]">
            <MousePointerClick size={10} />
            <span>{isInbound ? 'Form submitted' : 'Form sent'}</span>
          </div>
        )}
        <p className="whitespace-pre-wrap text-[13.5px] leading-[1.45]">{rawText || '[empty]'}</p>
        {isFlowMessage && fallbackText && (
          <details className="mt-1.5 text-[11px] text-[#8696a0]">
            <summary className="cursor-pointer">Fallback text</summary>
            <p className="mt-1 whitespace-pre-wrap">{fallbackText}</p>
          </details>
        )}
        {(isSendFallback || sendErrorText) && (
          <details className="mt-1.5 rounded-md border border-red-500/25 bg-red-950/25 p-2 text-[11px] text-red-100">
            <summary className="cursor-pointer font-semibold">Send debug</summary>
            <div className="mt-1 space-y-0.5">
              <p>reply_kind: {message.metadata?.reply_kind || 'n/a'}</p>
              <p>sent_as: {message.metadata?.sent_as || 'n/a'}</p>
              <p>flow_id: {message.metadata?.flow_id || 'n/a'}</p>
              <p>flow_cta: {message.metadata?.flow_cta || 'n/a'}</p>
              <p>flow_token: {message.metadata?.flow_token_present ? 'present' : 'missing'}</p>
              {sendErrorText && <p className="whitespace-pre-wrap">error: {sendErrorText}</p>}
            </div>
          </details>
        )}
        <div className="mt-0.5 flex items-center justify-end gap-1">
          <span className="text-[11px] text-[#8696a0]">{formatTime(message.created_at)}</span>
          <MessageTick status={message.status} variant="light" />
        </div>
      </div>
    </div>
  );
}

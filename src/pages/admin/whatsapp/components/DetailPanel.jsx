import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Globe,
  Headphones,
  MessageCircle,
  Package,
  RefreshCw,
  Send,
  Smile,
  Trash2,
  X,
} from 'lucide-react';
import Picker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';
import { cn } from '../shared/cn';
import { formatPhone } from '../shared/format';
import { groupMessagesByDate } from '../shared/format';
import { claimHandoff, resolveHandoff, sendHandoffMessage } from '../shared/api';
import Avatar from './Avatar';
import StagePill from './StagePill';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import BotDecisionCard from './BotDecisionCard';
import AttributionCard from './AttributionCard';
import TemplatePanel from './TemplatePanel';
import CartEditor from './CartEditor';

export default function DetailPanel({
  detail,
  messages,
  isLoading,
  onClearConversation,
  isClearing,
  onMessagesRefresh,
  onMessagesOnly,
  onLoadOlderMessages,
  hasOlderMessages,
  isLoadingOlderMessages,
  showLeadPanel,
  onToggleLeadPanel,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('decisions');
  const [humanMessage, setHumanMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isClaimingHandoff, setIsClaimingHandoff] = useState(false);
  const [isResolvingHandoff, setIsResolvingHandoff] = useState(false);
  const [handoffError, setHandoffError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesTopRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const shouldScrollToBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);

  const humanActive = detail?.conversation?.human_active ?? false;
  const conversationId = detail?.conversation?.id;

  useEffect(() => {
    shouldScrollToBottomRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    if (!messages.length) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    if (shouldScrollToBottomRef.current) {
      container.scrollTop = container.scrollHeight;
      shouldScrollToBottomRef.current = false;
    } else if (prevScrollHeightRef.current > 0) {
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [messages]);

  useEffect(() => {
    const sentinel = messagesTopRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container || !hasOlderMessages) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingOlderMessages) {
          prevScrollHeightRef.current = container.scrollHeight;
          onLoadOlderMessages();
        }
      },
      { root: container, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasOlderMessages, isLoadingOlderMessages, onLoadOlderMessages]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  const handleEmojiSelect = (emoji) => {
    const native = emoji.native;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newVal = humanMessage.slice(0, start) + native + humanMessage.slice(end);
      setHumanMessage(newVal);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start + native.length, start + native.length);
      });
    } else {
      setHumanMessage((v) => v + native);
    }
  };

  const handleClaim = async () => {
    setIsClaimingHandoff(true);
    setHandoffError('');
    try {
      await claimHandoff(detail.conversation.id);
      await onMessagesRefresh({ silent: true });
    } catch (e) {
      setHandoffError(e.response?.data?.error || 'Could not claim handoff.');
    } finally {
      setIsClaimingHandoff(false);
    }
  };

  const handleSendMessage = async () => {
    const text = humanMessage.trim();
    if (!text) return;
    setIsSendingMessage(true);
    setHandoffError('');
    try {
      await sendHandoffMessage(detail.conversation.id, text);
      setHumanMessage('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      shouldScrollToBottomRef.current = true;
      await onMessagesOnly();
    } catch (e) {
      setHandoffError(e.response?.data?.error || 'Could not send message.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleResolve = async () => {
    if (!window.confirm('Hand conversation back to the bot? The bot will resume responding.')) return;
    setIsResolvingHandoff(true);
    setHandoffError('');
    try {
      await resolveHandoff(detail.conversation.id);
      await onMessagesRefresh({ silent: true });
    } catch (e) {
      setHandoffError(e.response?.data?.error || 'Could not resolve handoff.');
    } finally {
      setIsResolvingHandoff(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-[#8696a0] bg-[#0b141a]">
        <RefreshCw size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  if (!detail?.conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center bg-[#0b141a]">
        <MessageCircle size={44} strokeWidth={1.2} className="text-[#8696a0]" />
        <p className="text-sm text-[#8696a0]">Select a conversation to view messages</p>
      </div>
    );
  }

  const conversation = detail.conversation;
  const contact = conversation.contact || {};
  const displayName = contact.full_name || contact.whatsapp_profile_name || contact.phone_number || 'Unknown';

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#0b141a]">
      <header className="flex items-center justify-between gap-3 bg-[#202c33] px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={displayName} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-[#e9edef] truncate">{displayName}</p>
              <StagePill stage={conversation.current_stage} variant="dark" />
            </div>
            <p className="text-xs text-[#8696a0]">{formatPhone(contact.phone_number)}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!humanActive && (
            <button
              type="button"
              onClick={handleClaim}
              disabled={isClaimingHandoff}
              title="Take over: reply as human agent (pauses bot)"
              className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[#8696a0] transition hover:bg-white/10 hover:text-[#00a884] disabled:opacity-50"
            >
              <Headphones size={14} />
              <span className="hidden sm:inline">Take Over</span>
            </button>
          )}
          {humanActive && (
            <button
              type="button"
              onClick={handleResolve}
              disabled={isResolvingHandoff}
              title="Hand back to bot"
              className="flex h-8 items-center gap-1.5 rounded-full bg-[#00a884]/20 px-3 text-xs font-medium text-[#00a884] transition hover:bg-[#00a884]/30 disabled:opacity-50"
            >
              <Bot size={14} />
              <span className="hidden sm:inline">Resume Bot</span>
            </button>
          )}
          {onToggleLeadPanel && (
            <button
              type="button"
              onClick={onToggleLeadPanel}
              title="Toggle CRM panel"
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition',
                showLeadPanel
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-[#8696a0] hover:bg-white/10 hover:text-white',
              )}
            >
              <ClipboardList size={14} />
              <span className="hidden sm:inline">CRM</span>
            </button>
          )}
          <button
            type="button"
            disabled={isClearing}
            onClick={() => onClearConversation(conversation)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8696a0] transition hover:bg-white/10 hover:text-red-400 disabled:opacity-50"
            title="Clear conversation"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {humanActive && (
        <div className="flex items-center gap-2 bg-[#00a884]/15 border-b border-[#00a884]/20 px-4 py-2">
          <Headphones size={13} className="shrink-0 text-[#00a884]" />
          <p className="text-xs font-medium text-[#06cf9c]">Human agent active — bot is paused. Messages you send go directly to the user.</p>
        </div>
      )}

      {handoffError && (
        <div className="flex items-center gap-2 border-b border-red-900/30 bg-red-900/20 px-4 py-2">
          <AlertCircle size={13} className="shrink-0 text-red-400" />
          <p className="flex-1 text-xs text-red-400">{handoffError}</p>
          <button type="button" onClick={() => setHandoffError('')} className="text-red-400 hover:text-red-300">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto p-4"
          style={{ background: '#0b141a' }}
        >
          <div ref={messagesTopRef} className="h-px" />
          {isLoadingOlderMessages && (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-[#8696a0]">
              <RefreshCw size={12} className="animate-spin" />
              Loading older messages…
            </div>
          )}
          {hasOlderMessages && !isLoadingOlderMessages && (
            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={() => {
                  prevScrollHeightRef.current = scrollContainerRef.current?.scrollHeight || 0;
                  onLoadOlderMessages();
                }}
                className="rounded-full bg-[#1f2c34] px-3 py-1 text-[11px] text-[#8696a0] transition hover:bg-[#2a3942] hover:text-[#e9edef]"
              >
                Load older messages
              </button>
            </div>
          )}

          {messages.length ? (
            groupMessagesByDate(messages).map((group) => (
              <div key={group.key}>
                <DateSeparator label={group.label} />
                <div className="space-y-1.5">
                  {group.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} contactName={displayName} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="py-10 text-center text-sm text-[#667781]">No messages recorded.</p>
          )}
          <div ref={messagesEndRef} />
        </div>

        <aside
          className={cn(
            'hidden shrink-0 border-l border-[#2a3942] bg-[#111b21] transition-[width] duration-200 lg:flex lg:flex-col',
            sidebarOpen ? 'lg:w-[300px]' : 'lg:w-10'
          )}
        >
          <div className="flex shrink-0 items-center border-b border-[#2a3942] px-2 py-1 gap-1">
            {sidebarOpen && (
              <div className="flex flex-1 gap-0.5 overflow-hidden">
                {[
                  { id: 'decisions', icon: <Bot size={12} />, label: 'Decisions' },
                  { id: 'cart', icon: <Package size={12} />, label: 'Cart' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSidebarTab(tab.id)}
                    className={cn(
                      'flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition',
                      sidebarTab === tab.id ? 'bg-[#00a884]/20 text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              title={sidebarOpen ? 'Collapse' : 'Expand'}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#06cf9c] active:scale-95"
            >
              {sidebarOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
          </div>

          {sidebarOpen && sidebarTab === 'decisions' && (
            <div className="flex-1 overflow-y-auto p-3">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[#8696a0]">Bot steps</p>
              <div className="space-y-2">
                {(detail.bot_decisions || []).map((decision) => (
                  <BotDecisionCard key={decision.id} decision={decision} />
                ))}
                {!detail.bot_decisions?.length && (
                  <p className="text-center text-xs text-[#8696a0]">No decisions yet.</p>
                )}
              </div>

              <div className="mb-2 mt-5 flex items-center gap-1.5">
                <Globe size={13} className="text-[#53bdeb]" />
                <p className="text-[10px] uppercase tracking-wider text-[#8696a0]">Attribution</p>
                {detail.attribution_events?.length ? (
                  <span className="ml-auto rounded-full bg-[#53bdeb]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#53bdeb]">
                    {detail.attribution_events.length}
                  </span>
                ) : null}
              </div>
              <div className="space-y-2">
                {(detail.attribution_events || []).map((event) => (
                  <AttributionCard key={event.id} event={event} />
                ))}
                {!detail.attribution_events?.length && (
                  <p className="text-center text-xs text-[#8696a0]">No attribution recorded.</p>
                )}
              </div>
            </div>
          )}

          {sidebarOpen && sidebarTab === 'cart' && (
            <div className="flex-1 overflow-y-auto p-3">
              <CartEditor conversationId={conversation.id} onCartUpdated={onMessagesRefresh} />
            </div>
          )}
        </aside>
      </div>

      <TemplatePanel conversation={conversation} onRefreshDetail={onMessagesRefresh} />

      {humanActive && (
        <div className="relative shrink-0 border-t border-[#2a3942] bg-[#202c33] px-3 py-2">
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full left-2 z-50 mb-2">
              <Picker
                data={emojiData}
                onEmojiSelect={handleEmojiSelect}
                theme="dark"
                previewPosition="none"
                skinTonePosition="none"
                navPosition="top"
                perLine={8}
                emojiSize={22}
                emojiButtonSize={32}
              />
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              type="button"
              title="Emoji"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className={cn(
                'mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition',
                showEmojiPicker ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
              )}
            >
              <Smile size={22} />
            </button>
            <div className="flex-1 rounded-xl bg-[#2a3942] px-4 py-2.5">
              <textarea
                ref={textareaRef}
                rows={1}
                value={humanMessage}
                onChange={(e) => {
                  setHumanMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (humanMessage.trim() && !isSendingMessage) handleSendMessage();
                  }
                }}
                placeholder="Type a message as agent…"
                className="w-full resize-none bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] outline-none"
                style={{ minHeight: '22px', maxHeight: '120px', overflowY: 'auto' }}
              />
            </div>
            <button
              type="button"
              title="Send"
              disabled={!humanMessage.trim() || isSendingMessage}
              onClick={handleSendMessage}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-md transition hover:bg-[#06cf9c] active:scale-95 disabled:opacity-40"
            >
              {isSendingMessage ? <RefreshCw size={16} className="animate-spin" /> : <Send size={18} className="translate-x-px" />}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

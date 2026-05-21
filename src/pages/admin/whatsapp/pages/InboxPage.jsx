import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertCircle,
  RefreshCw,
  Search,
  Zap,
} from 'lucide-react';
import { cn } from '../shared/cn';
import { formatNumber } from '../shared/format';
import {
  CATEGORY_OPTIONS,
  STAGE_CONFIG,
  STAGE_OPTIONS,
} from '../shared/constants';
import {
  clearConversation,
  fetchAdminSummary,
  fetchConversationDetail,
  fetchConversationMessages,
  fetchConversations,
} from '../shared/api';
import ConversationRow from '../components/ConversationRow';
import DetailPanel from '../components/DetailPanel';
import LeadDetailPanel from '../components/LeadDetailPanel';
import BulkSendDrawer from '../components/BulkSendDrawer';

const TEMP_QUICK = [
  { value: 'hot',  label: '🔥 Hot',  active: 'bg-red-500 text-white border-red-500' },
  { value: 'warm', label: '🌤 Warm', active: 'bg-amber-500 text-white border-amber-500' },
  { value: 'cold', label: '❄️ Cold', active: 'bg-sky-500 text-white border-sky-500' },
];

export default function InboxPage() {
  const { salesPersons, activeSp } = useOutletContext();

  const [summary, setSummary] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesPagination, setMessagesPagination] = useState(null);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isClearingConversation, setIsClearingConversation] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', stage: '', category: '', handoff: false });
  const [crmFilters, setCrmFilters] = useState({ assignedTo: '', temperature: '', unassigned: false });
  const [isBulkDrawerOpen, setIsBulkDrawerOpen] = useState(false);
  const [showLeadPanel, setShowLeadPanel] = useState(false);

  const loadList = useCallback(async () => {
    setIsLoadingList(true);
    setError('');
    try {
      const [summaryData, conversationData] = await Promise.all([
        fetchAdminSummary(),
        fetchConversations({
          ...filters,
          assignedTo: crmFilters.assignedTo || '',
          temperature: crmFilters.temperature || '',
          unassigned: crmFilters.unassigned,
        }),
      ]);
      setSummary(summaryData);
      setConversations(conversationData.results || []);
      setPagination(conversationData.pagination || null);
      if (conversationData.results?.length) {
        setSelectedId((current) => current || conversationData.results[0].id);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load WhatsApp admin data.');
    } finally {
      setIsLoadingList(false);
    }
  }, [filters, crmFilters]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Reset stale message data when switching conversations
  useEffect(() => {
    setMessages([]);
    setMessagesPagination(null);
  }, [selectedId]);

  const loadDetail = useCallback(async ({ silent = false } = {}) => {
    if (!selectedId) return;
    if (!silent) setIsLoadingDetail(true);
    try {
      const [detailData, messageData] = await Promise.all([
        fetchConversationDetail(selectedId),
        fetchConversationMessages(selectedId, { page: 1, pageSize: 20 }),
      ]);
      setDetail(detailData);
      setMessages(messageData.results || []);
      setMessagesPagination(messageData.pagination || null);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load conversation detail.');
    } finally {
      if (!silent) setIsLoadingDetail(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedId || !messagesPagination?.has_next) return;
    setIsLoadingOlderMessages(true);
    try {
      const nextPage = (messagesPagination.page || 1) + 1;
      const messageData = await fetchConversationMessages(selectedId, { page: nextPage, pageSize: 20 });
      setMessages((prev) => [...(messageData.results || []), ...prev]);
      setMessagesPagination(messageData.pagination || null);
    } catch { /* silent */ }
    finally { setIsLoadingOlderMessages(false); }
  }, [selectedId, messagesPagination]);

  const loadMessages = useCallback(async () => {
    if (!selectedId) return;
    try {
      const messageData = await fetchConversationMessages(selectedId, { page: 1, pageSize: 20 });
      setMessages(messageData.results || []);
      setMessagesPagination(messageData.pagination || null);
    } catch { /* silent */ }
  }, [selectedId]);

  const stageBreakdown = useMemo(() => summary?.stage_breakdown || [], [summary]);

  const handleClearConversation = useCallback(async (conversation) => {
    const contact = conversation?.contact || {};
    const label =
      contact.full_name ||
      contact.whatsapp_profile_name ||
      contact.masked_phone_number ||
      `#${conversation?.id}`;
    if (!window.confirm(`Clear WhatsApp bot chat for ${label}?\n\nThis deletes only WhatsApp bot records. It will not delete client-consultant chat.`)) return;
    setIsClearingConversation(true);
    setError('');
    try {
      await clearConversation(conversation.id);
      setSelectedId(null);
      setDetail(null);
      setMessages([]);
      await loadList();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not clear WhatsApp bot conversation.');
    } finally {
      setIsClearingConversation(false);
    }
  }, [loadList]);

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

  return (
    <div className="flex h-full min-h-0">
      {/* LEFT — conversation list (full WhatsApp dark theme) */}
      <aside className="flex w-[340px] shrink-0 flex-col border-r border-[#1f2c34] bg-[#111b21]">
        {/* List header */}
        <div className="border-b border-[#1f2c34] bg-[#202c33] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#e9edef]">Conversations</p>
              <p className="text-[11px] text-[#8696a0]">
                {pagination ? `${formatNumber(pagination.total)} total` : 'Loading…'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsBulkDrawerOpen(true)}
                title="Bulk send"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8696a0] hover:bg-white/10 hover:text-[#00a884]"
              >
                <Zap size={15} />
              </button>
              <button
                type="button"
                onClick={loadList}
                disabled={isLoadingList}
                title="Refresh"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8696a0] hover:bg-white/10 disabled:opacity-40"
              >
                <RefreshCw size={15} className={cn(isLoadingList && 'animate-spin')} />
              </button>
            </div>
          </div>
        </div>

        {/* Search + filters */}
        <div className="border-b border-[#1f2c34] bg-[#202c33] px-3 py-2.5 space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696a0]" />
            <input
              value={filters.search}
              onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
              placeholder="Search by name or phone…"
              className="w-full rounded-lg border border-[#1f2c34] bg-[#2a3942] py-2 pl-9 pr-3 text-sm text-[#e9edef] placeholder-[#8696a0] outline-none transition focus:border-[#00a884]"
            />
          </div>
          <div className="flex gap-1.5">
            <select
              value={filters.stage}
              onChange={(e) => setFilters((c) => ({ ...c, stage: e.target.value }))}
              className="flex-1 rounded-lg border border-[#1f2c34] bg-[#2a3942] px-2 py-1.5 text-xs text-[#e9edef] outline-none transition focus:border-[#00a884]"
            >
              {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={filters.category}
              onChange={(e) => setFilters((c) => ({ ...c, category: e.target.value }))}
              className="flex-1 rounded-lg border border-[#1f2c34] bg-[#2a3942] px-2 py-1.5 text-xs text-[#e9edef] outline-none transition focus:border-[#00a884]"
            >
              {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* CRM quick filters */}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setCrmFilters({ assignedTo: '', temperature: '', unassigned: false })}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition',
                !crmFilters.assignedTo && !crmFilters.temperature && !crmFilters.unassigned
                  ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40'
                  : 'bg-transparent text-[#8696a0] border-[#3b4a54] hover:bg-white/5 hover:text-[#aebac1]'
              )}
            >
              All
            </button>
            {activeSp && (
              <button
                type="button"
                onClick={() => setCrmFilters((f) => ({ ...f, assignedTo: activeSp.id, unassigned: false }))}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition',
                  crmFilters.assignedTo === activeSp.id
                    ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40'
                    : 'bg-transparent text-[#8696a0] border-[#3b4a54] hover:bg-white/5 hover:text-[#aebac1]'
                )}
              >
                My Leads
              </button>
            )}
            <button
              type="button"
              onClick={() => setCrmFilters((f) => ({ ...f, unassigned: !f.unassigned, assignedTo: '' }))}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition',
                crmFilters.unassigned
                  ? 'bg-white/15 text-[#e9edef] border-white/20'
                  : 'bg-transparent text-[#8696a0] border-[#3b4a54] hover:bg-white/5 hover:text-[#aebac1]'
              )}
            >
              Unassigned
            </button>
            {TEMP_QUICK.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setCrmFilters((f) => ({ ...f, temperature: f.temperature === t.value ? '' : t.value }))}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition',
                  crmFilters.temperature === t.value
                    ? t.active
                    : 'bg-transparent text-[#8696a0] border-[#3b4a54] hover:bg-white/5 hover:text-[#aebac1]'
                )}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilters((c) => ({ ...c, handoff: !c.handoff }))}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition',
                filters.handoff
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                  : 'bg-transparent text-[#8696a0] border-[#3b4a54] hover:bg-white/5 hover:text-[#aebac1]'
              )}
            >
              Handoff
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 border-b border-red-900/30 bg-red-900/20 px-3 py-2 text-xs text-red-400">
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        {/* Conversation list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              isSelected={conversation.id === selectedId}
              onSelect={setSelectedId}
            />
          ))}
          {!conversations.length && !isLoadingList && (
            <div className="p-8 text-center text-sm text-[#8696a0]">No conversations found.</div>
          )}
        </div>

        {/* Footer — stage breakdown chips */}
        {stageBreakdown.length > 0 && (
          <div className="border-t border-[#1f2c34] bg-[#202c33] px-3 py-2">
            <div className="flex flex-wrap gap-1">
              {stageBreakdown.map((row) => {
                const cfg = STAGE_CONFIG[row.current_stage] || STAGE_CONFIG.unknown;
                return (
                  <span
                    key={row.current_stage}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-[#aebac1]"
                  >
                    <span className={cn('h-1 w-1 rounded-full', cfg.dot)} />
                    {cfg.short}: {row.count}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* MIDDLE — chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DetailPanel
          detail={detail}
          messages={messages}
          isLoading={isLoadingDetail}
          onClearConversation={handleClearConversation}
          isClearing={isClearingConversation}
          onMessagesRefresh={(opts) => loadDetail(opts)}
          onMessagesOnly={loadMessages}
          onLoadOlderMessages={loadOlderMessages}
          hasOlderMessages={messagesPagination?.has_next ?? false}
          isLoadingOlderMessages={isLoadingOlderMessages}
          showLeadPanel={showLeadPanel}
          onToggleLeadPanel={() => setShowLeadPanel((v) => !v)}
        />
      </div>

      {/* RIGHT — lead detail panel (toggleable) */}
      {showLeadPanel && selectedConversation && (
        <LeadDetailPanel
          conversation={selectedConversation}
          salesPersons={salesPersons}
          activeSp={activeSp}
          onClose={() => setShowLeadPanel(false)}
          onUpdate={loadList}
        />
      )}

      <BulkSendDrawer isOpen={isBulkDrawerOpen} onClose={() => setIsBulkDrawerOpen(false)} />
    </div>
  );
}

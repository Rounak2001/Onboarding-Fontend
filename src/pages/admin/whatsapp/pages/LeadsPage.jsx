import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  AlertCircle,
  Inbox,
  Phone,
  RefreshCw,
  Search,
  StickyNote,
} from 'lucide-react';
import { adminUrl } from '../../../../utils/adminPath';
import { cn, selectCls } from '../shared/cn';
import { formatDateTime, formatPhone } from '../shared/format';
import { CATEGORY_OPTIONS, STAGE_CONFIG, STAGE_OPTIONS, TEMP_CONFIG } from '../shared/constants';
import { fetchConversations } from '../shared/api';
import LogCallModal from '../components/LogCallModal';

const TEMP_TABS = [
  { value: '',     label: 'All' },
  { value: 'hot',  label: '🔥 Hot' },
  { value: 'warm', label: '🌤 Warm' },
  { value: 'cold', label: '❄️ Cold' },
];

export default function LeadsPage() {
  const navigate = useNavigate();
  const { salesPersons, activeSp } = useOutletContext();

  const [conversations, setConversations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    stage: '',
    category: '',
    temperature: '',
    assignedTo: '',
    unassigned: false,
  });
  const [logCallFor, setLogCallFor] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchConversations({ ...filters, page });
      setConversations(data.results || []);
      setPagination(data.pagination || null);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load leads.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const total = pagination?.total ?? 0;
  const totalPages = pagination?.total_pages ?? 1;

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
              placeholder="Search name or phone…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>
          <select
            value={filters.stage}
            onChange={(e) => { setFilters((f) => ({ ...f, stage: e.target.value })); setPage(1); }}
            className={`${selectCls} w-auto`}
          >
            {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filters.category}
            onChange={(e) => { setFilters((f) => ({ ...f, category: e.target.value })); setPage(1); }}
            className={`${selectCls} w-auto`}
          >
            {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filters.assignedTo}
            onChange={(e) => { setFilters((f) => ({ ...f, assignedTo: e.target.value, unassigned: false })); setPage(1); }}
            className={`${selectCls} w-auto`}
          >
            <option value="">All assignees</option>
            {activeSp && <option value={activeSp.id}>Me ({activeSp.name})</option>}
            {salesPersons.filter((sp) => sp.id !== activeSp?.id).map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.unassigned}
              onChange={(e) => { setFilters((f) => ({ ...f, unassigned: e.target.checked, assignedTo: '' })); setPage(1); }}
              className="h-3.5 w-3.5 accent-emerald-600"
            />
            Unassigned only
          </label>
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            className="flex items-center justify-center w-10 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={15} className={cn(isLoading && 'animate-spin')} />
          </button>
        </div>

        {/* Temperature tabs */}
        <div className="flex gap-1.5">
          {TEMP_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => { setFilters((f) => ({ ...f, temperature: t.value })); setPage(1); }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                filters.temperature === t.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Temp</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Last activity</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conversations.map((c) => {
                const contact = c.contact || {};
                const name = contact.full_name || contact.whatsapp_profile_name || contact.masked_phone_number || 'Unknown';
                const stage = STAGE_CONFIG[c.current_stage] || STAGE_CONFIG.unknown;
                const temp = TEMP_CONFIG[c.temperature || ''] || TEMP_CONFIG[''];
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(adminUrl('whatsapp/inbox'))}
                        className="text-left"
                      >
                        <p className="font-semibold text-slate-800">{name}</p>
                        <p className="text-[11px] text-slate-500">{formatPhone(contact.phone_number)}</p>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', stage.bg, stage.text)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', stage.dot)} />
                        {stage.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.temperature ? (
                        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', temp.bg, temp.text, temp.border)}>
                          {temp.emoji} {temp.label}
                        </span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {c.assigned_to?.name || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {formatDateTime(c.last_message_at || c.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setLogCallFor(c)}
                          title="Log a call"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600"
                        >
                          <Phone size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(adminUrl('whatsapp/inbox'))}
                          title="Open conversation"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <StickyNote size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!conversations.length && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Inbox size={28} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">No leads match these filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50">
            <p className="text-xs text-slate-600">
              Showing page {pagination.page || 1} of {totalPages} · {total.toLocaleString('en-IN')} leads
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 disabled:opacity-40 hover:bg-slate-100"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 disabled:opacity-40 hover:bg-slate-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {logCallFor && (
        <LogCallModal
          conversation={logCallFor}
          salesPersons={salesPersons}
          activeSp={activeSp}
          onClose={() => setLogCallFor(null)}
          onSaved={() => { setLogCallFor(null); load(); }}
        />
      )}
    </div>
  );
}

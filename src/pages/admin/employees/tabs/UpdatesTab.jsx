import { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { RefreshCw, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { fetchEmployeeDailyReports } from '../staffApi';
import { card } from '../shared/styles';

const PAGE_SIZE = 10;

// The summary is employee-authored HTML — always sanitize before rendering it
// in the admin panel (allow only the editor's tags, strip every attribute).
const SUMMARY_TAGS = ['b', 'strong', 'i', 'em', 'u', 'h2', 'ul', 'ol', 'li', 'p', 'br', 'div', 'span'];
const cleanSummary = (html) => DOMPurify.sanitize(html || '', { ALLOWED_TAGS: SUMMARY_TAGS, ALLOWED_ATTR: [] });
// Rich-text from the editor carries tags; older/plain summaries are bare text
// whose line breaks must be preserved (rendering them as HTML would collapse them).
const isRichText = (s) => /<(\/?(b|strong|i|em|u|h2|ul|ol|li|p|br|div|span))\b[^>]*>/i.test(s || '');

const summaryPanel = {
    fontSize: 14, color: 'var(--admin-text-primary)',
    background: 'var(--admin-row-alt)', borderRadius: 8, padding: '11px 13px',
    borderLeft: '3px solid #3b82f6',
};

const fmtReportDate = (iso) => {
    if (!iso) return '—';
    try {
        return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
        });
    } catch { return iso; }
};

export default function UpdatesTab({ employeeId, token }) {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await fetchEmployeeDailyReports(token, employeeId);
            setReports(data.reports || []);
            setPage(0);
        } catch (e) {
            setError(e.message || 'Failed to load reports.');
        } finally { setLoading(false); }
    }, [token, employeeId]);

    useEffect(() => { load(); }, [load]);

    const totalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
    const pageReports = reports.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    const pillBtn = {
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8,
        fontSize: 12, fontWeight: 700, background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)',
        border: '1px solid var(--admin-border-mid)', cursor: 'pointer',
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
                    {reports.length} report{reports.length === 1 ? '' : 's'} submitted
                </div>
                <button onClick={load} style={pillBtn}><RefreshCw size={14} /> Refresh</button>
            </div>

            {loading && <div style={{ color: 'var(--admin-text-muted)', padding: 20 }}>Loading…</div>}
            {error && !loading && <div style={{ ...card, color: '#ef4444' }}>{error}</div>}

            {!loading && !error && reports.length === 0 && (
                <div style={{ ...card, fontSize: 13, color: 'var(--admin-text-muted)' }}>No reports submitted yet.</div>
            )}

            {!loading && !error && pageReports.map((r) => (
                <div key={r.work_date} style={{ ...card, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                        <CalendarDays size={14} />
                        <span>{fmtReportDate(r.work_date)}</span>
                    </div>
                    {!r.summary && (
                        <div style={summaryPanel}><span style={{ color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>No summary written.</span></div>
                    )}
                    {r.summary && isRichText(r.summary) && (
                        <div className="rte-display" style={summaryPanel} dangerouslySetInnerHTML={{ __html: cleanSummary(r.summary) }} />
                    )}
                    {r.summary && !isRichText(r.summary) && (
                        <div className="rte-display" style={{ ...summaryPanel, whiteSpace: 'pre-wrap' }}>{r.summary}</div>
                    )}
                </div>
            ))}

            {!loading && !error && reports.length > PAGE_SIZE && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 6 }}>
                    <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        style={{ ...pillBtn, opacity: page === 0 ? 0.4 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
                    >
                        <ChevronLeft size={14} /> Prev
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>Page {page + 1} of {totalPages}</span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        style={{ ...pillBtn, opacity: page >= totalPages - 1 ? 0.4 : 1, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

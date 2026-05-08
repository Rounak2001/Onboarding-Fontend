import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../../utils/apiBase';
import { getAdminToken } from '../../utils/adminSession';

const SOFTWARE_LABELS = {
    // ITR
    cleartax_itr: 'ClearTax', tax2win: 'Tax2win', taxbuddy: 'TaxBuddy',
    easyoffice: 'EasyOffice', gen_it: 'Gen IT', saral_taxoffice: 'Saral TaxOffice',
    kdk_expressitr: 'KDK ExpressITR', winman_itr: 'Winman ITR', taxcloud: 'TaxCloud',
    it_portal: 'IT Portal (Direct)', other_itr: 'Other', na_itr: 'N/A',
    // GST
    cleartax_gst: 'ClearTax GST', tallyprime: 'TallyPrime', zoho_books: 'Zoho Books',
    busy: 'Busy Accounting', marg_erp: 'Marg ERP', gen_gst: 'Gen GST',
    vyapar: 'Vyapar', gstn_offline: 'GSTN Offline', kdk_spectrum: 'KDK Spectrum GST',
    winman: 'Winman GST', other_gst: 'Other', na_gst: 'N/A',
    // TDS
    gen_tds: 'Gen TDS', computax: 'CompuTax', saral_tds: 'Saral TDS',
    winman_tds: 'Winman TDS', cleartax_tds: 'ClearTax TDS', kdk_spectrum_tds: 'KDK Spectrum TDS',
    traces_gov: 'TRACES (Govt)', tdsman: 'TDSMan', other_tds: 'Other', na_tds: 'N/A',
};

const label = (id) => SOFTWARE_LABELS[id] || id;

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#6366f1', '#ec4899', '#14b8a6'];

function BarStat({ title, data }) {
    if (!data || data.length === 0) return <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>No data yet.</p>;
    const max = data[0][1];
    return (
        <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--admin-text-strong)' }}>{title}</div>
            {data.map(([id, count], i) => (
                <div key={id} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: 'var(--admin-text-secondary)', fontWeight: 500 }}>{label(id)}</span>
                        <span style={{ color: 'var(--admin-text-strong)', fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--admin-border-soft)' }}>
                        <div style={{ height: 6, borderRadius: 99, width: `${(count / max) * 100}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length], transition: 'width 0.5s' }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function SoftwareSurveyDashboard({ isLight, token: propToken }) {
    const token = propToken || getAdminToken();

    const [stats, setStats] = useState(null);
    const [responses, setResponses] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [sending, setSending] = useState(false);
    const [sendMsg, setSendMsg] = useState('');
    const [testPhone, setTestPhone] = useState('');
    const [testName, setTestName] = useState('');
    const [testSending, setTestSending] = useState(false);
    const [testMsg, setTestMsg] = useState('');
    const [search, setSearch] = useState('');

    const headers = token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

    const fetchData = useCallback(async () => {
        setLoadingStats(true);
        try {
            const res = await fetch(apiUrl('/admin-panel/software-survey/stats/'), { headers });
            if (res.ok) {
                const d = await res.json();
                setStats(d.stats);
                setResponses(d.responses || []);
            }
        } catch (_) {}
        setLoadingStats(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSendAll = async () => {
        if (!window.confirm('Send the CA Software Survey to ALL consultants who haven\'t submitted yet?')) return;
        setSending(true); setSendMsg('');
        try {
            const res = await fetch(apiUrl('/admin-panel/software-survey/send-all/'), { method: 'POST', headers });
            const d = await res.json();
            setSendMsg(d.message || d.error || 'Done');
        } catch (_) { setSendMsg('Failed. Try again.'); }
        setSending(false);
    };

    const handleTestSend = async () => {
        if (!testPhone.trim()) return;
        setTestSending(true); setTestMsg('');
        try {
            const res = await fetch(apiUrl('/admin-panel/software-survey/send-test/'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ phone: testPhone.trim(), name: testName.trim() || 'there' }),
            });
            const d = await res.json();
            setTestMsg(d.message || d.error || 'Done');
        } catch (_) { setTestMsg('Failed. Try again.'); }
        setTestSending(false);
    };

    const filtered = responses.filter(r =>
        !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search)
    );

    const card = (label, value, color = '#3b82f6') => (
        <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: 14, padding: '18px 22px' }}>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{value ?? '—'}</div>
        </div>
    );

    return (
        <div style={{ padding: '24px 0' }}>

            {/* Header actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24, alignItems: 'center' }}>
                <button
                    onClick={handleSendAll}
                    disabled={sending}
                    style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}
                >
                    {sending ? 'Sending...' : '📲 Send to All Pending Consultants'}
                </button>
                <button
                    onClick={fetchData}
                    style={{ background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border)', borderRadius: 10, padding: '10px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                    Refresh
                </button>
                {sendMsg && <span style={{ fontSize: 13, color: sendMsg.includes('Failed') ? '#ef4444' : '#10b981', fontWeight: 600 }}>{sendMsg}</span>}
            </div>

            {/* Summary cards */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
                    {card('Total Consultants', stats.total_consultants, '#6366f1')}
                    {card('Surveys Sent', stats.surveys_sent, '#f59e0b')}
                    {card('Submitted', stats.submitted, '#10b981')}
                    {card('Pending', stats.pending, '#ef4444')}
                    {card('Response Rate', stats.submitted && stats.surveys_sent ? `${Math.round((stats.submitted / stats.surveys_sent) * 100)}%` : '0%', '#3b82f6')}
                </div>
            )}

            {/* Charts */}
            {!loadingStats && stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 28 }}>
                    {[
                        { title: 'ITR Software Usage', data: stats.itr_top },
                        { title: 'GST Software Usage', data: stats.gst_top },
                        { title: 'TDS Software Usage', data: stats.tds_top },
                    ].map(({ title, data }) => (
                        <div key={title} style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: 14, padding: '20px 22px' }}>
                            <BarStat title={title} data={data} />
                        </div>
                    ))}
                </div>
            )}

            {/* Test send panel */}
            <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: 14, padding: '20px 22px', marginBottom: 28 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--admin-text-strong)', marginBottom: 14 }}>🧪 Test — Send to a Number</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: 4 }}>PHONE (with country code)</div>
                        <input
                            value={testPhone}
                            onChange={e => setTestPhone(e.target.value)}
                            placeholder="919373223587"
                            style={{ border: '1px solid var(--admin-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: 'var(--admin-input-bg, var(--admin-card-bg))', color: 'var(--admin-text-strong)', width: 200 }}
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: 4 }}>NAME (variable in template)</div>
                        <input
                            value={testName}
                            onChange={e => setTestName(e.target.value)}
                            placeholder="Rounak"
                            style={{ border: '1px solid var(--admin-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: 'var(--admin-input-bg, var(--admin-card-bg))', color: 'var(--admin-text-strong)', width: 160 }}
                        />
                    </div>
                    <button
                        onClick={handleTestSend}
                        disabled={testSending || !testPhone.trim()}
                        style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: testSending || !testPhone.trim() ? 'not-allowed' : 'pointer', opacity: testSending ? 0.7 : 1 }}
                    >
                        {testSending ? 'Sending...' : 'Send'}
                    </button>
                    {testMsg && <span style={{ fontSize: 13, color: testMsg.includes('Failed') || testMsg.toLowerCase().includes('error') ? '#ef4444' : '#10b981', fontWeight: 600 }}>{testMsg}</span>}
                </div>
            </div>

            {/* Responses table */}
            <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--admin-text-strong)' }}>Responses ({filtered.length})</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or phone..."
                        style={{ border: '1px solid var(--admin-border)', borderRadius: 8, padding: '6px 12px', fontSize: 13, background: 'var(--admin-input-bg, var(--admin-card-bg))', color: 'var(--admin-text-strong)', width: 220, marginLeft: 'auto' }}
                    />
                </div>
                {loadingStats ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>Loading...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>No responses yet.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: 'var(--admin-border-soft)' }}>
                                    {['Consultant', 'Phone', 'ITR', 'GST', 'TDS', 'Submitted'].map(h => (
                                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => (
                                    <tr key={r.id} style={{ borderTop: '1px solid var(--admin-border-soft)', background: i % 2 === 0 ? 'transparent' : 'var(--admin-border-soft)' }}>
                                        <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--admin-text-strong)', whiteSpace: 'nowrap' }}>{r.name}</td>
                                        <td style={{ padding: '10px 16px', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>{r.phone}</td>
                                        {['itr_software', 'gst_software', 'tds_software'].map(key => (
                                            <td key={key} style={{ padding: '10px 16px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                    {(r[key] || []).map(s => (
                                                        <span key={s} style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{label(s)}</span>
                                                    ))}
                                                    {r[key.replace('_software', '_other')] && (
                                                        <span style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>+{r[key.replace('_software', '_other')]}</span>
                                                    )}
                                                </div>
                                            </td>
                                        ))}
                                        <td style={{ padding: '10px 16px', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                                            {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

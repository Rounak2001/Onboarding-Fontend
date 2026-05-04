import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { readResponsePayload } from '../../utils/http';
import AdminThemeToggle from './AdminThemeToggle';
import AdminBrandLogo from './AdminBrandLogo';
import { useAdminTheme } from './adminTheme';
import AdminClientList from './AdminClientList';
import AdminSupportList from './AdminSupportList';
import AdminServiceList from './AdminServiceList';
import AdminTransactionList from './AdminTransactionList';
import AdminCartList from './AdminCartList';
import CallLogs from './CallLogs';
import AdminDateRangePicker from './AdminDateRangePicker';
import { LayoutDashboard, Users, UserSquare, Phone, ChevronLeft, ChevronRight, Menu, TrendingUp, PieChart as PieChartIcon, Shield, Activity, LifeBuoy, Briefcase, Receipt, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import IndiaMap from './IndiaMap';
import { normalizeAssessmentDomainLabel } from '../assessment/domainLabels';

const PAGE_SIZE = 50;
const STATUS_FILTER_OPTIONS = [
    'New Join', 'Profile Details', 'Gov ID', 'Face Verification',
    'Degree Upload', 'Assessment Ongoing',
    'Credentials Sent', 'Credentials Failed', 'Retry', 'Disqualified',
];
const ASSESSMENT_SUBSTATUS_OPTIONS = [
    { value: 'all', label: 'All stages' },
    { value: 'mcq', label: 'MCQ' },
    { value: 'video', label: 'Video' },
];
const JOINED_DATE_OPTIONS = [
    { value: 'all', label: 'All joined dates' },
    { value: 'today', label: 'Joined Today' },
    { value: 'last_3_days', label: 'Last 3 days' },
    { value: 'last_5_days', label: 'Last 5 days' },
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_15_days', label: 'Last 15 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
];
const STATUS_COLORS = {
    'New Join': { bg: 'rgba(148,163,184,0.12)', color: 'var(--admin-text-secondary)' },
    'Profile Details': { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
    'Gov ID': { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    'Face Verification': { bg: 'rgba(45,212,191,0.12)', color: '#2dd4bf' },
    'Degree Upload': { bg: 'rgba(56,189,248,0.12)', color: '#38bdf8' },
    'Assessment Ongoing': { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
    MCQ: { bg: 'rgba(129,140,248,0.12)', color: '#818cf8' },
    Completed: { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
    'Credentials Sent': { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    'Credentials Failed': { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
    Retry: { bg: 'rgba(251,146,60,0.12)', color: '#fb923c' },
    Disqualified: { bg: 'rgba(248,113,113,0.14)', color: '#f87171' },
};
const SUBSTATUS_COLORS = {
    MCQ: { bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
    Video: { bg: 'rgba(139,92,246,0.12)', color: '#7c3aed' },
};

const ChevronIcon = ({ open }) => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 20 20"
        aria-hidden="true"
        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}
    >
        <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CheckIcon = ({ visible }) => (
    <svg width="11" height="11" viewBox="0 0 20 20" aria-hidden="true" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.14s ease' }}>
        <path d="M4.5 10.5L8.2 14.2L15.5 6.9" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CloseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true" style={{ display: 'block' }}>
        <path d="M6 6L14 14M14 6L6 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const cleanErrorMessage = (payload, fallback) => {
    const message = String(payload?.error || payload?.detail || fallback || '').trim();
    if (!message || message.startsWith('<!DOCTYPE') || message.startsWith('<html')) return fallback;
    return message.length > 180 ? `${message.slice(0, 180)}...` : message;
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isLight, themeVars, toggleTheme } = useAdminTheme();
    const token = localStorage.getItem('admin_token');
    const searchRef = useRef('');
    const hasInitializedSearchEffect = useRef(false);
    const statusMenuRef = useRef(null);

    const [transactionFilter, setTransactionFilter] = useState('all');
    const [transactionStats, setTransactionStats] = useState({ total_revenue: 0, total_paid_to_consultants: 0, pending_amount: 0 });
    const [cartStats, setCartStats] = useState({ total_carts: 0, active_carts: 0, abandoned_value: 0 });
    const [serviceStats, setServiceStats] = useState({ total: 0, active: 0, pending: 0, completed: 0, active_consultants: 0, active_clients: 0 });

    const [consultants, setConsultants] = useState([]);
    const [stats, setStats] = useState({ total: 0, status_counts: {} });
    const [stateViewMode, setStateViewMode] = useState('map'); // 'map' or 'list'
    const [search, setSearch] = useState('');
    const [statusFilters, setStatusFilters] = useState([]);
    const [assessmentSubstatusFilter, setAssessmentSubstatusFilter] = useState('all');
    const [joinedDateFilter, setJoinedDateFilter] = useState('all');
    const [cardFilter, setCardFilter] = useState('total');
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasServicesFilter, setHasServicesFilter] = useState('all');
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [dashboardClientTotal, setDashboardClientTotal] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [statusMenuOpen, setStatusMenuOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportColumns, setExportColumns] = useState([]);
    const [defaultExportColumns, setDefaultExportColumns] = useState([]);
    const [selectedExportColumns, setSelectedExportColumns] = useState([]);
    const [savedExportColumns, setSavedExportColumns] = useState([]);
    const [exportPreferencesLoaded, setExportPreferencesLoaded] = useState(false);
    const [exportPreferencesLoading, setExportPreferencesLoading] = useState(false);
    const [exportPreferencesSaving, setExportPreferencesSaving] = useState(false);
    const [exportPreferencesError, setExportPreferencesError] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState('');
    const [ageFilter, setAgeFilter] = useState('');
    const deriveTabFromPath = (path) => {
        const p = path.toLowerCase();
        if (p.includes('call-log')) return 'call-logs';
        if (p.includes('consultant')) return 'consultant';
        if (p.includes('client')) return 'client';
        if (p.includes('support')) return 'support';
        if (p.includes('service')) return 'services';
        if (p.includes('transaction')) return 'transactions';
        if (p.includes('cart')) return 'carts';
        return 'dashboard';
    };
    const [activeTab, setActiveTab] = useState(() => deriveTabFromPath(window.location.pathname));

    // Sync activeTab when the URL changes (e.g. via navigate() or browser back)
    useEffect(() => {
        setActiveTab(deriveTabFromPath(location.pathname));
    }, [location.pathname]);
    const [analyticsDateRange, setAnalyticsDateRange] = useState('all');
    const [onboardingRange, setOnboardingRange] = useState('30d');
    const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth > 768 : true));
    const [dispatchingDueNotifications, setDispatchingDueNotifications] = useState(false);
    const [ageChartVisibility, setAgeChartVisibility] = useState({ registered: true, credentials: true });

    const [viewportWidth, setViewportWidth] = useState(
        () => (typeof window !== 'undefined' ? window.innerWidth : 1280),
    );
    const [isChartReady, setIsChartReady] = useState(false);
    const showAssessmentSubstatus = statusFilters.includes('Assessment Ongoing');
    const isMobile = viewportWidth <= 768;
    const isNarrowMobile = viewportWidth <= 430;

    const statusCounts = stats?.status_counts || {};
    const totalValue = Number(stats?.total || 0);
    const consultantsValue = Number(statusCounts['Credentials Sent'] ?? stats?.working ?? 0);
    const spamLeadsValue = Number(statusCounts['New Join'] || 0);
    const disqualifiedValue = Number(statusCounts['Disqualified'] ?? stats?.violated ?? 0);
    const inProgressValue = Math.max(0, totalValue - spamLeadsValue - consultantsValue - disqualifiedValue);

    const revenueValue = Number(stats?.total_revenue || transactionStats?.total_revenue || 0);
    const payoutsValue = Number(stats?.total_payouts || transactionStats?.total_paid_to_consultants || 0);
    const settlementsValue = Number(transactionStats?.pending_amount || 0);
    const ticketValue = Number(stats?.open_tickets || 0);

    const activeConsultantCount = Number(serviceStats?.active_consultants || 0);
    const activeClientCount = Number(serviceStats?.active_clients || 0);
    const activeCartCount = Number(cartStats?.active_carts || 0);

    const summaryCards = [
        {
            filterKey: 'total',
            label: 'Total',
            value: totalValue,
            accent: isLight ? '#64748B' : '#94A3B8',
            border: isLight ? 'rgba(100,116,139,0.30)' : 'rgba(148,163,184,0.35)',
            background: isLight
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.98) 100%)'
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(24,35,56,0.95) 100%)',
        },
        {
            filterKey: 'consultants',
            label: 'Consultants',
            value: consultantsValue,
            accent: isLight ? '#059669' : '#34D399',
            border: isLight ? 'rgba(5,150,105,0.30)' : 'rgba(16,185,129,0.30)',
            background: isLight
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(236,253,245,0.98) 100%)'
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(12,44,42,0.92) 100%)',
        },
        {
            filterKey: 'in_progress',
            label: 'In Progress',
            value: inProgressValue,
            accent: isLight ? '#2563EB' : '#60A5FA',
            border: isLight ? 'rgba(37,99,235,0.30)' : 'rgba(96,165,250,0.30)',
            background: isLight
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(239,246,255,0.98) 100%)'
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(18,35,73,0.92) 100%)',
        },
        {
            filterKey: 'spam_leads',
            label: 'Spam Leads',
            value: spamLeadsValue,
            accent: isLight ? '#D97706' : '#FBBF24',
            border: isLight ? 'rgba(217,119,6,0.32)' : 'rgba(251,191,36,0.32)',
            background: isLight
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,247,237,0.98) 100%)'
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(54,39,16,0.92) 100%)',
        },
        {
            filterKey: 'disqualified',
            label: 'Disqualified',
            value: disqualifiedValue,
            accent: isLight ? '#DC2626' : '#FB7185',
            border: isLight ? 'rgba(220,38,38,0.30)' : 'rgba(251,113,133,0.30)',
            background: isLight
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,241,242,0.98) 100%)'
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(41,22,36,0.92) 100%)',
        },
    ];

    const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);
    const resetSession = useCallback(() => {
        localStorage.removeItem('admin_token');
        navigate(adminUrl());
    }, [navigate]);

    const fetchConsultants = useCallback(async (
        pg = 1,
        currentSearch = search,
        currentStatuses = statusFilters,
        currentAssessmentSubstatus = assessmentSubstatusFilter,
        currentJoinedDate = joinedDateFilter,
        currentCardFilter = cardFilter,
        currentState = stateFilter,
        currentService = serviceFilter,
        currentAge = ageFilter,
        currentHasServices = hasServicesFilter,
        includeAnalytics = null
    ) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: String(pg), page_size: String(PAGE_SIZE) });
            if (currentSearch.trim()) params.set('search', currentSearch.trim());
            currentStatuses.forEach((statusValue) => params.append('status', statusValue));
            if (currentStatuses.includes('Assessment Ongoing') && currentAssessmentSubstatus !== 'all') {
                params.set('assessment_substatus', currentAssessmentSubstatus);
            }
            if (currentJoinedDate !== 'all') params.set('joined_range', currentJoinedDate);
            if (currentCardFilter && currentCardFilter !== 'total') params.set('card_filter', currentCardFilter);
            if (currentState) params.set('state', currentState);
            if (currentService) params.set('service', currentService);
            if (currentAge) params.set('age_range', currentAge);
            if (currentHasServices === 'true') params.set('has_services', 'true');

            // Only include expensive analytics if we're on the dashboard tab or explicitly requested
            const shouldIncludeAnalytics = includeAnalytics !== null ? includeAnalytics : (activeTab === 'dashboard');
            if (shouldIncludeAnalytics) {
                params.set('include_analytics', 'true');
            }

            const res = await fetch(apiUrl(`/admin-panel/consultants/?${params}`), { headers: authHeaders });
            if (res.status === 401 || res.status === 403) return resetSession();
            const data = await res.json();
            setConsultants(data.consultants || []);
            setStats(data.stats || { total: 0, status_counts: {} });
            setTotalPages(data.total_pages || 1);
            setTotalCount(data.total || 0);
            setPage(pg);
        } catch {
            setError('Failed to load consultants');
        } finally {
            setLoading(false);
        }
    }, [activeTab, assessmentSubstatusFilter, authHeaders, cardFilter, joinedDateFilter, resetSession, search, statusFilters, stateFilter, serviceFilter, ageFilter, hasServicesFilter]);

    // Fetch once on mount, then debounce search/filter changes into a single request.
    useEffect(() => {
        if (!token && !import.meta.env.DEV) navigate(adminUrl());
    }, [navigate, token]);

    useEffect(() => {
        if (!hasInitializedSearchEffect.current) {
            hasInitializedSearchEffect.current = true;
            return undefined;
        }
        searchRef.current = search;
        const timer = setTimeout(() => {
            if (searchRef.current === search) fetchConsultants(1, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter, cardFilter, stateFilter, serviceFilter, ageFilter, hasServicesFilter);
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        if (!token && !import.meta.env.DEV) return;
        fetchConsultants(1, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter, cardFilter, stateFilter, serviceFilter, ageFilter, hasServicesFilter);

        // Fetch dashboard metrics when activeTab is dashboard
        if (activeTab === 'dashboard') {
            fetch(apiUrl('/admin-panel/global-transactions/'), { headers: authHeaders })
                .then(res => res.json())
                .then(data => setTransactionStats(data.stats))
                .catch(err => console.error("Error fetching transactions:", err));

            fetch(apiUrl('/admin-panel/global-carts/'), { headers: authHeaders })
                .then(res => res.json())
                .then(data => setCartStats(data.stats))
                .catch(err => console.error("Error fetching carts:", err));

            fetch(apiUrl('/admin-panel/global-services/'), { headers: authHeaders })
                .then(res => res.json())
                .then(data => setServiceStats(data.stats))
                .catch(err => console.error("Error fetching services:", err));
        }
    }, [activeTab, statusFilters, assessmentSubstatusFilter, joinedDateFilter, cardFilter, stateFilter, serviceFilter, ageFilter, hasServicesFilter, token, authHeaders, fetchConsultants]);

    useEffect(() => {
        if (!showAssessmentSubstatus && assessmentSubstatusFilter !== 'all') {
            setAssessmentSubstatusFilter('all');
        }
    }, [showAssessmentSubstatus, assessmentSubstatusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => setIsChartReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!exportModalOpen || typeof document === 'undefined') return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [exportModalOpen]);

    useEffect(() => {
        if (!statusMenuOpen) return undefined;
        const handlePointerDown = (event) => {
            if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
                setStatusMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
        };
    }, [statusMenuOpen]);

    const normalizeAdminStatus = (statusValue) => {
        const raw = String(statusValue || '').trim();
        if (!raw) return 'New Join';
        const normalized = raw.toLowerCase();
        if (normalized === 'completed') return 'Credentials Failed';
        if (normalized === 'credentials not sent') return 'Credentials Failed';
        return raw;
    };

    const sorted = useMemo(() => {
        const toNum = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };
        const toDate = (v) => {
            const d = v ? new Date(v) : null;
            return d && !Number.isNaN(d.getTime()) ? d.getTime() : null;
        };
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...consultants].sort((a, b) => {
            if (sortKey === 'name') return String(a?.full_name || a?.email || '').localeCompare(String(b?.full_name || b?.email || '')) * dir;
            if (sortKey === 'status') {
                const statusA = normalizeAdminStatus(a?.assessment_display_status || a?.assessment_status);
                const statusB = normalizeAdminStatus(b?.assessment_display_status || b?.assessment_status);
                return String(statusA).localeCompare(String(statusB)) * dir;
            }
            if (sortKey === 'score') return ((toNum(a?.assessment_score) ?? -1) - (toNum(b?.assessment_score) ?? -1)) * dir;
            if (sortKey === 'updated_at') return ((toDate(a?.updated_at) ?? 0) - (toDate(b?.updated_at) ?? 0)) * dir;
            if (sortKey === 'assessment_count') return ((toNum(a?.assessment_count) ?? 0) - (toNum(b?.assessment_count) ?? 0)) * dir;
            return ((toDate(a?.created_at) ?? 0) - (toDate(b?.created_at) ?? 0)) * dir;
        });
    }, [consultants, sortDir, sortKey]);

    const setSort = (key) => {
        setSortKey((prev) => {
            if (prev !== key) {
                setSortDir('desc');
                return key;
            }
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
            return prev;
        });
    };

    const sortIndicator = (key) => {
        const isActive = sortKey === key;
        const upColor = isActive && sortDir === 'asc' ? '#10b981' : 'var(--admin-text-muted)';
        const downColor = isActive && sortDir === 'desc' ? '#10b981' : 'var(--admin-text-muted)';
        const inactiveOpacity = isActive ? 0.45 : 0.35;

        return (
            <span
                aria-hidden="true"
                style={{
                    marginLeft: 8,
                    display: 'inline-flex',
                    flexDirection: 'column',
                    gap: 2,
                    verticalAlign: 'middle',
                }}
            >
                <span
                    style={{
                        width: 0,
                        height: 0,
                        borderLeft: '4px solid transparent',
                        borderRight: '4px solid transparent',
                        borderBottom: `6px solid ${upColor}`,
                        opacity: isActive && sortDir === 'asc' ? 1 : inactiveOpacity,
                    }}
                />
                <span
                    style={{
                        width: 0,
                        height: 0,
                        borderLeft: '4px solid transparent',
                        borderRight: '4px solid transparent',
                        borderTop: `6px solid ${downColor}`,
                        opacity: isActive && sortDir === 'desc' ? 1 : inactiveOpacity,
                    }}
                />
            </span>
        );
    };

    const toggleStatusFilter = (statusValue) => {
        setCardFilter('total');
        setStatusFilters((prev) => (
            prev.includes(statusValue)
                ? prev.filter((value) => value !== statusValue)
                : [...prev, statusValue]
        ));
    };

    const statusSelectionLabel = statusFilters.length === 0
        ? 'All statuses'
        : statusFilters.length === 1
            ? statusFilters[0]
            : `${statusFilters.length} statuses`;

    const selectedExportColumnSet = useMemo(() => new Set(selectedExportColumns), [selectedExportColumns]);
    const exportColumnsByKey = useMemo(() => {
        const map = new Map();
        exportColumns.forEach((column) => map.set(column.key, column));
        return map;
    }, [exportColumns]);
    const exportColumnGroups = useMemo(() => {
        const groups = [];
        const groupMap = new Map();
        exportColumns.forEach((column) => {
            const groupName = column.group || 'Other';
            if (!groupMap.has(groupName)) {
                const group = { name: groupName, columns: [] };
                groupMap.set(groupName, group);
                groups.push(group);
            }
            groupMap.get(groupName).columns.push(column);
        });
        return groups;
    }, [exportColumns]);
    const selectedExportColumnLabels = useMemo(() => (
        selectedExportColumns.map((key) => exportColumnsByKey.get(key)?.header || key)
    ), [exportColumnsByKey, selectedExportColumns]);
    const hasExportPreferenceChanges = selectedExportColumns.join('|') !== savedExportColumns.join('|');
    const handleCardFilterChange = (nextCardFilter) => {
        setCardFilter(nextCardFilter);
        setStatusMenuOpen(false);
        setStatusFilters([]);
        setAssessmentSubstatusFilter('all');
        setStateFilter('');
        setServiceFilter('');
    };

    const loadExportPreferences = async (force = false) => {
        if (exportPreferencesLoaded && !force) return;
        setExportPreferencesLoading(true);
        setExportPreferencesError('');
        try {
            const res = await fetch(apiUrl('/admin-panel/consultants/export/preferences/'), { headers: authHeaders });
            if (res.status === 401 || res.status === 403) return resetSession();
            const payload = await readResponsePayload(res);
            if (!res.ok) {
                setExportPreferencesError(cleanErrorMessage(payload, 'Failed to load export columns. Refresh after the backend migration is applied.'));
                return;
            }
            const columns = Array.isArray(payload.columns) ? payload.columns : [];
            const defaults = Array.isArray(payload.default_columns) ? payload.default_columns : columns.map((column) => column.key);
            const selected = Array.isArray(payload.selected_columns) ? payload.selected_columns : defaults;
            setExportColumns(columns);
            setDefaultExportColumns(defaults);
            setSelectedExportColumns(selected);
            setSavedExportColumns(selected);
            setExportPreferencesLoaded(true);
        } catch {
            setExportPreferencesError('Failed to load export columns');
        } finally {
            setExportPreferencesLoading(false);
        }
    };

    const openExportModal = () => {
        setExportModalOpen(true);
        loadExportPreferences();
    };

    const buildExportParams = (columns) => {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        statusFilters.forEach((statusValue) => params.append('status', statusValue));
        if (showAssessmentSubstatus && assessmentSubstatusFilter !== 'all') {
            params.set('assessment_substatus', assessmentSubstatusFilter);
        }
        if (joinedDateFilter !== 'all') params.set('joined_range', joinedDateFilter);
        if (cardFilter && cardFilter !== 'total') params.set('card_filter', cardFilter);
        if (stateFilter) params.set('state', stateFilter);
        if (serviceFilter) params.set('service', serviceFilter);
        if (hasServicesFilter === 'true') params.set('has_services', 'true');
        if (ageFilter) params.set('age_range', ageFilter);
        if (columns?.length) params.set('columns', columns.join(','));
        return params;
    };

    const downloadExportExcel = async (columns = selectedExportColumns) => {
        if (!columns.length) {
            alert('Select at least one column to export.');
            return false;
        }
        setExporting(true);
        try {
            const params = buildExportParams(columns);
            const res = await fetch(apiUrl(`/admin-panel/consultants/export/?${params}`), { headers: authHeaders });
            if (res.status === 401 || res.status === 403) return resetSession();
            if (!res.ok) {
                const payload = await readResponsePayload(res);
                return alert(cleanErrorMessage(payload, 'Export failed'));
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const contentDisposition = res.headers.get('content-disposition') || '';
            const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
            const serverFilename = filenameMatch ? decodeURIComponent(filenameMatch[1].replace(/"/g, '')) : '';
            a.download = serverFilename || `consultants_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.setTimeout(() => window.URL.revokeObjectURL(url), 1200);
            document.body.removeChild(a);
            setExportModalOpen(false);
            return true;
        } catch {
            alert('Failed to export');
            return false;
        } finally {
            setExporting(false);
        }
    };

    const saveExportPreferences = async () => {
        if (!selectedExportColumns.length) {
            alert('Select at least one column to save.');
            return false;
        }
        setExportPreferencesSaving(true);
        setExportPreferencesError('');
        try {
            const res = await fetch(apiUrl('/admin-panel/consultants/export/preferences/'), {
                method: 'PUT',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ selected_columns: selectedExportColumns }),
            });
            if (res.status === 401 || res.status === 403) return resetSession();
            const payload = await readResponsePayload(res);
            if (!res.ok) {
                setExportPreferencesError(cleanErrorMessage(payload, 'Failed to save export columns'));
                return false;
            }
            const selected = Array.isArray(payload.selected_columns) ? payload.selected_columns : selectedExportColumns;
            setSelectedExportColumns(selected);
            setSavedExportColumns(selected);
            setExportColumns(Array.isArray(payload.columns) ? payload.columns : exportColumns);
            setDefaultExportColumns(Array.isArray(payload.default_columns) ? payload.default_columns : defaultExportColumns);
            return true;
        } catch {
            setExportPreferencesError('Failed to save export columns');
            return false;
        } finally {
            setExportPreferencesSaving(false);
        }
    };

    const saveAndDownloadExport = async () => {
        const saved = await saveExportPreferences();
        if (saved) await downloadExportExcel(selectedExportColumns);
    };

    const toggleExportColumn = (key) => {
        setSelectedExportColumns((prev) => (
            prev.includes(key)
                ? prev.filter((value) => value !== key)
                : [...prev, key]
        ));
    };

    const moveExportColumn = (index, direction) => {
        setSelectedExportColumns((prev) => {
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= prev.length) return prev;
            const next = [...prev];
            [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
            return next;
        });
    };

    const handleExportExcel = () => {
        openExportModal();
    };

    const handleDispatchDueNotifications = async () => {
        if (!token) return;
        setDispatchingDueNotifications(true);
        try {
            const res = await fetch(apiUrl('/admin-panel/consultants/dispatch-due-notifications/'), {
                method: 'POST',
                headers: authHeaders,
            });
            const payload = await readResponsePayload(res);
            if (res.ok) {
                alert(payload.message || 'Due notifications dispatched successfully');
            } else {
                alert(cleanErrorMessage(payload, 'Failed to dispatch notifications'));
            }
        } catch {
            alert('Failed to dispatch notifications');
        } finally {
            setExportPreferencesSaving(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        fetch(apiUrl('/admin-panel/clients/?page_size=1'), { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.ok ? res.json() : { total: 0 })
            .then(data => setDashboardClientTotal(data.total || 0))
            .catch(() => setDashboardClientTotal(0));
    }, [token]);

    const [callLogsStats, setCallLogsStats] = useState(null);
    useEffect(() => {
        if (!token) return;
        fetch(apiUrl('/calls/admin-logs/?limit=1'), { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.ok ? res.json() : { stats: null })
            .then(data => setCallLogsStats(data.stats || null))
            .catch(() => setCallLogsStats(null));
    }, [token]);

    const dynamicConTotal = Math.max(1, totalCount);
    const dynClientTotal = Math.max(0, dashboardClientTotal);

    const chartData = stats?.growth_distribution || [];
    const ageData = stats?.age_distribution || [];
    // Build call logs chart from daily/weekly breakdown if available, else use daily/weekly/monthly as bar points
    const callLogsData = callLogsStats?.daily_distribution || (callLogsStats ? [
        { name: 'Daily', value: callLogsStats.daily || 0 },
        { name: 'Weekly', value: callLogsStats.weekly || 0 },
        { name: 'Monthly', value: callLogsStats.monthly || 0 },
    ] : []);

    const serviceData = (stats?.service_distribution || [])
        .filter(s => s.slug !== 'not_specified' && s.name !== 'Not Specified')
        .map(s => ({
            name: s.name,
            slug: s.slug || s.name.toLowerCase(),
            registered: s.registered || 0,
            credentials: s.credentials || 0,
            avg_score: s.avg_score || 0
        }));

    const notSpecifiedFromBackend = (stats?.service_distribution || []).find(s => s.slug === 'not_specified' || s.name === 'Not Specified');
    const totalNotSpecified = (notSpecifiedFromBackend?.registered || 0);
    const stateData = stats?.state_distribution || [];

    const consultantNumbers = Number(statusCounts['Credentials Sent'] ?? stats?.working ?? 0);
    const payingClients = dynClientTotal;
    const todaysCalls = Number(callLogsStats?.daily ?? stats?.todays_calls ?? 0);
    const consultantClientRatio = payingClients === 0 ? `${consultantNumbers}:0` : `${consultantNumbers}:${payingClients}`;

    const dynamicRatioText = dynClientTotal === 0 ? '0:1' : `${(dynClientTotal / dynamicConTotal).toFixed(1)}:1`;
    const dynamicSpamPct = totalCount === 0 ? 0 : Math.round((Number(stats?.status_counts?.['New Join'] || 0) / totalCount) * 100);
    const leadRatio = totalCount === 0 ? 0 : 100 - dynamicSpamPct;


    return (
        <div className="tp-page" style={{ ...themeVars, height: '100vh', display: 'flex', overflow: 'hidden', background: 'var(--admin-page-bg)', fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--admin-text-strong)' }}>

            {/* SIDEBAR NAVIGATION */}
            <div style={{
                width: sidebarOpen ? 260 : (isMobile ? 0 : 80),
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'var(--admin-header-bg)',
                borderRight: '1px solid var(--admin-border-soft)',
                display: 'flex', flexDirection: 'column', flexShrink: 0,
                overflow: 'hidden', position: isMobile ? 'absolute' : 'relative',
                height: '100%', zIndex: 40,
                transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)'
            }}>
                <div style={{ height: 72, padding: sidebarOpen ? '0 24px' : '0', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', borderBottom: '1px solid var(--admin-border-soft)' }}>
                    {sidebarOpen ? <AdminBrandLogo isLight={isLight} height={26} /> : <div onClick={() => setSidebarOpen(true)} style={{ cursor: 'pointer' }}><AdminBrandLogo isLight={isLight} height={20} iconOnly /></div>}
                </div>

                <div style={{ flex: 1, padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                        { id: 'dashboard', icon: LayoutDashboard, label: 'Analytics' },
                        { id: 'consultant', icon: Users, label: 'Consultants' },
                        { id: 'client', icon: UserSquare, label: 'Clients' },
                        { id: 'support', icon: LifeBuoy, label: 'Support' },
                        { id: 'services', icon: Briefcase, label: 'Services' },
                        { id: 'transactions', icon: Receipt, label: 'Transactions' },
                        { id: 'carts', icon: ShoppingCart, label: 'Carts' },
                        { id: 'call-logs', icon: Phone, label: 'Call Logs' },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.id === 'dashboard') {
                                    setServiceFilter('');
                                    setStateFilter('');
                                    setCardFilter('total');
                                    setStatusFilters([]);
                                    setAssessmentSubstatusFilter('all');
                                    setSearch('');
                                    setJoinedDateFilter('all');
                                }
                                const urlMap = {
                                    'dashboard': 'dashboard',
                                    'consultant': 'consultants',
                                    'client': 'clients',
                                    'support': 'support',
                                    'services': 'services',
                                    'transactions': 'transactions',
                                    'carts': 'carts',
                                    'call-logs': 'call-logs',
                                };
                                navigate(adminUrl(urlMap[item.id] || item.id));
                                setActiveTab(item.id);
                                if (isMobile) setSidebarOpen(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', padding: '12px', borderRadius: 12,
                                background: activeTab === item.id ? (isLight ? '#eff6ff' : 'rgba(59,130,246,0.15)') : 'transparent',
                                color: activeTab === item.id ? '#3b82f6' : 'var(--admin-text-secondary)',
                                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: sidebarOpen ? 16 : 0,
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <item.icon size={22} />
                            {sidebarOpen && <span style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</span>}
                        </button>
                    ))}
                </div>

                {!isMobile && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--admin-border-soft)', display: 'flex', justifyContent: sidebarOpen ? 'flex-end' : 'center' }}>
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-soft)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--admin-text-secondary)', transition: 'transform 0.2s' }}>
                            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                        </button>
                    </div>
                )}
            </div>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative', background: 'var(--admin-page-bg)' }}>

                {isMobile && sidebarOpen && (
                    <div onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 35 }} />
                )}

                <header style={{ background: 'var(--admin-header-bg)', borderBottom: '1px solid var(--admin-border-soft)', position: 'relative', zIndex: 30 }}>
                    <div style={{
                        padding: isMobile ? '10px 14px' : '0 32px',
                        minHeight: 72,
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: isMobile ? 'wrap' : 'nowrap',
                        gap: isMobile ? 10 : 14,
                    }}>
                        {isMobile && (
                            <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-primary)' }}>
                                <Menu size={24} />
                            </button>
                        )}
                        <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--admin-text-primary)' }}>
                            {activeTab === 'dashboard' ? 'Platform Analytics'
                                : activeTab === 'consultant' ? 'Consultants'
                                    : activeTab === 'support' ? 'Support Tickets'
                                        : activeTab === 'services' ? 'Services'
                                            : activeTab === 'transactions' ? 'Transactions'
                                                : activeTab === 'carts' ? 'Carts'
                                                    : activeTab === 'call-logs' ? 'Call Logs'
                                                        : 'Clients'}
                        </span>

                        <div style={{
                            marginLeft: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'nowrap',
                            gap: isMobile ? 8 : 12,
                        }}>
                            <AdminThemeToggle isLight={isLight} onToggle={toggleTheme} />
                            {activeTab === 'consultant' && <span style={{ padding: isMobile ? '4px 10px' : '4px 12px', borderRadius: 20, fontSize: isMobile ? 10 : 11, fontWeight: 800, background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>Showing {totalCount}</span>}
                            <button className="tp-btn" onClick={() => navigate(adminUrl('emails'))} style={{ padding: isMobile ? '7px 10px' : '8px 14px', borderRadius: 8, fontSize: isMobile ? 11 : 12, fontWeight: 700, background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)', cursor: 'pointer' }}>Emails</button>
                            {activeTab === 'consultant' && <button className="tp-btn" onClick={handleDispatchDueNotifications} disabled={dispatchingDueNotifications} style={{ padding: isMobile ? '7px 10px' : '8px 14px', borderRadius: 8, fontSize: isMobile ? 11 : 12, fontWeight: 700, background: dispatchingDueNotifications ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.16)', color: dispatchingDueNotifications ? 'var(--admin-text-secondary)' : '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', cursor: dispatchingDueNotifications ? 'not-allowed' : 'pointer' }}>{dispatchingDueNotifications ? 'Dispatching...' : 'Due Emails'}</button>}
                            {activeTab === 'consultant' && <button className="tp-btn" onClick={handleExportExcel} disabled={exporting || loading} style={{ padding: isMobile ? '7px 10px' : '8px 14px', borderRadius: 8, fontSize: isMobile ? 11 : 12, fontWeight: 700, background: exporting ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.15)', color: exporting ? 'var(--admin-text-muted)' : '#34d399', border: '1px solid rgba(16,185,129,0.25)', cursor: exporting || loading ? 'not-allowed' : 'pointer' }}>Export</button>}
                            <button className="tp-btn" onClick={() => (activeTab === 'consultant' ? fetchConsultants(page) : null)} disabled={loading} style={{ padding: isMobile ? '7px 10px' : '8px 14px', borderRadius: 8, fontSize: isMobile ? 11 : 12, fontWeight: 700, background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: loading ? 'not-allowed' : 'pointer' }}>Refresh</button>
                            <button className="tp-btn" onClick={resetSession} style={{ padding: isMobile ? '7px 10px' : '8px 16px', borderRadius: 8, fontSize: isMobile ? 11 : 12, fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>Logout</button>
                        </div>
                    </div>
                </header>

                <main style={{ flex: 'none' }}>
                    {exportModalOpen && typeof document !== 'undefined' && createPortal((
                        <div
                            role="presentation"
                            onMouseDown={(event) => {
                                if (event.target === event.currentTarget) setExportModalOpen(false);
                            }}
                            style={{
                                ...themeVars,
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                width: '100vw',
                                height: '100dvh',
                                zIndex: 9999,
                                background: 'rgba(15,23,42,0.58)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: isMobile ? 10 : 24,
                                boxSizing: 'border-box',
                                color: 'var(--admin-text-primary)',
                            }}
                        >
                            <div
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="export-columns-title"
                                style={{
                                    width: isMobile ? 'calc(100vw - 20px)' : 'min(980px, calc(100vw - 48px))',
                                    height: isMobile ? 'calc(100dvh - 20px)' : 'min(720px, calc(100dvh - 48px))',
                                    overflow: 'hidden',
                                    borderRadius: 8,
                                    background: isLight ? '#ffffff' : '#111827',
                                    border: '1px solid var(--admin-border-mid)',
                                    boxShadow: isLight ? '0 30px 90px rgba(15,23,42,0.22)' : '0 30px 90px rgba(0,0,0,0.56)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <div style={{ padding: isMobile ? '12px 14px' : '14px 18px', borderBottom: '1px solid var(--admin-border-soft)', background: isLight ? '#ffffff' : '#111827', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                                    <div>
                                        <h2 id="export-columns-title" style={{ margin: 0, fontSize: isMobile ? 16 : 18, color: 'var(--admin-text-strong)' }}>Customize Excel Export</h2>
                                        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                                            {selectedExportColumns.length} of {exportColumns.length || 0} columns selected
                                            {hasExportPreferenceChanges ? ' - unsaved changes' : ''}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setExportModalOpen(false)}
                                        aria-label="Close export columns"
                                        style={{
                                            width: 32,
                                            height: 32,
                                            padding: 0,
                                            borderRadius: 8,
                                            border: '1px solid var(--admin-border-mid)',
                                            background: isLight ? '#f8fafc' : '#0f172a',
                                            color: 'var(--admin-text-secondary)',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            lineHeight: 0,
                                            appearance: 'none',
                                        }}
                                    >
                                        <CloseIcon />
                                    </button>
                                </div>

                                <div style={{ flex: 1, minHeight: 0, padding: isMobile ? 14 : 18, overflow: isMobile ? 'auto' : 'hidden', display: 'flex', flexDirection: 'column', background: isLight ? '#f8fafc' : '#0f172a' }}>
                                    {exportPreferencesLoading ? (
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-secondary)', fontSize: 13 }}>Loading export columns...</div>
                                    ) : exportPreferencesError && !exportColumns.length ? (
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: 'min(460px, 100%)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.24)', background: 'rgba(239,68,68,0.08)', padding: 18, textAlign: 'center' }}>
                                                <div style={{ fontSize: 13, fontWeight: 800, color: '#f87171', marginBottom: 8 }}>Unable to load export columns</div>
                                                <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>{exportPreferencesError}</div>
                                                <button type="button" onClick={() => loadExportPreferences(true)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Retry</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {exportPreferencesError && (
                                                <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.10)', color: '#f87171', border: '1px solid rgba(239,68,68,0.22)', fontSize: 12 }}>
                                                    {exportPreferencesError}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                                                <button type="button" onClick={() => setSelectedExportColumns(exportColumns.map((column) => column.key))} disabled={!exportColumns.length} style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid var(--admin-border-mid)', background: 'var(--admin-surface-strong)', color: 'var(--admin-text-secondary)', fontSize: 12, fontWeight: 700, cursor: exportColumns.length ? 'pointer' : 'not-allowed' }}>Select All</button>
                                                <button type="button" onClick={() => setSelectedExportColumns(defaultExportColumns)} disabled={!defaultExportColumns.length} style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid var(--admin-border-mid)', background: 'var(--admin-surface-strong)', color: 'var(--admin-text-secondary)', fontSize: 12, fontWeight: 700, cursor: defaultExportColumns.length ? 'pointer' : 'not-allowed' }}>Reset Default</button>
                                            </div>

                                            <div style={{ flex: isMobile ? '0 0 auto' : 1, minHeight: isMobile ? 'auto' : 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.3fr) minmax(250px, 0.8fr)', gap: 14 }}>
                                                <div style={{ minHeight: isMobile ? 'auto' : 0, overflow: isMobile ? 'visible' : 'auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', alignContent: 'start', gap: 12, paddingRight: isMobile ? 0 : 2 }}>
                                                    {exportColumnGroups.map((group) => (
                                                        <section key={group.name} style={{ border: '1px solid var(--admin-border-soft)', borderRadius: 8, padding: 12, background: isLight ? '#ffffff' : '#111827' }}>
                                                            <h3 style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--admin-text-strong)', textTransform: 'uppercase' }}>{group.name}</h3>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                {group.columns.map((column) => (
                                                                    <label key={column.key} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--admin-text-secondary)', cursor: 'pointer' }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedExportColumnSet.has(column.key)}
                                                                            onChange={() => toggleExportColumn(column.key)}
                                                                        />
                                                                        <span>{column.header}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </section>
                                                    ))}
                                                </div>
                                                <aside style={{ minHeight: 0, border: '1px solid var(--admin-border-soft)', borderRadius: 8, padding: 12, background: isLight ? '#ffffff' : '#111827', display: 'flex', flexDirection: 'column' }}>
                                                    <h3 style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--admin-text-strong)', textTransform: 'uppercase' }}>Column Order</h3>
                                                    <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--admin-text-secondary)' }}>Top to bottom becomes left to right in Excel.</p>
                                                    {selectedExportColumns.length ? (
                                                        <div style={{ minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
                                                            {selectedExportColumns.map((key, index) => (
                                                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface-strong)' }}>
                                                                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--admin-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {selectedExportColumnLabels[index]}
                                                                    </span>
                                                                    <button type="button" onClick={() => moveExportColumn(index, -1)} disabled={index === 0} style={{ width: 32, height: 26, borderRadius: 8, border: '1px solid var(--admin-border-mid)', background: 'transparent', color: index === 0 ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: 11 }}>Up</button>
                                                                    <button type="button" onClick={() => moveExportColumn(index, 1)} disabled={index === selectedExportColumns.length - 1} style={{ width: 44, height: 26, borderRadius: 8, border: '1px solid var(--admin-border-mid)', background: 'transparent', color: index === selectedExportColumns.length - 1 ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', cursor: index === selectedExportColumns.length - 1 ? 'not-allowed' : 'pointer', fontSize: 11 }}>Down</button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ padding: 18, borderRadius: 8, border: '1px dashed var(--admin-border-mid)', color: 'var(--admin-text-secondary)', fontSize: 12, textAlign: 'center' }}>Select at least one column.</div>
                                                    )}
                                                </aside>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div style={{ padding: isMobile ? '14px 16px' : '16px 22px', borderTop: '1px solid var(--admin-border-soft)', background: isLight ? '#ffffff' : '#111827', display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                                    <button type="button" onClick={() => setExportModalOpen(false)} style={{ padding: '9px 13px', borderRadius: 8, border: '1px solid var(--admin-border-mid)', background: 'transparent', color: 'var(--admin-text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                                    <button type="button" onClick={saveExportPreferences} disabled={exportPreferencesLoading || exportPreferencesSaving || !selectedExportColumns.length || !hasExportPreferenceChanges} style={{ padding: '9px 13px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.25)', background: hasExportPreferenceChanges ? 'rgba(59,130,246,0.14)' : 'var(--admin-surface-strong)', color: hasExportPreferenceChanges ? '#60a5fa' : 'var(--admin-text-muted)', fontSize: 12, fontWeight: 700, cursor: exportPreferencesLoading || exportPreferencesSaving || !selectedExportColumns.length || !hasExportPreferenceChanges ? 'not-allowed' : 'pointer' }}>{exportPreferencesSaving ? 'Saving...' : 'Save'}</button>
                                    <button type="button" onClick={() => downloadExportExcel()} disabled={exportPreferencesLoading || exporting || !selectedExportColumns.length} style={{ padding: '9px 13px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.14)', color: exporting ? 'var(--admin-text-muted)' : '#34d399', fontSize: 12, fontWeight: 700, cursor: exportPreferencesLoading || exporting || !selectedExportColumns.length ? 'not-allowed' : 'pointer' }}>{exporting ? 'Exporting...' : 'Download'}</button>
                                    <button type="button" onClick={saveAndDownloadExport} disabled={exportPreferencesLoading || exportPreferencesSaving || exporting || !selectedExportColumns.length} style={{ padding: '9px 13px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.20)', color: exportPreferencesSaving || exporting ? 'var(--admin-text-muted)' : '#34d399', fontSize: 12, fontWeight: 800, cursor: exportPreferencesLoading || exportPreferencesSaving || exporting || !selectedExportColumns.length ? 'not-allowed' : 'pointer' }}>{exportPreferencesSaving || exporting ? 'Working...' : 'Save & Download'}</button>
                                </div>
                            </div>
                        </div>
                    ), document.body)}

                    <div style={{ maxWidth: 1500, margin: '0 auto', padding: isMobile ? '16px' : '32px' }}>
                        {activeTab === 'dashboard' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                {/* Top Row - Key Metrics */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                                    {[
                                        { label: 'Active Consultants', value: activeConsultantCount, sub: 'Professionals with work', icon: Users, color: '#3b82f6', tab: 'consultant', filterAction: () => { setHasServicesFilter('true'); setCardFilter('total'); setStatusFilters([]); } },
                                        { label: 'Active Clients', value: activeClientCount, sub: 'Managed engagements', icon: UserSquare, color: '#8b5cf6', tab: 'client', filterAction: () => { setHasServicesFilter('true'); } },
                                        { label: 'Active Carts', value: activeCartCount, sub: 'Items in shopping carts', icon: ShoppingCart, color: '#ef4444', tab: 'carts' },
                                        { label: 'Open Support', value: ticketValue, sub: 'Pending responses', icon: LifeBuoy, color: '#f59e0b', tab: 'support' },
                                    ].map((metric, i) => (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                if (metric.tab) setActiveTab(metric.tab);
                                                if (metric.filterAction) metric.filterAction();
                                            }}
                                            style={{ padding: 28, background: 'var(--admin-surface)', borderRadius: 24, border: '1px solid var(--admin-border-soft)', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-6px)';
                                                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.08)';
                                                e.currentTarget.style.borderColor = metric.color + '60';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.03)';
                                                e.currentTarget.style.borderColor = 'var(--admin-border-soft)';
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                                <div style={{ width: 48, height: 48, borderRadius: 16, background: `${metric.color}15`, color: metric.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${metric.color}25` }}>
                                                    <metric.icon size={24} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{metric.label}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 600 }}>{metric.sub}</div>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--admin-text-primary)' }}>{metric.value}</div>
                                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 4, background: `linear-gradient(90deg, ${metric.color}00, ${metric.color}, ${metric.color}00)` }} />
                                        </div>
                                    ))}
                                </div>

                                {/* Transaction Analytics Section */}
                                <div style={{ padding: 32, background: 'var(--admin-surface)', borderRadius: 28, border: '1px solid var(--admin-border-soft)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <TrendingUp size={22} color="#10b981" /> Transaction Analytics
                                        </h3>
                                        <button onClick={() => setActiveTab('transactions')} style={{ padding: '8px 16px', borderRadius: 10, background: 'var(--admin-row-alt)', color: '#3b82f6', border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>View All Transactions</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                                        {[
                                            { label: 'Revenue (MTD)', value: `₹${revenueValue.toLocaleString()}`, sub: 'Completed payments', icon: TrendingUp, color: '#10b981', filter: 'revenue' },
                                            { label: 'Total Payouts', value: `₹${payoutsValue.toLocaleString()}`, sub: 'Consultant earnings', icon: Users, color: '#3b82f6', filter: 'payouts' },
                                            { label: 'Settlements', value: `₹${settlementsValue.toLocaleString()}`, sub: 'Awaiting clearance', icon: Receipt, color: '#f59e0b', filter: 'settlements' },
                                        ].map((card, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    setTransactionFilter(card.filter);
                                                    setActiveTab('transactions');
                                                }}
                                                style={{ padding: 24, borderRadius: 24, background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${card.color}15`, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <card.icon size={18} />
                                                    </div>
                                                    <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>{card.label}</span>
                                                </div>
                                                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--admin-text-primary)', marginBottom: 4 }}>{card.value}</div>
                                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700 }}>{card.sub}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Second Row - Main Charts */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                                    {/* Platform Growth */}
                                    <div style={{ padding: 24, background: 'var(--admin-surface)', borderRadius: 24, border: '1px solid var(--admin-border-soft)' }}>
                                        <h3 style={{ margin: '0 0 24px', fontSize: 15, fontWeight: 800, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <TrendingUp size={18} color="#3b82f6" /> Platform Growth
                                        </h3>
                                        <div style={{ height: 320, width: '100%' }}>
                                            {isChartReady && (
                                                <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                            </linearGradient>
                                                            <linearGradient id="colorCli" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <XAxis dataKey="name" stroke="var(--admin-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                                        <YAxis stroke="var(--admin-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border-soft)" />
                                                        <RechartsTooltip contentStyle={{ background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-soft)', borderRadius: 12, color: 'var(--admin-text-primary)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                                        <Area type="monotone" dataKey="value" name="Onboarded" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCons)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            )}
                                        </div>
                                    </div>

                                    {/* Age Distribution - Expanded */}
                                    <div style={{ padding: 24, background: 'var(--admin-surface)', borderRadius: 24, border: '1px solid var(--admin-border-soft)', gridColumn: isMobile ? 'auto' : 'span 2' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <UserSquare size={18} color="#8b5cf6" /> Consultant Age Distribution
                                            </h3>
                                            {ageFilter && (
                                                <button
                                                    onClick={() => setAgeFilter('')}
                                                    style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    Clear Age Filter: {ageFilter}
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ height: 320, width: '100%' }}>
                                            {isChartReady && (
                                                <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                                                    <BarChart
                                                        data={[...ageData, ...(stats?.not_specified_age != null ? [{
                                                            name: 'Not Specified',
                                                            registered: stats.not_specified_age.registered,
                                                            credentials: stats.not_specified_age.credentials
                                                        }] : [])]}
                                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                                    >
                                                        <XAxis dataKey="name" stroke="var(--admin-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                                        <YAxis stroke="var(--admin-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border-soft)" />
                                                        <RechartsTooltip
                                                            cursor={{ fill: 'var(--admin-row-alt)' }}
                                                            contentStyle={{ background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-soft)', borderRadius: 12 }}
                                                        />
                                                        <Legend
                                                            verticalAlign="top"
                                                            align="right"
                                                            height={36}
                                                            iconType="circle"
                                                            onClick={(o) => {
                                                                const { dataKey } = o;
                                                                setAgeChartVisibility(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                        <Bar
                                                            dataKey="registered"
                                                            name="Registered"
                                                            fill="#3b82f6"
                                                            hide={!ageChartVisibility.registered}
                                                            radius={[4, 4, 0, 0]}
                                                            barSize={24}
                                                            cursor="pointer"
                                                            onClick={(entry) => {
                                                                if (entry && entry.name) {
                                                                    const label = entry.name;
                                                                    if (label === 'Not Specified') return;
                                                                    setAgeFilter(label === ageFilter ? '' : label);
                                                                    setCardFilter('total');
                                                                    setStatusFilters([]);
                                                                    setActiveTab('consultant');
                                                                    setPage(1);
                                                                }
                                                            }}
                                                        >
                                                            {[...ageData, ...(stats?.not_specified_age != null ? [{ name: 'Not Specified' }] : [])].map((entry, index) => {
                                                                const isSelected = ageFilter === entry.name;
                                                                return <Cell key={`cell-reg-${index}`} fill={isSelected ? '#3b82f6' : '#3b82f680'} opacity={ageFilter && !isSelected ? 0.3 : 1} />;
                                                            })}
                                                        </Bar>
                                                        <Bar
                                                            dataKey="credentials"
                                                            name="Consultants"
                                                            fill="#10b981"
                                                            hide={!ageChartVisibility.credentials}
                                                            radius={[4, 4, 0, 0]}
                                                            barSize={24}
                                                            cursor="pointer"
                                                            onClick={(entry) => {
                                                                if (entry && entry.name) {
                                                                    const label = entry.name;
                                                                    if (label === 'Not Specified') return;
                                                                    setAgeFilter(label === ageFilter ? '' : label);
                                                                    setCardFilter('consultants');
                                                                    setStatusFilters(['Credentials Sent']);
                                                                    setActiveTab('consultant');
                                                                    setPage(1);
                                                                }
                                                            }}
                                                        >
                                                            {[...ageData, ...(stats?.not_specified_age != null ? [{ name: 'Not Specified' }] : [])].map((entry, index) => {
                                                                const isSelected = ageFilter === entry.name;
                                                                return <Cell key={`cell-cred-${index}`} fill={isSelected ? '#10b981' : '#10b98180'} opacity={ageFilter && !isSelected ? 0.3 : 1} />;
                                                            })}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Domain Wise Distribution */}
                                <div style={{ padding: 24, background: 'var(--admin-surface)', borderRadius: 24, border: '1px solid var(--admin-border-soft)' }}>
                                    <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: 'var(--admin-text-primary)' }}>Domain Wise Distribution</h3>
                                    {/* Top Row - 4 Domain Cards */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                                        {serviceData.map((srv, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => { setServiceFilter(srv.name); setActiveTab('consultant'); setPage(1); }}
                                                style={{
                                                    padding: 20, borderRadius: 20, border: '1px solid var(--admin-border-soft)',
                                                    background: 'var(--admin-surface-strong)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', position: 'relative', overflow: 'hidden'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.borderColor = '#3b82f6';
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.1)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.borderColor = 'var(--admin-border-soft)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--admin-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {srv.name.toLowerCase() === 'returns' ? 'ITR' :
                                                            srv.name.toLowerCase() === 'consultation' ? 'GSTR' :
                                                                srv.name.toLowerCase() === 'notices' ? 'SCRUTINY' :
                                                                    srv.name.toLowerCase() === 'registrations' ? 'REGISTRATIONS' :
                                                                        normalizeAssessmentDomainLabel(srv.name)}
                                                    </div>
                                                    {srv.avg_score != null && (
                                                        <div style={{ padding: '4px 8px', borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: 11, fontWeight: 800 }}>
                                                            {srv.avg_score}% Score
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                    <div>
                                                        <div style={{ fontSize: 10, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Registered</div>
                                                        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--admin-text-strong)' }}>{srv.registered}</div>
                                                    </div>
                                                    {srv.credentials > 0 && (
                                                        <div
                                                            style={{ textAlign: 'right', cursor: 'pointer', zIndex: 10 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setServiceFilter(srv.name);
                                                                setStatusFilters(['Credentials Sent']);
                                                                setActiveTab('consultant');
                                                                setPage(1);
                                                            }}
                                                        >
                                                            <div style={{ fontSize: 10, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, transition: 'color 0.2s' }}>Active</div>
                                                            <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981', transition: 'transform 0.2s' }}
                                                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                            >{srv.credentials}</div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ marginTop: 16, height: 4, background: 'var(--admin-border-soft)', borderRadius: 2, overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${Math.min(100, (srv.credentials / Math.max(1, srv.registered)) * 100)}%`,
                                                        height: '100%',
                                                        background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                                                        borderRadius: 2
                                                    }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Bottom Row - Not Specified (2 cols) + 2 Graphs */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                                        {/* NOT SPECIFIED / FRESH - spans 2 columns */}
                                        <div
                                            onClick={() => { setServiceFilter(''); setCardFilter('total'); setActiveTab('consultant'); setPage(1); }}
                                            style={{
                                                gridColumn: 'span 2',
                                                padding: 20, borderRadius: 20, border: '1px solid #ef4444',
                                                background: 'rgba(239, 68, 68, 0.05)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', position: 'relative', overflow: 'hidden'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.borderColor = '#dc2626';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(239, 68, 68, 0.1)';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.borderColor = '#ef4444';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                                <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    NOT SPECIFIED / FRESH
                                                </div>
                                                <div style={{ padding: '4px 8px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: 11, fontWeight: 800 }}>
                                                    {totalNotSpecified} Total
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div>
                                                    <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, opacity: 0.7 }}>Registered</div>
                                                    <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444' }}>{totalNotSpecified}</div>
                                                </div>
                                                {notSpecifiedFromBackend?.credentials > 0 && (
                                                    <div
                                                        style={{ textAlign: 'right', cursor: 'pointer', zIndex: 10 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setServiceFilter('not_specified');
                                                            setStatusFilters(['Credentials Sent']);
                                                            setActiveTab('consultant');
                                                            setPage(1);
                                                        }}
                                                    >
                                                        <div style={{ fontSize: 10, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, transition: 'color 0.2s' }}>Active</div>
                                                        <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981', transition: 'transform 0.2s' }}
                                                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                        >{notSpecifiedFromBackend.credentials}</div>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ marginTop: 16, height: 4, background: 'rgba(239, 68, 68, 0.15)', borderRadius: 2, overflow: 'hidden' }}>
                                                <div style={{ width: '0%', height: '100%', background: '#ef4444', borderRadius: 2 }} />
                                            </div>
                                        </div>

                                        {/* Domain Distribution Mini Chart */}
                                        <div style={{ padding: 20, borderRadius: 20, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface-strong)' }}>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Domain Split</div>
                                            <div style={{ height: 120 }}>
                                                {isChartReady && (
                                                    <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                                                        <BarChart data={serviceData.map(s => ({
                                                            name: s.name.toLowerCase() === 'returns' ? 'ITR' :
                                                                s.name.toLowerCase() === 'consultation' ? 'GSTR' :
                                                                    s.name.toLowerCase() === 'notices' ? 'SCR' :
                                                                        s.name.toLowerCase() === 'registrations' ? 'REG' : s.name.slice(0, 3).toUpperCase(),
                                                            value: s.registered,
                                                            fullName: s.name
                                                        }))} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                                            <XAxis dataKey="name" stroke="var(--admin-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                                            <YAxis stroke="var(--admin-text-muted)" fontSize={9} tickLine={false} axisLine={false} />
                                                            <RechartsTooltip cursor={{ fill: 'var(--admin-row-alt)' }} contentStyle={{ background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-soft)', borderRadius: 8, fontSize: 11 }} />
                                                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} cursor="pointer"
                                                                onClick={(entry) => { if (entry?.fullName) { setServiceFilter(entry.fullName); setActiveTab('consultant'); setPage(1); } }}
                                                            />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                )}
                                            </div>
                                        </div>

                                        {/* Active vs Registered Mini Chart */}
                                        <div style={{ padding: 20, borderRadius: 20, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface-strong)' }}>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Active Rate</div>
                                            <div style={{ height: 120 }}>
                                                {isChartReady && (
                                                    <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                                                        <BarChart data={serviceData.map(s => ({
                                                            name: s.name.toLowerCase() === 'returns' ? 'ITR' :
                                                                s.name.toLowerCase() === 'consultation' ? 'GSTR' :
                                                                    s.name.toLowerCase() === 'notices' ? 'SCR' :
                                                                        s.name.toLowerCase() === 'registrations' ? 'REG' : s.name.slice(0, 3).toUpperCase(),
                                                            registered: s.registered,
                                                            active: s.credentials,
                                                            fullName: s.name
                                                        }))} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                                            <XAxis dataKey="name" stroke="var(--admin-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                                            <YAxis stroke="var(--admin-text-muted)" fontSize={9} tickLine={false} axisLine={false} />
                                                            <RechartsTooltip cursor={{ fill: 'var(--admin-row-alt)' }} contentStyle={{ background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-soft)', borderRadius: 8, fontSize: 11 }} />
                                                            <Bar dataKey="registered" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={10} cursor="pointer"
                                                                onClick={(entry) => { if (entry?.fullName) { setServiceFilter(entry.fullName); setActiveTab('consultant'); setPage(1); } }}
                                                            />
                                                            <Bar dataKey="active" fill="#10b981" radius={[4, 4, 0, 0]} barSize={10} cursor="pointer"
                                                                onClick={(entry) => { if (entry?.fullName) { setServiceFilter(entry.fullName); setActiveTab('consultant'); setPage(1); } }}
                                                            />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* State Wise Distribution */}
                                <div style={{ padding: 24, background: 'var(--admin-surface)', borderRadius: 24, border: '1px solid var(--admin-border-soft)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--admin-text-primary)' }}>State Wise Consultant Distribution</h3>
                                        <div style={{ display: 'flex', background: 'var(--admin-surface-strong)', padding: 4, borderRadius: 10, border: '1px solid var(--admin-border-soft)' }}>
                                            <button
                                                onClick={() => setStateViewMode('map')}
                                                style={{
                                                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                                    background: stateViewMode === 'map' ? 'var(--admin-header-bg)' : 'transparent',
                                                    color: stateViewMode === 'map' ? '#3b82f6' : 'var(--admin-text-muted)',
                                                    border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >Map View</button>
                                            <button
                                                onClick={() => setStateViewMode('list')}
                                                style={{
                                                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                                    background: stateViewMode === 'list' ? 'var(--admin-header-bg)' : 'transparent',
                                                    color: stateViewMode === 'list' ? '#3b82f6' : 'var(--admin-text-muted)',
                                                    border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >List View</button>
                                        </div>
                                    </div>

                                    {stateViewMode === 'map' ? (
                                        <IndiaMap
                                            data={stateData}
                                            isLight={isLight}
                                            onStateClick={(name) => { setStateFilter(name); setActiveTab('consultant'); setPage(1); }}
                                        />
                                    ) : (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: isMobile ? '1fr' : (viewportWidth < 1024 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'),
                                            gap: 16
                                        }}>
                                            {stateData.map((st, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => { setStateFilter(st.name); setActiveTab('consultant'); setPage(1); }}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface-strong)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--admin-row-alt)'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--admin-surface-strong)'}
                                                >
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>{st.name}</div>
                                                    <div style={{ display: 'flex', gap: 16, textAlign: 'right' }}>
                                                        <div>
                                                            <div style={{ fontSize: 9, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Reg</div>
                                                            <div style={{ fontSize: 13, fontWeight: 800, color: '#3b82f6' }}>{st.registered}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: 9, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Cred</div>
                                                            <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>{st.credentials}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'client' && (
                            <AdminClientList isLight={isLight} viewportWidth={viewportWidth} token={token} themeVars={themeVars} initialHasServices={activeTab === 'client' && hasServicesFilter === 'true' ? 'true' : 'all'} />
                        )}
                        {activeTab === 'support' && (
                            <AdminSupportList isLight={isLight} viewportWidth={viewportWidth} token={token} themeVars={themeVars} />
                        )}
                        {activeTab === 'services' && (
                            <AdminServiceList isLight={isLight} viewportWidth={viewportWidth} token={token} themeVars={themeVars} />
                        )}
                        {activeTab === 'transactions' && (
                            <AdminTransactionList isLight={isLight} viewportWidth={viewportWidth} token={token} themeVars={themeVars} initialFilter={transactionFilter} />
                        )}
                        {activeTab === 'carts' && (
                            <AdminCartList isLight={isLight} viewportWidth={viewportWidth} token={token} themeVars={themeVars} />
                        )}
                        {activeTab === 'call-logs' && (
                            <CallLogs embedded={true} />
                        )}

                        <div style={{ display: activeTab === 'consultant' ? 'block' : 'none' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isNarrowMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(210px, 1fr))',
                                gap: isMobile ? 10 : 14,
                                marginBottom: isMobile ? 14 : 22,
                            }}>
                                {summaryCards.map((card) => (
                                    <button
                                        type="button"
                                        key={card.label}
                                        onClick={() => handleCardFilterChange(card.filterKey)}
                                        style={{
                                            minHeight: isMobile ? 90 : 108,
                                            borderRadius: 18,
                                            border: `1px solid ${cardFilter === card.filterKey ? card.accent : card.border}`,
                                            background: card.background,
                                            boxShadow: isLight
                                                ? '0 18px 36px rgba(148,163,184,0.12), inset 0 1px 0 rgba(255,255,255,0.9)'
                                                : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                                            padding: isMobile ? '12px 12px 10px' : '18px 18px 16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            width: '100%',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            transform: cardFilter === card.filterKey ? 'translateY(-1px)' : 'none',
                                            transition: 'border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{
                                                fontSize: 13,
                                                fontWeight: 800,
                                                letterSpacing: '0.08em',
                                                textTransform: 'uppercase',
                                                color: isLight ? '#64748b' : '#6f89b4',
                                            }}>
                                                {card.label}
                                            </span>
                                            <span style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                background: card.accent,
                                                boxShadow: `0 0 0 8px ${card.accent}1c`,
                                                flexShrink: 0,
                                            }} />
                                        </div>
                                        <div style={{
                                            fontSize: isMobile ? 24 : 32,
                                            lineHeight: 1,
                                            fontWeight: 800,
                                            color: isLight ? '#0f172a' : '#ffffff',
                                            letterSpacing: '-0.03em',
                                        }}>
                                            {card.value}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div style={{ marginBottom: isMobile ? 12 : 18 }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
                                    <input value={search} placeholder="Search by name, email, or phone..." onChange={(e) => setSearch(e.target.value)} style={{ flex: isMobile ? '0 0 auto' : '1 1 320px', width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? 'none' : 520, padding: '11px 16px', borderRadius: 12, background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)', boxShadow: isLight ? '0 10px 20px rgba(148,163,184,0.08)' : 'none', color: 'var(--admin-text-strong)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                                    <div ref={statusMenuRef} style={{ position: 'relative', width: isMobile ? '100%' : 'auto' }}>
                                        <button
                                            type="button"
                                            onClick={() => setStatusMenuOpen((open) => !open)}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: 12,
                                                background: 'var(--admin-surface-strong)',
                                                border: '1px solid var(--admin-border-mid)',
                                                boxShadow: isLight ? '0 10px 20px rgba(148,163,184,0.08)' : 'none',
                                                color: 'var(--admin-text-primary)',
                                                fontSize: 13,
                                                cursor: 'pointer',
                                                minWidth: isMobile ? 0 : 172,
                                                width: isMobile ? '100%' : 'auto',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 10,
                                            }}
                                        >
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 240 : 130 }}>{statusSelectionLabel}</span>
                                            <span style={{ color: 'var(--admin-text-muted)', display: 'inline-flex', alignItems: 'center' }}>
                                                <ChevronIcon open={statusMenuOpen} />
                                            </span>
                                        </button>
                                        {statusMenuOpen && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: 'calc(100% + 8px)',
                                                    left: 0,
                                                    zIndex: 12,
                                                    width: isMobile ? '100%' : 250,
                                                    maxHeight: 280,
                                                    overflowY: 'auto',
                                                    padding: 10,
                                                    borderRadius: 12,
                                                    background: 'var(--admin-surface-strong)',
                                                    border: '1px solid var(--admin-border-mid)',
                                                    boxShadow: isLight ? '0 18px 30px rgba(148,163,184,0.2)' : '0 18px 34px rgba(2,6,23,0.45)',
                                                }}
                                            >
                                                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                                                    Select Statuses
                                                </div>
                                                {STATUS_FILTER_OPTIONS.map((statusOption) => {
                                                    const selected = statusFilters.includes(statusOption);
                                                    return (
                                                        <button
                                                            key={statusOption}
                                                            type="button"
                                                            onClick={() => toggleStatusFilter(statusOption)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px 10px',
                                                                borderRadius: 9,
                                                                border: `1px solid ${selected ? 'rgba(16,185,129,0.34)' : 'var(--admin-border-mid)'}`,
                                                                background: selected ? 'rgba(16,185,129,0.12)' : 'var(--admin-surface)',
                                                                color: selected ? '#10b981' : 'var(--admin-text-secondary)',
                                                                fontSize: 12,
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 8,
                                                                marginBottom: 6,
                                                                textAlign: 'left',
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    width: 14,
                                                                    height: 14,
                                                                    borderRadius: 3,
                                                                    border: `1px solid ${selected ? 'rgba(16,185,129,0.55)' : 'var(--admin-border-mid)'}`,
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: 10,
                                                                    lineHeight: 1,
                                                                    color: selected ? '#10b981' : 'transparent',
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <CheckIcon visible={selected} />
                                                            </span>
                                                            <span>{statusOption}</span>
                                                        </button>
                                                    );
                                                })}
                                                {statusFilters.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCardFilter('total');
                                                            setStatusFilters([]);
                                                            setAssessmentSubstatusFilter('all');
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            marginTop: 4,
                                                            padding: '7px 10px',
                                                            borderRadius: 9,
                                                            border: '1px solid var(--admin-border-mid)',
                                                            background: 'var(--admin-surface)',
                                                            color: 'var(--admin-text-muted)',
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Clear status selection
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setStatusMenuOpen(false)}
                                                    style={{
                                                        width: '100%',
                                                        marginTop: 6,
                                                        padding: '7px 10px',
                                                        borderRadius: 9,
                                                        border: '1px solid rgba(16,185,129,0.34)',
                                                        background: 'rgba(16,185,129,0.14)',
                                                        color: '#10b981',
                                                        fontSize: 12,
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <select value={joinedDateFilter} onChange={(e) => setJoinedDateFilter(e.target.value)} style={{ width: isMobile ? '100%' : 'auto', padding: '10px 12px', borderRadius: 12, background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)', boxShadow: isLight ? '0 10px 20px rgba(148,163,184,0.08)' : 'none', color: 'var(--admin-text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                                        {JOINED_DATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                    <select value={hasServicesFilter} onChange={(e) => setHasServicesFilter(e.target.value)} style={{ width: isMobile ? '100%' : 'auto', padding: '10px 12px', borderRadius: 12, background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)', boxShadow: isLight ? '0 10px 20px rgba(148,163,184,0.08)' : 'none', color: 'var(--admin-text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                                        <option value="all">All Professionals</option>
                                        <option value="true">Active (With Services)</option>
                                    </select>
                                    {(search || statusFilters.length > 0 || assessmentSubstatusFilter !== 'all' || joinedDateFilter !== 'all' || cardFilter !== 'total' || stateFilter || serviceFilter || ageFilter || hasServicesFilter !== 'all') && <button className="tp-btn" onClick={() => { setSearch(''); setStatusFilters([]); setAssessmentSubstatusFilter('all'); setJoinedDateFilter('all'); setCardFilter('total'); setStateFilter(''); setServiceFilter(''); setAgeFilter(''); setHasServicesFilter('all'); setStatusMenuOpen(false); }} style={{ width: isMobile ? '100%' : 'auto', padding: '10px 12px', borderRadius: 12, background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: 'pointer', fontSize: 12, fontWeight: 800 }}>Clear</button>}
                                </div>
                                {statusFilters.length > 0 && (
                                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {statusFilters.map((statusValue) => (
                                            <button
                                                key={statusValue}
                                                type="button"
                                                onClick={() => toggleStatusFilter(statusValue)}
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: 999,
                                                    border: '1px solid rgba(16,185,129,0.35)',
                                                    background: 'rgba(16,185,129,0.14)',
                                                    color: '#10b981',
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}
                                            >
                                                <span>{statusValue}</span>
                                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                    <CloseIcon />
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {(stateFilter || serviceFilter) && (
                                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {stateFilter && (
                                            <button
                                                type="button"
                                                onClick={() => setStateFilter('')}
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: 999,
                                                    border: '1px solid rgba(59,130,246,0.35)',
                                                    background: 'rgba(59,130,246,0.14)',
                                                    color: '#3b82f6',
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}
                                            >
                                                <span>State: {stateFilter}</span>
                                                <CloseIcon />
                                            </button>
                                        )}
                                        {serviceFilter && (
                                            <button
                                                type="button"
                                                onClick={() => setServiceFilter('')}
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: 999,
                                                    border: '1px solid rgba(139,92,246,0.35)',
                                                    background: 'rgba(139,92,246,0.14)',
                                                    color: '#8b5cf6',
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}
                                            >
                                                <span>Service: {
                                                    serviceFilter.toLowerCase() === 'returns' ? 'ITR' :
                                                        serviceFilter.toLowerCase() === 'consultation' ? 'GSTR' :
                                                            serviceFilter.toLowerCase() === 'notices' ? 'SCRUTINY' :
                                                                serviceFilter.toLowerCase() === 'registrations' ? 'REGISTRATIONS' :
                                                                    serviceFilter
                                                }</span>
                                                <CloseIcon />
                                            </button>
                                        )}
                                    </div>
                                )}
                                {showAssessmentSubstatus && (
                                    <div
                                        style={{
                                            marginTop: 10,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            flexWrap: 'wrap',
                                            padding: '8px 10px',
                                            borderRadius: 12,
                                            background: isLight ? 'rgba(248,250,252,0.92)' : 'rgba(15,23,42,0.48)',
                                            border: '1px solid var(--admin-border-soft)',
                                        }}
                                    >
                                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>
                                            Assessment Stage
                                        </span>
                                        {ASSESSMENT_SUBSTATUS_OPTIONS.map((option) => {
                                            const isActive = assessmentSubstatusFilter === option.value;
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => setAssessmentSubstatusFilter(option.value)}
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: 999,
                                                        border: `1px solid ${isActive ? 'rgba(16,185,129,0.34)' : 'var(--admin-border-mid)'}`,
                                                        background: isActive ? 'rgba(16,185,129,0.14)' : 'var(--admin-surface-strong)',
                                                        color: isActive ? '#10b981' : 'var(--admin-text-secondary)',
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {loading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--admin-text-muted)' }}>Loading consultants...</div>}
                            {error && <div style={{ textAlign: 'center', padding: 40, color: '#f87171' }}>{error}</div>}

                            {!loading && !error && (
                                <div style={{ background: 'var(--admin-surface-strong)', borderRadius: 18, border: '1px solid var(--admin-border-soft)', boxShadow: isLight ? '0 18px 40px rgba(148,163,184,0.12)' : 'none', overflow: 'hidden' }}>
                                    {isMobile ? (
                                        <div style={{ padding: '10px 10px 0', display: 'grid', gap: 10 }}>
                                            {sorted.map((c, i) => {
                                                const displayStatus = normalizeAdminStatus(c.assessment_display_status || c.assessment_status);
                                                const style = STATUS_COLORS[displayStatus] || STATUS_COLORS['New Join'];
                                                const substatusStyle = c.assessment_substatus ? (SUBSTATUS_COLORS[c.assessment_substatus] || SUBSTATUS_COLORS.MCQ) : null;
                                                return (
                                                    <article
                                                        key={c.id}
                                                        onClick={() => window.open(`/Consultants/${c.id}`, '_blank', 'noopener,noreferrer')}
                                                        style={{
                                                            border: '1px solid var(--admin-border-soft)',
                                                            borderRadius: 14,
                                                            padding: '12px 12px 10px',
                                                            background: i % 2 === 0 ? 'var(--admin-surface-strong)' : 'var(--admin-row-alt)',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                                            <div style={{ minWidth: 0 }}>
                                                                <a
                                                                    href={`/Consultants/${c.id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(event) => event.stopPropagation()}
                                                                    style={{
                                                                        color: 'var(--admin-text-primary)',
                                                                        textDecoration: 'none',
                                                                        fontSize: 14,
                                                                        fontWeight: 800,
                                                                        display: 'block',
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                    }}
                                                                >
                                                                    {c.full_name || '-'}
                                                                </a>
                                                                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {c.email || '-'}
                                                                </div>
                                                                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>{c.phone_number || '-'}</div>
                                                                    <a
                                                                        href={`tel:${c.phone_number || ''}`}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        style={{ padding: '6px', background: '#3b82f615', borderRadius: 6, color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                    >
                                                                        <Phone size={14} />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
                                                                {c.assessment_count ?? 0} attempts
                                                            </span>
                                                        </div>

                                                        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: style.bg, color: style.color }}>
                                                                {displayStatus}
                                                            </span>
                                                            {c.assessment_substatus && (
                                                                <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800, background: substatusStyle.bg, color: substatusStyle.color, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                                                    {c.assessment_substatus}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                                                            <div style={{ padding: 8, borderRadius: 10, background: 'var(--admin-surface)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                                                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>MCQ</div>
                                                                <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>{c.assessment_score != null ? `${c.assessment_score}/50` : '-'}</div>
                                                            </div>
                                                            <div style={{ padding: 8, borderRadius: 10, background: 'var(--admin-surface)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                                                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Video</div>
                                                                <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>{c.video_score != null ? `${c.video_score}/${c.video_total || '?'}` : '-'}</div>
                                                            </div>
                                                        </div>

                                                        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--admin-text-muted)', display: 'grid', gap: 4 }}>
                                                            <span>Joined: {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</span>
                                                            <span>Updated: {c.updated_at ? new Date(c.updated_at).toLocaleString() : '-'}</span>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                            {sorted.length === 0 && (
                                                <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>
                                                    {(search || statusFilters.length > 0 || assessmentSubstatusFilter !== 'all' || joinedDateFilter !== 'all' || cardFilter !== 'total')
                                                        ? 'No consultants match your current filters.'
                                                        : 'No consultants found.'}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1060, tableLayout: 'fixed' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                                        <th onClick={() => setSort('name')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer', userSelect: 'none', width: 220 }}>Name{sortIndicator('name')}</th>
                                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, width: 300 }}>Details</th>
                                                        <th onClick={() => setSort('status')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer', userSelect: 'none', width: 150 }}>Status{sortIndicator('status')}</th>
                                                        <th onClick={() => setSort('score')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer', userSelect: 'none', width: 180 }}>Score{sortIndicator('score')}</th>
                                                        <th onClick={() => setSort('created_at')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer', userSelect: 'none', width: 120 }}>Joining{sortIndicator('created_at')}</th>
                                                        <th onClick={() => setSort('updated_at')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer', userSelect: 'none', width: 140 }}>Latest Changes{sortIndicator('updated_at')}</th>
                                                        <th onClick={() => setSort('assessment_count')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer', userSelect: 'none', width: 120 }}>Attempts{sortIndicator('assessment_count')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sorted.map((c, i) => {
                                                        const displayStatus = normalizeAdminStatus(c.assessment_display_status || c.assessment_status);
                                                        const style = STATUS_COLORS[displayStatus] || STATUS_COLORS['New Join'];
                                                        const substatusStyle = c.assessment_substatus ? (SUBSTATUS_COLORS[c.assessment_substatus] || SUBSTATUS_COLORS.MCQ) : null;
                                                        return (
                                                            <tr key={c.id} onClick={() => window.open(`/Consultants/${c.id}`, '_blank', 'noopener,noreferrer')} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)', cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'var(--admin-row-alt)' }}>
                                                                <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 800, color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    <a href={`/Consultants/${c.id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--admin-text-primary)', textDecoration: 'none' }}>{c.full_name || '-'}</a>
                                                                </td>
                                                                <td style={{ padding: '14px 16px' }}>
                                                                    <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', marginBottom: 6, fontWeight: 500 }}>{c.email || '-'}</div>

                                                                    {c.selected_domains && c.selected_domains.length > 0 && (
                                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                                                            {c.selected_domains.map((domain, di) => (
                                                                                <div key={di} style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', padding: '2px 8px', borderRadius: 6 }}>
                                                                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase' }}>{domain}</span>
                                                                                    {c.selected_test_details && c.selected_test_details[domain] && (
                                                                                        <div style={{ fontSize: 10, color: 'var(--admin-text-secondary)', marginTop: 1, fontWeight: 500 }}>
                                                                                            {Array.isArray(c.selected_test_details[domain])
                                                                                                ? c.selected_test_details[domain].join(', ')
                                                                                                : String(c.selected_test_details[domain])
                                                                                            }
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '14px 16px' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                                                                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>{displayStatus}</span>
                                                                        {c.assessment_substatus && (
                                                                            <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800, background: substatusStyle.bg, color: substatusStyle.color, letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                                                                {c.assessment_substatus}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                                                    <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', fontWeight: 700 }}>{c.assessment_score != null ? `MCQ: ${c.assessment_score}/50` : 'MCQ: -'}</div>
                                                                    <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', marginTop: 4, fontWeight: 700 }}>{c.video_score != null ? `Video: ${c.video_score}/${c.video_total || '?'}` : 'Video: -'}</div>
                                                                </td>
                                                                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--admin-text-muted)' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
                                                                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                                                                    {c.credential_sent_at ? (
                                                                        <div style={{ color: '#10b981', fontWeight: 700 }}>Sent: {new Date(c.credential_sent_at).toLocaleString()}</div>
                                                                    ) : (
                                                                        c.updated_at ? new Date(c.updated_at).toLocaleString() : '-'
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--admin-text-secondary)', fontWeight: 700, whiteSpace: 'nowrap' }}>{c.assessment_count ?? 0}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {sorted.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>{(search || statusFilters.length > 0 || assessmentSubstatusFilter !== 'all' || joinedDateFilter !== 'all' || cardFilter !== 'total') ? 'No consultants match your current filters.' : 'No consultants found.'}</td></tr>}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <div style={{ padding: isMobile ? '12px' : '10px 16px', borderTop: '1px solid rgba(148,163,184,0.08)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', color: 'var(--admin-text-muted)', fontSize: 12, flexWrap: 'wrap', gap: 8, background: isLight ? 'rgba(248,250,252,0.9)' : 'transparent' }}>
                                        <span style={{ textAlign: isMobile ? 'center' : 'left' }}>Page <span style={{ color: 'var(--admin-text-primary)', fontWeight: 800 }}>{page}</span> of <span style={{ color: 'var(--admin-text-primary)', fontWeight: 800 }}>{totalPages}</span>{' . '}{totalCount} result{totalCount !== 1 ? 's' : ''}</span>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
                                            <button onClick={() => fetchConsultants(1, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter, cardFilter, stateFilter, serviceFilter, ageFilter, hasServicesFilter)} disabled={page <= 1 || loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--admin-tab-idle)', color: page <= 1 ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>{isMobile ? 'First' : '<<'}</button>
                                            <button onClick={() => fetchConsultants(page - 1, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter, cardFilter, stateFilter, serviceFilter, ageFilter, hasServicesFilter)} disabled={page <= 1 || loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--admin-tab-idle)', color: page <= 1 ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>{'< Prev'}</button>
                                            {!isMobile && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                                                const p = start + i;
                                                return p <= totalPages ? <button key={p} onClick={() => fetchConsultants(p, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter, cardFilter, stateFilter, serviceFilter, ageFilter, hasServicesFilter)} disabled={loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: p === page ? 'rgba(16,185,129,0.2)' : 'var(--admin-tab-idle)', color: p === page ? '#34d399' : 'var(--admin-text-secondary)', border: `1px solid ${p === page ? 'rgba(16,185,129,0.35)' : 'var(--admin-border-mid)'}`, cursor: loading ? 'not-allowed' : 'pointer', minWidth: 32 }}>{p}</button> : null;
                                            })}
                                            <button onClick={() => fetchConsultants(page + 1, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter, cardFilter, stateFilter, serviceFilter, ageFilter, hasServicesFilter)} disabled={page >= totalPages || loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--admin-tab-idle)', color: page >= totalPages ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>{'Next >'}</button>
                                            <button onClick={() => fetchConsultants(totalPages, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter, cardFilter, stateFilter, serviceFilter, ageFilter, hasServicesFilter)} disabled={page >= totalPages || loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--admin-tab-idle)', color: page >= totalPages ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>{isMobile ? 'Last' : '>>'}</button>
                                        </div>
                                        {!isMobile && <span style={{ color: 'var(--admin-text-secondary)' }}>Tip: click headers to sort</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;

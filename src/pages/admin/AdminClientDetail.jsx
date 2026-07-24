import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { ChevronRight, ChevronDown, User, Shield, Briefcase, CreditCard, FileText, Activity, Phone, Mail, ExternalLink, Trash2, Eye, Download, MessageSquare, Clock, Send, X, CheckCircle2, TrendingUp, Search, LifeBuoy, AlertCircle, RefreshCw, ShoppingCart, Plus, BarChart3, Upload } from 'lucide-react';
import { useAdminTheme } from './adminTheme';

const CLIENT_STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'drop', label: 'Drop' },
    { value: 'service_complete', label: 'Service Complete' },
];

const CLIENT_STATUS_STYLES = {
    active: { background: 'rgba(16,185,129,0.1)', color: '#10b981' },
    drop: { background: 'rgba(239,68,68,0.1)', color: '#f87171' },
    service_complete: { background: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
};

const AdminClientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isLight, themeVars } = useAdminTheme();
    const token = localStorage.getItem('admin_token');

    const [client, setClient] = useState(null);
    const [subAccounts, setSubAccounts] = useState([]);
    const [serviceRequests, setServiceRequests] = useState([]);
    const [orders, setOrders] = useState([]);
    const [consultations, setConsultations] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [vaultData, setVaultData] = useState({ documents: [], reports: [], notices: [] });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState({});
    const [supportTab, setSupportTab] = useState('all');
    const [expandedTicketId, setExpandedTicketId] = useState(null);
    const [vaultTab, setVaultTab] = useState('documents');
    const [selectedFolderId, setSelectedFolderId] = useState('all');
    const [showUploadDoc, setShowUploadDoc] = useState(false);
    const [uploadDocForm, setUploadDocForm] = useState({ title: '', document_type: 'OTHER', folder_name: '', file: null });
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [fulfillingDocId, setFulfillingDocId] = useState(null);
    const [replyTexts, setReplyTexts] = useState({});
    const [replyFiles, setReplyFiles] = useState({});
    const [sendingReply, setSendingReply] = useState({});
    const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [conversationMessages, setConversationMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [openSections, setOpenSections] = useState(['profile', 'service_requests', 'tickets', 'cart']);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', priority: 'medium', category: 'other', description: '' });
    const [creatingTicket, setCreatingTicket] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [reassigningRequestId, setReassigningRequestId] = useState(null);
    const [reassignConsultantId, setReassignConsultantId] = useState('');
    const [availableConsultants, setAvailableConsultants] = useState([]);
    const [loadingAvailableConsultants, setLoadingAvailableConsultants] = useState(false);
    const [reassignSubmitting, setReassignSubmitting] = useState(false);
    const [activityFeed, setActivityFeed] = useState([]);
    const [callLogs, setCallLogs] = useState([]);
    const [recordingBlobUrls, setRecordingBlobUrls] = useState({});
    const [loadingRecordingId, setLoadingRecordingId] = useState(null);
    const [communicationLogs, setCommunicationLogs] = useState([]);
    const [commForm, setCommForm] = useState({ service: '', caller_name: '', description: '' });
    const [addingComm, setAddingComm] = useState(false);
    const [submittingComm, setSubmittingComm] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updatingTestFlag, setUpdatingTestFlag] = useState(false);
    const [credentials, setCredentials] = useState([]);
    const [revealedCredentials, setRevealedCredentials] = useState({}); // { [id]: { login_id, password, notes, otp_destination } }
    const [revealingId, setRevealingId] = useState(null);
    const [showAddCredential, setShowAddCredential] = useState(false);
    const [editingCredentialId, setEditingCredentialId] = useState(null);
    const [credentialForm, setCredentialForm] = useState({ portal: 'IT', custom_portal_name: '', label: '', login_id: '', password: '', notes: '', otp_destination: '', status: 'active' });
    const [savingCredential, setSavingCredential] = useState(false);
    const PORTAL_OPTIONS = [
        ['IT', 'Income Tax Portal'], ['GST', 'GST Portal'], ['TRACES', 'TRACES (TDS)'],
        ['EPFO', 'EPFO'], ['ESIC', 'ESIC'], ['MCA', 'MCA / ROC'], ['PT', 'Professional Tax'],
        ['DGFT', 'DGFT'], ['ICEGATE', 'ICEGATE (Customs)'], ['OTHER', 'Other Portal'],
    ];
    const chatEndRef = useRef(null);

    // The Communication Thread's Service dropdown is sourced from this
    // client's own active services (not a fixed catalog) — an admin logging
    // a call should be picking the service that call was actually about.
    const communicationServiceOptions = useMemo(() => {
        const titles = new Set();
        serviceRequests.forEach((req) => {
            if (req.service?.title) titles.add(req.service.title);
            req.addons?.forEach((addon) => {
                if (addon.service_title) titles.add(addon.service_title);
            });
        });
        return [...titles, 'Other'];
    }, [serviceRequests]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const headers = { Authorization: `Bearer ${token}` };

    const fetchServiceRequests = async () => {
        setRefreshing(prev => ({ ...prev, service_requests: true }));
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/service-requests/`), { headers });
            if (res.ok) setServiceRequests(await res.json());
        } finally {
            setRefreshing(prev => ({ ...prev, service_requests: false }));
        }
    };

    const fetchTickets = async () => {
        setRefreshing(prev => ({ ...prev, tickets: true }));
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/tickets/`), { headers });
            if (res.ok) setTickets(await res.json());
        } finally {
            setRefreshing(prev => ({ ...prev, tickets: false }));
        }
    };

    const fetchOrders = async () => {
        setRefreshing(prev => ({ ...prev, orders: true }));
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/orders/`), { headers });
            if (res.ok) setOrders(await res.json());
        } finally {
            setRefreshing(prev => ({ ...prev, orders: false }));
        }
    };

    const fetchVault = async () => {
        setRefreshing(prev => ({ ...prev, vault: true }));
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/vault/`), { headers });
            if (res.ok) setVaultData(await res.json());
        } finally {
            setRefreshing(prev => ({ ...prev, vault: false }));
        }
    };

    const handleUploadDocument = async () => {
        if (!uploadDocForm.file) { alert('Choose a file to upload.'); return; }
        setUploadingDoc(true);
        try {
            const form = new FormData();
            form.append('file', uploadDocForm.file);
            form.append('title', uploadDocForm.title || uploadDocForm.file.name);
            form.append('document_type', uploadDocForm.document_type);
            if (uploadDocForm.folder_name) form.append('folder_name', uploadDocForm.folder_name);

            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/vault/upload/`), {
                method: 'POST', headers, body: form,
            });
            if (res.ok) {
                await fetchVault();
                setShowUploadDoc(false);
                setUploadDocForm({ title: '', document_type: 'OTHER', folder_name: '', file: null });
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Failed to upload document');
            }
        } catch (err) {
            console.error('Failed to upload document', err);
            alert('Failed to upload document');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleFulfillDocument = async (docId, file) => {
        if (!file) return;
        setFulfillingDocId(docId);
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/vault/documents/${docId}/fulfill/`), {
                method: 'POST', headers, body: form,
            });
            if (res.ok) {
                await fetchVault();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || data.file?.[0] || 'Failed to upload document');
            }
        } catch (err) {
            console.error('Failed to fulfill document request', err);
            alert('Failed to upload document');
        } finally {
            setFulfillingDocId(null);
        }
    };

    const fetchConversations = async () => {
        setRefreshing(prev => ({ ...prev, messages: true }));
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/conversations/`), { headers });
            if (res.ok) setConversations(await res.json());
        } finally {
            setRefreshing(prev => ({ ...prev, messages: false }));
        }
    };

    const fetchCart = async () => {
        setRefreshing(prev => ({ ...prev, cart: true }));
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/cart/`), { headers });
            if (res.ok) setCartItems(await res.json());
        } finally {
            setRefreshing(prev => ({ ...prev, cart: false }));
        }
    };

    const fetchConsultations = async () => {
        setRefreshing(prev => ({ ...prev, consultations: true }));
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/consultations/`), { headers });
            if (res.ok) setConsultations(await res.json());
        } finally {
            setRefreshing(prev => ({ ...prev, consultations: false }));
        }
    };

    const loadRecording = async (log) => {
        if (recordingBlobUrls[log.id] || loadingRecordingId === log.id) return;
        // Exotel recording URLs require HTTP Basic Auth to Exotel directly —
        // an <audio src> can't send that, which is why it prompted a browser
        // login before. The backend proxies it (exotel_calls.CallRecordingProxyView),
        // authenticating to Exotel server-side, but that proxy itself needs our
        // admin Bearer token — which a plain <audio src> also can't send. So we
        // fetch it as a blob (same pattern as the invoice preview) and hand the
        // player a local blob URL instead.
        setLoadingRecordingId(log.id);
        try {
            const res = await fetch(apiUrl(`/calls/logs/${log.id}/recording/`), { headers });
            if (!res.ok) throw new Error('Failed to load recording');
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            setRecordingBlobUrls(prev => ({ ...prev, [log.id]: blobUrl }));
        } catch (err) {
            console.error('Recording load failed', err);
            alert('Failed to load call recording');
        } finally {
            setLoadingRecordingId(null);
        }
    };

    const fetchCallLogs = async () => {
        setRefreshing(prev => ({ ...prev, call_logs: true }));
        try {
            const res = await fetch(apiUrl(`/calls/admin-logs/?client_id=${id}&limit=100`), { headers });
            if (res.ok) {
                const data = await res.json();
                setCallLogs(data.results || []);
            }
        } finally {
            setRefreshing(prev => ({ ...prev, call_logs: false }));
        }
    };

    const fetchCommunicationLogs = async () => {
        setRefreshing(prev => ({ ...prev, communication: true }));
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/communication-logs/`), { headers });
            if (res.ok) setCommunicationLogs(await res.json());
        } finally {
            setRefreshing(prev => ({ ...prev, communication: false }));
        }
    };

    const handleAddCommunication = async () => {
        if (!commForm.service || !commForm.caller_name.trim() || !commForm.description.trim()) {
            alert('Please select a service and fill in caller name and description.');
            return;
        }
        setSubmittingComm(true);
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/communication-logs/create/`), {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(commForm),
            });
            if (res.ok) {
                setCommForm({ service: '', caller_name: '', description: '' });
                setAddingComm(false);
                fetchCommunicationLogs();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Failed to log communication');
            }
        } catch (err) {
            console.error('Failed to log communication', err);
            alert('Failed to log communication');
        } finally {
            setSubmittingComm(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        setUpdatingStatus(true);
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/status/`), {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                const data = await res.json();
                setClient(prev => ({ ...prev, client_profile: { ...prev.client_profile, status: data.status } }));
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Failed to update status');
            }
        } catch (err) {
            console.error('Failed to update status', err);
            alert('Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleToggleTestAccount = async (isTest) => {
        setUpdatingTestFlag(true);
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/test-flag/`), {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_test_account: isTest }),
            });
            if (res.ok) {
                const data = await res.json();
                setClient(prev => ({ ...prev, user: { ...prev.user, is_test_account: data.is_test_account } }));
            } else {
                alert('Failed to update test-account flag');
            }
        } catch (err) {
            console.error('Failed to update test flag', err);
            alert('Failed to update test-account flag');
        } finally {
            setUpdatingTestFlag(false);
        }
    };

    const fetchCredentials = useCallback(async () => {
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/credentials/`), { headers });
            if (res.ok) setCredentials(await res.json());
        } catch (err) {
            console.error('Failed to fetch credential vault', err);
        }
    }, [id, token]);

    const handleRevealCredential = async (credId) => {
        if (revealedCredentials[credId]) {
            setRevealedCredentials(prev => { const next = { ...prev }; delete next[credId]; return next; });
            return;
        }
        setRevealingId(credId);
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/credentials/${credId}/reveal/`), { method: 'POST', headers });
            if (res.ok) {
                const data = await res.json();
                setRevealedCredentials(prev => ({ ...prev, [credId]: data }));
            } else {
                alert('Failed to reveal credential');
            }
        } catch (err) {
            console.error('Failed to reveal credential', err);
            alert('Failed to reveal credential');
        } finally {
            setRevealingId(null);
        }
    };

    const resetCredentialForm = () => {
        setCredentialForm({ portal: 'IT', custom_portal_name: '', label: '', login_id: '', password: '', notes: '', otp_destination: '', status: 'active' });
        setShowAddCredential(false);
        setEditingCredentialId(null);
    };

    const startEditCredential = (cred) => {
        const revealed = revealedCredentials[cred.id];
        setCredentialForm({
            portal: cred.portal, custom_portal_name: cred.custom_portal_name || '', label: cred.label || '',
            login_id: revealed?.login_id || '', password: '', notes: revealed?.notes || '',
            otp_destination: cred.otp_destination || '', status: cred.status,
        });
        setEditingCredentialId(cred.id);
        setShowAddCredential(true);
    };

    const handleSaveCredential = async () => {
        if (!credentialForm.login_id && !editingCredentialId) { alert('Login ID is required.'); return; }
        setSavingCredential(true);
        try {
            const isEdit = !!editingCredentialId;
            const url = isEdit
                ? apiUrl(`/admin-panel/clients/${id}/credentials/${editingCredentialId}/`)
                : apiUrl(`/admin-panel/clients/${id}/credentials/`);
            const payload = { ...credentialForm };
            if (isEdit && !payload.password) delete payload.password; // keep existing password if left blank
            if (isEdit && !payload.login_id) delete payload.login_id;

            const res = await fetch(url, {
                method: isEdit ? 'PATCH' : 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                await fetchCredentials();
                resetCredentialForm();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || data.detail || 'Failed to save credential');
            }
        } catch (err) {
            console.error('Failed to save credential', err);
            alert('Failed to save credential');
        } finally {
            setSavingCredential(false);
        }
    };

    const handleArchiveCredential = async (credId) => {
        if (!window.confirm('Remove this credential from the vault?')) return;
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/credentials/${credId}/`), { method: 'DELETE', headers });
            if (res.ok || res.status === 204) fetchCredentials();
            else alert('Failed to remove credential');
        } catch (err) {
            console.error('Failed to archive credential', err);
            alert('Failed to remove credential');
        }
    };

    const fetchActivity = async () => {
        setRefreshing(prev => ({ ...prev, activity: true }));
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/activity/`), { headers });
            if (res.ok) {
                const data = await res.json();
                setActivityFeed(data.results || []);
            }
        } finally {
            setRefreshing(prev => ({ ...prev, activity: false }));
        }
    };

    const openReassignPicker = async (req) => {
        setReassigningRequestId(req.id);
        setReassignConsultantId('');
        setAvailableConsultants([]);
        setLoadingAvailableConsultants(true);
        try {
            const res = await fetch(apiUrl(`/admin-panel/service-requests/${req.id}/available-consultants/`), { headers });
            if (res.ok) {
                const data = await res.json();
                setAvailableConsultants(data.results || []);
            }
        } finally {
            setLoadingAvailableConsultants(false);
        }
    };

    const submitReassign = async (req) => {
        if (!reassignConsultantId) return;
        setReassignSubmitting(true);
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/service-requests/${req.id}/reassign-consultant/`), {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ consultant_id: reassignConsultantId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Reassignment failed');
            setReassigningRequestId(null);
            await Promise.all([fetchServiceRequests(), fetchCart(), fetchActivity()]);
        } catch (err) {
            alert(err.message || 'Failed to reassign consultant');
        } finally {
            setReassignSubmitting(false);
        }
    };

    const createTicket = async () => {
        if (!newTicket.subject || !newTicket.description) return;
        setCreatingTicket(true);
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/tickets/create/`), {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(newTicket)
            });
            if (res.ok) {
                setNewTicket({ subject: '', priority: 'medium', category: 'service', description: '' });
                setIsTicketModalOpen(false);
                fetchTickets();
            }
        } catch (err) {
            console.error('Failed to create ticket', err);
        } finally {
            setCreatingTicket(false);
        }
    };

    const handleAdminReply = async (ticketId) => {
        const text = replyTexts[ticketId] || '';
        const file = replyFiles[ticketId];
        if (!text.trim() && !file) return;

        setSendingReply(prev => ({ ...prev, [ticketId]: true }));
        try {
            const formData = new FormData();
            formData.append('message', text);
            if (file) formData.append('attachment', file);

            const res = await fetch(apiUrl(`/admin-panel/tickets/${ticketId}/reply/`), {
                method: 'POST',
                headers: { ...token ? { Authorization: `Bearer ${token}` } : {} },
                body: formData
            });

            if (res.ok) {
                setReplyTexts(prev => ({ ...prev, [ticketId]: '' }));
                setReplyFiles(prev => ({ ...prev, [ticketId]: null }));
                fetchTickets();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Failed to send reply');
            }
        } catch (err) {
            console.error('Reply error:', err);
            alert('Failed to send reply');
        } finally {
            setSendingReply(prev => ({ ...prev, [ticketId]: false }));
        }
    };

    const handleResolveTicket = async (ticketId) => {
        const resolution = prompt('Please enter a resolution note (optional):');
        if (resolution === null) return; // User cancelled

        setActionLoading(ticketId + 'resolve');
        try {
            const res = await fetch(apiUrl(`/admin-panel/tickets/${ticketId}/resolve/`), {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ resolution })
            });
            if (res.ok) {
                fetchTickets();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Failed to resolve ticket');
            }
        } catch (err) {
            console.error('Resolve error:', err);
            alert('Failed to resolve ticket');
        } finally {
            setActionLoading(null);
        }
    };

    const fetchDetail = useCallback(async () => {
        setLoading(true);
        try {
            const [clientRes, subRes, convRes, cartRes] = await Promise.all([
                fetch(apiUrl(`/admin-panel/clients/${id}/`), { headers }),
                fetch(apiUrl(`/admin-panel/clients/${id}/sub-accounts/`), { headers }),
                fetch(apiUrl(`/admin-panel/clients/${id}/conversations/`), { headers }),
                fetch(apiUrl(`/admin-panel/clients/${id}/cart/`), { headers }),
            ]);

            if (clientRes.ok) setClient(await clientRes.json());
            if (subRes.ok) setSubAccounts(await subRes.json());

            await Promise.all([
                fetchConversations(),
                fetchCart(),
                fetchConsultations(),
                fetchServiceRequests(),
                fetchTickets(),
                fetchOrders(),
                fetchVault(),
                fetchActivity(),
                fetchCallLogs(),
                fetchCommunicationLogs(),
                fetchCredentials(),
            ]);
        } catch (err) {
            console.error('Failed to fetch client detail', err);
        } finally {
            setLoading(false);
        }
    }, [id, token]);

    useEffect(() => {
        const handleHash = () => {
            const hash = window.location.hash;
            if (hash) {
                const sectionId = hash.replace('#', '');
                // Ensure the section is open
                setOpenSections(prev => {
                    if (prev.includes(sectionId)) return prev;
                    return [...prev, sectionId];
                });
                // Scroll to the element after a short delay to allow rendering
                setTimeout(() => {
                    const el = document.getElementById(sectionId);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        };
        handleHash();
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    useEffect(() => {
        if (!token) navigate(adminUrl());
        else fetchDetail();
    }, [fetchDetail, navigate, token, id]);

    const toggleSection = (sectionId) => {
        setOpenSections(prev => 
            prev.includes(sectionId) ? prev.filter(s => s !== sectionId) : [...prev, sectionId]
        );
    };

    const handleDownloadInvoice = async (order) => {
        setDownloadingInvoiceId(order.id);
        try {
            // Admin-panel invoice endpoint (not the client-facing /payments/ one):
            // that one only accepts a client's own session/applicant auth, so an
            // admin token was silently rejected regardless of order status —
            // this generates (if needed) and serves the invoice as the admin.
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/orders/${order.id}/invoice/pdf/`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to download invoice');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice_${order.invoice_number || order.id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Invoice download failed', err);
            alert('Failed to download invoice');
        } finally {
            setDownloadingInvoiceId(null);
        }
    };

    const [previewingInvoiceId, setPreviewingInvoiceId] = useState(null);
    const handlePreviewInvoice = async (order) => {
        // Fetched as a blob (rather than a plain window.open(url)) so the
        // admin's Bearer token actually goes along — window.open can't send
        // Authorization headers, and we can't assume a session cookie exists.
        setPreviewingInvoiceId(order.id);
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/orders/${order.id}/invoice/pdf/?inline=1`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load invoice');
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
        } catch (err) {
            console.error('Invoice preview failed', err);
            alert('Failed to preview invoice');
        } finally {
            setPreviewingInvoiceId(null);
        }
    };

    const downloadVaultFile = async (url, filename) => {
        if (!url) return;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url, '_blank');
        }
    };

    const formatDateTime = (ts) => {
        if (!ts) return 'N/A';
        return new Date(ts).toLocaleString([], { 
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const fetchMessages = async (convId) => {
        setLoadingMessages(true);
        try {
            const res = await fetch(apiUrl(`/admin-panel/clients/${id}/conversations/${convId}/messages/`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setConversationMessages(await res.json());
        } catch (err) {
            console.error('Failed to fetch messages', err);
        } finally {
            setLoadingMessages(false);
        }
    };

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.id);
        }
    }, [selectedConversation]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversationMessages]);


    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.round(diffMs / 60000);
        if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
        const diffHours = Math.round(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.round(diffHours / 24);
        return `${diffDays}d ago`;
    };

    const SectionHeader = ({ id, label, icon: Icon, color, onRefresh }) => {
        const isCollapsed = !openSections.includes(id);
        const isRefreshing = refreshing[id];
        return (
            <div 
                style={{ 
                    padding: '18px 24px', 
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--admin-border-soft)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    background: isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)'
                }}
                onClick={() => toggleSection(id)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--admin-text-primary)' }}>{label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {onRefresh && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                            style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
                        >
                            <RefreshCw size={16} />
                        </button>
                    )}
                    <ChevronRight size={18} style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'all 0.3s', color: 'var(--admin-text-muted)' }} />
                </div>
            </div>
        );
    };

    if (loading) return <div style={{ ...themeVars, padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading client profile...</div>;
    if (!client) return <div style={{ ...themeVars, padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Client not found</div>;

    const userData = client.user || {};
    const profileData = client.client_profile || {};

    return (
        <div style={{ ...themeVars, minHeight: '100vh', background: 'var(--admin-page-bg)', padding: '24px' }}>
            {/* Header / Top Bar */}
            <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: 24 }}>
                <button 
                    onClick={() => navigate(adminUrl('dashboard'))} 
                    style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}
                >
                    ← Back to Dashboard
                </button>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 20, background: '#3b82f6', color: '#fff', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(59,130,246,0.2)' }}>
                            {(userData.first_name?.[0] || '') + (userData.last_name?.[0] || '') || <User />}
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--admin-text-primary)' }}>{userData.first_name} {userData.last_name}</h1>
                            <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>@{userData.username}</span>
                                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>CLIENT</span>
                                {userData.is_active ?
                                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Active</span> :
                                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>Inactive</span>
                                }
                                {userData.is_test_account && (
                                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>TEST ACCOUNT</span>
                                )}
                                <button
                                    onClick={() => handleToggleTestAccount(!userData.is_test_account)}
                                    disabled={updatingTestFlag}
                                    style={{
                                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: updatingTestFlag ? 'not-allowed' : 'pointer',
                                        opacity: updatingTestFlag ? 0.6 : 1, background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)', color: 'var(--admin-text-secondary)',
                                    }}
                                    title="Mark this account as internal/QA so it's excluded from dashboard stats and revenue"
                                >
                                    {userData.is_test_account ? 'Unmark Test' : 'Mark as Test'}
                                </button>
                                <select
                                    value={profileData.status || 'active'}
                                    onChange={(e) => handleUpdateStatus(e.target.value)}
                                    disabled={updatingStatus}
                                    style={{
                                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: 'none',
                                        cursor: updatingStatus ? 'not-allowed' : 'pointer', opacity: updatingStatus ? 0.6 : 1,
                                        ...(CLIENT_STATUS_STYLES[profileData.status] || CLIENT_STATUS_STYLES.active),
                                    }}
                                >
                                    {CLIENT_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        {/* Delete Client button removed as requested */}
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* EasyQuick View / Quick Insights */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                        <div style={{ background: 'var(--admin-surface)', padding: '20px 24px', borderRadius: 20, border: '1px solid var(--admin-border-soft)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Total Paid</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>₹{Number(orders.reduce((acc, o) => acc + (o.status === 'paid' ? Number(o.total_amount) : 0), 0)).toLocaleString()}</div>
                        </div>
                        <div style={{ background: 'var(--admin-surface)', padding: '20px 24px', borderRadius: 20, border: '1px solid var(--admin-border-soft)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Paid Orders</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--admin-text-primary)' }}>{orders.filter(o => o.status === 'paid').length}</div>
                        </div>
                        <div style={{ background: 'var(--admin-surface)', padding: '20px 24px', borderRadius: 20, border: '1px solid var(--admin-border-soft)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Unpaid / Pending</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b' }}>{orders.filter(o => o.status === 'pending').length}</div>
                        </div>
                        <div style={{ background: 'var(--admin-surface)', padding: '20px 24px', borderRadius: 20, border: '1px solid var(--admin-border-soft)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Open Tickets</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#f43f5e' }}>{tickets.filter(t => ['open', 'reopened', 'in_progress'].includes(t.status)).length}</div>
                        </div>
                    </div>
                    
                    {/* Profile Section */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="profile" label="Profile & Identity" icon={User} color="#3b82f6" onRefresh={fetchDetail} />
                        {openSections.includes('profile') && (
                            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                {[
                                    { label: 'First Name', value: userData.first_name },
                                    { label: 'Last Name', value: userData.last_name },
                                    { label: 'Email', value: userData.email },
                                    { label: 'Phone', value: userData.phone_number },
                                    { label: 'Joined At', value: formatDateTime(userData.date_joined) },
                                    { label: 'PAN Number', value: profileData.pan_number || '-' },
                                    { label: 'GSTIN', value: profileData.gstin || '-' },
                                    { label: 'Portal Username', value: profileData.gst_username || '-' },
                                ].map((field, i) => (
                                    <div key={i}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{field.label}</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text-primary)' }}>{field.value}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Credential Vault Section — government/service portal logins (Document Vault) */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="credentials" label="Credential Vault" icon={Shield} color="#f59e0b" onRefresh={fetchCredentials} />
                        {openSections.includes('credentials') && (
                            <div style={{ padding: 24 }}>
                                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                                    Government / compliance portal logins (Income Tax, GST, TRACES, etc.) for this
                                    client's services — shared with their assigned consultant via the Document Vault.
                                    Values are masked until revealed.
                                </div>

                                {credentials.length === 0 && !showAddCredential && (
                                    <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', fontStyle: 'italic', marginBottom: 16 }}>No credentials stored yet.</div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                                    {credentials.map(cred => {
                                        const revealed = revealedCredentials[cred.id];
                                        return (
                                            <div key={cred.id} style={{ padding: 16, borderRadius: 14, background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                                    <div>
                                                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                                                            {cred.portal === 'OTHER' ? (cred.custom_portal_name || 'Other Portal') : cred.portal_display}
                                                            {cred.label && <span style={{ fontWeight: 500, color: 'var(--admin-text-muted)' }}> — {cred.label}</span>}
                                                        </div>
                                                        <span style={{
                                                            display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                                                            background: cred.status === 'active' ? 'rgba(16,185,129,0.1)' : cred.status === 'needs_update' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.1)',
                                                            color: cred.status === 'active' ? '#10b981' : cred.status === 'needs_update' ? '#f59e0b' : '#f87171',
                                                        }}>{cred.status.replace('_', ' ')}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button onClick={() => handleRevealCredential(cred.id)} disabled={revealingId === cred.id}
                                                            style={{ background: 'none', border: '1px solid var(--admin-border-soft)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: 'var(--admin-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                            <Eye size={12} /> {revealed ? 'Hide' : (revealingId === cred.id ? 'Loading…' : 'Reveal')}
                                                        </button>
                                                        <button onClick={() => startEditCredential(cred)}
                                                            style={{ background: 'none', border: '1px solid var(--admin-border-soft)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: 'var(--admin-text-secondary)', cursor: 'pointer' }}>
                                                            Edit
                                                        </button>
                                                        <button onClick={() => handleArchiveCredential(cred.id)}
                                                            style={{ background: 'none', border: '1px solid var(--admin-border-soft)', borderRadius: 8, padding: '5px 8px', color: '#f87171', cursor: 'pointer', display: 'flex' }}>
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {revealed ? (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: 'monospace', fontSize: 13 }}>
                                                        <div><span style={{ color: 'var(--admin-text-muted)', fontFamily: 'inherit' }}>Login ID: </span>{revealed.login_id}</div>
                                                        <div><span style={{ color: 'var(--admin-text-muted)', fontFamily: 'inherit' }}>Password: </span>{revealed.password}</div>
                                                        {revealed.otp_destination && <div><span style={{ color: 'var(--admin-text-muted)', fontFamily: 'inherit' }}>OTP to: </span>{revealed.otp_destination}</div>}
                                                        {revealed.notes && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--admin-text-muted)', fontFamily: 'inherit' }}>Notes: </span>{revealed.notes}</div>}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>•••••••• / ••••••••</div>
                                                )}
                                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 8 }}>Last updated: {formatDateTime(cred.updated_at)}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {showAddCredential ? (
                                    <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--admin-border-soft)' }}>
                                        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: 'var(--admin-text-primary)' }}>
                                            {editingCredentialId ? 'Edit Credential' : 'Add Credential'}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                            <select value={credentialForm.portal} onChange={e => setCredentialForm(f => ({ ...f, portal: e.target.value }))}
                                                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13 }}>
                                                {PORTAL_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                                            </select>
                                            {credentialForm.portal === 'OTHER' && (
                                                <input placeholder="Portal name" value={credentialForm.custom_portal_name}
                                                    onChange={e => setCredentialForm(f => ({ ...f, custom_portal_name: e.target.value }))}
                                                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13 }} />
                                            )}
                                            <input placeholder="Label (optional, e.g. GSTIN)" value={credentialForm.label}
                                                onChange={e => setCredentialForm(f => ({ ...f, label: e.target.value }))}
                                                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13 }} />
                                            <select value={credentialForm.status} onChange={e => setCredentialForm(f => ({ ...f, status: e.target.value }))}
                                                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13 }}>
                                                <option value="active">Active</option>
                                                <option value="needs_update">Needs Update</option>
                                                <option value="invalid">Invalid</option>
                                            </select>
                                            <input placeholder={editingCredentialId ? 'Login ID (leave blank to keep)' : 'Login ID'} value={credentialForm.login_id}
                                                onChange={e => setCredentialForm(f => ({ ...f, login_id: e.target.value }))}
                                                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13 }} />
                                            <input placeholder={editingCredentialId ? 'Password (leave blank to keep)' : 'Password'} value={credentialForm.password}
                                                onChange={e => setCredentialForm(f => ({ ...f, password: e.target.value }))}
                                                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13 }} />
                                            <input placeholder="OTP destination (optional)" value={credentialForm.otp_destination}
                                                onChange={e => setCredentialForm(f => ({ ...f, otp_destination: e.target.value }))}
                                                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13 }} />
                                            <input placeholder="Notes (optional)" value={credentialForm.notes}
                                                onChange={e => setCredentialForm(f => ({ ...f, notes: e.target.value }))}
                                                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13 }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button onClick={handleSaveCredential} disabled={savingCredential}
                                                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: savingCredential ? 'not-allowed' : 'pointer', opacity: savingCredential ? 0.6 : 1, background: '#f59e0b', color: '#fff' }}>
                                                {savingCredential ? 'Saving…' : 'Save'}
                                            </button>
                                            <button onClick={resetCredentialForm}
                                                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: '1px solid var(--admin-border-soft)', background: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}>
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowAddCredential(true)}
                                        style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Plus size={14} /> Add Credential
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Analytics Section */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="analytics" label="Reports & Analytics" icon={BarChart3} color="#8b5cf6" />
                        {openSections.includes('analytics') && (
                            <div style={{ padding: 24 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16 }}>
                                    {[
                                        { label: 'Total Spent', value: `₹${Number(orders.reduce((acc, o) => acc + (o.status === 'paid' ? Number(o.total_amount) : 0), 0)).toLocaleString()}`, color: '#10b981' },
                                        { label: 'Paid Orders', value: orders.filter(o => o.status === 'paid').length, color: '#3b82f6' },
                                        { label: 'Service Requests', value: serviceRequests.length, color: '#f59e0b' },
                                        { label: 'Completed Services', value: serviceRequests.filter(r => r.status === 'completed').length, color: '#10b981' },
                                        { label: 'Support Tickets', value: tickets.length, color: '#f43f5e' },
                                        { label: 'Calls Logged', value: callLogs.length, color: '#f97316' },
                                        { label: 'Communications Logged', value: communicationLogs.length, color: '#8b5cf6' },
                                        { label: 'Consultations', value: consultations.length, color: '#0ea5e9' },
                                    ].map((stat, i) => (
                                        <div key={i} style={{ padding: 18, borderRadius: 14, background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)' }}>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{stat.label}</div>
                                            <div style={{ fontSize: 22, fontWeight: 900, color: stat.color }}>{stat.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Service Requests Section */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="service_requests" label="Service Requests" icon={Briefcase} color="#10b981" onRefresh={fetchServiceRequests} />
                        {openSections.includes('service_requests') && (
                            <div style={{ padding: 0 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--admin-row-alt)' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Service</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Status</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Consultant</th>
                                            <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {serviceRequests.map((req) => (
                                            <Fragment key={req.id}>
                                            <tr style={{ borderBottom: reassigningRequestId === req.id ? 'none' : '1px solid var(--admin-border-soft)' }}>
                                                <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700 }}>
                                                    {req.service?.title || 'Unknown'}
                                                    {req.addons?.length > 0 && (
                                                        <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                            {req.addons.map((addon) => (
                                                                <span key={addon.id} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)', color: 'var(--admin-text-muted)' }}>
                                                                    + {addon.service_title}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: req.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', color: req.status === 'completed' ? '#10b981' : '#3b82f6' }}>{req.status}</span>
                                                </td>
                                                <td style={{ padding: '16px 24px', fontSize: 13 }}>
                                                    {req.assigned_consultant ? (
                                                        <button
                                                            onClick={() => window.open(`/Consultants/${req.assigned_consultant.user.app_id}`, '_blank')}
                                                            style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                                        >
                                                            {req.assigned_consultant.user.first_name} {req.assigned_consultant.user.last_name}
                                                        </button>
                                                    ) : 'Unassigned'}
                                                    {req.previous_consultant_name && (
                                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                                            Previously: {req.previous_consultant_name}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => openReassignPicker(req)}
                                                        style={{ marginTop: 4, display: 'block', background: 'none', border: 'none', color: 'var(--admin-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                                    >
                                                        Reassign…
                                                    </button>
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 12, color: 'var(--admin-text-muted)' }}>{formatDateTime(req.created_at)}</td>
                                            </tr>
                                            {reassigningRequestId === req.id && (
                                                <tr style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                                    <td colSpan={4} style={{ padding: '0 24px 16px', background: 'var(--admin-row-alt)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, flexWrap: 'wrap' }}>
                                                            <select
                                                                value={reassignConsultantId}
                                                                onChange={(e) => setReassignConsultantId(e.target.value)}
                                                                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 12, minWidth: 220 }}
                                                            >
                                                                <option value="">
                                                                    {loadingAvailableConsultants ? 'Loading consultants…' : 'Select new consultant…'}
                                                                </option>
                                                                {availableConsultants.map((c) => (
                                                                    <option key={c.id} value={c.id} disabled={c.is_current}>
                                                                        {c.name}{c.is_current ? ' (current)' : ''} — {c.current_client_count} clients
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                onClick={() => submitReassign(req)}
                                                                disabled={!reassignConsultantId || reassignSubmitting}
                                                                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: !reassignConsultantId || reassignSubmitting ? 'var(--admin-border-soft)' : '#10b981', color: !reassignConsultantId || reassignSubmitting ? 'var(--admin-text-muted)' : 'white', fontSize: 12, fontWeight: 700, cursor: !reassignConsultantId || reassignSubmitting ? 'not-allowed' : 'pointer' }}
                                                            >
                                                                {reassignSubmitting ? 'Reassigning…' : 'Confirm Reassign'}
                                                            </button>
                                                            <button
                                                                onClick={() => setReassigningRequestId(null)}
                                                                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'transparent', color: 'var(--admin-text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            </Fragment>
                                        ))}
                                        {serviceRequests.length === 0 && (
                                            <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>No service requests found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Call Logs — reuses the same exotel_calls.CallLog admin endpoint
                        the main Call Logs admin tab uses, scoped to this client via
                        ?client_id=, including the recording. */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="call_logs" label="Call Logs" icon={Phone} color="#f97316" onRefresh={fetchCallLogs} />
                        {openSections.includes('call_logs') && (
                            <div style={{ padding: 0 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--admin-row-alt)' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Consultant</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Status</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Duration</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Recording</th>
                                            <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>When</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {callLogs.map((log) => (
                                            <tr key={log.id} style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                                <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700 }}>
                                                    {log.consultant_name}
                                                    {log.outcome && <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 500 }}>{log.outcome}</div>}
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: log.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.15)', color: log.status === 'completed' ? '#10b981' : 'var(--admin-text-muted)' }}>{log.status}</span>
                                                </td>
                                                <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--admin-text-secondary)' }}>{log.duration_display || '—'}</td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    {log.recording_url ? (
                                                        recordingBlobUrls[log.id] ? (
                                                            <audio controls autoPlay preload="auto" src={recordingBlobUrls[log.id]} style={{ height: 32, maxWidth: 220 }} />
                                                        ) : (
                                                            <button
                                                                onClick={() => loadRecording(log)}
                                                                disabled={loadingRecordingId === log.id}
                                                                style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 11, fontWeight: 700, cursor: loadingRecordingId === log.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                                            >
                                                                {loadingRecordingId === log.id ? 'Loading…' : <>▶ Play</>}
                                                            </button>
                                                        )
                                                    ) : (
                                                        <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>No recording</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 12, color: 'var(--admin-text-muted)' }}>{formatDateTime(log.created_at)}</td>
                                            </tr>
                                        ))}
                                        {callLogs.length === 0 && (
                                            <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>No calls logged</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Communication Thread Section */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <div style={{ padding: '18px 24px', borderBottom: openSections.includes('communication') ? '1px solid var(--admin-border-soft)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => toggleSection('communication')}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={18} />
                                </div>
                                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--admin-text-primary)' }}>Communication Thread</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button
                                    onClick={() => setAddingComm(v => !v)}
                                    style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: addingComm ? 'var(--admin-row-alt)' : '#8b5cf6', color: addingComm ? 'var(--admin-text-primary)' : 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    {addingComm ? <X size={14} /> : <Plus size={14} />} {addingComm ? 'Cancel' : 'Add Entry'}
                                </button>
                                <ChevronRight
                                    onClick={() => toggleSection('communication')}
                                    size={18}
                                    style={{ cursor: 'pointer', transform: openSections.includes('communication') ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'all 0.3s', color: 'var(--admin-text-muted)' }}
                                />
                            </div>
                        </div>
                        {openSections.includes('communication') && (
                            <div style={{ padding: 24 }}>
                                {addingComm && (
                                    <div style={{ padding: 20, borderRadius: 16, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-row-alt)', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 6 }}>Service</label>
                                                <select
                                                    value={commForm.service}
                                                    onChange={e => setCommForm(prev => ({ ...prev, service: e.target.value }))}
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                                                >
                                                    <option value="">Select service…</option>
                                                    {communicationServiceOptions.map(title => <option key={title} value={title}>{title}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 6 }}>Caller Name</label>
                                                <input
                                                    value={commForm.caller_name}
                                                    onChange={e => setCommForm(prev => ({ ...prev, caller_name: e.target.value }))}
                                                    placeholder="Enter caller's name"
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 6 }}>Description of Talk</label>
                                            <textarea
                                                rows={3}
                                                value={commForm.description}
                                                onChange={e => setCommForm(prev => ({ ...prev, description: e.target.value }))}
                                                placeholder="What was discussed on the call…"
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13, resize: 'none', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddCommunication}
                                            disabled={submittingComm}
                                            style={{ alignSelf: 'flex-end', padding: '10px 18px', borderRadius: 10, border: 'none', background: '#8b5cf6', color: 'white', fontSize: 13, fontWeight: 700, cursor: submittingComm ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: submittingComm ? 0.6 : 1 }}
                                        >
                                            <Send size={16} /> {submittingComm ? 'Logging…' : 'Log Entry'}
                                        </button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {communicationLogs.map((entry) => (
                                        <div key={entry.id} style={{ padding: 16, borderRadius: 14, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-row-alt)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>{entry.service}</span>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>{entry.caller_name}</span>
                                                </div>
                                                <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{formatDateTime(entry.created_at)}{entry.logged_by_name ? ` • by ${entry.logged_by_name}` : ''}</span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: 1.5 }}>{entry.description}</p>
                                        </div>
                                    ))}
                                    {communicationLogs.length === 0 && (
                                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>No communication logged yet</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Activity History — every recorded step: status changes, consultant
                        assignment/reassignment, document upload/verify/reject, reports
                        and notices sent by the consultant. See
                        activity_timeline/signals.py (backend) for what populates this. */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="activity" label="Activity History" icon={Activity} color="#0891b2" onRefresh={fetchActivity} />
                        {openSections.includes('activity') && (
                            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 480, overflowY: 'auto' }}>
                                {activityFeed.map((ev, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < activityFeed.length - 1 ? '1px solid var(--admin-border-soft)' : 'none' }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0891b2', marginTop: 6, flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>{ev.title}</span>
                                                <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(ev.created_at)}</span>
                                            </div>
                                            {ev.description && (
                                                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--admin-text-secondary)' }}>{ev.description}</p>
                                            )}
                                            <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>by {ev.actor_name}</span>
                                        </div>
                                    </div>
                                ))}
                                {activityFeed.length === 0 && (
                                    <p style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>No activity recorded yet</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Support & Concerns Section - High Fidelity */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--admin-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}>
                                    <LifeBuoy size={22} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--admin-text-primary)' }}>Support & Concerns</h2>
                                    <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--admin-text-muted)' }}>Have an issue? Raise a ticket and our team will resolve it quickly.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button 
                                    onClick={fetchTickets}
                                    style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, animation: refreshing.tickets ? 'spin 1s linear infinite' : 'none' }}
                                >
                                    <RefreshCw size={16} />
                                </button>
                                <button 
                                    onClick={() => setIsTicketModalOpen(true)}
                                    style={{ 
                                        padding: '8px 16px', borderRadius: 10, background: '#f43f5e', color: 'white', 
                                        border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#e11d48'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#f43f5e'}
                                >
                                    <Plus size={16} /> Raise Ticket
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            {/* Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                                {[
                                    { label: 'OPEN', count: tickets.filter(t => ['open', 'reopened'].includes(t.status)).length, color: '#3b82f6', bg: 'rgba(59,130,246,0.05)', border: '#dbeafe', icon: AlertCircle },
                                    { label: 'IN PROGRESS', count: tickets.filter(t => t.status === 'in_progress').length, color: '#f59e0b', bg: 'rgba(245,158,11,0.05)', border: '#fef3c7', icon: Clock },
                                    { label: 'RESOLVED', count: tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length, color: '#10b981', bg: 'rgba(16,185,129,0.05)', border: '#d1fae5', icon: CheckCircle2 },
                                ].map((stat, idx) => (
                                    <div key={idx} style={{
                                        padding: 20, borderRadius: 16, background: stat.bg, border: `1px solid ${stat.border}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}>
                                        <div>
                                            <p style={{ fontSize: 11, fontWeight: 800, color: stat.color, letterSpacing: '0.05em', margin: 0 }}>{stat.label}</p>
                                            <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--admin-text-primary)', margin: '4px 0 0 0' }}>{stat.count}</h3>
                                        </div>
                                        <stat.icon size={32} color={stat.color} style={{ opacity: 0.2 }} />
                                    </div>
                                ))}
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--admin-row-alt)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
                                {['all', 'open', 'working', 'resolved'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setSupportTab(tab)}
                                        style={{
                                            padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none',
                                            background: supportTab === tab ? 'var(--admin-surface)' : 'transparent',
                                            color: supportTab === tab ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            boxShadow: supportTab === tab ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                                        }}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {tickets
                                    .filter(t => {
                                        if (supportTab === 'all') return true;
                                        if (supportTab === 'open') return ['open', 'reopened'].includes(t.status);
                                        if (supportTab === 'working') return t.status === 'in_progress';
                                        if (supportTab === 'resolved') return ['resolved', 'closed'].includes(t.status);
                                        return true;
                                    })
                                    .map((ticket, i) => (
                                        <div key={i}
                                            onClick={() => setExpandedTicketId(expandedTicketId === ticket.id ? null : ticket.id)}
                                            style={{
                                                padding: '20px 24px', borderRadius: 16, border: '1px solid var(--admin-border-soft)',
                                                background: 'var(--admin-row-alt)', display: 'flex', flexDirection: 'column',
                                                cursor: 'pointer', transition: 'all 0.2s', gap: 0
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--admin-text-primary)'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--admin-border-soft)'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', letterSpacing: '0.02em' }}>{ticket.ticket_id || `TKT-${ticket.id}`}</span>

                                                        <span style={{
                                                            padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                            background: ticket.status === 'open' ? 'rgba(59,130,246,0.1)' : ticket.status === 'resolved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                                            color: ticket.status === 'open' ? '#3b82f6' : ticket.status === 'resolved' ? '#10b981' : '#f59e0b',
                                                        }}>{(ticket.status || '').charAt(0).toUpperCase() + (ticket.status || '').slice(1)}</span>

                                                        {ticket.priority && (
                                                            <span style={{
                                                                padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                                background: 'rgba(239,68,68,0.05)', color: '#f43f5e', border: '1px solid rgba(239,68,68,0.1)'
                                                            }}>{ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority</span>
                                                        )}
                                                        {ticket.created_by_role === 'vom' && (
                                                            <span style={{
                                                                padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                                                background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)'
                                                            }}>CREATED BY VOM</span>
                                                        )}
                                                    </div>
                                                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--admin-text-primary)' }}>{ticket.subject}</h4>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--admin-text-muted)' }}>{timeAgo(ticket.created_at)}</span>
                                                    <ChevronRight 
                                                        size={18} 
                                                        style={{ 
                                                            transform: expandedTicketId === ticket.id ? 'rotate(90deg)' : 'rotate(0deg)',
                                                            transition: 'transform 0.3s ease',
                                                            color: 'var(--admin-text-muted)'
                                                        }} 
                                                    />
                                                </div>
                                            </div>

                                            {expandedTicketId === ticket.id && (
                                                <div 
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ 
                                                        marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--admin-border-soft)',
                                                        display: 'flex', flexDirection: 'column', gap: 20, cursor: 'default'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: 14, color: 'var(--admin-text-secondary)', lineHeight: 1.6, background: 'var(--admin-surface)', padding: 16, borderRadius: 12, border: '1px solid var(--admin-border-soft)' }}>
                                                            {ticket.description}
                                                        </div>
                                                        {ticket.attachment && (
                                                            <div style={{ marginTop: 12 }}>
                                                                <a 
                                                                    href={ticket.attachment.startsWith('http') ? ticket.attachment : apiUrl(ticket.attachment.replace('/api/media', '/media'))} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    style={{ 
                                                                        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10,
                                                                        background: 'rgba(59,130,246,0.05)', color: '#3b82f6', fontSize: 12, fontWeight: 700, textDecoration: 'none',
                                                                        border: '1px solid rgba(59,130,246,0.1)'
                                                                    }}
                                                                >
                                                                    <FileText size={16} /> View Original Attachment
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {ticket.resolution && (
                                                        <div style={{ background: 'rgba(16,185,129,0.05)', padding: 16, borderRadius: 12, border: '1px solid rgba(16,185,129,0.1)' }}>
                                                            <p style={{ fontSize: 10, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Resolution Note</p>
                                                            <p style={{ margin: 0, fontSize: 13, color: 'var(--admin-text-primary)', lineHeight: 1.5 }}>{ticket.resolution}</p>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <MessageSquare size={16} color="var(--admin-text-muted)" /> Discussion History
                                                        </p>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto', padding: '10px 4px' }}>
                                                            {(!ticket.comments || ticket.comments.length === 0) ? (
                                                                <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0', background: 'var(--admin-surface)', borderRadius: 12, border: '1px dashed var(--admin-border-soft)' }}>
                                                                    No replies yet.
                                                                </p>
                                                            ) : (
                                                                ticket.comments.map((comment) => (
                                                                    <div 
                                                                        key={comment.id}
                                                                        style={{
                                                                            alignSelf: comment.is_admin_reply ? 'flex-end' : 'flex-start',
                                                                            maxWidth: '85%', padding: '12px 16px', borderRadius: 16,
                                                                            background: comment.is_admin_reply ? '#1e293b' : 'var(--admin-surface)',
                                                                            color: comment.is_admin_reply ? 'white' : 'var(--admin-text-primary)',
                                                                            border: '1px solid var(--admin-border-soft)',
                                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                                        }}
                                                                    >
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 12 }}>
                                                                            <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.8 }}>
                                                                                {comment.is_admin_reply ? 'Admin Support' : 'Client'}
                                                                            </span>
                                                                            <span style={{ fontSize: 9, opacity: 0.6 }}>
                                                                                {new Date(comment.created_at).toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{comment.message}</p>
                                                                        {comment.attachment && (
                                                                            <a 
                                                                                href={comment.attachment.startsWith('http') ? comment.attachment : apiUrl(comment.attachment.replace('/api/media', '/media'))} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer" 
                                                                                style={{ 
                                                                                    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, 
                                                                                    fontSize: 11, color: comment.is_admin_reply ? '#93c5fd' : '#3b82f6', 
                                                                                    fontWeight: 700, textDecoration: 'none' 
                                                                                }}
                                                                            >
                                                                                <FileText size={12} /> View Attachment
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Reply Area */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--admin-surface)', padding: 16, borderRadius: 16, border: '1px solid var(--admin-border-soft)' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <textarea 
                                                                placeholder="Type a reply..."
                                                                value={replyTexts[ticket.id] || ''}
                                                                onChange={e => setReplyTexts(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                                                style={{
                                                                    width: '100%', minHeight: 80, padding: '12px 45px 12px 16px', borderRadius: 12,
                                                                    border: '1px solid var(--admin-border-soft)', fontSize: 14, resize: 'none', background: 'var(--admin-row-alt)', color: 'var(--admin-text-primary)'
                                                                }}
                                                            />
                                                            <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                <label style={{ cursor: 'pointer', color: replyFiles[ticket.id] ? '#10b981' : 'var(--admin-text-muted)' }}>
                                                                    <FileText size={20} />
                                                                    <input 
                                                                        type="file" 
                                                                        style={{ display: 'none' }}
                                                                        onChange={e => setReplyFiles(prev => ({ ...prev, [ticket.id]: e.target.files[0] }))}
                                                                    />
                                                                </label>
                                                            </div>
                                                            <button 
                                                                disabled={sendingReply[ticket.id]}
                                                                onClick={() => handleAdminReply(ticket.id)}
                                                                style={{
                                                                    position: 'absolute', right: 12, bottom: 12, width: 36, height: 36, borderRadius: 8,
                                                                    background: '#10b981', color: 'white', border: 'none', cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    opacity: sendingReply[ticket.id] ? 0.6 : 1
                                                                }}
                                                            >
                                                                <Send size={18} />
                                                            </button>
                                                        </div>
                                                        {replyFiles[ticket.id] && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#10b981', fontWeight: 700 }}>
                                                                <CheckCircle2 size={14} /> Attached: {replyFiles[ticket.id].name}
                                                                <button onClick={() => setReplyFiles(prev => ({ ...prev, [ticket.id]: null }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                                        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                                                            <button 
                                                                onClick={() => handleResolveTicket(ticket.id)}
                                                                style={{
                                                                    flex: 1, padding: '12px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                                                    border: '1px solid #10b981', fontSize: 12, fontWeight: 800, cursor: 'pointer'
                                                                }}
                                                            >Resolve Ticket</button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                {tickets.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No support tickets raised.</div>}
                            </div>
                        </div>
                    </div>

                    {/* Message Center Section */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="messages" label="Message Center" icon={MessageSquare} color="#8b5cf6" onRefresh={fetchConversations} />
                        {openSections.includes('messages') && (
                            <div style={{ padding: 0 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--admin-row-alt)' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Consultant</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Last Message</th>
                                            <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Last Active</th>
                                            <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {conversations.map((c, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                                <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700 }}>
                                                    <button 
                                                        onClick={() => window.open(`/Consultants/${c.consultant_app_id}`, '_blank')}
                                                        style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                                    >
                                                        {c.consultant_name}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--admin-text-primary)', fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {c.last_message || 'No messages yet'}
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 12, color: 'var(--admin-text-muted)' }}>{formatDateTime(c.updated_at)}</td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                    <button 
                                                        onClick={() => setSelectedConversation(c)}
                                                        style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        View Chat
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {conversations.length === 0 && (
                                            <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>No active conversations</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Orders & Payments Section */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="orders" label="Billing & Invoices" icon={CreditCard} color="#f59e0b" onRefresh={fetchOrders} />
                        {openSections.includes('orders') && (
                            <div style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {orders.map((order, i) => (
                                        <div key={i} style={{
                                            padding: '20px', borderRadius: 16, border: '1px solid var(--admin-border-soft)',
                                            background: 'var(--admin-row-alt)', display: 'flex', flexDirection: 'column', gap: 14
                                        }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                                                            Order #{order.id} {order.invoice_number && <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>({order.invoice_number})</span>}
                                                        </h4>
                                                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: order.status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: order.status === 'paid' ? '#10b981' : '#f59e0b' }}>{order.status.toUpperCase()}</span>
                                                        {order.coupon_code && (
                                                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                                                                🎟 {order.coupon_code}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                                                        {formatDateTime(order.created_at)} {order.paid_at && `• Paid ${formatDateTime(order.paid_at)}`} • ₹{Number(order.total_amount).toLocaleString()}
                                                        {order.discount_amount > 0 && (
                                                            <span style={{ color: '#8b5cf6' }}> • ₹{Number(order.discount_amount).toLocaleString()} off{order.original_amount ? ` (was ₹${Number(order.original_amount).toLocaleString()})` : ''}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {order.status === 'paid' && (
                                                    <>
                                                        <button
                                                            onClick={() => handlePreviewInvoice(order)}
                                                            disabled={previewingInvoiceId === order.id}
                                                            style={{
                                                                padding: '6px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)',
                                                                background: 'var(--admin-surface)', color: 'var(--admin-text-primary)',
                                                                fontSize: 11, fontWeight: 700, cursor: previewingInvoiceId === order.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6
                                                            }}
                                                        >
                                                            <Eye size={16} /> {previewingInvoiceId === order.id ? 'Loading...' : 'Preview'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadInvoice(order)}
                                                            disabled={downloadingInvoiceId === order.id}
                                                            style={{
                                                                padding: '6px 12px', borderRadius: 8, border: 'none',
                                                                background: downloadingInvoiceId === order.id ? 'var(--admin-border-soft)' : '#1e293b',
                                                                color: downloadingInvoiceId === order.id ? 'var(--admin-text-muted)' : 'white',
                                                                fontSize: 11, fontWeight: 700, cursor: downloadingInvoiceId === order.id ? 'not-allowed' : 'pointer',
                                                                display: 'flex', alignItems: 'center', gap: 6
                                                            }}
                                                        >
                                                            {downloadingInvoiceId === order.id ? 'Downloading...' : <><Download size={16} /> {order.invoice_number ? 'Invoice' : 'Generate Invoice'}</>}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {order.items?.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12, borderTop: '1px solid var(--admin-border-soft)' }}>
                                                {order.items.map((item) => (
                                                    <div key={item.id} style={{ fontSize: 12.5, color: 'var(--admin-text-secondary)' }}>
                                                        <span style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>{item.service_title}{item.variant_name ? ` — ${item.variant_name}` : ''}</span>
                                                        {' '}× {item.quantity} · ₹{Number(item.price).toLocaleString()}
                                                        {item.consultant && <span> · Consultant: {item.consultant.name}</span>}
                                                        {item.addons?.length > 0 && (
                                                            <div style={{ marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                                {item.addons.map((addon, ai) => (
                                                                    <span key={ai} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: 'var(--admin-surface)', border: '1px solid var(--admin-border-soft)', color: 'var(--admin-text-muted)' }}>
                                                                        + {addon.title}{addon.quantity > 1 ? ` x${addon.quantity}` : ''}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        </div>
                                    ))}
                                    {orders.length === 0 && <p style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>No orders found</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Upcoming Consultations Section */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="consultations" label="Upcoming Consultations" icon={Phone} color="#0ea5e9" onRefresh={fetchConsultations} />
                        {openSections.includes('consultations') && (
                            <div style={{ padding: 0 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--admin-row-alt)' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Topic</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Consultant</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Status</th>
                                            <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Scheduled Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {consultations.map((c, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                                <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700 }}>{c.topic_title}</td>
                                                <td style={{ padding: '16px 24px', fontSize: 13 }}>
                                                    {c.consultant_app_id ? (
                                                        <button 
                                                            onClick={() => window.open(`/Consultants/${c.consultant_app_id}`, '_blank')}
                                                            style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                                        >
                                                            {c.consultant_name}
                                                        </button>
                                                    ) : c.consultant_name}
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ 
                                                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, 
                                                        background: c.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', 
                                                        color: c.status === 'completed' ? '#10b981' : '#3b82f6' 
                                                    }}>{c.status}</span>
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 13, color: 'var(--admin-text-primary)', fontWeight: 700 }}>{formatDateTime(c.scheduled_at)}</td>
                                            </tr>
                                        ))}
                                        {consultations.length === 0 && (
                                            <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>No consultations scheduled</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Cart Section */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="cart" label="Active Shopping Cart" icon={ShoppingCart} color="#6366f1" onRefresh={fetchCart} />
                        {openSections.includes('cart') && (
                            <div style={{ padding: 0 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--admin-row-alt)' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Service</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Category</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Consultant</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Price</th>
                                            <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Added</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cartItems.map((item, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                                <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700 }}>
                                                    {item.title}
                                                    {item.addons?.length > 0 && (
                                                        <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                            {item.addons.map((addon) => (
                                                                <span key={addon.id} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)', color: 'var(--admin-text-muted)' }}>
                                                                    + {addon.title}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--admin-text-secondary)' }}>{item.category}</td>
                                                <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--admin-text-secondary)' }}>{item.consultant?.name || '—'}</td>
                                                <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700, color: '#10b981' }}>₹{Number(item.price).toLocaleString()}</td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 12, color: 'var(--admin-text-muted)' }}>{formatDateTime(item.added_at)}</td>
                                            </tr>
                                        ))}
                                        {cartItems.length === 0 && (
                                            <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>No items in cart</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', padding: 24 }}>
                        <h4 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 800, color: 'var(--admin-text-primary)' }}>Quick Stats</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{ padding: 16, background: 'var(--admin-row-alt)', borderRadius: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Paid Invoices</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{orders.filter(o => o.status === 'paid').length}</div>
                            </div>
                            <div style={{ padding: 16, background: 'var(--admin-row-alt)', borderRadius: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Total Spent</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>₹{Number(orders.reduce((acc, o) => acc + (o.status === 'paid' ? Number(o.total_amount) : 0), 0)).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: 'var(--admin-surface)', borderRadius: 24, border: '1px solid var(--admin-border-soft)', padding: 24, boxShadow: 'var(--admin-shadow-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--admin-text-strong)' }}>Vault Explorer</h4>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setShowUploadDoc(v => !v)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Upload size={14} /> Upload Document
                                </button>
                                <button onClick={fetchVault} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface-soft)', color: 'var(--admin-text-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <RefreshCw size={14} className={refreshing.vault ? 'spin' : ''} /> Refresh
                                </button>
                            </div>
                        </div>

                        {showUploadDoc && (
                            <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--admin-border-soft)', marginBottom: 20, background: 'var(--admin-row-alt)' }}>
                                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                                    Uploaded here as "Verified/Uploaded" — visible immediately in this client's own
                                    portal and to their currently-assigned consultant, same as any document they'd upload themselves.
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                    <input placeholder="Title (optional, defaults to filename)" value={uploadDocForm.title}
                                        onChange={e => setUploadDocForm(f => ({ ...f, title: e.target.value }))}
                                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13 }} />
                                    <input placeholder="Folder (optional, e.g. ITR 2025-26)" value={uploadDocForm.folder_name}
                                        onChange={e => setUploadDocForm(f => ({ ...f, folder_name: e.target.value }))}
                                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13 }} />
                                    <select value={uploadDocForm.document_type} onChange={e => setUploadDocForm(f => ({ ...f, document_type: e.target.value }))}
                                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontSize: 13 }}>
                                        <option value="OTHER">Other Document</option>
                                        <option value="TIS">Taxpayer Information Summary</option>
                                    </select>
                                    <input type="file" onChange={e => setUploadDocForm(f => ({ ...f, file: e.target.files[0] || null }))}
                                        style={{ fontSize: 12, color: 'var(--admin-text-primary)' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={handleUploadDocument} disabled={uploadingDoc}
                                        style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: uploadingDoc ? 'not-allowed' : 'pointer', opacity: uploadingDoc ? 0.6 : 1, background: '#3b82f6', color: '#fff' }}>
                                        {uploadingDoc ? 'Uploading…' : 'Upload'}
                                    </button>
                                    <button onClick={() => { setShowUploadDoc(false); setUploadDocForm({ title: '', document_type: 'OTHER', folder_name: '', file: null }); }}
                                        style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: '1px solid var(--admin-border-soft)', background: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Vault Tabs */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--admin-row-alt)', padding: 4, borderRadius: 12 }}>
                            {[
                                { id: 'documents', label: 'Documents', icon: FileText },
                                { id: 'reports', label: 'Reports', icon: Shield },
                                { id: 'notices', label: 'Notices', icon: Activity },
                            ].map(tab => (
                                <button 
                                    key={tab.id} 
                                    onClick={() => setVaultTab(tab.id)}
                                    style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', background: vaultTab === tab.id ? 'var(--admin-surface)' : 'transparent', color: vaultTab === tab.id ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: vaultTab === tab.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                                >
                                    <tab.icon size={14} /> {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Folder Filter for Documents */}
                        {vaultTab === 'documents' && (
                            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 12, scrollbarWidth: 'none' }}>
                                {['all', ...new Set(vaultData.documents.map(d => d.folder))].map(folder => (
                                    <button 
                                        key={folder}
                                        onClick={() => setSelectedFolderId(folder)}
                                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: selectedFolderId === folder ? '#3b82f6' : 'var(--admin-surface-soft)', color: selectedFolderId === folder ? 'white' : 'var(--admin-text-primary)', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}
                                    >
                                        {folder === 'all' ? 'All Files' : folder}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 500, overflowY: 'auto' }}>
                            {vaultTab === 'documents' && vaultData.documents.filter(d => selectedFolderId === 'all' || d.folder === selectedFolderId).map((doc, idx) => (
                                <div key={`doc-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, background: 'var(--admin-row-alt)', cursor: 'pointer', border: '1px solid transparent' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={20} /></div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                                        <div style={{ fontSize: 11, color: doc.status === 'PENDING' ? '#f59e0b' : doc.status === 'REJECTED' ? '#f87171' : 'var(--admin-text-muted)' }}>{doc.folder || 'General'} • {doc.status}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {(doc.status === 'PENDING' || doc.status === 'REJECTED') ? (
                                            <label style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#f59e0b', color: 'white', cursor: fulfillingDocId === doc.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, opacity: fulfillingDocId === doc.id ? 0.6 : 1 }}>
                                                <Upload size={13} /> {fulfillingDocId === doc.id ? 'Uploading…' : 'Upload for Client'}
                                                <input type="file" disabled={fulfillingDocId === doc.id} style={{ display: 'none' }}
                                                    onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) handleFulfillDocument(doc.id, f); }} />
                                            </label>
                                        ) : (
                                            <>
                                                <button onClick={() => window.open(doc.file, '_blank')} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Preview"><Eye size={14} /></button>
                                                <button onClick={() => downloadVaultFile(doc.file, doc.title)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Download"><Download size={14} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            {vaultTab === 'reports' && vaultData.reports.map((rep, idx) => (
                                <div key={`rep-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, background: 'var(--admin-row-alt)', cursor: 'pointer' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={20} /></div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rep.title}</div>
                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Report • {rep.consultant}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <button onClick={() => window.open(rep.file, '_blank')} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Preview"><Eye size={14} /></button>
                                        <button onClick={() => downloadVaultFile(rep.file, rep.title)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Download"><Download size={14} /></button>
                                    </div>
                                </div>
                            ))}

                            {vaultTab === 'notices' && vaultData.notices?.map((notice, idx) => (
                                <div key={`notice-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, background: 'var(--admin-row-alt)', cursor: 'pointer' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(244,63,94,0.1)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity size={20} /></div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notice.title}</div>
                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Notice • {notice.priority}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <button onClick={() => window.open(notice.file, '_blank')} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Preview"><Eye size={14} /></button>
                                        <button onClick={() => downloadVaultFile(notice.file, notice.title)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f43f5e', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Download"><Download size={14} /></button>
                                    </div>
                                </div>
                            ))}

                            {((vaultTab === 'documents' && vaultData.documents.length === 0) || (vaultTab === 'reports' && vaultData.reports.length === 0) || (vaultTab === 'notices' && (!vaultData.notices || vaultData.notices.length === 0))) && (
                                <div style={{ padding: 40, textAlign: 'center', fontSize: 14, color: 'var(--admin-text-muted)', fontStyle: 'italic', background: 'var(--admin-row-alt)', borderRadius: 16 }}>
                                    No {vaultTab} found for this client.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Chat History Modal */}
            {selectedConversation && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setSelectedConversation(null)}>
                    <div style={{ width: '100%', maxWidth: 700, height: '85vh', background: isLight ? '#ffffff' : '#1e293b', borderRadius: 28, border: '1px solid var(--admin-border-strong)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--admin-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isLight ? '#f8fafc' : '#161e2e' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                                    {selectedConversation.consultant_name[0]}
                                </div>
                                <div>
                                    <button 
                                        onClick={() => window.open(`/Consultants/${selectedConversation.consultant_app_id}`, '_blank')}
                                        style={{ margin: 0, padding: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                                    >
                                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--admin-text-strong)', textDecoration: 'underline' }}>Chat with {selectedConversation.consultant_name}</h3>
                                    </button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>VIEW MODE (READ ONLY)</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedConversation(null)} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'var(--admin-row-alt)', color: 'var(--admin-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}><X size={20} /></button>
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20, background: isLight ? '#f1f5f9' : '#0f172a' }}>
                            {loadingMessages ? (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ width: 40, height: 40, border: '3px solid var(--admin-border-soft)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                    <div style={{ color: 'var(--admin-text-muted)', fontSize: 14, fontWeight: 600 }}>Loading conversation...</div>
                                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                </div>
                            ) : conversationMessages.length === 0 ? (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)', fontSize: 14, fontStyle: 'italic' }}>No messages in this conversation.</div>
                            ) : (
                                conversationMessages.map((msg, i) => {
                                    const isClient = msg.sender_role === 'CLIENT';
                                    return (
                                        <div key={msg.id} style={{ alignSelf: isClient ? 'flex-start' : 'flex-end', maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', padding: '0 8px', textAlign: isClient ? 'left' : 'right', display: 'flex', alignItems: 'center', justifyContent: isClient ? 'flex-start' : 'flex-end', gap: 8 }}>
                                                {isClient ? <><User size={10} /> {msg.sender_name}</> : <>{msg.sender_name} <Shield size={10} /></>}
                                                <span style={{ fontWeight: 500, opacity: 0.7 }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div style={{ 
                                                padding: '14px 20px', 
                                                borderRadius: isClient ? '4px 20px 20px 20px' : '20px 20px 4px 20px', 
                                                background: isClient ? (isLight ? '#ffffff' : '#1e293b') : '#3b82f6', 
                                                color: isClient ? 'var(--admin-text-primary)' : '#ffffff', 
                                                border: isClient ? '1px solid var(--admin-border-soft)' : 'none', 
                                                boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
                                                fontSize: 14, 
                                                lineHeight: 1.6,
                                                fontWeight: 500
                                            }}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        
                        <div style={{ padding: '20px 28px', borderTop: '1px solid var(--admin-border-soft)', background: isLight ? '#f8fafc' : '#161e2e', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--admin-text-muted)', fontSize: 13, fontWeight: 700, background: 'var(--admin-row-alt)', padding: '8px 20px', borderRadius: 20 }}>
                                <Shield size={16} /> This is a secure audit-only view of the conversation.
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Ticket Creation Modal */}
            {isTicketModalOpen && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)'
                }} onClick={() => setIsTicketModalOpen(false)}>
                    <div style={{
                        width: '90%', maxWidth: 500, background: 'var(--admin-surface)',
                        borderRadius: 24, padding: 32, boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                        border: '1px solid var(--admin-border-soft)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--admin-text-primary)' }}>Raise New Ticket</h3>
                            <button onClick={() => setIsTicketModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 8 }}>Subject</label>
                                <input 
                                    type="text" 
                                    value={newTicket.subject}
                                    onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                                    placeholder="Brief summary of the issue"
                                    style={{
                                        width: '100%', padding: '12px 16px', borderRadius: 12,
                                        background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)',
                                        color: 'var(--admin-text-primary)', fontSize: 14, outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 8 }}>Priority</label>
                                    <select 
                                        value={newTicket.priority}
                                        onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                                        style={{
                                            width: '100%', padding: '12px 16px', borderRadius: 12,
                                            background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)',
                                            color: 'var(--admin-text-primary)', fontSize: 14, outline: 'none'
                                        }}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 8 }}>Category</label>
                                    <select 
                                        value={newTicket.category}
                                        onChange={e => setNewTicket({...newTicket, category: e.target.value})}
                                        style={{
                                            width: '100%', padding: '12px 16px', borderRadius: 12,
                                            background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)',
                                            color: 'var(--admin-text-primary)', fontSize: 14, outline: 'none'
                                        }}
                                    >
                                        <option value="platform_issue">Platform Issue</option>
                                        <option value="billing">Billing</option>
                                        <option value="consultant_complaint">Consultant Complaint</option>
                                        <option value="client_complaint">Client Complaint</option>
                                        <option value="service_delay">Service Delay</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 8 }}>Description</label>
                                <textarea 
                                    rows={4}
                                    value={newTicket.description}
                                    onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                                    placeholder="Detailed explanation of the problem..."
                                    style={{
                                        width: '100%', padding: '12px 16px', borderRadius: 12,
                                        background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)',
                                        color: 'var(--admin-text-primary)', fontSize: 14, outline: 'none',
                                        resize: 'none'
                                    }}
                                />
                            </div>

                            <button 
                                onClick={createTicket}
                                disabled={creatingTicket || !newTicket.subject || !newTicket.description}
                                style={{
                                    marginTop: 8, padding: '14px', borderRadius: 14,
                                    background: '#3b82f6', color: 'white', border: 'none',
                                    fontSize: 15, fontWeight: 800, cursor: 'pointer',
                                    opacity: (creatingTicket || !newTicket.subject || !newTicket.description) ? 0.6 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                                }}
                            >
                                {creatingTicket ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
                                Create Ticket
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AdminClientDetail;

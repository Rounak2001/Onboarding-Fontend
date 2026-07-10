import { apiUrl } from '../utils/apiBase';

const getHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
};

// Normalize a single ambassador record from the backend's snake_case shape
// to the camelCase shape expected by AdminAmbassadors.jsx.
const normalizeAmbassador = (raw) => {
    const status = raw.status || 'PENDING';
    const isActive = status === 'ACTIVE';
    let kycStatus = 'pending';
    if (status === 'ACTIVE' || status === 'COMPLETED') kycStatus = 'verified';
    if (status === 'SUSPENDED') kycStatus = 'rejected';

    return {
        id: String(raw.id),
        name: raw.full_name || '',
        email: raw.email || '',
        phone: raw.phone || '',
        college: raw.college_name || '',
        city: raw.city || '',
        panNumber: raw.pan_number || '',
        bankAccount: raw.bank_account_masked || '',
        ifscCode: raw.bank_ifsc || '',
        isActive,
        kycStatus,
        agreementSigned: !!raw.agreement_signed,
        testTransferDone: !!raw.test_transfer_done,
        trainingCompleted: !!raw.training_completed,
        couponCode: raw.coupon_code || '',
        couponActive: !!raw.coupon_active,
        totalReferrals: Number(raw.total_referrals) || 0,
        totalCommission: Number(raw.total_commission) || 0,
        tier: Number(raw.tier) || 1,
        joinedAt: raw.created_at || raw.activated_at || '',
    };
};

export const fetchPMAmbassadors = async (page = 1, statusFilter = '') => {
    let url = `/ambassador/pm/ambassadors/?page=${page}&page_size=100`;
    if (statusFilter && statusFilter !== 'all') {
        let statusVal = '';
        if (statusFilter === 'active') statusVal = 'ACTIVE';
        if (statusFilter === 'inactive') statusVal = 'SUSPENDED';
        if (statusFilter === 'pending_kyc') statusVal = 'PENDING';
        if (statusVal) url += `&status=${statusVal}`;
    }
    const res = await fetch(apiUrl(url), { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch ambassadors');
    const json = await res.json();
    const page_data = json.data || {};
    const results = Array.isArray(page_data.results) ? page_data.results : [];
    return {
        results: results.map(normalizeAmbassador),
        total: page_data.total || results.length,
        page: page_data.page || page,
    };
};

export const pmActivateAmbassador = async (ambassadorId) => {
    const res = await fetch(apiUrl(`/ambassador/pm/ambassadors/${ambassadorId}/activate/`), {
        method: 'POST',
        headers: getHeaders(),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Activation failed');
    }
    return res.json();
};

export const pmSuspendAmbassador = async (ambassadorId, reason = '') => {
    const res = await fetch(apiUrl(`/ambassador/pm/ambassadors/${ambassadorId}/suspend/`), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Suspension failed');
    }
    return res.json();
};

export const pmToggleCoupon = async (ambassadorId, active) => {
    const res = await fetch(apiUrl(`/ambassador/pm/ambassadors/${ambassadorId}/toggle-coupon/`), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ active }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Coupon toggle failed');
    }
    return res.json();
};

export const pmMarkTestTransfer = async (ambassadorId) => {
    const res = await fetch(apiUrl(`/ambassador/pm/ambassadors/${ambassadorId}/mark-test-transfer/`), {
        method: 'POST',
        headers: getHeaders(),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Test transfer record failed');
    }
    return res.json();
};

export const pmRegenerateCertificate = async (ambassadorId) => {
    const res = await fetch(apiUrl(`/ambassador/pm/ambassadors/${ambassadorId}/regenerate-certificate/`), {
        method: 'POST',
        headers: getHeaders(),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Certificate generation failed');
    }
    const json = await res.json();
    return json.data;
};

export const fetchPMQuizAttempts = async (ambassadorId) => {
    const res = await fetch(apiUrl(`/ambassador/pm/ambassadors/${ambassadorId}/quiz-attempts/`), {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch quiz attempts');
    const json = await res.json();
    return json.data;
};

export const fetchPMDailyReports = async (ambassadorId) => {
    const res = await fetch(apiUrl(`/ambassador/pm/ambassadors/${ambassadorId}/reports/`), {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch reports');
    const json = await res.json();
    return json.data;
};

export const fetchPMModuleProgress = async (ambassadorId) => {
    const res = await fetch(apiUrl(`/ambassador/pm/ambassadors/${ambassadorId}/module-progress/`), {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch module progress');
    const json = await res.json();
    return json.data;
};

export const fetchPMAmbassadorCallLogs = async (ambassadorId) => {
    const res = await fetch(apiUrl(`/ambassador/pm/ambassadors/${ambassadorId}/call-logs/`), {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch call logs');
    const json = await res.json();
    return json.data;
};

export const pmSaveAmbassadorCallTracking = async (ambassadorId, payload) => {
    const res = await fetch(apiUrl(`/ambassador/pm/ambassadors/${ambassadorId}/call-tracking/`), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
        throw new Error(json.error || 'Failed to save call tracking');
    }
    return json.data;
};

export const fetchPMPayoutPreview = async (month) => {
    const url = month
        ? apiUrl(`/ambassador/pm/payouts/preview/?month=${month}`)
        : apiUrl(`/ambassador/pm/payouts/preview/`);
    const res = await fetch(url, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch payout preview');
    const json = await res.json();
    return json.data;
};

export const pmProcessPayouts = async (month) => {
    const res = await fetch(apiUrl(`/ambassador/pm/payouts/process/`), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ month }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Processing payouts failed');
    }
    const json = await res.json();
    return json.data;
};

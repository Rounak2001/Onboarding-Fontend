import axios from 'axios';
import { API_BASE_URL } from '../../../../utils/apiBase';
import { getAdminToken, clearAdminSession } from '../../../../utils/adminSession';

// Dedicated axios instance for WhatsApp admin calls.
// Reads the existing admin JWT (admin_token) — same token AdminLogin already stores.
const waApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

waApi.interceptors.request.use(
  (config) => {
    const token = getAdminToken();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

waApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAdminSession();
      // Don't auto-redirect — admin routes handle their own redirect via AdminLogin
    }
    return Promise.reject(error);
  },
);

const unwrap = (response) => response.data?.data ?? response.data;

// ─── Summary + Conversations ─────────────────────────────────────────────────

export const fetchAdminSummary = async () => {
  const res = await waApi.get('/whatsapp-bot/admin/summary/');
  return unwrap(res);
};

export const fetchConversations = async ({
  page = 1,
  search = '',
  stage = '',
  category = '',
  handoff = false,
  assignedTo = '',
  temperature = '',
  unassigned = false,
} = {}) => {
  const res = await waApi.get('/whatsapp-bot/admin/conversations/', {
    params: {
      page,
      page_size: 25,
      search: search || undefined,
      stage: stage || undefined,
      category: category || undefined,
      handoff: handoff ? 'true' : undefined,
      assigned_to: assignedTo || undefined,
      temperature: temperature || undefined,
      unassigned: unassigned ? 'true' : undefined,
    },
  });
  return unwrap(res);
};

export const fetchConversationDetail = async (conversationId) => {
  const res = await waApi.get(`/whatsapp-bot/admin/conversations/${conversationId}/`);
  return unwrap(res);
};

export const fetchConversationMessages = async (conversationId, { page = 1, pageSize = 20 } = {}) => {
  const res = await waApi.get(
    `/whatsapp-bot/admin/conversations/${conversationId}/messages/`,
    { params: { page, page_size: pageSize } },
  );
  return unwrap(res);
};

export const clearConversation = async (conversationId) => {
  const res = await waApi.delete(`/whatsapp-bot/admin/conversations/${conversationId}/clear/`);
  return unwrap(res);
};

// ─── Handoff ─────────────────────────────────────────────────────────────────

export const claimHandoff = async (conversationId) => {
  const res = await waApi.post(`/whatsapp-bot/admin/conversations/${conversationId}/handoff/claim/`);
  return unwrap(res);
};

export const sendHandoffMessage = async (conversationId, text) => {
  const res = await waApi.post(
    `/whatsapp-bot/admin/conversations/${conversationId}/handoff/send/`,
    { text },
    { timeout: 20000 },
  );
  return unwrap(res);
};

export const resolveHandoff = async (conversationId, summary = '') => {
  const res = await waApi.post(
    `/whatsapp-bot/admin/conversations/${conversationId}/handoff/resolve/`,
    { summary },
  );
  return unwrap(res);
};

// ─── Single-conversation follow-up (templates) ───────────────────────────────

export const fetchFollowupPreview = async (conversationId) => {
  const res = await waApi.get(`/whatsapp-bot/admin/conversations/${conversationId}/followup/preview/`);
  return unwrap(res);
};

export const sendFollowup = async (conversationId, variables, templateName) => {
  const res = await waApi.post(
    `/whatsapp-bot/admin/conversations/${conversationId}/followup/send/`,
    { variables, ...(templateName ? { template_name: templateName } : {}) },
    { timeout: 20000 },
  );
  return unwrap(res);
};

export const suppressFollowups = async (conversationId) => {
  const res = await waApi.post(`/whatsapp-bot/admin/conversations/${conversationId}/followup/suppress/`);
  return unwrap(res);
};

export const resumeFollowups = async (conversationId) => {
  const res = await waApi.post(`/whatsapp-bot/admin/conversations/${conversationId}/followup/resume/`);
  return unwrap(res);
};

// ─── Templates (Meta-approved) ───────────────────────────────────────────────

export const fetchTemplates = async ({ forceRefresh = false } = {}) => {
  const res = await waApi.get('/whatsapp-bot/admin/templates/', {
    params: forceRefresh ? { refresh: '1' } : undefined,
  });
  return unwrap(res);
};

export const submitTemplate = async (data) => {
  const res = await waApi.post('/whatsapp-bot/admin/templates/submit/', data, { timeout: 20000 });
  return unwrap(res);
};

// ─── Bulk follow-ups ─────────────────────────────────────────────────────────

export const previewBulkFollowup = async (stage, category = '') => {
  const res = await waApi.post('/whatsapp-bot/admin/bulk-followup/preview/', {
    stage,
    category: category || '',
  });
  return unwrap(res);
};

export const sendBulkFollowup = async ({ stage, category = '', templateName, extraVariables = [] }) => {
  const res = await waApi.post(
    '/whatsapp-bot/admin/bulk-followup/send/',
    { stage, category: category || '', template_name: templateName, extra_variables: extraVariables },
    { timeout: 30000 },
  );
  return unwrap(res);
};

export const getBulkFollowupStatus = async (jobId) => {
  const res = await waApi.get(`/whatsapp-bot/admin/bulk-followup/status/${jobId}/`);
  return unwrap(res);
};

// ─── Cart ────────────────────────────────────────────────────────────────────

export const fetchConversationCart = async (conversationId) => {
  const res = await waApi.get(`/whatsapp-bot/admin/conversations/${conversationId}/cart/`);
  return unwrap(res);
};

export const updateConversationCart = async (conversationId, items) => {
  const res = await waApi.post(
    `/whatsapp-bot/admin/conversations/${conversationId}/cart/update/`,
    { items },
    { timeout: 20000 },
  );
  return unwrap(res);
};

// ─── Sales CRM ───────────────────────────────────────────────────────────────

export const fetchSalesPersons = async () => {
  const res = await waApi.get('/whatsapp-bot/admin/sales-persons/');
  return unwrap(res);
};

export const createSalesPerson = async (data) => {
  const res = await waApi.post('/whatsapp-bot/admin/sales-persons/', data);
  return unwrap(res);
};

export const updateSalesPerson = async (spId, data) => {
  const res = await waApi.patch(`/whatsapp-bot/admin/sales-persons/${spId}/`, data);
  return unwrap(res);
};

export const deleteSalesPerson = async (spId) => {
  const res = await waApi.delete(`/whatsapp-bot/admin/sales-persons/${spId}/`);
  return unwrap(res);
};

export const assignConversation = async (conversationId, salesPersonId, authorId) => {
  const res = await waApi.patch(
    `/whatsapp-bot/admin/conversations/${conversationId}/assign/`,
    { sales_person_id: salesPersonId, author_id: authorId },
  );
  return unwrap(res);
};

export const setConversationTemperature = async (conversationId, temperature, authorId) => {
  const res = await waApi.patch(
    `/whatsapp-bot/admin/conversations/${conversationId}/temperature/`,
    { temperature, author_id: authorId },
  );
  return unwrap(res);
};

export const fetchConversationActivities = async (conversationId, page = 1) => {
  const res = await waApi.get(
    `/whatsapp-bot/admin/conversations/${conversationId}/activities/`,
    { params: { page, page_size: 30 } },
  );
  return unwrap(res);
};

export const addConversationNote = async (conversationId, body, authorId) => {
  const res = await waApi.post(
    `/whatsapp-bot/admin/conversations/${conversationId}/activities/`,
    { body, author_id: authorId },
  );
  return unwrap(res);
};

export const logCall = async (conversationId, data) => {
  const res = await waApi.post(`/whatsapp-bot/admin/conversations/${conversationId}/call-logs/`, data);
  return unwrap(res);
};

export const fetchFollowupsDue = async (salesPersonId) => {
  const res = await waApi.get('/whatsapp-bot/admin/followups/due/', {
    params: salesPersonId ? { sales_person_id: salesPersonId } : {},
  });
  return unwrap(res);
};

export const fetchFollowupsUpcoming = async (salesPersonId) => {
  const res = await waApi.get('/whatsapp-bot/admin/followups/upcoming/', {
    params: salesPersonId ? { sales_person_id: salesPersonId } : {},
  });
  return unwrap(res);
};

export const snoozeFollowup = async (followupId, snoozeHours = 24) => {
  const res = await waApi.patch(`/whatsapp-bot/admin/followups/${followupId}/snooze/`, {
    snooze_hours: snoozeHours,
  });
  return unwrap(res);
};

export const markFollowupDone = async (followupId) => {
  const res = await waApi.patch(`/whatsapp-bot/admin/followups/${followupId}/done/`);
  return unwrap(res);
};

export const fetchCampaigns = async () => {
  const res = await waApi.get('/whatsapp-bot/admin/campaigns/');
  return unwrap(res);
};

export const createCampaign = async (data) => {
  const res = await waApi.post('/whatsapp-bot/admin/campaigns/', data, { timeout: 30000 });
  return unwrap(res);
};

export const refreshCampaignStats = async (campaignId) => {
  const res = await waApi.post(`/whatsapp-bot/admin/campaigns/${campaignId}/`);
  return unwrap(res);
};

export const importContacts = async (contacts, assignRoundRobin = false) => {
  const res = await waApi.post(
    '/whatsapp-bot/admin/import-contacts/',
    { contacts, assign_round_robin: assignRoundRobin },
    { timeout: 60000 },
  );
  return unwrap(res);
};

// ─── Module-level template cache ─────────────────────────────────────────────

let _cachedTemplates = null;
let _cachedStageDefaults = null;

export function bustTemplateCache() {
  _cachedTemplates = null;
  _cachedStageDefaults = null;
}

export async function getOrFetchTemplates({ forceRefresh = false } = {}) {
  if (!forceRefresh && _cachedTemplates !== null) {
    return { templates: _cachedTemplates, stage_defaults: _cachedStageDefaults };
  }
  const data = await fetchTemplates({ forceRefresh });
  if (data?.templates) {
    _cachedTemplates = data.templates;
    _cachedStageDefaults = data.stage_defaults || {};
  }
  return { templates: data?.templates || [], stage_defaults: data?.stage_defaults || {} };
}

export default waApi;

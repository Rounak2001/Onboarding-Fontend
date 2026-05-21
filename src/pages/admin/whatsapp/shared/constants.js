import {
  AlertCircle,
  Brain,
  Calculator,
  CalendarCheck,
  CreditCard,
  Hash,
  Link as LinkIcon,
  List,
  MousePointerClick,
  Package,
  PhoneCall,
  Tag,
  Users,
  Zap,
} from 'lucide-react';

export const STAGE_CONFIG = {
  new_contact:              { short: 'New',        label: 'New Contact',          bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'   },
  context_resolved:         { short: 'Context',    label: 'Intent Understood',    bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  category_selection:       { short: 'Category',   label: 'Picking Category',     bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  service_selection:        { short: 'Service',    label: 'Picking Service',      bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500'  },
  addon_selection:          { short: 'Add-ons',    label: 'Picking Add-ons',      bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: 'bg-indigo-500'  },
  addon_quantity_selection: { short: 'Quantity',   label: 'Setting Quantity',     bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500'  },
  price_summary:            { short: 'Price',      label: 'Price Summary',        bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500'  },
  consultant_selection:     { short: 'Consultant', label: 'Picking Consultant',   bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-500'     },
  consultant_reserved:      { short: 'Reserved',   label: 'Consultant Reserved',  bg: 'bg-cyan-100',    text: 'text-cyan-700',    dot: 'bg-cyan-500'    },
  checkout_link_sent:       { short: 'Checkout',   label: 'Checkout Sent',        bg: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-500'    },
  payment_pending:          { short: 'Payment',    label: 'Payment Pending',      bg: 'bg-yellow-100',  text: 'text-yellow-700',  dot: 'bg-yellow-500'  },
  handoff_pending:          { short: 'Handoff',    label: 'Awaiting Human',       bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  paid:                     { short: 'Paid',       label: 'Paid',                 bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500'   },
  closed:                   { short: 'Closed',     label: 'Closed',               bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400'    },
  fallback:                 { short: 'Fallback',   label: 'Fallback',             bg: 'bg-red-100',     text: 'text-red-600',     dot: 'bg-red-400'     },
  disqualified:             { short: 'Disqual',    label: 'Disqualified',         bg: 'bg-gray-100',    text: 'text-gray-500',    dot: 'bg-gray-300'    },
  unknown:                  { short: '?',          label: 'Unknown',              bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-300'   },
};

export const DECISION_CONFIG = {
  context_resolved:         { label: 'Understood User Intent',     description: 'Bot figured out what the user is looking for and routed them to the right step', icon: Brain,         iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', accent: 'border-l-emerald-400' },
  category_selection:       { label: 'Sent Category Menu',         description: 'Bot displayed tax category options (ITR, GSTR, TDS…) for the user to choose',     icon: Tag,           iconBg: 'bg-blue-100',    iconText: 'text-blue-600',    accent: 'border-l-blue-400'    },
  service_selection:        { label: 'Listed Available Services',  description: 'Bot showed specific services in the chosen tax category',                          icon: List,          iconBg: 'bg-violet-100',  iconText: 'text-violet-600',  accent: 'border-l-violet-400'  },
  addon_selection:          { label: 'Offered Add-on Services',    description: 'Bot presented optional extras the user can include in their order',                icon: Package,       iconBg: 'bg-indigo-100',  iconText: 'text-indigo-600',  accent: 'border-l-indigo-400'  },
  addon_quantity_selection: { label: 'Asked for Quantity',         description: 'Bot asked how many units or assessment years the user needs',                    icon: Hash,          iconBg: 'bg-purple-100',  iconText: 'text-purple-600',  accent: 'border-l-purple-400'  },
  price_summary:            { label: 'Showed Price Breakdown',     description: 'Bot calculated the total cost and displayed the full price summary',              icon: Calculator,    iconBg: 'bg-orange-100',  iconText: 'text-orange-600',  accent: 'border-l-orange-400'  },
  consultant_selection:     { label: 'Presented Consultant List',  description: 'Bot showed available consultants for the user to pick from',                      icon: Users,         iconBg: 'bg-sky-100',     iconText: 'text-sky-600',     accent: 'border-l-sky-400'     },
  consultant_reserved:      { label: 'Consultant Reserved',        description: 'Bot reserved a consultant slot for the user and is awaiting confirmation',        icon: CalendarCheck, iconBg: 'bg-cyan-100',    iconText: 'text-cyan-600',    accent: 'border-l-cyan-400'    },
  checkout_link_sent:       { label: 'Checkout Link Sent',         description: 'Bot sent the payment checkout link to the user',                                  icon: LinkIcon,      iconBg: 'bg-teal-100',    iconText: 'text-teal-600',    accent: 'border-l-teal-400'    },
  payment_pending:          { label: 'Awaiting Payment',           description: 'Checkout link was opened but payment has not been confirmed yet',                  icon: CreditCard,    iconBg: 'bg-yellow-100',  iconText: 'text-yellow-600',  accent: 'border-l-yellow-400'  },
  handoff_pending:          { label: 'Escalated to Human Agent',   description: 'Bot handed this conversation to a human consultant for personal follow-up',       icon: PhoneCall,     iconBg: 'bg-amber-100',   iconText: 'text-amber-600',   accent: 'border-l-amber-400'   },
};

export const FALLBACK_DECISION_CONFIG = {
  label: 'Bot Action',
  description: 'Bot processed a step in the conversation flow',
  icon: Zap,
  iconBg: 'bg-slate-100',
  iconText: 'text-slate-500',
  accent: 'border-l-slate-300',
};

export const CATEGORY_OPTIONS = [
  { value: '',              label: 'All categories' },
  { value: 'ITR',           label: 'ITR' },
  { value: 'GSTR',          label: 'GSTR' },
  { value: 'TDS',           label: 'TDS' },
  { value: 'Registrations', label: 'Registrations' },
];

export const STAGE_OPTIONS = [
  { value: '',                          label: 'All stages'           },
  { value: 'new_contact',               label: 'New Contact'          },
  { value: 'context_resolved',          label: 'Intent Understood'    },
  { value: 'category_selection',        label: 'Category Selection'   },
  { value: 'service_selection',         label: 'Service Selection'    },
  { value: 'addon_selection',           label: 'Add-ons'              },
  { value: 'addon_quantity_selection',  label: 'Quantity'             },
  { value: 'price_summary',             label: 'Price Summary'        },
  { value: 'consultant_selection',      label: 'Consultant Selection' },
  { value: 'consultant_reserved',       label: 'Consultant Reserved'  },
  { value: 'checkout_link_sent',        label: 'Checkout Sent'        },
  { value: 'payment_pending',           label: 'Payment Pending'      },
  { value: 'handoff_pending',           label: 'Handoff Pending'      },
  { value: 'paid',                      label: 'Paid'                 },
  { value: 'closed',                    label: 'Closed'               },
  { value: 'fallback',                  label: 'Fallback'             },
];

export const BULK_STAGE_OPTIONS = [
  { value: 'price_summary',        label: 'Price Summary' },
  { value: 'consultant_reserved',  label: 'Consultant Reserved' },
  { value: 'checkout_link_sent',   label: 'Checkout Link Sent' },
  { value: 'payment_pending',      label: 'Payment Pending' },
  { value: 'handoff_pending',      label: 'Handoff Pending' },
  { value: 'category_selection',   label: 'Category Selection' },
  { value: 'service_selection',    label: 'Service Selection' },
];

export const TEMP_CONFIG = {
  hot:  { label: 'Hot',  emoji: '🔥', dot: 'bg-red-500',    text: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200'    },
  warm: { label: 'Warm', emoji: '🌤', dot: 'bg-amber-500',  text: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
  cold: { label: 'Cold', emoji: '❄️', dot: 'bg-sky-500',    text: 'text-sky-600',    bg: 'bg-sky-50',    border: 'border-sky-200'    },
  '':   { label: '—',    emoji: '',   dot: 'bg-slate-300',  text: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200'  },
};

export const OUTCOME_LABELS = {
  connected:      'Connected',
  voicemail:      'Left Voicemail',
  no_answer:      'No Answer',
  busy:           'Line Busy',
  callback:       'Callback Requested',
  interested:     'Interested — Follow Up',
  not_interested: 'Not Interested',
  wrong_number:   'Wrong Number',
  other:          'Other',
};

export const PAYLOAD_CONFIG = {
  cat:        { label: 'Category selected',    headerBg: 'bg-blue-500',    headerText: 'text-white' },
  svc:        { label: 'Service selected',     headerBg: 'bg-violet-500',  headerText: 'text-white' },
  addon:      { label: 'Add-on selected',      headerBg: 'bg-indigo-500',  headerText: 'text-white' },
  qty:        { label: 'Quantity chosen',      headerBg: 'bg-purple-500',  headerText: 'text-white' },
  consultant: { label: 'Consultant selected',  headerBg: 'bg-sky-500',     headerText: 'text-white' },
};

export const BOT_ACTION_CONFIG = {
  list:        { label: 'Menu Sent',   icon: List },
  flow:        { label: 'Form Sent',   icon: MousePointerClick },
  flow_failed: { label: 'Form Failed', icon: AlertCircle },
  list_failed: { label: 'Menu Failed', icon: AlertCircle },
};

const UPPERCASE_TERMS = new Set(['itr', 'gst', 'gstr', 'tds', 'pan', 'tan', 'llp', 'opc', 'pvt', 'ltd']);

export function humanizePayloadValue(value) {
  return value
    .split('_')
    .map((part) =>
      UPPERCASE_TERMS.has(part.toLowerCase())
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    )
    .join(' ');
}

export function parsePayload(text) {
  if (!text) return null;
  const match = text.match(/^([a-z_]+):(.+)$/i);
  if (!match) return null;
  const config = PAYLOAD_CONFIG[match[1].toLowerCase()];
  if (!config) return null;
  return { config, displayValue: humanizePayloadValue(match[2]) };
}

export function parseBotMessage(text) {
  if (!text) return null;
  const listMatch = text.match(/^WhatsApp\s+list\s+sent:\s*(.+)$/i);
  if (listMatch) return { ...BOT_ACTION_CONFIG.list, action: listMatch[1].trim() };
  const flowMatch = text.match(/^WhatsApp\s+flow\s+sent:\s*(.+)$/i);
  if (flowMatch) return { ...BOT_ACTION_CONFIG.flow, action: flowMatch[1].trim() };
  const flowFailedMatch = text.match(/^WhatsApp\s+flow\s+failed:\s*(.+)$/i);
  if (flowFailedMatch) return { ...BOT_ACTION_CONFIG.flow_failed, action: flowFailedMatch[1].trim(), failed: true };
  const listFailedMatch = text.match(/^WhatsApp\s+list\s+failed:\s*(.+)$/i);
  if (listFailedMatch) return { ...BOT_ACTION_CONFIG.list_failed, action: listFailedMatch[1].trim(), failed: true };
  return null;
}

export function getPreviewText(latestMessage, conversation) {
  const text = latestMessage?.display_text || latestMessage?.message_text;
  if (!text) return 'No messages yet';
  if (/^you selected:/i.test(text)) {
    const service = conversation.selected_service_title;
    return service ? `Selected: ${service}` : text.replace(/^you selected:\s*/i, '');
  }
  return text;
}

export function getSendErrorText(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  const parts = [
    error.message,
    error.code ? `code: ${error.code}` : '',
    error.error_subcode ? `subcode: ${error.error_subcode}` : '',
    error.type,
    error.fbtrace_id ? `trace: ${error.fbtrace_id}` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' | ') : JSON.stringify(error);
}

export function renderTemplatePreview(body, vars) {
  let text = body || '';
  (vars || []).forEach((val, idx) => {
    const placeholder = `{{${idx + 1}}}`;
    const replacement = val && val.trim() ? val.trim() : placeholder;
    text = text.split(placeholder).join(replacement);
  });
  return text;
}

export function countTemplateVars(body) {
  if (!body) return 0;
  const matches = body.match(/\{\{\d+\}\}/g) || [];
  const nums = matches.map((m) => parseInt(m.replace(/[{}]/g, ''), 10));
  return nums.length ? Math.max(...nums) : 0;
}

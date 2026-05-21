export const formatDateTime = (value) => {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN').format(Number(value || 0));

export const formatPhone = (value) => {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return `+91 ${digits.slice(2)}`;
  }
  return `+${digits}`;
};

export const formatTime = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const getDateLabel = (value) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

export const groupMessagesByDate = (messages) => {
  const groups = [];
  let currentKey = null;
  for (const msg of messages) {
    const key = msg.created_at ? new Date(msg.created_at).toDateString() : 'unknown';
    if (key !== currentKey) {
      currentKey = key;
      groups.push({ key, label: getDateLabel(msg.created_at), messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
};

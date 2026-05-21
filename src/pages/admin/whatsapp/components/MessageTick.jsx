import { Check, CheckCheck, Clock, X } from 'lucide-react';

export default function MessageTick({ status, variant = 'light' }) {
  const grey = variant === 'light' ? 'text-white/50' : 'text-slate-400';
  const blue = variant === 'light' ? 'text-blue-300' : 'text-blue-500';
  const red = variant === 'light' ? 'text-red-300' : 'text-red-400';
  if (status === 'sending') return <Clock size={13} className={grey} strokeWidth={2.5} />;
  if (status === 'read') return <CheckCheck size={14} className={blue} strokeWidth={2.5} />;
  if (status === 'delivered') return <CheckCheck size={14} className={grey} strokeWidth={2.5} />;
  if (status === 'sent' || status === 'stored') return <Check size={14} className={grey} strokeWidth={2.5} />;
  if (status === 'failed') return <X size={13} className={red} strokeWidth={2.5} />;
  return null;
}

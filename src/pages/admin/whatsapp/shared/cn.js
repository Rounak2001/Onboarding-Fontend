// Minimal classnames helper — like clsx but tiny, no deps.
export function cn(...args) {
  const out = [];
  for (const a of args) {
    if (!a) continue;
    if (typeof a === 'string' || typeof a === 'number') out.push(String(a));
    else if (Array.isArray(a)) {
      const inner = cn(...a);
      if (inner) out.push(inner);
    } else if (typeof a === 'object') {
      for (const k in a) if (a[k]) out.push(k);
    }
  }
  return out.join(' ');
}

// Shared form field class strings — keeps every page consistent.
// bg-slate-50 on unfocused state creates contrast against white modal background,
// making the border clearly visible without needing a dark border color.
export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10';

export const selectCls =
  'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10';

export const textareaCls =
  'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none resize-none transition focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10';

// Modal overlay + card
export const modalOverlayCls =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';

export const modalCardCls =
  'relative rounded-2xl bg-white shadow-2xl ring-1 ring-black/5';

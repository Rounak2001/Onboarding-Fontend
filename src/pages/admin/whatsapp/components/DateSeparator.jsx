export default function DateSeparator({ label }) {
  return (
    <div className="flex items-center justify-center py-3">
      <span className="rounded-full bg-white/85 backdrop-blur-sm px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm border border-slate-200/60">
        {label}
      </span>
    </div>
  );
}

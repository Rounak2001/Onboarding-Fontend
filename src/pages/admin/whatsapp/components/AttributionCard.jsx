import { Globe } from 'lucide-react';

export default function AttributionCard({ event }) {
  const eventLabel = event.event_type
    ? event.event_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Attribution Event';

  return (
    <div className="rounded-lg border border-[#2a3942] bg-[#1f2c34] p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#53bdeb]/15">
          <Globe size={13} className="text-[#53bdeb]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#e9edef]">{eventLabel}</p>
          {event.page_path && (
            <p className="mt-0.5 truncate text-xs text-[#8696a0]">{event.page_path}</p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(event.utm_campaign || event.source_platform) && (
              <span className="rounded bg-[#53bdeb]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#53bdeb]">
                {event.utm_campaign || event.source_platform}
              </span>
            )}
            {event.ref_code && (
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#e9edef]">
                {event.ref_code}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

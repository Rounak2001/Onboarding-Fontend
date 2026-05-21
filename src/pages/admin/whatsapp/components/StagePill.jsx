import { cn } from '../shared/cn';
import { STAGE_CONFIG } from '../shared/constants';

export default function StagePill({ stage, short = false, variant = 'light' }) {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.unknown;
  if (variant === 'dark') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-[#e9edef]">
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dot)} />
        {short ? config.short : config.label}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', config.bg, config.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dot)} />
      {short ? config.short : config.label}
    </span>
  );
}

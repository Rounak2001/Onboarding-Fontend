import { ArrowRight } from 'lucide-react';
import { cn } from '../shared/cn';
import { DECISION_CONFIG, FALLBACK_DECISION_CONFIG } from '../shared/constants';
import StagePill from './StagePill';

export default function BotDecisionCard({ decision }) {
  const key = decision.reason || decision.decision_type;
  const config = DECISION_CONFIG[key] || { ...FALLBACK_DECISION_CONFIG, label: key || FALLBACK_DECISION_CONFIG.label };
  const Icon = config.icon;
  const stageBefore = decision.stage_before || 'unknown';
  const stageAfter = decision.stage_after || 'unknown';
  const isStageChange = stageBefore !== stageAfter;

  return (
    <div className={cn('rounded-lg border border-[#2a3942] bg-[#1f2c34] border-l-4 p-3', config.accent)}>
      <div className="flex items-start gap-2.5">
        <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', config.iconBg)}>
          <Icon size={15} className={config.iconText} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#e9edef]">{config.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#8696a0]">{config.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StagePill stage={stageBefore} short variant="dark" />
            <ArrowRight size={12} className={isStageChange ? 'text-[#8696a0]' : 'text-[#2a3942]'} />
            <StagePill stage={stageAfter} short variant="dark" />
            {!isStageChange && (
              <span className="text-[10px] italic text-[#8696a0]">(no change)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import type { EvaluationResult } from '@/lib/types'

interface VerdictBadgeProps {
  verdict: EvaluationResult['verdict']
  total: number
  summary: string
}

const verdictConfig = {
  good: {
    label: '우수 시나리오 ✓',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
    textColor: 'text-emerald-800',
    scoreColor: 'text-emerald-700',
  },
  average: {
    label: '보통 시나리오',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-white',
    textColor: 'text-amber-800',
    scoreColor: 'text-amber-700',
  },
  poor: {
    label: '재검토 필요',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badgeBg: 'bg-red-500',
    badgeText: 'text-white',
    textColor: 'text-red-800',
    scoreColor: 'text-red-700',
  },
}

export default function VerdictBadge({ verdict, total, summary }: VerdictBadgeProps) {
  const cfg = verdictConfig[verdict]

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`${cfg.badgeBg} ${cfg.badgeText} px-4 py-1.5 rounded-full text-sm font-semibold`}>
            {cfg.label}
          </span>
        </div>
        <div className="text-right">
          <span className={`text-3xl font-bold ${cfg.scoreColor}`}>{total}</span>
          <span className="text-lg text-gray-400 font-normal">/30</span>
          <p className="text-xs text-gray-500 mt-0.5">총점</p>
        </div>
      </div>
      {summary && (
        <p className={`text-sm leading-relaxed ${cfg.textColor}`}>{summary}</p>
      )}
    </div>
  )
}

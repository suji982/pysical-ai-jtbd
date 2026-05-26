import type { ScoreDetail } from '@/lib/types'

interface ScoreCardProps {
  title: string
  detail: ScoreDetail
  subtitle?: string
}

function getScoreColor(score: number): { bg: string; text: string; badge: string } {
  if (score >= 8) {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800',
    }
  }
  if (score >= 5) {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-800',
    }
  }
  return {
    bg: 'bg-red-50',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
  }
}

function ScoreBar({ score }: { score: number }) {
  const color = getScoreColor(score)
  const pct = (score / 10) * 100

  return (
    <div className="mt-3">
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            score >= 8 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function ScoreCard({ title, detail, subtitle }: ScoreCardProps) {
  const color = getScoreColor(detail.score)

  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden`}>
      <div className={`px-4 py-3 ${color.bg} border-b border-gray-100`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {title}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className={`text-3xl font-bold ${color.text}`}>
            {detail.score}
            <span className="text-base font-normal text-gray-400">/10</span>
          </div>
        </div>
        <ScoreBar score={detail.score} />
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-gray-600 leading-relaxed">{detail.reason}</p>
      </div>
    </div>
  )
}

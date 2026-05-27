'use client'

import { useState } from 'react'
import type { EvaluationResult, FormFactor } from '@/lib/types'
import JTBDCard from './JTBDCard'
import ScoreCard from './ScoreCard'
import VerdictBadge from './VerdictBadge'
import { Loader2 } from 'lucide-react'

const FORM_FACTORS: { value: FormFactor; label: string; desc: string }[] = [
  {
    value: 'Luna',
    label: 'Luna',
    desc: '컴팩트 앰비언트 AI — 집/책상 환경에서 조용히 지켜보며 환경을 조절',
  },
  {
    value: 'Puco',
    label: 'Puco',
    desc: '휴대 가능한 모바일 컴패니언 — 이동 중에도 곁에서 함께',
  },
  {
    value: 'Moving',
    label: 'Moving',
    desc: '이동형 로보틱 AI — 공간 안에서 자율 이동하며 물리적 상호작용',
  },
]

export default function SingleEvaluator({ apiKey }: { apiKey: string }) {
  const [scenario, setScenario] = useState('')
  const [formFactor, setFormFactor] = useState<FormFactor>('Luna')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!scenario.trim()) {
      setError('시나리오를 입력해주세요.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['x-api-key'] = apiKey

      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ scenario: scenario.trim(), form_factor: formFactor }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '평가 중 오류가 발생했습니다.')
      }
      setResult(data as EvaluationResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Input panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">시나리오 입력</h2>

        {/* Scenario textarea */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            시나리오 <span className="text-red-400">*</span>
          </label>
          <textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            rows={5}
            placeholder="시나리오를 자유롭게 입력하세요. 예) '늦은 밤 혼자 거실에서 책을 읽고 있을 때, 눈이 피로해지고 집중력이 떨어지는데, 조명을 바꾸거나 음악을 조절하러 일어나기가 귀찮다...'"
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none transition-all"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            한국어 또는 영어로 자유롭게 입력하세요. AI가 JTBD 구조로 자동 변환합니다.
          </p>
        </div>

        {/* Form factor selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            폼팩터 선택
          </label>
          <div className="grid grid-cols-3 gap-3">
            {FORM_FACTORS.map((ff) => (
              <button
                key={ff.value}
                onClick={() => setFormFactor(ff.value)}
                className={`relative text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  formFactor === ff.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                      formFactor === ff.value
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {formFactor === ff.value && (
                      <div className="w-full h-full rounded-full bg-white scale-50" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      formFactor === ff.value ? 'text-indigo-700' : 'text-gray-700'
                    }`}
                  >
                    {ff.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed ml-5">{ff.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              AI가 시나리오를 분석 중입니다...
            </>
          ) : (
            '평가하기'
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* JTBD Card */}
          <JTBDCard jtbd={result.jtbd} formFactor={result.form_factor} />

          {/* Score Cards */}
          <div className="grid grid-cols-3 gap-4">
            <ScoreCard
              title="Job 충족도"
              subtitle="이 폼팩터가 핵심 Job을 해결하는가"
              detail={result.scores.job_satisfaction}
            />
            <ScoreCard
              title="대체 불가능성"
              subtitle="다른 디바이스로 해결하기 어려운가"
              detail={result.scores.irreplaceability}
            />
            <ScoreCard
              title="기회영역 타당성"
              subtitle="반복적이고 의미 있는 맥락인가"
              detail={result.scores.opportunity_validity}
            />
          </div>

          {/* Verdict */}
          <VerdictBadge
            verdict={result.verdict}
            total={result.total}
            summary={result.summary}
          />
        </div>
      )}
    </div>
  )
}

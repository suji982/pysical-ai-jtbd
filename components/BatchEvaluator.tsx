'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import type { EvaluationResult, FormFactor } from '@/lib/types'
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, XCircle, StopCircle } from 'lucide-react'

const FORM_FACTORS: FormFactor[] = ['Luna', 'Puco', 'Moving']

const verdictLabel: Record<EvaluationResult['verdict'], string> = {
  good: '우수',
  average: '보통',
  poor: '재검토 필요',
}

type ResultWithError = EvaluationResult & { error?: string }

const VALID_FF = new Set<string>(['Luna', 'Puco', 'Moving'])

function normalizeFormFactor(v: unknown, defaultFf: FormFactor): FormFactor {
  if (typeof v !== 'string') return defaultFf
  const t = v.trim()
  if (VALID_FF.has(t)) return t as FormFactor
  const match = ['Luna', 'Puco', 'Moving'].find(
    (ff) => ff.toLowerCase() === t.toLowerCase()
  )
  return (match as FormFactor | undefined) ?? defaultFf
}

function parseFile(file: File, defaultFf: FormFactor): Promise<{ scenario: string; form_factor: FormFactor }[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = XLSX.read(data, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        const parsed = rows
          .map((row) => {
            const scenario = String(
              row['scenario'] ?? row['시나리오'] ?? row['Scenario'] ?? ''
            ).trim()
            const ff = normalizeFormFactor(
              row['form_factor'] ?? row['폼팩터'] ?? row['FormFactor'],
              defaultFf
            )
            return { scenario, form_factor: ff }
          })
          .filter((r) => r.scenario.length > 0)
        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.readAsBinaryString(file)
  })
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['scenario', 'form_factor'],
    ['늦은 밤 혼자 거실에서 책을 읽고 있을 때 조명이 너무 밝아서 눈이 피로해진다', 'Luna'],
    ['아침에 출근 준비를 하면서 오늘 일정을 확인하고 싶은데 손이 바쁘다', 'Puco'],
    ['집에 돌아왔을 때 물건을 제자리에 정리해주는 도우미가 있으면 좋겠다', 'Moving'],
  ])
  ws['!cols'] = [{ wch: 60 }, { wch: 15 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '시나리오')
  XLSX.writeFile(wb, 'jtbd_template.xlsx')
}

function exportToExcel(results: ResultWithError[]) {
  const rows = results.map((r) => ({
    '시나리오': r.scenario,
    '폼팩터': r.form_factor,
    'When I': r.jtbd?.when_i ?? '',
    'I want to': r.jtbd?.i_want_to ?? '',
    'So I can': r.jtbd?.so_i_can ?? '',
    'But currently': r.jtbd?.but_currently ?? '',
    'And FormFactor': r.jtbd?.and_form_factor ?? '',
    'Job 충족도': r.scores?.job_satisfaction?.score ?? '',
    'Job 충족도 이유': r.scores?.job_satisfaction?.reason ?? '',
    '대체 불가능성': r.scores?.irreplaceability?.score ?? '',
    '대체 불가능성 이유': r.scores?.irreplaceability?.reason ?? '',
    '기회영역 타당성': r.scores?.opportunity_validity?.score ?? '',
    '기회영역 타당성 이유': r.scores?.opportunity_validity?.reason ?? '',
    '총점': r.total ?? '',
    '판정': r.verdict ? verdictLabel[r.verdict] : '',
    '종합 평가': r.summary ?? '',
    '오류': r.error ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 50 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 25 },
    { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 30 }, { wch: 10 },
    { wch: 30 }, { wch: 10 }, { wch: 30 }, { wch: 8 }, { wch: 10 },
    { wch: 40 }, { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '평가결과')
  XLSX.writeFile(wb, `jtbd_results_${Date.now()}.xlsx`)
}

export default function BatchEvaluator() {
  const [defaultFormFactor, setDefaultFormFactor] = useState<FormFactor>('Luna')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [results, setResults] = useState<ResultWithError[]>([])
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && /\.(csv|xlsx|xls)$/i.test(dropped.name)) {
      setFile(dropped)
      setError(null)
    } else {
      setError('CSV 또는 Excel 파일(.csv, .xlsx, .xls)만 업로드 가능합니다.')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setError(null) }
  }

  const handleStop = () => { abortRef.current = true }

  const handleSubmit = async () => {
    if (!file) { setError('파일을 먼저 업로드해주세요.'); return }

    setLoading(true)
    setError(null)
    setResults([])
    setProgress(0)
    setTotal(0)
    abortRef.current = false

    let rows: { scenario: string; form_factor: FormFactor }[]
    try {
      rows = await parseFile(file, defaultFormFactor)
    } catch {
      setError('파일 파싱에 실패했습니다. 파일 형식을 확인해주세요.')
      setLoading(false)
      return
    }

    if (rows.length === 0) {
      setError("유효한 시나리오가 없습니다. 'scenario' 또는 '시나리오' 컬럼을 확인해주세요.")
      setLoading(false)
      return
    }

    setTotal(rows.length)
    const accumulated: ResultWithError[] = []

    for (let i = 0; i < rows.length; i++) {
      if (abortRef.current) break
      const row = rows[i]
      try {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario: row.scenario, form_factor: row.form_factor }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '평가 오류')
        accumulated.push(data as EvaluationResult)
      } catch (err) {
        accumulated.push({
          scenario: row.scenario,
          form_factor: row.form_factor,
          jtbd: { when_i: '', i_want_to: '', so_i_can: '', but_currently: '', and_form_factor: '' },
          scores: {
            job_satisfaction: { score: 0, reason: '' },
            irreplaceability: { score: 0, reason: '' },
            opportunity_validity: { score: 0, reason: '' },
          },
          total: 0,
          verdict: 'poor',
          summary: '',
          error: err instanceof Error ? err.message : '알 수 없는 오류',
        })
      }
      setProgress(i + 1)
      setResults([...accumulated])
    }

    setLoading(false)
  }

  const getVerdictStyle = (verdict: EvaluationResult['verdict']) => {
    if (verdict === 'good') return 'bg-emerald-100 text-emerald-800'
    if (verdict === 'average') return 'bg-amber-100 text-amber-800'
    return 'bg-red-100 text-red-800'
  }

  const scoreColor = (s: number) =>
    s >= 8 ? 'text-emerald-600' : s >= 5 ? 'text-amber-600' : 'text-red-600'

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Upload panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800">일괄 평가</h2>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded-lg transition-all"
          >
            <Download className="w-4 h-4" />
            템플릿 다운로드
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !loading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all ${
            loading ? 'cursor-default' :
            dragging ? 'border-indigo-400 bg-indigo-50 cursor-copy' :
            file ? 'border-emerald-400 bg-emerald-50 cursor-pointer' :
            'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
              <p className="text-xs text-emerald-600">
                {(file.size / 1024).toFixed(1)} KB{loading ? '' : ' — 클릭하여 다시 선택'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-10 h-10 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">
                CSV 또는 Excel 파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-xs text-gray-400">
                .csv, .xlsx, .xls 지원 · 컬럼: scenario, form_factor (선택)
              </p>
            </div>
          )}
        </div>

        {/* Default form factor */}
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            기본 폼팩터 <span className="text-gray-400 font-normal">(파일에 form_factor 컬럼이 없을 때 사용)</span>
          </label>
          <div className="flex gap-2">
            {FORM_FACTORS.map((ff) => (
              <button
                key={ff}
                onClick={() => setDefaultFormFactor(ff)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all disabled:opacity-50 ${
                  defaultFormFactor === ff
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {ff}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Progress */}
        {loading && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
              <span className="font-medium">평가 진행 중... ({pct}%)</span>
              <span className="text-gray-400">{progress} / {total}건</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              시나리오당 약 5~10초 소요됩니다. 창을 닫지 마세요.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading || !file}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                평가 중...
              </>
            ) : '평가 시작'}
          </button>
          {loading && (
            <button
              onClick={handleStop}
              className="px-4 py-3 border-2 border-red-300 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition-all flex items-center gap-2 text-sm"
            >
              <StopCircle className="w-4 h-4" />
              중단
            </button>
          )}
        </div>
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-800">
                {loading ? `평가 중 — ${results.length}건 완료` : `평가 완료 — ${results.length}건`}
              </h3>
            </div>
            <button
              onClick={() => exportToExcel(results)}
              className="flex items-center gap-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 font-medium px-4 py-2 rounded-lg transition-all"
            >
              <Download className="w-4 h-4" />
              Excel로 내보내기
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">시나리오</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">폼팩터</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Job 충족도</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">대체 불가</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">기회 타당성</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">총점</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">판정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      {r.error ? (
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-gray-700 text-xs line-clamp-2 max-w-xs">{r.scenario}</p>
                            <p className="text-red-500 text-xs mt-0.5">{r.error}</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-800 text-xs line-clamp-2 max-w-xs">{r.scenario}</p>
                          {r.jtbd?.i_want_to && (
                            <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">→ {r.jtbd.i_want_to}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {r.form_factor}
                      </span>
                    </td>
                    {r.error ? (
                      <>
                        <td className="px-3 py-3 text-center text-gray-300">—</td>
                        <td className="px-3 py-3 text-center text-gray-300">—</td>
                        <td className="px-3 py-3 text-center text-gray-300">—</td>
                        <td className="px-3 py-3 text-center text-gray-300">—</td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-xs text-red-500">오류</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-bold ${scoreColor(r.scores.job_satisfaction.score)}`}>
                            {r.scores.job_satisfaction.score}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-bold ${scoreColor(r.scores.irreplaceability.score)}`}>
                            {r.scores.irreplaceability.score}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-bold ${scoreColor(r.scores.opportunity_validity.score)}`}>
                            {r.scores.opportunity_validity.score}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm font-bold text-gray-800">{r.total}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getVerdictStyle(r.verdict)}`}>
                            {verdictLabel[r.verdict]}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

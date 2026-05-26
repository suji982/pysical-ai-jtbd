import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { evaluateScenario } from '@/lib/claude'
import type { FormFactor, EvaluationResult, BatchRow } from '@/lib/types'

const VALID_FORM_FACTORS: FormFactor[] = ['Luna', 'Puco', 'Moving']

function parseFormFactor(value: unknown, defaultFf: FormFactor): FormFactor {
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (VALID_FORM_FACTORS.includes(normalized as FormFactor)) {
      return normalized as FormFactor
    }
    // Case-insensitive match
    const match = VALID_FORM_FACTORS.find(
      (ff) => ff.toLowerCase() === normalized.toLowerCase()
    )
    if (match) return match
  }
  return defaultFf
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const defaultFormFactorRaw = (formData.get('default_form_factor') as string) || 'Luna'
    const defaultFormFactor = parseFormFactor(defaultFormFactorRaw, 'Luna')

    if (!file) {
      return NextResponse.json({ error: '파일을 업로드해주세요.' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    if (rows.length === 0) {
      return NextResponse.json({ error: '파일에 데이터가 없습니다.' }, { status: 400 })
    }

    if (rows.length > 50) {
      console.warn(
        `경고: ${rows.length}개 행을 처리합니다. 50개 초과 시 타임아웃이 발생할 수 있습니다.`
      )
    }

    // Extract rows
    const batchRows: BatchRow[] = rows.map((row) => {
      const scenario =
        String(row['scenario'] ?? row['시나리오'] ?? row['Scenario'] ?? '').trim()
      const ffRaw = row['form_factor'] ?? row['폼팩터'] ?? row['FormFactor'] ?? ''
      const form_factor = parseFormFactor(ffRaw, defaultFormFactor)
      return { scenario, form_factor }
    })

    const validRows = batchRows.filter((r) => r.scenario.length > 0)

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "파일에 유효한 시나리오가 없습니다. 'scenario' 또는 '시나리오' 컬럼을 확인해주세요.",
        },
        { status: 400 }
      )
    }

    // Process sequentially to avoid rate limits
    const results: (EvaluationResult & { error?: string })[] = []

    for (const row of validRows) {
      try {
        const result = await evaluateScenario(row.scenario, row.form_factor ?? defaultFormFactor)
        results.push(result)
      } catch (err) {
        const message = err instanceof Error ? err.message : '평가 오류'
        results.push({
          scenario: row.scenario,
          form_factor: row.form_factor ?? defaultFormFactor,
          jtbd: {
            when_i: '',
            i_want_to: '',
            so_i_can: '',
            but_currently: '',
            and_form_factor: '',
          },
          scores: {
            job_satisfaction: { score: 0, reason: '' },
            irreplaceability: { score: 0, reason: '' },
            opportunity_validity: { score: 0, reason: '' },
          },
          total: 0,
          verdict: 'poor',
          summary: '',
          error: message,
        })
      }
    }

    return NextResponse.json({ results, total: results.length })
  } catch (error) {
    console.error('Batch API error:', error)
    const message = error instanceof Error ? error.message : '일괄 처리 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { evaluateScenario } from '@/lib/claude'
import type { FormFactor } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scenario, form_factor } = body as { scenario: string; form_factor: string }

    if (!scenario || typeof scenario !== 'string' || scenario.trim().length === 0) {
      return NextResponse.json(
        { error: '시나리오를 입력해주세요.' },
        { status: 400 }
      )
    }

    const validFormFactors: FormFactor[] = ['Luna', 'Puco', 'Moving']
    if (!form_factor || !validFormFactors.includes(form_factor as FormFactor)) {
      return NextResponse.json(
        { error: '올바른 폼팩터를 선택해주세요. (Luna, Puco, Moving)' },
        { status: 400 }
      )
    }

    const result = await evaluateScenario(scenario.trim(), form_factor as FormFactor)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Evaluate API error:', error)
    const message = error instanceof Error ? error.message : '평가 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

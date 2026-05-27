import Anthropic from '@anthropic-ai/sdk'
import type { EvaluationResult, FormFactor } from './types'


const SYSTEM_PROMPT = `당신은 Physical AI 시나리오를 JTBD(Job to Be Done) 프레임워크로 분석하는 전문가입니다.

3가지 Physical AI 폼팩터:
- Luna: 컴팩트한 앰비언트 AI 컴패니언. 사용자의 상태(시간대, 자세, 환경)를 감지해 조명·음악 볼륨 등 주변 환경을 자동 조절. "누군가 조용히 지켜봐 주는" 느낌을 제공. 주로 집/책상 환경에서 사용.
- Puco: 휴대 가능한 Physical AI. 사용자 곁에서 이동하며 함께하는 모바일 컴패니언. 외출이나 이동 중에도 사용자의 상황을 인식하고 지원.
- Moving: 이동하며 물리적으로 상호작용하는 로보틱 Physical AI 폼팩터. 공간 내에서 자율적으로 이동하고 물리적 작업을 수행할 수 있음.

평가 기준:
1. Job 충족도 (1-10): 선택된 폼팩터가 사용자의 핵심 Job을 얼마나 잘 해결하는가. 10점은 이 폼팩터가 아니면 불가능한 수준, 1점은 전혀 적합하지 않음.
2. 대체 불가능성 (1-10): 이 시나리오를 기존 스마트폰, 스마트 스피커, 다른 AI로 해결하기 어려운 정도. 10점은 완전히 대체 불가, 1점은 기존 기기로 충분히 해결 가능.
3. 기회영역 타당성 (1-10): 이 시나리오가 얼마나 자주 반복되고 많은 사람들에게 의미 있는 맥락인가. 10점은 일상적이고 보편적, 1점은 너무 특수하거나 드문 상황.

판정 기준:
- 우수 (good): 총점 21점 이상
- 보통 (average): 총점 13~20점
- 재검토 필요 (poor): 총점 12점 이하

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:

{
  "jtbd": {
    "when_i": "상황/맥락 (언제, 어떤 상황에서)",
    "i_want_to": "핵심 Job (무엇을 하고 싶은지)",
    "so_i_can": "최종 목표/동기 (왜, 어떤 결과를 원하는지)",
    "but_currently": "현재의 문제/불편 (지금은 어떤 장애물이 있는지)",
    "and_form_factor": "선택된 폼팩터가 어떻게 이를 해결하는지"
  },
  "scores": {
    "job_satisfaction": {
      "score": 숫자(1-10),
      "reason": "점수 이유 한 문장"
    },
    "irreplaceability": {
      "score": 숫자(1-10),
      "reason": "점수 이유 한 문장"
    },
    "opportunity_validity": {
      "score": 숫자(1-10),
      "reason": "점수 이유 한 문장"
    }
  },
  "total": 세 점수의 합계,
  "verdict": "good" 또는 "average" 또는 "poor",
  "summary": "이 시나리오에 대한 종합 평가 2-3문장"
}`

export async function evaluateScenario(
  scenario: string,
  formFactor: FormFactor,
  apiKey?: string
): Promise<EvaluationResult> {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY })
  const userMessage = `다음 Physical AI 시나리오를 ${formFactor} 폼팩터 기준으로 JTBD 프레임워크로 분석하고 평가해주세요.

시나리오:
${scenario}

선택된 폼팩터: ${formFactor}`

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Claude가 텍스트 응답을 반환하지 않았습니다.')
  }

  let parsed: Omit<EvaluationResult, 'scenario' | 'form_factor'>
  try {
    // Strip markdown code blocks if present
    const rawText = content.text.trim()
    const jsonText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error(`Claude 응답을 JSON으로 파싱하는 데 실패했습니다: ${content.text}`)
  }

  // Validate and clamp scores
  const clamp = (n: number) => Math.min(10, Math.max(1, Math.round(n)))
  const js = clamp(parsed.scores.job_satisfaction.score)
  const ir = clamp(parsed.scores.irreplaceability.score)
  const ov = clamp(parsed.scores.opportunity_validity.score)
  const total = js + ir + ov

  let verdict: 'good' | 'average' | 'poor'
  if (total >= 21) verdict = 'good'
  else if (total >= 13) verdict = 'average'
  else verdict = 'poor'

  return {
    scenario,
    form_factor: formFactor,
    jtbd: parsed.jtbd,
    scores: {
      job_satisfaction: { score: js, reason: parsed.scores.job_satisfaction.reason },
      irreplaceability: { score: ir, reason: parsed.scores.irreplaceability.reason },
      opportunity_validity: { score: ov, reason: parsed.scores.opportunity_validity.reason },
    },
    total,
    verdict,
    summary: parsed.summary,
  }
}

export type FormFactor = 'Luna' | 'Puco' | 'Moving'

export interface JTBDStructure {
  when_i: string
  i_want_to: string
  so_i_can: string
  but_currently: string
  and_form_factor: string
}

export interface ScoreDetail {
  score: number
  reason: string
}

export interface EvaluationResult {
  scenario: string
  form_factor: FormFactor
  jtbd: JTBDStructure
  scores: {
    job_satisfaction: ScoreDetail
    irreplaceability: ScoreDetail
    opportunity_validity: ScoreDetail
  }
  total: number
  verdict: 'good' | 'average' | 'poor'
  summary: string
}

export interface BatchRow {
  scenario: string
  form_factor?: FormFactor
}

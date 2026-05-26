import type { JTBDStructure, FormFactor } from '@/lib/types'

interface JTBDCardProps {
  jtbd: JTBDStructure
  formFactor: FormFactor
}

const formFactorLabel: Record<FormFactor, string> = {
  Luna: 'And Luna',
  Puco: 'And Puco',
  Moving: 'And Moving',
}

interface ColumnDef {
  label: string
  value: string
  variant?: 'default' | 'strikethrough' | 'highlight'
}

export default function JTBDCard({ jtbd, formFactor }: JTBDCardProps) {
  const columns: ColumnDef[] = [
    { label: 'When I', value: jtbd.when_i },
    { label: 'I want to', value: jtbd.i_want_to },
    { label: 'So I can', value: jtbd.so_i_can },
    { label: 'But currently', value: jtbd.but_currently, variant: 'strikethrough' },
    { label: formFactorLabel[formFactor], value: jtbd.and_form_factor, variant: 'highlight' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
          JTBD 구조 분석
        </h3>
      </div>
      <div className="grid grid-cols-5 divide-x divide-gray-200">
        {columns.map((col) => (
          <div key={col.label} className="p-4">
            <p
              className={`text-xs font-medium mb-2 italic ${
                col.variant === 'highlight' ? 'text-indigo-500' : 'text-gray-400'
              }`}
            >
              {col.label}
            </p>
            <p
              className={`text-sm leading-relaxed font-medium ${
                col.variant === 'strikethrough'
                  ? 'text-gray-400 line-through decoration-gray-400'
                  : col.variant === 'highlight'
                  ? 'text-indigo-700'
                  : 'text-gray-800'
              }`}
            >
              {col.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

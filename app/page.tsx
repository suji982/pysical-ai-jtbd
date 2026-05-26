'use client'

import { useState } from 'react'
import SingleEvaluator from '@/components/SingleEvaluator'
import BatchEvaluator from '@/components/BatchEvaluator'

type Tab = 'single' | 'batch'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('single')

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Physical AI JTBD Evaluator</h1>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            JTBD 프레임워크로 Physical AI 시나리오를 분석하고 평가합니다
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'single'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            단건 평가
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'batch'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            일괄 평가 (CSV/Excel)
          </button>
        </div>

        {/* Content */}
        {activeTab === 'single' ? <SingleEvaluator /> : <BatchEvaluator />}
      </div>
    </main>
  )
}

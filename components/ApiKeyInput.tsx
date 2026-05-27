'use client'

import { useState, useEffect } from 'react'
import { KeyRound, Eye, EyeOff, CheckCircle, X } from 'lucide-react'

const STORAGE_KEY = 'anthropic_api_key'

interface ApiKeyInputProps {
  onKeyChange: (key: string) => void
}

export default function ApiKeyInput({ onKeyChange }: ApiKeyInputProps) {
  const [inputKey, setInputKey] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || ''
    setSavedKey(stored)
    onKeyChange(stored)
    if (!stored) setEditing(true)
  }, [])

  const handleSave = () => {
    const trimmed = inputKey.trim()
    if (!trimmed.startsWith('sk-ant-')) {
      alert('올바른 Anthropic API 키를 입력해주세요. (sk-ant- 로 시작)')
      return
    }
    localStorage.setItem(STORAGE_KEY, trimmed)
    setSavedKey(trimmed)
    onKeyChange(trimmed)
    setEditing(false)
    setInputKey('')
  }

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSavedKey('')
    onKeyChange('')
    setEditing(true)
    setInputKey('')
  }

  const masked = savedKey
    ? savedKey.slice(0, 12) + '••••••••••••' + savedKey.slice(-4)
    : ''

  if (!editing && savedKey) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
        <KeyRound className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <span className="text-sm text-emerald-700 font-medium">
          {showKey ? savedKey : masked}
        </span>
        <button onClick={() => setShowKey(!showKey)} className="text-emerald-500 hover:text-emerald-700 ml-1">
          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <button
            onClick={() => { setEditing(true); setInputKey(savedKey) }}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium underline"
          >
            변경
          </button>
          <button onClick={handleClear} className="text-emerald-400 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
      <KeyRound className="w-4 h-4 text-amber-500 flex-shrink-0" />
      <input
        type="password"
        value={inputKey}
        onChange={(e) => setInputKey(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        placeholder="Anthropic API 키 입력 (sk-ant-...)"
        className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none min-w-0"
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={!inputKey.trim()}
        className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed px-3 py-1 rounded-md transition-all flex-shrink-0"
      >
        저장
      </button>
      {savedKey && (
        <button onClick={() => { setEditing(false); setInputKey('') }} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

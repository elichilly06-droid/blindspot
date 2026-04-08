'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const REPORT_REASONS = [
  'Harassment or bullying',
  'Inappropriate photos',
  'Fake profile or impersonation',
  'Spam or scam',
  'Underage user',
  'Other',
]

interface ReportModalProps {
  reportedId: string
  reportedName: string
  myId: string
  matchId?: string
  onClose: () => void
  onBlocked: () => void
  onUnmatched?: () => void
}

export function ReportModal({ reportedId, reportedName, myId, matchId, onClose, onBlocked, onUnmatched }: ReportModalProps) {
  const [view, setView] = useState<'menu' | 'report' | 'done'>('menu')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const block = async () => {
    await supabase.from('blocks').insert({ blocker_id: myId, blocked_id: reportedId })
    onBlocked()
    onClose()
  }

  const unmatch = async () => {
    if (matchId) await supabase.from('matches').delete().eq('id', matchId)
    onClose()
    onUnmatched?.()
  }

  const submitReport = async () => {
    if (!reason) return
    setSubmitting(true)
    await supabase.from('reports').insert({ reporter_id: myId, reported_id: reportedId, reason })
    setView('done')
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-sm p-6 pb-10 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
        {view === 'menu' && (
          <>
            <p className="text-center text-sm font-semibold text-gray-700 mb-1">{reportedName}</p>
            {matchId && (
              <button onClick={unmatch}
                className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-gray-400 transition-colors">
                Unmatch
              </button>
            )}
            <button onClick={() => setView('report')}
              className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-gray-400 transition-colors">
              Report
            </button>
            <button onClick={block}
              className="w-full text-left px-4 py-3 rounded-xl border border-red-100 text-sm text-red-500 hover:border-red-300 transition-colors">
              Block
            </button>
            <button onClick={onClose} className="text-sm text-gray-400 text-center py-2">Cancel</button>
          </>
        )}
        {view === 'report' && (
          <>
            <p className="text-sm font-semibold text-gray-700 mb-1">What's the issue?</p>
            <div className="flex flex-col gap-1.5">
              {REPORT_REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm border transition-colors ${
                    reason === r ? 'border-pink-400 bg-pink-50 text-pink-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={submitReport} disabled={!reason || submitting}
              className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-40 mt-1">
              {submitting ? 'Submitting…' : 'Submit report'}
            </button>
            <button onClick={() => setView('menu')} className="text-sm text-gray-400 text-center py-1">Back</button>
          </>
        )}
        {view === 'done' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-base font-semibold text-gray-800">Report submitted</p>
            <p className="text-sm text-gray-400 text-center">Thanks for letting us know. We'll review it.</p>
            <button onClick={onClose} className="mt-2 bg-gray-900 text-white px-8 py-2.5 rounded-full text-sm font-medium">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

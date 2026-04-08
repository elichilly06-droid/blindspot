'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const router = useRouter()
  const [reports, setReports] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', user.id).single()

      if (!profile?.is_admin) { setLoading(false); return }
      setIsAdmin(true)

      const { data } = await (supabase
        .from('reports')
        .select('*, reporter:profiles!reporter_id(id, name), reported:profiles!reported_id(id, name)') as any)
        .order('created_at', { ascending: false })

      setReports(data ?? [])
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!isAdmin) return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-sm">Not authorized</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      {reports.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">No reports yet</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map(report => (
            <div key={report.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-gray-800">
                    <span className="text-pink-500">{report.reporter?.name ?? 'Unknown'}</span>
                    {' reported '}
                    <span className="text-gray-900">{report.reported?.name ?? 'Unknown'}</span>
                  </p>
                  <p className="text-sm text-gray-600">{report.reason}</p>
                  <p className="text-xs text-gray-300">{new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

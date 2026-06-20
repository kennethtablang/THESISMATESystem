import { useState, useEffect } from 'react'
import { Megaphone, CheckCircle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import TopBar from '../../components/layout/TopBar'
import { classroomService } from '../../services/api'

export default function JoinClass() {
  const [code, setCode] = useState('')
  const [classroom, setClassroom] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    classroomService.myClass().then(data => {
      if (data) {
        setClassroom(data)
        classroomService.myAnnouncements().then(setAnnouncements).catch(() => {})
      }
    }).catch(() => {}).finally(() => setChecking(false))
  }, [])

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await classroomService.join({ joinCode: code.trim().toUpperCase() })
      setClassroom(data)
      setCode('')
      const anns = await classroomService.myAnnouncements().catch(() => [])
      setAnnouncements(anns || [])
    } catch (err) {
      setError(err.message || 'Invalid join code. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{background:'#c9a84c',animationDelay:`${i*0.15}s`}} />)}</div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="My Class" subtitle={classroom ? classroom.className : 'Join your class'} />
      <div className="p-4 sm:p-8 max-w-3xl">
        {!classroom ? (
          <>
            <div className="mb-6">
              <h2 className="page-title">Join a Class</h2>
              <p className="page-subtitle">Enter the code your Faculty-In-Charge shared with you</p>
            </div>

            <div className="card max-w-md">
              <form onSubmit={handleJoin} className="space-y-4">
                {error && (
                  <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Class Join Code
                  </label>
                  <input
                    className="form-input text-center font-display text-2xl tracking-widest uppercase"
                    placeholder="ABC123"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    style={{ letterSpacing: '0.2em' }}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full h-11 flex items-center justify-center gap-2" disabled={loading}>
                  {loading ? 'Joining...' : <><span>Join Class</span><ArrowRight size={16} /></>}
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            {/* Enrolled state */}
            <div className="rounded-2xl p-5 mb-6" style={{ background: 'linear-gradient(135deg,#0a1628,#12213a)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <CheckCircle size={20} style={{ color: '#22c55e' }} />
                </div>
                <div>
                  <p className="font-semibold text-white">{classroom.className}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{classroom.academicYear}</p>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Faculty IC</p>
                  <p className="text-white">{classroom.facultyIC?.fullName}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Students</p>
                  <p className="text-white">{classroom.enrollmentCount}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="font-semibold text-lg" style={{ color: 'var(--text-heading)' }}>Class Announcements</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Updates from your Faculty-In-Charge</p>
            </div>

            {announcements.length === 0 ? (
              <div className="card text-center py-12">
                <Megaphone size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No announcements yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Your instructor hasn't posted anything yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map(ann => (
                  <div key={ann.id} className="card">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: ann.isClassWide ? 'rgba(201,168,76,0.12)' : 'rgba(59,130,246,0.1)' }}>
                        <Megaphone size={15} style={{ color: ann.isClassWide ? '#c9a84c' : '#3b82f6' }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>{ann.title}</h4>
                          {!ann.isClassWide && ann.targetGroupName && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                              {ann.targetGroupName}
                            </span>
                          )}
                          {ann.isClassWide && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
                              Whole class
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{ann.content}</p>
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                          {new Date(ann.createdAt).toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

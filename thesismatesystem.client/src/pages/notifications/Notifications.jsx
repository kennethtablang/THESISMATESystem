import { useState, useEffect } from 'react'
import { notificationService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { Bell, CheckCheck, FileText, Calendar, MessageSquare, Users, AlertCircle } from 'lucide-react'

const iconMap = {
  ChapterSubmitted: FileText,
  ChapterStatusUpdated: FileText,
  RevisionNoteAdded: FileText,
  DocumentUploaded: FileText,
  DocumentCommented: MessageSquare,
  ConsultationLogged: MessageSquare,
  ConsultationRequested: MessageSquare,
  ConsultationRequestResponded: MessageSquare,
  DefenseScheduled: Calendar,
  DefenseRescheduled: Calendar,
  DefenceCancelled: Calendar,
  RatingSubmitted: AlertCircle,
  ClassroomAnnouncement: Users,
}

const typeLabels = {
  ChapterSubmitted: 'Chapter Submitted',
  ChapterStatusUpdated: 'Chapter Status Updated',
  RevisionNoteAdded: 'Revision Note Added',
  DocumentUploaded: 'Document Uploaded',
  DocumentCommented: 'Document Comment',
  ConsultationLogged: 'Consultation Logged',
  ConsultationRequested: 'Consultation Requested',
  ConsultationRequestResponded: 'Request Responded',
  DefenseScheduled: 'Defense Scheduled',
  DefenseRescheduled: 'Defense Rescheduled',
  DefenceCancelled: 'Defense Cancelled',
  RatingSubmitted: 'Rating Submitted',
  ClassroomAnnouncement: 'Classroom Announcement',
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notificationService.list()
      .then((data) => setNotifications(data ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false))
  }, [])

  function markRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n)))
    notificationService.markRead(id).catch(() => {})
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })))
    notificationService.markAllRead().catch(() => {})
  }

  const unread = notifications.filter((n) => !(n.read ?? n.isRead)).length

  if (loading) return <><TopBar title="Notifications" /><PageLoader /></>

  return (
    <div>
      <TopBar
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
      />
      <div className="p-4 sm:p-8">
        {unread > 0 && (
          <div className="flex justify-end mb-4">
            <button className="btn-ghost text-sm" onClick={markAllRead}>
              <CheckCheck size={15} /> Mark all as read
            </button>
          </div>
        )}

        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up! Notifications will appear here when there's activity."
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const isRead = n.read ?? n.isRead ?? false
              const Icon = iconMap[n.type] ?? Bell
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-150"
                  style={{
                    background: isRead ? 'var(--bg-card)' : 'rgba(201,168,76,0.06)',
                    border: `1px solid ${isRead ? 'var(--border-light)' : 'rgba(201,168,76,0.25)'}`,
                  }}
                  onClick={() => markRead(n.id)}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: isRead ? 'var(--bg-subtle)' : 'rgba(201,168,76,0.12)' }}
                  >
                    <Icon size={18} style={{ color: isRead ? 'var(--text-muted)' : '#c9a84c' }} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: isRead ? 'var(--text-primary)' : 'var(--text-heading)' }}>
                        {typeLabels[n.type] ?? n.type}
                      </p>
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {n.message}
                    </p>
                  </div>
                  {!isRead && (
                    <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: '#c9a84c' }} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

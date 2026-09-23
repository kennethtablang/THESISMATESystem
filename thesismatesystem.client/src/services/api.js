const BASE_URL = '/api'

// Used when the server gives no message of its own. Bodyless responses such as Forbid()
// are common, and statusText is empty over HTTP/2, so it cannot be relied on as a fallback.
const STATUS_MESSAGES = {
  400: 'The request could not be processed. Please check your input and try again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested record could not be found.',
  409: 'This record was changed by someone else. Please refresh and try again.',
  413: 'The file is too large to upload.',
  500: 'An unexpected server error occurred. Please try again.',
}

function authHeaders() {
  const token = sessionStorage.getItem('tm_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Navigation is async, so callers keep running after a 401 redirect is queued.
// Throwing stops them from unwrapping an undefined response in the meantime.
function handleUnauthorized() {
  sessionStorage.removeItem('tm_token')
  sessionStorage.removeItem('tm_user')
  window.location.href = '/login'
  throw new Error('Your session has expired. Please sign in again.')
}

async function errorMessage(res) {
  const body = await res.json().catch(() => null)
  // ASP.NET Core validation errors use { title, errors } instead of { message }
  const detail = body?.message || (body?.errors && Object.values(body.errors).flat().join(' '))
  return detail
    || STATUS_MESSAGES[res.status]
    || (res.status >= 500 ? STATUS_MESSAGES[500] : `Request failed (${res.status}).`)
}

async function send(path, init = {}) {
  const hadToken = !!sessionStorage.getItem('tm_token')
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers: { ...authHeaders(), ...init.headers } })
  } catch {
    throw new Error('Unable to reach the server. Please check your connection and try again.')
  }

  // A 401 on a request that carried a token means the session is no longer valid. Without one
  // (login, 2FA login) it is a rejected credential, and the server's message has to reach the
  // form — redirecting would reload the login page and discard it.
  if (res.status === 401 && hadToken) handleUnauthorized()
  if (!res.ok) {
    // status lets callers treat expected outcomes (e.g. 404 "no group yet") as states, not errors
    const error = new Error(await errorMessage(res))
    error.status = res.status
    throw error
  }
  return res
}

async function parseJson(res) {
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function request(method, path, body) {
  const res = await send(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return parseJson(res)
}

// Matches the server's request limit in Program.cs. Checked up front so an oversized file fails
// immediately with a clear reason instead of after a long upload that the server then rejects.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

async function requestMultipart(method, path, formData) {
  for (const value of formData.values()) {
    if (value instanceof File && value.size > MAX_UPLOAD_BYTES)
      throw new Error(`"${value.name}" is too large. The maximum upload size is 50 MB.`)
  }
  const res = await send(path, { method, body: formData })
  return parseJson(res)
}

async function fetchBlob(path) {
  const res = await send(path)
  return res.blob()
}

const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
  postForm: (path, formData) => requestMultipart('POST', path, formData),
}

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  verifyEmail: (userId, token) => api.post('/auth/verify-email', { userId, token }),
  profile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  twoFactorStatus: () => api.get('/auth/2fa/status'),
  twoFactorEnable: () => api.post('/auth/2fa/enable'),
  twoFactorVerifySetup: (code) => api.post('/auth/2fa/verify-setup', { code }),
  twoFactorDisable: (password) => api.post('/auth/2fa/disable', { password }),
  twoFactorLogin: (userId, code) => api.post('/auth/2fa/login', { userId, code }),
  allUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  // Blocks an Admin/subject teacher handles — what decides whose registrations they may approve.
  setAdminSections: (userId, sectionIds) => api.put(`/auth/users/${userId}/sections`, { sectionIds }),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deactivate: (id) => api.patch(`/auth/users/${id}/deactivate`),
  adminResetPassword: (id, newPassword) => api.post(`/auth/users/${id}/reset-password`, { newPassword }),
  adminSetEmail: (id, email) => api.patch(`/auth/users/${id}/email`, { email }),
  adminDisable2fa: (id) => api.patch(`/auth/users/${id}/2fa/disable`),
  adminEnable2fa: (id) => api.patch(`/auth/users/${id}/2fa/enable`),
}

export const defenseService = {
  list: () => api.get('/defenses'),
  mySchedules: () => api.get('/defenses/my-schedules'),
  byGroup: (groupId) => api.get(`/defenses/group/${groupId}`),
  get: (id) => api.get(`/defenses/${id}`),
  create: (data) => api.post('/defenses', data),
  update: (id, data) => api.put(`/defenses/${id}`, data),
  cancel: (id) => api.patch(`/defenses/${id}/cancel`),
  setRatingStatus: (id, isOpen) => api.patch(`/defenses/${id}/rating-status`, isOpen),
  complete: (id) => api.patch(`/defenses/${id}/complete`),
  autoSchedulePreview: (data) => api.post('/defenses/auto-schedule/preview', data),
  // Schedule one group by hand, then line the rest up back-to-back behind it.
  autoScheduleChain: (data) => api.post('/defenses/auto-schedule/chain', data),
  autoScheduleConfirm: (items) => api.post('/defenses/auto-schedule/confirm', { items }),
  submitRating: (data) => api.post('/defenses/ratings', data),
  getRatings: (id) => api.get(`/defenses/${id}/ratings`),
  coverage: (academicYear) => api.get(`/defenses/coverage?academicYear=${encodeURIComponent(academicYear)}`),
  getConsolidated: (id) => api.get(`/defenses/${id}/consolidated`),
  finalize: (id) => api.post(`/defenses/${id}/finalize`),
  criteria: (phase) => api.get(`/defenses/criteria${phase ? `?phase=${phase}` : ''}`),
  createCriterion: (data) => api.post('/defenses/criteria', data),
  updateCriterion: (id, data) => api.put(`/defenses/criteria/${id}`, data),
  deleteCriterion: (id) => api.delete(`/defenses/criteria/${id}`),
}

export const groupService = {
  list: () => api.get('/groups'),
  get: (id) => api.get(`/groups/${id}`),
  myGroup: () => api.get('/groups/my-group'),
  create: (data) => api.post('/groups', data),
  update: (id, data) => api.put(`/groups/${id}`, data),
  archive: (id) => api.patch(`/groups/${id}/archive`),
  members: (id) => api.get(`/groups/${id}/members`),
  addMember: (id, userId) => api.post(`/groups/${id}/members`, { userId }),
  removeMember: (id, userId) => api.delete(`/groups/${id}/members/${userId}`),
  updateVersion: (data) => api.patch('/groups/my-group/version', data),
  uploadLogo: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return requestMultipart('POST', `/groups/${id}/logo`, fd)
  },
  logoUrl: (id) => `${BASE_URL}/groups/${id}/logo`,
  setDeadlines:      (id, data)              => api.patch(`/groups/${id}/deadlines`, data),
  getDeadlines:      (id)                    => api.get(`/groups/${id}/deadline-list`),
  createDeadline:    (id, data)              => api.post(`/groups/${id}/deadline-list`, data),
  updateDeadline:    (id, deadlineId, data)  => api.patch(`/groups/${id}/deadline-list/${deadlineId}`, data),
  deleteDeadline:    (id, deadlineId)        => api.delete(`/groups/${id}/deadline-list/${deadlineId}`),
  panelGroups:       ()                      => api.get('/groups/panel-groups'),
  setDefenseOutcome: (id, data)              => api.patch(`/groups/${id}/defense-outcome`, data),
}

export const manuscriptService = {
  myGroup: () => api.get('/manuscript/my-group'),
  byGroup: (groupId) => api.get(`/manuscript/group/${groupId}`),
  saveSection: (sectionKey, data) => api.put(`/manuscript/my-group/${sectionKey}`, data),

  // Lock / revision status
  voteStatus: () => api.get('/manuscript/my-group/vote-status'),

  // Comments
  comments: (groupId, sectionKey, revision) => {
    const q = new URLSearchParams()
    if (sectionKey) q.set('sectionKey', sectionKey)
    if (revision != null) q.set('revision', revision)
    return api.get(`/manuscript/group/${groupId}/comments?${q}`)
  },
  myGroupComments: (sectionKey, revision) => {
    const q = new URLSearchParams()
    if (sectionKey) q.set('sectionKey', sectionKey)
    if (revision != null) q.set('revision', revision)
    return api.get(`/manuscript/my-group/comments?${q}`)
  },
  addComment: (groupId, sectionKey, data) =>
    api.post(`/manuscript/group/${groupId}/comments/${sectionKey}`, data),
  deleteComment: (groupId, commentId) =>
    api.delete(`/manuscript/group/${groupId}/comments/${commentId}`),
  // Adviser + panel with their highlight colours
  reviewers: (groupId) => api.get(`/manuscript/group/${groupId}/reviewers`),

  // Revision management (Adviser / FIC)
  openRevision: (groupId) => api.post(`/manuscript/group/${groupId}/open-revision`),

  // Revision summary (section-level review completion based on comments)
  revisionSummary: (groupId) => api.get(`/manuscript/group/${groupId}/revision-summary`),
  myRevisionSummary: () => api.get('/manuscript/my-group/revision-summary'),

  // Image upload
  uploadImage: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return requestMultipart('POST', '/manuscript/upload-image', fd)
  },

  // Token for SignalR connection
  getToken: () => sessionStorage.getItem('tm_token'),
}

export const chapterService = {
  listByGroup: (groupId) => api.get(`/groups/${groupId}/chapters`),
  get: (id) => api.get(`/groups/0/chapters/submissions/${id}`),
  submit: (groupId, formData) => requestMultipart('POST', `/groups/${groupId}/chapters`, formData),
  updateStatus: (groupId, id, data) => api.patch(`/groups/${groupId}/chapters/submissions/${id}/status`, data),
  addRevisionNote: (groupId, chapterId, data) =>
    api.post(`/groups/${groupId}/chapters/submissions/${chapterId}/revision-notes`, data),
  // A panel member's own verdict on a submission, separate from the adviser-owned status.
  setPanelReview: (groupId, chapterId, data) =>
    api.put(`/groups/${groupId}/chapters/submissions/${chapterId}/panel-review`, data),
  download: (id) => `${BASE_URL}/groups/0/chapters/submissions/${id}/download`,
  downloadFile: (id, filename) => downloadBlobAuth(`/groups/0/chapters/submissions/${id}/download`, filename || `chapter_${id}`),
  history: (groupId, chapterNumber) => api.get(`/groups/${groupId}/chapters/${chapterNumber}/history`),
}

export const consultationService = {
  list: () => api.get('/consultations'),
  byGroup: (groupId) => api.get(`/consultations/group/${groupId}`),
  get: (id) => api.get(`/consultations/${id}`),
  create: (data) => api.post('/consultations', data),
  update: (id, data) => api.put(`/consultations/${id}`, data),
  delete: (id) => api.delete(`/consultations/${id}`),
}

// Fired after notifications are marked read so the top bar's unread indicator can refresh.
export const NOTIFICATIONS_CHANGED = 'tm:notifications-changed'
const announceNotificationsChanged = (result) => {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED))
  return result
}

export const notificationService = {
  list: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then(announceNotificationsChanged),
  markAllRead: () => api.patch('/notifications/read-all').then(announceNotificationsChanged),
}

async function downloadBlobAuth(path, filename) {
  const blob = await fetchBlob(path)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const downloadPdf = downloadBlobAuth

export const reportService = {
  groupProgress: (groupId) => downloadPdf(`/reports/group/${groupId}/progress`, `group_${groupId}_progress.pdf`),
  milestoneCompletion: (academicYear) => downloadPdf(`/reports/milestone-completion?academicYear=${encodeURIComponent(academicYear)}`, `milestone_${academicYear}.pdf`),
  defenseOutcome: (scheduleId) => downloadPdf(`/reports/defense/${scheduleId}/outcome`, `defense_${scheduleId}_outcome.pdf`),
  allGroups: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString()
    return downloadPdf(`/reports/all-groups${q ? '?' + q : ''}`, 'all_groups_report.pdf')
  },
}

export const documentService = {
  byGroup: (groupId) => api.get(`/documents/group/${groupId}`),
  forAdviser: () => api.get('/documents/my-advisees'),
  all: () => api.get('/documents/all'),
  get: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.postForm('/documents', formData),
  download: (id) => `${BASE_URL}/documents/${id}/download`,
  downloadFile: (id, filename) => downloadBlobAuth(`/documents/${id}/download`, filename || `document_${id}`),
  addComment: (id, data) => api.post(`/documents/${id}/comments`, data),
  comments: (id) => api.get(`/documents/${id}/comments`),
  delete: (id) => api.delete(`/documents/${id}`),
  uploadNewVersion: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return requestMultipart('POST', `/documents/${id}/new-version`, fd)
  },
  versions: (id) => api.get(`/documents/${id}/versions`),
  fetchBlob: (id) => fetchBlob(`/documents/${id}/download`),
  finalizeChapter: (groupId, chapterNumber) =>
    api.post(`/documents/groups/${groupId}/chapters/${chapterNumber}/finalize`),
  finalizeSection: (groupId, sectionKey, formData) =>
    api.postForm(`/documents/groups/${groupId}/sections/${sectionKey}/finalize`, formData),
  submit: (id) => api.post(`/documents/${id}/submit`, {}),
  updateStatus: (id, status) => api.patch(`/documents/${id}/status`, { status }),
}

export const systemFeatureService = {
  byGroup: (groupId) => api.get(`/system-features/group/${groupId}`),
  get: (id) => api.get(`/system-features/${id}`),
  create: (data) => api.post('/system-features', data),
  update: (id, data) => api.put(`/system-features/${id}`, data),
  updateDates: (id, data) => api.patch(`/system-features/${id}/dates`, data),
  delete: (id) => api.delete(`/system-features/${id}`),
  addComment: (id, data) => api.post(`/system-features/${id}/comments`, data),
  comments: (id) => api.get(`/system-features/${id}/comments`),
  deleteComment: (featureId, commentId) => api.delete(`/system-features/${featureId}/comments/${commentId}`),
  submitStudentTest: (id, data) => api.patch(`/system-features/${id}/student-test`, data),
  uploadScreenshot: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.postForm(`/system-features/${id}/screenshot`, fd)
  },
}

export const classroomService = {
  create: (data) => api.post('/classrooms', data),
  myClassrooms: () => api.get('/classrooms/my'),
  join: (data) => api.post('/classrooms/join', data),
  myClass: () => api.get('/classrooms/my-class'),
  enrollments: (id) => api.get(`/classrooms/${id}/enrollments`),
  postAnnouncement: (id, data) => api.post(`/classrooms/${id}/announcements`, data),
  announcements: (id) => api.get(`/classrooms/${id}/announcements`),
  myAnnouncements: () => api.get('/classrooms/announcements/my'),
  assignGroup: (data) => api.post('/classrooms/assign-group', data),
  regenerateCode: (id) => api.post(`/classrooms/${id}/regenerate-code`),
  createGroup: (classroomId, data) => api.post(`/classrooms/${classroomId}/groups`, data),
  allClassrooms: () => api.get('/classrooms/all'),
  invite: (id, data) => api.post(`/classrooms/${id}/invite`, data),
  myInvitations: () => api.get('/classrooms/invitations/my'),
  acceptInvitation: (id) => api.post(`/classrooms/invitations/${id}/accept`),
  activeStudents: () => api.get('/classrooms/active-students'),
  available: () => api.get('/classrooms/available'),
  enroll: (id) => api.post(`/classrooms/${id}/enroll`),
}

export const sectionService = {
  options: () => api.get('/sections/options'),
  list: () => api.get('/sections'),
  create: (data) => api.post('/sections', data),
  update: (id, data) => api.put(`/sections/${id}`, data),
  roster: (id) => api.get(`/sections/${id}/roster`),
  addRoster: (id, entries) => api.post(`/sections/${id}/roster`, { entries }),
  removeRoster: (id, entryId) => api.delete(`/sections/${id}/roster/${entryId}`),
  students: (id) => api.get(`/sections/${id}/students`),
  unassignedStudents: () => api.get('/sections/unassigned-students'),
  assignStudents: (id, userIds) => api.put(`/sections/${id}/students`, { userIds }),
}

export const registrationService = {
  pending: () => api.get('/registrations/pending'),
  approve: (userId) => api.post(`/registrations/${userId}/approve`),
  reject: (userId, reason) => api.post(`/registrations/${userId}/reject`, { reason }),
}

export const monitoringService = {
  summary: () => api.get('/monitoring/groups'),
  groupHealth: (id) => api.get(`/monitoring/groups/${id}`),
  myGroup: () => api.get('/monitoring/my-group'),
}

export const consultationScheduleService = {
  all: () => api.get('/consultation-schedules'),
  mySchedules: () => api.get('/consultation-schedules/my-schedules'),
  get: (id) => api.get(`/consultation-schedules/${id}`),
  create: (data) => api.post('/consultation-schedules', data),
  update: (id, data) => api.put(`/consultation-schedules/${id}`, data),
  updateStatus: (id, data) => api.patch(`/consultation-schedules/${id}/status`, data),
  requestSlot: (data) => api.post('/consultation-schedules/requests', data),
  getRequests: (scheduleId) => api.get(`/consultation-schedules/${scheduleId}/requests`),
  myGroupRequests: (groupId) => api.get(`/consultation-schedules/my-group-requests/${groupId}`),
  respond: (requestId, data) => api.patch(`/consultation-schedules/requests/${requestId}/respond`, data),
}

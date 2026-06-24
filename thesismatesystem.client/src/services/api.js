const BASE_URL = '/api'

function getHeaders() {
  const token = localStorage.getItem('tm_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function getMultipartHeaders() {
  const token = localStorage.getItem('tm_token')
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('tm_token')
    localStorage.removeItem('tm_user')
    window.location.href = '/login'
    return
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    // ASP.NET Core validation errors use { title, errors } instead of { message }
    const message =
      err.message ||
      (err.errors && Object.values(err.errors).flat().join(' ')) ||
      err.title ||
      `Request failed: ${res.status}`
    throw new Error(message)
  }

  if (res.status === 204) return null
  return res.json()
}

async function requestMultipart(method, path, formData) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getMultipartHeaders(),
    body: formData,
  })

  if (res.status === 401) {
    localStorage.removeItem('tm_token')
    localStorage.removeItem('tm_user')
    window.location.href = '/login'
    return
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    const message =
      err.message ||
      (err.errors && Object.values(err.errors).flat().join(' ')) ||
      err.title ||
      `Request failed: ${res.status}`
    throw new Error(message)
  }

  if (res.status === 204) return null
  return res.json()
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
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deactivate: (id) => api.patch(`/auth/users/${id}/deactivate`),
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
  submitRating: (data) => api.post('/defenses/ratings', data),
  getRatings: (id) => api.get(`/defenses/${id}/ratings`),
  getConsolidated: (id) => api.get(`/defenses/${id}/consolidated`),
  finalize: (id) => api.post(`/defenses/${id}/finalize`),
  criteria: () => api.get('/defenses/criteria'),
}

export const groupService = {
  list: () => api.get('/groups'),
  get: (id) => api.get(`/groups/${id}`),
  myGroup: () => api.get('/groups/my-group'),
  create: (data) => api.post('/groups', data),
  update: (id, data) => api.put(`/groups/${id}`, data),
  archive: (id) => api.patch(`/groups/${id}/archive`),
  members: (id) => api.get(`/groups/${id}/members`),
  updateVersion: (data) => api.patch('/groups/my-group/version', data),
}

export const manuscriptService = {
  myGroup: () => api.get('/manuscript/my-group'),
  byGroup: (groupId) => api.get(`/manuscript/group/${groupId}`),
  saveSection: (sectionKey, data) => api.put(`/manuscript/my-group/${sectionKey}`, data),

  // Voting
  voteStatus: () => api.get('/manuscript/my-group/vote-status'),
  castVote: () => api.post('/manuscript/my-group/vote'),
  revokeVote: () => api.delete('/manuscript/my-group/vote'),

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
  getToken: () => localStorage.getItem('tm_token'),
}

export const chapterService = {
  listByGroup: (groupId) => api.get(`/groups/${groupId}/chapters`),
  get: (id) => api.get(`/groups/0/chapters/submissions/${id}`),
  submit: (groupId, formData) => requestMultipart('POST', `/groups/${groupId}/chapters`, formData),
  updateStatus: (groupId, id, data) => api.patch(`/groups/${groupId}/chapters/submissions/${id}/status`, data),
  addRevisionNote: (groupId, chapterId, data) =>
    api.post(`/groups/${groupId}/chapters/submissions/${chapterId}/revision-notes`, data),
  download: (id) => `${BASE_URL}/groups/0/chapters/submissions/${id}/download`,
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

export const notificationService = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
}

async function downloadPdf(path, filename) {
  const token = localStorage.getItem('tm_token')
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Failed to generate report: ${res.statusText}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

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
  get: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.postForm('/documents', formData),
  download: (id) => `${BASE_URL}/documents/${id}/download`,
  addComment: (id, data) => api.post(`/documents/${id}/comments`, data),
  comments: (id) => api.get(`/documents/${id}/comments`),
  delete: (id) => api.delete(`/documents/${id}`),
  uploadNewVersion: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return requestMultipart('POST', `/documents/${id}/new-version`, fd)
  },
  versions: (id) => api.get(`/documents/${id}/versions`),
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

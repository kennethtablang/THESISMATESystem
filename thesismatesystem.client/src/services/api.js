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
    throw new Error(err.message || `Request failed: ${res.status}`)
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
    throw new Error(err.message || `Request failed: ${res.status}`)
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
}

export const chapterService = {
  listByGroup: (groupId) => api.get(`/groups/${groupId}/chapters`),
  get: (groupId, id) => api.get(`/groups/${groupId}/chapters/${id}`),
  submit: (groupId, formData) => requestMultipart('POST', `/groups/${groupId}/chapters`, formData),
  review: (groupId, id, data) => api.put(`/groups/${groupId}/chapters/${id}/review`, data),
  addRevision: (groupId, chapterId, data) =>
    api.post(`/groups/${groupId}/chapters/${chapterId}/revisions`, data),
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

export const reportService = {
  summary: () => api.get('/reports/summary'),
  groupProgress: (groupId) => api.get(`/reports/groups/${groupId}`),
  defenseResults: (defenseId) => api.get(`/reports/defenses/${defenseId}`),
  export: (type) => api.get(`/reports/export?type=${type}`),
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
}

export const systemFeatureService = {
  byGroup: (groupId) => api.get(`/system-features/group/${groupId}`),
  get: (id) => api.get(`/system-features/${id}`),
  create: (data) => api.post('/system-features', data),
  update: (id, data) => api.put(`/system-features/${id}`, data),
  delete: (id) => api.delete(`/system-features/${id}`),
  addComment: (id, data) => api.post(`/system-features/${id}/comments`, data),
  comments: (id) => api.get(`/system-features/${id}/comments`),
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

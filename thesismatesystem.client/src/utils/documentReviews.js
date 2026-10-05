// Wording for the per-reviewer document decisions (doc.reviews from the API).

export function decisionLabel(r) {
  const who = r.isAdviser ? 'Adviser' : r.fullName
  switch (r.status) {
    case 'Approved':      return r.isAdviser ? 'Approved by the Adviser' : `Approved by the Panel – ${r.fullName}`
    case 'NeedsRevision': return `Request revision – ${who}`
    case 'Pending':       return `Awaiting review – ${who}`
    default:              return null
  }
}

// "the Adviser", "Carla Reyes", "the Adviser and Carla Reyes", …
export function reviewerNames(reviews) {
  const names = reviews.map(r => (r.isAdviser ? 'the Adviser' : r.fullName))
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export const revisionRequesters = reviews => (reviews ?? []).filter(r => r.status === 'NeedsRevision')

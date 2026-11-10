// How a role is shown to people. The role values themselves (Faculty, SuperAdmin, …) stay as
// they are in the API; only the wording changes. Revision round 8: a faculty member is an
// adviser and/or a panelist, so the "Faculty" role reads "Adviser/Panel".
const ROLE_LABELS = {
  SuperAdmin: 'Super Admin',
  Admin: 'Admin',
  Faculty: 'Adviser/Panel',
  Student: 'Student',
}

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role ?? ''
}

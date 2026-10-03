// PSU student numbers: two-digit entry year, two-letter campus code, four-digit serial.
// Mirrors Helpers/StudentIdFormat.cs on the server.
export const STUDENT_ID_EXAMPLE = '23-LN-5825'
export const STUDENT_ID_PATTERN = /^\d{2}-[A-Z]{2}-\d{4}$/
export const STUDENT_ID_HINT = `Format: ${STUDENT_ID_EXAMPLE} (2 digits, 2 letters, 4 digits)`

export function normalizeStudentId(value) {
  return String(value ?? '').trim().toUpperCase()
}

export function isValidStudentId(value) {
  return STUDENT_ID_PATTERN.test(normalizeStudentId(value))
}

// Shapes free typing into NN-LL-NNNN as the student types: keeps the right character class in
// each position and inserts the dashes, so "23ln5825" becomes "23-LN-5825".
export function formatStudentIdInput(value) {
  const raw = String(value ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '')
  let year = '', campus = '', serial = '', i = 0
  while (i < raw.length && year.length < 2)   { if (/\d/.test(raw[i])) year += raw[i]; i++ }
  while (i < raw.length && campus.length < 2) { if (/[A-Z]/.test(raw[i])) campus += raw[i]; i++ }
  while (i < raw.length && serial.length < 4) { if (/\d/.test(raw[i])) serial += raw[i]; i++ }
  let out = year
  if (campus || (year.length === 2 && raw.length > 2)) out += `-${campus}`
  if (serial) out += `-${serial}`
  return out
}

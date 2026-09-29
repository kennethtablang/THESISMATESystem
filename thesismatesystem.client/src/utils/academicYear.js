// The school year that is running now, e.g. "2026-2027" from June onwards.
export function currentAcademicYear(date = new Date()) {
  const y = date.getFullYear()
  return date.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

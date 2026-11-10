/** "Carlos K. Cruz" → "CKC" — the same initials the server stores on compliance-matrix rows. */
export function initialsOf(user) {
  return [user?.firstName, user?.middleName, user?.lastName]
    .filter(Boolean)
    .flatMap(n => n.split(' ').filter(Boolean))
    .map(w => w[0].toUpperCase())
    .join('')
}

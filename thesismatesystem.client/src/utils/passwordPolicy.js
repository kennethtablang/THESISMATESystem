// Mirrors the ASP.NET Identity password options in Program.cs (length 8, digit, upper and
// lower case; no symbol required). Keep the two in step so a password the form accepts is
// never rejected by the server afterwards.
const RULES = [
  { test: (pw) => pw.length >= 8,  message: 'Password must be at least 8 characters.' },
  { test: (pw) => /[A-Z]/.test(pw), message: 'Password must contain at least one uppercase letter.' },
  { test: (pw) => /[a-z]/.test(pw), message: 'Password must contain at least one lowercase letter.' },
  { test: (pw) => /[0-9]/.test(pw), message: 'Password must contain at least one number.' },
]

// Returns the first unmet requirement, or null when the password is acceptable.
export function passwordError(password) {
  return RULES.find((rule) => !rule.test(password ?? ''))?.message ?? null
}

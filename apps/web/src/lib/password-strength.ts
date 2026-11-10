import { PASSWORD_MIN_LENGTH } from '@riftroom/shared'

export type StrengthScore = 0 | 1 | 2 | 3 | 4

const LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const

/** Rough, offline strength hint for the register form. Not a security control. */
export function passwordStrength(password: string): { score: StrengthScore; label: string } {
  if (password.length < PASSWORD_MIN_LENGTH) return { score: 0, label: LABELS[0] }

  let score = 1
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  if (password.length >= 16 && score < 4) score++

  const clamped = Math.min(score, 4) as StrengthScore
  return { score: clamped, label: LABELS[clamped] }
}

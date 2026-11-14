import { describe, expect, it } from 'vitest'
import { friendlyAuthError } from '../../src/services/auth/supabaseAuth'

describe('friendlyAuthError', () => {
  it('explains a duplicate account without raw server text', () => {
    expect(friendlyAuthError('User already registered', 'sign-up')).toMatch(/already has an account/)
  })
  it('does not reveal whether the email or the password was wrong', () => {
    expect(friendlyAuthError('Invalid login credentials', 'sign-in')).toBe("That email and password don't match.")
  })
  it('handles rate limits and weak passwords', () => {
    expect(friendlyAuthError('email rate limit exceeded', 'sign-up')).toMatch(/Too many attempts/)
    expect(friendlyAuthError('Password should be at least 6 characters', 'sign-up')).toMatch(/at least 8/)
  })
  it('falls back to a generic message per action', () => {
    expect(friendlyAuthError('boom', 'sign-up')).toMatch(/create your account/)
    expect(friendlyAuthError('boom', 'sign-in')).toMatch(/sign you in/)
  })
})

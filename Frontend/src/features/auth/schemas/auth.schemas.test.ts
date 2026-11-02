import { describe, expect, it } from 'vitest'
import {
  getPasswordStrength,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from './auth.schemas'

const validSignup = {
  fullName: 'Ana Silva',
  email: 'ana@example.com',
  password: 'abcd1234',
  confirmPassword: 'abcd1234',
  acceptedTerms: true,
}

function messagesFor(
  result: { error?: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
) {
  return (
    result.error?.issues
      .filter((issue) => issue.path[0] === field)
      .map((issue) => issue.message) ?? []
  )
}

describe('auth schemas', () => {
  it('trims email and rejects a malformed one', () => {
    expect(loginSchema.parse({ email: ' a@b.co ', password: 'x' }).email).toBe('a@b.co')
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
  })

  it('does not apply new-password rules at login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
  })

  it.each(['abc123', 'abcdefghij', '1234567890'])('rejects weak password %s', (password) => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password,
      confirmPassword: password,
    })
    expect(messagesFor(result, 'password')).toHaveLength(1)
  })

  it('accepts non-Latin letters in passwords', () => {
    const password = 'пароль1234'
    const result = signupSchema.safeParse({
      ...validSignup,
      password,
      confirmPassword: password,
    })
    expect(result.success).toBe(true)
  })

  it('requires the terms to be accepted', () => {
    const result = signupSchema.safeParse({ ...validSignup, acceptedTerms: false })
    expect(messagesFor(result, 'acceptedTerms')).toEqual([
      'Please accept the Terms and Privacy Policy',
    ])
  })

  it('reports mismatched passwords even when another field is invalid', () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      fullName: '',
      acceptedTerms: false,
      confirmPassword: 'different1',
    })
    expect(messagesFor(result, 'confirmPassword')).toEqual(["Passwords don't match"])
  })

  it('checks the reset password confirmation', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'abcd1234',
      confirmPassword: 'abcd1235',
    })
    expect(result.success).toBe(false)
  })

  it('grades password strength', () => {
    expect(getPasswordStrength('abc')).toBe('Weak')
    expect(getPasswordStrength('abcd1234')).toBe('Good')
    expect(getPasswordStrength('Abcd1234efgh!')).toBe('Strong')
  })
})

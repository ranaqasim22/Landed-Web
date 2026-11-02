import { z } from 'zod'

export const passwordRules = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'At least 1 letter', test: (value: string) => /\p{L}/u.test(value) },
  { label: 'At least 1 number', test: (value: string) => /\d/.test(value) },
]

export function getPasswordStrength(password: string) {
  if (!passwordRules.every((rule) => rule.test(password))) return 'Weak'
  const isLong = password.length >= 12
  const hasVariety = /[^\p{L}\d]/u.test(password) || /\p{Lu}/u.test(password)
  return isLong && hasVariety ? 'Strong' : 'Good'
}

const emailSchema = z
  .string()
  .trim()
  .pipe(z.email('Enter a valid email, like name@example.com'))

const newPasswordSchema = z
  .string()
  .refine(
    (value) => passwordRules.every((rule) => rule.test(value)),
    "This password doesn't meet all the rules yet",
  )

const confirmPasswordSchema = z.string().min(1, 'Confirm your password')

const passwordsMatch = {
  check: (values: { password: string; confirmPassword: string }) =>
    values.password === values.confirmPassword,
  params: { message: "Passwords don't match", path: ['confirmPassword'] },
}

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
})

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Enter your full name'),
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: confirmPasswordSchema,
    // A refine rather than z.literal(true): a literal failure would stop the password match check.
    acceptedTerms: z
      .boolean()
      .refine(Boolean, 'Please accept the Terms and Privacy Policy'),
  })
  .refine(passwordsMatch.check, passwordsMatch.params)

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine(passwordsMatch.check, passwordsMatch.params)

export type LoginValues = z.infer<typeof loginSchema>
export type SignupValues = z.infer<typeof signupSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

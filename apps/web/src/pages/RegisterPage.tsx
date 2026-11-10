import { PASSWORD_MIN_LENGTH, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '@riftroom/shared'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/auth-context'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { passwordStrength } from '../lib/password-strength'
import { useForm } from '../lib/use-form'
import styles from './AuthForm.module.css'
import { describeAuthError } from './auth-errors'
import { type RegisterField, validateRegister } from './register-validation'

export function RegisterPage() {
  const { register } = useAuth()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<RegisterField>({
    initialValues: { username: '', email: '', password: '', confirmPassword: '' },
    validate: validateRegister,
  })
  const strength = passwordStrength(form.values.password)

  const onSubmit = form.handleSubmit(async ({ username, email, password }) => {
    setFormError(null)
    try {
      await register({ username, email, password })
    } catch (error) {
      const { fieldErrors, formError } = describeAuthError(error)
      form.applyServerErrors(fieldErrors)
      setFormError(formError)
    }
  })

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={location.state}>
            Sign in
          </Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {formError && <Alert>{formError}</Alert>}

        <TextField
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="rift_walker"
          hint={`${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters: letters, numbers, underscores.`}
          autoFocus
          {...form.field('username')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          {...form.field('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          footer={
            form.values.password && (
              <div className={styles.strength} data-score={strength.score} aria-live="polite">
                <div className={styles.bars} aria-hidden="true">
                  {[1, 2, 3, 4].map((step) => (
                    <span key={step} data-on={strength.score >= step} />
                  ))}
                </div>
                <span>{strength.label}</span>
              </div>
            )
          }
          {...form.field('password')}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          {...form.field('confirmPassword')}
        />

        <Button type="submit" size="lg" fullWidth loading={form.submitting}>
          {form.submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}

import { loginRequestSchema, toFieldErrors } from '@riftroom/shared'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/auth-context'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { useForm } from '../lib/use-form'
import styles from './AuthForm.module.css'
import { describeAuthError } from './auth-errors'

type LoginField = 'email' | 'password'

function validate(values: Record<LoginField, string>) {
  const result = loginRequestSchema.safeParse(values)
  return result.success ? {} : toFieldErrors(result.error)
}

export function LoginPage() {
  const { login } = useAuth()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<LoginField>({ initialValues: { email: '', password: '' }, validate })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      // On success the route guard redirects to the dashboard (or where the user came from).
      await login(values)
    } catch (error) {
      const { fieldErrors, formError } = describeAuthError(error)
      form.applyServerErrors(fieldErrors)
      setFormError(formError)
    }
  })

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to RIFTROOM."
      footer={
        <>
          New here?{' '}
          <Link to="/register" state={location.state}>
            Create an account
          </Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {formError && <Alert>{formError}</Alert>}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          autoFocus
          {...form.field('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          {...form.field('password')}
        />

        <Button type="submit" size="lg" fullWidth loading={form.submitting}>
          {form.submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}

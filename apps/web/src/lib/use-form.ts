import type { FieldErrors } from '@riftroom/shared'
import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from 'react'

interface UseFormOptions<K extends string> {
  initialValues: Record<K, string>
  /** Pure, synchronous client-side validation (usually a shared zod schema). */
  validate: (values: Record<K, string>) => FieldErrors
}

/**
 * Small form state helper.
 * Client errors appear after an edited field loses focus, or after the first submit.
 * Server errors (e.g. "email taken") show until the user edits that field.
 */
export function useForm<K extends string>({ initialValues, validate }: UseFormOptions<K>) {
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({})
  const [dirty, setDirty] = useState<Partial<Record<K, boolean>>>({})
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // The form element, captured on submit; used to focus the first invalid field.
  const formRef = useRef<HTMLFormElement | null>(null)

  const clientErrors = useMemo(() => validate(values), [validate, values])

  const errorFor = (name: K): string | undefined =>
    serverErrors[name] ?? (submitAttempted || touched[name] ? clientErrors[name] : undefined)

  const field = (name: K) => ({
    name,
    value: values[name],
    error: errorFor(name),
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setValues((current) => ({ ...current, [name]: value }))
      setDirty((current) => (current[name] ? current : { ...current, [name]: true }))
      setServerErrors(({ [name]: _removed, ...rest }) => rest)
    },
    // Leaving a field the user never typed in shows nothing: an error appearing
    // mid-click would shift the layout under the pointer (e.g. on a link below).
    onBlur: () => {
      if (dirty[name]) setTouched((current) => ({ ...current, [name]: true }))
    },
  })

  const focusFirstError = () =>
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus())

  const handleSubmit = (onValid: (values: Record<K, string>) => Promise<void>) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    formRef.current = event.currentTarget
    if (submitting) return
    setSubmitAttempted(true)

    if (Object.keys(clientErrors).length > 0) {
      focusFirstError()
      return
    }

    setSubmitting(true)
    try {
      await onValid(values)
    } finally {
      setSubmitting(false)
    }
  }

  const applyServerErrors = (errors: FieldErrors) => {
    setServerErrors(errors)
    if (Object.keys(errors).length > 0) focusFirstError()
  }

  return { values, field, handleSubmit, submitting, applyServerErrors }
}

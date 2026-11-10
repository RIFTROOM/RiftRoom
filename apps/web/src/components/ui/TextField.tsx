import { type InputHTMLAttributes, type ReactNode, useId, useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'
import styles from './TextField.module.css'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  error?: string
  hint?: ReactNode
  /** Extra content under the input, e.g. a strength meter. */
  footer?: ReactNode
}

export function TextField({ label, error, hint, footer, type = 'text', className, ...rest }: TextFieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={[styles.control, error && styles.invalid].filter(Boolean).join(' ')}>
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {footer}
      {error ? (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  )
}

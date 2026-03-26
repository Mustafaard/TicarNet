import { useState } from 'react'

const EyeOfHorusIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 5C7 5 4 12 4 12s3 7 8 7 8-7 8-7-3-7-8-7z" />
    <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
    <path d="M12 9v6M9 12h6" strokeWidth="1.2" opacity="0.8" />
  </svg>
)

const EyeOfHorusOffIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden
  >
    <path d="M4 4l16 16M9 9a3 3 0 104.24 4.24M15 9a3 3 0 00-4.24-4.24M12 4C7.5 4 4 7.5 4 12a8 8 0 001.5 4.5M20 12a8 8 0 01-1.5 4.5M12 8v4M8 12h4" />
  </svg>
)

function AuthPasswordField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-200">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`
            w-full min-h-[48px] rounded-xl border bg-slate-900/90 pl-4 pr-12 py-3
            text-slate-100 placeholder:text-slate-500
            shadow-[0_2px_8px_rgba(0,0,0,0.25)]
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50
            ${error ? 'border-red-500/60' : 'border-amber-900/40'}
          `}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((state) => !state)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-amber-500/90 hover:text-amber-400 hover:bg-amber-500/15 focus:outline-none focus:ring-2 focus:ring-amber-500/40 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        >
          {visible ? <EyeOfHorusOffIcon /> : <EyeOfHorusIcon />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default AuthPasswordField

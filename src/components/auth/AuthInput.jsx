/**
 * Reusable text input for auth flows. Ancient theme: rounded, soft shadow.
 */
function AuthInput({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
  inputMode,
  autoCapitalize,
  spellCheck,
  pattern,
  maxLength,
  title,
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-200">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        pattern={pattern}
        maxLength={maxLength}
        title={title}
        className={`
          w-full min-h-[48px] rounded-xl border bg-slate-900/90 px-4 py-3
          text-slate-100 placeholder:text-slate-500
          shadow-[0_2px_8px_rgba(0,0,0,0.25)]
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50
          focus:visible:outline-none
          ${error ? 'border-red-500/60' : 'border-amber-900/40'}
        `}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default AuthInput

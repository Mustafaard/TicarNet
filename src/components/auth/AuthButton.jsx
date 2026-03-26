/**
 * Ana aksiyon butonu — referans görseller: banner formu, süslü uçlar, altın / koyu kahve.
 */
function AuthButton({ type = 'button', children, onClick, disabled = false, variant = 'gold', className = '' }) {
  const isSecondary = variant === 'secondary'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        auth-btn-banner
        w-full min-h-[50px] rounded-xl font-semibold tracking-[0.18em] text-sm
        flex items-center justify-center gap-2
        border-2
        shadow-lg
        transition-all duration-200
        active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0a1628]
        disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
        touch-manipulation
        ${isSecondary
          ? 'bg-slate-900/80 border-slate-600/70 text-slate-200 hover:bg-slate-800/80 hover:border-amber-500/50 shadow-[0_3px_10px_rgba(0,0,0,0.45)]'
          : 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-amber-400/80 text-slate-950 hover:from-amber-200 hover:via-amber-300 hover:to-amber-450 hover:shadow-[0_6px_18px_rgba(180,140,50,0.45)] shadow-[0_5px_16px_rgba(15,23,42,0.65),inset_0_1px_0_rgba(255,255,255,0.25)]'
        }
        ${className}
      `}
    >
      {children}
    </button>
  )
}

export default AuthButton

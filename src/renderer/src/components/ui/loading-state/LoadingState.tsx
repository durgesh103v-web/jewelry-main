import React from 'react'

export interface LoadingStateProps {
  message?: string
  subMessage?: string
  className?: string
  compact?: boolean
  onCancel?: () => void
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading workspace...',
  subMessage = 'Preparing data models, balances & calculating live valuations...',
  className = '',
  compact = false,
  onCancel
}) => {
  if (compact) {
    return (
      <div
        className={`flex items-center justify-center gap-2.5 p-4 text-xs text-slate-600 select-none ${className}`.trim()}
      >
        <div className="relative w-4 h-4">
          <div className="w-4 h-4 rounded-full border-2 border-amber-200 border-t-amber-600 animate-spin" />
        </div>
        <span className="font-medium text-slate-700">{message}</span>
      </div>
    )
  }

  return (
    <div
      className={`w-full h-full min-h-[420px] flex-1 flex flex-col items-center justify-center p-6 select-none bg-[var(--color-background-app,#f8fafc)] ${className}`.trim()}
    >
      {/* Ambient background glow card */}
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl p-8 flex flex-col items-center text-center overflow-hidden">
        {/* Decorative Top Amber Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

        {/* Brand System Tag */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200/70 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Jewellery ERP Enterprise</span>
        </div>

        {/* Animated Luxury Diamond Ring Spinner */}
        <div className="relative w-16 h-16 flex items-center justify-center mb-4">
          {/* Outer Pulsing Glow */}
          <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md animate-ping" />
          
          {/* Rotating Gradient Ring */}
          <div className="w-14 h-14 rounded-full border-[3px] border-amber-100 border-t-amber-600 border-r-amber-500 animate-spin shadow-xs" />
          
          {/* Centered Gem Icon */}
          <div className="absolute inset-0 flex items-center justify-center text-amber-700">
            <svg
              className="w-6 h-6 text-amber-600 drop-shadow-xs"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3h12l4 6-10 13L2 9z" />
              <path d="M12 22V9" />
              <path d="m2 9 8 4 2-4 2 4 8-4" />
            </svg>
          </div>
        </div>

        {/* Title and Subtitle */}
        <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">
          {message}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-6 font-normal">
          {subMessage}
        </p>

        {/* Subtle Animated Progress Track */}
        <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
          <div className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full animate-pulse w-3/4" />
        </div>

        {/* Optional Action / Escape Hatch */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-slate-500 hover:text-amber-800 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Cancel and return to Dashboard
          </button>
        )}
      </div>
        
      {/* Background Skeleton Preview for Natural Visual Flow */}
      <div className="w-full max-w-4xl mt-6 px-4 opacity-40 pointer-events-none hidden md:block">
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="h-16 bg-slate-200/60 rounded-xl animate-pulse" />
          <div className="h-16 bg-slate-200/60 rounded-xl animate-pulse" />
          <div className="h-16 bg-slate-200/60 rounded-xl animate-pulse" />
          <div className="h-16 bg-slate-200/60 rounded-xl animate-pulse" />
        </div>
        <div className="h-40 bg-slate-200/50 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

export default LoadingState

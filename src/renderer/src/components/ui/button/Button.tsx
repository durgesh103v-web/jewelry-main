import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'link'
export type ButtonSize = 'small' | 'medium' | 'large' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer'

    const sizeStyles: Record<ButtonSize, string> = {
      small: 'px-2.5 py-1 text-xs gap-1.5 h-7',
      medium: 'px-3.5 py-1.5 text-sm gap-2 h-8',
      large: 'px-5 py-2 text-base gap-2.5 h-10',
      icon: 'p-1.5 text-sm h-8 w-8 justify-center'
    }

    const variantStyles: Record<ButtonVariant, string> = {
      primary: 'bg-brand-primary hover:bg-brand-primary-hover text-white border border-transparent shadow-xs',
      secondary: 'bg-background-muted hover:bg-border-default text-foreground border border-border',
      outline: 'bg-transparent hover:bg-background-muted text-foreground border border-border-strong',
      ghost: 'bg-transparent hover:bg-background-muted text-foreground border border-transparent',
      danger: 'bg-error hover:bg-red-700 text-white border border-transparent shadow-xs',
      success: 'bg-success hover:bg-emerald-700 text-white border border-transparent shadow-xs',
      link: 'bg-transparent text-brand-primary hover:underline p-0 h-auto border-none'
    }

    const widthClass = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthClass} ${className}`.trim()}
        {...props}
      >
        {loading ? (
          <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-1.5" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

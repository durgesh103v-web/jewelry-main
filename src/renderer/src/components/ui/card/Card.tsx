import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  bordered?: boolean
}

export const Card: React.FC<CardProps> = ({ children, bordered = true, className = '', ...props }) => (
  <div
    className={`bg-background-card text-foreground rounded-md shadow-card ${
      bordered ? 'border border-border' : ''
    } ${className}`.trim()}
    {...props}
  >
    {children}
  </div>
)

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`p-4 border-b border-border flex flex-col gap-1 ${className}`.trim()} {...props}>
    {children}
  </div>
)

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, className = '', ...props }) => (
  <h3 className={`text-sm font-bold text-foreground m-0 tracking-tight ${className}`.trim()} {...props}>
    {children}
  </h3>
)

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, className = '', ...props }) => (
  <p className={`text-xs text-foreground-muted m-0 ${className}`.trim()} {...props}>
    {children}
  </p>
)

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`p-4 ${className}`.trim()} {...props}>
    {children}
  </div>
)

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`p-3 bg-background-muted border-t border-border rounded-b-md flex items-center justify-end gap-2 ${className}`.trim()} {...props}>
    {children}
  </div>
)

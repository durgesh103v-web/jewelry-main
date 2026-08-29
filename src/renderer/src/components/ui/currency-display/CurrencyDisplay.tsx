import React from 'react'
import { formatCurrency } from '@utils/formatters'

export interface CurrencyDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | string | null | undefined
  includeSymbol?: boolean
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  value,
  includeSymbol = true,
  className = '',
  ...props
}) => {
  return (
    <span className={`font-mono ${className}`.trim()} {...props}>
      {formatCurrency(value, includeSymbol)}
    </span>
  )
}

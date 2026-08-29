import React from 'react'
import { formatPercentage } from '@utils/formatters'

export interface PercentageDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | string | null | undefined
  decimals?: number
}

export const PercentageDisplay: React.FC<PercentageDisplayProps> = ({
  value,
  decimals = 2,
  className = '',
  ...props
}) => {
  return (
    <span className={`font-mono ${className}`.trim()} {...props}>
      {formatPercentage(value, decimals)}
    </span>
  )
}

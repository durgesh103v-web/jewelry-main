import React from 'react'
import { formatWeight } from '@utils/formatters'

export interface WeightDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | string | null | undefined
  unit?: string
  decimals?: number
}

export const WeightDisplay: React.FC<WeightDisplayProps> = ({
  value,
  unit = 'g',
  decimals = 3,
  className = '',
  ...props
}) => {
  return (
    <span className={`font-mono ${className}`.trim()} {...props}>
      {formatWeight(value, unit, decimals)}
    </span>
  )
}

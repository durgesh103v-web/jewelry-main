import React from 'react'
import { formatDate } from '@utils/formatters'

export interface DateDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: string | Date | null | undefined
}

export const DateDisplay: React.FC<DateDisplayProps> = ({ value, className = '', ...props }) => {
  return (
    <span className={`${className}`.trim()} {...props}>
      {formatDate(value)}
    </span>
  )
}

import React from 'react'
import { Select, SelectProps } from '../select/Select'
import { GOLD_PURITIES } from '@shared/constants'

export interface PuritySelectProps extends Omit<SelectProps, 'options' | 'value' | 'onChange'> {
  value: number | string
  onChange: (tunch: number) => void
  label?: string
}

export const PuritySelect: React.FC<PuritySelectProps> = ({
  value,
  onChange,
  label = 'Purity / Tunch',
  ...props
}) => {
  const options = GOLD_PURITIES.map((p) => ({
    label: p.label,
    value: p.tunch
  }))

  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      options={options}
      placeholder="Custom Tunch..."
      {...props}
    />
  )
}

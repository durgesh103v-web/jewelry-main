import React from 'react'
import { Select, SelectProps } from '../select/Select'
import { METAL_OPTIONS, MetalConstant } from '@shared/constants'

export interface MetalSelectProps extends Omit<SelectProps, 'options' | 'value' | 'onChange'> {
  value: MetalConstant | string
  onChange: (value: MetalConstant) => void
  allowAll?: boolean
}

export const MetalSelect: React.FC<MetalSelectProps> = ({
  value,
  onChange,
  allowAll = false,
  label = 'Metal Type',
  ...props
}) => {
  const options = allowAll
    ? [{ label: 'All Metals', value: 'ALL' }, ...METAL_OPTIONS.map((m) => ({ label: m, value: m }))]
    : METAL_OPTIONS.map((m) => ({ label: m, value: m }))

  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as MetalConstant)}
      options={options}
      {...props}
    />
  )
}

import React from 'react'
import { Input, InputProps } from '../input/Input'

export interface CurrencyInputProps extends Omit<InputProps, 'prefix' | 'onChange'> {
  value: number | string
  onChange: (val: string) => void
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  label = 'Amount',
  placeholder = '0.00',
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // Allow numbers and decimal points
    if (/^-?\d*\.?\d*$/.test(val)) {
      onChange(val)
    }
  }

  return (
    <Input
      label={label}
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      prefix={<span className="font-semibold">₹</span>}
      {...props}
    />
  )
}

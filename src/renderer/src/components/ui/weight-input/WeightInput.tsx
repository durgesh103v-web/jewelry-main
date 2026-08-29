import React from 'react'
import { Input } from '../input/Input'
import { Select } from '../select/Select'
import { UNIT_OPTIONS, UnitConstant } from '@shared/constants'

export interface WeightInputProps {
  grossWeight: number | string
  lessWeight?: number | string
  netWeight?: number | string
  unit?: UnitConstant | string
  onChangeGross?: (val: string) => void
  onChangeLess?: (val: string) => void
  onChangeUnit?: (unit: UnitConstant) => void
  disabled?: boolean
  className?: string
}

export const WeightInput: React.FC<WeightInputProps> = ({
  grossWeight,
  lessWeight = 0,
  netWeight,
  unit = 'Gm',
  onChangeGross,
  onChangeLess,
  onChangeUnit,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-3 gap-2 items-start ${className}`.trim()}>
      <Input
        label="Gross Wt"
        type="text"
        value={grossWeight}
        onChange={(e) => onChangeGross && onChangeGross(e.target.value)}
        disabled={disabled}
        suffix={unit}
      />
      <Input
        label="Less Wt"
        type="text"
        value={lessWeight}
        onChange={(e) => onChangeLess && onChangeLess(e.target.value)}
        disabled={disabled}
        suffix={unit}
      />
      {onChangeUnit ? (
        <Select
          label="Unit"
          value={unit}
          onChange={(e) => onChangeUnit(e.target.value as UnitConstant)}
          options={UNIT_OPTIONS.map((u) => ({ label: u, value: u }))}
          disabled={disabled}
        />
      ) : netWeight !== undefined ? (
        <Input label="Net Wt" type="text" value={netWeight} disabled readOnly suffix={unit} />
      ) : null}
    </div>
  )
}

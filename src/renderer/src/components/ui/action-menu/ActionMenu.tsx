import React from 'react'
import { Button } from '../button/Button'

export interface CustomAction {
  key: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'ghost' | 'danger' | 'primary'
  disabled?: boolean
}

export interface ActionMenuProps {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onPrint?: () => void
  customActions?: CustomAction[]
  size?: 'small' | 'medium'
  className?: string
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  onView,
  onEdit,
  onDelete,
  onPrint,
  customActions = [],
  size = 'small',
  className = ''
}) => {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`.trim()}>
      {onView && (
        <Button size={size} variant="ghost" title="View details" onClick={onView}>
          👁
        </Button>
      )}
      {onEdit && (
        <Button size={size} variant="ghost" title="Edit" onClick={onEdit}>
          ✏️
        </Button>
      )}
      {onPrint && (
        <Button size={size} variant="ghost" title="Print" onClick={onPrint}>
          🖨️
        </Button>
      )}
      {customActions.map((action) => (
        <Button
          key={action.key}
          size={size}
          variant={action.variant || 'ghost'}
          title={action.label}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.icon || action.label}
        </Button>
      ))}
      {onDelete && (
        <Button size={size} variant="danger" title="Delete" onClick={onDelete}>
          🗑️
        </Button>
      )}
    </div>
  )
}

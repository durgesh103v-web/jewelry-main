import React from 'react'
import { Button } from '../button/Button'

export interface FormActionsProps {
  onSave?: () => void
  onCancel?: () => void
  onReset?: () => void
  saveLabel?: string
  cancelLabel?: string
  loading?: boolean
  customActions?: React.ReactNode
  className?: string
}

export const FormActions: React.FC<FormActionsProps> = ({
  onSave,
  onCancel,
  onReset,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  customActions,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-end gap-2 pt-3 border-t border-border ${className}`.trim()}>
      {onReset && (
        <Button variant="ghost" onClick={onReset} disabled={loading}>
          Reset
        </Button>
      )}
      {onCancel && (
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
      )}
      {customActions}
      {onSave && (
        <Button variant="primary" onClick={onSave} loading={loading}>
          {saveLabel}
        </Button>
      )}
    </div>
  )
}

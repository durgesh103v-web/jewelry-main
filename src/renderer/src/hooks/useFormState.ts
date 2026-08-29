import { useState, useCallback } from 'react'

export interface UseFormStateReturn<T extends Record<string, unknown>> {
  values: T
  setValue: <K extends keyof T>(field: K, value: T[K]) => void
  setValues: (newValues: Partial<T> | ((prev: T) => T)) => void
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  resetForm: () => void
  isSubmitting: boolean
  setIsSubmitting: (submitting: boolean) => void
}

export function useFormState<T extends Record<string, unknown>>(initialValues: T): UseFormStateReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState((prev) => ({
      ...prev,
      [field]: value
    }))
  }, [])

  const setValues = useCallback((newValues: Partial<T> | ((prev: T) => T)) => {
    if (typeof newValues === 'function') {
      setValuesState(newValues)
    } else {
      setValuesState((prev) => ({
        ...prev,
        ...newValues
      }))
    }
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, name, value, type } = e.target
    const key = (name || id) as keyof T
    if (!key) return

    let finalVal: unknown = value
    if (type === 'checkbox' && 'checked' in e.target) {
      finalVal = (e.target as HTMLInputElement).checked
    } else if (type === 'number') {
      finalVal = value === '' ? '' : Number(value)
    }

    setValuesState((prev) => ({
      ...prev,
      [key]: finalVal
    }))
  }, [])

  const resetForm = useCallback(() => {
    setValuesState(initialValues)
    setIsSubmitting(false)
  }, [initialValues])

  return {
    values,
    setValue,
    setValues,
    handleChange,
    resetForm,
    isSubmitting,
    setIsSubmitting
  }
}

import { useState, useCallback } from 'react'

export interface WeightScaleReading {
  weight: number
  unit: string
  isStable: boolean
}

export interface UseWeightScaleReturn {
  weight: number
  unit: string
  isStable: boolean
  connected: boolean
  reading: boolean
  readWeight: () => Promise<number | null>
}

export function useWeightScale(): UseWeightScaleReturn {
  const [weight, setWeight] = useState<number>(0)
  const [unit] = useState<string>('Gm')
  const [isStable] = useState<boolean>(true)
  const [connected] = useState<boolean>(true)
  const [reading, setReading] = useState<boolean>(false)

  const readWeight = useCallback(async (): Promise<number | null> => {
    try {
      setReading(true)
      if (window.api && window.api.weightScans) {
        const result = await window.api.weightScans.list()
        if (result && result.length > 0) {
          const latest = result[0]
          setWeight(latest.grossWeight || 0)
          return latest.grossWeight || 0
        }
      }
      return null
    } catch {
      return null
    } finally {
      setReading(false)
    }
  }, [])

  return {
    weight,
    unit,
    isStable,
    connected,
    reading,
    readWeight
  }
}

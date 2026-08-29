import type { WeighingScaleAdapter, DeviceInfo, WeightReadingEvent } from './device.types'

/**
 * Standard Weighing Scale Adapter (Placeholder for future RS232 / USB Serial / BLE Scales)
 */
export class DefaultWeighingScaleAdapter implements WeighingScaleAdapter {
  public readonly deviceInfo: DeviceInfo = {
    id: 'scale-default',
    name: 'Jewellery Precision Balance (Driver Pending)',
    type: 'WEIGHING_SCALE',
    status: 'UNAVAILABLE',
    model: 'Precision 0.001g Balance'
  }

  private listeners: Set<(event: WeightReadingEvent) => void> = new Set()

  public async connect(): Promise<boolean> {
    return false
  }

  public async disconnect(): Promise<void> {
    this.listeners.clear()
  }

  public async readWeight(): Promise<WeightReadingEvent> {
    return {
      grossWeight: 0,
      unit: 'g',
      isStable: true,
      timestamp: Date.now()
    }
  }

  public onWeightChange(listener: (event: WeightReadingEvent) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public async zeroScale(): Promise<boolean> {
    return true
  }

  public async tareScale(): Promise<boolean> {
    return true
  }
}

export const defaultWeighingScale = new DefaultWeighingScaleAdapter()

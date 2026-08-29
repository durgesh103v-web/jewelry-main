import type { BarcodeScannerAdapter, DeviceInfo, BarcodeScanEvent } from './device.types'

/**
 * Keyboard / Scanner-Emulation Barcode Scanner Adapter
 * Handles fast keystroke burst sequences typical of handheld USB/HID barcode guns.
 */
export class KeyboardBarcodeScannerAdapter implements BarcodeScannerAdapter {
  public readonly deviceInfo: DeviceInfo = {
    id: 'scanner-keyboard-emulation',
    name: 'Keyboard Emulation Scanner',
    type: 'BARCODE_SCANNER',
    status: 'CONNECTED',
    model: 'HID Keyboard Wedge'
  }

  private listeners: Set<(event: BarcodeScanEvent) => void> = new Set()
  private buffer: string = ''
  private lastKeyTime: number = 0
  private readonly BURST_THRESHOLD_MS = 60
  private boundKeyHandler: (e: KeyboardEvent) => void

  constructor() {
    this.boundKeyHandler = this.handleKeyDown.bind(this)
  }

  public async connect(): Promise<boolean> {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.boundKeyHandler)
    }
    return true
  }

  public async disconnect(): Promise<void> {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundKeyHandler)
    }
    this.listeners.clear()
  }

  public onScan(listener: (event: BarcodeScanEvent) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const now = Date.now()
    const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase()

    // If typing slowly in a text input or textarea, let user type normally
    if (targetTag === 'textarea') return

    if (e.key === 'Enter') {
      if (this.buffer.length >= 3 && now - this.lastKeyTime < 300) {
        const barcode = this.buffer.trim()
        this.buffer = ''
        if (barcode) {
          const event: BarcodeScanEvent = { barcode, timestamp: now }
          this.listeners.forEach((fn) => fn(event))
        }
      } else {
        this.buffer = ''
      }
      return
    }

    if (e.key.length === 1) {
      if (now - this.lastKeyTime > this.BURST_THRESHOLD_MS && this.buffer.length > 0) {
        // Reset buffer if delay between keystrokes exceeds burst threshold
        this.buffer = ''
      }
      this.buffer += e.key
      this.lastKeyTime = now
    }
  }
}

export const defaultBarcodeScanner = new KeyboardBarcodeScannerAdapter()

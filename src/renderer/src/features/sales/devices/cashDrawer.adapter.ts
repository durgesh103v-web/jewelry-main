import type { CashDrawerAdapter, DeviceInfo } from './device.types'

/**
 * Standard Cash Drawer Adapter
 */
export class DefaultCashDrawerAdapter implements CashDrawerAdapter {
  public readonly deviceInfo: DeviceInfo = {
    id: 'drawer-default',
    name: 'Cash Drawer (RJ11/USB Kick)',
    type: 'CASH_DRAWER',
    status: 'UNAVAILABLE',
    model: 'Standard 24V Solenoid Drawer'
  }

  public async open(): Promise<boolean> {
    return false
  }

  public async isOpen(): Promise<boolean | null> {
    return null
  }
}

export const defaultCashDrawer = new DefaultCashDrawerAdapter()

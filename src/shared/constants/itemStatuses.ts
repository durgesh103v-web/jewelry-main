export const ITEM_STATUSES = {
  IN_STOCK: 'IN_STOCK',
  RESERVED: 'RESERVED',
  SOLD: 'SOLD',
  RETURNED: 'RETURNED',
  EXCHANGE: 'EXCHANGE',
  REPAIR: 'REPAIR',
  JOB_WORK: 'JOB_WORK',
  MELTING: 'MELTING',
  TRANSFERRED: 'TRANSFERRED',
  LOST: 'LOST',
  DAMAGED: 'DAMAGED'
} as const

export type ItemStatus = (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES]

// Allowed state transitions
const ALLOWED_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  IN_STOCK: ['RESERVED', 'SOLD', 'REPAIR', 'JOB_WORK', 'MELTING', 'TRANSFERRED', 'LOST', 'DAMAGED'],
  RESERVED: ['IN_STOCK', 'SOLD', 'CANCELLED' as any],
  SOLD: ['RETURNED', 'EXCHANGE'],
  RETURNED: ['IN_STOCK', 'REPAIR', 'MELTING'],
  EXCHANGE: ['IN_STOCK', 'MELTING'],
  REPAIR: ['IN_STOCK', 'DAMAGED', 'LOST'],
  JOB_WORK: ['IN_STOCK', 'DAMAGED', 'LOST'],
  MELTING: ['IN_STOCK'],
  TRANSFERRED: ['IN_STOCK', 'LOST'],
  LOST: ['IN_STOCK'], // If found
  DAMAGED: ['REPAIR', 'MELTING', 'LOST']
}

export function canTransitionItemStatus(from: ItemStatus, to: ItemStatus): boolean {
  if (from === to) return true
  const allowed = ALLOWED_TRANSITIONS[from]
  return Boolean(allowed && allowed.includes(to))
}

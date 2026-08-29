import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { GoldRateRepository } from '../database/repositories/GoldRateRepository'
import { ValidationError, NotFoundError } from '../ipc/errors'
import type { GoldRateRecord, GoldRatePayload, GoldRateFilter } from '../../shared/types/goldRate'

const goldRateRepository = new GoldRateRepository()

const goldRateSchema = z.object({
  metalType: z.string().trim().min(1, 'Metal type is required').default('Gold'),
  purityId: z.string().trim().optional().default(''),
  purityName: z.string().trim().min(1, 'Purity name is required'),
  purityKarat: z.string().trim().optional().default(''),
  fineness: z.coerce.number().min(1).max(1000).default(999),
  ratePerGram: z.coerce.number().positive('Rate per gram must be greater than 0'),
  effectiveDate: z.string().trim().optional().default(''),
  effectiveTime: z.string().trim().optional().default(''),
  notes: z.string().trim().optional().default(''),
  active: z.boolean().default(true)
})

export const goldRateService = {
  list(filter?: GoldRateFilter): GoldRateRecord[] {
    return goldRateRepository.findAll({
      metalType: filter?.metalType,
      effectiveDate: filter?.effectiveDate,
      activeOnly: filter?.active
    })
  },

  getById(id: string): GoldRateRecord {
    const rate = goldRateRepository.findById(id)
    if (!rate) {
      throw new NotFoundError('Gold rate not found')
    }
    return rate
  },

  getCurrentRate(metalType = 'Gold', purityName?: string): GoldRateRecord | null {
    const rate = goldRateRepository.getCurrentRate(metalType, purityName)
    return rate ?? null
  },

  getRateAtDate(metalType = 'Gold', date: string, purityName?: string): GoldRateRecord | null {
    const rate = goldRateRepository.getRateAtDate(metalType, date, purityName)
    return rate ?? null
  },

  create(payload: GoldRatePayload, createdBy?: string): GoldRateRecord {
    const parseResult = goldRateSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid gold rate payload')
    }
    const data = parseResult.data

    const now = dayjs()
    const effectiveDate = data.effectiveDate || now.format('YYYY-MM-DD')
    const effectiveTime = data.effectiveTime || now.format('HH:mm:ss')
    const id = uuidv4()
    const timestamp = now.format('YYYY-MM-DD HH:mm:ss')

    goldRateRepository.insert({
      id,
      metalType: data.metalType,
      purityId: data.purityId || null,
      purityName: data.purityName,
      purityKarat: data.purityKarat || null,
      fineness: data.fineness,
      ratePerGram: data.ratePerGram,
      effectiveDate,
      effectiveTime,
      notes: data.notes,
      active: data.active,
      createdBy: createdBy || null,
      createdAt: timestamp,
      updatedAt: timestamp
    })

    return this.getById(id)
  },

  update(id: string, payload: Partial<GoldRatePayload>): GoldRateRecord {
    const existing = this.getById(id)
    const ratePerGram = payload.ratePerGram !== undefined ? Number(payload.ratePerGram) : existing.ratePerGram
    if (ratePerGram <= 0) {
      throw new ValidationError('Rate per gram must be greater than 0')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    goldRateRepository.update(id, {
      ratePerGram,
      notes: payload.notes !== undefined ? payload.notes : existing.notes,
      active: payload.active !== undefined ? payload.active : existing.active,
      updatedAt: now
    })

    return this.getById(id)
  },

  delete(id: string): { success: boolean } {
    this.getById(id)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    goldRateRepository.softDelete(id, now)
    return { success: true }
  }
}

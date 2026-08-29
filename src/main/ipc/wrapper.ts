import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { AppError } from './errors'

type HandlerFn<TInput, TOutput> = (event: IpcMainInvokeEvent, payload: TInput) => Promise<TOutput> | TOutput

export function createIpcHandler<TInput = unknown, TOutput = unknown>(
  channel: string,
  handler: HandlerFn<TInput, TOutput>,
  schema?: z.ZodSchema<TInput>
): void {
  ipcMain.handle(channel, async (event, payload: TInput) => {
    try {
      let validatedPayload = payload
      if (schema) {
        const result = schema.safeParse(payload)
        if (!result.success) {
          const firstError = result.error.issues[0]?.message || 'Invalid payload data'
          throw new AppError(firstError, 'VALIDATION_ERROR', 400)
        }
        validatedPayload = result.data
      }

      return await handler(event, validatedPayload)
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw new Error(error.message)
      }

      if (error instanceof Error) {
        if (error.message.includes('SQLITE_') || error.message.includes('UNIQUE constraint failed')) {
          if (error.message.includes('UNIQUE constraint failed')) {
            throw new Error('A record with this unique identifier or name already exists.')
          }
          throw new Error('Database operation failed.')
        }
        throw new Error(error.message)
      }

      throw new Error('An unexpected error occurred.')
    }
  })
}

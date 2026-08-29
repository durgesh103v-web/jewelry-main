import { createIpcHandler } from './wrapper'
import { jobWorkService } from '../services/jobWork.service'

export function registerJobWorkIpc(): void {
  createIpcHandler('job-work:next-number', () => {
    return jobWorkService.getNextJobWorkNo()
  })

  createIpcHandler('job-work:create', (_event, payload: any) => {
    return jobWorkService.create(payload)
  })

  createIpcHandler('job-work:update', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return jobWorkService.update(payload.id, payload.payload)
    }
    return jobWorkService.update(id, payload)
  })

  createIpcHandler('job-work:list', () => {
    return jobWorkService.list()
  })

  createIpcHandler('job-work:get-by-id', (_event, id: string) => {
    return jobWorkService.getById(id)
  })

  createIpcHandler('job-work:delete', (_event, id: string) => {
    return jobWorkService.delete(id)
  })

  createIpcHandler('job-work:receive-goods', (_event, id: string, payload?: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return jobWorkService.receiveGoods(payload.id, payload.payload)
    }
    return jobWorkService.receiveGoods(id, payload)
  })
}

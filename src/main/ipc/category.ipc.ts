import { createIpcHandler } from './wrapper'
import { categoryService } from '../services/category.service'

export function registerCategoryIpc(): void {
  createIpcHandler('categories:list', () => {
    return categoryService.list()
  })

  createIpcHandler('categories:tree', () => {
    return categoryService.getTree()
  })

  createIpcHandler('categories:create', (_event, payload: any) => {
    return categoryService.create(payload)
  })

  createIpcHandler('categories:update', (_event, payload: any) => {
    if (payload && typeof payload === 'object' && 'id' in payload && 'payload' in payload) {
      return categoryService.update(payload.id, payload.payload)
    }
    return categoryService.update(payload?.id, payload)
  })

  createIpcHandler('categories:delete', (_event, id: any) => {
    return categoryService.delete(id)
  })
}

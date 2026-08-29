import React from 'react'
import type { AppMenuChild } from '../../types/menu'

export type ModuleCategory = AppMenuChild['module'] | 'home'

export interface ScreenDefinition {
  id: string
  label: string
  module: ModuleCategory
  component: React.ComponentType<{ onClose: () => void; [key: string]: unknown }>
  businessTypes?: Array<'WHOLESALE' | 'RETAIL'>
}

export interface MenuItem {
  id: string
  label: string
  module: ModuleCategory
}

export interface MenuSection {
  id: string
  label: string
  children: MenuItem[]
  businessTypes?: Array<'WHOLESALE' | 'RETAIL'>
}

export interface WorkspaceTab {
  id: string
  label: string
  module: ModuleCategory
}

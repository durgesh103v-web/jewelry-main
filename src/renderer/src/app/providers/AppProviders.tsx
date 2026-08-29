import React from 'react'

export interface AppProvidersProps {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  return <>{children}</>
}

import React from 'react'
import './App.css'
import { AppProviders } from './app/providers/AppProviders'
import { AppShell } from './app/shell/AppShell'

type AppProps = {
  session: AuthSession
  onLogout: () => void
}

function App({ session, onLogout }: AppProps): React.JSX.Element {
  return (
    <AppProviders>
      <AppShell session={session} onLogout={onLogout} />
    </AppProviders>
  )
}

export default App

import { useEffect, useState } from 'react'
import { FiAward, FiShield } from 'react-icons/fi'
import App from '../../App'
import LoginScreen from './LoginScreen'
import RegisterScreen from './RegisterScreen'
import { authStyles as s } from './authStyles'

type Phase = 'loading' | 'register' | 'login' | 'ready'

// Top-level gate: decides whether to show first-run Register, the Login form,
// or the full application. A fresh app launch always requires a login (the main
// process holds no session until auth:login succeeds).
function AuthGate(): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('loading')
  const [knownUsername, setKnownUsername] = useState<string | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    let cancelled = false

    window.api.auth
      .getState()
      .then((state) => {
        if (cancelled) return
        setKnownUsername(state.username)
        setPhase(state.registered ? 'login' : 'register')
      })
      .catch(() => {
        if (!cancelled) setPhase('login')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleAuthenticated = (nextSession: AuthSession): void => {
    setSession(nextSession)
    setKnownUsername(nextSession.username)
    setPhase('ready')
  }

  const handleLogout = (): void => {
    void window.api.auth.logout().finally(() => {
      setSession(null)
      setPhase('login')
    })
  }

  if (phase === 'loading') {
    return (
      <div style={s.screen}>
        <div style={s.glowOrb1} />
        <div style={s.glowOrb2} />
        <div style={{ textAlign: 'center', color: '#ffffff', zIndex: 1 }}>
          <div style={{ ...s.logoRing, width: '64px', height: '64px', fontSize: '28px', marginBottom: '16px' }}>
            <FiAward />
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
            Jewellery ERP
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Initializing local database engine...
          </p>
          <div style={{ ...s.badge, marginTop: '16px' }}>
            <FiShield size={12} />
            <span>ENCRYPTED LOCAL STORAGE</span>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'register') {
    return <RegisterScreen onRegistered={handleAuthenticated} />
  }

  if (phase === 'login' || !session) {
    return <LoginScreen knownUsername={knownUsername} onLoggedIn={handleAuthenticated} />
  }

  return <App session={session} onLogout={handleLogout} />
}

export default AuthGate

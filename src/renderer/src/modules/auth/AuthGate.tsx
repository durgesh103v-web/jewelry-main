import { useEffect, useState } from 'react'
import { FiAward, FiShield } from 'react-icons/fi'
import App from '../../App'
import LoginScreen from './LoginScreen'
import RegisterScreen from './RegisterScreen'
import ActivationScreen from '../licensing/ActivationScreen'
import { authStyles as s } from './authStyles'

type Phase = 'loading' | 'activate' | 'register' | 'login' | 'ready'

// Top-level gate: manages commercial license activation, first-run user setup,
// authentication gate, and full application launch.
function AuthGate(): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('loading')
  const [knownUsername, setKnownUsername] = useState<string | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [licenseMessage, setLicenseMessage] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    async function initializeSystem(): Promise<void> {
      try {
        // Step 1: Validate offline-first commercial license (Model A)
        const licenseStatus = await window.api.license.getStatus()
        if (cancelled) return

        if (!licenseStatus.isLicensed || licenseStatus.status !== 'ACTIVE') {
          setLicenseMessage(licenseStatus.message || 'Initial product activation required.')
          setPhase('activate')
          return
        }

        // Step 2: Validate local user registration state
        const authState = await window.api.auth.getState()
        if (cancelled) return

        setKnownUsername(authState.username)
        setPhase(authState.registered ? 'login' : 'register')
      } catch {
        if (!cancelled) setPhase('login')
      }
    }

    void initializeSystem()

    return () => {
      cancelled = true
    }
  }, [])

  const handleActivated = (): void => {
    window.api.auth
      .getState()
      .then((state) => {
        setKnownUsername(state.username)
        setPhase(state.registered ? 'login' : 'register')
      })
      .catch(() => {
        setPhase('register')
      })
  }

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
            Validating hardware license and initializing database...
          </p>
          <div style={{ ...s.badge, marginTop: '16px' }}>
            <FiShield size={12} />
            <span>ENCRYPTED LOCAL STORAGE</span>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'activate') {
    return <ActivationScreen onActivated={handleActivated} initialMessage={licenseMessage} />
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

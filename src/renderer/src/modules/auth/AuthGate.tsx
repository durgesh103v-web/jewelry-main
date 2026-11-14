import { useEffect, useState } from 'react'
import { FiAward, FiShield } from 'react-icons/fi'
import App from '../../App'
import LoginScreen from './LoginScreen'
import ProvisionOwnerScreen from './ProvisionOwnerScreen'
import ChangePasswordScreen from './ChangePasswordScreen'
import ActivationScreen from '../licensing/ActivationScreen'
import { authStyles as s } from './authStyles'

type Phase = 'loading' | 'activate' | 'provision' | 'first-change-password' | 'login' | 'ready'

function AuthGate(): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('loading')
  const [knownUsername, setKnownUsername] = useState<string | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [licenseMessage, setLicenseMessage] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    async function initializeSystem(): Promise<void> {
      try {
        // Step 1: Validate offline-first commercial license
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

        if (!authState.registered) {
          // If no local account exists, route to Showroom Owner Provisioning
          setPhase('provision')
        } else {
          setPhase('login')
        }
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
        setPhase(state.registered ? 'login' : 'provision')
      })
      .catch(() => {
        setPhase('provision')
      })
  }

  const handleProvisioned = (nextSession: AuthSession): void => {
    setSession(nextSession)
    setKnownUsername(nextSession.username)
    if (nextSession.isTemporaryPassword) {
      setPhase('first-change-password')
    } else {
      setPhase('ready')
    }
  }

  const handleAuthenticated = (nextSession: AuthSession): void => {
    setSession(nextSession)
    setKnownUsername(nextSession.username)
    if (nextSession.isTemporaryPassword) {
      setPhase('first-change-password')
    } else {
      setPhase('ready')
    }
  }

  const handlePasswordChanged = (): void => {
    if (session) {
      setSession({ ...session, isTemporaryPassword: false })
    }
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

  if (phase === 'provision') {
    return <ProvisionOwnerScreen onProvisioned={handleProvisioned} />
  }

  if (phase === 'first-change-password') {
    return (
      <ChangePasswordScreen
        username={knownUsername || session?.username || 'Owner'}
        onPasswordChanged={handlePasswordChanged}
      />
    )
  }

  if (phase === 'login' || !session) {
    return <LoginScreen knownUsername={knownUsername} onLoggedIn={handleAuthenticated} />
  }

  return <App session={session} onLogout={handleLogout} />
}

export default AuthGate
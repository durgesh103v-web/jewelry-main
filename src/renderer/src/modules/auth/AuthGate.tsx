import { useEffect, useState } from 'react'
import { FiAward, FiShield } from 'react-icons/fi'
import App from '../../App'
import LoginScreen from './LoginScreen'
import ProvisionOwnerScreen from './ProvisionOwnerScreen'
import ChangePasswordScreen from './ChangePasswordScreen'
import ActivationScreen from '../licensing/ActivationScreen'

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
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto bg-[#f8f8f6] px-4 py-8 font-sans text-slate-900 selection:bg-amber-100 selection:text-amber-900">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-orange-100/30 blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-[400px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_12px_45px_rgba(15,23,42,0.07)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 shadow-sm">
              <FiAward className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Jewellery ERP</h2>
            <p className="mt-2 text-xs text-slate-500">Validating hardware license and initializing database...</p>
            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                <FiShield className="h-3 w-3 text-emerald-600" />
                <span>ENCRYPTED LOCAL STORAGE</span>
              </span>
            </div>
          </section>
        </div>
      </main>
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
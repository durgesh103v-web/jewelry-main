import type { CSSProperties } from 'react'

export const authStyles: Record<string, CSSProperties> = {
  screen: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(ellipse at 20% 15%, rgba(245, 158, 11, 0.15) 0%, transparent 45%), radial-gradient(ellipse at 80% 85%, rgba(217, 119, 6, 0.12) 0%, transparent 50%), linear-gradient(145deg, #050811 0%, #0b1120 50%, #111a33 100%)',
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
    padding: '24px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden'
  },
  glowOrb1: {
    position: 'absolute',
    top: '-15%',
    left: '-10%',
    width: '550px',
    height: '550px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0) 70%)',
    filter: 'blur(70px)',
    pointerEvents: 'none'
  },
  glowOrb2: {
    position: 'absolute',
    bottom: '-15%',
    right: '-10%',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(217, 119, 6, 0.18) 0%, rgba(217, 119, 6, 0) 70%)',
    filter: 'blur(80px)',
    pointerEvents: 'none'
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(10, 15, 29, 0.98) 100%)',
    borderRadius: '24px',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    boxShadow:
      '0 30px 70px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(245, 158, 11, 0.15), 0 0 50px rgba(245, 158, 11, 0.12)',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
    backdropFilter: 'blur(24px)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  header: {
    background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0) 100%)',
    color: '#ffffff',
    padding: '32px 32px 20px',
    textAlign: 'center',
    position: 'relative',
    borderBottom: '1px solid rgba(245, 158, 11, 0.15)'
  },
  logoRing: {
    width: '64px',
    height: '64px',
    margin: '0 auto 16px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 25%, #f59e0b 70%, #b45309 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4), 0 0 0 4px rgba(254, 243, 199, 0.15)',
    color: '#451a03',
    fontSize: '28px'
  },
  headerTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 800,
    letterSpacing: '0.6px',
    color: '#ffffff',
    textShadow: '0 2px 8px rgba(0,0,0,0.4)'
  },
  headerSub: {
    margin: '6px 0 0',
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: 400,
    lineHeight: 1.4
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    padding: '4px 12px',
    borderRadius: '20px',
    background: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    color: '#fde68a',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.6px'
  },
  body: {
    padding: '28px 32px 32px'
  },
  field: {
    marginBottom: '20px'
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '7px'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: '#fbbf24',
    fontSize: '16px',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    width: '100%',
    padding: '13px 16px 13px 42px',
    fontSize: '14px',
    color: '#ffffff',
    background: 'rgba(30, 41, 59, 0.65)',
    border: '1.5px solid rgba(148, 163, 184, 0.25)',
    borderRadius: '12px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease'
  },
  inputPassword: {
    paddingRight: '44px'
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    fontSize: '17px',
    transition: 'color 0.15s ease'
  },
  typeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px'
  },
  typeOption: {
    border: '1.5px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '14px',
    padding: '16px 14px',
    cursor: 'pointer',
    textAlign: 'center',
    background: 'rgba(30, 41, 59, 0.5)',
    transition: 'all 0.2s ease',
    userSelect: 'none'
  },
  typeOptionActive: {
    borderColor: '#f59e0b',
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(180, 83, 9, 0.25) 100%)',
    boxShadow: '0 6px 18px rgba(245, 158, 11, 0.25)'
  },
  typeTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginBottom: '5px'
  },
  typeTitleActive: {
    color: '#fbbf24'
  },
  typeHint: {
    margin: 0,
    fontSize: '11px',
    lineHeight: '1.35',
    color: '#94a3b8'
  },
  strengthBarContainer: {
    marginTop: '8px',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
    position: 'relative'
  },
  strengthBar: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease, background-color 0.3s ease'
  },
  strengthText: {
    fontSize: '11px',
    marginTop: '5px',
    display: 'flex',
    justifyContent: 'space-between',
    color: '#94a3b8'
  },
  button: {
    width: '100%',
    padding: '13px 20px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#451a03',
    background: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #d97706 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginTop: '10px',
    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease'
  },
  buttonPrimary: {
    background: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #d97706 100%)',
    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
    color: '#451a03'
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  error: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    lineHeight: '1.4'
  },
  success: {
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    color: '#6ee7b7',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    lineHeight: '1.4'
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    color: '#fbbf24',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0',
    textDecoration: 'none',
    transition: 'color 0.15s ease'
  },
  secondaryButton: {
    width: '100%',
    padding: '11px 18px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#cbd5e1',
    background: 'rgba(51, 65, 85, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRadius: '12px',
    cursor: 'pointer',
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s ease'
  },
  helperCard: {
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '10px',
    padding: '12px 14px',
    marginBottom: '18px',
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.45'
  },
  footNote: {
    marginTop: '22px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  securityBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '20px',
    paddingTop: '18px',
    borderTop: '1px solid rgba(148, 163, 184, 0.15)',
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 500
  }
}

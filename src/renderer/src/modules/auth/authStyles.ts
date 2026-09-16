import type { CSSProperties } from 'react'

export const authStyles: Record<string, CSSProperties> = {
  screen: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at 15% 15%, rgba(217, 119, 6, 0.12) 0%, transparent 45%), radial-gradient(ellipse at 85% 85%, rgba(30, 99, 214, 0.16) 0%, transparent 50%), linear-gradient(145deg, #0b1120 0%, #0f172a 50%, #172554 100%)',
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
    padding: '24px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden'
  },
  glowOrb1: {
    position: 'absolute',
    top: '-10%',
    left: '-5%',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0) 70%)',
    filter: 'blur(50px)',
    pointerEvents: 'none'
  },
  glowOrb2: {
    position: 'absolute',
    bottom: '-10%',
    right: '-5%',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, rgba(59, 130, 246, 0) 70%)',
    filter: 'blur(60px)',
    pointerEvents: 'none'
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    background: 'rgba(255, 255, 255, 0.96)',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(217, 119, 6, 0.2), 0 0 30px rgba(217, 119, 6, 0.08)',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
    backdropFilter: 'blur(16px)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  header: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)',
    color: '#ffffff',
    padding: '28px 28px 24px',
    textAlign: 'center',
    position: 'relative',
    borderBottom: '1px solid rgba(245, 158, 11, 0.25)'
  },
  logoRing: {
    width: '58px',
    height: '58px',
    margin: '0 auto 14px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 30%, #f59e0b 70%, #d97706 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(245, 158, 11, 0.35), 0 0 0 4px rgba(255, 255, 255, 0.12)',
    color: '#78350f',
    fontSize: '24px'
  },
  headerTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    color: '#ffffff',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  headerSub: {
    margin: '6px 0 0',
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: 400
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '10px',
    padding: '3px 10px',
    borderRadius: '20px',
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    color: '#fde68a',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.4px'
  },
  body: {
    padding: '28px 28px 24px'
  },
  field: {
    marginBottom: '18px'
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: '#94a3b8',
    fontSize: '16px',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    width: '100%',
    padding: '11px 14px 11px 38px',
    fontSize: '14px',
    color: '#0f172a',
    background: '#f8fafc',
    border: '1.5px solid #cbd5e1',
    borderRadius: '8px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease'
  },
  inputPassword: {
    paddingRight: '40px'
  },
  eyeButton: {
    position: 'absolute',
    right: '10px',
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    fontSize: '16px',
    transition: 'color 0.15s ease'
  },
  typeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  typeOption: {
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    padding: '14px 12px',
    cursor: 'pointer',
    textAlign: 'center',
    background: '#f8fafc',
    transition: 'all 0.2s ease',
    userSelect: 'none'
  },
  typeOptionActive: {
    borderColor: '#d97706',
    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)'
  },
  typeTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginBottom: '4px'
  },
  typeTitleActive: {
    color: '#92400e'
  },
  typeHint: {
    margin: 0,
    fontSize: '11px',
    lineHeight: '1.3',
    color: '#64748b'
  },
  strengthBarContainer: {
    marginTop: '6px',
    height: '4px',
    background: '#e2e8f0',
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
    marginTop: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    color: '#64748b'
  },
  button: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#ffffff',
    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '8px',
    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.18s ease'
  },
  buttonPrimary: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '11px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    lineHeight: '1.4'
  },
  success: {
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    padding: '11px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    lineHeight: '1.4'
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0',
    textDecoration: 'none',
    transition: 'color 0.15s ease'
  },
  secondaryButton: {
    width: '100%',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#475569',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.18s ease'
  },
  helperCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '16px',
    fontSize: '12px',
    color: '#475569',
    lineHeight: '1.4'
  },
  footNote: {
    marginTop: '20px',
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
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 500
  }
}


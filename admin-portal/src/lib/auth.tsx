'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { adminApi, ApiError } from '@/lib/api'
import { AdminUser } from '@/types'

interface AuthContextType {
  admin: AdminUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (identifier: string, pass: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminApi.getMe()
      if (res.success && res.admin) {
        setAdmin(res.admin)
      } else {
        setAdmin(null)
      }
    } catch {
      setAdmin(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Route protection
  useEffect(() => {
    if (!loading) {
      const isLoginPage = pathname === '/login'
      if (!admin && !isLoginPage) {
        router.replace('/login')
      } else if (admin && isLoginPage) {
        router.replace('/dashboard')
      }
    }
  }, [admin, loading, pathname, router])

  const login = async (identifier: string, pass: string) => {
    const res = await adminApi.login(identifier, pass)
    if (res.success && res.admin) {
      setAdmin(res.admin)
      router.push('/dashboard')
    }
  }

  const logout = async () => {
    try {
      await adminApi.logout()
    } finally {
      setAdmin(null)
      router.push('/login')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        admin,
        loading,
        isAuthenticated: Boolean(admin),
        login,
        logout,
        refresh
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

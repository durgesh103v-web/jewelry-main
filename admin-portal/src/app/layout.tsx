import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Jewellery ERP — Super Admin Portal',
  description: 'Commercial Licensing, Customer Provisioning & Management Portal'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-amber-100 selection:text-amber-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

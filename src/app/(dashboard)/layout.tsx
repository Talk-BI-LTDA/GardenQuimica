// src/app/(dashboard)/layout.tsx
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'

import { Sidebar } from '@/components/dashboard/sidebar'
import { auth } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
      <Toaster position="top-right" />
    </div>
  )
}
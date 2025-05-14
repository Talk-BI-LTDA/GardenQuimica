// app/(dashboard)/clientes/page.tsx
export const dynamic = 'force-dynamic';

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { auth } from '@/lib/auth'
import ClientesComponent from '@/components/ClientesComponent'
import { redirect } from 'next/navigation'

export default async function ClientesPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#00446A] mb-4" />
          <p className="text-lg font-medium">Carregando dados dos clientes...</p>
        </div>
      </div>
    }>
      <ClientesComponent session={session} />
    </Suspense>
  )
}
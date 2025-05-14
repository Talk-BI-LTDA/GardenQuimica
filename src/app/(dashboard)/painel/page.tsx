// src/app/(dashboard)/painel/page.tsx
export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import EnhancedDashboard from './dashboard-component';

export default async function PainelPage() {
  // Verificar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }
  
  // Verificar se é admin
  if (session.user.role !== 'ADMIN') {
    redirect('/vendas'); // Redireciona para uma página permitida para não-admins
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#00446A] mb-4" />
          <p className="text-lg font-medium">Carregando dados do painel...</p>
        </div>
      </div>
    }>
      <EnhancedDashboard />
    </Suspense>
  );
}
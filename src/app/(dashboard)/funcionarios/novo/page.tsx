// src/app/(dashboard)/funcionarios/novo/page.tsx
export const dynamic = 'force-dynamic';

import { UsuarioForm } from '@/components/forms/usuario-form'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function NovoFuncionarioPage() {
  const session = await auth();
  
  // Verificamos se session existe E se o usuário é admin
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/painel');
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Funcionário</h1>
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <UsuarioForm />
      </div>
    </div>
  )
}
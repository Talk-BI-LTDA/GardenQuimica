// src/app/(dashboard)/funcionarios/[id]/editar/page.tsx
export const dynamic = 'force-dynamic';

import { UsuarioEditForm } from '@/components/forms/usuario-edit-form'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUsuarioS } from '@/actions/usuario-actions'
import { UsuarioEditProps } from '@/validations/usuario-schema'

interface EditarFuncionarioPageProps {
  params: {
    id: string
  }
}

export default async function EditarFuncionarioPage(props: EditarFuncionarioPageProps) {
  const session = await auth();
  
  // Verificamos se session existe E se o usuário é admin
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/painel');
  }
  
  // Use props.params.id diretamente, sem desestruturar
  const id = props.params.id;
  const result = await getUsuarioS(id);
  
  // Se usuário não for encontrado, redirecionar
  if (!result.success || !result.usuario) {
    redirect('/funcionarios');
  }
  
  // Preparar dados para o formulário
  const usuarioData: UsuarioEditProps = {
    id: result.usuario.id,
    nome: result.usuario.nome,
    email: result.usuario.email,
    cpf: result.usuario.cpf,
    role: result.usuario.role,
    regiao: result.usuario.regiao
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar Funcionário</h1>
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <UsuarioEditForm usuario={usuarioData} />
      </div>
    </div>
  )
}
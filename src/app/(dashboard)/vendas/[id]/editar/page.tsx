// src/app/(dashboard)/vendas/[id]/editar/page.tsx
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VendaUnificadaFormTipado } from '@/components/forms/venda-unificada-form';
import { prisma } from '@/lib/supabase/prisma';
import { auth } from '@/lib/auth';
import { Venda } from '@/types/venda';

// Updated type definition to match Next.js expectations
type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function EditarVendaPage(props: Props) {
  const { params } = props;
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  try {
    // Buscar a venda
    const venda = await prisma.venda.findUnique({
      where: {
        id: params.id,
      },
      include: {
        cliente: true,
        produtos: {
          include: {
            produto: true,
          }
        },
      },
    });

    if (!venda) {
      redirect('/vendas');
    }

    // Verificar permissões
    if (session.user.role !== 'ADMIN' && venda.vendedorId !== session.user.id) {
      redirect('/vendas');
    }

    // Converter dados para o formato do formulário
    const vendaData: Venda = {
      id: venda.id,
      codigoVenda: venda.codigoVenda,
      cliente: {
        id: venda.cliente.id,
        nome: venda.cliente.nome,
        segmento: venda.cliente.segmento,
        cnpj: venda.cliente.cnpj,
        razaoSocial: venda.cliente.razaoSocial || undefined,
      },
      produtos: venda.produtos.map(item => ({
        id: item.produto.id,
        nome: item.produto.nome,
        medida: item.medida,
        quantidade: item.quantidade,
        valor: item.valor,
        recorrencia: item.recorrencia || undefined,
      })),
      valorTotal: venda.valorTotal,
      condicaoPagamento: venda.condicaoPagamento,
      vendaRecorrente: venda.vendaRecorrente,
      nomeRecorrencia: venda.nomeRecorrencia || undefined,
      vendedorId: venda.vendedorId,
      vendedorNome: session.user.name,
      createdAt: venda.createdAt,
      updatedAt: venda.updatedAt,
      editedById: venda.editedById || undefined,
    };

    return (
      <div className="p-6">
        <div className="mb-8">
          <Link href="/vendas">
            <Button variant="ghost" className="flex items-center gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>

          <h1 className="text-2xl font-bold">Editar Venda</h1>
          <p className="text-gray-500">Edite os detalhes da venda abaixo.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <VendaUnificadaFormTipado
            initialData={vendaData}
            initialMode="venda"
            isEditing={true}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Erro ao carregar venda:', error);
    redirect('/vendas');
  }
}
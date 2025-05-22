// src/app/(dashboard)/vendas/[id]/editar/page.tsx
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VendaUnificadaFormTipado } from '@/components/forms/venda-unificada-form';
import { prisma } from '@/lib/supabase/prisma';
import { auth } from '@/lib/auth';
import { StatusCotacao, Cotacao } from '@/types/cotacao-tipos';
import { VendaFormData } from '@/types/venda';

// Tipos para os diferentes modos de edição
type ModoEdicao = 'pendente' | 'finalizada' | 'cancelada';

// Tipo para item de produto de não venda do Prisma
interface NaoVendaProdutoItem {
  id: string;
  quantidade: number;
  valor: number;
  medida: string;
  valorConcorrencia?: number | null;
  nomeConcorrencia?: string | null;
  icms?: number | null;
  objecao?: string | null;
  infoNaoDisponivel?: boolean | null;
  ipi?: number | null;
  produto: {
    id: string;
    nome: string;
    comissao?: number | null;
    icms?: number | null;
    ipi?: number | null;
  };
}

// Definir o tipo NaoVendaFormData para garantir compatibilidade
interface NaoVendaFormData {
  id?: string;
  codigoVenda: string;
  cliente: {
    id: string;
    nome: string;
    segmento: string;
    cnpj: string;
    razaoSocial?: string;
  };
  produtosConcorrencia: Array<{
    id?: string;
    produtoGarden: {
      id: string;
      nome: string;
      medida: string;
      quantidade: number;
      valor: number;
      comissao?: number;
      icms?: number;
      ipi?: number;
    };
    valorConcorrencia: number;
    nomeConcorrencia: string;
    icms?: number;
    ipi?: number;
    objecao?: string;
    infoNaoDisponivel?: boolean;
  }>;
  valorTotal: number;
  condicaoPagamento: string;
  objecaoGeral?: string;
  vendedorId: string;
  vendedorNome: string;
  createdAt: Date;
  updatedAt: Date;
  editedById?: string;
}

// Tipo de dados do componente
type DadosFormularioComponente = 
  | (Cotacao & { id?: string; status?: StatusCotacao })
  | (VendaFormData & { id?: string; status?: StatusCotacao })
  | (NaoVendaFormData & { id?: string; status?: StatusCotacao });

// Tipo para os parâmetros da página
type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function EditarCotacaoPage(props: Props) {
  const { params, searchParams } = props;
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Determinar o modo de edição baseado nos searchParams
  const modo = (searchParams.modo as ModoEdicao) || 'pendente';
  
  // Validar modo
  if (!['pendente', 'finalizada', 'cancelada'].includes(modo)) {
    redirect('/vendas');
  }

  try {
    let cotacaoData: DadosFormularioComponente | null = null;

    // Buscar dados baseado no modo
    switch (modo) {
      case 'pendente': {
        // Buscar cotação pendente
        const cotacao = await prisma.cotacao.findUnique({
          where: { id: params.id },
          include: {
            cliente: true,
            produtos: { include: { produto: true } },
            vendedor: true,
          },
        });

        if (!cotacao) redirect('/vendas');

        // Verificar permissões
        if (session.user.role !== 'ADMIN' && cotacao.vendedorId !== session.user.id) {
          redirect('/vendas');
        }

        cotacaoData = {
          id: cotacao.id,
          status: cotacao.status as StatusCotacao,
          codigoCotacao: cotacao.codigoCotacao,
          cliente: {
            id: cotacao.cliente.id,
            nome: cotacao.cliente.nome,
            segmento: cotacao.cliente.segmento,
            cnpj: cotacao.cliente.cnpj,
            razaoSocial: cotacao.cliente.razaoSocial || undefined,
          },
          produtos: cotacao.produtos.map(item => ({
            id: item.produto.id,
            nome: item.produto.nome,
            medida: item.medida,
            quantidade: item.quantidade,
            valor: item.valor,
            comissao: item.comissao || 0,
            icms: item.icms || 0,
            ipi: item.ipi || 0,
          })),
          valorTotal: cotacao.valorTotal,
          condicaoPagamento: cotacao.condicaoPagamento,
          vendaRecorrente: cotacao.vendaRecorrente,
          nomeRecorrencia: cotacao.nomeRecorrencia || undefined,
          vendedorId: cotacao.vendedorId,
          vendedorNome: cotacao.vendedor?.name || session.user.name || 'Vendedor não identificado',
          createdAt: cotacao.createdAt,
          updatedAt: cotacao.updatedAt,
          editedById: cotacao.editedById || undefined,
        } as Cotacao & { id: string; status: StatusCotacao };

        break;
      }

      case 'finalizada': {
        // Buscar venda (cotação finalizada)
        const venda = await prisma.venda.findUnique({
          where: { id: params.id },
          include: {
            cliente: true,
            produtos: { include: { produto: true } },
            vendedor: true,
          },
        });

        if (!venda) redirect('/vendas');

        // Verificar permissões
        if (session.user.role !== 'ADMIN' && venda.vendedorId !== session.user.id) {
          redirect('/vendas');
        }

        cotacaoData = {
          id: venda.id,
          status: 'finalizada' as StatusCotacao,
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
            comissao: item.comissao || 0,
            icms: item.icms || 0,
            ipi: item.ipi || 0,
          })),
          valorTotal: venda.valorTotal,
          condicaoPagamento: venda.condicaoPagamento,
          vendaRecorrente: venda.vendaRecorrente,
          nomeRecorrencia: venda.nomeRecorrencia || undefined,
          vendedorId: venda.vendedorId,
          vendedorNome: venda.vendedor?.name || session.user.name || 'Vendedor não identificado',
          createdAt: venda.createdAt,
          updatedAt: venda.updatedAt,
          editedById: venda.editedById || undefined,
        } as VendaFormData & { id: string; status: StatusCotacao };

        break;
      }

      case 'cancelada': {
        // Buscar não venda (cotação cancelada)
        const naoVenda = await prisma.naoVenda.findUnique({
          where: { id: params.id },
          include: {
            cliente: true,
            produtos: { include: { produto: true } },
            vendedor: true,
          },
        });

        if (!naoVenda) redirect('/vendas');

        // Verificar permissões
        if (session.user.role !== 'ADMIN' && naoVenda.vendedorId !== session.user.id) {
          redirect('/vendas');
        }

        cotacaoData = {
          id: naoVenda.id,
          status: 'cancelada' as StatusCotacao,
          codigoVenda: naoVenda.codigoVenda,
          cliente: {
            id: naoVenda.cliente.id,
            nome: naoVenda.cliente.nome,
            segmento: naoVenda.cliente.segmento,
            cnpj: naoVenda.cliente.cnpj,
            razaoSocial: naoVenda.cliente.razaoSocial || undefined,
          },
          produtosConcorrencia: naoVenda.produtos.map((item: NaoVendaProdutoItem) => ({
            id: item.id,
            produtoGarden: {
              id: item.produto.id,
              nome: item.produto.nome,
              medida: item.medida,
              quantidade: item.quantidade,
              valor: item.valor,
              comissao: item.produto.comissao || 0,
              icms: item.produto.icms || 0,
              ipi: item.produto.ipi || 0,
            },
            valorConcorrencia: item.valorConcorrencia || 0,
            nomeConcorrencia: item.nomeConcorrencia || '',
            icms: item.icms || undefined, // Converte null para undefined
            ipi: item.ipi || undefined,   // Converte null para undefined
            objecao: item.objecao || undefined,
            infoNaoDisponivel: item.infoNaoDisponivel || false,
          })),
          valorTotal: naoVenda.valorTotal,
          condicaoPagamento: naoVenda.condicaoPagamento,
          objecaoGeral: naoVenda.objecaoGeral || undefined,
          vendedorId: naoVenda.vendedorId,
          vendedorNome: naoVenda.vendedor?.name || session.user.name || 'Vendedor não identificado',
          createdAt: naoVenda.createdAt,
          updatedAt: naoVenda.updatedAt,
          editedById: naoVenda.editedById || undefined,
        } as NaoVendaFormData & { id: string; status: StatusCotacao };

        break;
      }

      default:
        redirect('/vendas');
    }

    if (!cotacaoData) {
      redirect('/vendas');
    }

    // Determinar modo inicial do formulário e título
    const modoFormulario = modo === 'cancelada' ? 'naoVenda' : 'venda';
    const titulo = modo === 'pendente' 
      ? 'Editar Cotação' 
      : modo === 'finalizada' 
        ? 'Editar Cotação Finalizada' 
        : 'Editar Cotação Cancelada';

    return (
      <div className="p-6">
        <div className="mb-8">
          <Link href="/vendas">
            <Button variant="ghost" className="flex items-center gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Cotações
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{titulo}</h1>
              <p className="text-gray-500">
                {modo === 'pendente' && 'Edite os detalhes da cotação ou altere seu status.'}
                {modo === 'finalizada' && 'Edite os detalhes da cotação finalizada.'}
                {modo === 'cancelada' && 'Edite os detalhes da cotação cancelada.'}
              </p>
            </div>
            
            {/* Badge de status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                cotacaoData.status === 'pendente' 
                  ? 'bg-blue-100 text-blue-800' 
                  : cotacaoData.status === 'finalizada'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
              }`}>
                {cotacaoData.status === 'pendente' ? 'Pendente' : 
                 cotacaoData.status === 'finalizada' ? 'Finalizada' : 'Cancelada'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <VendaUnificadaFormTipado
            initialData={cotacaoData}
            initialMode={modoFormulario as 'venda' | 'naoVenda'}
            isEditing={true}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Erro ao carregar dados para edição:', error);
    
    // Log mais detalhado do erro
    if (error instanceof Error) {
      console.error('Mensagem do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    // Redirecionar para a página de vendas em caso de erro
    redirect('/vendas');
  }
}
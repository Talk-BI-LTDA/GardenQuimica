// src/app/(dashboard)/vendas/page.tsx
export const dynamic = 'force-dynamic';

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { redirect } from 'next/navigation'

import { VendasTableAjustada } from '@/components/dashboard/vendas-table-ajustada'
import { getVendas } from '@/actions/venda-actions'
import { getNaoVendas } from '@/actions/nao-venda-actions'
import { auth } from '@/lib/auth'
import { NaoVenda } from '@/types/nao-venda'
import { Venda } from '@/types/venda'

async function VendasTableWrapper() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }
  
  const isAdmin = session.user.role === 'ADMIN';
  
  // Carregar dados
  const vendasResult = await getVendas();
  const naoVendasResult = await getNaoVendas();
  
  // Preparar dados para estatísticas
  const vendas = vendasResult.success ? vendasResult.vendas as Venda[] : [];
  
  // Corrigir tipos para evitar incompatibilidade entre null e undefined
  const naoVendas = naoVendasResult.success 
    ? naoVendasResult.naoVendas.map(item => ({
        ...item,
        objecaoGeral: item.objecaoGeral || null,
        produtosConcorrencia: item.produtosConcorrencia.map(produto => ({
          ...produto,
          icms: produto.icms || null,
          objecao: produto.objecao || null
        }))
      })) as NaoVenda[]
    : [];
  
  const estatisticas = {
    totalOrcamentos: vendas.length + naoVendas.length,
    totalVendas: vendas.length,
    totalNaoVendas: naoVendas.length,
    valorTotalVendas: vendas.reduce((total, venda) => total + venda.valorTotal, 0),
    valorTotalNaoVendas: naoVendas.reduce((total, naoVenda) => total + naoVenda.valorTotal, 0)
  };
  
  return (
    <VendasTableAjustada
      initialVendas={vendas}
      initialNaoVendas={naoVendas}
      initialEstatisticas={estatisticas}
      isAdmin={isAdmin}
    />
  );
}

export default function VendasPage() {
  return (
    <div className="p-6">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }>
        <VendasTableWrapper />
      </Suspense>
    </div>
  );
}
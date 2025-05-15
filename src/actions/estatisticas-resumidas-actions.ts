// src/actions/estatisticas-resumidas-actions.ts
'use server'

import { prisma } from '@/lib/supabase/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FiltrosBase } from '@/types/filtros';
import { format, subDays } from 'date-fns';
import { revalidatePath } from 'next/cache';

// Definição dos tipos
export interface ChartDataPoint {
  date: string;
  vendas: number;
  naoVendas: number;
}

export interface EstatisticasPainelResponse {
  success: boolean;
  estatisticas?: EstatisticasPainel;
  error?: string;
}

export type VendedorEstatistica = {
  id: string;
  nome: string;
  email: string;
  regiao?: string; // Campo de região
  quantidadeVendas: number;
  quantidadeNaoVendas: number;
  valorTotalVendas: number;
  taxaSucesso: number;
  ultimaVenda: Date;
  mediaMensal: number;
  quantidadeClientes: number;
  clientesRecorrentes: number;
};
export interface EstatisticasPainel extends EstatisticasResumidas {
  chartData?: ChartDataPoint[];
  produtoMaisVendido?: {
    id: string;
    nome: string;
    medida: string;
    valorMedio: number;
    presenteEmVendas: number;
    valorTotal: number;
  };
  vendedorMaisVendas?: {
    id: string;
    nome: string;
    email: string;
    valorTotalVendas: number;
    quantidadeVendas: number;
    ultimaVenda: Date;
  };
  maiorVenda?: {
    codigoVenda: string;
    valorTotal: number;
    data: Date;
    vendedorNome: string;
    clienteNome: string;
  };
  funcionarios?: {
    total: number;
    vendedores: number;
    administradores: number;
  };
  totalClientes?: number;
  clientesRecorrentes?: number;
  clientesNaoRecorrentes?: number;
  produtos?: Array<{
    id: string;
    nome: string;
    medida: string;
    valorMedio: number;
    presenteEmVendas: number;
    valorTotal: number;
    quantidadeMedia: number;
  }>;
  vendedores?: Array<{
    id: string;
    nome: string;
    email: string;
    quantidadeVendas: number;
    quantidadeNaoVendas: number;
    valorTotalVendas: number;
    taxaSucesso: number;
    ultimaVenda: Date;
    quantidadeClientes: number;
    clientesRecorrentes: number;
    mediaMensal: number;
  }>;
  clientes?: Array<{
    id: string;
    nome: string;
    cnpj: string;
    segmento: string;
    quantidadeVendas: number;
    valorTotal: number;
    valorMedio: number;
    maiorValor: number;
    ultimaCompra: Date;
    produtoMaisComprado?: string;
    ehRecorrente: boolean;
  }>;
}

export interface EstatisticasResumidasVendas {
  totalVendas: number;
  valorTotalVendas: number;
}

export interface EstatisticasResumidasNaoVendas {
  totalNaoVendas: number;
  valorTotalNaoVendas: number;
}

export interface EstatisticasResumidas extends EstatisticasResumidasVendas, EstatisticasResumidasNaoVendas {
  totalOrcamentos: number;
}

export interface EstatisticasPainelParams extends FiltrosBase {
  vendedorId?: string;
  produtoId?: string;
  searchTerm?: string;
  searchVendedores?: string;
  searchProdutos?: string;
  searchClientes?: string;
  regiao?: string; 
}
export type RegiaoEstatistica = {
  nome: string;
  vendas: number;
  valorTotal: number;
  valorMedio: number;
  vendedores: number;
};
// Função para executar com retry otimizada
async function executeWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const errorMessage = String(error);
    if (retries > 0 && (
      errorMessage.includes("prepared statement") || 
      errorMessage.includes("invalid buffer size") ||
      errorMessage.includes("does not exist")
    )) {
      console.log("Detectado erro de conexão com o banco, reconectando...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return executeWithRetry(fn, retries - 1);
    }
    throw error;
  }
}

// Função principal para buscar estatísticas do painel
export async function getEstatisticasPainel(filtros?: EstatisticasPainelParams): Promise<EstatisticasPainelResponse> {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    const estatisticas: EstatisticasPainel = {
      totalVendas: 0,
      valorTotalVendas: 0,
      totalNaoVendas: 0,
      valorTotalNaoVendas: 0,
      totalOrcamentos: 0,
      chartData: [],
      funcionarios: {
        total: 0,
        vendedores: 0,
        administradores: 0
      },
      produtos: [],
      vendedores: [],
      clientes: [],
    };

    const where: Record<string, unknown> = {};
    
    if (session.user.role !== 'ADMIN') {
      where.vendedorId = session.user.id;
    } else if (filtros?.vendedorId) {
      where.vendedorId = filtros.vendedorId;
    }
    
    if (filtros?.dataInicio && filtros?.dataFim) {
      where.createdAt = {
        gte: new Date(filtros.dataInicio),
        lte: new Date(filtros.dataFim)
      };
    }

    // Consultas paralelas para dados básicos
    const [
      totalVendas,
      vendasAggregate,
      totalNaoVendas,
      naoVendasAggregate,
      totalFuncionarios,
      totalVendedores,
      totalAdmins
    ] = await Promise.all([
      executeWithRetry(() => prisma.venda.count({ where })),
      executeWithRetry(() => prisma.venda.aggregate({ where, _sum: { valorTotal: true } })),
      executeWithRetry(() => prisma.naoVenda.count({ where })),
      executeWithRetry(() => prisma.naoVenda.aggregate({ where, _sum: { valorTotal: true } })),
      executeWithRetry(() => prisma.user.count()),
      executeWithRetry(() => prisma.user.count({ where: { role: 'VENDEDOR' } })),
      executeWithRetry(() => prisma.user.count({ where: { role: 'ADMIN' } }))
    ]);
    
    estatisticas.totalVendas = totalVendas;
    estatisticas.valorTotalVendas = vendasAggregate._sum.valorTotal || 0;
    estatisticas.totalNaoVendas = totalNaoVendas;
    estatisticas.valorTotalNaoVendas = naoVendasAggregate._sum.valorTotal || 0;
    estatisticas.totalOrcamentos = totalVendas + totalNaoVendas;
    
    estatisticas.funcionarios = {
      total: totalFuncionarios,
      vendedores: totalVendedores,
      administradores: totalAdmins
    };

    // Consultas paralelas para vendedores, produtos e maior venda
    const whereVendas = { ...where };
    
    const [vendedoresComVendas, produtosMaisVendidos, maiorVenda] = await Promise.all([
      executeWithRetry(() => 
        prisma.user.findMany({
          where: { role: 'VENDEDOR' },
          select: {
            id: true,
            name: true,
            email: true,
            vendas: {
              where: whereVendas,
              select: {
                id: true,
                valorTotal: true,
                createdAt: true
              }
            }
          }
        })
      ),
      executeWithRetry(() => 
        prisma.vendaProduto.groupBy({
          by: ['produtoId'],
          where,
          _count: {
            produtoId: true
          },
          _sum: {
            valor: true
          },
          orderBy: {
            _count: {
              produtoId: 'desc'
            }
          },
          take: 10
        })
      ),
      executeWithRetry(() => 
        prisma.venda.findFirst({
          where,
          orderBy: { valorTotal: 'desc' },
          select: {
            id: true,
            codigoVenda: true,
            valorTotal: true,
            createdAt: true,
            vendedor: { select: { name: true } },
            cliente: { select: { nome: true } }
          },
          take: 1
        })
      )
    ]);
    
    // Processar vendedores
    const vendedoresComEstat = vendedoresComVendas.map(vendedor => {
      const quantidadeVendas = vendedor.vendas.length;
      const valorTotalVendas = vendedor.vendas.reduce((total, venda) => total + venda.valorTotal, 0);
      
      let ultimaVenda = new Date(0);
      for (const venda of vendedor.vendas) {
        if (venda.createdAt > ultimaVenda) {
          ultimaVenda = venda.createdAt;
        }
      }
      
      return {
        id: vendedor.id,
        nome: vendedor.name || '',
        email: vendedor.email || '',
        quantidadeVendas,
        valorTotalVendas,
        ultimaVenda: vendedor.vendas.length > 0 ? ultimaVenda : new Date()
      };
    });
    
    vendedoresComEstat.sort((a, b) => b.valorTotalVendas - a.valorTotalVendas);
    
    if (vendedoresComEstat.length > 0) {
      estatisticas.vendedorMaisVendas = vendedoresComEstat[0];
    }
    
    // Processar produtos
    if (produtosMaisVendidos.length > 0) {
      const produtosIds = produtosMaisVendidos.map(p => p.produtoId);
      
      const detalhesProdutos = await executeWithRetry(() => 
        prisma.produto.findMany({
          where: { id: { in: produtosIds } },
          select: {
            id: true,
            nome: true,
            medida: true,
            valor: true
          }
        })
      );
      
      const produtosProcessados = produtosMaisVendidos
        .map(produto => {
          const detalhe = detalhesProdutos.find(p => p.id === produto.produtoId);
          if (!detalhe) return null;
          
          return {
            id: detalhe.id,
            nome: detalhe.nome || '',
            medida: detalhe.medida || '',
            valorMedio: detalhe.valor || 0,
            presenteEmVendas: produto._count.produtoId,
            valorTotal: produto._sum.valor || 0,
            quantidadeMedia: 0 // Adicionado para compatibilidade com a interface
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .sort((a, b) => b.presenteEmVendas - a.presenteEmVendas);
      
      if (produtosProcessados.length > 0) {
        estatisticas.produtoMaisVendido = {
          id: produtosProcessados[0].id,
          nome: produtosProcessados[0].nome,
          medida: produtosProcessados[0].medida,
          valorMedio: produtosProcessados[0].valorMedio,
          presenteEmVendas: produtosProcessados[0].presenteEmVendas,
          valorTotal: produtosProcessados[0].valorTotal
        };
        estatisticas.produtos = produtosProcessados;
      }
    }
    
    // Processar maior venda
    if (maiorVenda) {
      estatisticas.maiorVenda = {
        codigoVenda: maiorVenda.codigoVenda || '',
        valorTotal: maiorVenda.valorTotal || 0,
        data: maiorVenda.createdAt,
        vendedorNome: maiorVenda.vendedor?.name || '',
        clienteNome: maiorVenda.cliente?.nome || ''
      };
    }

    // Consultas paralelas para vendedores detalhados e clientes
    const [vendedoresDetalhados, clientesInfo] = await Promise.all([
      executeWithRetry(() => {
        const whereVendedores: Record<string, unknown> = { role: 'VENDEDOR' };
        
        if (filtros?.searchVendedores) {
          whereVendedores.OR = [
            { name: { contains: filtros.searchVendedores, mode: 'insensitive' } },
            { email: { contains: filtros.searchVendedores, mode: 'insensitive' } }
          ];
        }
        
        return prisma.user.findMany({
          where: whereVendedores,
          select: {
            id: true,
            name: true,
            email: true,
            vendas: {
              where,
              select: { 
                id: true, 
                valorTotal: true, 
                createdAt: true, 
                clienteId: true 
              }
            },
            naoVendas: {
              where,
              select: { id: true }
            }
          },
          take: 50
        });
      }),
      executeWithRetry(() => 
        prisma.cliente.count()
      ).then(async (totalClientes) => {
        const clientesComVendas = await executeWithRetry(() => 
          prisma.cliente.findMany({
            select: {
              id: true,
              _count: {
                select: { vendas: true }
              }
            }
          })
        );
        
        const clientesRecorrentes = clientesComVendas.filter(c => c._count.vendas > 1).length;
        
        return {
          totalClientes,
          clientesRecorrentes,
          clientesNaoRecorrentes: totalClientes - clientesRecorrentes
        };
      })
    ]);
    
    estatisticas.totalClientes = clientesInfo.totalClientes;
    estatisticas.clientesRecorrentes = clientesInfo.clientesRecorrentes;
    estatisticas.clientesNaoRecorrentes = clientesInfo.clientesNaoRecorrentes;
    
    // Processar vendedores detalhados
    estatisticas.vendedores = vendedoresDetalhados.map(vendedor => {
      const quantidadeVendas = vendedor.vendas.length;
      const quantidadeNaoVendas = vendedor.naoVendas.length;
      const valorTotalVendas = vendedor.vendas.reduce((sum, venda) => sum + venda.valorTotal, 0);
      
      const totalOrcamentos = quantidadeVendas + quantidadeNaoVendas;
      const taxaSucesso = totalOrcamentos > 0 ? (quantidadeVendas / totalOrcamentos) * 100 : 0;
      
      let ultimaVenda = new Date(0);
      const clientesContagem: Record<string, number> = {};
      
      for (const venda of vendedor.vendas) {
        if (venda.createdAt > ultimaVenda) {
          ultimaVenda = venda.createdAt;
        }
        
        clientesContagem[venda.clienteId] = (clientesContagem[venda.clienteId] || 0) + 1;
      }
      
      const clientesUnicos = Object.keys(clientesContagem).length;
      const clientesRecorrentes = Object.values(clientesContagem).filter(count => count > 1).length;
      const mediaMensal = Math.max(1, Math.ceil(quantidadeVendas / 6));
      
      return {
        id: vendedor.id,
        nome: vendedor.name || '',
        email: vendedor.email || '',
        quantidadeVendas,
        quantidadeNaoVendas,
        valorTotalVendas,
        taxaSucesso,
        ultimaVenda: vendedor.vendas.length > 0 ? ultimaVenda : new Date(),
        quantidadeClientes: clientesUnicos,
        clientesRecorrentes,
        mediaMensal
      };
    }).sort((a, b) => b.valorTotalVendas - a.valorTotalVendas);

    // Dados do gráfico otimizados
    try {
      const hoje = new Date();
      const dataInicio = subDays(hoje, 29);
      
      const [vendasPeriodo, naoVendasPeriodo] = await Promise.all([
        executeWithRetry(() => 
          prisma.venda.findMany({
            where: {
              ...where,
              createdAt: {
                gte: dataInicio,
                lte: hoje
              }
            },
            select: {
              valorTotal: true,
              createdAt: true
            }
          })
        ),
        executeWithRetry(() => 
          prisma.naoVenda.findMany({
            where: {
              ...where,
              createdAt: {
                gte: dataInicio,
                lte: hoje
              }
            },
            select: {
              valorTotal: true,
              createdAt: true
            }
          })
        )
      ]);
      
      const dadosPorDia = new Map<string, { vendas: number, naoVendas: number }>();
      
      for (let i = 0; i <= 29; i++) {
        const data = subDays(hoje, i);
        const dataFormatada = format(data, 'yyyy-MM-dd');
        dadosPorDia.set(dataFormatada, { vendas: 0, naoVendas: 0 });
      }
      
      vendasPeriodo.forEach(venda => {
        const dataFormatada = format(venda.createdAt, 'yyyy-MM-dd');
        const dadosDia = dadosPorDia.get(dataFormatada);
        
        if (dadosDia) {
          dadosDia.vendas += venda.valorTotal;
        }
      });
      
      naoVendasPeriodo.forEach(naoVenda => {
        const dataFormatada = format(naoVenda.createdAt, 'yyyy-MM-dd');
        const dadosDia = dadosPorDia.get(dataFormatada);
        
        if (dadosDia) {
          dadosDia.naoVendas += naoVenda.valorTotal;
        }
      });
      
      estatisticas.chartData = Array.from(dadosPorDia.entries())
        .map(([date, dados]) => ({
          date,
          vendas: dados.vendas,
          naoVendas: dados.naoVendas
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Erro ao gerar dados do gráfico:', error);
      estatisticas.chartData = [];
    }

    revalidatePath('/painel');
    
    return { success: true, estatisticas };
  } catch (error) {
    console.error('Erro geral ao buscar estatísticas do painel:', error);
    return { 
      success: false, 
      error: 'Ocorreu um erro ao buscar as estatísticas do painel' 
    };
  }
}

// Funções para estatísticas resumidas (mantidas as otimizações originais)
export async function getEstatisticasResumidas(filtros?: FiltrosBase): Promise<{ 
  success: boolean; 
  estatisticas?: EstatisticasResumidas;
  error?: string;
}> {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    const where: Record<string, unknown> = {}; 
    
    if (session.user.role !== 'ADMIN') {
      where.vendedorId = session.user.id;
    }
    
    if (filtros?.dataInicio && filtros?.dataFim) {
      where.createdAt = {
        gte: new Date(filtros.dataInicio),
        lte: new Date(filtros.dataFim)
      };
    }

    const [totalVendas, valorVendasResult, totalNaoVendas, valorNaoVendasResult] = await Promise.all([
      executeWithRetry(() => prisma.venda.count({ where })),
      executeWithRetry(() => prisma.venda.aggregate({ where, _sum: { valorTotal: true } })),
      executeWithRetry(() => prisma.naoVenda.count({ where })),
      executeWithRetry(() => prisma.naoVenda.aggregate({ where, _sum: { valorTotal: true } }))
    ]);
    
    const estatisticas: EstatisticasResumidas = {
      totalVendas,
      valorTotalVendas: valorVendasResult._sum.valorTotal || 0,
      totalNaoVendas,
      valorTotalNaoVendas: valorNaoVendasResult._sum.valorTotal || 0,
      totalOrcamentos: totalVendas + totalNaoVendas
    };

    revalidatePath('/painel');
    return { success: true, estatisticas };
  } catch (error) {
    console.error('Erro ao buscar estatísticas resumidas:', error);
    return { success: false, error: 'Ocorreu um erro ao buscar as estatísticas' };
  }
}

export async function getEstatisticasResumidasVendas(filtros?: FiltrosBase): Promise<{ 
  success: boolean; 
  estatisticas?: EstatisticasResumidasVendas;
  error?: string;
}> {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    const where: Record<string, unknown> = {}; 
    
    if (session.user.role !== 'ADMIN') {
      where.vendedorId = session.user.id;
    }
    
    if (filtros?.dataInicio && filtros?.dataFim) {
      where.createdAt = {
        gte: new Date(filtros.dataInicio),
        lte: new Date(filtros.dataFim)
      };
    }

    const [totalVendas, valorVendasResult] = await Promise.all([
      executeWithRetry(() => prisma.venda.count({ where })),
      executeWithRetry(() => prisma.venda.aggregate({ where, _sum: { valorTotal: true } }))
    ]);
    
    const estatisticas: EstatisticasResumidasVendas = {
      totalVendas,
      valorTotalVendas: valorVendasResult._sum.valorTotal || 0
    };

    revalidatePath('/painel');
    return { success: true, estatisticas };
  } catch (error) {
    console.error('Erro ao buscar estatísticas resumidas de vendas:', error);
    return { success: false, error: 'Ocorreu um erro ao buscar as estatísticas' };
  }
}

export async function getEstatisticasResumidasNaoVendas(filtros?: FiltrosBase): Promise<{ 
  success: boolean; 
  estatisticas?: EstatisticasResumidasNaoVendas;
  error?: string;
}> {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    const where: Record<string, unknown> = {}; 
    
    if (session.user.role !== 'ADMIN') {
      where.vendedorId = session.user.id;
    }
    
    if (filtros?.dataInicio && filtros?.dataFim) {
      where.createdAt = {
        gte: new Date(filtros.dataInicio),
        lte: new Date(filtros.dataFim)
      };
    }

    const [totalNaoVendas, valorNaoVendasResult] = await Promise.all([
      executeWithRetry(() => prisma.naoVenda.count({ where })),
      executeWithRetry(() => prisma.naoVenda.aggregate({ where, _sum: { valorTotal: true } }))
    ]);
    
    const estatisticas: EstatisticasResumidasNaoVendas = {
      totalNaoVendas,
      valorTotalNaoVendas: valorNaoVendasResult._sum.valorTotal || 0
    };

    revalidatePath('/painel');
    return { success: true, estatisticas };
  } catch (error) {
    console.error('Erro ao buscar estatísticas resumidas de não vendas:', error);
    return { success: false, error: 'Ocorreu um erro ao buscar as estatísticas' };
  }
} 
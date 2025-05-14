// src/actions/estatisticas-resumidas-actions.ts
'use server'

import { prisma } from '@/lib/supabase/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FiltrosBase } from '@/types/filtros';
import { format, subDays } from 'date-fns';

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
}

// Função para detectar e lidar com erros de conexão
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
      // Espera um pouco antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      return executeWithRetry(fn, retries - 1);
    }
    throw error;
  }
}

// Função principal para buscar estatísticas do painel
export async function getEstatisticasPainel(filtros?: EstatisticasPainelParams): Promise<EstatisticasPainelResponse> {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    // Inicializar objeto de estatísticas
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
      clientes: []
    };

    // Construir filtros base
    const where: Record<string, unknown> = {};
    
    // Aplicar filtros
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

    // 1. CONTAGENS BÁSICAS
    try {
      // Fazer consultas sequencialmente para evitar problemas com prepared statements
      const totalVendas = await executeWithRetry(() => 
        prisma.venda.count({ where })
      );
      
      const vendasAggregate = await executeWithRetry(() => 
        prisma.venda.aggregate({ 
          where, 
          _sum: { valorTotal: true }
        })
      );
      
      const totalNaoVendas = await executeWithRetry(() => 
        prisma.naoVenda.count({ where })
      );
      
      const naoVendasAggregate = await executeWithRetry(() => 
        prisma.naoVenda.aggregate({ 
          where, 
          _sum: { valorTotal: true }
        })
      );
      
      estatisticas.totalVendas = totalVendas;
      estatisticas.valorTotalVendas = vendasAggregate._sum.valorTotal || 0;
      estatisticas.totalNaoVendas = totalNaoVendas;
      estatisticas.valorTotalNaoVendas = naoVendasAggregate._sum.valorTotal || 0;
      estatisticas.totalOrcamentos = totalVendas + totalNaoVendas;
    } catch (error) {
      console.error('Erro ao buscar contagens básicas:', error);
      // Continuar mesmo com erro, para tentar buscar outros dados
    }

    // 2. FUNCIONÁRIOS
    try {
      const totalFuncionarios = await executeWithRetry(() => 
        prisma.user.count()
      );
      
      const totalVendedores = await executeWithRetry(() => 
        prisma.user.count({ where: { role: 'VENDEDOR' } })
      );
      
      const totalAdmins = await executeWithRetry(() => 
        prisma.user.count({ where: { role: 'ADMIN' } })
      );
      
      estatisticas.funcionarios = {
        total: totalFuncionarios,
        vendedores: totalVendedores,
        administradores: totalAdmins
      };
    } catch (error) {
      console.error('Erro ao contar funcionários:', error);
      // Continuar mesmo com erro
    }

    // 3. VENDEDOR COM MAIS VENDAS
    try {
      // Construir filtro para vendas agregadas
      const whereVendas = { ...where };
      
      // Buscar vendedores com dados de vendas
      const vendedores = await executeWithRetry(() => 
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
      );
      
      // Processar vendedores e encontrar o que tem mais vendas
      if (vendedores.length > 0) {
        // Calcular total de vendas para cada vendedor
        const vendedoresComEstat = vendedores.map(vendedor => {
          const quantidadeVendas = vendedor.vendas.length;
          const valorTotalVendas = vendedor.vendas.reduce((total, venda) => total + venda.valorTotal, 0);
          
          // Encontrar data da última venda
          let ultimaVenda = new Date(0); // Iniciar com data antiga
          for (const venda of vendedor.vendas) {
            if (venda.createdAt > ultimaVenda) {
              ultimaVenda = venda.createdAt;
            }
          }
          
          return {
            id: vendedor.id,
            nome: vendedor.name,
            email: vendedor.email,
            quantidadeVendas,
            valorTotalVendas,
            ultimaVenda: vendedor.vendas.length > 0 ? ultimaVenda : new Date()
          };
        });
        
        // Ordenar por quantidade de vendas
        vendedoresComEstat.sort((a, b) => b.quantidadeVendas - a.quantidadeVendas);
        
        // Selecionar o vendedor com mais vendas
        if (vendedoresComEstat.length > 0) {
          estatisticas.vendedorMaisVendas = vendedoresComEstat[0];
        }
      }
    } catch (error) {
      console.error('Erro ao buscar vendedor com mais vendas:', error);
      // Continuar mesmo com erro
    }

    // 4. PRODUTO MAIS VENDIDO
    try {
      // Buscar produtos com suas vendas
      const produto = await executeWithRetry(() => 
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
          take: 1
        })
      );
      
      if (produto.length > 0) {
        const produtoId = produto[0].produtoId;
        const presenteEmVendas = produto[0]._count.produtoId;
        const valorTotal = produto[0]._sum.valor || 0;
        
        // Buscar detalhes do produto
        const detalheProduto = await executeWithRetry(() => 
          prisma.produto.findUnique({
            where: { id: produtoId },
            select: {
              id: true,
              nome: true,
              medida: true,
              valor: true
            }
          })
        );
        
        if (detalheProduto) {
          estatisticas.produtoMaisVendido = {
            id: detalheProduto.id,
            nome: detalheProduto.nome,
            medida: detalheProduto.medida,
            valorMedio: detalheProduto.valor,
            presenteEmVendas,
            valorTotal
          };
        }
      }
    } catch (error) {
      console.error('Erro ao buscar produto mais vendido:', error);
      // Continuar mesmo com erro
    }

    // 5. MAIOR VENDA
    try {
      const maiorVenda = await executeWithRetry(() => 
        prisma.venda.findFirst({
          where,
          orderBy: { valorTotal: 'desc' },
          include: {
            vendedor: { select: { name: true } },
            cliente: { select: { nome: true } }
          },
          take: 1
        })
      );
      
      if (maiorVenda) {
        estatisticas.maiorVenda = {
          codigoVenda: maiorVenda.codigoVenda,
          valorTotal: maiorVenda.valorTotal,
          data: maiorVenda.createdAt,
          vendedorNome: maiorVenda.vendedor.name,
          clienteNome: maiorVenda.cliente.nome
        };
      }
    } catch (error) {
      console.error('Erro ao buscar maior venda:', error);
      // Continuar mesmo com erro
    }

    // 6. ESTATÍSTICAS DE PRODUTOS
    try {
      // Filtro de busca para produtos
      const whereProdutos: Record<string, unknown> = {};
      
      if (filtros?.searchProdutos) {
        whereProdutos.OR = [
          { nome: { contains: filtros.searchProdutos, mode: 'insensitive' } },
          { medida: { contains: filtros.searchProdutos, mode: 'insensitive' } }
        ];
      }
      
      // Buscar todos os produtos
      const todosProdutos = await executeWithRetry(() => 
        prisma.produto.findMany({
          where: whereProdutos,
          distinct: ['nome', 'medida'], // Evitar produtos duplicados
          select: {
            id: true,
            nome: true,
            medida: true,
            valor: true,
            vendaProdutos: {
              where,
              select: { 
                quantidade: true, 
                valor: true 
              }
            }
          },
          take: 100
        })
      );
      
      estatisticas.produtos = todosProdutos.map(produto => {
        const presenteEmVendas = produto.vendaProdutos.length;
        const valorTotal = produto.vendaProdutos.reduce((sum, item) => sum + item.valor, 0);
        const quantidadeTotal = produto.vendaProdutos.reduce((sum, item) => sum + item.quantidade, 0);
        
        return {
          id: produto.id,
          nome: produto.nome,
          medida: produto.medida,
          valorMedio: produto.valor,
          presenteEmVendas,
          valorTotal,
          quantidadeMedia: presenteEmVendas > 0 ? quantidadeTotal / presenteEmVendas : 0
        };
      }).sort((a, b) => b.presenteEmVendas - a.presenteEmVendas);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de produtos:', error);
      estatisticas.produtos = [];
    }

    // 7. ESTATÍSTICAS DE VENDEDORES
    try {
      // Filtro de busca para vendedores
      const whereVendedores: Record<string, unknown> = { role: 'VENDEDOR' };
      
      if (filtros?.searchVendedores) {
        whereVendedores.OR = [
          { name: { contains: filtros.searchVendedores, mode: 'insensitive' } },
          { email: { contains: filtros.searchVendedores, mode: 'insensitive' } }
        ];
      }
      
      // Buscar vendedores
      const vendedores = await executeWithRetry(() => 
        prisma.user.findMany({
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
        })
      );
      
      estatisticas.vendedores = vendedores.map(vendedor => {
        const quantidadeVendas = vendedor.vendas.length;
        const quantidadeNaoVendas = vendedor.naoVendas.length;
        const valorTotalVendas = vendedor.vendas.reduce((sum, venda) => sum + venda.valorTotal, 0);
        
        // Taxa de sucesso
        const totalOrcamentos = quantidadeVendas + quantidadeNaoVendas;
        const taxaSucesso = totalOrcamentos > 0 ? (quantidadeVendas / totalOrcamentos) * 100 : 0;
        
        // Última venda
        let ultimaVenda = new Date(0);
        if (vendedor.vendas.length > 0) {
          for (const venda of vendedor.vendas) {
            if (venda.createdAt > ultimaVenda) {
              ultimaVenda = venda.createdAt;
            }
          }
        } else {
          ultimaVenda = new Date(); // Data atual se não houver vendas
        }
        
        // Clientes únicos
        const clientesIds = new Set<string>();
        vendedor.vendas.forEach(venda => {
          clientesIds.add(venda.clienteId);
        });
        const quantidadeClientes = clientesIds.size;
        
        // Clientes recorrentes (com mais de uma compra)
        const clientesContagem: Record<string, number> = {};
        vendedor.vendas.forEach(venda => {
          clientesContagem[venda.clienteId] = (clientesContagem[venda.clienteId] || 0) + 1;
        });
        
        const clientesRecorrentes = Object.values(clientesContagem).filter(count => count > 1).length;
        
        // Média mensal aproximada (baseada nos últimos 6 meses)
        const mediaMensal = Math.max(1, Math.ceil(quantidadeVendas / 6));
        
        return {
          id: vendedor.id,
          nome: vendedor.name,
          email: vendedor.email,
          quantidadeVendas,
          quantidadeNaoVendas,
          valorTotalVendas,
          taxaSucesso,
          ultimaVenda,
          quantidadeClientes,
          clientesRecorrentes,
          mediaMensal
        };
      }).sort((a, b) => b.valorTotalVendas - a.valorTotalVendas); // Ordenar por valor
    } catch (error) {
      console.error('Erro ao buscar estatísticas de vendedores:', error);
      estatisticas.vendedores = [];
    }

    // 8. ESTATÍSTICAS DE CLIENTES
    try {
      // Filtro de busca para clientes
      const whereClientes: Record<string, unknown> = {};
      
      if (filtros?.searchClientes) {
        whereClientes.OR = [
          { nome: { contains: filtros.searchClientes, mode: 'insensitive' } },
          { cnpj: { contains: filtros.searchClientes, mode: 'insensitive' } },
          { segmento: { contains: filtros.searchClientes, mode: 'insensitive' } }
        ];
      }
      
      const clientes = await executeWithRetry(() => 
        prisma.cliente.findMany({
          where: whereClientes,
          select: {
            id: true,
            nome: true,
            cnpj: true,
            segmento: true,
            vendas: {
              where,
              select: {
                id: true,
                valorTotal: true,
                createdAt: true,
                produtos: {
                  select: {
                    produto: { select: { id: true, nome: true } },
                    quantidade: true
                  }
                }
              }
            }
          },
          take: 50
        })
      );
      
      estatisticas.clientes = clientes.map(cliente => {
        const quantidadeVendas = cliente.vendas.length;
        const valorTotal = cliente.vendas.reduce((sum, venda) => sum + venda.valorTotal, 0);
        const valorMedio = quantidadeVendas > 0 ? valorTotal / quantidadeVendas : 0;
        
        // Cliente é recorrente se tem mais de 1 compra
        const ehRecorrente = quantidadeVendas > 1;
        
        // Maior valor
        let maiorValor = 0;
        if (cliente.vendas.length > 0) {
          for (const venda of cliente.vendas) {
            if (venda.valorTotal > maiorValor) {
              maiorValor = venda.valorTotal;
            }
          }
        }
        
        // Última compra
        let ultimaCompra = new Date(0);
        if (cliente.vendas.length > 0) {
          for (const venda of cliente.vendas) {
            if (venda.createdAt > ultimaCompra) {
              ultimaCompra = venda.createdAt;
            }
          }
        } else {
          ultimaCompra = new Date(); // Data atual se não houver compras
        }
        
        // Encontrar produto mais comprado (por frequência)
        const frequenciaProdutos: Record<string, { count: number, nome: string }> = {};
        const quantidadeProdutos: Record<string, { count: number, nome: string }> = {};
        
        cliente.vendas.forEach(venda => {
          venda.produtos.forEach(item => {
            const produtoId = item.produto.id;
            // Contador de frequência
            if (!frequenciaProdutos[produtoId]) {
              frequenciaProdutos[produtoId] = { count: 0, nome: item.produto.nome };
            }
            frequenciaProdutos[produtoId].count += 1;
            
            // Contador de quantidade
            if (!quantidadeProdutos[produtoId]) {
              quantidadeProdutos[produtoId] = { count: 0, nome: item.produto.nome };
            }
            quantidadeProdutos[produtoId].count += item.quantidade;
          });
        });
        
        // Encontrar o produto mais frequente
        let produtoMaisFrequente: string | undefined;
        let maiorFrequencia = 0;
        
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.entries(frequenciaProdutos).forEach(([_, data]) => {
          if (data.count > maiorFrequencia) {
            maiorFrequencia = data.count;
            produtoMaisFrequente = data.nome;
          }
        });
        
        // Se não houver produto mais frequente ou houver empate, usar o de maior quantidade
        if (!produtoMaisFrequente || Object.values(frequenciaProdutos).filter(data => data.count === maiorFrequencia).length > 1) {
          let maiorQuantidade = 0;
          
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          Object.entries(quantidadeProdutos).forEach(([_, data]) => {
            if (data.count > maiorQuantidade) {
              maiorQuantidade = data.count;
              produtoMaisFrequente = data.nome;
            }
          });
        }
        
        // Se ainda não tiver um produto definido ou houver empate, usar "Diversos"
        if (!produtoMaisFrequente || Object.values(quantidadeProdutos).filter(data => data.count === maiorFrequencia).length > 1) {
          produtoMaisFrequente = "Diversos";
        }
        
        return {
          id: cliente.id,
          nome: cliente.nome,
          cnpj: cliente.cnpj,
          segmento: cliente.segmento,
          quantidadeVendas,
          valorTotal,
          valorMedio,
          maiorValor,
          ultimaCompra,
          produtoMaisComprado: produtoMaisFrequente,
          ehRecorrente
        };
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas de clientes:', error);
      estatisticas.clientes = [];
    }

    // 9. DADOS DO GRÁFICO
    try {
      // Usar subDays conforme o código original
      const hoje = new Date();
      estatisticas.chartData = [];
      
      // Criar dados para os últimos 30 dias
      for (let i = 29; i >= 0; i--) {
        const data = subDays(hoje, i);
        const dataFormatada = format(data, 'yyyy-MM-dd');
        
        // Filtro para esta data específica
        const whereDia = {
          ...where,
          createdAt: {
            gte: new Date(`${dataFormatada}T00:00:00.000Z`),
            lt: new Date(`${dataFormatada}T23:59:59.999Z`)
          }
        };
        
        // Buscar vendas desta data
        const vendaDia = await executeWithRetry(() => 
          prisma.venda.aggregate({
            where: whereDia,
            _sum: { valorTotal: true }
          })
        );
        
        // Buscar não vendas desta data
        const naoVendaDia = await executeWithRetry(() => 
          prisma.naoVenda.aggregate({
            where: whereDia,
            _sum: { valorTotal: true }
          })
        );
        
        // Adicionar dados ao gráfico
        estatisticas.chartData.push({
          date: dataFormatada,
          vendas: vendaDia._sum.valorTotal || 0,
          naoVendas: naoVendaDia._sum.valorTotal || 0
        });
      }
    } catch (error) {
      console.error('Erro ao gerar dados do gráfico:', error);
      estatisticas.chartData = [];
    }

    // 10. CLIENTES RECORRENTES
    try {
      const totalClientes = await executeWithRetry(() => 
        prisma.cliente.count()
      );
      
      // Encontrar clientes com mais de uma venda
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
      
      estatisticas.totalClientes = totalClientes;
      estatisticas.clientesRecorrentes = clientesRecorrentes;
      estatisticas.clientesNaoRecorrentes = totalClientes - clientesRecorrentes;
    } catch (error) {
      console.error('Erro ao calcular clientes recorrentes:', error);
      estatisticas.totalClientes = 0;
      estatisticas.clientesRecorrentes = 0;
      estatisticas.clientesNaoRecorrentes = 0;
    }

    return { success: true, estatisticas };
  } catch (error) {
    console.error('Erro geral ao buscar estatísticas do painel:', error);
    return { 
      success: false, 
      error: 'Ocorreu um erro ao buscar as estatísticas do painel' 
    };
  }
}

export async function getEstatisticasResumidas(filtros?: FiltrosBase): Promise<{ 
  success: boolean; 
  estatisticas?: EstatisticasResumidas;
  error?: string;
}> {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    // Construir filtros
    const where: Record<string, unknown> = {}; 
    
    // Se não for admin, filtrar por usuário logado
    if (session.user.role !== 'ADMIN') {
      where.vendedorId = session.user.id;
    }
    
    // Filtrar por data
    if (filtros?.dataInicio && filtros?.dataFim) {
      where.createdAt = {
        gte: new Date(filtros.dataInicio),
        lte: new Date(filtros.dataFim)
      };
    }

    // Buscar total de vendas
    const totalVendas = await executeWithRetry(() => 
      prisma.venda.count({ where })
    );

    // Buscar valor total de vendas
    const valorVendasResult = await executeWithRetry(() => 
      prisma.venda.aggregate({
        where,
        _sum: { valorTotal: true }
      })
    );
    const valorTotalVendas = valorVendasResult._sum.valorTotal || 0;

    // Buscar total de não vendas
    const totalNaoVendas = await executeWithRetry(() => 
      prisma.naoVenda.count({ where })
    );

    // Buscar valor total de não vendas
    const valorNaoVendasResult = await executeWithRetry(() => 
      prisma.naoVenda.aggregate({
        where,
        _sum: { valorTotal: true }
      })
    );
    const valorTotalNaoVendas = valorNaoVendasResult._sum.valorTotal || 0;

    const estatisticas: EstatisticasResumidas = {
      totalVendas,
      valorTotalVendas,
      totalNaoVendas,
      valorTotalNaoVendas,
      totalOrcamentos: totalVendas + totalNaoVendas
    };

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
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    // Construir filtros
    const where: Record<string, unknown> = {}; 
    
    // Se não for admin, filtrar por usuário logado
    if (session.user.role !== 'ADMIN') {
      where.vendedorId = session.user.id;
    }
    
    // Filtrar por data
    if (filtros?.dataInicio && filtros?.dataFim) {
      where.createdAt = {
        gte: new Date(filtros.dataInicio),
        lte: new Date(filtros.dataFim)
      };
    }

    // Buscar total de vendas
    const totalVendas = await executeWithRetry(() => 
      prisma.venda.count({ where })
    );

    // Buscar valor total de vendas
    const valorVendasResult = await executeWithRetry(() => 
      prisma.venda.aggregate({
        where,
        _sum: { valorTotal: true }
      })
    );
    const valorTotalVendas = valorVendasResult._sum.valorTotal || 0;

    const estatisticas: EstatisticasResumidasVendas = {
      totalVendas,
      valorTotalVendas
    };

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
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    // Construir filtros
    const where: Record<string, unknown> = {}; 
    
    // Se não for admin, filtrar por usuário logado
    if (session.user.role !== 'ADMIN') {
      where.vendedorId = session.user.id;
    }
    
    // Filtrar por data
    if (filtros?.dataInicio && filtros?.dataFim) {
      where.createdAt = {
        gte: new Date(filtros.dataInicio),
        lte: new Date(filtros.dataFim)
      };
    }

    // Buscar total de não vendas
    const totalNaoVendas = await executeWithRetry(() => 
      prisma.naoVenda.count({ where })
    );

    // Buscar valor total de não vendas
    const valorNaoVendasResult = await executeWithRetry(() => 
      prisma.naoVenda.aggregate({
        where,
        _sum: { valorTotal: true }
      })
    );
    const valorTotalNaoVendas = valorNaoVendasResult._sum.valorTotal || 0;

    const estatisticas: EstatisticasResumidasNaoVendas = {
      totalNaoVendas,
      valorTotalNaoVendas
    };

    return { success: true, estatisticas };
  } catch (error) {
    console.error('Erro ao buscar estatísticas resumidas de não vendas:', error);
    return { success: false, error: 'Ocorreu um erro ao buscar as estatísticas' };
  }
}
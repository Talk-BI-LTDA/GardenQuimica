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

    // Executar consultas em paralelo para melhorar performance
    try {
      // 1. CONTAGENS BÁSICAS + FUNCIONÁRIOS - Paralelização
      const [
        vendasResult,
        naoVendasResult,
        funcionariosResult
      ] = await Promise.all([
        // Vendas (total e valor)
        executeWithRetry(() => 
          prisma.$transaction([
            prisma.venda.count({ where }),
            prisma.venda.aggregate({ where, _sum: { valorTotal: true } })
          ])
        ),
        // Não vendas (total e valor)
        executeWithRetry(() => 
          prisma.$transaction([
            prisma.naoVenda.count({ where }),
            prisma.naoVenda.aggregate({ where, _sum: { valorTotal: true } })
          ])
        ),
        // Dados de funcionários
        executeWithRetry(() => 
          prisma.$transaction([
            prisma.user.count(),
            prisma.user.count({ where: { role: 'VENDEDOR' } }),
            prisma.user.count({ where: { role: 'ADMIN' } })
          ])
        )
      ]);

      // Atribuir resultados das contagens básicas
      const [totalVendas, vendasAggregate] = vendasResult;
      const [totalNaoVendas, naoVendasAggregate] = naoVendasResult;
      const [totalFuncionarios, totalVendedores, totalAdmins] = funcionariosResult;
      
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
    } catch (error) {
      console.error('Erro ao buscar contagens básicas e funcionários:', error);
      // Continuar mesmo com erro para tentar buscar outros dados
    }

    // 2. CONSULTAS PARA VENDEDORES, PRODUTOS, MAIOR VENDA E CLIENTES - Paralelização
    try {
      // Construir filtros secundários se necessário
      const whereVendas = { ...where };
      
      const [
        vendedoresData,
        produtoData,
        maiorVendaData,
        clientesData
      ] = await Promise.all([
        // Vendedores com dados completos
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
                  createdAt: true,
                  clienteId: true
                }
              },
              naoVendas: {
                where: whereVendas,
                select: { id: true }
              }
            }
          })
        ),
        // Produto mais vendido
        executeWithRetry(() => 
          prisma.vendaProduto.groupBy({
            by: ['produtoId'],
            where,
            _count: { produtoId: true },
            _sum: { valor: true },
            orderBy: { _count: { produtoId: 'desc' } },
            take: 1
          })
        ),
        // Maior venda
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
        ),
        // Clientes totais para estatísticas
        executeWithRetry(() => 
          prisma.$transaction([
            prisma.cliente.count(),
            prisma.cliente.findMany({
              select: {
                id: true,
                _count: { select: { vendas: true } }
              }
            })
          ])
        )
      ]);

      // Processar dados de vendedores
      if (vendedoresData && vendedoresData.length > 0) {
        // Processar vendedores e definir vendedor com mais vendas
        const vendedoresProcessados = vendedoresData.map(vendedor => {
          const quantidadeVendas = vendedor.vendas.length;
          const quantidadeNaoVendas = vendedor.naoVendas.length;
          const valorTotalVendas = vendedor.vendas.reduce((total, venda) => total + venda.valorTotal, 0);
          
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
        });
        
        // Ordenar por valor total para definir vendedor com mais vendas
        vendedoresProcessados.sort((a, b) => b.valorTotalVendas - a.valorTotalVendas);
        
        estatisticas.vendedores = vendedoresProcessados;
        
        // Definir vendedor com mais vendas
        if (vendedoresProcessados.length > 0) {
          const melhorVendedor = vendedoresProcessados.reduce((prev, current) => 
            (current.quantidadeVendas > prev.quantidadeVendas) ? current : prev
          );
          
          estatisticas.vendedorMaisVendas = {
            id: melhorVendedor.id,
            nome: melhorVendedor.nome,
            email: melhorVendedor.email,
            valorTotalVendas: melhorVendedor.valorTotalVendas,
            quantidadeVendas: melhorVendedor.quantidadeVendas,
            ultimaVenda: melhorVendedor.ultimaVenda
          };
        }
      }

      // Processar dados de produto mais vendido
      if (produtoData && produtoData.length > 0) {
        const produtoMaisVendidoInfo = produtoData[0];
        const produtoId = produtoMaisVendidoInfo.produtoId;
        const presenteEmVendas = produtoMaisVendidoInfo._count.produtoId;
        const valorTotal = produtoMaisVendidoInfo._sum.valor || 0;
        
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

      // Processar maior venda
      if (maiorVendaData) {
        estatisticas.maiorVenda = {
          codigoVenda: maiorVendaData.codigoVenda,
          valorTotal: maiorVendaData.valorTotal,
          data: maiorVendaData.createdAt,
          vendedorNome: maiorVendaData.vendedor.name,
          clienteNome: maiorVendaData.cliente.nome
        };
      }

      // Processar dados de clientes
      if (clientesData) {
        const [totalClientes, clientesComVendas] = clientesData;
        
        const clientesRecorrentes = clientesComVendas.filter(c => c._count.vendas > 1).length;
        
        estatisticas.totalClientes = totalClientes;
        estatisticas.clientesRecorrentes = clientesRecorrentes;
        estatisticas.clientesNaoRecorrentes = totalClientes - clientesRecorrentes;
      }
    } catch (error) {
      console.error('Erro ao buscar dados principais:', error);
      // Continuar mesmo com erro
    }

    // 3. BUSCAR E PROCESSAR PRODUTOS - Otimizado
    try {
      // Filtro de busca para produtos
      const whereProdutos: Record<string, unknown> = {};
      
      if (filtros?.searchProdutos) {
        whereProdutos.OR = [
          { nome: { contains: filtros.searchProdutos, mode: 'insensitive' } },
          { medida: { contains: filtros.searchProdutos, mode: 'insensitive' } }
        ];
      }
      
      // Buscar produtos com seus dados de venda em uma única consulta
      const produtosComVendas = await executeWithRetry(() => 
        prisma.produto.findMany({
          where: whereProdutos,
          distinct: ['nome', 'medida'],
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
      
      // Processar e transformar dados de produtos
      estatisticas.produtos = produtosComVendas.map(produto => {
        const presenteEmVendas = produto.vendaProdutos.length;
        const valorTotal = produto.vendaProdutos.reduce((sum, item) => sum + item.valor, 0);
        const quantidadeTotal = produto.vendaProdutos.reduce((sum, item) => sum + item.quantidade, 0);
        
        return {
          id: produto.id,
          nome: produto.nome,
          medida: produto.medida,
          valorMedio: produto.valor,
          presenteEmVendas,
          valorTotal, // Importante: valor total de vendas do produto
          quantidadeMedia: presenteEmVendas > 0 ? quantidadeTotal / presenteEmVendas : 0
        };
      }).sort((a, b) => b.presenteEmVendas - a.presenteEmVendas);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de produtos:', error);
      estatisticas.produtos = [];
    }

    // 4. ESTATÍSTICAS DE CLIENTES - Otimizado
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
      
      // Buscar clientes com suas vendas em uma única consulta mais eficiente
      const clientesComVendas = await executeWithRetry(() => 
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
      
      // Processar dados de clientes para gerar estatísticas
      estatisticas.clientes = clientesComVendas.map(cliente => {
        const vendas = cliente.vendas;
        const quantidadeVendas = vendas.length;
        const valorTotal = vendas.reduce((sum, venda) => sum + venda.valorTotal, 0);
        const valorMedio = quantidadeVendas > 0 ? valorTotal / quantidadeVendas : 0;
        
        // Cliente é recorrente se tem mais de 1 compra
        const ehRecorrente = quantidadeVendas > 1;
        
        // Maior valor
        const maiorValor = vendas.length > 0 
          ? Math.max(...vendas.map(venda => venda.valorTotal))
          : 0;
        
        // Última compra
        const ultimaCompra = vendas.length > 0
          ? new Date(Math.max(...vendas.map(venda => venda.createdAt.getTime())))
          : new Date();
        
        // Produto mais comprado (otimizado)
        const produtosContagem: Record<string, number> = {};
        
        vendas.forEach(venda => {
          venda.produtos.forEach(item => {
            const produtoNome = item.produto.nome;
            produtosContagem[produtoNome] = (produtosContagem[produtoNome] || 0) + item.quantidade;
          });
        });
        
        // Encontrar produto mais comprado por quantidade
        let produtoMaisComprado: string | undefined;
        let maiorQuantidade = 0;
        
        Object.entries(produtosContagem).forEach(([nome, quantidade]) => {
          if (quantidade > maiorQuantidade) {
            maiorQuantidade = quantidade;
            produtoMaisComprado = nome;
          }
        });
        
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
          produtoMaisComprado,
          ehRecorrente
        };
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas de clientes:', error);
      estatisticas.clientes = [];
    }

    // 5. DADOS DO GRÁFICO - Usando agregação para reduzir consultas
    try {
      const hoje = new Date();
      estatisticas.chartData = [];
      
      // Otimização: agrupar consultas por dia para reduzir o número total de queries
      // Array com os últimos 30 dias formatados
      const dias: {data: Date, dataFormatada: string}[] = [];
      for (let i = 29; i >= 0; i--) {
        const data = subDays(hoje, i);
        dias.push({
          data,
          dataFormatada: format(data, 'yyyy-MM-dd')
        });
      }
      
      // Criar um mapa para armazenar os resultados por dia
      const resultadosPorDia = new Map<string, {
        vendas: number;
        naoVendas: number;
      }>();
      
      // Inicializar o mapa com zeros
      dias.forEach(({dataFormatada}) => {
        resultadosPorDia.set(dataFormatada, {vendas: 0, naoVendas: 0});
      });
      
      // Buscar vendas para todos os dias em uma única consulta
      const vendas = await executeWithRetry(() =>
        prisma.venda.findMany({
          where: {
            ...where,
            createdAt: {
              gte: subDays(hoje, 29),
              lte: hoje
            }
          },
          select: {
            valorTotal: true,
            createdAt: true
          }
        })
      );
      
      // Buscar não-vendas para todos os dias em uma única consulta
      const naoVendas = await executeWithRetry(() =>
        prisma.naoVenda.findMany({
          where: {
            ...where,
            createdAt: {
              gte: subDays(hoje, 29),
              lte: hoje
            }
          },
          select: {
            valorTotal: true,
            createdAt: true
          }
        })
      );
      
      // Processar vendas
      vendas.forEach(venda => {
        const dataFormatada = format(venda.createdAt, 'yyyy-MM-dd');
        const dadosDia = resultadosPorDia.get(dataFormatada);
        if (dadosDia) {
          dadosDia.vendas += venda.valorTotal;
        }
      });
      
      // Processar não-vendas
      naoVendas.forEach(naoVenda => {
        const dataFormatada = format(naoVenda.createdAt, 'yyyy-MM-dd');
        const dadosDia = resultadosPorDia.get(dataFormatada);
        if (dadosDia) {
          dadosDia.naoVendas += naoVenda.valorTotal;
        }
      });
      
      // Converter o mapa para o formato esperado do chartData
      estatisticas.chartData = dias.map(({dataFormatada}) => {
        const dadosDia = resultadosPorDia.get(dataFormatada) || {vendas: 0, naoVendas: 0};
        return {
          date: dataFormatada,
          vendas: dadosDia.vendas,
          naoVendas: dadosDia.naoVendas
        };
      });
    } catch (error) {
      console.error('Erro ao gerar dados do gráfico:', error);
      estatisticas.chartData = [];
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

    // Executar consultas em paralelo para melhorar performance
    const [vendasResult, naoVendasResult] = await Promise.all([
      // Vendas
      executeWithRetry(() => 
        prisma.$transaction([
          prisma.venda.count({ where }),
          prisma.venda.aggregate({ where, _sum: { valorTotal: true } })
        ])
      ),
      // Não Vendas
      executeWithRetry(() => 
        prisma.$transaction([
          prisma.naoVenda.count({ where }),
          prisma.naoVenda.aggregate({ where, _sum: { valorTotal: true } })
        ])
      )
    ]);

    const [totalVendas, valorVendasResult] = vendasResult;
    const [totalNaoVendas, valorNaoVendasResult] = naoVendasResult;

    const estatisticas: EstatisticasResumidas = {
      totalVendas,
      valorTotalVendas: valorVendasResult._sum.valorTotal || 0,
      totalNaoVendas,
      valorTotalNaoVendas: valorNaoVendasResult._sum.valorTotal || 0,
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

    // Executar consultas em uma única transação
    const [totalVendas, valorVendasResult] = await executeWithRetry(() => 
      prisma.$transaction([
        prisma.venda.count({ where }),
        prisma.venda.aggregate({ where, _sum: { valorTotal: true } })
      ])
    );

    const estatisticas: EstatisticasResumidasVendas = {
      totalVendas,
      valorTotalVendas: valorVendasResult._sum.valorTotal || 0
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

    // Executar consultas em uma única transação
    const [totalNaoVendas, valorNaoVendasResult] = await executeWithRetry(() => 
      prisma.$transaction([
        prisma.naoVenda.count({ where }),
        prisma.naoVenda.aggregate({ where, _sum: { valorTotal: true } })
      ])
    );

    const estatisticas: EstatisticasResumidasNaoVendas = {
      totalNaoVendas,
      valorTotalNaoVendas: valorNaoVendasResult._sum.valorTotal || 0
    };

    return { success: true, estatisticas };
  } catch (error) {
    console.error('Erro ao buscar estatísticas resumidas de não vendas:', error);
    return { success: false, error: 'Ocorreu um erro ao buscar as estatísticas' };
  }
}
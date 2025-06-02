// actions/clientes-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/supabase/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { differenceInDays } from 'date-fns'
import { Cliente, ClienteParams, ClienteFiltros } from '@/types/cliente'
import { sincronizarClienteTalkBI } from "@/actions/talkbi-actions";

interface VendaPrisma {
  id: string;
  valorTotal: number;
  createdAt: Date;
  vendaRecorrente: boolean;
  produtos: {
    produto: {
      id: string;
      nome: string;
    };
    quantidade: number;
  }[];
}

interface CotacaoPrisma {
  id: string;
  valorTotal: number;
  createdAt: Date;
  vendaRecorrente: boolean;
  status: string;
  produtos: {
    produto: {
      id: string;
      nome: string;
    };
    quantidade: number;
  }[];
}

interface NaoVendaPrisma {
  id: string;
  valorTotal: number;
  createdAt: Date;
  produtos: {
    produto: {
      id: string;
      nome: string;
    };
    quantidade: number;
  }[];
}

interface ClientePrisma {
  id: string;
  nome: string;
  segmento: string;
  cnpj: string;
  razaoSocial: string | null;
  createdAt: Date;
  vendas: VendaPrisma[];
  Cotacao: CotacaoPrisma[];
  naoVendas: NaoVendaPrisma[];
  origem?: string;
  user_ns?: string;
  email?: string;

}
/**
 * Busca todos os clientes com opções de filtro
 */
export async function getClientes(filtros?: ClienteFiltros) {
  // Validar autenticação
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  try {
    // Construir consulta base
    const where: Record<string, unknown> = {};
    
    // Aplicar filtros de data (última compra)
    if (filtros?.dataInicio && filtros?.dataFim) {
      // Para filtrar por data da última compra, precisamos filtrar vendas associadas
      const clientesComCompraNoIntervalo = await prisma.venda.findMany({
        where: {
          createdAt: {
            gte: filtros.dataInicio,
            lte: filtros.dataFim
          }
        },
        select: {
          clienteId: true
        },
        distinct: ['clienteId'] // Otimização: buscar somente IDs distintos
      })
      
      const clienteIds = clientesComCompraNoIntervalo.map(c => c.clienteId);
      
      if (clienteIds.length > 0) {
        where.id = { in: clienteIds }
      } else {
        // Se nenhum cliente foi encontrado no intervalo, retornar lista vazia
        return { 
          success: true, 
          clientes: [], 
          totalPaginas: 0
        }
      }
    }
    
    // Aplicar filtro de segmento
    if (filtros?.segmento) {
      where.segmento = filtros.segmento
    }
    
    // Aplicar filtro de recorrência (via consulta de vendas)
    if (filtros?.recorrencia === "recorrentes" || filtros?.recorrencia === "naoRecorrentes") {
      const recorrentesEsperado = filtros.recorrencia === "recorrentes"
      
      // Encontrar clientes com vendas recorrentes - otimização: usar distinct
      const clientesComVendasRecorrentes = await prisma.venda.findMany({
        where: {
          vendaRecorrente: true
        },
        select: {
          clienteId: true
        },
        distinct: ['clienteId']
      })
      
      const idsRecorrentes = clientesComVendasRecorrentes.map(v => v.clienteId)
      
      if (recorrentesEsperado) {
        // Se queremos recorrentes, filtrar para incluir apenas estes IDs
        where.id = { ...(where.id || {}), in: idsRecorrentes }
      } else {
        // Se queremos não recorrentes, filtrar para excluir estes IDs
        where.id = { ...(where.id || {}), notIn: idsRecorrentes }
      }
    }
    
    // Aplicar filtro de pesquisa
    if (filtros?.searchTerm) {
      const termo = filtros.searchTerm.toLowerCase()
      where.OR = [
        { nome: { contains: termo, mode: 'insensitive' } },
        { cnpj: { contains: termo } },
        { razaoSocial: { contains: termo, mode: 'insensitive' } },
        { segmento: { contains: termo, mode: 'insensitive' } }
      ]
    }
    
    // Executar contagem e consulta principal em paralelo
    const [totalClientes, clientesDB] = await Promise.all([
      // Contagem total para paginação
      prisma.cliente.count({ where }),
      
      // Busca principal de clientes com suas vendas, cotações e não-vendas
      prisma.cliente.findMany({
        where,
        orderBy: buildOrderBy(filtros),
        skip: filtros?.pagina && filtros?.itensPorPagina 
          ? (filtros.pagina - 1) * filtros.itensPorPagina 
          : undefined,
        take: filtros?.itensPorPagina || undefined,
        select: {
          id: true,
          nome: true,
          segmento: true,
          cnpj: true,
          razaoSocial: true,
          createdAt: true,
          vendas: {
            select: {
              id: true,
              valorTotal: true,
              createdAt: true,
              vendaRecorrente: true,
              produtos: {
                select: {
                  produto: {
                    select: {
                      id: true,
                      nome: true
                    }
                  },
                  quantidade: true
                }
              }
            }
          },
          // Adicionar cotações
          Cotacao: {
            select: {
              id: true,
              valorTotal: true,
              createdAt: true,
              vendaRecorrente: true,
              status: true,
              produtos: {
                select: {
                  produto: {
                    select: {
                      id: true,
                      nome: true
                    }
                  },
                  quantidade: true
                }
              }
            }
          },
          // Adicionar não-vendas
          naoVendas: {
            select: {
              id: true,
              valorTotal: true,
              createdAt: true,
              produtos: {
                select: {
                  produto: {
                    select: {
                      id: true,
                      nome: true
                    }
                  },
                  quantidade: true
                }
              }
            }
          }
        }
      })
    ]);
      
    const totalPaginas = filtros?.itensPorPagina 
      ? Math.ceil(totalClientes / filtros.itensPorPagina) 
      : 1
    
    // Calcular dados adicionais para cada cliente - otimizado para reduzir cálculos repetidos
    const clientes = clientesDB.map((cliente: ClientePrisma) => {
      // Calcular valor total e médio em uma única passagem
      const vendas = cliente.vendas || [];
      const cotacoes = cliente.Cotacao || []; 
      const naoVendas = cliente.naoVendas || []; 
      
      let valorTotal = 0;
      let maiorValor = 0;
      let ultimaInteracaoTimestamp = 0;
      const produtosContagem: Record<string, number> = {};
      
      // Processar vendas
      vendas.forEach(venda => {
        // Valor total e maior valor
        valorTotal += venda.valorTotal;
        maiorValor = Math.max(maiorValor, venda.valorTotal);
        
        // Última interação
        ultimaInteracaoTimestamp = Math.max(ultimaInteracaoTimestamp, venda.createdAt.getTime());
        
        // Produtos
        venda.produtos.forEach(p => {
          const nomeProduto = p.produto.nome;
          produtosContagem[nomeProduto] = (produtosContagem[nomeProduto] || 0) + (p.quantidade || 1);
        });
      });
      
      // Processar cotações (considerar apenas finalizadas para valores)
      cotacoes.forEach((cotacao: CotacaoPrisma) => {
        // Última interação (todas as cotações contam como interação)
        ultimaInteracaoTimestamp = Math.max(ultimaInteracaoTimestamp, cotacao.createdAt.getTime());
        
        // Para cotações finalizadas, considerar valores
        if (cotacao.status === 'finalizada') {
          valorTotal += cotacao.valorTotal;
          maiorValor = Math.max(maiorValor, cotacao.valorTotal);
          
          cotacao.produtos.forEach(p => {
            const nomeProduto = p.produto.nome;
            produtosContagem[nomeProduto] = (produtosContagem[nomeProduto] || 0) + (p.quantidade || 1);
          });
        }
      });
      
      // Processar não-vendas (considerar apenas para interações)
      naoVendas.forEach((naoVenda: NaoVendaPrisma) => {
        // Última interação
        ultimaInteracaoTimestamp = Math.max(ultimaInteracaoTimestamp, naoVenda.createdAt.getTime());
      });
      
      // Total de todas as interações (vendas + cotações + não-vendas)
      const totalInteracoes = vendas.length + cotacoes.length + naoVendas.length;
      
      // Valor médio (apenas de vendas e cotações finalizadas)
      const cotacoesFinalizadas = cotacoes.filter((c: CotacaoPrisma) => c.status === 'finalizada');
      const totalTransacoes = vendas.length + cotacoesFinalizadas.length;
      const valorMedio = totalTransacoes > 0 ? valorTotal / totalTransacoes : 0;
      
      // Produto mais comprado
      let produtoMaisComprado: string | undefined = undefined;
      let maxContagem = 0;
      
      Object.entries(produtosContagem).forEach(([produto, contagem]) => {
        if (contagem > maxContagem) {
          maxContagem = contagem;
          produtoMaisComprado = produto;
        }
      });
      
      // Última interação
      const ultimaInteracao = ultimaInteracaoTimestamp > 0 
        ? new Date(ultimaInteracaoTimestamp)
        : null;
      
      // Calcular recorrência (das vendas e cotações)
      const recorrente = vendas.some(v => v.vendaRecorrente) || cotacoes.some((c: CotacaoPrisma) => c.vendaRecorrente);
      
      // Calcular dias desde última interação
      const diasDesdeUltimaInteracao = ultimaInteracao 
        ? differenceInDays(new Date(), ultimaInteracao) 
        : 999;
      
      // Calcular frequência média de interação
      let freqCompra: number | undefined = undefined;
      if (totalInteracoes > 1) {
        // Ordenar datas de interação
        const datasInteracao = [
          ...vendas.map(v => v.createdAt),
          ...cotacoes.map((c: CotacaoPrisma) => c.createdAt),
          ...naoVendas.map((nv: NaoVendaPrisma) => nv.createdAt)
        ];
        const datasOrdenadas = [...datasInteracao].sort((a, b) => a.getTime() - b.getTime());
        
        // Calcular diferenças entre interações consecutivas
        let somaIntervalo = 0;
        for (let i = 1; i < datasOrdenadas.length; i++) {
          somaIntervalo += differenceInDays(datasOrdenadas[i], datasOrdenadas[i-1]);
        }
        
        freqCompra = Math.round(somaIntervalo / (datasOrdenadas.length - 1));
      }
      
      // Calcular score do cliente (baseado em recência, frequência e valor)
      let score = 0;
      
      // Componente de recência (30% do score)
      if (diasDesdeUltimaInteracao <= 30) score += 30;
      else if (diasDesdeUltimaInteracao <= 90) score += 20;
      else if (diasDesdeUltimaInteracao <= 180) score += 10;
      
      // Componente de frequência (30% do score)
      if (totalInteracoes >= 10) score += 30;
      else if (totalInteracoes >= 5) score += 20;
      else if (totalInteracoes >= 2) score += 10;
      
      // Componente de valor (40% do score)
      if (valorTotal >= 50000) score += 40;
      else if (valorTotal >= 10000) score += 30;
      else if (valorTotal >= 5000) score += 20;
      else if (valorTotal >= 1000) score += 10;
      
      // Converter para o tipo Cliente omitindo os campos que não existem no modelo Prisma
      const clienteFormatado: Cliente = {
        id: cliente.id,
        nome: cliente.nome,
        segmento: cliente.segmento,
        cnpj: cliente.cnpj,
        razaoSocial: cliente.razaoSocial || undefined,
        valorTotal,
        valorMedio,
        ultimaCompra: ultimaInteracao,
        quantidadeVendas: totalInteracoes,
        recorrente,
        produtoMaisComprado,
        dataCadastro: cliente.createdAt,
        freqCompra,
        maiorValor,
        diasDesdeUltimaCompra: diasDesdeUltimaInteracao,
        score,
        origem: cliente.origem || "sistema", 
        user_ns: cliente.user_ns, 
        email: cliente.email  
      };
      
      return clienteFormatado;
    });
    
    // Ordenar resultados após processamento se for por campo calculado
    if (filtros?.ordenacao?.campo && ['valorTotal', 'valorMedio', 'ultimaCompra', 'quantidadeVendas', 'maiorValor'].includes(filtros.ordenacao.campo)) {
      sortClientesByCalculatedField(clientes, filtros.ordenacao.campo as keyof Cliente, filtros.ordenacao.ordem);
    }
    
    // Revalidar para garantir dados atualizados sem cache desnecessário
    revalidatePath('/clientes');
    
    return { 
      success: true, 
      clientes,
      totalPaginas
    };
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return { 
      success: false, 
      error: 'Ocorreu um erro ao buscar os clientes',
      totalPaginas: 0
    };
  }
}

// Função auxiliar para construir a ordenação
function buildOrderBy(filtros?: ClienteFiltros): Record<string, string> {
  const orderBy: Record<string, string> = {};
  
  if (filtros?.ordenacao?.campo && filtros?.ordenacao?.ordem) {
    if (!['valorTotal', 'valorMedio', 'ultimaCompra', 'quantidadeVendas', 'maiorValor'].includes(filtros.ordenacao.campo)) {
      orderBy[filtros.ordenacao.campo] = filtros.ordenacao.ordem;
    } else {
      // Ordenação padrão para campos calculados, será aplicada após a consulta
      orderBy.nome = 'asc';
    }
  } else {
    orderBy.nome = 'asc';
  }
  
  return orderBy;
}

// Função auxiliar para ordenação por campos calculados
function sortClientesByCalculatedField(clientes: Cliente[], campo: keyof Cliente, direcao: string): void {
  clientes.sort((a, b) => {
    const valorA = a[campo];
    const valorB = b[campo];
    
    if (valorA instanceof Date && valorB instanceof Date) {
      return direcao === 'asc' 
        ? valorA.getTime() - valorB.getTime()
        : valorB.getTime() - valorA.getTime();
    } else {
      const numA = valorA === null || valorA === undefined ? -Infinity : Number(valorA);
      const numB = valorB === null || valorB === undefined ? -Infinity : Number(valorB);
      
      return direcao === 'asc' ? numA - numB : numB - numA;
    }
  });
}

/**
 * Busca um cliente específico pelo ID e calcula suas métricas
 */
export async function getClienteById(id: string) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    // Otimização: usar select em vez de include para reduzir dados retornados
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        segmento: true,
        cnpj: true,
        razaoSocial: true,
        createdAt: true,
        origem: true,
        user_ns: true,
        email: true,
        vendas: {
          select: {
            id: true,
            valorTotal: true,
            createdAt: true,
            vendaRecorrente: true,
            produtos: {
              select: {
                produto: {
                  select: {
                    id: true,
                    nome: true
                  }
                },
                quantidade: true
              }
            }
          }
        },
        // Incluir cotações para considerar nos cálculos
        Cotacao: {
          select: {
            id: true,
            valorTotal: true,
            createdAt: true,
            vendaRecorrente: true,
            status: true,
            produtos: {
              select:{
                produto: {
                  select: {
                    id: true,
                    nome: true
                  }
                },
                quantidade: true
              }
            }
          }
        },
        // Incluir não-vendas para considerar nos cálculos
        naoVendas: {
          select: {
            id: true,
            valorTotal: true,
            createdAt: true,
            produtos: {
              select: {
                produto: {
                  select: {
                    id: true,
                    nome: true
                  }
                },
                quantidade: true
              }
            }
          }
        }
      }
    });

    if (!cliente) {
      return { success: false, error: 'Cliente não encontrado' };
    }

    // Otimização: Calcular tudo em um único loop
    let valorTotal = 0;
    let maiorValor = 0;
    let ultimaCompraTimestamp = 0;
    const produtosContagem: Record<string, number> = {};
    
    // Considerar vendas normais
    const vendas = cliente.vendas || [];
    const cotacoes = cliente.Cotacao || [];
    const naoVendas = cliente.naoVendas || [];
    const datasCompra: Date[] = [];
    
    // Processar vendas
    vendas.forEach(venda => {
      valorTotal += venda.valorTotal;
      maiorValor = Math.max(maiorValor, venda.valorTotal);
      ultimaCompraTimestamp = Math.max(ultimaCompraTimestamp, venda.createdAt.getTime());
      datasCompra.push(venda.createdAt);
      
      venda.produtos.forEach(p => {
        const nomeProduto = p.produto.nome;
        produtosContagem[nomeProduto] = (produtosContagem[nomeProduto] || 0) + p.quantidade;
      });
    });
    
    // Processar cotações (considerar TODAS, independentemente do status)
    cotacoes.forEach((cotacao: CotacaoPrisma) => {
      // Adicionar à lista de interações para considerar nas datas
      datasCompra.push(cotacao.createdAt);
      ultimaCompraTimestamp = Math.max(ultimaCompraTimestamp, cotacao.createdAt.getTime());
      
      // Considerar TODAS as cotações no valor total, não apenas as finalizadas
      valorTotal += cotacao.valorTotal;
      maiorValor = Math.max(maiorValor, cotacao.valorTotal);
      
      cotacao.produtos.forEach(p => {
        const nomeProduto = p.produto.nome;
        produtosContagem[nomeProduto] = (produtosContagem[nomeProduto] || 0) + p.quantidade;
      });
    });
    
    // Processar não-vendas (agora também considerando o valor)
    naoVendas.forEach((naoVenda: NaoVendaPrisma) => {
      // Adicionar à lista de interações para datas
      datasCompra.push(naoVenda.createdAt);
      ultimaCompraTimestamp = Math.max(ultimaCompraTimestamp, naoVenda.createdAt.getTime());
      
      // Incluir valor das não-vendas no cálculo
      valorTotal += naoVenda.valorTotal;
      maiorValor = Math.max(maiorValor, naoVenda.valorTotal);
      
      // Contar produtos para estatísticas
      naoVenda.produtos.forEach(p => {
        const nomeProduto = p.produto.nome;
        produtosContagem[nomeProduto] = (produtosContagem[nomeProduto] || 0) + p.quantidade;
      });
    });
    
    // Atualizar cálculo do valor médio para considerar todas as interações
    
    // Processar cotações (considerar apenas as finalizadas para cálculos de valor)
    cotacoes.forEach((cotacao: CotacaoPrisma) => {
      // Adicionar à lista de interações para considerar nas datas
      datasCompra.push(cotacao.createdAt);
      ultimaCompraTimestamp = Math.max(ultimaCompraTimestamp, cotacao.createdAt.getTime());
      
      // Considerar cotações finalizadas no valor total
      if (cotacao.status === 'finalizada') {
        valorTotal += cotacao.valorTotal;
        maiorValor = Math.max(maiorValor, cotacao.valorTotal);
        
        cotacao.produtos.forEach(p => {
          const nomeProduto = p.produto.nome;
          produtosContagem[nomeProduto] = (produtosContagem[nomeProduto] || 0) + p.quantidade;
        });
      }
    });
    
    // Processar não-vendas (considerar para interações, não para valores)
    naoVendas.forEach((naoVenda: NaoVendaPrisma) => {
      // Adicionar à lista de interações para datas
      datasCompra.push(naoVenda.createdAt);
      ultimaCompraTimestamp = Math.max(ultimaCompraTimestamp, naoVenda.createdAt.getTime());
      
      // Contar produtos para estatísticas
      naoVenda.produtos.forEach(p => {
        const nomeProduto = p.produto.nome;
        produtosContagem[nomeProduto] = (produtosContagem[nomeProduto] || 0) + p.quantidade;
      });
    });
    
    // Total de todas as interações (vendas + cotações + não-vendas)
    const totalInteracoes = vendas.length + cotacoes.length + naoVendas.length;
    
    // Calcular valor médio considerando apenas vendas e cotações finalizadas
    const cotacoesFinalizadas = cotacoes.filter(c => c.status === 'finalizada');
    const totalTransacoes = vendas.length + cotacoesFinalizadas.length;
    const valorMedio = totalTransacoes > 0 ? valorTotal / totalTransacoes : 0;
    
    // Produto mais comprado
    let produtoMaisComprado: string | undefined = undefined;
    let maxContagem = 0;
    
    Object.entries(produtosContagem).forEach(([produto, contagem]) => {
      if (contagem > maxContagem) {
        maxContagem = contagem;
        produtoMaisComprado = produto;
      }
    });
    
    // Última interação (compra, cotação ou não-venda)
    const ultimaInteracao = ultimaCompraTimestamp > 0 
      ? new Date(ultimaCompraTimestamp)
      : null;
    
    // Calcular recorrência
    const recorrente = vendas.some(v => v.vendaRecorrente) || cotacoes.some(c => c.vendaRecorrente);
    
    // Calcular dias desde última interação
    const diasDesdeUltimaInteracao = ultimaInteracao 
      ? differenceInDays(new Date(), ultimaInteracao) 
      : 999;
    
    // Calcular frequência média de compra
    let freqCompra: number | undefined = undefined;
    if (datasCompra.length > 1) {
      // Ordenar datas de compra
      const datasOrdenadas = [...datasCompra].sort((a, b) => a.getTime() - b.getTime());
      
      // Calcular diferenças entre compras consecutivas
      let somaIntervalo = 0;
      for (let i = 1; i < datasOrdenadas.length; i++) {
        somaIntervalo += differenceInDays(datasOrdenadas[i], datasOrdenadas[i-1]);
      }
      
      freqCompra = Math.round(somaIntervalo / (datasOrdenadas.length - 1));
    }
    
    // Calcular score do cliente (baseado em recência, frequência e valor)
    let score = 0;
    
    // Componente de recência (30% do score)
    if (diasDesdeUltimaInteracao <= 30) score += 30;
    else if (diasDesdeUltimaInteracao <= 90) score += 20;
    else if (diasDesdeUltimaInteracao <= 180) score += 10;
    
    // Componente de frequência (30% do score) - considerando todas as interações
    if (totalInteracoes >= 10) score += 30;
    else if (totalInteracoes >= 5) score += 20;
    else if (totalInteracoes >= 2) score += 10;
    
    // Componente de valor (40% do score)
    if (valorTotal >= 50000) score += 40;
    else if (valorTotal >= 10000) score += 30;
    else if (valorTotal >= 5000) score += 20;
    else if (valorTotal >= 1000) score += 10;

    // Converter para o tipo Cliente
    const clienteComMetricas: Cliente = {
      id: cliente.id,
      nome: cliente.nome,
      segmento: cliente.segmento,
      cnpj: cliente.cnpj,
      razaoSocial: cliente.razaoSocial || undefined,
      valorTotal,
      valorMedio,
      ultimaCompra: ultimaInteracao,
      quantidadeVendas: totalInteracoes, 
      recorrente,
      produtoMaisComprado,
      dataCadastro: cliente.createdAt,
      freqCompra,
      maiorValor,
      diasDesdeUltimaCompra: diasDesdeUltimaInteracao, 
      score,
      origem: cliente.origem || "sistema", 
      user_ns: cliente.user_ns || undefined, 
      email: cliente.email || undefined  
    };

    // Revalidar para garantir dados atualizados
    revalidatePath(`/clientes`);
    
    return { success: true, cliente: clienteComMetricas };
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return { success: false, error: 'Ocorreu um erro ao buscar o cliente' };
  }
}

/**
 * Busca as vendas de um cliente específico
 */
export async function getVendasCliente(clienteId: string) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    // Otimização: usar select em vez de include para dados menores
    const vendas = await prisma.venda.findMany({
      where: { clienteId },
      select: {
        id: true,
        codigoVenda: true,
        createdAt: true,
        clienteId: true,
        valorTotal: true,
        cliente: {
          select: {
            nome: true,
            cnpj: true
          }
        },
        vendedor: {
          select: {
            id: true,
            name: true,
          }
        },
        produtos: {
          select: {
            quantidade: true,
            valor: true,
            produto: {
              select: {
                id: true,
                nome: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Mapear para formato esperado pela UI
    const vendasMapeadas = vendas.map(venda => ({
      id: venda.id,
      codigo: venda.codigoVenda,
      data: venda.createdAt,
      clienteId: venda.clienteId,
      clienteNome: venda.cliente.nome,
      vendedorNome: venda.vendedor.name,
      cnpj: venda.cliente.cnpj,
      valorTotal: venda.valorTotal,
      status: "aprovada" as const,
      produtos: venda.produtos.map(p => ({
        id: p.produto.id,
        nome: p.produto.nome,
        quantidade: p.quantidade,
        valorUnitario: p.valor / p.quantidade,
        valorTotal: p.valor
      }))
    }));

    // Revalidar para garantir dados atualizados
    revalidatePath(`/clientes`);
    
    return { success: true, vendas: vendasMapeadas };
  } catch (error) {
    console.error('Erro ao buscar vendas do cliente:', error);
    return { success: false, error: 'Ocorreu um erro ao buscar as vendas do cliente' };
  }
}

/**
 * Busca todos os segmentos disponíveis
 */
export async function getSegmentos() {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    // Otimização: executar consultas em paralelo
    const [segmentos, catalogoSegmentos] = await Promise.all([
      prisma.cliente.groupBy({
        by: ['segmento'],
      }),
      prisma.catalogoSegmento.findMany({
        select: {
          nome: true
        }
      })
    ]);
    
    // Combinar informações de forma mais eficiente
    const segmentosUnicos = [...new Set([
      ...segmentos.map(s => s.segmento),
      ...catalogoSegmentos.map(s => s.nome)
    ])];

    // Revalidar para garantir dados atualizados
    revalidatePath('/clientes');
    
    return { success: true, segmentos: segmentosUnicos };
  } catch (error) {
    console.error('Erro ao buscar segmentos:', error);
    return { success: false, error: 'Ocorreu um erro ao buscar os segmentos' };
  }
}

/**
 * Obtém estatísticas gerais de clientes
 */
export async function getEstatisticasClientes() {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    // Otimização: buscar clientes com vendas, cotações e não-vendas em uma única consulta
    const clientes = await prisma.cliente.findMany({
      select: {
        id: true,
        nome: true,
        segmento: true,
        createdAt: true,
        vendas: {
          select: {
            id: true,
            valorTotal: true,
            createdAt: true,
            vendaRecorrente: true
          }
        },
        Cotacao: {
          select: {
            id: true,
            valorTotal: true,
            createdAt: true,
            vendaRecorrente: true,
            status: true
          }
        },
        naoVendas: {
          select: {
            id: true,
            valorTotal: true,
            createdAt: true
          }
        }
      }
    });
    
    // Estrutura para processamento otimizado
    const hoje = new Date();
    const totalClientes = clientes.length;
    let valorTotalGeral = 0;
    let clientesRecorrentes = 0;
    let clientesInativos = 0;
    let clientesNovos30Dias = 0;
    let somaFrequencia = 0;
    let contadorClientesComFrequencia = 0;
    
    // Mapear clientes por segmento para processamento eficiente
    const segmentosMap = new Map<string, { nome: string, quantidadeClientes: number, valorTotal: number }>();
    const clienteValorMap: Array<{id: string, nome: string, valorTotal: number}> = [];
    
    // Processar todos os clientes em uma única passagem
    clientes.forEach(cliente => {
      const vendas = cliente.vendas || [];
      const cotacoes = cliente.Cotacao || [];
      const naoVendas = cliente.naoVendas || [];
      
      // Verificar se é recorrente (através de vendas ou cotações)
      const ehRecorrente = 
        vendas.some(v => v.vendaRecorrente) || 
        cotacoes.some(c => c.vendaRecorrente);
        
      if (ehRecorrente) clientesRecorrentes++;
      
      // Calcular valor total do cliente (incluindo todas as interações)
      let valorTotalCliente = 0;
      
      vendas.forEach(venda => {
        valorTotalCliente += venda.valorTotal;
      });
      
      cotacoes.forEach(cotacao => {
        valorTotalCliente += cotacao.valorTotal;
      });
      
      naoVendas.forEach(naoVenda => {
        valorTotalCliente += naoVenda.valorTotal;
      });
      
      valorTotalGeral += valorTotalCliente;
      
      // Adicionar ao mapa de valor para encontrar top clientes
      clienteValorMap.push({
        id: cliente.id,
        nome: cliente.nome,
        valorTotal: valorTotalCliente
      });
      
      // Verificar se é inativo (sem interações há mais de 90 dias)
      const todasInteracoes = [
        ...vendas.map(v => v.createdAt),
        ...cotacoes.map(c => c.createdAt),
        ...naoVendas.map(nv => nv.createdAt)
      ];
      
      if (todasInteracoes.length === 0) {
        clientesInativos++;
      } else {
        // Encontrar última interação
        const ultimaInteracao = new Date(Math.max(...todasInteracoes.map(data => data.getTime())));
        const diasDesdeUltimaInteracao = differenceInDays(hoje, ultimaInteracao);
        
        if (diasDesdeUltimaInteracao > 90) {
          clientesInativos++;
        }
      }
      
      // Verificar se é cliente novo (últimos 30 dias)
      if (differenceInDays(hoje, cliente.createdAt) <= 30) {
        clientesNovos30Dias++;
      }
      
      // Calcular frequência média se tiver mais de uma interação
      if (todasInteracoes.length > 1) {
        const datasOrdenadas = [...todasInteracoes].sort((a, b) => a.getTime() - b.getTime());
        
        let somaIntervalo = 0;
        for (let i = 1; i < datasOrdenadas.length; i++) {
          somaIntervalo += differenceInDays(datasOrdenadas[i], datasOrdenadas[i-1]);
        }
        
        somaFrequencia += somaIntervalo / (datasOrdenadas.length - 1);
        contadorClientesComFrequencia++;
      }
      
      // Processar segmento
      const segmento = cliente.segmento;
      if (!segmentosMap.has(segmento)) {
        segmentosMap.set(segmento, {
          nome: segmento,
          quantidadeClientes: 0,
          valorTotal: 0
        });
      }
      
      const segmentoInfo = segmentosMap.get(segmento)!;
      segmentoInfo.quantidadeClientes++;
      segmentoInfo.valorTotal += valorTotalCliente;
    });
    
    // Calcular estatísticas finais
    const clientesNaoRecorrentes = totalClientes - clientesRecorrentes;
    const valorMedio = totalClientes > 0 ? valorTotalGeral / totalClientes : 0;
    const frequenciaMedia = contadorClientesComFrequencia > 0 
      ? Math.round(somaFrequencia / contadorClientesComFrequencia)
      : 0;
    
    // Ordenar e filtrar top 5 clientes
    const clientesMaisValiosos = clienteValorMap
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 5)
      .filter(c => c.valorTotal > 0);
    
    // Converter mapa de segmentos para array
    const segmentos = Array.from(segmentosMap.values());

    // Revalidar para garantir dados atualizados
    revalidatePath('/clientes');
    
    return { 
      success: true, 
      estatisticas: {
        totalClientes,
        clientesRecorrentes,
        clientesNaoRecorrentes,
        valorTotalGeral,
        valorMedio,
        clientesMaisValiosos,
        segmentos,
        clientesInativos,
        frequenciaMedia,
        clientesNovos30Dias
      }
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de clientes:', error);
    return { success: false, error: 'Ocorreu um erro ao obter estatísticas de clientes' };
  }
}

/**
 * Cria um novo cliente
 */
export async function criarCliente(data: ClienteParams) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    return { success: false, error: 'Você precisa estar autenticado para realizar esta ação' };
  }

  try {
    // Verificar se já existe cliente com mesmo CNPJ
    const clienteExistente = await prisma.cliente.findFirst({
      where: { cnpj: data.cnpj },
      select: { id: true } // Otimização: buscar apenas o ID necessário
    });

    if (clienteExistente) {
      return { success: false, error: 'Já existe um cliente com este CNPJ' };
    }

    // Criar novo cliente com apenas os campos que existem no modelo Prisma
    const cliente = await prisma.cliente.create({
      data: {
        nome: data.nome || '',
        segmento: data.segmento || '',
        cnpj: data.cnpj || '',
        razaoSocial: data.razaoSocial || null,
        createdById: session.user.id,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        origem: data.origem || 'sistema'
      }
    });

    // Sincronizar com TalkBI
    await sincronizarClienteTalkBI(cliente.id);

    // Revalidar para garantir que a UI mostre os dados atualizados
    revalidatePath('/clientes');
    return { success: true, cliente };
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return { success: false, error: 'Ocorreu um erro ao criar o cliente' };
  }
}

/**
 * Atualiza um cliente existente
 */
export async function atualizarCliente(id: string, data: ClienteParams) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    return { success: false, error: 'Você precisa estar autenticado para realizar esta ação' };
  }

  try {
    // Verificações em paralelo
    const [clienteExistente, clienteComMesmoCNPJ] = await Promise.all([
      // Verificar se o cliente existe
      prisma.cliente.findUnique({
        where: { id },
        select: { id: true } // Otimização: buscar apenas o ID necessário
      }),
      
      // Verificar se o CNPJ não conflita com outro cliente
      prisma.cliente.findFirst({
        where: { 
          cnpj: data.cnpj,
          id: { not: id }
        },
        select: { id: true } // Otimização: buscar apenas o ID necessário
      })
    ]);

    if (!clienteExistente) {
      return { success: false, error: 'Cliente não encontrado' };
    }

    if (clienteComMesmoCNPJ) {
      return { success: false, error: 'Já existe outro cliente com este CNPJ' };
    }

    // Atualizar cliente com apenas os campos que existem no modelo Prisma
    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nome: data.nome,
        segmento: data.segmento,
        cnpj: data.cnpj,
        razaoSocial: data.razaoSocial || null,
        editedById: session.user.id,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        // Não atualizamos a origem para preservar
      }
    });

    // Sincronizar com TalkBI (mesmo se a origem for "sistema")
    await sincronizarClienteTalkBI(cliente.id);

    // Revalidar para garantir que a UI mostre os dados atualizados
    revalidatePath('/clientes');
    return { success: true, cliente };
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return { success: false, error: 'Ocorreu um erro ao atualizar o cliente' };
  }
}

/**
 * Exclui um cliente
 */
export async function excluirCliente(id: string) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    return { success: false, error: 'Você precisa estar autenticado para realizar esta ação' };
  }

  // Verificar se é admin
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Apenas administradores podem excluir clientes' };
  }

  try {
    // Verificar se o cliente existe e se tem vendas/Venda-Perdidas/cotações associadas
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            vendas: true,
            naoVendas: true,
            Cotacao: true // Verificar cotações também
          }
        }
      }
    });

    if (!clienteExistente) {
      return { success: false, error: 'Cliente não encontrado' };
    }

    // Verificar se há registros associados
    const totalAssociacoes = 
      clienteExistente._count.vendas + 
      clienteExistente._count.naoVendas + 
      clienteExistente._count.Cotacao;
      
    if (totalAssociacoes > 0) {
      return { 
        success: false, 
        error: `Não é possível excluir um cliente com ${totalAssociacoes} registros associados (vendas, cotações ou vendas-perdidas)` 
      };
    }

    // Excluir cliente
    await prisma.cliente.delete({
      where: { id }
    });

    // Revalidar para garantir que a UI mostre os dados atualizados
    revalidatePath('/clientes');
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    return { success: false, error: 'Ocorreu um erro ao excluir o cliente' };
  }
}

export async function getDadosMensaisComparacao() {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    // Buscar todas as vendas de uma vez para processar em memória
    const vendas = await prisma.venda.findMany({
      select: {
        id: true,
        valorTotal: true,
        createdAt: true,
        clienteId: true,
        vendaRecorrente: true,
        cliente: {
          select: {
            segmento: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Agrupar vendas por mês usando um Map para melhor performance
    const vendasPorMesMap = new Map<string, {
      mes: string;
      novosClientes: Set<string>; // Usar Set para garantir unicidade
      clientesRecorrentes: number;
      clientesNaoRecorrentes: number;
      valorTotal: number;
      segmentos: Record<string, number>;
    }>();

    // Processar todas as vendas em uma única passagem
    vendas.forEach(venda => {
      const data = venda.createdAt;
      const mes = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
      
      // Inicializar o objeto para o mês se não existir
      if (!vendasPorMesMap.has(mes)) {
        vendasPorMesMap.set(mes, {
          mes,
          novosClientes: new Set<string>(),
          clientesRecorrentes: 0,
          clientesNaoRecorrentes: 0,
          valorTotal: 0,
          segmentos: {}
        });
      }
      
      const dadosMes = vendasPorMesMap.get(mes)!;
      
      // Adicionar cliente ao conjunto de clientes únicos do mês
      dadosMes.novosClientes.add(venda.clienteId);
      
      // Incrementar contadores de recorrência
      if (venda.vendaRecorrente) {
        dadosMes.clientesRecorrentes += 1;
      } else {
        dadosMes.clientesNaoRecorrentes += 1;
      }
      
      // Somar valor total
      dadosMes.valorTotal += venda.valorTotal;
      
      // Processar segmentos
      const segmento = venda.cliente.segmento;
      dadosMes.segmentos[segmento] = (dadosMes.segmentos[segmento] || 0) + 1;
    });

    // Converter o Map para array e formatar a saída
    const dadosFormatados = Array.from(vendasPorMesMap.values()).map(item => ({
      mes: item.mes,
      novosClientes: item.novosClientes.size,
      clientesRecorrentes: item.clientesRecorrentes,
      clientesNaoRecorrentes: item.clientesNaoRecorrentes,
      valorTotal: item.valorTotal,
      segmentos: item.segmentos
    }));

    // Revalidar para garantir dados atualizados
    revalidatePath('/clientes');
    
    return { success: true, dados: dadosFormatados };
  } catch (error) {
    console.error('Erro ao buscar dados mensais:', error);
    return { success: false, error: 'Ocorreu um erro ao buscar os dados mensais' };
  }
}
export async function getClientesRecorrentes() {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    console.log("🔍 Iniciando busca de clientes recorrentes...");
    
    // ✅ CORREÇÃO: Buscar clientes marcados diretamente como recorrentes OU que têm vendas recorrentes
    const [clientesRecorrentesCampo, clientesRecorrentesVendas] = await Promise.all([
      // Clientes marcados como recorrentes
      prisma.cliente.findMany({
        where: {
          recorrente: true
        },
        select: {
          id: true,
          nome: true,
          cnpj: true,
          segmento: true,
          razaoSocial: true,
          whatsapp: true,
          recorrente: true,
        },
      }),
      
      // Clientes que têm vendas recorrentes (fallback)
      prisma.cliente.findMany({
        where: {
          vendas: {
            some: {
              vendaRecorrente: true
            }
          }
        },
        select: {
          id: true,
          nome: true,
          cnpj: true,
          segmento: true,
          razaoSocial: true,
          whatsapp: true,
          recorrente: true,
        },
      })
    ]);

    // ✅ Combinar resultados e remover duplicatas
    const clientesUnicos = new Map();
    
    [...clientesRecorrentesCampo, ...clientesRecorrentesVendas].forEach(cliente => {
      clientesUnicos.set(cliente.id, cliente);
    });
    
    const clientesRecorrentes = Array.from(clientesUnicos.values());
    
    console.log("📊 Clientes recorrentes encontrados:", {
      porCampo: clientesRecorrentesCampo.length,
      porVendas: clientesRecorrentesVendas.length,
      total: clientesRecorrentes.length
    });

    // Mapear para o tipo ClienteRecorrente
    const clientesMapeados = clientesRecorrentes.map(cliente => ({
      id: cliente.id,
      nome: cliente.nome,
      cnpj: cliente.cnpj,
      segmento: cliente.segmento,
      razaoSocial: cliente.razaoSocial || "",
      whatsapp: cliente.whatsapp || "",
      recorrente: cliente.recorrente,
    }));

    console.log("✅ Clientes mapeados:", clientesMapeados);

    return { success: true, clientes: clientesMapeados };
  } catch (error) {
    console.error('💥 Erro ao buscar clientes recorrentes:', error);
    return { error: 'Ocorreu um erro ao buscar os clientes recorrentes', clientes: [] };
  }
}

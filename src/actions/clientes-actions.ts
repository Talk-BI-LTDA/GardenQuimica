// actions/clientes-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/supabase/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { differenceInDays } from 'date-fns'
import { Cliente, ClienteParams, ClienteFiltros } from '@/types/cliente'
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
      
      // Busca principal de clientes com suas vendas
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
                  }
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
    const clientes = clientesDB.map(cliente => {
      // Calcular valor total e médio em uma única passagem
      const vendas = cliente.vendas || [];
      let valorTotal = 0;
      let maiorValor = 0;
      let ultimaCompraTimestamp = 0;
      const produtosContagem: Record<string, number> = {};
      
      vendas.forEach(venda => {
        // Valor total e maior valor
        valorTotal += venda.valorTotal;
        maiorValor = Math.max(maiorValor, venda.valorTotal);
        
        // Última compra
        ultimaCompraTimestamp = Math.max(ultimaCompraTimestamp, venda.createdAt.getTime());
        
        // Produtos
        venda.produtos.forEach(p => {
          const nomeProduto = p.produto.nome;
          produtosContagem[nomeProduto] = (produtosContagem[nomeProduto] || 0) + 1;
        });
      });
      
      const valorMedio = vendas.length > 0 ? valorTotal / vendas.length : 0;
      
      // Produto mais comprado
      let produtoMaisComprado: string | undefined = undefined;
      let maxContagem = 0;
      
      Object.entries(produtosContagem).forEach(([produto, contagem]) => {
        if (contagem > maxContagem) {
          maxContagem = contagem;
          produtoMaisComprado = produto;
        }
      });
      
      // Última compra
      const ultimaCompra = ultimaCompraTimestamp > 0 
        ? new Date(ultimaCompraTimestamp)
        : null;
      
      // Calcular recorrência
      const recorrente = vendas.some(v => v.vendaRecorrente);
      
      // Calcular dias desde última compra
      const diasDesdeUltimaCompra = ultimaCompra 
        ? differenceInDays(new Date(), ultimaCompra) 
        : 999;
      
      // Calcular frequência média de compra
      let freqCompra: number | undefined = undefined;
      if (vendas.length > 1) {
        // Ordenar datas de compra
        const datasCompra = vendas.map(v => v.createdAt);
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
      if (diasDesdeUltimaCompra <= 30) score += 30;
      else if (diasDesdeUltimaCompra <= 90) score += 20;
      else if (diasDesdeUltimaCompra <= 180) score += 10;
      
      // Componente de frequência (30% do score)
      if (vendas.length >= 10) score += 30;
      else if (vendas.length >= 5) score += 20;
      else if (vendas.length >= 2) score += 10;
      
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
        ultimaCompra,
        quantidadeVendas: vendas.length,
        recorrente,
        produtoMaisComprado,
        dataCadastro: cliente.createdAt,
        freqCompra,
        maiorValor,
        diasDesdeUltimaCompra,
        score
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
    const vendas = cliente.vendas || [];
    const datasCompra: Date[] = [];
    
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
    
    const valorMedio = vendas.length > 0 ? valorTotal / vendas.length : 0;
    
    // Produto mais comprado
    let produtoMaisComprado: string | undefined = undefined;
    let maxContagem = 0;
    
    Object.entries(produtosContagem).forEach(([produto, contagem]) => {
      if (contagem > maxContagem) {
        maxContagem = contagem;
        produtoMaisComprado = produto;
      }
    });
    
    // Última compra
    const ultimaCompra = ultimaCompraTimestamp > 0 
      ? new Date(ultimaCompraTimestamp)
      : null;
    
    // Calcular recorrência
    const recorrente = vendas.some(v => v.vendaRecorrente);
    
    // Calcular dias desde última compra
    const diasDesdeUltimaCompra = ultimaCompra 
      ? differenceInDays(new Date(), ultimaCompra) 
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
    if (diasDesdeUltimaCompra <= 30) score += 30;
    else if (diasDesdeUltimaCompra <= 90) score += 20;
    else if (diasDesdeUltimaCompra <= 180) score += 10;
    
    // Componente de frequência (30% do score)
    if (vendas.length >= 10) score += 30;
    else if (vendas.length >= 5) score += 20;
    else if (vendas.length >= 2) score += 10;
    
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
      ultimaCompra,
      quantidadeVendas: vendas.length,
      recorrente,
      produtoMaisComprado,
      dataCadastro: cliente.createdAt,
      freqCompra,
      maiorValor,
      diasDesdeUltimaCompra,
      score
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
    // Otimização: buscar clientes com vendas em uma única consulta mais eficiente
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
      const vendas = cliente.vendas;
      
      // Verificar se é recorrente
      const ehRecorrente = vendas.some(v => v.vendaRecorrente);
      if (ehRecorrente) clientesRecorrentes++;
      
      // Calcular valor total do cliente
      let valorTotalCliente = 0;
      vendas.forEach(venda => {
        valorTotalCliente += venda.valorTotal;
      });
      valorTotalGeral += valorTotalCliente;
      
      // Adicionar ao mapa de valor para encontrar top clientes
      clienteValorMap.push({
        id: cliente.id,
        nome: cliente.nome,
        valorTotal: valorTotalCliente
      });
      
      // Verificar se é inativo (sem compras há mais de 90 dias)
      if (vendas.length === 0) {
        clientesInativos++;
      } else {
        // Encontrar última compra
        const ultimaCompra = new Date(Math.max(...vendas.map(v => v.createdAt.getTime())));
        const diasDesdeUltimaCompra = differenceInDays(hoje, ultimaCompra);
        
        if (diasDesdeUltimaCompra > 90) {
          clientesInativos++;
        }
      }
      
      // Verificar se é cliente novo (últimos 30 dias)
      if (differenceInDays(hoje, cliente.createdAt) <= 30) {
        clientesNovos30Dias++;
      }
      
      // Calcular frequência média se tiver mais de uma venda
      if (vendas.length > 1) {
        const datasCompra = vendas.map(v => v.createdAt);
        const datasOrdenadas = [...datasCompra].sort((a, b) => a.getTime() - b.getTime());
        
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
        valorTotal: valorTotalGeral,
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
      }
    });

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
      }
    });

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
    // Verificar se o cliente existe e se tem vendas/Venda-Perdidas associadas
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            vendas: true,
            naoVendas: true
          }
        }
      }
    });

    if (!clienteExistente) {
      return { success: false, error: 'Cliente não encontrado' };
    }

    // Verificar se há vendas associadas
    if (clienteExistente._count.vendas > 0 || clienteExistente._count.naoVendas > 0) {
      return { success: false, error: 'Não é possível excluir um cliente com vendas ou Venda-Perdidas associadas' };
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
    // Buscar clientes marcados como recorrentes (em vendas recorrentes)
    const clientesRecorrentes = await prisma.cliente.findMany({
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
      },
      orderBy: {
        nome: 'asc',
      },
    });

    // Mapear para o tipo ClienteRecorrente
    const clientesMapeados = clientesRecorrentes.map(cliente => ({
      id: cliente.id,
      nome: cliente.nome,
      cnpj: cliente.cnpj,
      segmento: cliente.segmento,
      razaoSocial: cliente.razaoSocial || "",
      whatsapp: cliente.whatsapp || ""
    }));

    return { success: true, clientes: clientesMapeados };
  } catch (error) {
    console.error('Erro ao buscar clientes recorrentes:', error);
    return { error: 'Ocorreu um erro ao buscar os clientes recorrentes', clientes: [] };
  }
}
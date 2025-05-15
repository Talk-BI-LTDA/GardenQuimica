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
        }
      })
      
      const clienteIds = [...new Set(clientesComCompraNoIntervalo.map(c => c.clienteId))]
      
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
      
      // Encontrar clientes com vendas recorrentes
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
    
    // Contar total para paginação
    const totalClientes = await prisma.cliente.count({ where })
    const totalPaginas = filtros?.itensPorPagina 
      ? Math.ceil(totalClientes / filtros.itensPorPagina) 
      : 1
      
    // Construir ordenação
    const orderBy: Record<string, string> = {};
    if (filtros?.ordenacao?.campo && filtros?.ordenacao?.ordem) {
      // Para ordenar por campos calculados como valorTotal, precisamos de abordagem diferente
      if (['valorTotal', 'valorMedio', 'ultimaCompra', 'quantidadeVendas', 'maiorValor'].includes(filtros.ordenacao.campo)) {
        // Ordenação baseada em campos calculados será aplicada após a consulta
      } else {
        // Ordenação direta para campos simples
        orderBy[filtros.ordenacao.campo] = filtros.ordenacao.ordem
      }
    } else {
      // Ordenação padrão
      orderBy.nome = 'asc'
    }
    
    // Aplicar paginação
    const skip = filtros?.pagina && filtros?.itensPorPagina 
      ? (filtros.pagina - 1) * filtros.itensPorPagina 
      : undefined
    const take = filtros?.itensPorPagina || undefined
      
    // Otimização: Reduzir a quantidade de dados retornados em cada consulta
    const clientesDB = await prisma.cliente.findMany({
      where,
      orderBy,
      skip,
      take,
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
    });
    
    // Calcular dados adicionais para cada cliente - otimizado para reduzir cálculos repetidos
    const clientes = clientesDB.map(cliente => {
      // Calcular valor total e médio
      let valorTotal = 0
      let maiorValor = 0
      const vendas = cliente.vendas || []
      
      // Calcular numa única passagem para melhorar performance
      let ultimaCompraTimestamp = 0;
      const produtosContagem: Record<string, number> = {}
      
      vendas.forEach(venda => {
        // Calcular valor total e maior valor
        valorTotal += venda.valorTotal
        if (venda.valorTotal > maiorValor) {
          maiorValor = venda.valorTotal
        }
        
        // Encontrar última compra
        const vendaTimestamp = venda.createdAt.getTime()
        if (vendaTimestamp > ultimaCompraTimestamp) {
          ultimaCompraTimestamp = vendaTimestamp
        }
        
        // Contar produtos
        venda.produtos.forEach(p => {
          const nomeProduto = p.produto.nome
          produtosContagem[nomeProduto] = (produtosContagem[nomeProduto] || 0) + 1
        })
      })
      
      const valorMedio = vendas.length > 0 ? valorTotal / vendas.length : 0
      
      // Produto mais comprado
      let produtoMaisComprado: string | undefined = undefined
      let maxContagem = 0
      
      Object.entries(produtosContagem).forEach(([produto, contagem]) => {
        if (contagem > maxContagem) {
          maxContagem = contagem
          produtoMaisComprado = produto
        }
      })
      
      // Última compra
      const ultimaCompra = ultimaCompraTimestamp > 0 
        ? new Date(ultimaCompraTimestamp)
        : null
      
      // Calcular recorrência
      const vendasRecorrentes = vendas.filter(v => v.vendaRecorrente)
      const recorrente = vendasRecorrentes.length > 0
      
      // Calcular dias desde última compra
      const diasDesdeUltimaCompra = ultimaCompra 
        ? differenceInDays(new Date(), ultimaCompra) 
        : 999
      
      // Calcular frequência média de compra
      let freqCompra: number | undefined = undefined
      if (vendas.length > 1) {
        // Ordenar datas de compra
        const datasCompra = vendas.map(v => v.createdAt)
        const datasOrdenadas = [...datasCompra].sort((a, b) => a.getTime() - b.getTime())
        
        // Calcular diferenças entre compras consecutivas
        let somaIntervalo = 0
        for (let i = 1; i < datasOrdenadas.length; i++) {
          somaIntervalo += differenceInDays(datasOrdenadas[i], datasOrdenadas[i-1])
        }
        
        freqCompra = Math.round(somaIntervalo / (datasOrdenadas.length - 1))
      }
      
      // Calcular score do cliente (baseado em recência, frequência e valor)
      let score = 0
      
      // Componente de recência (30% do score)
      if (diasDesdeUltimaCompra <= 30) score += 30
      else if (diasDesdeUltimaCompra <= 90) score += 20
      else if (diasDesdeUltimaCompra <= 180) score += 10
      
      // Componente de frequência (30% do score)
      if (vendas.length >= 10) score += 30
      else if (vendas.length >= 5) score += 20
      else if (vendas.length >= 2) score += 10
      
      // Componente de valor (40% do score)
      if (valorTotal >= 50000) score += 40
      else if (valorTotal >= 10000) score += 30
      else if (valorTotal >= 5000) score += 20
      else if (valorTotal >= 1000) score += 10
      
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
    })
    
    // Se ordenação for por campo calculado, aplicar aqui
    if (filtros?.ordenacao?.campo && ['valorTotal', 'valorMedio', 'ultimaCompra', 'quantidadeVendas', 'maiorValor'].includes(filtros.ordenacao.campo)) {
      const campo = filtros.ordenacao.campo as keyof Cliente
      const direcao = filtros.ordenacao.ordem
      
      clientes.sort((a, b) => {
        const valorA = a[campo]
        const valorB = b[campo]
        
        if (valorA instanceof Date && valorB instanceof Date) {
          return direcao === 'asc' 
            ? valorA.getTime() - valorB.getTime()
            : valorB.getTime() - valorA.getTime()
        } else {
          const numA = valorA === null || valorA === undefined ? -Infinity : Number(valorA)
          const numB = valorB === null || valorB === undefined ? -Infinity : Number(valorB)
          
          return direcao === 'asc' ? numA - numB : numB - numA
        }
      })
    }
    
    // Revalidar para garantir dados atualizados sem cache desnecessário
    revalidatePath('/clientes')
    
    return { 
      success: true, 
      clientes,
      totalPaginas
    }
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return { 
      success: false, 
      error: 'Ocorreu um erro ao buscar os clientes',
      totalPaginas: 0
    }
  }
}

/**
 * Busca um cliente específico pelo ID e calcula suas métricas
 */
export async function getClienteById(id: string) {
  // Validar autenticação
  const session = await auth()
  
  if (!session) {
    redirect('/login')
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
    })

    if (!cliente) {
      return { success: false, error: 'Cliente não encontrado' }
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
      
      if (venda.valorTotal > maiorValor) {
        maiorValor = venda.valorTotal;
      }
      
      const vendaTimestamp = venda.createdAt.getTime();
      if (vendaTimestamp > ultimaCompraTimestamp) {
        ultimaCompraTimestamp = vendaTimestamp;
      }
      
      datasCompra.push(venda.createdAt);
      
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
    const vendasRecorrentes = vendas.filter(v => v.vendaRecorrente);
    const recorrente = vendasRecorrentes.length > 0;
    
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
    
    return { success: true, cliente: clienteComMetricas }
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return { success: false, error: 'Ocorreu um erro ao buscar o cliente' }
  }
}

/**
 * Busca as vendas de um cliente específico
 */
export async function getVendasCliente(clienteId: string) {
  // Validar autenticação
  const session = await auth()
  
  if (!session) {
    redirect('/login')
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
    })

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
    }))

    // Revalidar para garantir dados atualizados
    revalidatePath(`/clientes`);
    
    return { success: true, vendas: vendasMapeadas }
  } catch (error) {
    console.error('Erro ao buscar vendas do cliente:', error)
    return { success: false, error: 'Ocorreu um erro ao buscar as vendas do cliente' }
  }
}

/**
 * Busca todos os segmentos disponíveis
 */
export async function getSegmentos() {
  // Validar autenticação
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  try {
    // Otimização: usar consulta mais direta
    const segmentos = await prisma.cliente.groupBy({
      by: ['segmento'],
    })

    // Buscar informações de catálogo de segmentos
    const catalogoSegmentos = await prisma.catalogoSegmento.findMany({
      select: {
        nome: true
      }
    })
    
    // Combinar informações
    const segmentosUnicos = [...new Set([
      ...segmentos.map(s => s.segmento),
      ...catalogoSegmentos.map(s => s.nome)
    ])]

    // Revalidar para garantir dados atualizados
    revalidatePath('/clientes');
    
    return { success: true, segmentos: segmentosUnicos }
  } catch (error) {
    console.error('Erro ao buscar segmentos:', error)
    return { success: false, error: 'Ocorreu um erro ao buscar os segmentos' }
  }
}

/**
 * Obtém estatísticas gerais de clientes
 */
export async function getEstatisticasClientes() {
  // Validar autenticação
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  try {
    // Otimização: reduzir dados buscados com select mais específico
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
    })
    
    // Calcular total de clientes
    const totalClientes = clientes.length
    
    // Identificar clientes recorrentes vs não recorrentes
    const clientesRecorrentes = clientes.filter(cliente => 
      cliente.vendas.some(v => v.vendaRecorrente)
    ).length
    
    const clientesNaoRecorrentes = totalClientes - clientesRecorrentes
    
    // Calcular valor total
    let valorTotalGeral = 0
    clientes.forEach(cliente => {
      cliente.vendas.forEach(venda => {
        valorTotalGeral += venda.valorTotal
      })
    })
    
    const valorMedio = totalClientes > 0 ? valorTotalGeral / totalClientes : 0
    
    // Identificar clientes inativos (sem compras há mais de 90 dias)
    const hoje = new Date()
    const clientesInativos = clientes.filter(cliente => {
      if (cliente.vendas.length === 0) return true
      
      // Encontrar data mais recente
      let ultimaCompraTimestamp = 0
      cliente.vendas.forEach(venda => {
        const timestamp = venda.createdAt.getTime()
        if (timestamp > ultimaCompraTimestamp) {
          ultimaCompraTimestamp = timestamp
        }
      })
      
      const ultimaCompra = new Date(ultimaCompraTimestamp)
      const diasDesdeUltimaCompra = differenceInDays(hoje, ultimaCompra)
      
      return diasDesdeUltimaCompra > 90
    }).length
    
    // Calcular frequência média de compra de forma mais eficiente
    let somaFrequencia = 0
    let contadorClientesComFrequencia = 0
    
    clientes.forEach(cliente => {
      if (cliente.vendas.length > 1) {
        const datasCompra = cliente.vendas.map(v => v.createdAt)
        const datasOrdenadas = [...datasCompra].sort((a, b) => a.getTime() - b.getTime())
        
        let somaIntervalo = 0
        for (let i = 1; i < datasOrdenadas.length; i++) {
          somaIntervalo += differenceInDays(datasOrdenadas[i], datasOrdenadas[i-1])
        }
        
        somaFrequencia += somaIntervalo / (datasOrdenadas.length - 1)
        contadorClientesComFrequencia++
      }
    })
    
    const frequenciaMedia = contadorClientesComFrequencia > 0 
      ? Math.round(somaFrequencia / contadorClientesComFrequencia)
      : 0
    
    // Identificar clientes novos (últimos 30 dias)
    const clientesNovos30Dias = clientes.filter(cliente => {
      return differenceInDays(hoje, cliente.createdAt) <= 30
    }).length
    
    // Calcular top 5 clientes por valor
    const clientesComValorTotal = clientes.map(cliente => {
      let valorTotal = 0
      cliente.vendas.forEach(venda => {
        valorTotal += venda.valorTotal
      })
      
      return {
        id: cliente.id,
        nome: cliente.nome,
        valorTotal
      }
    })
    
    const clientesMaisValiosos = clientesComValorTotal
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 5)
      .filter(c => c.valorTotal > 0)
    
    // Agrupar por segmento de forma mais eficiente
    const segmentosMap = new Map<string, { nome: string, quantidadeClientes: number, valorTotal: number }>()
    
    clientes.forEach(cliente => {
      if (!segmentosMap.has(cliente.segmento)) {
        segmentosMap.set(cliente.segmento, {
          nome: cliente.segmento,
          quantidadeClientes: 0,
          valorTotal: 0
        })
      }
      
      const segmento = segmentosMap.get(cliente.segmento)!
      segmento.quantidadeClientes++
      
      cliente.vendas.forEach(venda => {
        segmento.valorTotal += venda.valorTotal
      })
    })
    
    const segmentos = Array.from(segmentosMap.values())

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
    }
  } catch (error) {
    console.error('Erro ao obter estatísticas de clientes:', error)
    return { success: false, error: 'Ocorreu um erro ao obter estatísticas de clientes' }
  }
}

/**
 * Cria um novo cliente
 */
export async function criarCliente(data: ClienteParams) {
  // Validar autenticação
  const session = await auth()
  
  if (!session) {
    return { success: false, error: 'Você precisa estar autenticado para realizar esta ação' }
  }

  try {
    // Verificar se já existe cliente com mesmo CNPJ
    const clienteExistente = await prisma.cliente.findFirst({
      where: { cnpj: data.cnpj }
    })

    if (clienteExistente) {
      return { success: false, error: 'Já existe um cliente com este CNPJ' }
    }

    // Criar novo cliente com apenas os campos que existem no modelo Prisma
    const cliente = await prisma.cliente.create({
      data: {
        nome: data.nome || '',
        segmento: data.segmento || '',
        cnpj: data.cnpj || '',
        razaoSocial: data.razaoSocial || null,
        createdById: session.user.id,
      }
    })

    // Revalidar para garantir que a UI mostre os dados atualizados
    revalidatePath('/clientes')
    return { success: true, cliente }
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return { success: false, error: 'Ocorreu um erro ao criar o cliente' }
  }
}

/**
 * Atualiza um cliente existente
 */
export async function atualizarCliente(id: string, data: ClienteParams) {
  // Validar autenticação
  const session = await auth()
  
  if (!session) {
    return { success: false, error: 'Você precisa estar autenticado para realizar esta ação' }
  }

  try {
    // Verificar se o cliente existe
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id }
    })

    if (!clienteExistente) {
      return { success: false, error: 'Cliente não encontrado' }
    }

    // Verificar se o CNPJ não conflita com outro cliente
    const clienteComMesmoCNPJ = await prisma.cliente.findFirst({
      where: { 
        cnpj: data.cnpj,
        id: { not: id }
      }
    })

    if (clienteComMesmoCNPJ) {
      return { success: false, error: 'Já existe outro cliente com este CNPJ' }
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
      }
    })

    // Revalidar para garantir que a UI mostre os dados atualizados
    revalidatePath('/clientes')
    return { success: true, cliente }
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return { success: false, error: 'Ocorreu um erro ao atualizar o cliente' }
  }
}

/**
 * Exclui um cliente
 */
export async function excluirCliente(id: string) {
  // Validar autenticação
  const session = await auth()
  
  if (!session) {
    return { success: false, error: 'Você precisa estar autenticado para realizar esta ação' }
  }

  // Verificar se é admin
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Apenas administradores podem excluir clientes' }
  }

  try {
    // Verificar se o cliente existe
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
    })

    if (!clienteExistente) {
      return { success: false, error: 'Cliente não encontrado' }
    }

    // Verificar se há vendas associadas
    if (clienteExistente._count.vendas > 0 || clienteExistente._count.naoVendas > 0) {
      return { success: false, error: 'Não é possível excluir um cliente com vendas ou não-vendas associadas' }
    }

    // Excluir cliente
    await prisma.cliente.delete({
      where: { id }
    })

    // Revalidar para garantir que a UI mostre os dados atualizados
    revalidatePath('/clientes')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir cliente:', error)
    return { success: false, error: 'Ocorreu um erro ao excluir o cliente' }
  }
}

export async function getDadosMensaisComparacao() {
  // Validar autenticação
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  try {
    // Otimização: reduzir dados buscados com select
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

    // Agrupar vendas por mês com mapa para melhor performance
    const vendasPorMesMap = new Map<string, {
      mes: string;
      novosClientes: Set<string>; // Usado para contar clientes únicos
      clientesRecorrentes: number;
      clientesNaoRecorrentes: number;
      valorTotal: number;
      segmentos: Record<string, number>;
    }>();

    // Processar cada venda em única passagem
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
      if (!dadosMes.segmentos[segmento]) {
        dadosMes.segmentos[segmento] = 0;
      }
      dadosMes.segmentos[segmento] += 1;
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
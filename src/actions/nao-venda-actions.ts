// src/actions/nao-venda-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/supabase/prisma'
import { auth } from '@/lib/auth'
import { NaoVendaFormData } from '@/types/nao-venda'
import { naoVendaSchema } from '@/validations/nao-venda-schema'
import { redirect } from 'next/navigation'
import { gerarCodigoVenda } from '@/lib/utils'
import { FiltrosNaoVenda } from '@/types/filtros'

interface ProdutoFilter {
  some?: {
    produtoId?: string
    nomeConcorrencia?: {
      contains: string
      mode: 'insensitive'
    }
    valorConcorrencia?: {
      gte?: number
      lte?: number
    }
  }
}

interface WhereClause {
  [key: string]: unknown
  vendedorId?: string
  createdAt?: {
    gte: Date
    lte: Date
  }
  clienteId?: string
  cliente?: {
    segmento?: string
  }
  OR?: Array<{
    [key: string]: unknown
  }>
  valorTotal?: {
    gte?: number
    lte?: number
  }
  produtos?: ProdutoFilter
  condicaoPagamento?: string
  objecaoGeral?: {
    contains: string
    mode: 'insensitive'
  }
}

export async function criarNaoVenda(data: NaoVendaFormData) {
  const session = await auth()
  
  if (!session) {
    return { error: 'Você precisa estar autenticado para realizar esta ação' }
  }

  const validatedFields = naoVendaSchema.safeParse(data)
  
  if (!validatedFields.success) {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' }
  }

  try {
    const codigoVenda = gerarCodigoVenda()
    
    let cliente = await prisma.cliente.findFirst({
      where: {
        cnpj: data.cliente.cnpj,
      },
    })

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nome: data.cliente.nome,
          segmento: data.cliente.segmento,
          cnpj: data.cliente.cnpj,
          razaoSocial: data.cliente.razaoSocial,
          createdById: session.user.id,
        },
      })
    }

    const naoVenda = await prisma.naoVenda.create({
      data: {
        codigoVenda,
        valorTotal: data.valorTotal,
        condicaoPagamento: data.condicaoPagamento,
        objecaoGeral: data.objecaoGeral,
        clienteId: cliente.id,
        vendedorId: session.user.id,
        produtos: {
          create: data.produtosConcorrencia.map(item => {
            const { produtoGarden, valorConcorrencia, nomeConcorrencia, icms, objecao } = item
            
            return {
              quantidade: produtoGarden.quantidade,
              valor: produtoGarden.valor,
              medida: produtoGarden.medida,
              recorrencia: produtoGarden.recorrencia,
              valorConcorrencia,
              nomeConcorrencia,
              icms,
              objecao,
              produto: {
                connectOrCreate: {
                  where: { id: produtoGarden.id || '' },
                  create: {
                    nome: produtoGarden.nome,
                    medida: produtoGarden.medida,
                    quantidade: produtoGarden.quantidade,
                    valor: produtoGarden.valor,
                    recorrencia: produtoGarden.recorrencia,
                    createdById: session.user.id,
                  }
                }
              }
            }
          })
        }
      },
    })

    revalidatePath('/dashboard/nao-vendas')
    return { success: true, id: naoVenda.id }
  } catch (error) {
    console.error('Erro ao criar Venda perdida:', error)
    return { error: 'Ocorreu um erro ao salvar a Venda perdida' }
  }
}

export async function getNaoVendas(filtros?: FiltrosNaoVenda) {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  try {
    const where: WhereClause = {}
    
    if (session.user.role !== 'ADMIN') {
      where.vendedorId = session.user.id
    } else if (filtros?.vendedorId) {
      where.vendedorId = filtros.vendedorId
    }

    if (filtros?.dataInicio && filtros?.dataFim) {
      where.createdAt = { 
        gte: new Date(filtros.dataInicio), 
        lte: new Date(filtros.dataFim) 
      }
    }
    
    if (filtros?.clienteId) {
      where.clienteId = filtros.clienteId
    }

    if (filtros?.segmento) {
      where.cliente = { 
        segmento: filtros.segmento 
      }
    }
    
    if (filtros?.searchTerm) {
      const termo = filtros.searchTerm
      where.OR = [
        { codigoVenda: { contains: termo, mode: 'insensitive' } },
        { cliente: { nome: { contains: termo, mode: 'insensitive' } } },
        { cliente: { cnpj: { contains: termo, mode: 'insensitive' } } },
        { cliente: { razaoSocial: { contains: termo, mode: 'insensitive' } } },
        { objecaoGeral: { contains: termo, mode: 'insensitive' } }
      ]
    }
    
    if (filtros?.valorMinimo !== undefined && filtros?.valorMaximo !== undefined) {
      where.valorTotal = { 
        gte: filtros.valorMinimo, 
        lte: filtros.valorMaximo 
      }
    } else if (filtros?.valorMinimo !== undefined) {
      where.valorTotal = { 
        gte: filtros.valorMinimo 
      }
    } else if (filtros?.valorMaximo !== undefined) {
      where.valorTotal = { 
        lte: filtros.valorMaximo 
      }
    }
    
    if (filtros?.produtoId) {
      where.produtos = {
        some: { produtoId: filtros.produtoId }
      }
    }
    
    if (filtros?.condicaoPagamento) {
      where.condicaoPagamento = filtros.condicaoPagamento
    }
    
    if (filtros?.objecao) {
      where.objecaoGeral = {
        contains: filtros.objecao,
        mode: 'insensitive'
      }
    }
    
    if (filtros?.empresaConcorrente) {
      where.produtos = {
        ...where.produtos,
        some: {
          ...where.produtos?.some,
          nomeConcorrencia: {
            contains: filtros.empresaConcorrente,
            mode: 'insensitive'
          }
        }
      }
    }
    
    if (filtros?.valorConcorrenciaMin !== undefined || filtros?.valorConcorrenciaMax !== undefined) {
      const valorFilter: {
        gte?: number
        lte?: number
      } = {}
      
      if (filtros?.valorConcorrenciaMin !== undefined) {
        valorFilter.gte = filtros.valorConcorrenciaMin
      }
      
      if (filtros?.valorConcorrenciaMax !== undefined) {
        valorFilter.lte = filtros.valorConcorrenciaMax
      }
      
      where.produtos = {
        ...where.produtos,
        some: { 
          ...where.produtos?.some,
          valorConcorrencia: valorFilter
        }
      }
    }

    const orderBy: Record<string, string> = {}
    if (filtros?.sortDirection) {
      orderBy.createdAt = filtros.sortDirection
    } else {
      orderBy.createdAt = 'desc'
    }

    const naoVendas = await prisma.naoVenda.findMany({
      where,
      include: {
        cliente: true,
        vendedor: {
          select: {
            id: true,
            name: true,
          }
        },
        produtos: {
          include: {
            produto: true
          }
        },
        editedBy: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy
    })

    const naoVendasMapeadas = naoVendas.map(naoVenda => ({
      id: naoVenda.id,
      codigoVenda: naoVenda.codigoVenda,
      cliente: {
        id: naoVenda.cliente.id,
        nome: naoVenda.cliente.nome,
        segmento: naoVenda.cliente.segmento,
        cnpj: naoVenda.cliente.cnpj,
        razaoSocial: naoVenda.cliente.razaoSocial || undefined
      },
      produtosConcorrencia: naoVenda.produtos.map(p => ({
        produtoGarden: {
          id: p.produto.id,
          nome: p.produto.nome,
          medida: p.produto.medida,
          quantidade: p.quantidade,
          valor: p.valor,
          recorrencia: p.recorrencia || undefined
        },
        valorConcorrencia: p.valorConcorrencia || 0,
        nomeConcorrencia: p.nomeConcorrencia || '',
        icms: p.icms,
        objecao: p.objecao
      })),
      valorTotal: naoVenda.valorTotal,
      condicaoPagamento: naoVenda.condicaoPagamento,
      objecaoGeral: naoVenda.objecaoGeral || undefined,
      vendedorId: naoVenda.vendedorId,
      vendedorNome: naoVenda.vendedor.name,
      createdAt: naoVenda.createdAt,
      updatedAt: naoVenda.updatedAt,
      editedById: naoVenda.editedById || undefined
    }))

    return { success: true, naoVendas: naoVendasMapeadas }
  } catch (error) {
    console.error('Erro ao buscar Venda perdidas:', error)
    return { error: 'Ocorreu um erro ao buscar as Venda perdidas' }
  }
}

export async function getNaoVenda(id: string) {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  try {
    const naoVenda = await prisma.naoVenda.findUnique({
      where: { id },
      include: {
        cliente: true,
        vendedor: {
          select: {
            id: true,
            name: true,
          }
        },
        produtos: {
          include: {
            produto: true
          }
        },
        editedBy: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!naoVenda) {
      return { error: 'Venda perdida não encontrada' }
    }

    if (session.user.role !== 'ADMIN' && naoVenda.vendedorId !== session.user.id) {
      return { error: 'Você não tem permissão para visualizar esta Venda perdida' }
    }

    return { success: true, naoVenda }
  } catch (error) {
    console.error('Erro ao buscar Venda perdida:', error)
    return { error: 'Ocorreu um erro ao buscar a Venda perdida' }
  }
}

export async function atualizarNaoVenda(id: string, data: NaoVendaFormData) {
  const session = await auth()
  
  if (!session) {
    return { error: 'Você precisa estar autenticado para realizar esta ação' }
  }

  const validatedFields = naoVendaSchema.safeParse(data)
  
  if (!validatedFields.success) {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' }
  }

  try {
    const naoVendaExistente = await prisma.naoVenda.findUnique({
      where: { id },
      include: {
        produtos: true
      }
    })

    if (!naoVendaExistente) {
      return { error: 'Venda perdida não encontrada' }
    }

    if (session.user.role !== 'ADMIN' && naoVendaExistente.vendedorId !== session.user.id) {
      return { error: 'Você não tem permissão para editar esta Venda perdida' }
    }

    let cliente = await prisma.cliente.findFirst({
      where: {
        cnpj: data.cliente.cnpj,
      },
    })

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nome: data.cliente.nome,
          segmento: data.cliente.segmento,
          cnpj: data.cliente.cnpj,
          razaoSocial: data.cliente.razaoSocial,
          createdById: session.user.id,
        },
      })
    }

    await prisma.naoVendaProduto.deleteMany({
      where: { naoVendaId: id }
    })

    const naoVenda = await prisma.naoVenda.update({
      where: { id },
      data: {
        valorTotal: data.valorTotal,
        condicaoPagamento: data.condicaoPagamento,
        objecaoGeral: data.objecaoGeral,
        clienteId: cliente.id,
        editedById: session.user.id,
        produtos: {
          create: data.produtosConcorrencia.map(item => {
            const { produtoGarden, valorConcorrencia, nomeConcorrencia, icms, objecao } = item
            
            return {
              quantidade: produtoGarden.quantidade,
              valor: produtoGarden.valor,
              medida: produtoGarden.medida,
              recorrencia: produtoGarden.recorrencia,
              valorConcorrencia,
              nomeConcorrencia,
              icms,
              objecao,
              produto: {
                connectOrCreate: {
                  where: { id: produtoGarden.id || '' },
                  create: {
                    nome: produtoGarden.nome,
                    medida: produtoGarden.medida,
                    quantidade: produtoGarden.quantidade,
                    valor: produtoGarden.valor,
                    recorrencia: produtoGarden.recorrencia,
                    createdById: session.user.id,
                  }
                }
              }
            }
          })
        }
      },
    })

    revalidatePath('/dashboard/nao-vendas')
    return { success: true, id: naoVenda.id }
  } catch (error) {
    console.error('Erro ao atualizar Venda perdida:', error)
    return { error: 'Ocorreu um erro ao atualizar a Venda perdida' }
  }
}

export async function excluirNaoVenda(id: string) {
  const session = await auth()
  
  if (!session) {
    return { error: 'Você precisa estar autenticado para realizar esta ação' }
  }

  if (session.user.role !== 'ADMIN') {
    return { error: 'Apenas administradores podem excluir Venda perdidas' }
  }

  try {
    await prisma.naoVenda.delete({
      where: { id }
    })

    revalidatePath('/dashboard/nao-vendas')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir Venda perdida:', error)
    return { error: 'Ocorreu um erro ao excluir a Venda perdida' }
  }
}
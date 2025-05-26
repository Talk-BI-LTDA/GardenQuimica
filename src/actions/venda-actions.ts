// src/actions/venda-actions.ts
'use server'

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/supabase/prisma';
import { auth } from '@/lib/auth';
import { VendaFormData } from '@/types/venda';
import { vendaSchema } from '@/validations/venda-schema';
import { redirect } from 'next/navigation';
import { gerarCodigoVenda } from '@/lib/utils';
import { FiltrosVenda } from '@/types/filtros';

export async function criarVenda(data: VendaFormData) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    return { error: 'Você precisa estar autenticado para realizar esta ação' };
  }

  // Validar dados
  const validatedFields = vendaSchema.safeParse(data);
  
  if (!validatedFields.success) {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  try {
    // Gerar código de venda único (6 dígitos)
    const codigoVenda = data.codigoManual || gerarCodigoVenda();
    const naoVendaExistente = await prisma.naoVenda.findFirst({
      where: {
        codigoVenda: codigoVenda
      }
    });

    if (naoVendaExistente) {
      return { error: 'Este código já está em uso. Por favor, escolha outro.' };
    }
    
    // Verificar se o cliente já existe
    let cliente = await prisma.cliente.findFirst({
      where: {
        cnpj: data.cliente.cnpj,
      },
    });

    // Se não existir, criar novo cliente
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nome: data.cliente.nome,
          segmento: data.cliente.segmento,
          cnpj: data.cliente.cnpj,
          razaoSocial: data.cliente.razaoSocial,
          createdById: session.user.id,
          whatsapp: data.cliente.whatsapp,
        },
      });
    }

    // Verificar recorrência
    if (data.vendaRecorrente && !data.nomeRecorrencia) {
      return { error: 'Nome da recorrência é obrigatório para vendas recorrentes' };
    }

    if (data.vendaRecorrente && data.nomeRecorrencia) {
      // Verificar se já existe recorrência com esse nome para o usuário
      const recorrenciaExistente = await prisma.venda.findFirst({
        where: {
          vendedorId: session.user.id,
          vendaRecorrente: true,
          nomeRecorrencia: data.nomeRecorrencia,
        },
      });

      if (recorrenciaExistente) {
        return { error: 'Já existe uma venda recorrente com esse nome' };
      }
    }

    // Criar venda
    const venda = await prisma.venda.create({
      data: {
        codigoVenda,
        valorTotal: data.valorTotal,
        condicaoPagamento: data.condicaoPagamento,
        vendaRecorrente: data.vendaRecorrente,
        nomeRecorrencia: data.nomeRecorrencia,
        clienteId: cliente.id,
        vendedorId: session.user.id,
        produtos: {
          create: data.produtos.map(produto => ({
            quantidade: produto.quantidade,
            valor: produto.valor,
            medida: produto.medida,
            // Novos campos
            comissao: produto.comissao || 0,
            icms: produto.icms || 0,
            ipi: produto.ipi || 0,
            produto: {
              connectOrCreate: {
                where: { id: produto.id || '' },
                create: {
                  nome: produto.nome,
                  medida: produto.medida,
                  quantidade: produto.quantidade,
                  valor: produto.valor,
                  // Novos campos
                  comissao: produto.comissao || 0,
                  icms: produto.icms || 0,
                  ipi: produto.ipi || 0,
                  createdById: session.user.id,
                }
              }
            }
          }))
        }
      },
    });

    revalidatePath('/dashboard/vendas');
    return { success: true, id: venda.id };
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    return { error: 'Ocorreu um erro ao salvar a venda' };
  }
}

export async function getVendas(filtros?: FiltrosVenda) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    // Construir filtros
    const where: Record<string, unknown> = {};
    
    // Se não for admin, filtrar apenas vendas do usuário logado
    if (session.user.role !== 'ADMIN') {
      where.vendedorId = session.user.id;
    } else if (filtros?.vendedorId) {
      where.vendedorId = filtros.vendedorId;
    }

    // Aplicar filtro de data
    if (filtros?.dataInicio && filtros?.dataFim) {
      where.createdAt = { 
        gte: new Date(filtros.dataInicio), 
        lte: new Date(filtros.dataFim) 
      };
    }
    
    // Aplicar filtro de cliente
    if (filtros?.clienteId) {
      where.clienteId = filtros.clienteId;
    }

    // Aplicar filtro de segmento
    if (filtros?.segmento) {
      where.cliente = { 
        ...(where.cliente as Record<string, unknown> || {}), 
        segmento: filtros.segmento 
      };
    }
    
    // Aplicar filtro de busca por termo
    if (filtros?.searchTerm) {
      const termo = filtros.searchTerm;
      where.OR = [
        { codigoVenda: { contains: termo, mode: 'insensitive' } },
        { cliente: { nome: { contains: termo, mode: 'insensitive' } } },
        { cliente: { cnpj: { contains: termo, mode: 'insensitive' } } },
        { cliente: { razaoSocial: { contains: termo, mode: 'insensitive' } } }
      ];
    }
    
    // Aplicar filtro de valor
    if (filtros?.valorMinimo !== undefined && filtros?.valorMaximo !== undefined) {
      where.valorTotal = { 
        gte: filtros.valorMinimo, 
        lte: filtros.valorMaximo 
      };
    } else if (filtros?.valorMinimo !== undefined) {
      where.valorTotal = { 
        gte: filtros.valorMinimo
      };
    } else if (filtros?.valorMaximo !== undefined) {
      where.valorTotal = { 
        lte: filtros.valorMaximo 
      };
    }
    
    // Aplicar filtro de produto
    if (filtros?.produtoId) {
      where.produtos = {
        some: { produtoId: filtros.produtoId }
      };
    }
    
    // Aplicar filtro de venda recorrente
    if (filtros?.vendaRecorrente !== undefined) {
      where.vendaRecorrente = filtros.vendaRecorrente;
    }
    
    // Aplicar filtro de condição de pagamento
    if (filtros?.condicaoPagamento) {
      where.condicaoPagamento = filtros.condicaoPagamento;
    }

    // Determinar a ordenação
    const orderBy: Record<string, string> = {};
    if (filtros?.sortDirection) {
      orderBy.createdAt = filtros.sortDirection;
    } else {
      orderBy.createdAt = 'desc'; // Padrão: mais recentes primeiro
    }

    // Buscar vendas
    const vendas = await prisma.venda.findMany({
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
    });

    // Mapear para formato esperado
    const vendasMapeadas = vendas.map(venda => ({
      id: venda.id,
      codigoVenda: venda.codigoVenda,
      cliente: {
        id: venda.cliente.id,
        nome: venda.cliente.nome,
        segmento: venda.cliente.segmento,
        cnpj: venda.cliente.cnpj,
        razaoSocial: venda.cliente.razaoSocial || undefined,
        whatsapp: venda.cliente.whatsapp || undefined
      },
      produtos: venda.produtos.map(p => ({
        id: p.produto.id,
        nome: p.produto.nome,
        medida: p.produto.medida,
        quantidade: p.quantidade,
        valor: p.valor,
        comissao: p.comissao || 0,
        icms: p.icms || 0,
        ipi: p.ipi || 0
      })),
      valorTotal: venda.valorTotal,
      condicaoPagamento: venda.condicaoPagamento,
      vendaRecorrente: venda.vendaRecorrente,
      nomeRecorrencia: venda.nomeRecorrencia || undefined,
      vendedorId: venda.vendedorId,
      vendedorNome: venda.vendedor.name,
      createdAt: venda.createdAt,
      updatedAt: venda.updatedAt,
      editedById: venda.editedById || undefined
    }));

    return { success: true, vendas: vendasMapeadas };
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    return { error: 'Ocorreu um erro ao buscar as vendas' };
  }
}

export async function getVenda(id: string) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    const venda = await prisma.venda.findUnique({
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
    });

    if (!venda) {
      return { error: 'Venda não encontrada' };
    }

    // Verificar permissão
    if (session.user.role !== 'ADMIN' && venda.vendedorId !== session.user.id) {
      return { error: 'Você não tem permissão para visualizar esta venda' };
    }

    return { success: true, venda };
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    return { error: 'Ocorreu um erro ao buscar a venda' };
  }
}

export async function atualizarVenda(id: string, data: VendaFormData) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    return { error: 'Você precisa estar autenticado para realizar esta ação' };
  }

  // Validar dados
  const validatedFields = vendaSchema.safeParse(data);
  
  if (!validatedFields.success) {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  try {
    // Verificar se a venda existe
    const vendaExistente = await prisma.venda.findUnique({
      where: { id },
      include: {
        produtos: true
      }
    });

    if (!vendaExistente) {
      return { error: 'Venda não encontrada' };
    }

    // Verificar permissão
    if (session.user.role !== 'ADMIN' && vendaExistente.vendedorId !== session.user.id) {
      return { error: 'Você não tem permissão para editar esta venda' };
    }

    // Verificar cliente
    let cliente = await prisma.cliente.findFirst({
      where: {
        cnpj: data.cliente.cnpj,
      },
    });

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nome: data.cliente.nome,
          segmento: data.cliente.segmento,
          cnpj: data.cliente.cnpj,
          razaoSocial: data.cliente.razaoSocial,
          createdById: session.user.id,
          whatsapp: data.cliente.whatsapp,
        },
      });
    }

    // Verificar recorrência
    if (data.vendaRecorrente && !data.nomeRecorrencia) {
      return { error: 'Nome da recorrência é obrigatório para vendas recorrentes' };
    }

    if (data.vendaRecorrente && data.nomeRecorrencia) {
      // Verificar se já existe recorrência com esse nome para o usuário (excluindo a venda atual)
      const recorrenciaExistente = await prisma.venda.findFirst({
        where: {
          vendedorId: session.user.id,
          vendaRecorrente: true,
          nomeRecorrencia: data.nomeRecorrencia,
          id: { not: id }
        },
      });

      if (recorrenciaExistente) {
        return { error: 'Já existe uma venda recorrente com esse nome' };
      }
    }

    // Remover produtos antigos
    await prisma.vendaProduto.deleteMany({
      where: { vendaId: id }
    });

    // Atualizar venda
    const venda = await prisma.venda.update({
      where: { id },
      data: {
        valorTotal: data.valorTotal,
        condicaoPagamento: data.condicaoPagamento,
        vendaRecorrente: data.vendaRecorrente,
        nomeRecorrencia: data.nomeRecorrencia,
        clienteId: cliente.id,
        editedById: session.user.id,
        produtos: {
          create: data.produtos.map(produto => ({
            quantidade: produto.quantidade,
            valor: produto.valor,
            medida: produto.medida,
            // Novos campos
            comissao: produto.comissao || 0,
            icms: produto.icms || 0,
            ipi: produto.ipi || 0,
            produto: {
              connectOrCreate: {
                where: { id: produto.id || '' },
                create: {
                  nome: produto.nome,
                  medida: produto.medida,
                  quantidade: produto.quantidade,
                  valor: produto.valor,
                  // Novos campos
                  comissao: produto.comissao || 0,
                  icms: produto.icms || 0,
                  ipi: produto.ipi || 0,
                  createdById: session.user.id,
                }
              }
            }
          }))
        }
      },
    });

    revalidatePath('/dashboard/vendas');
    return { success: true, id: venda.id };
  } catch (error) {
    console.error('Erro ao atualizar venda:', error);
    return { error: 'Ocorreu um erro ao atualizar a venda' };
  }
}

export async function excluirVenda(id: string) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    return { error: 'Você precisa estar autenticado para realizar esta ação' };
  }

  // Verificar se é admin
  if (session.user.role !== 'ADMIN') {
    return { error: 'Apenas administradores podem excluir vendas' };
  }

  try {
    await prisma.venda.delete({
      where: { id }
    });

    revalidatePath('/dashboard/vendas');
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir venda:', error);
    return { error: 'Ocorreu um erro ao excluir a venda' };
  }
}
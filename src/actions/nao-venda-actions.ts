// src/actions/nao-venda-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/supabase/prisma";
import { auth } from "@/lib/auth";
import { NaoVendaFormData } from "@/types/nao-venda";
import { naoVendaSchema } from "@/validations/nao-venda-schema";
import { redirect } from "next/navigation";
import { gerarCodigoVenda } from "@/lib/utils";
import { FiltrosVenda } from "@/types/filtros";

export async function criarNaoVenda(data: NaoVendaFormData) {
  // Adicionar logs para diagnóstico
  console.log("Iniciando criarNaoVenda com dados:", {
    cliente: data.cliente ? { 
      nome: data.cliente.nome,
      cnpj: data.cliente.cnpj 
    } : 'Cliente não definido',
    produtosCount: data.produtosConcorrencia?.length || 0,
    codigoManual: data.codigoManual || 'não definido',
    objecaoGeral: data.objecaoGeral || 'não definida',
  });

  // Verificar valores ausentes que podem causar problemas
  if (!data.cliente || !data.cliente.cnpj) {
    console.error("ERRO: Cliente ou CNPJ ausente!");
    return { error: "Dados do cliente incompletos" };
  }
  
  if (!data.produtosConcorrencia || data.produtosConcorrencia.length === 0) {
    console.error("ERRO: Nenhum produto de concorrência fornecido!");
    return { error: "É necessário pelo menos um produto" };
  }

  // Validar autenticação
  const session = await auth();

  if (!session) {
    return { error: "Você precisa estar autenticado para realizar esta ação" };
  }

  // Validar dados
  const validatedFields = naoVendaSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error("Falha na validação:", validatedFields.error);
    return { error: "Dados inválidos. Verifique os campos obrigatórios." };
  }

  try {
    // Gerar código de venda único (6 dígitos) ou usar o fornecido
    const codigoVenda = data.codigoManual || gerarCodigoVenda();
    console.log(`Usando código de venda: ${codigoVenda}`);

    // Verificar se o cliente já existe
    let cliente = await prisma.cliente.findFirst({
      where: {
        cnpj: data.cliente.cnpj,
      },
    });

    // Se não existir, criar novo cliente
    if (!cliente) {
      console.log(`Cliente com CNPJ ${data.cliente.cnpj} não encontrado. Criando novo cliente.`);
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
    } else {
      console.log(`Cliente encontrado: ${cliente.nome} (ID: ${cliente.id})`);
    }

    // Criar a não-venda (cotação cancelada)
    console.log(`Criando não-venda com ${data.produtosConcorrencia.length} produtos`);
    const naoVenda = await prisma.naoVenda.create({
      data: {
        codigoVenda,
        valorTotal: data.valorTotal,
        condicaoPagamento: data.condicaoPagamento,
        objecaoGeral: data.objecaoGeral || "",
        clienteId: cliente.id,
        vendedorId: session.user.id,
        produtos: {
          create: data.produtosConcorrencia.map((produtoConcorrencia) => {
            const produto = produtoConcorrencia.produtoGarden;
            
            // Verificar se temos ID válido
            const produtoId = produto.id && produto.id.trim() !== "" 
              ? produto.id 
              : `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            
            console.log(`Processando produto: ${produto.nome} (ID: ${produtoId})`);

            return {
              quantidade: produto.quantidade,
              valor: produto.valor,
              medida: produto.medida,
              // Campos de concorrência
              valorConcorrencia: produtoConcorrencia.valorConcorrencia,
              nomeConcorrencia: produtoConcorrencia.infoNaoDisponivel
                ? "Não disponível"
                : produtoConcorrencia.nomeConcorrencia,
              icms: produtoConcorrencia.infoNaoDisponivel
                ? null
                : produtoConcorrencia.icms,
              ipi: produtoConcorrencia.infoNaoDisponivel
                ? null
                : produtoConcorrencia.ipi,
              objecao: produtoConcorrencia.infoNaoDisponivel
                ? null
                : produtoConcorrencia.objecao,
              infoNaoDisponivel: produtoConcorrencia.infoNaoDisponivel || false,
              produto: {
                connectOrCreate: {
                  where: { id: produtoId },
                  create: {
                    nome: produto.nome,
                    medida: produto.medida,
                    quantidade: produto.quantidade,
                    valor: produto.valor,
                    // Novos campos
                    icms: produto.icms || 0,
                    ipi: produto.ipi || 0,
                    createdById: session.user.id,
                  },
                },
              },
            };
          }),
        },
      },
    });

    console.log(`Não-venda criada com sucesso. ID: ${naoVenda.id}`);
    revalidatePath("/dashboard/vendas");
    return { success: true, id: naoVenda.id };
  } catch (error) {
    console.error("Erro ao criar Cotação Cancelada:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return { error: `Ocorreu um erro ao salvar a Cotação Cancelada: ${errorMessage}` };
  }
}

export async function getNaoVendas(filtros?: FiltrosVenda) {
  // Validar autenticação
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  try {
    // Construir filtros
    const where: Record<string, unknown> = {};

    // Se não for admin, filtrar apenas vendas do usuário logado
    if (session.user.role !== "ADMIN") {
      where.vendedorId = session.user.id;
    } else if (filtros?.vendedorId && filtros.vendedorId !== 'todos_vendedores') {
      where.vendedorId = filtros.vendedorId;
    }

    // Aplicar filtro de data
    if (filtros?.dataInicio && filtros?.dataFim) {
      where.createdAt = {
        gte: new Date(filtros.dataInicio),
        lte: new Date(filtros.dataFim),
      };
    }

    // Aplicar filtro de cliente
    if (filtros?.clienteId) {
      where.clienteId = filtros.clienteId;
    } else if (filtros?.nomeCliente && filtros.nomeCliente.trim() !== '') {
      where.cliente = {
        nome: { 
          contains: filtros.nomeCliente.trim(), 
          mode: 'insensitive' 
        }
      };
    }

    // Aplicar filtro de segmento
    if (filtros?.segmento && filtros.segmento !== 'todos_segmentos') {
      where.cliente = {
        ...((where.cliente as Record<string, unknown>) || {}),
        segmento: filtros.segmento,
      };
    }
    
    // Aplicar filtro de cliente recorrente
    if (filtros?.clienteRecorrente) {
      where.cliente = {
        ...((where.cliente as Record<string, unknown>) || {}),
        recorrente: filtros.clienteRecorrente === 'sim'
      };
    }

    // Aplicar filtro de busca por termo
    if (filtros?.searchTerm) {
      const termo = filtros.searchTerm;
      where.OR = [
        { codigoVenda: { contains: termo, mode: "insensitive" } },
        { cliente: { nome: { contains: termo, mode: "insensitive" } } },
        { cliente: { cnpj: { contains: termo, mode: "insensitive" } } },
        { cliente: { razaoSocial: { contains: termo, mode: "insensitive" } } },
        { cliente: { whatsapp: { contains: termo, mode: "insensitive" } } },
      ];
    }

    // Aplicar filtro de valor
    if (
      filtros?.valorMinimo !== undefined &&
      filtros?.valorMaximo !== undefined
    ) {
      where.valorTotal = {
        gte: filtros.valorMinimo,
        lte: filtros.valorMaximo,
      };
    } else if (filtros?.valorMinimo !== undefined) {
      where.valorTotal = {
        gte: filtros.valorMinimo,
      };
    } else if (filtros?.valorMaximo !== undefined) {
      where.valorTotal = {
        lte: filtros.valorMaximo,
      };
    }

    // Aplicar filtro de produto
    if (filtros?.produtos && Array.isArray(filtros.produtos) && filtros.produtos.length > 0) {
      where.produtos = {
        some: {
          produto: {
            nome: {
              in: filtros.produtos
            }
          }
        }
      };
    } else if (filtros?.produtoId) {
      where.produtos = {
        some: { produtoId: filtros.produtoId },
      };
    }

    // Aplicar filtro de objeção
    if (filtros?.objecao && filtros.objecao !== 'todas_objecoes') {
      // Buscar por objeção geral ou objeção do produto
      where.OR = [
        { objecaoGeral: { contains: filtros.objecao, mode: 'insensitive' } },
        { produtos: { 
            some: { 
              objecao: { contains: filtros.objecao, mode: 'insensitive' } 
            } 
          } 
        }
      ];
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
      orderBy.createdAt = "desc"; // Padrão: mais recentes primeiro
    }

    console.log("Filtros aplicados nas não-vendas:", where);

    // Buscar vendas
    const naoVendas = await prisma.naoVenda.findMany({
      where,
      include: {
        cliente: true,
        vendedor: {
          select: {
            id: true,
            name: true,
          },
        },
        produtos: {
          include: {
            produto: true,
          },
        },
        editedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy,
    });

    console.log(`Encontradas ${naoVendas.length} não-vendas`);

    // Mapear para formato esperado
    const naoVendasMapeadas = naoVendas.map((naoVenda) => ({
      id: naoVenda.id,
      codigoVenda: naoVenda.codigoVenda,
      cliente: {
        id: naoVenda.cliente.id,
        nome: naoVenda.cliente.nome,
        segmento: naoVenda.cliente.segmento,
        cnpj: naoVenda.cliente.cnpj,
        whatsapp: naoVenda.cliente.whatsapp || undefined,
        razaoSocial: naoVenda.cliente.razaoSocial || undefined,
        recorrente: naoVenda.cliente.recorrente
      },
      produtosConcorrencia: naoVenda.produtos.map((p) => ({
        produtoGarden: {
          id: p.produto.id,
          nome: p.produto.nome,
          medida: p.medida,
          quantidade: p.quantidade,
          valor: p.valor,
          icms: p.produto.icms || 0,
          ipi: p.produto.ipi || 0,
        },
        valorConcorrencia: p.valorConcorrencia || 0,
        nomeConcorrencia: p.nomeConcorrencia || "Não disponível",
        icms: p.icms || null,
        ipi: p.ipi || null,
        objecao: p.objecao || null,
        infoNaoDisponivel: p.infoNaoDisponivel || false,
      })),
      valorTotal: naoVenda.valorTotal,
      condicaoPagamento: naoVenda.condicaoPagamento,
      objecaoGeral: naoVenda.objecaoGeral,
      vendedorId: naoVenda.vendedorId,
      vendedorNome: naoVenda.vendedor.name,
      createdAt: naoVenda.createdAt,
      updatedAt: naoVenda.updatedAt,
      editedById: naoVenda.editedById || undefined,
    }));

    return { success: true, naoVendas: naoVendasMapeadas };
  } catch (error) {
    console.error("Erro ao buscar cotações canceladas:", error);
    return { error: "Ocorreu um erro ao buscar as cotações canceladas" };
  }
}

export async function getNaoVenda(id: string) {
  // Validar autenticação
  const session = await auth();

  if (!session) {
    redirect("/login");
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
          },
        },
        produtos: {
          include: {
            produto: true,
          },
        },
        editedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!naoVenda) {
      return { error: "Cotação cancelada não encontrada" };
    }

    // Verificar permissão
    if (
      session.user.role !== "ADMIN" &&
      naoVenda.vendedorId !== session.user.id
    ) {
      return {
        error: "Você não tem permissão para visualizar esta cotação cancelada",
      };
    }

    return { success: true, naoVenda };
  } catch (error) {
    console.error("Erro ao buscar cotação cancelada:", error);
    return { error: "Ocorreu um erro ao buscar a cotação cancelada" };
  }
}

export async function atualizarNaoVenda(id: string, data: NaoVendaFormData) {
  // Validar autenticação
  const session = await auth();

  if (!session) {
    return { error: "Você precisa estar autenticado para realizar esta ação" };
  }

  // Validar dados
  const validatedFields = naoVendaSchema.safeParse(data);

  if (!validatedFields.success) {
    return { error: "Dados inválidos. Verifique os campos obrigatórios." };
  }

  try {
    // Verificar se a NÃO venda existe
    const naoVendaExistente = await prisma.naoVenda.findUnique({
      where: { id },
      include: {
        produtos: true,
      },
    });

    if (!naoVendaExistente) {
      return { error: "Cotação cancelada não encontrada" };
    }

    // Verificar permissão
    if (
      session.user.role !== "ADMIN" &&
      naoVendaExistente.vendedorId !== session.user.id
    ) {
      return {
        error: "Você não tem permissão para editar esta cotação cancelada",
      };
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

    // Remover produtos antigos
    await prisma.naoVendaProduto.deleteMany({
      where: { naoVendaId: id },
    });

    // Atualizar venda
    const naoVenda = await prisma.naoVenda.update({
      where: { id },
      data: {
        valorTotal: data.valorTotal,
        condicaoPagamento: data.condicaoPagamento,
        objecaoGeral: data.objecaoGeral,
        clienteId: cliente.id,
        editedById: session.user.id,
        produtos: {
          create: data.produtosConcorrencia.map((produtoConcorrencia) => {
            const produto = produtoConcorrencia.produtoGarden;

            return {
              quantidade: produto.quantidade,
              valor: produto.valor,
              medida: produto.medida,
              valorConcorrencia: produtoConcorrencia.valorConcorrencia,
              nomeConcorrencia: produtoConcorrencia.infoNaoDisponivel
                ? "Não disponível"
                : produtoConcorrencia.nomeConcorrencia,
              icms: produtoConcorrencia.infoNaoDisponivel
                ? null
                : produtoConcorrencia.icms,
              ipi: produtoConcorrencia.infoNaoDisponivel
                ? null
                : produtoConcorrencia.ipi,
              objecao: produtoConcorrencia.infoNaoDisponivel
                ? null
                : produtoConcorrencia.objecao,
              infoNaoDisponivel: produtoConcorrencia.infoNaoDisponivel || false,
              produto: {
                connectOrCreate: {
                  where: { id: produto.id || "" },
                  create: {
                    nome: produto.nome,
                    medida: produto.medida,
                    quantidade: produto.quantidade,
                    valor: produto.valor,
                    icms: produto.icms || 0,
                    ipi: produto.ipi || 0,
                    createdById: session.user.id,
                  },
                },
              },
            };
          }),
        },
      },
    });

    revalidatePath("/dashboard/vendas");
    return { success: true, id: naoVenda.id };
  } catch (error) {
    console.error("Erro ao atualizar cotação cancelada:", error);
    return { error: "Ocorreu um erro ao atualizar a cotação cancelada" };
  }
}


export async function excluirNaoVenda(id: string) {
  // Validar autenticação
  const session = await auth();

  if (!session) {
    return { error: "Você precisa estar autenticado para realizar esta ação" };
  }

  // Verificar se é admin
  if (session.user.role !== "ADMIN") {
    return {
      error: "Apenas administradores podem excluir cotações canceladas",
    };
  }

  try {
    await prisma.naoVenda.delete({
      where: { id },
    });

    revalidatePath("/dashboard/vendas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir cotação cancelada:", error);
    return { error: "Ocorreu um erro ao excluir a cotação cancelada" };
  }
}
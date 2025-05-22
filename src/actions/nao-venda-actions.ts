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
    // Gerar código de venda único (6 dígitos)
    const codigoVenda = gerarCodigoVenda();

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
        },
      });
    }

    // Criar não venda
    const naoVenda = await prisma.naoVenda.create({
      data: {
        codigoVenda,
        valorTotal: data.valorTotal,
        condicaoPagamento: data.condicaoPagamento,
        objecaoGeral: data.objecaoGeral,
        clienteId: cliente.id,
        vendedorId: session.user.id,
        produtos: {
          create: data.produtosConcorrencia.map((produtoConcorrencia) => {
            const produto = produtoConcorrencia.produtoGarden;

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
                  where: { id: produto.id || "" },
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

    revalidatePath("/dashboard/vendas");
    return { success: true, id: naoVenda.id };
  } catch (error) {
    console.error("Erro ao criar Cotação Cancelada:", error);
    return { error: "Ocorreu um erro ao salvar a Cotação Cancelada" };
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
    } else if (filtros?.vendedorId) {
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
    }

    // Aplicar filtro de segmento
    if (filtros?.segmento) {
      where.cliente = {
        ...((where.cliente as Record<string, unknown>) || {}),
        segmento: filtros.segmento,
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
    if (filtros?.produtoId) {
      where.produtos = {
        some: { produtoId: filtros.produtoId },
      };
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

    // Mapear para formato esperado
    const naoVendasMapeadas = naoVendas.map((naoVenda) => ({
      id: naoVenda.id,
      codigoVenda: naoVenda.codigoVenda,
      cliente: {
        id: naoVenda.cliente.id,
        nome: naoVenda.cliente.nome,
        segmento: naoVenda.cliente.segmento,
        cnpj: naoVenda.cliente.cnpj,
        razaoSocial: naoVenda.cliente.razaoSocial || undefined,
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
    // Verificar se a venda existe
    const naoVendaExistente = await prisma.venda.findUnique({
      where: { id },
      include: {
        produtos: true,
      },
      
    });
    console.log("Buscando cotação cancelada com ID:", id);
    console.log("Cotação encontrada:", naoVendaExistente);

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

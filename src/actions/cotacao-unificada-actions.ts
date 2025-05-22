// @/actions/cotacao-unificada-actions.ts
"use server";

import { prisma } from "@/lib/supabase/prisma";
import { auth } from "@/lib/auth";
import { getCotacao } from "@/actions/cotacao-actions";
import { StatusCotacao,  } from "@/types/cotacao-tipos";

// Função para buscar uma cotação de qualquer uma das tabelas
export async function getCotacaoUnificada(id: string, tipo?: string) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { error: "Não autorizado" };
    }

    // Se o tipo foi especificado, buscar diretamente na tabela correta
    if (tipo) {
      switch (tipo) {
        case "pendente":
          return await getCotacao(id);
        case "finalizada":
          return await buscarVenda(id);
        case "cancelada":
          return await buscarNaoVenda(id);
        default:
          return { error: "Tipo de cotação inválido" };
      }
    }

    // Se o tipo não foi especificado, tentar encontrar em qualquer uma das tabelas
    
    // Primeiro, tentar buscar na tabela de cotações pendentes
    const cotacaoResult = await getCotacao(id);
    if (cotacaoResult.success) {
      return cotacaoResult;
    }

    // Se não encontrou, tentar buscar na tabela de vendas
    const vendaResult = await buscarVenda(id);
    if (vendaResult.success) {
      return vendaResult;
    }

    // Por último, tentar buscar na tabela de não-vendas
    const naoVendaResult = await buscarNaoVenda(id);
    if (naoVendaResult.success) {
      return naoVendaResult;
    }

    // Se não encontrou em nenhuma tabela
    return { error: "Cotação não encontrada" };
  } catch (error) {
    console.error("Erro ao buscar cotação unificada:", error);
    return { error: "Erro ao buscar cotação. Por favor, tente novamente." };
  }
}

// Função para buscar uma venda
async function buscarVenda(id: string) {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id },
      include: {
        cliente: true,
        produtos: {
          include: {
            produto: true,
          },
        },
        vendedor: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!venda) {
      return { error: "Venda não encontrada" };
    }

    // Formatar dados para o formulário
    const formattedData = {
      id: venda.id,
      status: "finalizada" as StatusCotacao,
      cliente: {
        nome: venda.cliente.nome,
        segmento: venda.cliente.segmento,
        cnpj: venda.cliente.cnpj,
        razaoSocial: venda.cliente.razaoSocial || "",
      },
      produtos: venda.produtos.map((prod) => ({
        id: prod.produtoId,
        nome: prod.produto.nome,
        medida: prod.medida,
        quantidade: prod.quantidade,
        valor: prod.valor,
        comissao: prod.comissao || 0,
        icms: prod.icms || 0,
        ipi: prod.ipi || 0,
      })),
      valorTotal: venda.valorTotal,
      condicaoPagamento: venda.condicaoPagamento,
      vendaRecorrente: venda.vendaRecorrente,
      nomeRecorrencia: venda.nomeRecorrencia || "",
    };

    return { success: true, cotacao: formattedData };
  } catch (error) {
    console.error("Erro ao buscar venda:", error);
    return { error: "Erro ao buscar venda. Por favor, tente novamente." };
  }
}

// Função para buscar uma não-venda
async function buscarNaoVenda(id: string) {
  try {
    const naoVenda = await prisma.naoVenda.findUnique({
      where: { id },
      include: {
        cliente: true,
        produtos: {
          include: {
            produto: true,
          },
        },
        vendedor: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!naoVenda) {
      return { error: "Cotação cancelada não encontrada" };
    }

    // Formatar dados para o formulário de não-venda
    const formattedData = {
      id: naoVenda.id,
      status: "cancelada" as StatusCotacao,
      cliente: {
        nome: naoVenda.cliente.nome,
        segmento: naoVenda.cliente.segmento,
        cnpj: naoVenda.cliente.cnpj,
        razaoSocial: naoVenda.cliente.razaoSocial || "",
      },
      produtosConcorrencia: naoVenda.produtos.map((prod) => ({
        produtoGarden: {
          id: prod.produtoId,
          nome: prod.produto.nome,
          medida: prod.medida,
          quantidade: prod.quantidade,
          valor: prod.valor,
          comissao: prod.produto.comissao || 0,
          icms: prod.produto.icms || 0,
          ipi: prod.produto.ipi || 0,
        },
        valorConcorrencia: prod.valorConcorrencia || 0,
        nomeConcorrencia: prod.nomeConcorrencia || "Não disponível",
        icms: prod.icms || null,
        ipi: prod.ipi || null,
        objecao: prod.objecao || null,
        infoNaoDisponivel: prod.infoNaoDisponivel || false,
      })),
      valorTotal: naoVenda.valorTotal,
      condicaoPagamento: naoVenda.condicaoPagamento,
      objecaoGeral: naoVenda.objecaoGeral || "",
    };

    return { success: true, cotacao: formattedData };
  } catch (error) {
    console.error("Erro ao buscar não-venda:", error);
    return { error: "Erro ao buscar cotação cancelada. Por favor, tente novamente." };
  }
}
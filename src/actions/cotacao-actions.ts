// @/actions/cotacao-actions.ts
"use server";

import { prisma } from "@/lib/supabase/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { VendaFormData } from "@/types/venda-tipos";
import { NaoVendaFormData } from "@/types/venda-tipos";
import { criarVenda, atualizarVenda } from "@/actions/venda-actions";
import { criarNaoVenda, atualizarNaoVenda } from "@/actions/nao-venda-actions";
import { FiltrosCotacao } from "@/types/filtros";


// Define o tipo StatusCotacao se não existir
export type StatusCotacao = "pendente" | "finalizada" | "cancelada";

// Tipo para os dados do formulário de cotação
export type CotacaoFormData = {
  cliente: {
    whatsapp: string;
    nome: string;
    segmento: string;
    cnpj: string;
    razaoSocial?: string;
    recorrente?: boolean;
  };
  produtos: {
    id?: string;
    nome: string;
    medida: string;
    quantidade: number;
    valor: number;
    comissao?: number;
    icms?: number;
    ipi?: number;
  }[];
  valorTotal: number;
  condicaoPagamento: string;
  vendaRecorrente?: boolean;
  nomeRecorrencia?: string;
  status?: StatusCotacao;
  codigoManual?: string; 
};

// Criar uma nova cotação
export async function criarCotacao(data: CotacaoFormData) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { error: "Não autorizado" };
    }

    const vendedorId = session.user.id;

    // Verificar se cliente já existe pelo CNPJ
    let cliente = await prisma.cliente.findFirst({
      where: {
        cnpj: data.cliente.cnpj,
      },
    });

    // ✅ CORREÇÃO: Determinar se o cliente é recorrente baseado na cotação
    const isRecorrente = data.vendaRecorrente && data.nomeRecorrencia;

    // Se não existir, criar novo cliente
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nome: data.cliente.nome,
          segmento: data.cliente.segmento,
          cnpj: data.cliente.cnpj,
          razaoSocial: data.cliente.razaoSocial || null,
          whatsapp: data.cliente.whatsapp || null, 
          recorrente: isRecorrente ? true : false, 
          createdById: vendedorId,
        },
      });
    } else {
      // ✅ Se cliente já existe, atualizar recorrência se necessário
      if (isRecorrente && !cliente.recorrente) {
        await prisma.cliente.update({
          where: { id: cliente.id },
          data: { 
            recorrente: true,
            whatsapp: data.cliente.whatsapp || cliente.whatsapp, 
          },
        });
      }
    }

    // Gerar código único para a cotação
    const codigoCotacao = data.codigoManual || `COT-${Date.now()}`;
    
    // Verificar se o código já existe
    const cotacaoExistente = await prisma.cotacao.findFirst({
      where: {
        codigoCotacao: codigoCotacao
      }
    });

    if (cotacaoExistente) {
      return { error: 'Este código já está em uso. Por favor, escolha outro.' };
    }


    // Criar cotação
    const cotacao = await prisma.cotacao.create({
      data: {
        codigoCotacao,
        valorTotal: data.valorTotal,
        condicaoPagamento: data.condicaoPagamento,
        vendaRecorrente: data.vendaRecorrente || false,
        nomeRecorrencia: data.nomeRecorrencia,
        status: data.status || "pendente",
        clienteId: cliente.id,
        vendedorId,
      },
    });

    // Criar produtos relacionados à cotação
    if (data.produtos && data.produtos.length > 0) {
      for (const prodItem of data.produtos) {
        // Verificar se o produto já existe
        let produto = await prisma.produto.findFirst({
          where: {
            nome: prodItem.nome,
          },
        });

        // Se não existir, criar o produto
        if (!produto) {
          produto = await prisma.produto.create({
            data: {
              nome: prodItem.nome,
              medida: prodItem.medida,
              quantidade: prodItem.quantidade,
              valor: prodItem.valor,
              comissao: prodItem.comissao || 0,
              icms: prodItem.icms || 0,
              ipi: prodItem.ipi || 0,
              createdById: vendedorId,
            },
          });
        }

        // Adicionar à cotação
        await prisma.cotacaoProduto.create({
          data: {
            cotacaoId: cotacao.id,
            produtoId: produto.id,
            quantidade: prodItem.quantidade,
            valor: prodItem.valor,
            medida: prodItem.medida,
            comissao: prodItem.comissao || 0,
            icms: prodItem.icms || 0,
            ipi: prodItem.ipi || 0,
          },
        });
      }
    }

    revalidatePath("/cotacoes");
    return { success: true, id: cotacao.id };
  } catch (error) {
    console.error("Erro ao criar cotação:", error);
    return { error: "Erro ao criar cotação. Por favor, tente novamente." };
  }
}

// Atualizar uma cotação existente
export async function atualizarCotacao(id: string, data: CotacaoFormData) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { error: "Não autorizado" };
    }

    const vendedorId = session.user.id;

    // Verificar se a cotação existe
    const cotacaoExistente = await prisma.cotacao.findUnique({
      where: { id },
      include: { produtos: true },
    });

    if (!cotacaoExistente) {
      return { error: "Cotação não encontrada" };
    }

    // Verificar se cliente já existe pelo CNPJ
    let   cliente = await prisma.cliente.findFirst({
      where: {
        cnpj: data.cliente.cnpj,
      },
    });
    const isRecorrente = data.vendaRecorrente && data.nomeRecorrencia;

    // Se não existir, criar novo cliente
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nome: data.cliente.nome,
          segmento: data.cliente.segmento,
          cnpj: data.cliente.cnpj,
          razaoSocial: data.cliente.razaoSocial,
          createdById: vendedorId,
          whatsapp: data.cliente.whatsapp,
          recorrente: isRecorrente ? true : false,
        },
      });
    }
    if (data.codigoManual && data.codigoManual !== cotacaoExistente.codigoCotacao) {
      const codigoExistente = await prisma.cotacao.findFirst({
        where: {
          codigoCotacao: data.codigoManual,
          id: { not: id }  // Excluir a cotação atual da verificação
        }
      });

      if (codigoExistente) {
        return { error: 'Este código já está em uso. Por favor, escolha outro.' };
      }
    }
    // Atualizar a cotação
    await prisma.cotacao.update({
      where: { id },
      data: {
        codigoCotacao: data.codigoManual || cotacaoExistente.codigoCotacao,
        valorTotal: data.valorTotal,
        condicaoPagamento: data.condicaoPagamento,
        vendaRecorrente: data.vendaRecorrente || false,
        nomeRecorrencia: data.nomeRecorrencia,
        status: data.status || cotacaoExistente.status,
        clienteId: cliente.id,
      },
    });

    // Remover produtos antigos
    await prisma.cotacaoProduto.deleteMany({
      where: { cotacaoId: id },
    });

    // Adicionar novos produtos
    if (data.produtos && data.produtos.length > 0) {
      for (const prodItem of data.produtos) {
        // Verificar se o produto já existe
        let produto = await prisma.produto.findFirst({
          where: {
            nome: prodItem.nome,
          },
        });

        // Se não existir, criar o produto
        if (!produto) {
          produto = await prisma.produto.create({
            data: {
              nome: prodItem.nome,
              medida: prodItem.medida,
              quantidade: prodItem.quantidade,
              valor: prodItem.valor,
              comissao: prodItem.comissao || 0,
              icms: prodItem.icms || 0,
              ipi: prodItem.ipi || 0,
              createdById: vendedorId,
            },
          });
        }

        // Adicionar à cotação
        await prisma.cotacaoProduto.create({
          data: {
            cotacaoId: id,
            produtoId: produto.id,
            quantidade: prodItem.quantidade,
            valor: prodItem.valor,
            medida: prodItem.medida,
            comissao: prodItem.comissao || 0,
            icms: prodItem.icms || 0,
            ipi: prodItem.ipi || 0,
          },
        });
      }
    }

    revalidatePath("/cotacoes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar cotação:", error);
    return { error: "Erro ao atualizar cotação. Por favor, tente novamente." };
  }
}

// Obter uma cotação específica
export async function getCotacao(id: string) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { error: "Não autorizado" };
    }

    const cotacao = await prisma.cotacao.findUnique({
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

    if (!cotacao) {
      return { error: "Cotação não encontrada" };
    }

    // Formatar dados para o formulário
    const formattedData = {
      id: cotacao.id,
      status: cotacao.status as StatusCotacao,
      cliente: {
        nome: cotacao.cliente.nome,
        segmento: cotacao.cliente.segmento,
        cnpj: cotacao.cliente.cnpj,
        razaoSocial: cotacao.cliente.razaoSocial || "",
        whatsapp: cotacao.cliente.whatsapp || "",
        recorrente: cotacao.cliente.recorrente || false, 
      },
      produtos: cotacao.produtos.map((prod) => ({
        id: prod.produtoId,
        nome: prod.produto.nome,
        medida: prod.medida,
        quantidade: prod.quantidade,
        valor: prod.valor,
        comissao: prod.comissao || 0,
        icms: prod.icms || 0,
        ipi: prod.ipi || 0,
      })),
      valorTotal: cotacao.valorTotal,
      condicaoPagamento: cotacao.condicaoPagamento,
      vendaRecorrente: cotacao.vendaRecorrente,
      nomeRecorrencia: cotacao.nomeRecorrencia || "",
    };

    return { success: true, cotacao: formattedData };
  } catch (error) {
    console.error("Erro ao buscar cotação:", error);
    return { error: "Erro ao buscar cotação. Por favor, tente novamente." };
  }
}

// Obter todas as cotações
// Obter todas as cotações com suporte a filtros

// Obter todas as cotações com suporte a filtros
export async function getCotacoes(filtros?: FiltrosCotacao) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { error: "Não autorizado" };
    }

    const vendedorId = session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    // Base where
    const where: Record<string, unknown> = isAdmin ? {} : { vendedorId };

    // Aplicar filtros se fornecidos
    if (filtros) {
      // Filtro de data
      if (filtros.dataInicio && filtros.dataFim) {
        where.createdAt = {
          gte: new Date(filtros.dataInicio),
          lte: new Date(new Date(filtros.dataFim).setHours(23, 59, 59, 999)),
        };
      }

      // Agrupar filtros de cliente
      const clienteFilters: Record<string, unknown> = {};
      
      // Filtro de nome de cliente
      if (filtros.nomeCliente) {
        clienteFilters.nome = {
          contains: filtros.nomeCliente,
          mode: 'insensitive'
        };
      }

      // Filtro de segmento
      if (filtros.segmento) {
        clienteFilters.segmento = filtros.segmento;
      }
      
      // Cliente recorrente
      if (filtros.clienteRecorrente) {
        clienteFilters.recorrente = filtros.clienteRecorrente === 'sim';
      }
      
      // Aplicar filtros de cliente se houver algum
      if (Object.keys(clienteFilters).length > 0) {
        where.cliente = clienteFilters;
      }

      // Filtro de valor
      if (filtros.valorMinimo || filtros.valorMaximo) {
        const valorFilter: Record<string, unknown> = {};
        
        if (filtros.valorMinimo) {
          valorFilter.gte = parseFloat(filtros.valorMinimo);
        }
        
        if (filtros.valorMaximo) {
          valorFilter.lte = parseFloat(filtros.valorMaximo);
        }
        
        where.valorTotal = valorFilter;
      }

      // Filtro de vendedor (admin)
      if (isAdmin && filtros.vendedor) {
        where.vendedorId = filtros.vendedor;
      }
      
      // Filtro de produto (buscando produtos relacionados)
      if (filtros.produto) {
        where.produtos = {
          some: {
            produtoId: filtros.produto
          }
        };
      }
    }

    console.log("Filtros aplicados na consulta:", where);

    const cotacoes = await prisma.cotacao.findMany({
      where,
      include: {
        cliente: true,
        vendedor: {
          select: { name: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Encontradas ${cotacoes.length} cotações`);
    return { success: true, cotacoes };
  } catch (error) {
    console.error("Erro ao buscar cotações:", error);
    return { error: "Erro ao buscar cotações. Por favor, tente novamente." };
  }
}

// Finalizar cotação (transformar em venda)
export async function finalizarCotacao(id: string, data: VendaFormData) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { error: "Não autorizado" };
    }

    // Buscar a cotação para garantir que existe
    const cotacao = await prisma.cotacao.findUnique({
      where: { id },
      include: { 
        cliente: true,
        produtos: {
          include: {
            produto: true
          }
        }
      }
    });

    if (!cotacao) {
      return { error: "Cotação não encontrada" };
    }

    // Criar a venda usando a função existente
    const result = await criarVenda(data);

    if (result.error) {
      return { error: result.error };
    }

    // Se sucesso, excluir a cotação original
    await prisma.cotacao.delete({
      where: { id }
    });

    revalidatePath("/vendas");
    return { success: true, id: result.id };
  } catch (error) {
    console.error("Erro ao finalizar cotação:", error);
    return { error: "Erro ao finalizar cotação. Por favor, tente novamente." };
  }
}

// Cancelar cotação (transformar em não-venda)
export async function cancelarCotacao(id: string, data: NaoVendaFormData) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { error: "Não autorizado" };
    }

    // Buscar a cotação para garantir que existe
    const cotacao = await prisma.cotacao.findUnique({
      where: { id },
      include: { 
        cliente: true,
        produtos: {
          include: {
            produto: true
          }
        }
      }
    });

    if (!cotacao) {
      return { error: "Cotação não encontrada" };
    }

    // Criar a não-venda usando a função existente
    const result = await criarNaoVenda(data);

    if (result.error) {
      return { error: result.error };
    }

    // Se sucesso, excluir a cotação original
    await prisma.cotacao.delete({
      where: { id }
    });

    revalidatePath("/vendas");
    return { success: true, id: result.id };
  } catch (error) {
    console.error("Erro ao cancelar cotação:", error);
    return { error: "Erro ao cancelar cotação. Por favor, tente novamente." };
  }
}

export async function excluirCotacao(id: string) {
    try {
      if (!id) {
        return { success: false, error: "ID da cotação não fornecido" };
      }
  
      // Excluir a cotação diretamente do banco de dados
      await prisma.cotacao.delete({
        where: { id },
      });
  
      // Revalidar o caminho para atualizar os dados
      revalidatePath("/cotacoes");
      revalidatePath("/dashboard");
  
      return { success: true };
    } catch (error) {
      console.error("Erro ao excluir cotação:", error);
      return { 
        success: false, 
        error: "Ocorreu um erro ao excluir a cotação" 
      };
    }
  }

  export async function converterCotacao(
    id: string,
    novoStatus: StatusCotacao,
    data: VendaFormData | NaoVendaFormData
  ): Promise<{ success?: boolean; error?: string; id?: string }> {
    try {
      const session = await auth();
      if (!session || !session.user) {
        return { error: "Não autorizado" };
      }
  
      // Primeiro, buscar a cotação para garantir que existe
      const cotacaoExistente = await prisma.cotacao.findUnique({
        where: { id },
        include: {
          cliente: true,
          produtos: {
            include: {
              produto: true
            }
          }
        }
      });
  
      // Verificar se é uma não-venda
      if (!cotacaoExistente) {
        const naoVendaExistente = await prisma.naoVenda.findUnique({
          where: { id },
          include: {
            cliente: true,
            produtos: {
              include: {
                produto: true
              }
            }
          }
        });
  
        if (!naoVendaExistente) {
          // Tentar buscar como venda
          const vendaExistente = await prisma.venda.findUnique({
            where: { id },
            include: {
              cliente: true,
              produtos: {
                include: {
                  produto: true
                }
              }
            }
          });
  
          if (!vendaExistente) {
            return { error: "Cotação não encontrada" };
          }
  
          // É uma venda que será convertida
          if (novoStatus === "cancelada") {
            // Converter venda para não-venda
            const result = await criarNaoVenda(data as NaoVendaFormData);
            
            if (result.success) {
              // Excluir a venda original após criar a não-venda
              await prisma.venda.delete({
                where: { id }
              });
            }
            
            return result;
          } else {
            // Atualizar venda existente
            return await atualizarVenda(id, data as VendaFormData);
          }
        } else {
          // É uma não-venda que será convertida
          if (novoStatus === "finalizada") {
            // Converter não-venda para venda
            const result = await criarVenda(data as VendaFormData);
            
            if (result.success) {
              // Excluir a não-venda original após criar a venda
              await prisma.naoVenda.delete({
                where: { id }
              });
            }
            
            return result;
          } else {
            // Atualizar não-venda existente
            return await atualizarNaoVenda(id, data as NaoVendaFormData);
          }
        }
      } else {
        // É uma cotação pendente que será convertida
        if (novoStatus === "finalizada") {
          return await finalizarCotacao(id, data as VendaFormData);
        } else if (novoStatus === "cancelada") {
          return await cancelarCotacao(id, data as NaoVendaFormData);
        } else {
          // Manter como cotação pendente, apenas atualizar
          return await atualizarCotacao(id, data as CotacaoFormData);
        }
      }
    } catch (error) {
      console.error("Erro ao converter cotação:", error);
      return { error: "Ocorreu um erro ao converter a cotação. Por favor, tente novamente." };
    }
  }
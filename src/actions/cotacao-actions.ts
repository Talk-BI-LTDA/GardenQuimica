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
import { Prisma } from "@prisma/client";
import { gerarEtiquetasParaCliente } from "@/lib/utils";

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
          origem: "sistema", // Origem padrão - sistema
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
        codigoCotacao: codigoCotacao,
      },
    });

    if (cotacaoExistente) {
      return { error: "Este código já está em uso. Por favor, escolha outro." };
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

    // Gerar etiquetas para o cliente com base nos produtos da cotação
    await gerarEtiquetasParaCliente(cliente.id, cotacao.id);

    // Sincronizar com TalkBI se o cliente tiver whatsapp
    if (cliente.whatsapp) {
      const { sincronizarClienteTalkBI } = await import('@/actions/talkbi-actions');
      await sincronizarClienteTalkBI(cliente.id);
    }

    revalidatePath("/cotacoes");
    return { success: true, id: cotacao.id };
  } catch (error) {
    console.error("Erro ao criar cotação:", error);
    return { error: "Erro ao criar cotação. Por favor, tente novamente." };
  }
}

// Modificar a função finalizarCotacao para gerar etiquetas
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
            produto: true,
          },
        },
      },
    });

    if (!cotacao) {
      return { error: "Cotação não encontrada" };
    }

    // Criar a venda usando a função existente
    const result = await criarVenda(data);

    if (result.error) {
      return { error: result.error };
    }

    // Gerar etiquetas para o cliente com base nos produtos da venda
    if (result.id) {
      // Gerar etiquetas para o cliente (a venda acabou de ser criada)
      await gerarEtiquetasParaCliente(cotacao.cliente.id, result.id);
      
      // Sincronizar com TalkBI se o cliente tiver whatsapp
      if (cotacao.cliente.whatsapp) {
        const { sincronizarClienteTalkBI } = await import('@/actions/talkbi-actions');
        await sincronizarClienteTalkBI(cotacao.cliente.id);
      }
    }

    // Se sucesso, excluir a cotação original
    await prisma.cotacao.delete({
      where: { id },
    });

    revalidatePath("/vendas");
    return { success: true, id: result.id };
  } catch (error) {
    console.error("Erro ao finalizar cotação:", error);
    return { error: "Erro ao finalizar cotação. Por favor, tente novamente." };
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
    let cliente = await prisma.cliente.findFirst({
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
    if (
      data.codigoManual &&
      data.codigoManual !== cotacaoExistente.codigoCotacao
    ) {
      const codigoExistente = await prisma.cotacao.findFirst({
        where: {
          codigoCotacao: data.codigoManual,
          id: { not: id }, // Excluir a cotação atual da verificação
        },
      });

      if (codigoExistente) {
        return {
          error: "Este código já está em uso. Por favor, escolha outro.",
        };
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

// Obter todas as cotações com suporte a filtros
export async function getCotacoes(filtros?: FiltrosCotacao) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { error: "Não autorizado" };
    }

    const vendedorId = session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    // UTILIZANDO TIPOS FORTES DO PRISMA PARA O OBJETO 'where'
    const where: Prisma.CotacaoWhereInput = {};
    if (!isAdmin) {
      where.vendedorId = vendedorId;
    }

    if (filtros) {
      if (filtros.dataInicio && filtros.dataFim) {
        where.createdAt = {
          gte: new Date(filtros.dataInicio),
          lte: new Date(new Date(filtros.dataFim).setHours(23, 59, 59, 999)),
        };
      }

      // UTILIZANDO TIPOS FORTES DO PRISMA PARA 'clienteFilters'
      const clienteFilters: Prisma.ClienteWhereInput = {};
      if (filtros.nomeCliente && filtros.nomeCliente.trim() !== "") {
        clienteFilters.nome = {
          contains: filtros.nomeCliente.trim(),
          mode: "insensitive",
        };
      }
      if (filtros.segmento && filtros.segmento !== "todos_segmentos") {
        clienteFilters.segmento = filtros.segmento;
      }
      if (filtros.clienteRecorrente) {
        if (filtros.clienteRecorrente === "sim")
          clienteFilters.recorrente = true;
        else if (filtros.clienteRecorrente === "nao")
          clienteFilters.recorrente = false;
      }
      if (Object.keys(clienteFilters).length > 0) {
        // Aninhar corretamente o filtro de cliente
        where.cliente = clienteFilters;
      }

      // UTILIZANDO TIPOS FORTES DO PRISMA PARA 'valorFilter'
      const valorFilter: Prisma.FloatFilter = {};
      if (filtros.valorMinimo)
        valorFilter.gte = parseFloat(filtros.valorMinimo);
      if (filtros.valorMaximo)
        valorFilter.lte = parseFloat(filtros.valorMaximo);
      if (Object.keys(valorFilter).length > 0) where.valorTotal = valorFilter;

      if (
        isAdmin &&
        filtros.vendedor &&
        filtros.vendedor !== "todos_vendedores"
      ) {
        where.vendedorId = filtros.vendedor;
      }

      if (
        filtros.produtos &&
        Array.isArray(filtros.produtos) &&
        filtros.produtos.length > 0
      ) {
        where.produtos = {
          some: { produto: { nome: { in: filtros.produtos } } },
        };
      } else if (filtros.produto && filtros.produto !== "todos_produtos") {
        where.produtos = { some: { produto: { nome: filtros.produto } } };
      }
      // O filtro de objeção não se aplica diretamente ao modelo Cotacao como está definido,
      // então a lógica original de não aplicar o filtro para cotações pendentes está mantida.
    }

    console.log(
      "Filtros aplicados na consulta de cotações (getCotacoes - lógica original mantida e tipagem forte):",
      JSON.stringify(where, null, 2)
    );

    const cotacoesFromDb = await prisma.cotacao.findMany({
      where, // Sua lógica de filtros original é usada aqui, agora com tipos fortes
      include: {
        cliente: true,
        vendedor: {
          select: { name: true, id: true },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // A ALTERAÇÃO ESSENCIAL ESTÁ AQUI: MAPEAMENTO DOS DADOS RETORNADOS
    const cotacoesMapeadas = cotacoesFromDb.map((cotacao) => ({
      id: cotacao.id,
      codigoCotacao: cotacao.codigoCotacao,
      cliente: {
        id: cotacao.cliente.id,
        nome: cotacao.cliente.nome,
        segmento: cotacao.cliente.segmento,
        cnpj: cotacao.cliente.cnpj,
        razaoSocial: cotacao.cliente.razaoSocial || undefined,
        whatsapp: cotacao.cliente.whatsapp || undefined,
        recorrente: cotacao.cliente.recorrente,
      },
      produtos: cotacao.produtos.map((p) => ({
        id: p.produto.id,
        nome: p.produto.nome,
        medida: p.medida,
        quantidade: p.quantidade,
        valor: p.valor,
        comissao: p.comissao || 0,
        icms: p.icms || 0,
        ipi: p.ipi || 0,
      })),
      valorTotal: cotacao.valorTotal,
      condicaoPagamento: cotacao.condicaoPagamento,
      vendaRecorrente: cotacao.vendaRecorrente,
      nomeRecorrencia: cotacao.nomeRecorrencia || undefined,
      status: (cotacao.status || "pendente") as StatusCotacao,
      vendedorId: cotacao.vendedorId,
      vendedorNome: cotacao.vendedor.name,
      createdAt: cotacao.createdAt,
      updatedAt: cotacao.updatedAt,
      editedById: cotacao.editedById || undefined,
    }));

    console.log(
      `Encontradas ${cotacoesMapeadas.length} cotações após mapeamento.`
    );
    return { success: true, cotacoes: cotacoesMapeadas };
  } catch (error) {
    console.error("Erro ao buscar cotações:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    return {
      error: `Erro ao buscar cotações: ${errorMessage}. Por favor, tente novamente.`,
    };
  }
}

// Finalizar cotação (transformar em venda)
// export async function finalizarCotacao(id: string, data: VendaFormData) {
//   try {
//     const session = await auth();
//     if (!session || !session.user) {
//       return { error: "Não autorizado" };
//     }

//     // Buscar a cotação para garantir que existe
//     const cotacao = await prisma.cotacao.findUnique({
//       where: { id },
//       include: {
//         cliente: true,
//         produtos: {
//           include: {
//             produto: true,
//           },
//         },
//       },
//     });

//     if (!cotacao) {
//       return { error: "Cotação não encontrada" };
//     }

//     // Criar a venda usando a função existente
//     const result = await criarVenda(data);

//     if (result.error) {
//       return { error: result.error };
//     }

//     // Se sucesso, excluir a cotação original
//     await prisma.cotacao.delete({
//       where: { id },
//     });

//     revalidatePath("/vendas");
//     return { success: true, id: result.id };
//   } catch (error) {
//     console.error("Erro ao finalizar cotação:", error);
//     return { error: "Erro ao finalizar cotação. Por favor, tente novamente." };
//   }
// }

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
            produto: true,
          },
        },
      },
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
      where: { id },
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
      error: "Ocorreu um erro ao excluir a cotação",
    };
  }
}

export async function converterCotacao(
  id: string,
  novoStatus: StatusCotacao,
  data: VendaFormData | NaoVendaFormData
): Promise<{ success?: boolean; error?: string; id?: string }> {
  try {
    console.log(`Iniciando conversão de cotação ID:${id} para status:${novoStatus}`);
    
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
            produto: true,
          },
        },
      },
    });
    
    console.log(`Resultado da busca por cotação: ${cotacaoExistente ? 'Encontrada' : 'Não encontrada'}`);

    // Verificar se é uma não-venda
    if (!cotacaoExistente) {
      const naoVendaExistente = await prisma.naoVenda.findUnique({
        where: { id },
        include: {
          cliente: true,
          produtos: {
            include: {
              produto: true,
            },
          },
        },
      });
      
      console.log(`Resultado da busca por não-venda: ${naoVendaExistente ? 'Encontrada' : 'Não encontrada'}`);

      if (!naoVendaExistente) {
        // Tentar buscar como venda
        const vendaExistente = await prisma.venda.findUnique({
          where: { id },
          include: {
            cliente: true,
            produtos: {
              include: {
                produto: true,
              },
            },
          },
        });
        
        console.log(`Resultado da busca por venda: ${vendaExistente ? 'Encontrada' : 'Não encontrada'}`);

        if (!vendaExistente) {
          return { error: "Cotação não encontrada" };
        }

        // É uma venda que será convertida
        if (novoStatus === "cancelada") {
          console.log("Convertendo venda para não-venda (cotação cancelada) - MÉTODO DIRETO");
          
          // NOVA ABORDAGEM: Conversão direta no banco de dados
          try {
            const vendaData = data as VendaFormData;
            
            // Criar a não-venda diretamente usando Prisma
            const naoVenda = await prisma.naoVenda.create({
              data: {
                codigoVenda: vendaExistente.codigoVenda,
                valorTotal: vendaData.valorTotal,
                condicaoPagamento: vendaData.condicaoPagamento,
                objecaoGeral: "Convertido de venda finalizada",
                clienteId: vendaExistente.clienteId,
                vendedorId: session.user.id,
                // Criar apenas o mínimo necessário de produtos
                produtos: {
                  create: vendaData.produtos.slice(0, 1).map(produto => ({
                    quantidade: produto.quantidade,
                    valor: produto.valor,
                    medida: produto.medida,
                    valorConcorrencia: 0,
                    nomeConcorrencia: "Não disponível",
                    infoNaoDisponivel: true,
                    produto: {
                      connect: {
                        id: produto.id
                      }
                    }
                  }))
                }
              }
            });
            
            console.log(`Não-venda criada com sucesso via método direto, ID: ${naoVenda.id}`);
            
            // Se criou com sucesso, excluir a venda original
            await prisma.venda.delete({
              where: { id }
            });
            
            console.log("Venda original excluída com sucesso");
            
            // Adicionar o restante dos produtos em uma segunda operação se necessário
            if (vendaData.produtos.length > 1) {
              const produtosAdicionais = vendaData.produtos.slice(1).map(produto => ({
                quantidade: produto.quantidade,
                valor: produto.valor,
                medida: produto.medida,
                valorConcorrencia: 0,
                nomeConcorrencia: "Não disponível",
                infoNaoDisponivel: true,
                naoVendaId: naoVenda.id,
                produtoId: produto.id || ""
              }));
              
              if (produtosAdicionais.length > 0) {
                await prisma.naoVendaProduto.createMany({
                  data: produtosAdicionais
                });
                console.log(`${produtosAdicionais.length} produtos adicionais incluídos na não-venda`);
              }
            }
            
            return { success: true, id: naoVenda.id };
          } catch (directError) {
            console.error("ERRO NO MÉTODO DIRETO:", directError);
            
            // Se falhou com o método direto, tentar método alternativo
            try {
              // Método alternativo: usar transação para garantir atomicidade
              const resultado = await prisma.$transaction(async (tx) => {
                // 1. Criar uma não-venda mínima
                const novaNaoVenda = await tx.naoVenda.create({
                  data: {
                    codigoVenda: vendaExistente.codigoVenda,
                    valorTotal: vendaExistente.valorTotal,
                    condicaoPagamento: vendaExistente.condicaoPagamento,
                    objecaoGeral: "Convertido via método alternativo",
                    clienteId: vendaExistente.clienteId,
                    vendedorId: vendaExistente.vendedorId
                  }
                });
                
                // 2. Excluir a venda original
                await tx.venda.delete({
                  where: { id }
                });
                
                return novaNaoVenda;
              });
              
              console.log(`Não-venda criada com método alternativo, ID: ${resultado.id}`);
              return { success: true, id: resultado.id };
            } catch (alternativeError) {
              console.error("ERRO NO MÉTODO ALTERNATIVO:", alternativeError);
              return { error: "Falha em todos os métodos de conversão. Tente novamente." };
            }
          }
        } else {
          // Atualizar venda existente
          console.log("Atualizando venda existente");
          return await atualizarVenda(id, data as VendaFormData);
        }
      } else {
        // É uma não-venda que será convertida
        if (novoStatus === "finalizada") {
          console.log("Convertendo não-venda para venda (cotação finalizada)");
          
          // Obter o código da não-venda para preservá-lo
          const codigoNaoVendaOriginal = naoVendaExistente.codigoVenda;
          
          // Adicionar o código manual aos dados da venda
          const vendaData = data as VendaFormData;
          vendaData.codigoManual = codigoNaoVendaOriginal;
          
          // Converter não-venda para venda
          const result = await criarVenda(vendaData);

          if (result.success) {
            console.log(`Venda criada com sucesso, ID: ${result.id}`);
            // Excluir a não-venda original após criar a venda
            await prisma.naoVenda.delete({
              where: { id },
            });
            console.log("Não-venda original excluída com sucesso");
          } else {
            console.error("Erro ao criar venda:", result.error);
          }

          return result;
        } else {
          // Atualizar não-venda existente
          console.log("Atualizando não-venda existente");
          return await atualizarNaoVenda(id, data as NaoVendaFormData);
        }
      }
    } else {
      // É uma cotação pendente que será convertida
      console.log("Convertendo cotação pendente");
      
      if (novoStatus === "finalizada") {
        console.log("Para cotação finalizada (venda)");
        return await finalizarCotacao(id, data as VendaFormData);
      } else if (novoStatus === "cancelada") {
        console.log("Para cotação cancelada (não-venda)");
        return await cancelarCotacao(id, data as NaoVendaFormData);
      } else {
        // Manter como cotação pendente, apenas atualizar
        console.log("Mantendo como cotação pendente (atualização)");
        return await atualizarCotacao(id, data as CotacaoFormData);
      }
    }
  } catch (error) {
    console.error("Erro ao converter cotação:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return {
      error: `Ocorreu um erro ao converter a cotação: ${errorMessage}. Por favor, tente novamente.`,
    };
  }
}

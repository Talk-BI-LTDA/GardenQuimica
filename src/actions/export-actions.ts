// src/actions/export-actions.ts
"use server";

import { prisma } from "@/lib/supabase/prisma";
import { utils, write } from "@/lib/xlsx-wrapper";
import { StatusCotacao } from "@/types/cotacao-tipos";
import { auth } from "@/lib/auth";

// Tipos para as opções de exportação
export type ExportFormat = "csv" | "xlsx" | "tsv" | "json";
export type ExportType = "resumida" | "completa";
export type ExportTabs = "pendentes" | "finalizadas" | "canceladas";

export interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  tabs: ExportTabs[];
  filters?: Record<string, unknown>;
}

// Função principal de exportação
export async function exportVendasData(options: ExportOptions) {
  try {
    // Obter a sessão do usuário atual
    const session = await auth();
    if (!session || !session.user) {
      throw new Error("Usuário não autenticado");
    }

    // Obter dados de acordo com os tabs selecionados
    const pendentes: Record<string, unknown>[] = [];
    const finalizadas: Record<string, unknown>[] = [];
    const canceladas: Record<string, unknown>[] = [];

    // Construir filtros para consulta
    const where: Record<string, unknown> = {};
    
    // Se não for admin, filtrar apenas pelos dados do usuário
    if (session.user.role !== "ADMIN") {
      where.vendedorId = session.user.id;
    }
    
    // Aplicar filtros fornecidos
    if (options.filters) {
      // Filtros de data
      if (options.filters.dataInicio && options.filters.dataFim) {
        where.createdAt = { 
          gte: new Date(options.filters.dataInicio as string), 
          lte: new Date(options.filters.dataFim as string) 
        };
      }
      
      // Filtros de cliente
      if (options.filters.clienteId) {
        where.clienteId = options.filters.clienteId;
      } else if (options.filters.nomeCliente) {
        where.cliente = { 
          nome: { contains: options.filters.nomeCliente, mode: 'insensitive' } 
        };
      }
      
      // Filtro de segmento
      if (options.filters.segmento) {
        where.cliente = { 
          ...where.cliente as Record<string, unknown> || {},
          segmento: options.filters.segmento 
        };
      }
      
      // Filtro de cliente recorrente
      if (options.filters.clienteRecorrente) {
        where.cliente = {
          ...where.cliente as Record<string, unknown> || {},
          recorrente: options.filters.clienteRecorrente === 'sim'
        };
      }
      
      // Filtros de valor
      if (options.filters.valorMinimo || options.filters.valorMaximo) {
        const valorTotal: Record<string, number> = {};
        
        if (options.filters.valorMinimo) {
          const minValue = parseFloat(options.filters.valorMinimo as string);
          if (!isNaN(minValue)) {
            valorTotal.gte = minValue;
          }
        }
        
        if (options.filters.valorMaximo) {
          const maxValue = parseFloat(options.filters.valorMaximo as string);
          if (!isNaN(maxValue)) {
            valorTotal.lte = maxValue;
          }
        }
        
        // Só adiciona o filtro de valorTotal se houver valores válidos
        if (Object.keys(valorTotal).length > 0) {
          where.valorTotal = valorTotal;
        }
      }
      
      // Filtro de vendedor
      if (options.filters.vendedor) {
        where.vendedorId = options.filters.vendedor;
      }
      
      // Filtro de produtos
      if (options.filters.produtos && Array.isArray(options.filters.produtos) && options.filters.produtos.length > 0) {
        where.produtos = {
          some: {
            produto: {
              nome: {
                in: options.filters.produtos
              }
            }
          }
        };
      } else if (options.filters.produto) {
        where.produtos = {
          some: {
            produto: {
              nome: options.filters.produto
            }
          }
        };
      }
      
      // Filtro de objeção
      if (options.filters.objecao) {
        // Para não-vendas, verificar objeção geral e objeções de produtos
        where.OR = [
          { objecaoGeral: { contains: options.filters.objecao, mode: 'insensitive' } },
          { 
            produtos: {
              some: {
                objecao: { contains: options.filters.objecao, mode: 'insensitive' }
              }
            }
          }
        ];
      }
    }

    // Buscar dados de acordo com os tabs selecionados
    if (options.tabs.includes("pendentes")) {
      try {
        const cotacoes = await prisma.cotacao.findMany({
          where: {
            ...where,
            status: "pendente" as StatusCotacao
          },
          include: {
            cliente: true,
            produtos: {
              include: {
                produto: true
              }
            },
            vendedor: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        pendentes.push(
          ...cotacoes.map(item => ({
            tipo: "pendente",
            ...item
          }))
        );
      } catch (err) {
        console.error("Erro ao buscar cotações pendentes:", err);
        throw new Error(`Erro ao buscar cotações pendentes: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (options.tabs.includes("finalizadas")) {
      try {
        // Limpar filtros específicos que não se aplicam a vendas
        const vendaWhere = {...where};
        if (vendaWhere.OR && Array.isArray(vendaWhere.OR)) {
          delete vendaWhere.OR;
        }
        
        const vendas = await prisma.venda.findMany({
          where: vendaWhere,
          include: {
            cliente: true,
            produtos: {
              include: {
                produto: true
              }
            },
            vendedor: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        finalizadas.push(
          ...vendas.map(item => ({
            tipo: "finalizada",
            ...item
          }))
        );
      } catch (err) {
        console.error("Erro ao buscar cotações finalizadas:", err);
        throw new Error(`Erro ao buscar cotações finalizadas: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (options.tabs.includes("canceladas")) {
      try {
        const naoVendas = await prisma.naoVenda.findMany({
          where,
          include: {
            cliente: true,
            produtos: {
              include: {
                produto: true
              }
            },
            vendedor: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        canceladas.push(
          ...naoVendas.map(item => ({
            tipo: "cancelada",
            ...item
          }))
        );
      } catch (err) {
        console.error("Erro ao buscar cotações canceladas:", err);
        throw new Error(`Erro ao buscar cotações canceladas: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Combinar todos os dados
    const allData = [
      ...pendentes,
      ...finalizadas,
      ...canceladas
    ];

    // Se não houver dados, notificar o usuário
    if (allData.length === 0) {
      throw new Error("Nenhum dado encontrado para exportação com os filtros selecionados.");
    }

    // Formatar dados para exportação
    const formattedData = formatDataForExport(allData, options.type);

    // Gerar arquivo no formato solicitado
    return generateFile(formattedData, options.format);
  } catch (error) {
    console.error("Erro ao exportar dados:", error);
    throw new Error("Falha ao exportar dados: " + (error instanceof Error ? error.message : String(error)));
  }
}

// Tipo para item formatado para exportação
type FormattedDataItem = Record<string, string | number | boolean | null>;

// Função para formatar dados de acordo com o tipo de exportação
function formatDataForExport(
  data: Record<string, unknown>[],
  type: ExportType
): FormattedDataItem[] {
  return data.map(item => {
    // Dados básicos para exportação resumida
    const baseData: FormattedDataItem = {
      "Código": item.tipo === "pendente" 
        ? (item as Record<string, unknown>).codigoCotacao as string
        : (item as Record<string, unknown>).codigoVenda as string,
      "Tipo": item.tipo === "pendente" ? "Cotação Pendente" : 
              item.tipo === "finalizada" ? "Cotação Finalizada" : "Cotação Cancelada",
      "Cliente": ((item as Record<string, unknown>).cliente as Record<string, unknown>)?.nome as string || "N/A",
      "CNPJ": ((item as Record<string, unknown>).cliente as Record<string, unknown>)?.cnpj as string || "N/A",
      "Valor Total": typeof (item as Record<string, unknown>).valorTotal === 'number' 
        ? ((item as Record<string, unknown>).valorTotal as number).toFixed(2) 
        : '0.00',
      "Condição de Pagamento": (item as Record<string, unknown>).condicaoPagamento as string || "N/A",
      "Vendedor": ((item as Record<string, unknown>).vendedor as Record<string, unknown>)?.name as string || "N/A",
      "Data de Criação": formatDate((item as Record<string, unknown>).createdAt as Date),
      "Data de Atualização": formatDate((item as Record<string, unknown>).updatedAt as Date)
    };
    
    // Para exportação completa, adicionar mais detalhes
    if (type === "completa") {
      const cliente = (item as Record<string, unknown>).cliente as Record<string, unknown>;
      // Adicionar dados detalhados do cliente
      if (cliente) {
        baseData["Segmento do Cliente"] = cliente.segmento as string || "N/A";
        baseData["Razão Social"] = cliente.razaoSocial as string || "N/A";
        baseData["WhatsApp"] = cliente.whatsapp as string || "N/A";
        baseData["Cliente Recorrente"] = cliente.recorrente ? "Sim" : "Não";
      }
      
      // Verificar se é uma venda recorrente
      if (item.tipo === "finalizada") {
        baseData["Venda Recorrente"] = (item as Record<string, unknown>).vendaRecorrente ? "Sim" : "Não";
        if ((item as Record<string, unknown>).vendaRecorrente && (item as Record<string, unknown>).nomeRecorrencia) {
          baseData["Nome Recorrência"] = (item as Record<string, unknown>).nomeRecorrencia as string;
        }
      }
      
      // Para cotações canceladas, adicionar objeção geral
      if (item.tipo === "cancelada" && (item as Record<string, unknown>).objecaoGeral) {
        baseData["Objeção Geral"] = (item as Record<string, unknown>).objecaoGeral as string || "Nenhuma";
      }
      
      // Adicionar informações de produtos
      const produtos = (item as Record<string, unknown>).produtos as Record<string, unknown>[] | undefined;
      if (produtos && Array.isArray(produtos) && produtos.length > 0) {
        // Para cada produto, criar uma linha de descrição
        let produtosDetalhes = "";
        
        produtos.forEach((prod, index) => {
          try {
            // Obter informações do produto de acordo com o tipo
            const produtoObj = (prod as Record<string, unknown>).produto as Record<string, unknown>;
            
            const nomeProduto = produtoObj?.nome as string || (prod as Record<string, unknown>).nome as string || "Sem nome";
            const quantidade = (prod as Record<string, unknown>).quantidade as number || 0;
            const medida = (prod as Record<string, unknown>).medida as string || "";
            const valor = (prod as Record<string, unknown>).valor as number || 0;
            
            produtosDetalhes += `Produto ${index + 1}: ${nomeProduto}, Quantidade: ${quantidade} ${medida}, Valor: R$ ${valor.toFixed(2)}`;
            
            // Adicionar detalhes específicos para produtos com informações de concorrência
            if ((prod as Record<string, unknown>).valorConcorrencia) {
              produtosDetalhes += `, Concorrência: ${(prod as Record<string, unknown>).nomeConcorrencia as string || 'Não informada'}, Valor: R$ ${Number((prod as Record<string, unknown>).valorConcorrencia).toFixed(2)}`;
              
              if ((prod as Record<string, unknown>).objecao) {
                produtosDetalhes += `, Objeção: ${(prod as Record<string, unknown>).objecao as string}`;
              }
            }
            
            produtosDetalhes += "\n";
          } catch (err) {
            console.error("Erro ao processar produto:", err);
            produtosDetalhes += `Produto ${index + 1}: [Erro ao processar dados]\n`;
          }
        });
        
        baseData["Produtos"] = produtosDetalhes.trim();
      }
    }
    
    return baseData;
  });
}

// Função para formatar data
function formatDate(date: Date | null | undefined): string {
  if (!date) return "N/A";
  try {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return "Data inválida";
  }
}

// Função para gerar arquivo no formato solicitado
function generateFile(data: Record<string, unknown>[], format: ExportFormat) {
  // Data atual no formato YYYY-MM-DD
  const currentDate = new Date().toISOString().split("T")[0];
  const fileName = `cotacoes_garden_${currentDate}`;

  let fileData: string;
  let fileType: string;
  let fileExtension: string;

  switch (format) {
    case "csv":
      fileData = utils.sheet_to_csv(utils.json_to_sheet(data));
      fileType = "text/csv";
      fileExtension = ".csv";
      break;

    case "tsv":
      fileData = utils.sheet_to_csv(utils.json_to_sheet(data), { FS: "\t" });
      fileType = "text/tab-separated-values";
      fileExtension = ".tsv";
      break;

    case "json":
      fileData = JSON.stringify(data, null, 2);
      fileType = "application/json";
      fileExtension = ".json";
      break;

    case "xlsx":
      const worksheet = utils.json_to_sheet(data);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Cotações");

      // Criando base64 do arquivo para enviar ao cliente corretamente
      fileData = write(workbook, { bookType: "xlsx", type: "base64" });
      fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      fileExtension = ".xlsx";
      break;

    default:
      throw new Error("Formato inválido.");
  }

  return {
    fileData,
    fileType,
    fileName: `${fileName}${fileExtension}`,
  };
}
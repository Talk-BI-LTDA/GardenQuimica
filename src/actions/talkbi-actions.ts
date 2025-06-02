// @/actions/talkbi-actions.ts
"use server";

import { prisma } from "@/lib/supabase/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ClienteTalkBI, ClienteTalkBICreate, EnviarFluxoRequest, RemarketingForm, RemarketingDetalhes, RemarketingFiltros, ClienteComEtiquetas } from "@/types/cliente-talkbi";
import { Prisma } from "@prisma/client";

const TALKBI_API_URL = "https://chat.talkbi.com.br/api";
const TALKBI_API_KEY = process.env.TALKBI_API_KEY || "";

/**
 * Enviar fluxo para cliente no TalkBI
 */
export async function enviarFluxoTalkBI(user_ns: string, sub_flow_ns: string = "f153643s1950233") {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    if (!user_ns) {
      return { error: "ID do usuário (user_ns) é obrigatório" };
    }

    if (!sub_flow_ns) {
      return { error: "ID do fluxo (sub_flow_ns) é obrigatório" };
    }

    console.log(`Enviando fluxo: user_ns=${user_ns}, sub_flow_ns=${sub_flow_ns}`);

    const payload: EnviarFluxoRequest = {
      user_ns,
      sub_flow_ns
    };

    const response = await fetch(`${TALKBI_API_URL}/subscriber/send-sub-flow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TALKBI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error("Erro ao enviar fluxo para cliente:", responseData);
      return { 
        error: responseData.message || "Erro ao enviar fluxo",
        status: response.status,
        responseData 
      };
    }

    console.log("Fluxo enviado com sucesso:", responseData);
    return { success: true, data: responseData };
  } catch (error) {
    console.error("Erro ao enviar fluxo para cliente:", error);
    return { error: "Ocorreu um erro ao enviar o fluxo", details: error };
  }
}

/**
 * Sincroniza um cliente com o TalkBI
 */
export async function sincronizarClienteTalkBI(clienteId: string) {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    // Buscar cliente no banco de dados
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        etiquetas: true
      }
    });

    if (!cliente) {
      return { error: "Cliente não encontrado" };
    }

    // Verificar se cliente tem whatsapp
    if (!cliente.whatsapp) {
      return { error: "Cliente não possui WhatsApp para sincronização" };
    }

    // Preparar dados para envio ao TalkBI
    // O campo "phone" na API TalkBI corresponde ao campo "whatsapp" no nosso sistema
    const clienteTalkBI: ClienteTalkBICreate = {
      name: cliente.nome,
      phone: cliente.whatsapp, // Aqui garantimos que o whatsapp seja enviado como phone
      email: cliente.email || "", // Email pode ser vazio
      first_name: cliente.nome.split(' ')[0],
      last_name: cliente.nome.split(' ').slice(1).join(' ') || undefined,
    };

    console.log("Dados do cliente para sincronização:", clienteTalkBI);

    // Verificar se cliente já existe no TalkBI (pelo user_ns)
    if (cliente.user_ns) {
      // Se já existe, deletar e recriar (conforme especificado)
      await deletarClienteTalkBI(cliente.user_ns);
    }

    // Criar cliente no TalkBI
    const response = await fetch(`${TALKBI_API_URL}/subscriber/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TALKBI_API_KEY}`
      },
      body: JSON.stringify(clienteTalkBI)
    });

    // Capturar resposta para debug
    const responseData = await response.json();

    if (!response.ok) {
      console.error("Erro ao sincronizar cliente com TalkBI:", responseData);
      return { error: responseData.message || "Erro ao sincronizar cliente", responseData };
    }

    const data = responseData as ClienteTalkBI;
    
    console.log("Resposta da sincronização:", data);
    
    // Atualizar cliente no banco com o user_ns do TalkBI
    if (data.user_ns) {
      await prisma.cliente.update({
        where: { id: clienteId },
        data: {
          user_ns: data.user_ns,
          origem: cliente.origem || "sistema" // Manter origem se já existe
        }
      });

      // Se houver etiquetas, enviar para o TalkBI
      if (cliente.etiquetas && cliente.etiquetas.length > 0) {
        // Implementar envio de etiquetas para o TalkBI
        // Essa funcionalidade seria implementada quando tivermos acesso à API de etiquetas do TalkBI
      }

      return { success: true, user_ns: data.user_ns };
    }

    return { error: "Não foi possível obter o ID do cliente no TalkBI" };
  } catch (error) {
    console.error("Erro ao sincronizar cliente com TalkBI:", error);
    return { error: "Ocorreu um erro ao sincronizar o cliente", details: error };
  }
}

/**
 * Deleta um cliente no TalkBI pelo user_ns
 */
async function deletarClienteTalkBI(user_ns: string) {
  try {
    console.log(`Deletando cliente ${user_ns} no TalkBI`);
    
    const response = await fetch(`${TALKBI_API_URL}/subscriber/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TALKBI_API_KEY}`
      },
      body: JSON.stringify({ user_ns })
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error("Erro ao deletar cliente no TalkBI:", responseData);
      return { error: responseData.message || "Erro ao deletar cliente", responseData };
    }

    console.log("Cliente deletado com sucesso no TalkBI");
    return { success: true, data: responseData };
  } catch (error) {
    console.error("Erro ao deletar cliente no TalkBI:", error);
    return { error: "Ocorreu um erro ao deletar o cliente no TalkBI", details: error };
  }
}

/**
 * Sincroniza todos os clientes com o TalkBI
 */
export async function sincronizarTodosClientes(incluirJaSincronizados: boolean = false) {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    // Filtros para a busca de clientes
    const where: Prisma.ClienteWhereInput = {};
    
    // Se não incluir já sincronizados, filtrar apenas os que não têm user_ns
    if (!incluirJaSincronizados) {
      where.user_ns = null;
    }

    // Buscar clientes
    const clientes = await prisma.cliente.findMany({
      where
    });

    console.log(`Sincronizando ${clientes.length} clientes com TalkBI...`);

    // Sincronizar cada cliente
    const resultados = await Promise.all(
      clientes.map(cliente => sincronizarClienteTalkBI(cliente.id))
    );

    const sucessos = resultados.filter(r => r.success).length;
    const falhas = resultados.filter(r => r.error).length;

    return { 
      success: true, 
      message: `${sucessos} clientes sincronizados com sucesso. ${falhas} falhas.` 
    };
  } catch (error) {
    console.error("Erro ao sincronizar todos os clientes:", error);
    return { error: "Ocorreu um erro ao sincronizar os clientes" };
  }
}

/**
 * Criar uma ação de remarketing
 */
export async function criarRemarketing(data: RemarketingForm) {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    const vendedorId = session.user.id;

    // Criar remarketing no banco
    const remarketing = await prisma.remarketing.create({
      data: {
        nome: data.nome,
        dataAgendada: data.dataAgendada,
        subFlowNs: data.subFlowNs || "f153643s1950233",
        vendedorId,
        clientes: {
          create: data.clienteIds.map(clienteId => ({
            clienteId
          }))
        }
      }
    });

    // Verificar se a data agendada é agora (enviar imediatamente)
    const agora = new Date();
    if (data.dataAgendada <= agora) {
      // Buscar clientes com user_ns para enviar fluxo
      const clientesRemarketing = await prisma.remarketingCliente.findMany({
        where: {
          remarketingId: remarketing.id
        },
        include: {
          cliente: true
        }
      });

      // Enviar fluxo para cada cliente que tem user_ns
      for (const item of clientesRemarketing) {
        if (item.cliente.user_ns) {
          await enviarFluxoTalkBI(item.cliente.user_ns, remarketing.subFlowNs);
        }
      }

      // Atualizar status do remarketing para enviado
      await prisma.remarketing.update({
        where: { id: remarketing.id },
        data: { status: "enviado" }
      });
    }

    revalidatePath("/remarketing");
    return { success: true, id: remarketing.id };
  } catch (error) {
    console.error("Erro ao criar remarketing:", error);
    return { error: "Ocorreu um erro ao criar o remarketing" };
  }
}

/**
 * Obter todos os remarketing agendados
 */
export async function getRemarketingAgendados(filtros?: RemarketingFiltros) {
  try {
    const session = await auth();
    if (!session) {
      redirect("/login");
    }

    const where: Prisma.RemarketingWhereInput = {
        status: "agendado"
      };
      

    // Se não for admin, filtrar apenas remarketing do vendedor
    if (session.user.role !== "ADMIN") {
      where.vendedorId = session.user.id;
    } else if (filtros?.vendedorId) {
      where.vendedorId = filtros.vendedorId;
    }

    // Aplicar filtros de data
    if (filtros?.dataInicio && filtros?.dataFim) {
      where.dataAgendada = {
        gte: filtros.dataInicio,
        lte: filtros.dataFim
      };
    }

    // Aplicar filtro de busca
    if (filtros?.searchTerm) {
      where.OR = [
        { nome: { contains: filtros.searchTerm, mode: "insensitive" } }
      ];
    }

    // Buscar remarketing
    const remarketing = await prisma.remarketing.findMany({
      where,
      include: {
        vendedor: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            clientes: true
          }
        }
      },
      orderBy: {
        dataAgendada: "asc"
      }
    });

    // Formatar resposta
    const remarketingFormatados = remarketing.map(item => ({
      id: item.id,
      nome: item.nome,
      dataAgendada: item.dataAgendada,
      status: item.status,
      subFlowNs: item.subFlowNs,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      vendedorId: item.vendedorId,
      vendedorNome: item.vendedor.name,
      totalClientes: item._count.clientes
    }));

    return { success: true, remarketing: remarketingFormatados };
  } catch (error) {
    console.error("Erro ao buscar remarketing agendados:", error);
    return { error: "Ocorreu um erro ao buscar os remarketing agendados" };
  }
}

/**
 * Obter todos os remarketing enviados
 */
export async function getRemarketingEnviados(filtros?: RemarketingFiltros) {
  try {
    const session = await auth();
    if (!session) {
      redirect("/login");
    }

    const where: Prisma.RemarketingWhereInput = {
        status: "enviado"
      };

    // Se não for admin, filtrar apenas remarketing do vendedor
    if (session.user.role !== "ADMIN") {
      where.vendedorId = session.user.id;
    } else if (filtros?.vendedorId) {
      where.vendedorId = filtros.vendedorId;
    }

    // Aplicar filtros de data
    if (filtros?.dataInicio && filtros?.dataFim) {
      where.dataAgendada = {
        gte: filtros.dataInicio,
        lte: filtros.dataFim
      };
    }

    // Aplicar filtro de busca
    if (filtros?.searchTerm) {
      where.OR = [
        { nome: { contains: filtros.searchTerm, mode: "insensitive" } }
      ];
    }

    // Buscar remarketing
    const remarketing = await prisma.remarketing.findMany({
      where,
      include: {
        vendedor: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            clientes: true
          }
        }
      },
      orderBy: {
        dataAgendada: "desc"
      }
    });

    // Formatar resposta
    const remarketingFormatados = remarketing.map(item => ({
      id: item.id,
      nome: item.nome,
      dataAgendada: item.dataAgendada,
      status: item.status,
      subFlowNs: item.subFlowNs,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      vendedorId: item.vendedorId,
      vendedorNome: item.vendedor.name,
      totalClientes: item._count.clientes
    }));

    return { success: true, remarketing: remarketingFormatados };
  } catch (error) {
    console.error("Erro ao buscar remarketing enviados:", error);
    return { error: "Ocorreu um erro ao buscar os remarketing enviados" };
  }
}

/**
 * Obter detalhes de um remarketing específico
 */
export async function getRemarketingDetalhes(id: string): Promise<{ success?: boolean; error?: string; remarketing?: RemarketingDetalhes }> {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    // Buscar remarketing com clientes
    const remarketing = await prisma.remarketing.findUnique({
      where: { id },
      include: {
        vendedor: {
          select: {
            name: true
          }
        },
        clientes: {
          include: {
            cliente: {
              include: {
                etiquetas: true
              }
            }
          }
        }
      }
    });

    if (!remarketing) {
      return { error: "Remarketing não encontrado" };
    }

    // Verificar permissão
    if (session.user.role !== "ADMIN" && remarketing.vendedorId !== session.user.id) {
      return { error: "Você não tem permissão para visualizar este remarketing" };
    }

    // Obter todas as etiquetas únicas
    const todasEtiquetas = new Set<string>();
    remarketing.clientes.forEach(cliente => {
      cliente.cliente.etiquetas.forEach(etiqueta => {
        todasEtiquetas.add(etiqueta.nome);
      });
    });

    // Formatar clientes
    const clientesFormatados = remarketing.clientes.map(item => ({
        id: item.cliente.id,
        nome: item.cliente.nome,
        segmento: item.cliente.segmento,
        cnpj: item.cliente.cnpj,
        razaoSocial: item.cliente.razaoSocial,
        whatsapp: item.cliente.whatsapp || "",
        recorrente: item.cliente.recorrente,
        origem: item.cliente.origem,
        user_ns: item.cliente.user_ns,
        etiquetas: item.cliente.etiquetas.map(etiqueta => ({
          id: etiqueta.id,
          nome: etiqueta.nome
        }))
      })) as ClienteComEtiquetas[];

    // Formatar resposta
    const remarketingDetalhes: RemarketingDetalhes = {
      id: remarketing.id,
      nome: remarketing.nome,
      dataAgendada: remarketing.dataAgendada,
      status: remarketing.status,
      subFlowNs: remarketing.subFlowNs,
      createdAt: remarketing.createdAt,
      updatedAt: remarketing.updatedAt,
      vendedorId: remarketing.vendedorId,
      vendedorNome: remarketing.vendedor.name,
      totalClientes: remarketing.clientes.length,
      totalEtiquetas: todasEtiquetas.size,
      clientes: clientesFormatados 
    };

    return { success: true, remarketing: remarketingDetalhes };
  } catch (error) {
    console.error("Erro ao buscar detalhes do remarketing:", error);
    return { error: "Ocorreu um erro ao buscar os detalhes do remarketing" };
  }
}

/**
 * Cancelar um remarketing
 */
export async function cancelarRemarketing(id: string) {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    // Buscar remarketing
    const remarketing = await prisma.remarketing.findUnique({
      where: { id }
    });

    if (!remarketing) {
      return { error: "Remarketing não encontrado" };
    }

    // Verificar permissão
    if (session.user.role !== "ADMIN" && remarketing.vendedorId !== session.user.id) {
      return { error: "Você não tem permissão para cancelar este remarketing" };
    }

    // Verificar se já foi enviado
    if (remarketing.status === "enviado") {
      return { error: "Não é possível cancelar um remarketing já enviado" };
    }

    // Atualizar status
    await prisma.remarketing.update({
      where: { id },
      data: {
        status: "cancelado"
      }
    });

    revalidatePath("/remarketing");
    return { success: true };
  } catch (error) {
    console.error("Erro ao cancelar remarketing:", error);
    return { error: "Ocorreu um erro ao cancelar o remarketing" };
  }
}

/**
 * Remover um cliente de um remarketing
 */
export async function removerClienteRemarketing(remarketingId: string, clienteId: string) {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    // Buscar remarketing
    const remarketing = await prisma.remarketing.findUnique({
      where: { id: remarketingId }
    });

    if (!remarketing) {
      return { error: "Remarketing não encontrado" };
    }

    // Verificar permissão
    if (session.user.role !== "ADMIN" && remarketing.vendedorId !== session.user.id) {
      return { error: "Você não tem permissão para modificar este remarketing" };
    }

    // Verificar se já foi enviado
    if (remarketing.status === "enviado") {
      return { error: "Não é possível modificar um remarketing já enviado" };
    }

    // Remover cliente
    await prisma.remarketingCliente.deleteMany({
      where: {
        remarketingId,
        clienteId
      }
    });

    // Verificar se ainda existem clientes
    const clientesRestantes = await prisma.remarketingCliente.count({
      where: {
        remarketingId
      }
    });

    // Se não houver mais clientes, cancelar o remarketing
    if (clientesRestantes === 0) {
      await prisma.remarketing.update({
        where: { id: remarketingId },
        data: {
          status: "cancelado"
        }
      });
    }

    revalidatePath("/remarketing");
    return { success: true };
  } catch (error) {
    console.error("Erro ao remover cliente do remarketing:", error);
    return { error: "Ocorreu um erro ao remover o cliente do remarketing" };
  }
}

/**
 * Atualizar a data de um remarketing
 */
export async function atualizarDataRemarketing(id: string, novaData: Date) {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    // Buscar remarketing
    const remarketing = await prisma.remarketing.findUnique({
      where: { id }
    });

    if (!remarketing) {
      return { error: "Remarketing não encontrado" };
    }

    // Verificar permissão
    if (session.user.role !== "ADMIN" && remarketing.vendedorId !== session.user.id) {
      return { error: "Você não tem permissão para modificar este remarketing" };
    }

    // Verificar se já foi enviado
    if (remarketing.status === "enviado") {
      return { error: "Não é possível modificar um remarketing já enviado" };
    }

    // Atualizar data
    await prisma.remarketing.update({
      where: { id },
      data: {
        dataAgendada: novaData
      }
    });

    revalidatePath("/remarketing");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar data do remarketing:", error);
    return { error: "Ocorreu um erro ao atualizar a data do remarketing" };
  }
}

/**
 * Processar remarketing agendados que estão na hora de serem enviados
 * Esta função seria chamada por um cron job
 */
export async function processarRemarketingAgendados() {
  try {
    const agora = new Date();
    console.log(`Iniciando processamento de remarketing agendados em: ${agora.toISOString()}`);

    // Buscar remarketing agendados para agora ou passados
    const remarketingPendentes = await prisma.remarketing.findMany({
      where: {
        status: "agendado",
        dataAgendada: {
          lte: agora
        }
      },
      include: {
        clientes: {
          include: {
            cliente: true
          }
        }
      }
    });

    console.log(`Encontrados ${remarketingPendentes.length} remarketing pendentes para processamento`);

    if (remarketingPendentes.length === 0) {
      return { success: true, processados: 0, mensagem: "Nenhum remarketing pendente encontrado" };
    }

    let sucessos = 0;
    let falhas = 0;
    const detalhes = [];

    // Processar cada remarketing
    for (const remarketing of remarketingPendentes) {
      console.log(`Processando remarketing: ${remarketing.id} - ${remarketing.nome}`);
      console.log(`Total de clientes neste remarketing: ${remarketing.clientes.length}`);
      
      // Garantir que o subflow está definido
      const subFlowNs = remarketing.subFlowNs || "f153643s1950233";
      
      // Enviar fluxo para cada cliente
      for (const clienteRemarketing of remarketing.clientes) {
        const cliente = clienteRemarketing.cliente;
        
        console.log(`Processando cliente: ${cliente.id} - ${cliente.nome} - user_ns: ${cliente.user_ns || 'Não definido'}`);
        
        // Se cliente tem user_ns, enviar fluxo
        if (cliente.user_ns) {
          const resultado = await enviarFluxoTalkBI(cliente.user_ns, subFlowNs);
          
          if (resultado.success) {
            sucessos++;
            console.log(`Fluxo enviado com sucesso para cliente: ${cliente.nome} (${cliente.user_ns})`);
          } else {
            falhas++;
            console.error(`Falha ao enviar fluxo para cliente: ${cliente.nome} (${cliente.user_ns})`, resultado.error);
            detalhes.push({
              clienteId: cliente.id,
              clienteNome: cliente.nome,
              user_ns: cliente.user_ns,
              erro: resultado.error
            });
          }
        } else {
          console.log(`Cliente ${cliente.nome} não possui user_ns. Tentando sincronizar...`);
          // Tentar sincronizar cliente e depois enviar fluxo
          const resultadoSync = await sincronizarClienteTalkBI(cliente.id);
          
          if (resultadoSync.success && resultadoSync.user_ns) {
            console.log(`Cliente ${cliente.nome} sincronizado com sucesso. Novo user_ns: ${resultadoSync.user_ns}`);
            const resultadoEnvio = await enviarFluxoTalkBI(resultadoSync.user_ns, subFlowNs);
            
            if (resultadoEnvio.success) {
              sucessos++;
              console.log(`Fluxo enviado com sucesso para cliente recém-sincronizado: ${cliente.nome}`);
            } else {
              falhas++;
              console.error(`Falha ao enviar fluxo para cliente recém-sincronizado: ${cliente.nome}`, resultadoEnvio.error);
              detalhes.push({
                clienteId: cliente.id,
                clienteNome: cliente.nome,
                user_ns: resultadoSync.user_ns,
                erro: resultadoEnvio.error
              });
            }
          } else {
            falhas++;
            console.error(`Não foi possível sincronizar o cliente: ${cliente.nome}`, resultadoSync.error);
            detalhes.push({
              clienteId: cliente.id,
              clienteNome: cliente.nome,
              erro: `Falha na sincronização: ${resultadoSync.error}`
            });
          }
        }
      }

      // Atualizar status do remarketing
      await prisma.remarketing.update({
        where: { id: remarketing.id },
        data: {
          status: "enviado"
        }
      });
      
      console.log(`Remarketing ${remarketing.id} marcado como enviado`);
    }

    return { 
      success: true, 
      processados: remarketingPendentes.length,
      sucessos,
      falhas,
      detalhes: detalhes.length > 0 ? detalhes : undefined
    };
  } catch (error) {
    console.error("Erro crítico ao processar remarketing agendados:", error);
    return { error: "Ocorreu um erro ao processar os remarketing agendados", details: error };
  }
}
// Adicione em talkbi-actions.ts
export async function testeTalkBIConnection() {
  try {
    console.log("Testando conexão com TalkBI API...");
    console.log("API URL:", TALKBI_API_URL);
    console.log("API Key configurada:", TALKBI_API_KEY ? "Sim (primeiros 5 caracteres: " + TALKBI_API_KEY.substring(0, 5) + "...)" : "Não");
    
    // Tenta uma chamada real à API - um método GET que não requer parâmetros
    // ou uma chamada mínima para criar um subscriber (que falha de propósito)
    const response = await fetch(`${TALKBI_API_URL}/subscriber/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TALKBI_API_KEY}`
      },
      body: JSON.stringify({ name: "Teste de Conexão" })
    });
    
    console.log("Status da resposta:", response.status);
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = "Não foi possível obter corpo da resposta";
    }
    console.log("Resposta:", data);
    
    // Mesmo que a operação falhe por falta de parâmetros obrigatórios,
    // se o status for 400 (Bad Request) e não 401 (Unauthorized),
    // significa que a API Key está funcionando
    const apiKeyValida = response.status !== 401 && response.status !== 403;
    
    return { 
      success: apiKeyValida, 
      status: response.status,
      data,
      apiKeyValida,
      mensagem: apiKeyValida 
        ? "API Key parece válida (autenticação bem-sucedida)" 
        : "API Key parece inválida (erro de autenticação)"
    };
  } catch (error) {
    console.error("Erro ao testar conexão:", error);
    return { 
      success: false, 
      error: "Erro ao conectar com a API TalkBI",
      details: error
    };
  }
}

export async function criarEProcessarRemarketingImediato(nome: string, clienteIds: string[]) {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    console.log(`Criando remarketing imediato: ${nome} com ${clienteIds.length} clientes`);

    // Criar um remarketing com data agendada para agora (processamento imediato)
    const dataAgendada = new Date();
    
    // Criar remarketing no banco
    const remarketing = await prisma.remarketing.create({
      data: {
        nome,
        dataAgendada,
        subFlowNs: "f153643s1950233", // Fluxo padrão
        vendedorId: session.user.id,
        clientes: {
          create: clienteIds.map(clienteId => ({
            clienteId
          }))
        }
      },
      include: {
        clientes: {
          include: {
            cliente: true
          }
        }
      }
    });

    console.log(`Remarketing criado com ID: ${remarketing.id}`);
    
    // Processar imediatamente
    const resultados: any[] = [];
    let sucessos = 0;
    let falhas = 0;

    // Processar cada cliente
    for (const clienteRemarketing of remarketing.clientes) {
      const cliente = clienteRemarketing.cliente;
      console.log(`Processando cliente: ${cliente.id} - ${cliente.nome}`);
      
      // Verificar se cliente já tem user_ns
      if (cliente.user_ns) {
        // Cliente já sincronizado, enviar fluxo diretamente
        console.log(`Enviando fluxo para cliente ${cliente.nome} (user_ns: ${cliente.user_ns})`);
        const resultadoEnvio = await enviarFluxoTalkBI(cliente.user_ns, remarketing.subFlowNs);
        
        console.log(`Resultado do envio:`, resultadoEnvio);
        
        resultados.push({
          clienteId: cliente.id,
          clienteNome: cliente.nome,
          user_ns: cliente.user_ns,
          resultado: resultadoEnvio
        });
        
        if (resultadoEnvio.success) {
          sucessos++;
        } else {
          falhas++;
        }
      } else {
        // Cliente precisa ser sincronizado primeiro
        console.log(`Cliente ${cliente.nome} não tem user_ns, sincronizando...`);
        const resultadoSync = await sincronizarClienteTalkBI(cliente.id);
        
        console.log(`Resultado da sincronização:`, resultadoSync);
        
        if (resultadoSync.success && resultadoSync.user_ns) {
          // Agora enviar o fluxo
          console.log(`Enviando fluxo para cliente recém-sincronizado ${cliente.nome} (user_ns: ${resultadoSync.user_ns})`);
          const resultadoEnvio = await enviarFluxoTalkBI(resultadoSync.user_ns, remarketing.subFlowNs);
          
          console.log(`Resultado do envio:`, resultadoEnvio);
          
          resultados.push({
            clienteId: cliente.id,
            clienteNome: cliente.nome,
            user_ns: resultadoSync.user_ns,
            sync: resultadoSync,
            resultado: resultadoEnvio
          });
          
          if (resultadoEnvio.success) {
            sucessos++;
          } else {
            falhas++;
          }
        } else {
          // Falha na sincronização
          resultados.push({
            clienteId: cliente.id,
            clienteNome: cliente.nome,
            erro: "Falha na sincronização",
            sync: resultadoSync
          });
          falhas++;
        }
      }
    }

    // Atualizar status do remarketing
    await prisma.remarketing.update({
      where: { id: remarketing.id },
      data: { status: "enviado" }
    });
    
    console.log(`Remarketing ${remarketing.id} marcado como enviado`);

    return { 
      success: true, 
      id: remarketing.id,
      nome,
      clientesProcessados: remarketing.clientes.length,
      sucessos,
      falhas,
      resultados
    };
  } catch (error) {
    console.error("Erro ao criar e processar remarketing imediato:", error);
    return { error: "Ocorreu um erro ao processar o remarketing", details: error };
  }
}

export async function importarClientesTalkBI(clientesData: ClienteTalkBI[]) {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    console.log(`Importando ${clientesData.length} clientes do TalkBI...`);
    const resultados = [];

    for (const clienteData of clientesData) {
      try {
        // Verificar se o cliente já existe pelo user_ns
        if (clienteData.user_ns) {
          const clienteExistente = await prisma.cliente.findFirst({
            where: { user_ns: clienteData.user_ns }
          });

          if (clienteExistente) {
            // Atualizar cliente existente
            const clienteAtualizado = await prisma.cliente.update({
              where: { id: clienteExistente.id },
              data: {
                nome: clienteData.name || clienteExistente.nome,
                whatsapp: clienteData.phone || clienteExistente.whatsapp,
                email: clienteData.email || clienteExistente.email,
                origem: "talkbi",
                user_ns: clienteData.user_ns
              }
            });
            resultados.push({ status: "atualizado", cliente: clienteAtualizado });
          } else {
            // Criar novo cliente
            const novoCliente = await prisma.cliente.create({
              data: {
                nome: clienteData.name || "Cliente TalkBI",
                segmento: "Não especificado",
                cnpj: "", // Campo obrigatório no modelo, precisamos definir um valor padrão
                razaoSocial: null,
                whatsapp: clienteData.phone || null,
                email: clienteData.email || null,
                origem: "talkbi",
                user_ns: clienteData.user_ns,
                createdById: session.user.id
              }
            });
            resultados.push({ status: "criado", cliente: novoCliente });
          }
        } else {
          resultados.push({ status: "ignorado", motivo: "Sem user_ns" });
        }
      } catch (error) {
        console.error("Erro ao processar cliente:", error);
        resultados.push({ status: "erro", error });
      }
    }

    const sucessos = resultados.filter(r => r.status === "criado" || r.status === "atualizado").length;
    const falhas = resultados.filter(r => r.status === "erro" || r.status === "ignorado").length;

    return { 
      success: true, 
      message: `${sucessos} clientes importados com sucesso. ${falhas} falhas.`,
      resultados
    };
  } catch (error) {
    console.error("Erro ao importar clientes do TalkBI:", error);
    return { error: "Ocorreu um erro ao importar os clientes", details: error };
  }
}
let importacaoProgresso = {
  total: 0,
  processados: 0,
  importados: 0,
  atualizados: 0,
  falhas: 0,
  emProgresso: false,
  mensagemStatus: "Aguardando"
};

// Função para obter o progresso atual
export async function obterProgressoImportacao() {
  return { 
    ...importacaoProgresso,
    porcentagem: importacaoProgresso.total > 0 
      ? Math.round((importacaoProgresso.processados / importacaoProgresso.total) * 100) 
      : 0
  };
}

// Adicionar em talkbi-actions.ts
// @/actions/talkbi-actions.ts
export async function buscarEImportarClientesTalkBI() {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    // Inicializar variáveis de progresso
    importacaoProgresso = {
      total: 0,
      processados: 0,
      importados: 0,
      atualizados: 0,
      falhas: 0,
      emProgresso: true,
      mensagemStatus: "Iniciando importação..."
    };

    console.log("Iniciando importação de clientes da TalkBI...");
    
    // Armazenar todos os clientes importados
    let todosClientes: any[] = [];
    let paginaAtual = 1;
    let temMaisPaginas = true;
    const LIMITE_POR_PAGINA = 100; // Máximo permitido pela API
    
    // Buscar clientes página por página
    while (temMaisPaginas) {
      importacaoProgresso.mensagemStatus = `Buscando página ${paginaAtual} de clientes...`;
      console.log(importacaoProgresso.mensagemStatus);
      
      const response = await fetch(`${TALKBI_API_URL}/subscribers?page=${paginaAtual}&limit=${LIMITE_POR_PAGINA}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TALKBI_API_KEY}`
        }
      });

      if (!response.ok) {
        importacaoProgresso.mensagemStatus = `Erro na página ${paginaAtual}`;
        importacaoProgresso.emProgresso = false;
        console.error(`Erro ao buscar página ${paginaAtual} de clientes:`, response.status);
        return { error: "Falha ao buscar clientes", detalhes: await response.text() };
      }

      const responseData = await response.json();
      
      // Verificar se há dados
      if (!responseData.data || !Array.isArray(responseData.data)) {
        importacaoProgresso.mensagemStatus = "Formato de resposta inesperado";
        importacaoProgresso.emProgresso = false;
        console.error("Formato de resposta inesperado:", responseData);
        return { error: "Formato de resposta inesperado da API" };
      }
      
      // Adicionar clientes desta página ao array total
      const clientesDaPagina = responseData.data;
      todosClientes = [...todosClientes, ...clientesDaPagina];
      
      console.log(`Página ${paginaAtual}: ${clientesDaPagina.length} clientes obtidos. Total até agora: ${todosClientes.length}`);
      
      // Verificar se há mais páginas
      if (responseData.meta && responseData.meta.current_page < responseData.meta.last_page) {
        paginaAtual++;
        temMaisPaginas = true;
      } else if (clientesDaPagina.length < LIMITE_POR_PAGINA) {
        // Se temos menos itens que o limite, provavelmente é a última página
        temMaisPaginas = false;
      } else if (responseData.links && responseData.links.next) {
        // Se temos um link para a próxima página
        paginaAtual++;
        temMaisPaginas = true;
      } else {
        // Caso contrário, assumimos que não há mais páginas
        temMaisPaginas = false;
      }
      
      importacaoProgresso.mensagemStatus = `Buscados ${todosClientes.length} clientes até o momento...`;
    }
    
    importacaoProgresso.total = todosClientes.length;
    console.log(`Total de ${importacaoProgresso.total} clientes encontrados na TalkBI`);
    importacaoProgresso.mensagemStatus = `Encontrados ${importacaoProgresso.total} clientes. Iniciando processamento...`;

    // Processar e salvar cada cliente no banco de dados
    importacaoProgresso.importados = 0;
    importacaoProgresso.atualizados = 0;
    importacaoProgresso.falhas = 0;
    
    // Processar em lotes de 50 para melhor performance
    const tamanhoDolote = 50;
    for (let i = 0; i < todosClientes.length; i += tamanhoDolote) {
      const lote = todosClientes.slice(i, i + tamanhoDolote);
      const loteAtual = Math.floor(i/tamanhoDolote) + 1;
      const totalLotes = Math.ceil(todosClientes.length/tamanhoDolote);
      
      importacaoProgresso.mensagemStatus = `Processando lote ${loteAtual}/${totalLotes}`;
      console.log(importacaoProgresso.mensagemStatus);
      
      for (const clienteTalkBI of lote) {
        try {
          // Verificar se o cliente já existe pelo user_ns
          const clienteExistente = await prisma.cliente.findFirst({
            where: { user_ns: clienteTalkBI.user_ns }
          });

          if (clienteExistente) {
            // Atualizar cliente existente
            await prisma.cliente.update({
              where: { id: clienteExistente.id },
              data: {
                nome: clienteTalkBI.name || clienteExistente.nome,
                whatsapp: clienteTalkBI.phone || clienteExistente.whatsapp,
                email: clienteTalkBI.email || clienteExistente.email,
                origem: "talkbi",
                // Não atualizar CNPJ e segmento se já existirem
              }
            });
            importacaoProgresso.atualizados++;
          } else if (clienteTalkBI.phone || clienteTalkBI.email) { // Garantir que tenha telefone ou email
            // Criar novo cliente - note que alguns valores são temporários
            await prisma.cliente.create({
              data: {
                nome: clienteTalkBI.name || "Cliente TalkBI",
                segmento: "Importado TalkBI", // Valor padrão
                cnpj: clienteTalkBI.phone ? 
                      clienteTalkBI.phone.replace(/\D/g, '').padEnd(14, '0').substring(0, 14) : 
                      "00000000000000", // Valor temporário baseado no telefone
                razaoSocial: null,
                whatsapp: clienteTalkBI.phone || null,
                email: clienteTalkBI.email || null,
                origem: "talkbi",
                user_ns: clienteTalkBI.user_ns,
                createdById: session.user.id
              }
            });
            importacaoProgresso.importados++;
          } else {
            console.log("Cliente ignorado por falta de dados essenciais:", clienteTalkBI.user_ns);
            importacaoProgresso.falhas++;
          }
        } catch (error) {
          console.error("Erro ao processar cliente:", error);
          importacaoProgresso.falhas++;
        }
        
        // Atualizar contador de processados
        importacaoProgresso.processados++;
        
        // Atualizar porcentagem para o progresso
        if (importacaoProgresso.processados % 10 === 0 || importacaoProgresso.processados === importacaoProgresso.total) {
          const porcentagem = Math.round((importacaoProgresso.processados / importacaoProgresso.total) * 100);
          importacaoProgresso.mensagemStatus = `Progresso: ${importacaoProgresso.processados}/${importacaoProgresso.total} clientes (${porcentagem}%)`;
        }
      }
    }

    // Finalizar o processo
    importacaoProgresso.mensagemStatus = `Importação concluída!`;
    importacaoProgresso.emProgresso = false;
    
    revalidatePath("/remarketing");
    return { 
      success: true, 
      message: `Importação concluída: ${importacaoProgresso.importados} novos clientes, ${importacaoProgresso.atualizados} atualizados, ${importacaoProgresso.falhas} falhas.`,
      total: importacaoProgresso.total
    };
  } catch (error) {
    // Em caso de erro, atualizar status
    importacaoProgresso.mensagemStatus = `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    importacaoProgresso.emProgresso = false;
    
    console.error("Erro ao importar clientes da TalkBI:", error);
    return { error: "Ocorreu um erro ao importar os clientes", details: error };
  }
}
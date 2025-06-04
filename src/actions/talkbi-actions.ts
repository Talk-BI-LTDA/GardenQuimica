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
        EtiquetaCliente: true
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
      if (cliente.EtiquetaCliente && cliente.EtiquetaCliente.length > 0) {
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
        id: `rmk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nome: data.nome,
        dataAgendada: data.dataAgendada,
        subFlowNs: data.subFlowNs || "f153643s1950233",
        vendedorId,
        updatedAt: new Date(),
        RemarketingCliente: {
          create: data.clienteIds.map(clienteId => ({
            id: `rc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
          Cliente: true
        }
      });

      // Enviar fluxo para cada cliente que tem user_ns
      for (const item of clientesRemarketing) {
        if (item.Cliente.user_ns) {
          await enviarFluxoTalkBI(item.Cliente.user_ns, remarketing.subFlowNs);
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
        User: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            RemarketingCliente: true
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
      vendedorNome: item.User.name,
      totalClientes: item._count.RemarketingCliente
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
        User: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            RemarketingCliente: true
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
      vendedorNome: item.User.name,
      totalClientes: item._count.RemarketingCliente
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
        User: {
          select: {
            name: true
          }
        },
        RemarketingCliente: {
          include: {
            Cliente: {
              include: {
                EtiquetaCliente: true
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
    remarketing.RemarketingCliente.forEach(clienteRel => {
      clienteRel.Cliente.EtiquetaCliente.forEach(etiqueta => {
        todasEtiquetas.add(etiqueta.nome);
      });
    });

    // Formatar clientes
    const clientesFormatados = remarketing.RemarketingCliente.map(item => ({
        id: item.Cliente.id,
        nome: item.Cliente.nome,
        segmento: item.Cliente.segmento,
        cnpj: item.Cliente.cnpj,
        razaoSocial: item.Cliente.razaoSocial,
        whatsapp: item.Cliente.whatsapp || "",
        recorrente: item.Cliente.recorrente,
        origem: item.Cliente.origem,
        user_ns: item.Cliente.user_ns,
        etiquetas: item.Cliente.EtiquetaCliente.map(etiqueta => ({
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
      vendedorNome: remarketing.User.name,
      totalClientes: remarketing.RemarketingCliente.length,
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
        RemarketingCliente: {
          include: {
            Cliente: true
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
      console.log(`Total de clientes neste remarketing: ${remarketing.RemarketingCliente.length}`);
      
      // Garantir que o subflow está definido
      const subFlowNs = remarketing.subFlowNs || "f153643s1950233";
      
      // Enviar fluxo para cada cliente
      for (const clienteRemarketing of remarketing.RemarketingCliente) {
        const cliente = clienteRemarketing.Cliente;
        
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
    } catch {
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
        id: `rmk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nome,
        dataAgendada,
        subFlowNs: "f153643s1950233", // Fluxo padrão
        vendedorId: session.user.id,
        updatedAt: new Date(),
        RemarketingCliente: {
          create: clienteIds.map(clienteId => ({
            id: `rc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            clienteId
          }))
        }
      },
      include: {
        RemarketingCliente: {
          include: {
            Cliente: true
          }
        }
      }
    });

    console.log(`Remarketing criado com ID: ${remarketing.id}`);
    
    // Processar imediatamente
    interface ResultadoProcessamento {
      clienteId: string;
      clienteNome: string;
      user_ns?: string;
      resultado?: {
        success?: boolean;
        error?: string;
        data?: unknown;
      };
      sync?: {
        success?: boolean;
        error?: string;
        user_ns?: string;
      };
      erro?: string;
    }
    
    const resultados: ResultadoProcessamento[] = [];
    let sucessos = 0;
    let falhas = 0;

    // Processar cada cliente
    for (const clienteRemarketing of remarketing.RemarketingCliente) {
      const cliente = clienteRemarketing.Cliente;
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
      clientesProcessados: remarketing.RemarketingCliente.length,
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
interface TalkBISubscriberData {
  user_ns: string;
  name?: string;
  phone?: string;
  email?: string;
}

interface TalkBIAPIResponse {
  data: TalkBISubscriberData[];
  meta?: {
    current_page: number;
    last_page: number;
  };
}

interface ImportacaoProgresso {
  coletadosAteAgora: number;
  totalAProcessar: number;
  processadosNoLoteAtual: number; // Para log e feedback mais granular se necessário
  processadosTotalmente: number; // Acumulador de todos os processados (sucesso + falha)
  importadosNovos: number;
  atualizadosExistentes: number;
  falhasNoProcessamento: number;
  emProgresso: boolean;
  mensagemStatus: string;
  isPaused: boolean;
  isCancelled: boolean;
  lastUpdatedTimestamp: number;
  fase: "ocioso" | "coleta" | "processamento" | "concluido" | "erro" | "cancelado";
  porcentagem: number;
}

let importacaoProgresso: ImportacaoProgresso = {
  coletadosAteAgora: 0,
  totalAProcessar: 0,
  processadosNoLoteAtual: 0,
  processadosTotalmente: 0,
  importadosNovos: 0,
  atualizadosExistentes: 0,
  falhasNoProcessamento: 0,
  emProgresso: false,
  mensagemStatus: "Pronto para iniciar.",
  isPaused: false,
  isCancelled: false,
  lastUpdatedTimestamp: 0,
  fase: "ocioso",
  porcentagem: 0,
};

function calcularPorcentagemProgresso(): number {
  if (importacaoProgresso.fase === "processamento" && importacaoProgresso.totalAProcessar > 0) {
    const porcentagem = Math.min(100, Math.round((importacaoProgresso.processadosTotalmente / importacaoProgresso.totalAProcessar) * 100));
    return porcentagem;
  }
  if (importacaoProgresso.fase === "concluido" || importacaoProgresso.fase === "cancelado" || importacaoProgresso.fase === "erro") {
    return 100;
  }
  if (importacaoProgresso.fase === "coleta") return 0; // Durante coleta, não temos total ainda
  return 0;
}



function atualizarEstadoImportacao(updates: Partial<Omit<ImportacaoProgresso, 'porcentagem'>>) {
  const prevState = { ...importacaoProgresso };
  
  // Garantir que o timestamp seja sempre atualizado
  const novoTimestamp = Date.now();
  
  importacaoProgresso = { 
    ...importacaoProgresso, 
    ...updates, 
    lastUpdatedTimestamp: novoTimestamp 
  };
  
  // Recalcular porcentagem após atualização
  importacaoProgresso.porcentagem = calcularPorcentagemProgresso();

  // Logs mais detalhados para debug
  const logChanged = 
    prevState.mensagemStatus !== importacaoProgresso.mensagemStatus ||
    prevState.fase !== importacaoProgresso.fase ||
    prevState.emProgresso !== importacaoProgresso.emProgresso ||
    prevState.isPaused !== importacaoProgresso.isPaused ||
    prevState.isCancelled !== importacaoProgresso.isCancelled ||
    prevState.processadosTotalmente !== importacaoProgresso.processadosTotalmente ||
    prevState.coletadosAteAgora !== importacaoProgresso.coletadosAteAgora ||
    prevState.porcentagem !== importacaoProgresso.porcentagem;

  if (logChanged) {
    console.log(`[ESTADO_ATUALIZADO] ${novoTimestamp}:`, {
      fase: importacaoProgresso.fase,
      emProgresso: importacaoProgresso.emProgresso,
      processados: importacaoProgresso.processadosTotalmente,
      total: importacaoProgresso.totalAProcessar,
      porcentagem: importacaoProgresso.porcentagem,
      novos: importacaoProgresso.importadosNovos,
      atualizados: importacaoProgresso.atualizadosExistentes,
      falhas: importacaoProgresso.falhasNoProcessamento,
      pausado: importacaoProgresso.isPaused,
      cancelado: importacaoProgresso.isCancelled
    });
    console.log(`[MENSAGEM]: "${importacaoProgresso.mensagemStatus}"`);
  }
}

export async function obterProgressoImportacao() {
  console.log('[OBTER_PROGRESSO] Estado atual:', {
    fase: importacaoProgresso.fase,
    emProgresso: importacaoProgresso.emProgresso,
    processados: importacaoProgresso.processadosTotalmente,
    total: importacaoProgresso.totalAProcessar,
    porcentagem: importacaoProgresso.porcentagem,
    mensagem: importacaoProgresso.mensagemStatus,
    timestamp: importacaoProgresso.lastUpdatedTimestamp
  });
  
  return { ...importacaoProgresso };
}

export async function pausarImportacaoTalkBI() {
  if (importacaoProgresso.emProgresso && !importacaoProgresso.isCancelled) {
    atualizarEstadoImportacao({ isPaused: true, mensagemStatus: "Importação pausada." });
  }
  return obterProgressoImportacao();
}

export async function retomarImportacaoTalkBI() {
  if (importacaoProgresso.emProgresso && !importacaoProgresso.isCancelled && importacaoProgresso.isPaused) {
    atualizarEstadoImportacao({ isPaused: false, mensagemStatus: "Retomando importação..." });
  }
  return obterProgressoImportacao();
}

export async function cancelarImportacaoTalkBI() {
  atualizarEstadoImportacao({
    isCancelled: true, emProgresso: false, isPaused: false,
    mensagemStatus: "Importação cancelada pelo usuário.", fase: "cancelado"
  });
  return obterProgressoImportacao();
}

export async function buscarEImportarClientesTalkBI() {
  const session = await auth();
  if (!session?.user?.id) {
    atualizarEstadoImportacao({ mensagemStatus: "Não autorizado.", emProgresso: false, fase: "erro" });
    return { error: "Não autorizado", success: false };
  }

  if (importacaoProgresso.emProgresso && !importacaoProgresso.isCancelled) {
    const message = importacaoProgresso.isPaused ? "Importação está pausada." : "Importação já está em progresso.";
    return { success: true, message, alreadyRunning: true, isPaused: importacaoProgresso.isPaused };
  }

  // Reinicializa completamente o objeto global para uma nova importação
  importacaoProgresso = { 
    coletadosAteAgora: 0, totalAProcessar: 0, processadosNoLoteAtual: 0, processadosTotalmente: 0,
    importadosNovos: 0, atualizadosExistentes: 0, falhasNoProcessamento: 0,
    emProgresso: true, mensagemStatus: "Iniciando...",
    isPaused: false, isCancelled: false, lastUpdatedTimestamp: Date.now(),
    fase: "coleta", porcentagem: 0,
  };
  atualizarEstadoImportacao({ mensagemStatus: "Conectando ao TalkBI..." });

  try {
    const todosClientesAPI: TalkBISubscriberData[] = [];
    let paginaAtual = 1;
    let temMaisPaginas = true;
    const LIMITE_POR_PAGINA = 100;

    // Loop de Coleta
    while (temMaisPaginas) {
      if (importacaoProgresso.isCancelled) {
        atualizarEstadoImportacao({ mensagemStatus: "Coleta de dados cancelada.", emProgresso: false, fase: "cancelado" });
        return { error: "Importação cancelada durante coleta.", success: false };
      }
      while (importacaoProgresso.isPaused && !importacaoProgresso.isCancelled) {
        atualizarEstadoImportacao({ mensagemStatus: `Pausado na coleta. ${importacaoProgresso.coletadosAteAgora} clientes encontrados.`});
        await new Promise(resolve => setTimeout(resolve, 5500));
      }
      if (importacaoProgresso.isCancelled) break;

      atualizarEstadoImportacao({ mensagemStatus: `Coletando clientes... Página ${paginaAtual}. (${importacaoProgresso.coletadosAteAgora} coletados)` });
      
      const response = await fetch(`${TALKBI_API_URL}/subscribers?page=${paginaAtual}&limit=${LIMITE_POR_PAGINA}`, {
        method: "GET", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TALKBI_API_KEY}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        atualizarEstadoImportacao({ mensagemStatus: `Erro ao buscar página ${paginaAtual}: ${response.status}.`, emProgresso: false, fase: "erro" });
        return { error: `Falha ao buscar clientes (Status: ${response.status})`, detalhes: errorText, success: false };
      }

      const responseData: TalkBIAPIResponse = await response.json();
      if (!responseData.data || !Array.isArray(responseData.data)) {
        atualizarEstadoImportacao({ mensagemStatus: "Formato de resposta inesperado da TalkBI.", emProgresso: false, fase: "erro" });
        return { error: "Formato de resposta inesperado", success: false };
      }
      
      todosClientesAPI.push(...responseData.data);
      atualizarEstadoImportacao({ coletadosAteAgora: todosClientesAPI.length });
      
      temMaisPaginas = responseData.meta ? responseData.meta.current_page < responseData.meta.last_page : false;
      if (temMaisPaginas) { paginaAtual++; } else { break; }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (importacaoProgresso.isCancelled) {
      atualizarEstadoImportacao({ mensagemStatus: "Cancelado após coleta.", emProgresso: false, fase: "cancelado" });
      return { error: "Importação cancelada.", success: false };
    }

    atualizarEstadoImportacao({ 
      totalAProcessar: todosClientesAPI.length, 
      fase: "processamento", 
      mensagemStatus: `${todosClientesAPI.length} clientes coletados. Iniciando processamento...` 
    });

    if (importacaoProgresso.totalAProcessar === 0) {
        atualizarEstadoImportacao({ mensagemStatus: "Nenhum cliente encontrado na TalkBI.", emProgresso: false, fase: "concluido" });
        return { success: true, message: "Nenhum cliente encontrado." };
    }
    
    console.log(`[INICIO PROCESSAMENTO] Total: ${importacaoProgresso.totalAProcessar} clientes`);
    
    const tamanhoDoLote = 20;
    const totalLotes = Math.ceil(importacaoProgresso.totalAProcessar / tamanhoDoLote);
    
    for (let i = 0; i < importacaoProgresso.totalAProcessar; i += tamanhoDoLote) {
      if (importacaoProgresso.isCancelled) break; 
      
      while (importacaoProgresso.isPaused && !importacaoProgresso.isCancelled) {
        atualizarEstadoImportacao({ mensagemStatus: `Pausado. ${importacaoProgresso.processadosTotalmente}/${importacaoProgresso.totalAProcessar} (${importacaoProgresso.porcentagem}%).` });
        await new Promise(resolve => setTimeout(resolve, 5500));
      }
      if (importacaoProgresso.isCancelled) break; 

      const lote = todosClientesAPI.slice(i, i + tamanhoDoLote);
      const loteNum = Math.floor(i / tamanhoDoLote) + 1;
      
      console.log(`[LOTE ${loteNum}/${totalLotes}] Processando ${lote.length} clientes. Processados até agora: ${importacaoProgresso.processadosTotalmente}/${importacaoProgresso.totalAProcessar}`);
      
      // Atualizar mensagem ANTES de processar o lote
      atualizarEstadoImportacao({ 
        mensagemStatus: `Processando lote ${loteNum} de ${totalLotes}. Processados: ${importacaoProgresso.processadosTotalmente}/${importacaoProgresso.totalAProcessar} (${calcularPorcentagemProgresso()}%)`,
        processadosNoLoteAtual: 0 
      });
      
      let numImportadosEsteLote = 0;
      let numAtualizadosEsteLote = 0;
      let numFalhasEsteLote = 0;
      let numItensProcessadosNoLote = 0;

      for (const clienteTalkBI of lote) {
        if (importacaoProgresso.isCancelled) break; 
        
        let operacaoSucesso = false;
        try {
          const clienteExistente = await prisma.cliente.findFirst({ where: { user_ns: clienteTalkBI.user_ns } });
          if (clienteExistente) {
            await prisma.cliente.update({ 
              where: { id: clienteExistente.id }, 
              data: { 
                nome: clienteTalkBI.name || clienteExistente.nome, 
                whatsapp: clienteTalkBI.phone || clienteExistente.whatsapp, 
                email: clienteTalkBI.email || clienteExistente.email, 
                origem: "talkbi",
                updatedAt: new Date()
              }
            });
            numAtualizadosEsteLote++; 
            operacaoSucesso = true;
            console.log(`[ATUALIZADO] Cliente: ${clienteTalkBI.name} (${clienteTalkBI.user_ns})`);
          } else if (clienteTalkBI.phone || clienteTalkBI.email || clienteTalkBI.name) { 
            await prisma.cliente.create({ data: {
                nome: clienteTalkBI.name || `Cliente TalkBI ${clienteTalkBI.user_ns || String(Date.now()).slice(-5)}`, 
                segmento: "Importado TalkBI",
                cnpj: clienteTalkBI.phone ? clienteTalkBI.phone.replace(/\D/g, '').padEnd(14, '0').substring(0, 14) : String(Date.now() + Math.random()).slice(-14).padStart(14,'0'),
                razaoSocial: clienteTalkBI.name || null, 
                whatsapp: clienteTalkBI.phone || null, 
                email: clienteTalkBI.email || null,
                origem: "talkbi", 
                user_ns: clienteTalkBI.user_ns, 
                createdById: session.user.id,
            }});
            numImportadosEsteLote++; 
            operacaoSucesso = true;
            console.log(`[CRIADO] Cliente: ${clienteTalkBI.name} (${clienteTalkBI.user_ns})`);
          }
          if (!operacaoSucesso) {
            numFalhasEsteLote++;
            console.log(`[IGNORADO] Cliente sem dados válidos: ${clienteTalkBI.user_ns}`);
          }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (dbError: any) { 
            numFalhasEsteLote++; 
            console.error(`[ERRO DB] Cliente: ${clienteTalkBI.name}`, dbError.message);
        }
        numItensProcessadosNoLote++;
      } 
      
      if (importacaoProgresso.isCancelled) break; 

      // Atualizar os contadores GLOBAIS após processar o lote
      const novoProcessadosTotalmente = importacaoProgresso.processadosTotalmente + numItensProcessadosNoLote;
      const novosImportados = importacaoProgresso.importadosNovos + numImportadosEsteLote;
      const novosAtualizados = importacaoProgresso.atualizadosExistentes + numAtualizadosEsteLote;
      const novasFalhas = importacaoProgresso.falhasNoProcessamento + numFalhasEsteLote;
      
      atualizarEstadoImportacao({
          processadosTotalmente: novoProcessadosTotalmente,
          importadosNovos: novosImportados, 
          atualizadosExistentes: novosAtualizados, 
          falhasNoProcessamento: novasFalhas,
          processadosNoLoteAtual: numItensProcessadosNoLote 
      });
      
      console.log(`[LOTE ${loteNum} CONCLUÍDO] Processados: ${novoProcessadosTotalmente}/${importacaoProgresso.totalAProcessar} | Novos: ${numImportadosEsteLote} | Atualizados: ${numAtualizadosEsteLote} | Falhas: ${numFalhasEsteLote} | Progresso: ${importacaoProgresso.porcentagem}%`);
      
      // Aumentar o delay para dar tempo ao frontend de capturar as atualizações
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }

    const finalMessage = importacaoProgresso.isCancelled ?
      `Cancelada: ${importacaoProgresso.importadosNovos}N, ${importacaoProgresso.atualizadosExistentes}A, ${importacaoProgresso.falhasNoProcessamento}F.` :
      `Concluída: ${importacaoProgresso.importadosNovos}N, ${importacaoProgresso.atualizadosExistentes}A, ${importacaoProgresso.falhasNoProcessamento}F.`;
    
    let finalFase : ImportacaoProgresso['fase'] = "concluido";
    if (importacaoProgresso.isCancelled) {
        finalFase = "cancelado";
    } else if (importacaoProgresso.falhasNoProcessamento > 0 && (importacaoProgresso.importadosNovos + importacaoProgresso.atualizadosExistentes) === 0 && importacaoProgresso.totalAProcessar > 0) {
        finalFase = "erro"; 
    }

    atualizarEstadoImportacao({ mensagemStatus: finalMessage, emProgresso: false, fase: finalFase });
    
    console.log(`[IMPORTAÇÃO FINALIZADA] Status: ${finalFase} | Total: ${importacaoProgresso.totalAProcessar} | Processados: ${importacaoProgresso.processadosTotalmente} | Novos: ${importacaoProgresso.importadosNovos} | Atualizados: ${importacaoProgresso.atualizadosExistentes} | Falhas: ${importacaoProgresso.falhasNoProcessamento}`);
    
    if (!importacaoProgresso.isCancelled && finalFase === "concluido") {
      revalidatePath("/remarketing");
    }
    
    return {
      success: !importacaoProgresso.isCancelled && finalFase !== "erro", 
      message: importacaoProgresso.mensagemStatus,
      importados: importacaoProgresso.importadosNovos, 
      atualizados: importacaoProgresso.atualizadosExistentes,
      falhas: importacaoProgresso.falhasNoProcessamento, 
      totalAProcessar: importacaoProgresso.totalAProcessar,
      isCancelled: importacaoProgresso.isCancelled
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(`[ERRO CRÍTICO]`, error);
    atualizarEstadoImportacao({ mensagemStatus: `Erro crítico: ${error.message || 'Erro desconhecido'}`, emProgresso: false, isCancelled: true, fase: "erro" });
    return { error: `Erro crítico: ${error.message || 'Erro desconhecido'}`, success: false };
  }
}

// 1. Função exportarClientesTalkBI corrigida
export async function exportarClientesTalkBI(filtros?: { segmento?: string, recorrente?: boolean, clienteIds?: string[], etiqueta?: string }) {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    // Definir filtros para a consulta no banco de dados
    const where: Prisma.ClienteWhereInput = {
      origem: "sistema" // Apenas clientes com origem "sistema"
    };
    
    if (filtros?.segmento) {
      where.segmento = filtros.segmento;
    }
    
    if (filtros?.recorrente !== undefined) {
      where.recorrente = filtros.recorrente;
    }
    
    // Se houver IDs específicos selecionados, filtrar apenas esses clientes
    if (filtros?.clienteIds && filtros.clienteIds.length > 0) {
      where.id = {
        in: filtros.clienteIds
      };
    }

    // Filtrar por etiqueta se especificada
    if (filtros?.etiqueta) {
      where.EtiquetaCliente = {
        some: {
          nome: filtros.etiqueta
        }
      };
    }

    // Buscar clientes no banco de dados
    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        EtiquetaCliente: true // Incluir etiquetas para referência
      }
    });

    console.log(`Exportando ${clientes.length} clientes para TalkBI (apenas origem: sistema)...`);

    // Processar cada cliente
    const resultados = [];
    let sucessos = 0;
    let falhas = 0;

    for (const cliente of clientes) {
      try {
        // Verificar novamente se o cliente tem origem "sistema" (segurança extra)
        if (cliente.origem !== "sistema") {
          console.log(`Cliente ${cliente.nome} (ID: ${cliente.id}) tem origem "${cliente.origem}", pulando...`);
          resultados.push({
            id: cliente.id,
            nome: cliente.nome,
            sucesso: false,
            erro: "Apenas clientes com origem 'sistema' podem ser exportados"
          });
          falhas++;
          continue;
        }

        // Formatar o número de WhatsApp (se existir)
        let whatsappFormatado = cliente.whatsapp;
        
        if (whatsappFormatado) {
          // Remover TODOS os caracteres não numéricos
          whatsappFormatado = whatsappFormatado.replace(/\D/g, '');
          
          // Remover zeros à esquerda que possam estar no início do número
          whatsappFormatado = whatsappFormatado.replace(/^0+/, '');
          
          // Verificar se já tem o prefixo 55
          if (!whatsappFormatado.startsWith('55')) {
            whatsappFormatado = `55${whatsappFormatado}`;
          }
          
          // Adicionar o sinal de + no início
          if (!whatsappFormatado.startsWith('+')) {
            whatsappFormatado = `+${whatsappFormatado}`;
          }
          
          console.log(`WhatsApp formatado: ${cliente.whatsapp} -> ${whatsappFormatado}`);
        }

        // Preparar dados para envio ao TalkBI
        const clienteTalkBI: ClienteTalkBICreate = {
          name: cliente.nome,
          phone: whatsappFormatado || undefined, // O campo phone na API TalkBI corresponde ao WhatsApp
          email: cliente.email || undefined, 
          first_name: cliente.nome.split(' ')[0],
          last_name: cliente.nome.split(' ').slice(1).join(' ') || undefined,
        };

        // Verificar se cliente já existe no TalkBI (pelo user_ns)
        if (cliente.user_ns) {
          // Se já existe, deletar e recriar
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

        const responseData = await response.json();

        if (!response.ok) {
          console.error(`Erro ao exportar cliente ${cliente.id} para TalkBI:`, responseData);
          resultados.push({ 
            id: cliente.id, 
            nome: cliente.nome, 
            sucesso: false, 
            erro: responseData.message || "Erro desconhecido" 
          });
          falhas++;
          continue;
        }

        const data = responseData as ClienteTalkBI;
        
        // Atualizar cliente no banco com o user_ns do TalkBI
        if (data.user_ns) {
          await prisma.cliente.update({
            where: { id: cliente.id },
            data: {
              user_ns: data.user_ns,
              whatsapp: whatsappFormatado || cliente.whatsapp, // Atualizar o WhatsApp formatado no banco
              origem: "sistema" // Manter a origem como sistema
            }
          });

          resultados.push({ 
            id: cliente.id, 
            nome: cliente.nome, 
            sucesso: true, 
            user_ns: data.user_ns 
          });
          sucessos++;
        } else {
          resultados.push({ 
            id: cliente.id, 
            nome: cliente.nome, 
            sucesso: false, 
            erro: "Não foi possível obter o ID do cliente no TalkBI" 
          });
          falhas++;
        }
      } catch (error) {
        console.error(`Erro ao processar cliente ${cliente.id}:`, error);
        resultados.push({ 
          id: cliente.id, 
          nome: cliente.nome, 
          sucesso: false, 
          erro: "Erro interno ao processar cliente" 
        });
        falhas++;
      }
    }

    return { 
      success: true, 
      total: clientes.length,
      sucessos,
      falhas,
      resultados,
      message: `${sucessos} clientes exportados com sucesso. ${falhas} falhas.`
    };
  } catch (error) {
    console.error("Erro ao exportar clientes para TalkBI:", error);
    return { error: "Ocorreu um erro ao exportar os clientes" };
  }
}

// 2. Função atualizarPrefixoWhatsAppClientes corrigida
export async function atualizarPrefixoWhatsAppClientes() {
  try {
    const session = await auth();
    if (!session) {
      return { error: "Não autorizado" };
    }

    // Buscar todos os clientes que têm WhatsApp e origem sistema
    const clientes = await prisma.cliente.findMany({
      where: {
        whatsapp: {
          not: null
        },
        origem: "sistema" // Apenas clientes com origem "sistema"
      }
    });

    console.log(`Atualizando prefixo de ${clientes.length} números de WhatsApp (apenas origem: sistema)...`);

    let atualizados = 0;
    let inalterados = 0;
    const resultados = [];

    for (const cliente of clientes) {
      if (!cliente.whatsapp) continue;

      // Formatar o número de WhatsApp
      const whatsappOriginal = cliente.whatsapp;
      
      // Remover caracteres não numéricos
      const numeroLimpo = whatsappOriginal.replace(/\D/g, '');
      
      // Remover zeros à esquerda que possam estar no início do número
      const numeroSemZeros = numeroLimpo.replace(/^0+/, '');
      
      // Verificar se já tem o prefixo 55
      let novoNumero = numeroSemZeros;
      if (!numeroSemZeros.startsWith('55')) {
        novoNumero = `55${numeroSemZeros}`;
      }
      
      // Adicionar o sinal de + no início
      if (!novoNumero.startsWith('+')) {
        novoNumero = `+${novoNumero}`;
      }
      
      // Se o número já estava formatado corretamente, pular
      if (whatsappOriginal === novoNumero) {
        resultados.push({
          id: cliente.id,
          nome: cliente.nome,
          whatsappAntigo: whatsappOriginal,
          whatsappNovo: novoNumero,
          alterado: false
        });
        inalterados++;
        continue;
      }

      console.log(`WhatsApp atualizado: ${whatsappOriginal} -> ${novoNumero} para cliente ${cliente.nome} (ID: ${cliente.id})`);

      // Atualizar o WhatsApp do cliente no banco
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          whatsapp: novoNumero
        }
      });

      resultados.push({
        id: cliente.id,
        nome: cliente.nome,
        whatsappAntigo: whatsappOriginal,
        whatsappNovo: novoNumero,
        alterado: true
      });
      atualizados++;
    }

    return {
      success: true,
      total: clientes.length,
      atualizados,
      inalterados,
      resultados
    };
  } catch (error) {
    console.error("Erro ao atualizar prefixo de WhatsApp:", error);
    return { error: "Ocorreu um erro ao atualizar os números de WhatsApp" };
  }
}
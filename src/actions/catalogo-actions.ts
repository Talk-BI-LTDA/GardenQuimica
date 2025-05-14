// src/actions/catalogo-actions.ts
"use server";

import { prisma } from "@/lib/supabase/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

// Tipagem para os tipos de catálogo
export type CatalogoTipo = 
  | "produto" 
  | "medida" 
  | "recorrencia" 
  | "segmento" 
  | "pagamento" 
  | "objecao";

// Obter itens de catálogo
export async function getCatalogoItens(tipo: CatalogoTipo) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Não autorizado", itens: [] };
    }

    let itens = [];
    
    switch (tipo) {
      case "produto":
        itens = await prisma.catalogoProduto.findMany({
          include: { createdBy: { select: { name: true } } },
          orderBy: { nome: "asc" }
        });
        break;
      case "medida":
        itens = await prisma.catalogoMedida.findMany({
          include: { createdBy: { select: { name: true } } },
          orderBy: { nome: "asc" }
        });
        break;
      case "recorrencia":
        itens = await prisma.catalogoRecorrencia.findMany({
          include: { createdBy: { select: { name: true } } },
          orderBy: { nome: "asc" }
        });
        break;
      case "segmento":
        itens = await prisma.catalogoSegmento.findMany({
          include: { createdBy: { select: { name: true } } },
          orderBy: { nome: "asc" }
        });
        break;
      case "pagamento":
        itens = await prisma.catalogoPagamento.findMany({
          include: { createdBy: { select: { name: true } } },
          orderBy: { nome: "asc" }
        });
        break;
      case "objecao":
        itens = await prisma.catalogoObjecao.findMany({
          include: { createdBy: { select: { name: true } } },
          orderBy: { nome: "asc" }
        });
        break;
      default:
        return { error: "Tipo de catálogo inválido", itens: [] };
    }

    // Formatar itens para resposta
    const itensFormatados = itens.map(item => ({
      id: item.id,
      nome: item.nome,
      createdAt: item.createdAt.toISOString(),
      createdBy: item.createdBy?.name || "Sistema"
    }));

    return { success: true, itens: itensFormatados };
  } catch (error) {
    console.error("Erro ao obter itens de catálogo:", error);
    return { error: "Erro ao obter itens de catálogo", itens: [] };
  }
}

// Adicionar item ao catálogo
export async function adicionarCatalogoItem(tipo: CatalogoTipo, nome: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Não autorizado" };
    }

    if (!nome.trim()) {
      return { error: "Nome é obrigatório" };
    }

    const userId = session.user.id;
    let item;

    switch (tipo) {
      case "produto":
        item = await prisma.catalogoProduto.create({
          data: {
            nome: nome.trim(),
            createdById: userId
          }
        });
        break;
      case "medida":
        item = await prisma.catalogoMedida.create({
          data: {
            nome: nome.trim(),
            createdById: userId
          }
        });
        break;
      case "recorrencia":
        item = await prisma.catalogoRecorrencia.create({
          data: {
            nome: nome.trim(),
            createdById: userId
          }
        });
        break;
      case "segmento":
        item = await prisma.catalogoSegmento.create({
          data: {
            nome: nome.trim(),
            createdById: userId
          }
        });
        break;
      case "pagamento":
        item = await prisma.catalogoPagamento.create({
          data: {
            nome: nome.trim(),
            createdById: userId
          }
        });
        break;
      case "objecao":
        item = await prisma.catalogoObjecao.create({
          data: {
            nome: nome.trim(),
            createdById: userId
          }
        });
        break;
      default:
        return { error: "Tipo de catálogo inválido" };
    }

    revalidatePath("/produtos");
    return { success: true, item };
  } catch (error) {
    console.error("Erro ao adicionar item ao catálogo:", error);
    
    // Verificar se é erro de chave única (item já existe)
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      return { error: "Item já existe no catálogo" };
    }
    
    return { error: "Erro ao adicionar item ao catálogo" };
  }
}

// Atualizar item do catálogo
export async function atualizarCatalogoItem(tipo: CatalogoTipo, id: string, nome: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Não autorizado" };
    }

    if (!nome.trim()) {
      return { error: "Nome é obrigatório" };
    }

    let item;

    switch (tipo) {
      case "produto":
        item = await prisma.catalogoProduto.update({
          where: { id },
          data: { nome: nome.trim() }
        });
        break;
      case "medida":
        item = await prisma.catalogoMedida.update({
          where: { id },
          data: { nome: nome.trim() }
        });
        break;
      case "recorrencia":
        item = await prisma.catalogoRecorrencia.update({
          where: { id },
          data: { nome: nome.trim() }
        });
        break;
      case "segmento":
        item = await prisma.catalogoSegmento.update({
          where: { id },
          data: { nome: nome.trim() }
        });
        break;
      case "pagamento":
        item = await prisma.catalogoPagamento.update({
          where: { id },
          data: { nome: nome.trim() }
        });
        break;
      case "objecao":
        item = await prisma.catalogoObjecao.update({
          where: { id },
          data: { nome: nome.trim() }
        });
        break;
      default:
        return { error: "Tipo de catálogo inválido" };
    }

    revalidatePath("/produtos");
    return { success: true, item };
  } catch (error) {
    console.error("Erro ao atualizar item do catálogo:", error);
    
    // Verificar se é erro de chave única (nome já existe)
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      return { error: "Já existe um item com este nome" };
    }
    
    return { error: "Erro ao atualizar item do catálogo" };
  }
}

// Excluir item do catálogo
export async function excluirCatalogoItem(tipo: CatalogoTipo, id: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Não autorizado" };
    }

    switch (tipo) {
      case "produto":
        await prisma.catalogoProduto.delete({ where: { id } });
        break;
      case "medida":
        await prisma.catalogoMedida.delete({ where: { id } });
        break;
      case "recorrencia":
        await prisma.catalogoRecorrencia.delete({ where: { id } });
        break;
      case "segmento":
        await prisma.catalogoSegmento.delete({ where: { id } });
        break;
      case "pagamento":
        await prisma.catalogoPagamento.delete({ where: { id } });
        break;
      case "objecao":
        await prisma.catalogoObjecao.delete({ where: { id } });
        break;
      default:
        return { error: "Tipo de catálogo inválido" };
    }

    revalidatePath("/produtos");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir item do catálogo:", error);
    
    // Verificar se é erro de referência (item em uso)
    if (error instanceof Error && error.message.includes("foreign key constraint")) {
      return { error: "Este item está em uso e não pode ser excluído" };
    }
    
    return { error: "Erro ao excluir item do catálogo" };
  }
}
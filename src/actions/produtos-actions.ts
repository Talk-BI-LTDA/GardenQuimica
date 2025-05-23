// src/actions/produtos-actions.ts
'use server'

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/supabase/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Produto } from '@/types/venda';

export type ProdutoParams = {
  search?: string;
  medida?: string;
};

export async function getProdutos(params?: ProdutoParams) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  // Construir filtros
  const where: Record<string, unknown> = {};

  // Aplicar busca
  if (params?.search) {
    where.nome = { contains: params.search, mode: 'insensitive' };
  }

  // Filtrar por medida
  if (params?.medida) {
    where.medida = params.medida;
  }

  try {
    // Buscar produtos da tabela Produto
    const produtosBrutos = await prisma.produto.findMany({
      where,
      orderBy: {
        nome: 'asc',
      },
    });

    // Buscar as medidas disponíveis
    const medidas = await prisma.medida.findMany({
      orderBy: {
        nome: 'asc',
      },
    });

    // Mapear para o tipo Produto
    const produtos: Produto[] = produtosBrutos.map(produto => ({
      id: produto.id,
      nome: produto.nome,
      medida: produto.medida,
      quantidade: produto.quantidade,
      valor: produto.valor,
    }));

    return { 
      success: true, 
      produtos,
      medidas: medidas.map(m => m.nome)
    };
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return { error: 'Ocorreu um erro ao buscar os produtos' };
  }
}

export async function getProduto(id: string) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  try {
    const produto = await prisma.produto.findUnique({
      where: { id },
    });

    if (!produto) {
      return { error: 'Produto não encontrado' };
    }

    // Mapear para o tipo Produto
    const produtoMapeado: Produto = {
      id: produto.id,
      nome: produto.nome,
      medida: produto.medida,
      quantidade: produto.quantidade,
      valor: produto.valor,
    };

    return { success: true, produto: produtoMapeado };
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return { error: 'Ocorreu um erro ao buscar o produto' };
  }
}

export async function criarProduto(data: Omit<Produto, 'id'>) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    return { error: 'Você precisa estar autenticado para realizar esta ação' };
  }

  try {
    // Verificar se já existe produto com o mesmo nome e medida
    const produtoExistente = await prisma.produto.findFirst({
      where: {
        nome: data.nome,
        medida: data.medida,
      },
    });

    if (produtoExistente) {
      return { error: 'Já existe um produto com este nome e medida' };
    }

    // Criar produto
    const produto = await prisma.produto.create({
      data: {
        nome: data.nome,
        medida: data.medida,
        quantidade: data.quantidade,
        valor: data.valor,
        createdById: session.user.id,
      },
    });

    revalidatePath('/dashboard/produtos');
    return { success: true, id: produto.id };
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return { error: 'Ocorreu um erro ao cadastrar o produto' };
  }
}